# Session 1 — Checkout, data and monitoring reliability

> **For agentic workers:** Use `superpowers:executing-plans` task by task. Work only this session plan. The [ROADMAP session protocol](../../ROADMAP.md#sequential-build-session-protocol) owns release and handoff requirements.

**Goal:** Remove the demonstrated checkout recovery failure, safely prepare and complete the historical encryption repair, and make monitoring report actual execution and actionable incidents.

**Architecture:** Preserve the existing checkout orchestrators, payment lifecycle guards, encryption systems and monitoring stores. Make separate reviewed changes for checkout, data repair and monitoring; do not combine them into an architectural rewrite.

**Tech stack:** Existing pinned Next.js 15.5, React 18, TypeScript, Supabase, Stripe, Vercel and GitHub Actions; Node 24 and corepack pnpm 10.23.0.

**Spec:** [ROADMAP](../../ROADMAP.md), rank 1; [reconciled audit](../../audits/2026-09-04-scaling-audit.md); [payment operations](../../OPERATIONS.md); [security](../../SECURITY.md). Operator selected reliability before certificate revenue on 6 September 2026.

**Status:** In progress on 2026-09-06. Checkout recovery and the profile-repair tooling are released. Monitoring implementation is reviewed and in required CI. The historical production repair is on hold for a newly identified approved-scope race in the released CLI; its earlier apply packet is superseded pending a reviewed scope guard and fresh packet. Plan 2 has not started; see the execution receipt below for separate source, CI and production evidence.

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

- [x] Refresh bounded technical event correlation and the linked payment state without opening clinical answers or replaying checkout in production.
- [x] Reproduce the branch using isolated guest and authenticated fixtures. In particular, try a restored flow ID after cancellation with a new submission key; distinguish a uniqueness collision from profile or answers failures.
- [x] Capture the actual failing assertion before changing code. If this lead does not reproduce, trace the other persistence branches; do not ship a speculative retry.
- [x] Reconcile the original Stripe obligation before offering a fresh checkout. Cancelled/unpaid database state alone is insufficient: provider-paid returns the safe existing outcome; processing/in-flight/unknown blocks another payment and enters recovery; a still-open session needs the existing bounded audited invalidation and confirmed read-back; only terminal-unpaid provider evidence permits a new payment attempt. Reassert the stored session/state against concurrent webhook or cancellation changes.
- [x] Implement the smallest proven repair. Once the old obligation is verified unpayable, a new request must use a deliberate fresh flow/submission identity and revalidate the current answers and consent; it must not reopen the old payment obligation. Preserve entered information only where current safety and draft-expiry rules allow it.
- [x] Give expected recovery states specific bounded diagnostics. Unexpected persistence failures must reach Sentry with the failing operation and safe database code, without identifiers, raw error payloads or clinical data.
- [x] Verify the matrix below, then commit the checkout change independently.

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

- [x] Read the current CLI flags and identify any status-table writes before calling dry-run; dry-run must itself be read-only.
- [x] Add a production-key compatibility preflight using existing ciphertext privately, with aggregate mismatch/decryptability counts. Fail closed if compatibility cannot be established; never print the sampled values or keys.
- [x] Make updates compare-and-set and make success counts reflect rows actually changed. Use keyset pagination or another scheme that cannot skip rows as the missing-field set shrinks.
- [x] Test wrong key, changed plaintext, newly added ciphertext, null/empty fields, partial batches, resumability, fixture exclusions and idempotent reruns.
- [x] Replace identifier/raw-error output with aggregate results and bounded error categories. Verify that both stdout and persisted migration-status errors are safe.
- [ ] Produce the exact dry-run packet: project identity, code SHA, field counts, exclusions, key compatibility, guarded-write method, verification command and stop conditions. Resolve apply authorization against the current session before executing.
- [ ] Freeze the preflight candidate/field/snapshot set and require a matching approved scope fingerprint and counts before any write. Prove insertion, newly eligible rows, equal-count substitutions and a nonzero zero-change rerun cannot expand the approved apply.
- [ ] After an authorized apply, verify parity, decryptability, remaining exceptions and a zero-change rerun. Record the aggregate receipt in SECURITY.md. Retain plaintext until the separate reader audit and retirement decision; do not remove keys or historical rows.

## Task 3 — Restore trustworthy monitoring

**Files:** `.github/workflows/prod-request-flow-synthetic.yml`, `e2e/prod-request-flow-synthetic.spec.ts`, `lib/monitoring/cron-heartbeat.ts`, `lib/monitoring/critical-alert-cooldown.ts`, `app/api/cron/business-alerts/route.ts`, the existing health-check route, `docs/OPERATIONS.md`.

**Interface:** Distinguish scheduler invocation, completed browser checks, last success and last failure. Repeated health measurements remain available even when unchanged incidents stop paging.

- [x] Refresh at least 24 hours of synthetic run timestamps and actual assertions. The current entry-flow synthetic does not prove a completed hosted payment.
- [x] Add independent freshness detection for missing browser runs; the watched workflow cannot be the only mechanism detecting its own absence. Confirm the existing provider/credential options before choosing execution infrastructure.
- [x] Select an explicit attainable cadence and detection delay. Use existing infrastructure where it meets the requirement; if a new paid runner is necessary, present its exact cost/setup packet before provisioning. Do not call the monitor five-minute coverage until completed-run evidence proves it.
- [x] Test scheduler silence, a failed run followed by success, delayed completion and a currently running check. Demonstrate both the outage alert and recovery.
- [x] Give Sentry stable per-incident fingerprints and state-aware repeat handling. A new category, worse severity, count increase or failure of the deduplication store must remain visible. Preserve periodic aggregate health metrics and independent Telegram rules.
- [x] Investigate any fresh feature-flag transport failure after the retry release. Retain the retry and cache guarantees; a single background revalidation error is not sufficient evidence for a broad dashboard retry layer.
- [ ] Commit monitoring separately; record actual cadence, coverage and retained limitations in OPERATIONS.md.

## Exit and handoff

Run the applicable focused suites, lint/typecheck, isolated database checks and required release pipeline under the shared session protocol. Record each exact tested head, merged SHA, ready production deployment, smoke/browser evidence and rollback scope. Source/CI proof does not substitute for production data parity or observed scheduler cadence.

The nine retrospective clinical cases remain clinician-owned work; they are not an AI outcome or a build-completion target. Leave the March certificate unchanged and unsent. The two April Ads discrepancies remain recorded historical uncertainty.

If production repair awaits authorization or an external prerequisite, label it explicitly outstanding and ship independently complete code slices; do not claim this whole plan complete. The operator decides whether the next session may proceed with that bounded item outstanding.

**Next-session prompt:** “Execute the certificate revenue plan linked from ROADMAP. Read Session 1's release receipts first and refresh any dated operational/commercial evidence. Work only that plan.”

## Execution receipt

**In progress — production profile repair remains outstanding.** This receipt separates implemented code, local/CI proof and production observations. The historical repair has not been applied. Plan 2 has not started.

### Starting evidence

- Planning PR [#524](https://github.com/reabal-n/instantmed/pull/524) merged as `7b81134264cd01cd194e1e7310c2915341feaee1` at 2026-09-06 06:07:46 UTC. The five plans and canonical sequence were present before implementation. Its required checks passed.
- Initial production was READY at `56adfcc8be76508aa0299ea85611e83b094b1dc9`, including the existing feature-flag retry. Reproductions used isolated fixtures, with no live checkout replay or production environment loaded into tests.
- The 12:18 Sydney restored-draft incident correlated to an existing cancelled, failed/unpaid intake. A private read of its exact Stripe Session confirmed expired/unpaid with a cancelled PaymentIntent and matching ownership metadata. No provider mutation was performed. The later refresh found a different paid request for the same owner at 15:53 Sydney; the earlier “no later payment through 14:42” statement is dated evidence, not the current customer status.

### Checkout release

[PR #525](https://github.com/reabal-n/instantmed/pull/525) is merged and deployed. Actual guest and authenticated entrypoints reproduced the unique-flow collision with a restored flow and a new submission key: two assertions failed before repair. The database fixture separately reproduced SQLSTATE `23505` from the unchanged canonical uniqueness index.

The repair requires ownership or exact converted guest-bearer possession before recovery. It reconciles the stored Stripe Session and expanded PaymentIntent, verifies any bounded invalidation with a separate read, then reasserts current owner/session/status with a conditional write. Only confirmed terminal-unpaid obligations permit an explicit fresh request with new identity and current safety/consent validation. Unknown/processing states block; paid/refunded/disputed states return the safe existing outcome. Missing guest proof exposes sign-in/support and disables the old payment action. Cancelled requests remain cancelled. Unexpected database failures retain bounded operation/SQLSTATE diagnostics without identifiers or raw payloads.

- **Local:** 489 regression tests across 36 files, including the 151 focused entrypoint/helper cases; eight separate PostgreSQL/PostgREST cases; lint, typecheck, doc audit and dead-code gate passed. Eight actual ReviewStep/store/CSS views covered desktop/mobile, light/dark, reduced motion, keyboard, failure/reset and sign-in recovery. This was a component harness, not a hosted Stripe payment. The strict live integration checker was run separately and passed read-only; an entire local `release:check` run is not claimed.
- **Review:** scoped and independent final release reviews passed after correcting a guest possession gap found during final review. The unchanged final P1 regression was independently rerun and passed.
- **CI:** tested head `4f71ff656dd39aaf0a16fdf4a10ec6a649610f45`; [run 34018839733](https://github.com/reabal-n/instantmed/actions/runs/34018839733) passed build, required E2E and Lighthouse. The nonblocking `/request` chunk-size advisory was identical to planning PR #524, not a new regression.
- **Release:** merge `ea57b0346358351cc514d0168204bcda1a5c6e55`; primary production alias verified against READY deployment `dpl_9DzUuDi25vnBrzxB6P8YBcECnTHk` at 2026-09-06 08:05:42.630 UTC. [Post-deploy smoke 34020902736](https://github.com/reabal-n/instantmed/actions/runs/34020902736) passed. Post-merge [CI 34020781827](https://github.com/reabal-n/instantmed/actions/runs/34020781827) also passed.
- **Production browser:** one-off invocation of the existing isolated seven-case synthetic [34021064088](https://github.com/reabal-n/instantmed/actions/runs/34021064088) passed; its actual browser step ran 08:10:17–08:10:50 UTC. This verifies live request entry and browser assertions, not hosted payment or scheduled cadence. Deployment-scoped error/fatal and 5xx aggregates were empty through 08:12 UTC, a bounded observation only.
- **Rollback:** restore the previous READY application deployment and revert PR #525 through normal governance. There is no schema rollback or patient/payment-state repair to undo. Preserve exact-current-session guards and investigate provider state before any payment recovery.

### Profile encryption preparation

**Apply readiness reopened before any production write.** A final authorization check found that the released CLI rescans candidates after preflight. A new eligible profile below the UUID high-water, or a previously noncandidate row gaining a missing field, can then receive a copy despite being absent from the approved scan. The independent reviewer confirmed this scope-control gap. The earlier approval packet is on hold and superseded until a frozen candidate set, opaque approval fingerprint and guarded zero-change expectation are implemented, tested and reviewed. No production apply occurred.

[PR #526](https://github.com/reabal-n/instantmed/pull/526) contains the reviewed preparation. The script defaults to a genuinely read-only dry run, authenticates existing production ciphertext before any apply, scans with keyset pagination, and conditionally fills only missing encrypted copies. Concurrent plaintext/ciphertext/classification/timestamp changes cause a skip and reread, never overwrite. Exact affected-row and migration-status receipts own success counts. Errors and incomplete runs remain bounded, aggregate-only and unsuccessful.

- **Local/review:** 72 HTTP and actual PostgreSQL/PostgREST backfill cases passed, including wrong/mixed keys, null/empty fields, concurrent edits, partial failures, resumability, idempotency, privacy, missing status receipts and fixture exclusion from compatibility checks and writes. Positive/negative classifier tests also passed. A fresh dry run exposed two exact CI identity patterns missing from canonical exclusions; the narrow correction was reproduced and independently reviewed. Lint, typecheck, documentation and actual dead-code gates passed. Script blob `118039e39037003a0c93e87e7e952421d062bc30` is unchanged; corrected classifier blob is `866e75ca1db588bbf0a47963a774ad3c4529f676`.
- **Production read-only packet:** at 09:12:43–09:12:44 UTC, reviewed code `ae12f09c129fcff62aa8f1f032ea770e07a9ced5` ran against `witzcrovsoumktyndqgz` using current Vercel production configuration from an empty directory, with inherited repair variables removed and no local dotenv fallback. The final tested head `a8d723bc4ee0154d7735d37dfaec550dce5e0e32` repeated the same read-only proof at 09:56:26–09:56:27 UTC with matching counts. The key authenticated 319/319 existing ciphertexts. This proves production control-plane key compatibility; running function memory was not introspected.
- **Scope:** 592 scanned, 51 canonical fixtures excluded, 541 eligible, 466 candidate profiles; 452 DOB, 300 phone and 21 Medicare missing copies (773 overlapping field copies). This supersedes the earlier 469-profile proposal: aggregate SQL independently confirmed three older exact review fixtures, each missing all three copies, are now correctly excluded. Four pre-existing parity exceptions remain preserved: one phone-format difference, one Medicare plaintext-absent case and two Medicare content differences. Zero writes and zero migration-status rows before/after. This historical scope must not be conflated with the reportable analytics cohort.
- **Required gate:** explicit approval of the exact fresh packet before the bounded production apply, matching read-only verification and conditional zero-change apply rerun. The proposed commands, stop conditions and rollback are in [SECURITY.md](../../SECURITY.md#prepared-historical-profile-repair-packet--2026-09-06). Known fixture churn may vary scanned/excluded totals together without expanding eligible scope. No plaintext retirement, historical-row deletion or key rotation is included. Eligible-scope drift, decrypt failure, CAS skip, write error or ambiguous receipt stops completion; retain existing and confirmed new data and prepare a fresh packet.
- **CI/release:** final tested head `a8d723bc4ee0154d7735d37dfaec550dce5e0e32` passed build, required E2E and Lighthouse in [CI 34024187541](https://github.com/reabal-n/instantmed/actions/runs/34024187541). PR #526 merged at 09:55:43 UTC as `f4701c30ee3fcd1bb84f6267930ec658f595987a`. Primary production alias verified against READY deployment `dpl_29RLM21yQvjhwznkoUNAv43DX73D` at 09:58:16.937 UTC; [post-deploy smoke 34026111138](https://github.com/reabal-n/instantmed/actions/runs/34026111138) passed. Main post-merge CI remains running. These are tooling release receipts; no production data parity or applied repair is claimed. The exact apply/verification approval was requested after final CI and a matching fresh dry run, then put on hold when the additional scope race was identified. It does not authorize using the superseded packet.

### Monitoring

Implementation and independent reviews are complete in draft [PR #527](https://github.com/reabal-n/instantmed/pull/527), now integrated with merged main. The existing GitHub browser schedule requests four-hour execution at minute 17; an independent observer in the existing five-minute Vercel health check evaluates actual browser-step evidence and six-hour freshness. The design separates invocation, running state, maximum completion time, source-ordered outcome, last success/failure and observer availability. Durable enablement and state-aware incident observations use one narrowly scoped service-role-only append RPC over existing operational metrics. No new paid provider, environment variable or Codex scheduled task is introduced.

Local proof includes 111 focused tests before review corrections and 77 affected tests on the final corrected source, plus actual PostgreSQL ACL/concurrency/ordering/retention/grace checks. Lint, typecheck, documentation and actual dead-code ratchet passed (2305/2305; no weakening). Reviews caught and corrected delayed historical failure notifications, unavailable/priority-masked purchase recovery, and unused production exports. Final source was approved at `52bc7e5582076e8369a3381df1a3c2e1417f0396`; main integration produced `db9cec525c428e6f5cec7db19ee37478f69b971e` with identical stable patch ID `b4779b60dbf76f23607cc716b452b22172bc1bec`. Required [CI 34026023619](https://github.com/reabal-n/instantmed/actions/runs/34026023619) is running.

The refreshed 24-hour baseline ending 06:30:37 UTC had nine successful scheduled runs. Completed gaps were 98.18 minutes minimum, 118.15 median and 264.45 maximum despite the old five-minute expression. Each ran seven assertions; none proved hosted payment. Checkly access was not established (401), and Sentry issue access returned 403. Public GitHub reads and the existing Vercel cron support the chosen observer, with bounded API work and explicit rate-limit/unavailability handling.

One background feature-flag revalidation transport error was observed after the existing retry release, with no demonstrated new foreground failure. The pinned Next.js cache behavior preserves the cached response. Existing retry/cache tests pass; no speculative dashboard retry layer or broad error suppression was added. A later refresh found separate dashboard intake/certificate-readiness fetch error clusters at 08:16:31–32 UTC with ECONNRESET; existing source forwards an explicit data error to the patient UI. Foreground impact is not established from the RSC evidence, and no recurrence was observed from 08:16:33 through 08:51. A subsequent grouped read from 08:51–09:52 UTC found no error/fatal or 5xx entries on that checkout deployment. These bounded windows are not a zero-error lifetime claim.

Read-only migration preflight found 78 existing operational metrics rows and no new state/index/RPC. An isolated linked-CLI dry run listed exactly `20260906100000_monitor_observation_state.sql`; a fresh dry run before release preparation confirmed the same sole pending migration. No schema was applied. Existing observer-host activity was verified separately: health heartbeat 08:45:07 UTC and 288 HTTP 200 health responses over the preceding 24 hours. Required CI, migration application, deployment and observed new browser cadence remain pending.

### Outstanding work and handoff boundary

- Complete monitoring exact-head CI, additive migration and release receipts, then record observed production freshness and remaining cadence measurement honestly.
- Finish and review the approved-scope correction, refresh its exact production packet and CI, resolve applicable apply authorization, then verify the authorized repair and zero-change rerun. The earlier apply question is on hold.
- This whole plan cannot be marked complete while the required production data repair is outstanding. The operator decides whether Plan 2 may proceed with a documented exception. The nine retrospective cases, March certificate and two April Ads discrepancies retain the boundaries above.

**Plan 2 prompt (do not run automatically):** “Execute `docs/superpowers/plans/2026-09-06-02-certificate-revenue-recovery.md` using the canonical sequence in `docs/ROADMAP.md`. Read Plan 1's release receipts and any explicitly accepted outstanding exception first, refresh dated operational/commercial evidence, and work only Plan 2.”
