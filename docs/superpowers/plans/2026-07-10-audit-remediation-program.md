# Audit Remediation Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the audit-confirmed privacy, clinical-governance, documentation, artifact-retention, and repository-hygiene debt without deleting live product code or weakening InstantMed policy.

**Architecture:** Deliver the work as independently reviewable PRs. First contain the false PHI rotation instructions, then wire the existing per-certificate doctor batch-review invariant, retire the unowned service worker through a cleanup bridge, move raw review evidence out of Git, repair canonical documentation and plan lifecycle, and finally introduce a ratcheted Knip gate before deleting only individually proven dead files. No task treats a barrel graph or a Knip report as automatic deletion authority.

**Tech Stack:** Next.js 15.5.18 App Router (webpack), React 18.3.1, TypeScript 5.9 strict, Supabase, Vitest 4, Playwright 1.60, Tailwind CSS 4.2.2, Knip 6.26.0, Node 24, pnpm 10.23.0.

## Global Constraints

- Plan base: `origin/main` at `76dc4e043` (PR #310). Rebase each implementation branch before editing and re-check line locations.
- Use `corepack pnpm`; do not use the unrelated bundled `pnpm` runtime.
- Do not upgrade Next, React, Tailwind, Framer Motion, webpack, Node, or any stack-pin script.
- Do not rename `middleware.ts`, add Turbopack, or use Next 16 APIs.
- Do not edit `AGENTS.md` by hand. Edit `CLAUDE.md`, then run `scripts/sync-agent-doc.sh`.
- Keep each numbered PR lane separate. PHI containment must not wait for repository cleanup.
- Preserve the canonical clinical policy: every auto-approved medical certificate receives an explicit doctor outcome. The 24-hour deadline is an **InstantMed clinical-governance control**, not an attributed statutory AHPRA rule unless the Medical Director separately supplies that source.
- Never implement bulk review attestation. One click must not mark unseen certificates reviewed.
- Do not silently backfill historical `batch_reviewed_at` values. Surface the backlog and process it honestly.
- Do not treat `qa_sampled` as clinical review evidence. The current QA cron only selects and stamps rows; QA sampling remains a separate control.
- Retire the service worker through unregister/cache cleanup. Do not raw-delete `public/sw.js` while stale clients may still have the old worker.
- Synthetic patient-count plumbing is outside this program. PR #307 removed rendered consumers and contracts fence it pending a truthful re-anchor decision.
- Do not delete a file solely because a barrel is unused or Knip reports it. Require exact-path reference proof, intentional-root review, focused tests, and relevant route/build proof.
- Keep live landing-page components, `components/uix/**`, gated weight-loss code, future medication guidance, active visual snapshots, photography masters, and migrations unless a later owner decision changes scope.
- Do not rewrite Git history in this program. Remove current-tree bloat and prevent recurrence first.
- Review evidence and alerts must remain aggregate-only and PHI-safe.

---

## Reconciled Decision Record

| Finding | Reconciled decision |
|---|---|
| PHI key-rotation runbook | Confirmed P0 operational hazard. Contain immediately; actual rotation remains a separate security RFC. |
| Medical-certificate batch review | Confirmed clinical-governance gap. Wire individual review and revocation outcomes; do not weaken canon. |
| Service-worker caching | Confirmed, narrower than an online leak: network-first HTML caching leaves shared-device/offline replay risk. Retire in stages. |
| Synthetic patient count | Downgraded. No rendered consumer after PR #307; leave fenced plumbing for the separate truthful-reanchor decision. |
| “65-file dead island” | Rejected as deletion authority. Unused barrels and some leaves are dead, but every deletion must be proven per file. |
| HAR credential risk | Downgraded: captures are localhost development sessions. Raw HARs/traces still do not belong in Git. No key rotation follows from these files. |
| Hours-copy sweep | Narrowed to `docs/BRAND.md`’s retired first-review window and one numeric article table. Do not purge contextual education or metric-backed dynamic claims. |
| Tracked-size disagreement | Approximately 274 MiB is the current tracked tree; approximately 128 MiB is the immediate trace/HAR deletion. These numbers describe different scopes. |

## PR Sequence

1. `fix/security-key-rotation-containment` — Task 1.
2. `feat/med-cert-batch-review-control` — Tasks 2–3.
3. `fix/service-worker-retirement` — Task 4 Stage A.
4. `chore/review-artifact-retention` — Task 5.
5. `docs/plan-lifecycle-and-canon-repair` — Tasks 6–7.
6. `chore/dead-code-ratchet` — Task 8.
7. `chore/verified-hygiene-cleanup` — Tasks 9–10.
8. Service-worker Stage B only after the adoption window in Task 11.

Ship the PHI containment, batch-review control, and service-worker privacy retirement before the general cleanup lanes. Schedule Tasks 5–10 around the active revenue/intake roadmap; none of those hygiene tasks should displace a higher-value in-flight product PR unless repository size or CI reliability becomes an immediate blocker.

---

### Task 1: Contain the false PHI key-rotation instructions

**Files:**
- Create: `lib/__tests__/phi-key-rotation-doc-contract.test.ts`
- Modify: `docs/SECURITY.md:6-23`
- Modify: `docs/OPERATIONS.md:223-229`
- Modify: `docs/runbooks/BREAK_GLASS.md:12-21`
- Modify: `docs/PHI_KEY_ROTATION_DESIGN.md:1-74`
- Modify: `app/admin/settings/encryption/page.tsx:60-75`
- Modify: `scripts/encrypt-phi-backfill.ts:1-30`
- Modify: `scripts/doc-audit.sh`

**Interfaces:**
- Consumes: Existing `PHI_MASTER_KEY` envelope encryption and separate `ENCRYPTION_KEY` legacy/profile-field encryption.
- Produces: One pinned operational invariant: neither key currently has a shipped rotation path, and `encrypt-phi-backfill.ts` is initial plaintext backfill only.

- [ ] **Step 1: Write the failing documentation contract**

Create `lib/__tests__/phi-key-rotation-doc-contract.test.ts`:

```ts
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")
const ROTATION_BLOCKED = "PHI key rotation is not implemented"

describe("PHI key rotation documentation", () => {
  it("blocks rotation in every operator-facing runbook", () => {
    for (const path of [
      "docs/SECURITY.md",
      "docs/OPERATIONS.md",
      "docs/runbooks/BREAK_GLASS.md",
    ]) {
      expect(read(path), path).toContain(ROTATION_BLOCKED)
    }
  })

  it("does not present the plaintext backfill as a rotation tool", () => {
    expect(read("docs/SECURITY.md")).not.toContain(
      "Key rotation: generate new key, re-encrypt PHI fields via `scripts/encrypt-phi-backfill.ts`, update env var",
    )
    expect(read("docs/OPERATIONS.md")).not.toContain(
      "Use `scripts/encrypt-phi-backfill.ts` for re-encryption",
    )
    expect(read("docs/PHI_KEY_ROTATION_DESIGN.md")).not.toContain(
      "scripts/generate-phi-master-key.mjs",
    )
  })

  it("labels the script as initial backfill only", () => {
    const script = read("scripts/encrypt-phi-backfill.ts")
    expect(script).toContain("INITIAL BACKFILL ONLY — NOT KEY ROTATION")
    expect(script).toContain("This script uses ENCRYPTION_KEY")
  })
})
```

- [ ] **Step 2: Run the contract and verify it fails on current canon**

Run:

```bash
corepack pnpm exec vitest run lib/__tests__/phi-key-rotation-doc-contract.test.ts
```

Expected: FAIL because the three runbooks do not contain `PHI key rotation is not implemented`, and the old affirmative instructions remain.

- [ ] **Step 3: Replace the unsafe operator instructions with exact containment copy**

Use this invariant in `SECURITY.md`, `OPERATIONS.md`, and `BREAK_GLASS.md`:

```md
> **PHI key rotation is not implemented.** Do not replace or remove the current
> `PHI_MASTER_KEY` or `ENCRYPTION_KEY`. `scripts/encrypt-phi-backfill.ts` is an
> initial plaintext-to-`ENCRYPTION_KEY` backfill only; it cannot re-encrypt
> existing ciphertext or rotate `PHI_MASTER_KEY`. If a key value was changed
> accidentally, restore the exact previous value and redeploy, preserve both
> sealed copies, and escalate before any data rewrite.
```

In `docs/PHI_KEY_ROTATION_DESIGN.md`, keep `Status: DESIGN ONLY`, remove the nonexistent generator instruction, and add this immediately below the status:

```md
> This document is not an executable runbook. Neither key has a shipped rotation
> path. Phase 2 must not begin until dual-key reads, an audited key-generation
> procedure, complete column/cipher-format inventory, and rollback tests have
> shipped in a separately approved security change.
```

In the encryption diagnostics page, replace “checks for key rotation” with “coverage diagnostics; key rotation is not implemented” and render a warning callout containing the same invariant.

- [ ] **Step 4: Add the script-level warning**

Place this banner in the file header and log it before any database query:

```ts
/**
 * INITIAL BACKFILL ONLY — NOT KEY ROTATION.
 * This script uses ENCRYPTION_KEY to populate missing encrypted profile fields.
 * It does not read PHI_MASTER_KEY and cannot re-encrypt existing ciphertext.
 */

log("INITIAL BACKFILL ONLY — NOT KEY ROTATION", "info")
log("This script uses ENCRYPTION_KEY and skips existing ciphertext", "info")
```

- [ ] **Step 5: Add the new contract to the doc gate**

Add `lib/__tests__/phi-key-rotation-doc-contract.test.ts` to the `pnpm exec vitest run` list in `scripts/doc-audit.sh` and update its “8 specs” wording to “9 specs”.

- [ ] **Step 6: Verify containment**

Run:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/phi-key-rotation-doc-contract.test.ts \
  lib/__tests__/phi-encryption.test.ts
corepack pnpm doc:audit
git diff --check
```

Expected: all pass. No encryption code, key value, or production data changes.

- [ ] **Step 7: Commit the containment PR**

```bash
git add docs/SECURITY.md docs/OPERATIONS.md docs/runbooks/BREAK_GLASS.md \
  docs/PHI_KEY_ROTATION_DESIGN.md app/admin/settings/encryption/page.tsx \
  scripts/encrypt-phi-backfill.ts scripts/doc-audit.sh \
  lib/__tests__/phi-key-rotation-doc-contract.test.ts
git commit -m "docs(security): block unsupported PHI key rotation"
```

---

### Task 2: Establish the batch-review domain policy and safe server actions

**Files:**
- Create: `lib/clinical/batch-review-policy.ts`
- Create: `lib/__tests__/batch-review-policy.test.ts`
- Create: `lib/__tests__/batch-review-cert.test.ts`
- Modify: `lib/data/intakes/queries.ts:401-490`
- Modify: `lib/data/intakes/index.ts`
- Modify: `app/actions/batch-review-cert.ts`
- Modify: `app/actions/revoke-ai-approval.ts`
- Modify: `app/dashboard/page.tsx:90-135`
- Modify: `app/doctor/queue/types.ts`

**Interfaces:**
- Consumes: `intakes.ai_approved`, `ai_approved_at`, `batch_reviewed_at`, `batch_reviewed_by`, the existing partial index, and `doctorHasCapability(profile, "review_med_certs")`.
- Produces:
  - `BATCH_REVIEW_DEADLINE_HOURS = 24`
  - `isBatchReviewOverdue(aiApprovedAt, now?)`
  - `getPendingBatchReviews({ limit? }) -> { data, total, oldestApprovedAt, degraded }`
  - `markBatchReviewed(intakeId) -> { success, error?, reviewedAt? }`

- [ ] **Step 1: Write the pure policy module and failing tests**

Create `lib/clinical/batch-review-policy.ts`:

```ts
export const BATCH_REVIEW_DEADLINE_HOURS = 24
export const BATCH_REVIEW_DEADLINE_MS = BATCH_REVIEW_DEADLINE_HOURS * 60 * 60 * 1000

export function getBatchReviewDeadline(aiApprovedAt: string): Date | null {
  const approvedAt = new Date(aiApprovedAt)
  if (!Number.isFinite(approvedAt.getTime())) return null
  return new Date(approvedAt.getTime() + BATCH_REVIEW_DEADLINE_MS)
}

export function isBatchReviewOverdue(aiApprovedAt: string | null, now = new Date()): boolean {
  if (!aiApprovedAt) return false
  const deadline = getBatchReviewDeadline(aiApprovedAt)
  return deadline ? deadline.getTime() <= now.getTime() : false
}
```

Test valid-before-deadline, valid-at-deadline, invalid timestamp, and null timestamp in `batch-review-policy.test.ts`.

- [ ] **Step 2: Run the policy tests**

```bash
corepack pnpm exec vitest run lib/__tests__/batch-review-policy.test.ts
```

Expected: PASS once the pure module exists.

- [ ] **Step 3: Replace the broad AI-approved reader with a pending-review reader**

Export this result shape from `lib/data/intakes/queries.ts`:

```ts
export interface PendingBatchReviewResult {
  data: IntakeWithPatient[]
  total: number
  oldestApprovedAt: string | null
  degraded: boolean
}
```

Implement `getPendingBatchReviews({ limit = 20 })` with these query invariants:

```ts
.eq("ai_approved", true)
.is("batch_reviewed_at", null)
.eq("category", "medical_certificate")
.in("status", ["approved", "completed"])
.order("ai_approved_at", { ascending: true })
.limit(limit)
```

Select `batch_reviewed_at` and `batch_reviewed_by`, return the exact total count, exclude seeded E2E rows through the existing helper, and report `degraded: true` on a failed query instead of turning failure into a trusted empty queue.

- [ ] **Step 4: Write server-action tests before changing the action**

Cover these cases in `batch-review-cert.test.ts` using the existing hoisted Vitest/Supabase-chain pattern:

```ts
it("rejects callers without doctor access")
it("rejects doctors without review_med_certs capability")
it("CAS-updates one eligible auto-approved med cert")
it("does not report success when the update returns zero rows")
it("treats an already-reviewed row as idempotent success")
it("does not export a bulk acknowledgement action")
```

The successful update payload must be exactly:

```ts
{
  batch_reviewed_at: reviewedAt,
  batch_reviewed_by: profile.id,
}
```

and the update chain must constrain `id`, `ai_approved`, `category`, eligible status, and `batch_reviewed_at IS NULL` before `.select("id, batch_reviewed_at")`.

- [ ] **Step 5: Harden `markBatchReviewed` and remove bulk attestation**

Keep only a single-intake action. Validate the UUID with Zod, require `doctor` or `admin`, apply `doctorHasCapability(profile, "review_med_certs")`, perform a compare-and-set update, and return the timestamp actually written.

Delete `markAllBatchReviewed()`. Record the doctor acknowledgement in `ai_audit_log` using the existing `approve` enum plus metadata:

```ts
{
  review_type: "post_auto_approval_batch_review",
  outcome: "reviewed_no_change",
}
```

- [ ] **Step 6: Make revocation a completed oversight outcome**

When `revokeAIApproval` successfully moves the certificate to manual review, stamp:

```ts
batch_reviewed_at: new Date().toISOString(),
batch_reviewed_by: profile.id,
```

Preserve the existing revocation reason, certificate revocation, patient notification, and audit log. Add a focused assertion that revocation completes the batch-review outcome.

- [ ] **Step 7: Load the pending queue for every clinically capable staff user**

In `app/dashboard/page.tsx`, replace the admin-only fetch with a `hasDoctorAccess(profile)` fetch. Support still redirects before this query. Pass `PendingBatchReviewResult` to `QueueClient`; do not pass a bare array that loses degraded/total state.

- [ ] **Step 8: Verify the server layer**

```bash
corepack pnpm exec vitest run \
  lib/__tests__/batch-review-policy.test.ts \
  lib/__tests__/batch-review-cert.test.ts \
  lib/__tests__/auto-approval.test.ts \
  lib/__tests__/auto-approval-state.test.ts
corepack pnpm typecheck
```

Expected: all pass; no migration required.

- [ ] **Step 9: Commit the server/domain slice**

```bash
git add lib/clinical/batch-review-policy.ts lib/data/intakes/queries.ts \
  lib/data/intakes/index.ts app/actions/batch-review-cert.ts \
  app/actions/revoke-ai-approval.ts app/dashboard/page.tsx \
  app/doctor/queue/types.ts lib/__tests__/batch-review-policy.test.ts \
  lib/__tests__/batch-review-cert.test.ts
git commit -m "fix(clinical): enforce individual med-cert batch review"
```

---

### Task 3: Put batch-review oversight into the live cockpit and monitoring

**Files:**
- Create: `components/doctor/batch-review-banner.tsx`
- Create: `components/doctor/review/batch-review-attestation.tsx`
- Create: `lib/monitoring/batch-review-health.ts`
- Create: `lib/__tests__/batch-review-health.test.ts`
- Create: `e2e/medcert.batch-review.spec.ts`
- Modify: `app/doctor/queue/queue-client.tsx`
- Modify: `app/doctor/queue/queue-table.tsx:803-890`
- Modify: `components/doctor/review/intake-action-buttons.tsx`
- Modify: `components/doctor/review/intake-review-context.tsx`
- Modify: `components/doctor/intake-review-panel.tsx`
- Modify: `app/api/cron/business-alerts/route.ts`
- Modify: `docs/CLINICAL.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/OPERATIONS.md`

**Interfaces:**
- Consumes: `PendingBatchReviewResult`, `markBatchReviewed`, `revokeAIApproval`, and the full loaded `ReviewData` payload.
- Produces: A compact oldest-first queue, per-certificate doctor acknowledgement, and aggregate overdue alerting with no patient identifiers.

- [ ] **Step 1: Build the compact oversight banner**

`BatchReviewBanner` receives:

```ts
interface BatchReviewBannerProps {
  result: PendingBatchReviewResult
  onOpenOldest: (intakeId: string) => void
}
```

Render it above normal queue filters whenever `total > 0` or `degraded` is true. Show pending count, oldest age, a calm warning when overdue, and one “Review oldest” action. Do not include “Confirm all”, selection checkboxes, or batch mutation.

- [ ] **Step 2: Add deliberate per-certificate attestation**

Render `BatchReviewAttestation` only when all are true:

```ts
intake.ai_approved === true &&
intake.batch_reviewed_at === null &&
["approved", "completed"].includes(intake.status)
```

The component must require a consent-style checkbox with exact copy:

```text
I reviewed the intake and issued certificate.
```

Enable “Confirm reviewed” only after that acknowledgement. Explain that clinical concerns use the existing revocation path. On success, hide the local control, refresh the route, and advance to the next oldest item.

- [ ] **Step 3: Delete the unreachable queue-table card**

Remove the `!compactShell` AI-approved card from `queue-table.tsx`. The new banner and review-panel attestation are the only ownership surface. Preserve PDF viewing and revocation through the review workflow.

- [ ] **Step 4: Add aggregate overdue monitoring**

`lib/monitoring/batch-review-health.ts` must return only:

```ts
export interface BatchReviewHealth {
  pending: number
  overdue: number
  oldestApprovedAt: string | null
  queryFailed: boolean
}
```

Add a fail-soft `runAlertSection` section to `business-alerts`. Page only when `overdue > 0`, use metric `med_cert_batch_review_overdue`, and include count/oldest age but no intake ID, name, email, or clinical detail. Give the metric the existing four-hour cooldown.

- [ ] **Step 5: Pin the policy accurately in canonical docs**

State that every auto-approved med cert requires one doctor outcome within 24 hours as an InstantMed governance control. Do not label the exact deadline a statutory AHPRA rule. Document the two outcomes: reviewed-no-change or revoked-for-manual-assessment.

- [ ] **Step 6: Add E2E proof**

`e2e/medcert.batch-review.spec.ts` must seed an auto-approved, unreviewed certificate and prove:

```ts
test("doctor and admin see the oldest pending review and acknowledge it")
test("revocation stamps review completion and returns the case to manual assessment")
test("patient and support roles cannot access the clinical oversight queue")
test("overdue reviews render the warning state")
```

Assert `batch_reviewed_at` and `batch_reviewed_by` directly from Supabase after the UI action. Do not assert only that a toast appeared.

- [ ] **Step 7: Verify UI, monitoring, and browser behavior**

```bash
corepack pnpm exec vitest run \
  lib/__tests__/batch-review-policy.test.ts \
  lib/__tests__/batch-review-cert.test.ts \
  lib/__tests__/batch-review-health.test.ts \
  lib/__tests__/doctor-queue-contract.test.ts \
  lib/__tests__/auto-approval.test.ts
E2E_PORT=3061 PLAYWRIGHT_WORKERS=1 corepack pnpm e2e -- e2e/medcert.batch-review.spec.ts
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm doc:audit
```

Then verify `/dashboard` at desktop and mobile widths, light and dark mode, opening the oldest review, acknowledging it, and seeing it disappear. Staff surfaces receive no decorative motion.

- [ ] **Step 8: Run the pre-deploy aggregate backlog query**

```sql
SELECT
  count(*) AS pending,
  count(*) FILTER (
    WHERE ai_approved_at < now() - interval '24 hours'
  ) AS overdue,
  min(ai_approved_at) AS oldest
FROM intakes
WHERE ai_approved = true
  AND batch_reviewed_at IS NULL
  AND category = 'medical_certificate';
```

Record counts only in the deployment receipt. Do not mass-update the returned rows.

- [ ] **Step 9: Commit the cockpit/monitoring slice**

```bash
git add components/doctor/batch-review-banner.tsx \
  components/doctor/review/batch-review-attestation.tsx \
  app/doctor/queue/queue-client.tsx app/doctor/queue/queue-table.tsx \
  components/doctor/review/intake-action-buttons.tsx \
  components/doctor/review/intake-review-context.tsx \
  components/doctor/intake-review-panel.tsx lib/monitoring/batch-review-health.ts \
  app/api/cron/business-alerts/route.ts docs/CLINICAL.md \
  docs/ARCHITECTURE.md docs/OPERATIONS.md \
  lib/__tests__/batch-review-health.test.ts e2e/medcert.batch-review.spec.ts
git commit -m "feat(clinical): surface med-cert batch oversight"
```

---

### Task 4: Retire the service worker without leaving stale browser caches

**Files:**
- Create: `lib/security/browser-cache-cleanup.ts`
- Create: `lib/__tests__/service-worker-privacy-contract.test.ts`
- Replace: `public/sw.js`
- Modify: `components/pwa/service-worker-registration.tsx`
- Modify: `lib/supabase/auth-provider.tsx`
- Modify: `app/patient/settings/settings-client.tsx`
- Modify: `app/auth/account-closed/account-closed-client.tsx`
- Modify: `app/auth/reset-password/reset-password-client.tsx`
- Modify: `lib/__tests__/closed-account-patient-surface-contract.test.ts`

**Interfaces:**
- Consumes: Existing same-origin service-worker registrations and Cache Storage names beginning `instantmed-`.
- Produces: `clearInstantMedBrowserCaches(): Promise<void>` plus a no-fetch retirement tombstone.

- [ ] **Step 1: Write the privacy contract**

Require the final source to satisfy:

```ts
expect(swSource).not.toContain("addEventListener('fetch'")
expect(swSource).not.toContain("addEventListener('push'")
expect(swSource).not.toContain("notificationclick")
expect(swSource).toContain("name.startsWith('instantmed-')")
expect(swSource).toContain("registration.unregister()")
```

Also source-check every direct browser sign-out path for a call to the shared cleanup helper.

- [ ] **Step 2: Implement the shared fail-soft cleanup helper**

Create:

```ts
export async function clearInstantMedBrowserCaches(): Promise<void> {
  if (typeof window === "undefined") return

  const tasks: Promise<unknown>[] = []
  if ("caches" in window) {
    tasks.push(
      caches.keys().then((names) =>
        Promise.all(names.filter((name) => name.startsWith("instantmed-")).map((name) => caches.delete(name))),
      ),
    )
  }
  if ("serviceWorker" in navigator) {
    tasks.push(
      navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      ),
    )
  }
  await Promise.allSettled(tasks)
}
```

Never let cleanup failure block sign-out.

- [ ] **Step 3: Replace `public/sw.js` with the retirement tombstone**

Use exactly this behavior:

```js
/* eslint-env serviceworker */
/* global clients */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter((name) => name.startsWith('instantmed-')).map((name) => caches.delete(name))
    );
    await self.registration.unregister();
    await clients.claim();
  })());
});
```

Do not add fetch, push, background-sync, or notification handlers.

- [ ] **Step 4: Turn registration into a temporary retirement bridge**

The component must inspect existing registrations, request their update so they receive the tombstone, invoke `clearInstantMedBrowserCaches`, and never register a worker when no registration exists. Remove the `window.confirm()` update UI.

- [ ] **Step 5: Call cleanup from every sign-out path**

Call and await the helper where possible immediately before or alongside Supabase sign-out. Use `Promise.allSettled` in paths that already run multiple sign-out operations. Cover the shared auth provider plus patient settings, account-closed, and reset-password direct calls.

- [ ] **Step 6: Run focused and browser proof**

```bash
corepack pnpm exec vitest run \
  lib/__tests__/service-worker-privacy-contract.test.ts \
  lib/__tests__/closed-account-patient-surface-contract.test.ts
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
```

Against a production-mode local build, create `instantmed-v1`, cache a synthetic `/patient` HTML response, load the app, and prove the cache and registration disappear. Repeat through desktop and mobile sign-out controls. Verify `/patient` and `/dashboard` cannot replay offline after logout.

- [ ] **Step 7: Commit Stage A**

```bash
git add public/sw.js components/pwa/service-worker-registration.tsx \
  lib/security/browser-cache-cleanup.ts lib/supabase/auth-provider.tsx \
  app/patient/settings/settings-client.tsx \
  app/auth/account-closed/account-closed-client.tsx \
  app/auth/reset-password/reset-password-client.tsx \
  lib/__tests__/service-worker-privacy-contract.test.ts \
  lib/__tests__/closed-account-patient-surface-contract.test.ts
