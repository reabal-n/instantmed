# Session 1 — Checkout, data and monitoring reliability

> **For agentic workers:** Use `superpowers:executing-plans` task by task. Work only this session plan. The [ROADMAP session protocol](../../ROADMAP.md#sequential-build-session-protocol) owns release and handoff requirements.

**Goal:** Remove the demonstrated checkout recovery failure, safely prepare and complete the historical encryption repair, and make monitoring report actual execution and actionable incidents.

**Architecture:** Preserve the existing checkout orchestrators, payment lifecycle guards, encryption systems and monitoring stores. Make separate reviewed changes for checkout, data repair and monitoring; do not combine them into an architectural rewrite.

**Tech stack:** Existing pinned Next.js 15.5, React 18, TypeScript, Supabase, Stripe, Vercel and GitHub Actions; Node 24 and corepack pnpm 10.23.0.

**Spec:** [ROADMAP](../../ROADMAP.md), rank 1; [reconciled audit](../../audits/2026-09-04-scaling-audit.md); [payment operations](../../OPERATIONS.md); [security](../../SECURITY.md). Operator selected reliability before certificate revenue on 6 September 2026.

**Status:** Planned; no implementation or production repair performed by this document. No prerequisite build. Separate commits/PRs inside this session are appropriate because a reviewer can accept checkout recovery independently of a data repair.

## Global constraints

- Load the incident, checkout/payment, clinical-safety and doc-drift skills before their corresponding edits; UI verification applies to any changed patient flow.
- Do not make cancelled requests payable, remove uniqueness constraints, relax prescribing identity or clinical validation, or reuse a stale Stripe session.
- No patient send, refund, clinical outcome, certificate restoration, Ads mutation or encryption-key rotation is part of this plan.
- A production backfill needs an exact reviewed dry-run packet and applicable operator authorization before its apply step. Preparing the packet and hardening/testing the script are authorized implementation work; elapsed time is not authorization.
- Keep raw values, ciphertext, contact details, identifiers and SQL error details out of logs, screenshots, commits and receipts. Report aggregate counts and bounded technical codes.

## Evidence and uncertainty

At 12:18 Sydney on 6 September, one restored repeat-prescription draft emitted `checkout_v2_20260905 / persistence`, followed by abandonment. The linked intake was cancelled, failed/unpaid and had an existing payment session. No subsequent payment was observed through the 14:42 review. This correlation does **not** establish the failing branch: profile writes, duplicate handling, intake insertion and answers persistence can all return this category.

The same review counted missing encrypted copies for 417 DOB, 278 phone and 18 Medicare fields among reportable patient profiles. Counts overlap. Four new profiles checked had their expected encrypted copies. Refresh these dated counts before repair.

Source review found three prerequisites in `scripts/encrypt-phi-backfill.ts`: its key check only round-trips new local ciphertext, updates are guarded only by profile ID, and errors print profile IDs. Do not blindly run the current script.

## Task 1 — Reproduce and repair checkout recovery

**Files:** `lib/stripe/guest-checkout.ts`, `lib/stripe/checkout/persistence.ts`, `lib/stripe/checkout-submission-key.ts`, `lib/stripe/payment-integrity.ts`, `lib/request/server-draft-conversion.ts`, `components/request/steps/review-step.tsx`, `components/request/store.ts`. Inspect `supabase/migrations/20260723063000_suppress_recovery_after_intake_creation.sql` for the existing unique flow constraint; do not remove it.

**Existing verification:** `lib/__tests__/checkout-submission-key.test.ts`, `lib/__tests__/checkout-resume-payment-safety.test.ts`, `e2e/prescription-flow.spec.ts`. Add a dedicated restored-draft regression spec if the existing fixtures cannot express the failure clearly.

**Interface:** Keep `CheckoutFailureResult` and its fixed taxonomy authoritative. The frontend must have a truthful recovery action; a retry hint cannot represent an irrecoverable terminal request. Preserve ownership checks before looking up or returning an existing request.

- [ ] Refresh bounded technical event correlation and the linked payment state without opening clinical answers or replaying checkout in production.
- [ ] Reproduce the branch using isolated guest and authenticated fixtures. In particular, try a restored flow ID after cancellation with a new submission key; distinguish a uniqueness collision from profile or answers failures.
- [ ] Capture the actual failing assertion before changing code. If this lead does not reproduce, trace the other persistence branches; do not ship a speculative retry.
- [ ] Reconcile the original Stripe obligation before offering a fresh checkout. Cancelled/unpaid database state alone is insufficient: provider-paid returns the safe existing outcome; processing/in-flight/unknown blocks another payment and enters recovery; a still-open session needs the existing bounded audited invalidation and confirmed read-back; only terminal-unpaid provider evidence permits a new payment attempt. Reassert the stored session/state against concurrent webhook or cancellation changes.
- [ ] Implement the smallest proven repair. Once the old obligation is verified unpayable, a new request must use a deliberate fresh flow/submission identity and revalidate the current answers and consent; it must not reopen the old payment obligation. Preserve entered information only where current safety and draft-expiry rules allow it.
- [ ] Give expected recovery states specific bounded diagnostics. Unexpected persistence failures must reach Sentry with the failing operation and safe database code, without identifiers, raw error payloads or clinical data.
- [ ] Verify the matrix below, then commit the checkout change independently.

| Fixture | Required result |
|---|---|
| Cancelled unpaid request, restored draft | Clear fresh-request recovery; original remains cancelled and no old session becomes payable |
| Database cancelled/unpaid but Stripe paid, processing, unknown or still open | No fresh payable obligation until provider reconciliation/invalidation is confirmed; payment/cancellation races cannot produce two payable sessions |
| Same owned pending request, repeated submit | One payable current session; no duplicate intake/payment |
| Paid/refunded/disputed request | Existing safe result; never another payment |
| Expired or replaced session | Current-session guards hold; stale webhook cannot mark paid |
| Different owner or uncertain identity | No request disclosure or recovery access |
| Missing/changed required clinical answer | Existing validation remains enforced |
| Network loss, Back, reload, another tab | Retry is bounded and state stays coherent |

## Task 2 — Harden and verify the profile backfill

**Files:** `scripts/encrypt-phi-backfill.ts`, its existing primitive `lib/security/encryption.ts`, `docs/SECURITY.md`. Locate and extend the existing script contract tests; add an isolated PostgreSQL race test if required to prove the conditional update.

**Interface:** Retain the existing encryption format and `ENCRYPTION_KEY`. Do not involve envelope-key rotation. Applying a missing field must compare the source snapshot and require that the target ciphertext is still absent; concurrent edits/new ciphertext must cause a skip and reread, never overwrite.

- [ ] Read the current CLI flags and identify any status-table writes before calling dry-run; dry-run must itself be read-only.
- [ ] Add a production-key compatibility preflight using existing ciphertext privately, with aggregate mismatch/decryptability counts. Fail closed if compatibility cannot be established; never print the sampled values or keys.
- [ ] Make updates compare-and-set and make success counts reflect rows actually changed. Use keyset pagination or another scheme that cannot skip rows as the missing-field set shrinks.
- [ ] Test wrong key, changed plaintext, newly added ciphertext, null/empty fields, partial batches, resumability, fixture exclusions and idempotent reruns.
- [ ] Replace identifier/raw-error output with aggregate results and bounded error categories. Verify that both stdout and persisted migration-status errors are safe.
- [ ] Produce the exact dry-run packet: project identity, code SHA, field counts, exclusions, key compatibility, guarded-write method, verification command and stop conditions. Resolve apply authorization against the current session before executing.
- [ ] After an authorized apply, verify parity, decryptability, remaining exceptions and a zero-change rerun. Record the aggregate receipt in SECURITY.md. Retain plaintext until the separate reader audit and retirement decision; do not remove keys or historical rows.

## Task 3 — Restore trustworthy monitoring

**Files:** `.github/workflows/prod-request-flow-synthetic.yml`, `e2e/prod-request-flow-synthetic.spec.ts`, `lib/monitoring/cron-heartbeat.ts`, `lib/monitoring/critical-alert-cooldown.ts`, `app/api/cron/business-alerts/route.ts`, the existing health-check route, `docs/OPERATIONS.md`.

**Interface:** Distinguish scheduler invocation, completed browser checks, last success and last failure. Repeated health measurements remain available even when unchanged incidents stop paging.

- [ ] Refresh at least 24 hours of synthetic run timestamps and actual assertions. The current entry-flow synthetic does not prove a completed hosted payment.
- [ ] Add independent freshness detection for missing browser runs; the watched workflow cannot be the only mechanism detecting its own absence. Confirm the existing provider/credential options before choosing execution infrastructure.
- [ ] Select an explicit attainable cadence and detection delay. Use existing infrastructure where it meets the requirement; if a new paid runner is necessary, present its exact cost/setup packet before provisioning. Do not call the monitor five-minute coverage until completed-run evidence proves it.
- [ ] Test scheduler silence, a failed run followed by success, delayed completion and a currently running check. Demonstrate both the outage alert and recovery.
- [ ] Give Sentry stable per-incident fingerprints and state-aware repeat handling. A new category, worse severity, count increase or failure of the deduplication store must remain visible. Preserve periodic aggregate health metrics and independent Telegram rules.
- [ ] Investigate any fresh feature-flag transport failure after the retry release. Retain the retry and cache guarantees; a single background revalidation error is not sufficient evidence for a broad dashboard retry layer.
- [ ] Commit monitoring separately; record actual cadence, coverage and retained limitations in OPERATIONS.md.

## Exit and handoff

Run the applicable focused suites, lint/typecheck, isolated database checks and required release pipeline under the shared session protocol. Record each exact tested head, merged SHA, ready production deployment, smoke/browser evidence and rollback scope. Source/CI proof does not substitute for production data parity or observed scheduler cadence.

The nine retrospective clinical cases remain clinician-owned work; they are not an AI outcome or a build-completion target. Leave the March certificate unchanged and unsent. The two April Ads discrepancies remain recorded historical uncertainty.

If production repair awaits authorization or an external prerequisite, label it explicitly outstanding and ship independently complete code slices; do not claim this whole plan complete. The operator decides whether the next session may proceed with that bounded item outstanding.

**Next-session prompt:** “Execute the certificate revenue plan linked from ROADMAP. Read Session 1's release receipts first and refresh any dated operational/commercial evidence. Work only that plan.”

## Execution receipt

Unstarted. The executor records verified outcomes here; unchecked tasks are not completed work.
