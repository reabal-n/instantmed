# Server-action access and per-episode consent implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task after implementation is authorized. This document authorizes no application changes or deployment.

**Goal:** Close unintended privileged action boundaries and make recorded consent match the patient's explicit, current confirmation.

**Architecture:** Keep privileged internal functions in server-only modules and expose only deliberately authorized actions. Share one versioned consent contract across presentation, checkout validation, durable evidence and payment recovery.

**Tech Stack:** Existing Next.js 15.5.24, React 18.3.1, TypeScript, Supabase and Stripe; no dependency upgrades.

**Spec:** User delegation from task `01a0a21f-06b2-78c3-8bf9-0189f11209ee`; pasted audit in `01a099d4-56fd-7cd3-8239-61d22e171669` (Review Fable page feedback); `docs/CLINICAL.md` Per-Episode Consent and Required Disclosures; `docs/SECURITY.md`; project payment invariants.

## Scope and evidence

- Reviewed 15 September 2026. Fresh `git fetch origin main` resolved `9dd85247b586409d50e7ac2a270b5c1c77c6779e`, identical to this worktree's starting HEAD.
- Plan 5 / PR #563 navigation is explicitly excluded. No application edits, live action probes, provider mutations, clinical record inspection or deployment were performed.
- The pasted finding says 46 exports in 11 lib modules plus seven draft helpers. This is an inventory claim, not a verified count of exploitable endpoints. The full Claude artifact was unavailable in the source review and the current URL fetch failed; this plan does not claim full artifact access.
- Inspected an existing production-format build manifest at `/Users/rey/Developer/instantmed/.next/server/server-reference-manifest.json`. Its timestamp predates current main; it is not an exact-main build or a deployed-build receipt. Only filenames, exported names and worker route categories were inspected; action IDs and encryption material are excluded from this plan.
- That manifest includes `computeIntakeHash` on clinical page workers; operations data queries, intake-event functions, and email reconstruction/outbox functions also have page-worker entries. Email transport, recovery processors, notification functions and four draft generators have route-worker entries without page workers in that snapshot. Draft audit/sync helpers were not found in that snapshot. None of these classifications establishes current production exploitation.
- Middleware verifies a session for protected route prefixes, not a staff role or case ownership. Admin page bodies separately call `requireRole(['admin'])`. Those render checks are not authorization inside an exported action. Installed Next action-handler source dispatches action handlers and supports worker forwarding; route location alone must not be accepted as an authorization guarantee.

## Confirmed findings

### 1. Privileged internal helpers are declared as server actions

`app/actions/drafts/draft-validation.ts:19` accepts an intake ID and reads answers through `createServiceRoleClient()` without authorization, returning null or a deterministic hash. `approveDraft` checks clinician role and another doctor's assignment before calling it, but that does not guard direct invocation of the helper. The hash is not raw answers; its impact is an unauthorized existence/change fingerprint, conditional on reachability and a target identifier. Do not call this a demonstrated clinical payload leak.

The same unnecessary boundary exists in `lib/data/email-outbox.ts`, `lib/data/reconciliation.ts`, `lib/data/intake-ops.ts`, `lib/data/intake-events.ts`, and `lib/email/send/{reconstruct,outbox}.ts`: service-role operations without their own caller authorization. For example, `getEmailOutboxList` reads recipient metadata and `getIntakeEvents` reads arbitrary intake events. Internal email/outbox helpers include writes. These are materially broader than the hash helper and must be classified by consumer, not repaired by blindly adding interactive login to cron work.

`getAIDraftsForIntake` and `checkDraftStaleness` have doctor/admin guards but no case assignment/capability checks. This is a confirmed implementation difference from approval, not automatically a confirmed policy violation: queue-wide read rights and assigned-case mutation rights can differ. Resolve the existing clinical read contract before changing them. The current approval check permits unassigned cases; do not silently replace that rule.

### 2. Telehealth consent is recorded without an explicit validated attestation

- `components/request/steps/review-step.tsx:335` sets all three consent flags from one checkbox. The visible checkbox at line 1121 confirms emergency status, accuracy, Terms and Privacy Policy; it does not expressly explain or obtain telehealth consent. `handlePayment` injects `telehealthConsentGiven: true`.
- `lib/request/unified-checkout.ts:339` maps that value into `telehealth_consent_given`.
- `lib/stripe/checkout/auth-and-profile.ts:154` and `lib/stripe/guest-checkout.ts:512` only require terms and accuracy. Missing or false telehealth consent does not fail these checks.
- Both checkout paths unconditionally call `logTelehealthConsentGiven` with the server's `TELEHEALTH_CONSENT_VERSION` (`2026-02`), rather than verifying which disclosure version the patient accepted.
- This does not establish that the patient saw no telehealth information anywhere in the journey. It establishes a mismatch between the final checkbox, server validation and the evidence asserted.
- `components/request/store.ts` already invalidates confirmation and timestamp on answer/identity edits, including changed prefill values. Preserve that behavior. Persisted draft restoration can restore confirmation without binding it to the currently displayed consent version; the frontend timestamp is not sent as evidence of the disclosure accepted.