git commit -m "fix(privacy): retire navigation-caching service worker"
```

---

### Task 5: Stop tracking raw browser evidence and remove the current trace/HAR payload

**Files:**
- Modify: `docs/reviews/.gitignore`
- Modify: `scripts/check-orphaned-files.sh`
- Modify: `scripts/conversion-funnel-audit.ts`
- Modify: `docs/reviews/2026-06-02-conversion-funnel-audit/report.md`
- Delete: 13 `docs/reviews/2026-06-02-conversion-funnel-audit/**/trace.zip`
- Delete: 13 `docs/reviews/2026-06-02-conversion-funnel-audit/**/*.har`

**Interfaces:**
- Consumes: Existing review generator and GitHub Actions 30-day artifact retention.
- Produces: Curated reports/screenshots in Git; raw traces/HARs/videos remain local or expiring CI artifacts.

- [ ] **Step 1: Add the failing tracked-artifact guard**

Append to `check-orphaned-files.sh`:

```bash
while IFS= read -r tracked_review_file; do
  case "$tracked_review_file" in
    *.har|*/trace.zip|*.webm|*/critique.raw.txt)
      echo "ORPHAN: $tracked_review_file is raw review evidence and must use expiring artifact storage"
      orphans=$((orphans + 1))
      ;;
  esac
