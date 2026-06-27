# Parchment Sync And Prescription Lifecycle Implementation Plan

> ⚠️ **PARTIALLY SUPERSEDED (locked decision 2026-06-26; shipped as [#194](https://github.com/reabal-n/instantmed/pull/194)).** This plan's premise — that the Parchment webhook should own fulfilment and that the doctor "Complete Consultation"/"Sent outside Parchment" attestation should be REMOVED or demoted to proof-only — was **reversed**. The `script_sent` attestation is **deliberately kept** because the `prescription.created` webhook doesn't fire in test mode and lags in prod (see `lib/__tests__/script-sent-contract.test.ts` + the CLAUDE.md gotcha). What actually shipped is **lock-only**: a failed Parchment launch/sync never records `script_sent`, and contract tests pin that. The "durable sync state" (fingerprint / needs_resync / persisted rejection) was assessed **low-ROI and intentionally NOT built** (manual resync + 404 self-heal already cover it). **Do NOT implement Steps 2–4 below (removing the approval-path `script_sent` attestation) — they would undo the kept attestation.** Treat this doc as historical context only.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent predictable Parchment failures, persist rejection state, and separate prescribing execution from request completion.

**Architecture:** A shared preflight/sync action gates every Parchment opening. Parchment state is derived from current identity fingerprint plus last successful sync or rejection. Prescription lifecycle uses proof of fulfilment before completion/notification.

**Tech Stack:** Next.js server actions, Supabase, Parchment integration, TypeScript 5.9, Vitest, existing webhook tests.

## Global Constraints

- Do not open Parchment until local preflight passes and Parchment sync succeeds.
- `Prescribe` is status-neutral.
- Parchment rejection clears only after successful sync.
- `needs_resync` is computed dynamically from fingerprint mismatch.
- No sync history table in v1.
- Parchment webhook auto-completes and notifies when script proof arrives.
- `Sent outside Parchment` records manual fulfilment proof only.
- Final prescription action is `Complete request`, not `Approve`.
- Failed sync or failed panel launch must not send patient success email.

---

## File Structure

- Modify `lib/parchment/sync-patient.ts`: local issues, split names, Medicare expiry, address readiness, fingerprint input.
- Create `lib/parchment/identity-fingerprint.ts`: canonical hash builder.
- Modify `app/actions/manual-patient.ts`, `app/doctor/patients/actions.ts`, and/or create a shared server action for preflight/sync/open readiness.
- Modify `app/doctor/patients/[id]/patient-detail-client.tsx`: use shared action and durable state labels.
- Modify `components/doctor/parchment-prescribe-panel.tsx`: no generic rejected state as primary repair surface.
- Modify `lib/doctor/parchment-claim.ts`: lifecycle eligibility naming if needed.
- Modify `app/doctor/queue/actions.ts`: remove approval-path fallback that records `script_sent` without explicit proof.
- Modify webhook route/actions that handle `prescription.created`.
- Update tests in `lib/__tests__/parchment-sync-patient.test.ts`, `lib/__tests__/parchment-claim.test.ts`, `lib/__tests__/parchment-webhook-route.test.ts`, `lib/__tests__/script-sent-contract.test.ts`, and doctor review UI contracts.

## Task 1: Add Parchment Sync State Columns And Fingerprint

**Files:**
- Create migration `supabase/migrations/20260626092000_add_parchment_sync_state.sql`
- Create `lib/parchment/identity-fingerprint.ts`
- Create `lib/__tests__/parchment-identity-fingerprint.test.ts`

**Interfaces:**
- Columns:
  - `parchment_sync_status text`
  - `parchment_identity_fingerprint text`
  - `parchment_last_synced_at timestamptz`
  - `parchment_last_error_message text`
  - `parchment_last_error_at timestamptz`

- [ ] **Step 1: Add fingerprint tests**

Assert fingerprint changes when any Parchment-relevant identity field changes and stays stable for whitespace/case normalization where appropriate.

- [ ] **Step 2: Add migration**

Add columns to `profiles` with a check constraint:

```sql
CHECK (parchment_sync_status IS NULL OR parchment_sync_status IN ('not_synced', 'synced', 'rejected'))
```

- [ ] **Step 3: Implement fingerprint builder**

Hash normalized first name, last name, DOB, sex, phone, Medicare/IHI, address fields, and address source/provider ID.

- [ ] **Step 4: Run tests**

Run: `pnpm test -- lib/__tests__/parchment-identity-fingerprint.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations lib/parchment/identity-fingerprint.ts lib/__tests__/parchment-identity-fingerprint.test.ts
git commit -m "feat: add parchment identity fingerprint"
```

## Task 2: Harden Local Parchment Preflight

**Files:**
- Modify `lib/parchment/sync-patient.ts`
- Modify `lib/__tests__/parchment-sync-patient.test.ts`

**Interfaces:**
- `getParchmentPatientIdentityIssues(profile)` returns exact local blockers.

- [ ] **Step 1: Add failing tests**

Cases:

- missing first name
- missing last name
- Medicare without expiry
- incomplete structured address
- IHI-only valid
- manual/unknown structured address allowed with warning, not blocker

- [ ] **Step 2: Use profile identity only**

Remove hidden profile/intake answer blending for Parchment sync. Parchment sync reads canonical profile fields only.

- [ ] **Step 3: Prefer split names**

Payload uses `profile.first_name` and `profile.last_name`, never re-splits `full_name` unless old data has no split fields and preflight explicitly allows the fallback.

- [ ] **Step 4: Run tests**

Run: `pnpm test -- lib/__tests__/parchment-sync-patient.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/parchment/sync-patient.ts lib/__tests__/parchment-sync-patient.test.ts
git commit -m "fix: preflight parchment identity before sync"
```

## Task 3: Create Shared Preflight/Sync Action

**Files:**
- Create or modify shared server action in `app/actions/manual-patient.ts` or a new `app/actions/parchment-patient-sync.ts`
- Modify `app/doctor/patients/[id]/patient-detail-client.tsx`
- Modify request review components that open Parchment
- Modify tests/contracts

**Interfaces:**
- Produces action result:

```ts
type ParchmentOpenReadiness =
  | { status: "blocked_local"; blockers: string[] }
  | { status: "sync_failed"; message: string }
  | { status: "ready_to_open"; parchmentPatientId: string }
```

- [ ] **Step 1: Add action tests**

Assert both profile and request review can call the same action and receive normalized blockers.

- [ ] **Step 2: Implement action**

Flow:

1. Load profile.
2. Run local preflight.
3. If blocked, return `blocked_local`.
4. Compute current fingerprint.
5. If fingerprint matches successful sync, return ready.
6. Otherwise sync to Parchment.
7. On success, write `synced`, fingerprint, sync timestamp, clear rejection fields.
8. On failure, write `rejected`, safe error, error timestamp.

- [ ] **Step 3: Wire UI**

Both `Prescribe` and profile `Prescribe in Parchment` use this action before opening the panel.

- [ ] **Step 4: Run tests**

Run focused Parchment sync/action tests.

- [ ] **Step 5: Commit**

```bash
git add app/actions app/doctor/patients components/doctor lib/__tests__
git commit -m "feat: gate parchment opening behind shared sync action"
```

## Task 4: Replace Parchment Status Display

**Files:**
- Modify `app/doctor/patients/[id]/patient-detail-client.tsx`
- Modify patient snapshot/status helper files
- Modify tests

**Interfaces:**
- UI states:
  - `Ready to sync`
  - `Synced`
  - `Needs resync`
  - `Rejected`
  - `Retry Parchment sync`

- [ ] **Step 1: Add status tests**

Assert:

- successful synced fingerprint match shows `Synced`
- fingerprint mismatch shows `Needs resync`
- rejected same fingerprint shows `Rejected`
- rejected plus edited identity shows `Retry Parchment sync`

- [ ] **Step 2: Implement derived state helper**

Do not write `needs_resync` to DB. Derive it.

- [ ] **Step 3: Update UI copy**

Replace generic `Parchment rejected the patient details. Check Medicare/IHI...` with exact local blockers when available and durable rejection state when Parchment rejects.

- [ ] **Step 4: Run tests**

Run status helper tests and `pnpm typecheck`.

- [ ] **Step 5: Commit**

```bash
git add app/doctor/patients lib/doctor lib/__tests__
git commit -m "refactor: derive parchment sync status from identity fingerprint"
```

## Task 5: Separate Prescribe, Fulfilment Proof, And Completion

> 🛑 **SUPERSEDED — do NOT implement (locked decision 2026-06-26; see the banner at the top of this file).** Steps 1–5 below remove the doctor `script_sent` attestation and make the Parchment webhook own completion. That premise was **reversed**: the attestation is deliberately **kept** because `prescription.created` doesn't fire in test mode and lags in prod. What shipped ([#194](https://github.com/reabal-n/instantmed/pull/194)) is **lock-only** — a failed Parchment launch/sync never records `script_sent` — pinned by `lib/__tests__/script-sent-contract.test.ts`. The `- [ ]` checkboxes below are historical context, NOT open work; actioning them would undo the kept attestation.

**Files:**
- Modify `app/doctor/queue/actions.ts`
- Modify `components/doctor/review/intake-action-buttons.tsx`
- Modify `app/doctor/intakes/[id]/intake-detail-header.tsx`
- Modify `components/doctor/review-actions.tsx`
- Modify `app/doctor/intakes/[id]/use-intake-actions.tsx`
- Modify webhook handling and tests

**Interfaces:**
- `Prescribe`: status-neutral
- `Sent outside Parchment`: records fulfilment proof only
- Parchment webhook: completes + notifies
- `Complete request`: fallback after proof exists

- [ ] **Step 1: Add failing contract tests**

Assert:

- Failed `Prescribe` does not change status and does not send patient email.
- `approvePrescribedScriptAction` does not create `script_sent` if proof is missing.
- Prescription request UI does not render generic `Approve`.
- It renders `Complete request` after fulfilment proof.

- [ ] **Step 2: Remove approval-path script_sent fallback**

In `approvePrescribedScriptAction`, remove the branch that records `script_sent` merely because the doctor clicked completion. Require existing webhook proof or explicit manual proof.

- [ ] **Step 3: Adjust manual sent flow**

`Sent outside Parchment` records proof and leaves final completion to `Complete request`.

- [ ] **Step 4: Adjust webhook flow**

When Parchment webhook confirms script created/sent, mark script sent, complete request, and notify patient.

- [ ] **Step 5: Rename UI action**

Replace prescription `Approve` label with `Complete request` wherever the action is prescription completion.

- [ ] **Step 6: Run tests**

Run: `pnpm test -- lib/__tests__/script-sent-contract.test.ts lib/__tests__/parchment-webhook-route.test.ts lib/__tests__/parchment-claim.test.ts lib/__tests__/doctor-review-ui-contract.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/doctor components/doctor app/actions lib/doctor lib/__tests__
git commit -m "refactor: separate prescribing from request completion"
```

## Verification

- Run `pnpm typecheck`.
- Run Parchment and script lifecycle tests listed above.
- Run `pnpm lint`.
- Browser verify:
  - Bad identity opens editor, not Parchment.
  - Parchment rejection persists on profile.
  - `Prescribe` failure does not notify patient.
  - `Sent outside Parchment` requires later `Complete request`.
  - Webhook path completes automatically in test harness or unit coverage.