### 3. Payment can proceed when consent evidence was not persisted

`lib/audit/compliance-audit.ts:89` returns null on missing client, RPC error or exception. Authenticated persistence and guest checkout await consent logging but ignore null results. Awaiting the logger therefore does not prove durable evidence. Its telehealth event timestamp is generated on the server at logging time; it is not proof of when a checkbox was clicked.

`lib/stripe/checkout/retry-payment.ts` correctly checks authentication, patient ownership, payment status, canonicality and safety, but contains no consent-version/evidence gate. Existing evidence can therefore remain incomplete or stale during recovery. This is a source finding; no historical record totals or actual evidence-loss incident were established.

## Global constraints

- Planning only until implementation is authorized. Keep application, provider, clinical-data and release claims separate.
- Preserve current-session payment guards, full decline refunds, recoverable failed intakes, safety checks and existing ownership/canonicality rules.
- No fabricated, backdated or silently upgraded historic consent. Previously paid requests require an operator/Medical Director decision for any remediation.
- Never put patient answers, identities, rendered emails, action IDs, tokens or credentials in test reports or review artifacts. Use synthetic fixtures.
- Load project clinical-safety and checkout workflows before implementation; UI/browser and marketing-compliance workflows before signing off disclosure changes.

## Task 1: Remove unintended action boundaries

**Modify:** `app/actions/drafts/draft-validation.ts`; internal modules listed in Finding 1; `app/actions/drafts/{audit-log,clinical-note-sync,generate-clinical-note,generate-consult,generate-med-cert,generate-repeat-rx}.ts` where consumer inspection confirms internal use; `lib/email/{resend,senders,abandoned-checkout,partial-intake-recovery}.ts`; `lib/notifications/service.ts`.

**Create:** `lib/ai/intake-answer-hash.ts` for the internal hash; `scripts/check-server-action-boundaries.mjs` for exact-build emitted-action classification; `lib/__tests__/server-action-boundaries.test.ts` and `e2e/server-action-access.spec.ts`.

**Interface:** Preserve `computeIntakeHash(intakeId: string): Promise<string | null>` as an internal import; keep `checkDraftStaleness` as the deliberately guarded public action. Preserve existing function contracts for background consumers.

- [ ] Enumerate exports and all consumers at the implementation revision. Mark each internal-only, deliberate browser action, or unresolved. Resolve any client import with a narrow authorized action wrapper; never expose the internal helper merely to preserve its import path.
- [ ] Add `import 'server-only'` and remove module-level `'use server'` from internal-only modules. Merely adding server-only alongside use-server does not remove an action. Move the hash out of the mixed module and update its callers.
- [ ] Keep true browser actions guarded before privileged reads/writes. Operations wrappers must preserve current admin-only rights; patient wrappers require ownership; clinical wrappers use the established role/capability/read or mutation policy. Derive audit actors from the authenticated context.
- [ ] Add a build-manifest regression check that rejects named internal helpers in both node and edge action maps. Record filename/export/worker classification, never IDs or encryption material. A source grep alone is insufficient.
- [ ] Build the exact implementation revision using the pinned runtime and inspect the emitted manifest. Use a disposable fixture environment to submit direct action requests as anonymous, patient A/B, support, doctor and admin. Test denial before any privileged read/write/provider call, permitted operations, another clinician's assigned case and the established unassigned-case rule. Page-render denial does not count as an action test.
- [ ] Verify background email/recovery and draft generation retain their internal functionality without needing a browser session. Run focused tests, typecheck and lint; inspect the diff and commit this boundary change separately.

**Acceptance:** Internal helpers are absent from the exact-build action manifest; deliberate actions reject unauthorized identities and foreign cases at the function boundary; background consumers still work. Hosted exposure remains a separate gate.

## Task 2: Bind explicit consent to the current disclosure

**Modify:** `components/request/steps/review-step.tsx`, `components/request/store.ts`, `lib/request/draft-storage.ts`, `lib/request/unified-checkout.ts`, `lib/constants/index.ts`, both checkout validation paths; extend `lib/__tests__/request-store-attestation-invalidation.test.ts`.

**Create:** `lib/request/consent-contract.ts`, `lib/__tests__/checkout-consent-contract.test.ts`, `e2e/checkout-consent.spec.ts`.

**Interface:** A shared pure validator consumes the accepted version and explicit terms/accuracy/telehealth booleans. It returns a validated consent value only for the current version and literal true values. Keep legacy field normalization separate; absent telehealth confirmation cannot become true through alias fallback.