done < <(git ls-files docs/reviews)
```

Run `bash scripts/check-orphaned-files.sh`; expect failure on the 26 tracked trace/HAR files.

- [ ] **Step 2: Ignore future raw evidence**

Add to `docs/reviews/.gitignore`:

```gitignore
*.webm
*.har
trace.zip
critique.raw.txt
```

Keep `final.png`, structured DOM evidence, aggregate data, model synthesis, and curated Markdown eligible for deliberate commits.

- [ ] **Step 3: Remove raw links from generated and historical reports**

Update the conversion audit generator so committed report tables contain screenshot and structured-evidence links only. Raw trace/HAR/video paths may appear in local console output or CI artifact metadata, not committed Markdown.

- [ ] **Step 4: Delete the 26 tracked raw files**

```bash
find docs/reviews/2026-06-02-conversion-funnel-audit -type f \
  \( -name 'trace.zip' -o -name '*.har' \) -print0 | xargs -0 git rm
```

Expected current-tree reduction: 134,339,228 bytes. Do not rewrite history and do not rotate credentials based on localhost development cookies.

- [ ] **Step 5: Verify retention**

```bash
bash scripts/check-orphaned-files.sh
test -z "$(git ls-files 'docs/reviews/**/*.har' 'docs/reviews/**/trace.zip' 'docs/reviews/**/*.webm')"
corepack pnpm doc:audit
git diff --check
```

- [ ] **Step 6: Commit artifact retention**

```bash
git add docs/reviews/.gitignore scripts/check-orphaned-files.sh \
  scripts/conversion-funnel-audit.ts \
  docs/reviews/2026-06-02-conversion-funnel-audit/report.md \
  docs/reviews/2026-06-02-conversion-funnel-audit/captures
git commit -m "chore(reviews): move raw browser evidence out of Git"
```

---

### Task 6: Consolidate plan lifecycle and remove duplicate status surfaces

**Files:**
- Modify: `scripts/doc-audit.sh`
- Modify: `docs/bookkeeping/file-map.md`
- Modify: `docs/bookkeeping/expected-md-count`
- Modify: `docs/plans/archive/README.md`
- Modify: `docs/ROADMAP.md`
- Modify: `lib/services/service-catalog.ts:13`
- Modify: `lib/__tests__/project-docs-drift-contract.test.ts`
- Delete: 13 byte-identical root plan copies already present in `docs/plans/archive/`
- Move: `docs/plans/2026-05-26-minimal-slide-modal-{design,plan}.md` to `docs/plans/archive/`
- Move: seven `docs/superpowers/plans/2026-06-26-*.md` to `docs/plans/archive/`
- Move: `docs/superpowers/plans/2026-07-08-seo-geo-llm-task5-plan.md` to `docs/plans/archive/`
- Move after backlog reconciliation: `docs/superpowers/plans/2026-06-06-customer-growth-phased-plan.md` to `docs/plans/archive/`
- Move after residual-work transfer: `docs/plans/2026-06-10-{organic-geo-beat-nextclinic-plan,content-mimic-map}.md` to `docs/plans/archive/`
- Delete after backlog transfer: `docs/plans/2026-05-23-archived-plan-followups.md`
- Delete: `docs/audits/2026-06-04-session-handoff.md`

**Interfaces:**
- Consumes: Archive status policy and ROADMAP as the active backlog owner.
- Produces: Exactly one location per plan basename and an audit that prevents active/archive duplication.

- [ ] **Step 1: Add the duplicate-basename guard before deleting anything**

Add to `scripts/doc-audit.sh`:

```bash
echo "==> Duplicate active/archive plan basename check"
ACTIVE_PLAN_NAMES=$(find docs/plans -maxdepth 1 -type f -name '*.md' -exec basename {} \; | sort)
ARCHIVED_PLAN_NAMES=$(find docs/plans/archive -maxdepth 1 -type f -name '*.md' -exec basename {} \; | sort)
DUPLICATE_PLAN_NAMES=$(comm -12 <(printf '%s\n' "$ACTIVE_PLAN_NAMES") <(printf '%s\n' "$ARCHIVED_PLAN_NAMES"))
if [[ -n "$DUPLICATE_PLAN_NAMES" ]]; then
  echo "FAIL: plan basenames exist in both active and archive locations:"
  printf '%s\n' "$DUPLICATE_PLAN_NAMES"
  exit 1