- [ ] Have the Medical Director approve concise disclosure covering form-first review, possible contact, in-person limitations and documentation-only AI, consistent with `docs/CLINICAL.md`. Confirm any necessary service-specific wording. Keep one checkbox if clearly labelled and all disclosures are presented; an extra checkbox is not inherently required.
- [ ] Define one new immutable disclosure version used by both visible copy and server validation. Submit the version actually rendered/accepted. Never substitute the latest server version for an absent client version.
- [ ] Persist the accepted version alongside confirmation in local/scoped drafts. On missing or outdated version, service/episode change, or material answer/identity change, clear confirmation and timestamp. Preserve no-op edits. Apply this to every restore path, not only service switching.
- [ ] Replace unconditional checkout consent literals with the validated current confirmation. Both guest and authenticated checkout must reject missing/false telehealth confirmation and missing/stale versions before Stripe creation.
- [ ] Test both checkout paths against true/false/missing/string booleans and current/stale/missing versions. Test refresh, legacy draft restoration, scoped service switching, identity prefill changes, answer edits, and unchanged drafts. Assert no payment session on invalid consent.
- [ ] Verify keyboard/mobile presentation and that the confirmation is initially unchecked for a new or invalidated episode. Run focused tests, typecheck and lint, review the diff and commit.

**Acceptance:** The patient explicitly accepts the displayed current disclosure; checkout accepts exactly that version; material changes or old drafts cannot reuse stale consent.

## Task 3: Require durable consent evidence across payment recovery

**Modify:** `lib/stripe/checkout/persistence.ts`, `lib/stripe/guest-checkout.ts`, `lib/stripe/checkout/retry-payment.ts`, `lib/audit/compliance-audit.ts` through a consent-specific checked writer, and recovery presentation where reconfirmation is required.

**Create:** `lib/stripe/checkout/consent-evidence.ts`, `lib/__tests__/checkout-consent-evidence.test.ts`. Add a migration only if current audit storage cannot support the required idempotency and revision binding after schema inspection.

**Interface:** The consent-specific writer accepts validated consent, intake/patient identity and the server's current episode revision; returns a durable receipt or a typed failure. A server receipt timestamp means received/persisted time. Any client click timestamp is separately labelled and never trusted as authoritative.

- [ ] Bind the receipt to the actual persisted episode/answer and identity revision. Keep clinical contents out of the audit event; use an existing revision token or a server-generated opaque binding. Detect concurrent material changes before accepting a receipt or opening payment.
- [ ] Require a successful durable receipt before new Stripe session creation. Handle null/error as a recoverable consent-evidence failure; preserve the intake, expose a bounded retry path, and emit a payload-free operational error. Do not globally make unrelated audit events fatal.
- [ ] Make repeated submission idempotent: reuse a valid same-episode receipt, do not duplicate attestations or overwrite historical versions. Recheck on idempotency collisions, authenticated recovery and guest duplicate recovery.
- [ ] Retry payment only with evidence valid for the current episode revision and supported disclosure. Missing/stale evidence requires explicit reconfirmation, not automatic evidence creation. Preserve already-paid and session-replacement safeguards; do not mutate payment obligations before resolving a consent failure.
- [ ] Test RPC null/error, partial evidence failure, duplicate submission, concurrent answer change, missing legacy evidence, valid unchanged receipt, stale disclosure, paid intake, and guest-to-authenticated recovery. Assert zero new Stripe sessions until the receipt is durable and valid.
- [ ] Review whether schema/RLS changes are needed; if so, include migration replay and rollback proof. Run focused tests, typecheck and lint, inspect the diff and commit separately.

**Acceptance:** New or retried payment cannot assert consent without a durable matching receipt. Historic records remain unchanged and any later remediation is expressly authorized.

## Independent release and evidence gates

| Gate | Required evidence / owner |
|---|---|
| Human | Medical Director approves disclosure and historic handling; operator confirms any ambiguous clinical read entitlement. No approval is assumed here. |
| Credentials | Disposable synthetic test identities for each role and payment sandbox access. Do not use real patient records to demonstrate exploitation. |
| Exact build | Fresh production build tied to commit SHA, emitted-action inventory and direct-action tests. The old local manifest is insufficient. |
| Deployment | Separate authorized release, required CI, deployed commit/build receipt and safe hosted synthetic verification. No live probes were performed in this review. |
| Historical evidence | Authorized aggregate-only investigation if needed; distinguish missing logging from absent patient consent and actual unauthorized access from potential exposure. Never backfill an attestation from payment alone. |
| Rollback | Preserve consent receipts and paid records. If rollback would restore an unsafe payment/action boundary, hold the affected path rather than deleting evidence or silently reopening it. |

## Plan review

Self-review: three bounded deliverables; no navigation work, dependency changes, production action tests or historic corrections are included. Confirmed source defects are separated from old compiled evidence and unresolved authorization policy. Application tests and a fresh production build were not run during this planning review. Documentation checks and commit evidence belong to the plan handoff.