fi
echo "OK: active/archive plan basenames are unique"
```

Run `corepack pnpm doc:audit`; expect failure listing 13 basenames.

- [ ] **Step 2: Delete only the duplicate root copies**

Delete exactly these root copies and keep their archive counterparts:

```text
docs/plans/2026-03-25-blood-test-referrals.md
docs/plans/2026-04-06-revenue-engagement-design.md
docs/plans/2026-04-06-revenue-engagement-plan.md
docs/plans/2026-04-13-god-component-decomposition.md
docs/plans/2026-04-13-lib-restructure-and-script-wiring.md
docs/plans/2026-04-20-design-system-95-sprint.md
docs/plans/2026-05-04-health-guides-rehaul.md
docs/plans/2026-05-20-admin-ops-cockpit-reshape-design.md
docs/plans/2026-05-20-admin-ops-cockpit-reshape-plan.md
docs/plans/2026-05-20-staff-cockpit-overhaul-design.md
docs/plans/2026-05-20-staff-cockpit-overhaul-plan.md
docs/plans/2026-05-23-doc-cleanup-plan.md
docs/plans/2026-05-23-doc-content-audit-plan.md
```

Do not prune archive originals based solely on age. Update the service-catalog source comment/reference from the root design-system plan to its archive path.

- [ ] **Step 3: Archive shipped implementation receipts**

Move the two May modal plans, seven June prescribing plans, and July SEO/GEO implementation plan into the existing central archive. Update `docs/plans/archive/README.md` with the shipped commit/PR evidence. Fix relative links after each move.

- [ ] **Step 4: Reconcile partially superseded plans and the follow-up stub into ROADMAP**

For `2026-06-06-customer-growth-phased-plan.md`, verify each remaining phase against current code and operating state, move only still-current work into `ROADMAP.md`, mark the old baseline “do not execute as-is”, and archive it.

For the two June 10 organic/GEO plans, record the portions shipped by PR #290, transfer remaining operator-only or external work into `ROADMAP.md` or the July 8 execution audit, and archive both. Keep the July 9 intake-dropoff plan active.

Finally, reconcile each open item from `2026-05-23-archived-plan-followups.md` against current code. Keep only unresolved items in `ROADMAP.md`, then delete the stub and remove its pin from `project-docs-drift-contract.test.ts`.

- [ ] **Step 5: Delete the obsolete session prompt**

Remove `docs/audits/2026-06-04-session-handoff.md`; its only current reference is bookkeeping. Do not describe it as previously unreferenced.

- [ ] **Step 6: Update bookkeeping exactly**

This planning branch adds one Markdown file, taking the pre-cleanup count from 116 to 117. The 13 duplicate deletions plus follow-up stub and session handoff remove 15. The expected post-cleanup count is therefore **102**, assuming no intervening Markdown additions.

Update `file-map.md` to reflect active, archived, and deleted status; then set `expected-md-count` to the actual verified count. If main gained another Markdown file, use the actual count and explain the delta in the same commit.

- [ ] **Step 7: Verify and commit plan lifecycle**

```bash
corepack pnpm doc:audit
bash scripts/check-orphaned-files.sh
git diff --check
```

```bash
git add docs/plans docs/superpowers/plans docs/audits \
  docs/ROADMAP.md docs/bookkeeping scripts/doc-audit.sh \
  lib/services/service-catalog.ts lib/__tests__/project-docs-drift-contract.test.ts
git commit -m "docs: consolidate active and archived plan truth"
```

---

### Task 7: Repair current canonical documentation and the one unsupported timing table

**Files:**
- Modify: `CLAUDE.md`
- Regenerate: `AGENTS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/SERVICE_LAUNCH_CHECKLISTS.md`
- Modify: `docs/OPERATIONS.md`
- Modify: `docs/TESTING.md`
- Modify: `docs/BRAND.md`
- Modify: `PRODUCT.md`
- Modify: `wiki/architecture.md`
- Modify: `wiki/code-hygiene-audit.md`
- Modify: `wiki/context-map.md`
- Modify: `content/blog/same-day-medical-certificate.mdx`
- Modify: `lib/__tests__/project-docs-drift-contract.test.ts`
- Modify: `lib/__tests__/service-launch-checklists-contract.test.ts`
- Modify: `lib/__tests__/hours-copy-contract.test.ts`

**Interfaces:**
- Consumes: Current code/config/tests as implementation truth; `DESIGN.md` as typography truth; current 24/7 operating policy.
- Produces: Canon with no deleted-template guidance, retired medication-search model, stale Data Manager gate, volatile test count, or unsupported time-of-day review table.

- [ ] **Step 1: Write recurrence guards first**

Add focused assertions:

```ts
expect(architecture).not.toContain("ServiceFunnelPage")
expect(serviceLaunch).not.toContain("PBS/AMT recall")
expect(serviceLaunch).toContain("plain free text")
expect(brand).not.toContain("First review at 6am")
expect(product).toContain("Plus Jakarta Sans")
expect(testing).not.toMatch(/Current test suite:.*\d{3,}/)
```

Extend the hours contract narrowly to reject a time-of-day/typical-review table shape and the retired BRAND phrase. Do not ban legitimate scenario clock times or metric-backed dynamic claims.

- [ ] **Step 2: Replace the deleted service-template doctrine**

Rewrite `ARCHITECTURE.md` around dedicated server-first landing modules (`MedCertLanding`, `PrescriptionsLanding`, `ErectileDysfunctionLanding`, `HairLossLanding`) and shared primitives. Remove every instruction to create or use `ServiceFunnelPage`.

- [ ] **Step 3: Correct implementation paths and volatile inventories**

Use these canonical paths:

```text
lib/config/env.ts
lib/format/
lib/data/intakes/
lib/offline/queue.ts
app/(marketing)/page.tsx
```

Remove volatile component/lib/E2E counts from narrative docs unless a command derives them. Correct `CLAUDE.md`, then regenerate `AGENTS.md`.

- [ ] **Step 4: Correct service, operations, typography, and brand truth**

- Medication entry is free text; missing strength/form/dose creates doctor-attention flags instead of a checkout hard block.
- Keep the conditional Google Ads paid-ramp preflight, but remove the sentence saying Data Manager API enablement/OAuth remain blocked after the June 30 production proof.
- Source Sans 3 is body/UI; Plus Jakarta Sans is display.
- ED and hair loss are live; weight management remains future/gated.
- Remove BRAND’s pre-6am/post-10pm first-review instruction.
- Remove exact test totals and the resolved known-failure claim from TESTING.md; document commands and ownership instead.

- [ ] **Step 5: Replace the article timing table**

Replace the numeric time-of-day table with:

```md
## Review timing

Requests can be submitted 24/7. Review timing varies with the live queue, the
details supplied, and whether the doctor needs follow-up information. A
certificate is issued only after doctor assessment; if timing is important,
submit accurate details early and watch for messages or email updates.
```

Do not perform a broad hours-copy purge.

- [ ] **Step 6: Verify docs, content, and rendering**

```bash
scripts/sync-agent-doc.sh
scripts/sync-agent-doc.sh --check
corepack pnpm exec vitest run \
  lib/__tests__/project-docs-drift-contract.test.ts \
  lib/__tests__/service-launch-checklists-contract.test.ts \
  lib/__tests__/hours-copy-contract.test.ts \
  lib/__tests__/marketing-copy-contract.test.ts \
  lib/__tests__/commercial-seo-contract.test.ts
corepack pnpm content:audit
corepack pnpm doc:audit
git diff --check
```

Render `/blog/same-day-medical-certificate` on port 3060 at desktop and mobile widths. Verify article structure, no broken table spacing, FAQ/schema output, and no console error.

- [ ] **Step 7: Commit canonical repair**

```bash
git add CLAUDE.md AGENTS.md PRODUCT.md docs wiki \
  content/blog/same-day-medical-certificate.mdx lib/__tests__
git commit -m "docs: reconcile canon with current runtime truth"
```

---

### Task 8: Add a ratcheted Knip gate before further dead-code deletion

**Files:**
- Create: `knip.config.ts`
- Create: `scripts/dead-code-baseline.ts`
- Create: `scripts/dead-code-baseline-lib.ts`
- Create: `scripts/dead-code-baseline.json`
- Create: `lib/__tests__/dead-code-baseline.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `lib/__tests__/release-check-contract.test.ts`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: Knip 6.26.0 JSON reports in comprehensive and production modes.
- Produces: Normalized keys `mode|issueType|file|symbol`; CI fails on new keys and stale baseline keys. Baseline entries are debt records, not deletion approval.

- [ ] **Step 1: Add the exact dependency without changing pinned framework packages**

```bash
corepack pnpm add -D knip@6.26.0
```

Review `package.json` and lockfile to confirm no pinned stack package changed.

- [ ] **Step 2: Create calibrated configuration**

Use a typed `knip.config.ts` with:

```ts
import type { KnipConfig } from "knip"

const config: KnipConfig = {
  entry: [
    "content/blog/*.mdx!",
    "public/sw.js!",
    "playwright.preview.config.ts",
    "scripts/e2e/{seed,teardown}.ts",
  ],
  project: [
    "app/**/*.{ts,tsx}!",
    "components/**/*.{ts,tsx}!",
    "hooks/**/*.{ts,tsx}!",
    "lib/**/*.{ts,tsx}!",
    "types/**/*.ts!",
    "content/**/*.mdx!",
    "middleware.ts!",
    "instrumentation.ts!",
    "instrumentation-client.ts!",
    "public/**/*.js!",
    "scripts/**/*.{ts,mjs,js}",
    "e2e/**/*.ts",
  ],
  ignore: ["tools/*-mcp-server/**"],
  ignoreFiles: [
    "app/weight-loss/weight-loss-client.tsx",
    "lib/clinical/medication-guidance.ts",
    "lib/design-system/version.ts",
  ],
  ignoreDependencies: [
    "@svgr/webpack",
    "import-in-the-middle",
    "require-in-the-middle",
  ],
  ignoreBinaries: ["supabase", "cwebp", "ffmpeg", "pdftotext"],
}

export default config
```

Add comments beside every exception explaining the runtime/config/external ownership. Do not hide issues in the baseline when configuration can model the real entry.

- [ ] **Step 3: Normalize and compare both reports**

`dead-code-baseline-lib.ts` must normalize every issue item as:

```ts
export interface DeadCodeKey {
  mode: "full" | "production"
  issueType: string
  file: string
  symbol: string
}

export function serializeKey(key: DeadCodeKey): string {
  return `${key.mode}|${key.issueType}|${key.file}|${key.symbol}`
}
```

The checker must:

1. Run Knip full and production JSON reporters with `--no-exit-code`.
2. Compare sorted unique keys with `scripts/dead-code-baseline.json`.
3. Fail on every new key.
4. Fail on every baseline key no longer reported, forcing the same cleanup commit to ratchet the baseline down.
5. Never call `--fix` or `--allow-remove-files`.

Support `--write` only for deliberate baseline refresh.

- [ ] **Step 4: Test the comparator**

Cover exact match, new issue, resolved/stale baseline, duplicate normalization, and deterministic sorting in `dead-code-baseline.test.ts`.

- [ ] **Step 5: Generate and review the initial baseline**

```bash
corepack pnpm deadcode:baseline --write
corepack pnpm deadcode:check
```

Manually inspect every configuration exception. A Knip-reported file remains only a review candidate.

- [ ] **Step 6: Wire the ratchet into release and CI**

Add scripts:

```json
"deadcode:scan": "knip --reporter compact",
"deadcode:scan:production": "knip --production --reporter compact",
"deadcode:baseline": "tsx scripts/dead-code-baseline.ts",
"deadcode:check": "tsx scripts/dead-code-baseline.ts"
```

Add `pnpm deadcode:check` to `release:check` before lint and to CI. Extend `release-check-contract.test.ts` to require the gate and reject `--fix`/`--allow-remove-files`.

- [ ] **Step 7: Verify and commit the prevention gate**

```bash
corepack pnpm deadcode:check
corepack pnpm exec vitest run \
  lib/__tests__/dead-code-baseline.test.ts \
  lib/__tests__/release-check-contract.test.ts
corepack pnpm lint
corepack pnpm typecheck
git diff --check
```

```bash
git add knip.config.ts scripts/dead-code-baseline* package.json pnpm-lock.yaml \
  lib/__tests__/dead-code-baseline.test.ts \
  lib/__tests__/release-check-contract.test.ts .github/workflows/ci.yml
git commit -m "chore(ci): ratchet production dead-code findings"
```

---

### Task 9: Delete the conservative first code/config tranche

**Files:**
- Delete only the files listed below after exact-path proof.
- Modify: `app/auth/reset-password/reset-password-client.tsx`
- Modify: `eslint.config.mjs`
- Modify: `next.config.mjs`
- Modify: `lib/__tests__/e2e-env-loader-contract.test.ts`
- Modify: `lib/__tests__/design-system-retired-shims.test.ts`
- Modify: `vitest.config.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: canonical docs that still name `lib/env.ts`

**Interfaces:**
- Consumes: Knip report plus exact-path `rg` proof.
- Produces: Smaller code/config surface and a reduced dead-code baseline without touching live exported modules.

- [ ] **Step 1: Delete unused barrels only, not their exported modules**

Delete these exact barrels:

```text
components/checkout/index.ts
components/panels/index.ts
components/request/index.ts
components/sections/index.ts
components/shell/index.ts
components/request/hooks/index.ts
components/doctor/hooks/index.ts
components/marketing/index.ts
components/marketing/sections/index.ts
components/marketing/shared/index.ts
components/shared/index.ts
components/ui/index.ts
lib/audit/index.ts
lib/clinical/index.ts
lib/data/types/index.ts
lib/microcopy/index.ts
lib/rate-limit/index.ts
```

Before each deletion, prove there is no exact barrel import. Do not infer that exported leaf modules are dead.

- [ ] **Step 2: Delete the confirmed zero-consumer leaves**

Delete exactly:

```text
components/effects/confetti.tsx
components/effects/shake-animation.tsx
components/marketing/animated-stat.tsx
components/marketing/rotating-text.tsx
components/marketing/service-picker.tsx
components/marketing/trust-badge-slider.tsx
components/shared/after-hours-med-cert-banner.tsx
components/shared/checkout-button.tsx
components/ui/statistics-card.tsx
lib/env.ts
```

Keep `components/ui/confetti.tsx`, which is live.

- [ ] **Step 3: Remove the false-security test-only trio**

Delete each implementation with its misleading test:

```text
lib/security/bot-detection.ts
lib/security/immutable-dates.ts
lib/security/option-randomizer.ts
lib/__tests__/bot-detection.test.ts
lib/__tests__/immutable-dates.test.ts
lib/__tests__/option-randomizer.test.ts
```

Remove `lib/security/immutable-dates.ts` from Vitest coverage exclusions. Do not drop or modify the unrelated `date_change_requests` database table.

- [ ] **Step 4: Remove NumberFlow with its only component**

```bash
corepack pnpm remove @number-flow/react
```

Confirm no pinned stack package changes.

- [ ] **Step 5: Remove inactive Tailwind configuration safely**

Replace the reset-password button’s inactive utilities:

```tsx
className="h-12 w-full rounded-xl shadow-md shadow-primary/[0.06] hover:shadow-lg hover:shadow-primary/[0.08]"
```

Delete `tailwind.config.js` and remove its ESLint ignore. Do not change Tailwind 4.2.2.

- [ ] **Step 6: Remove the unused intake Playwright config**

Delete `playwright.intake.config.ts`. Narrow `e2e-env-loader-contract.test.ts` to canonical `playwright.config.ts`, then prove discovery:

```bash
corepack pnpm exec playwright test --list e2e/intake-flows.spec.ts --project=chromium
```

Keep `playwright.preview.config.ts`; production synthetic and full-system verification use it.

- [ ] **Step 7: Remove broken static image redirects**

Delete only the 13 `next.config.mjs` redirects whose destination is `/images/people/:filename`. Add a contract asserting `next.config.mjs` contains no `/images/people/` destination.

- [ ] **Step 8: Correct the canonical environment path**

Remove stale `@/lib/env` mocks, update the env-validation test comment, and change current canon references to `lib/config/env.ts`. Historical archived plans may retain historical code snippets when clearly archived.

- [ ] **Step 9: Ratchet and verify**

```bash
corepack pnpm deadcode:baseline --write
corepack pnpm deadcode:check
corepack pnpm exec vitest run \
  lib/__tests__/e2e-env-loader-contract.test.ts \
  lib/__tests__/design-system-retired-shims.test.ts \
  lib/__tests__/env-validation.test.ts \
  lib/__tests__/release-check-contract.test.ts
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test run
corepack pnpm build
```

Browser-smoke `/`, `/medical-certificate`, `/prescriptions`, `/erectile-dysfunction`, `/hair-loss`, and `/auth/reset-password`. This is the proof that live landing components survived.

- [ ] **Step 10: Commit in reviewable slices**

Use separate commits:

```bash
git commit -m "chore(code): remove unused barrel entry points"
git commit -m "chore(code): remove verified zero-consumer modules"
git commit -m "chore(test): remove unused security experiments"
git commit -m "chore(config): remove inactive frontend configs"
```

---

### Task 10: Delete verified public assets and prevent registry drift

**Files:**
- Create: `scripts/check-blog-visual-assets.ts`
- Create: `lib/__tests__/public-asset-retirement-contract.test.ts`
- Modify: `package.json`
- Modify: `scripts/check-orphaned-files.sh`
- Modify: `components/icons/stickers/index.tsx`
- Delete: 44 exact public assets listed below

**Interfaces:**
- Consumes: `getAllTopArticleVisuals()` and deployed public files.
- Produces: Exact registered-blog-visual parity and recurrence guards for retired static assets.

- [ ] **Step 1: Add exact blog visual parity**

The script must flatten every `assetPath` from `getAllTopArticleVisuals()`, enumerate `public/images/blog/**/*.webp`, and fail on either missing or extra files. Add:

```json
"content:audit:assets": "tsx scripts/check-blog-visual-assets.ts"
```

- [ ] **Step 2: Delete the 12 unregistered blog WebPs**

Delete these exact unregistered files:

```text
public/images/blog/antibiotic-prescription-online-australia/antibiotic-red-flags.webp
public/images/blog/antibiotic-prescription-online-australia/escript-pharmacy-pathway.webp
public/images/blog/antibiotic-prescription-online-australia/telehealth-antibiotic-fit.webp
public/images/blog/are-antibiotics-prescription-only-australia/schedule-four-gate.webp
public/images/blog/are-antibiotics-prescription-only-australia/unsafe-antibiotic-sources.webp
public/images/blog/are-antibiotics-prescription-only-australia/why-prescription-only.webp
public/images/blog/how-escripts-work-australia/active-script-list-vs-token.webp
public/images/blog/how-escripts-work-australia/escript-problem-solver.webp
public/images/blog/how-escripts-work-australia/escript-token-pathway.webp
public/images/blog/medical-certificate-online-australia/certificate-detail-check.webp
public/images/blog/medical-certificate-online-australia/online-certificate-evidence-pathway.webp
public/images/blog/medical-certificate-online-australia/telehealth-scope-boundary.webp
```

The three medical-certificate files are byte-identical duplicates of the registered `gpt2-*` variants, which must remain.

- [ ] **Step 3: Delete the remaining 32 verified assets**

Delete:

```text
public/animations/Confetti.json
public/animations/Empty State.json
public/animations/Error.json
public/animations/Loading Files.json
public/animations/Loading.json
public/animations/Notification.json
public/animations/Success.json
public/sounds/notification.mp3
public/placeholder.svg
public/images/ed-1.webp
public/images/ed-2.webp
public/icons/stickers/bandage.svg
public/icons/stickers/brain.svg
public/icons/stickers/lungs.svg
public/icons/stickers/no-mobile.svg
public/icons/stickers/syringe.svg
public/icons/stickers/verified-badge.svg
public/logos/JMIRO.png
public/logos/NHMRC.png
public/logos/RACGP.png
public/logos/RANZCR.png
public/logos/acpsem.png
public/logos/anthropic.png
public/logos/claude.png
public/logos/clerk.png
public/logos/eRx.png
public/logos/next.js.png
public/logos/stripe.png
public/logos/supabase.png
public/logos/vercel.png
public/logos/wiley.png
public/logos/payment/paypal.svg
```

Remove the six sticker names from `StickerIconName`. Keep current payment logos, authority assets, registered blog visuals, Playwright snapshots, branding, and photography masters.

- [ ] **Step 4: Add recurrence guards**

The asset-retirement contract must assert these exact paths do not exist and that the sticker union no longer contains the six names. Add the retired static paths to `check-orphaned-files.sh` so they cannot silently return.

- [ ] **Step 5: Verify and commit**

```bash
corepack pnpm content:audit:assets
corepack pnpm content:audit:images
corepack pnpm exec vitest run lib/__tests__/public-asset-retirement-contract.test.ts
bash scripts/check-orphaned-files.sh
corepack pnpm typecheck
corepack pnpm build
git diff --check
```

```bash
git add public components/icons/stickers scripts/check-blog-visual-assets.ts \
  scripts/check-orphaned-files.sh package.json \
  lib/__tests__/public-asset-retirement-contract.test.ts
git commit -m "chore(assets): remove verified unused public files"
```

---

### Task 11: Final verification, rollout, and service-worker Stage B

**Files:**
- Modify after adoption window: `components/providers/global-deferred-clients.tsx`
- Delete after adoption window: `components/pwa/service-worker-registration.tsx`
- Delete after adoption window: `app/offline/page.tsx`
- Modify: `docs/ARCHITECTURE.md`
- Modify: matching privacy contracts

**Interfaces:**
- Consumes: Stage A production proof and at least 30 days of stale-client cleanup opportunity.
- Produces: No app registration/bridge; the tiny `/sw.js` tombstone remains for at least 90 days after Stage A deployment.

- [ ] **Step 1: Run full release gates for every code-bearing PR**

```bash
corepack pnpm check:node
bash scripts/check-stack-pins.sh
bash scripts/check-route-conflicts.sh
bash scripts/check-orphaned-files.sh
corepack pnpm deadcode:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test run
corepack pnpm build:release
bash scripts/check-bundle-size.sh
corepack pnpm doc:audit
git diff --check
```

- [ ] **Step 2: Keep proof scopes separate**

Record:

- Repo/build/CI proof.
- Local browser proof for dashboard batch review and service-worker cleanup.
- Aggregate persisted-data proof for pending/overdue batch reviews.
- Production proof only after deployment.

Do not claim production cache purge from unit tests or a local build.

- [ ] **Step 3: Verify service-worker Stage A in production**

On desktop and mobile Chrome:

1. Confirm no new service-worker registration is created for a clean profile.
2. For a profile with an old registration, confirm the registration disappears.
3. Confirm every `instantmed-*` cache disappears.
4. Sign out and confirm `/patient` and `/dashboard` redirect normally.
5. Confirm offline replay cannot render a previously authenticated page.

- [ ] **Step 4: Remove the retirement bridge after 30 days**

After Stage A has been live for at least 30 days, remove the deferred-client import and retirement component, delete the unused offline page, and update architecture/contracts. Keep `public/sw.js` as the tiny unregistering tombstone until at least 90 days after Stage A.

- [ ] **Step 5: Explicitly close deferred audit items**

Leave these outside the completed program:

- Truthful patient-counter re-anchor decision.
- Remaining Knip baseline burn-down by domain.
- Photography-master archive decision.
- Legacy May frame/report curation.
- Actual dual-key PHI rotation RFC and implementation.
- QA sampling workflow and evidence policy; `qa_sampled` is not batch-review proof.
- Git history rewrite.

Each requires separate evidence or operator authority and must not be smuggled into the hygiene PRs.

---

## Self-Review Checklist

- [ ] Every confirmed P0/P1 finding maps to a task.
- [ ] The synthetic-counter and mass-barrel deletions are explicitly excluded.
- [ ] No task upgrades a pinned stack package.
- [ ] Batch review has no bulk acknowledgement and uses persisted proof.
- [ ] Service-worker retirement cleans stale clients before deleting the bridge.
- [ ] Raw browser evidence is blocked from future Git commits.
- [ ] Plan status has one canonical location per basename.
- [ ] Knip is a ratchet, not an auto-fixer or deletion oracle.
- [ ] Public copy changes are narrow and content-audited.
- [ ] Markdown bookkeeping accounts for this plan before future deletions.
