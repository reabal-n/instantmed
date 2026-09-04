# SDD ledger — plan: docs/superpowers/plans/2026-09-04-conversion-retention-friction-closure.md

## Setup

- Branch: `codex/conversion-retention-friction-closure`
- Worktree: `/Users/rey/Developer/instantmed/.worktrees/conversion-retention-friction-closure`
- Start/base commit: `c0bfbc4e0ea535ab24eabdcb7d9e1b54f3d89dfe`
- Baseline: `corepack pnpm test` passed on 2026-09-05 — 723 files, 6,738 tests, 0 failures.
- Sentry incident lookup: existing local token returned HTTP 403 for the read-only issue query; no event frame or patient data was retrieved. Continue with the plan's production-bundle reproduction gate.

## Current closure (operator order, 2026-09-05)

The attached operator request authorises sequential local implementation and supersedes the plan's former confirmation and calendar-only gates. Historical task numbers below remain reference labels.

- Task 1 / growth correction: locally verified. Queue watch is advisory; optional evidence cannot freeze valid proposals; unavailable queue evidence and explicit harm still gate scale. Production-shaped empty/watch/database-failure cases pass. Verification: 153 focused Ads tests, 124 doc tests, scoped ESLint, TypeScript, and doc audit. No Ads mutation or deployment.

- Task 2 / hosted guest checkout: harness narrowed to the two exercised test Prices; receipt now records one skip action or two magic-link actions, zero repeated profile fields, and measured outcome timing. Removed a test-only second dashboard navigation so the real callback must land correctly. Verification: 129 focused tests, TypeScript and scoped ESLint. Actual provider run failed before startup with `Hosted Stripe E2E requires HOSTED_STRIPE_E2E_STRIPE_SECRET_KEY`; no dedicated test key exists in the inspected shell/repo environments (generic keys are live). Need that dedicated test key plus `HOSTED_STRIPE_E2E_STRIPE_PRICE_MEDCERT` and `HOSTED_STRIPE_E2E_STRIPE_PRICE_REPEAT_SCRIPT`. No payment, Auth-link outcome, or elapsed time is claimed.

- Task 3 / certificate persistence: fixed direct/dispatcher post-acceptance classification and unavailable reclaim read-back. Matching sent state heals successfully; database errors, unmatched attempts, and absent evidence remain retryable; confirmed terminal provider evidence closes only that attempt. Frozen-body/idempotency replay recovers without premature certificate finalization. Verification: 85 tests in 9 focused files, scoped ESLint and TypeScript. Provider responses are simulated in these unit tests; production-bundle verification remains a separate release check.

- Task 4 / preference order: one nullable `preferences_changed_at` separates deliberate changes/complaints from generic timestamps. Defaults stay on; default upserts cannot re-enable disabled flags; duplicate/default rows inherit the recorded choice, and explicit later changes synchronize existing preference rows for that recipient. No account linking or clinical consent change. Verification: 32 focused unit tests; isolated PostgreSQL preference tests pass with the real unconditional `updated_at` trigger. The outbox callback delegates to the same complaint RPC in Task 5; full delivery-harness verification belongs there.

- Task 5 / delivery order: delayed sent/delivered callbacks preserve delivered/opened tracking; complaints retain delivery evidence and close only their exact attempt. Shared callback mirrors, terminal retry consumers, hash-bound auth complaints, and real certificate ownership fixtures pass 85 focused tests plus the isolated PostgreSQL ordering/concurrency harness; scoped ESLint and TypeScript pass. Split shared receipt migration 1150 from refill aggregate 1200. Historical/address-trigger work is a separate rollback-only proposal, verified synthetically and excluded from deployment. Staff browser interaction proof remains the final release check.

- Task 6 / minimal refill measurement: reporting migration is limited to cohort indexes and the aggregate RPC. Reporting-only PostgreSQL proof passes without preference/shared-delivery migrations: all test/owner exclusions, deduplicated delivery/click receipts, latest-reminder assignment, Sydney weeks, 21-day maturity, strict UTM orders versus broader same-patient association, and future/unpaid order exclusion. Verification: 44 tests across refill and critical-cron files. Scheduler evidence stays separately missing/unavailable when not proven; no live heartbeat, provider send, retained cash, or experiment result is inferred.

- Task 7 / local closure: removed calendar-only dependencies, retained meaningful sample/settlement/ownership conditions, separated current certificate recovery readiness from unknown historical diagnosis, and prepared final-state release packets plus exact recovery actions in `docs/superpowers/receipts/2026-09-05-friction-release-readiness.md`. Verification: 738 Vitest files / 7,010 tests, full lint, TypeScript, doc audit (124 tests), strict content audit (107 articles), dependency audit, dead-code ratchet, fresh Supabase migration replay, local production Webpack build and bundle gate. Two Playwright cases pass: staff resend/reconstruction/terminal retry controls and Business/email-hub views at 1440px/375px in light/dark with reduced motion. Isolated provider/Redis behavior is not live service proof. `release:check` remains blocked at six missing integration configurations; real hosted Stripe acceptance still needs the dedicated test key and two Prices. No external mutation or deployment was performed.

## Plan task state (original task numbers)

- Schema convergence: locally verified; deployment application remains unverified.
- Tasks 1–2: test-webhook policy and hosted runner verified locally. Real provider acceptance is blocked only by the dedicated Stripe test key and two test Price IDs.
- Tasks 3–4: current certificate recovery and persistence/delivery fixes are independently testable. The original historical render defect remains unexplained; it does not block readiness of the current recovery paths. Historical sends are not authorised by this implementation request.
- Tasks 5–7: conversion, failure, and minimal refill read models are implemented. Cohort counts, scheduler evidence, and retained cash availability remain separate.
- Task 8: D+7/D+14 outcome observations remain open, with matched windows, minimum sample, safety and settlement requirements. They are not code-release gates.
- Task 9: conditional on manually verified account-handoff friction or repeated classified support evidence, without a D+14 wait. No current verified decision-grade evidence was supplied; no new account step is imposed.
- Task 10: real magic-link/Auth ownership proof is still blocked by Task 2 credentials. The D+14 wait is removed.
- Task 11: SEO candidate retained; GSC actions and Google indexing are unperformed external outcomes.
- Task 12: women's-health handoff instrumentation retained; W1 remains inactive until its prespecified flow/sample/coverage evidence is met.
- Task 13: growth correction is locally verified; ED E1 keeps its active experiment and 24-hour settlement conditions.
- Task 14: local release preparation is authorised. The current release receipt lists independent slices and exact unresolved deployment checks.

## Historical preflight and implementation records

These records preserve earlier reviews; the current closure and state above supersede their former calendar/approval assumptions.

### Preflight conflict scan

### Shared files and interfaces

| Tasks | Producer / consumer or shared surface | Finding / ruling |
|---|---|---|
| 1 → 2 | Stripe test-event policy → hosted runner/preflight | Hard dependency. Task 2 must select Task 1's explicit production-build lane. |
| 2 ↔ 3 | `package.json`, `docs/TESTING.md`, port 3060, local Supabase lifecycle | Serialize and use distinct scripts/configs; never run both production servers concurrently. |
| 2 → 10 | Real magic-link/account-link proof → tracker-access prerequisite | Keep the stated hard gate. |
| 2 → 14 | Hosted Stripe receipt → final evidence | Keep test-mode proof separate from deployment and production proof. |
| 3 → 4 | Current recovery paths plus production-server E2E → readiness | Current path proof is required; reproducing the unknown historical defect is independent. |
| 3 → 14 | Certificate action/outbox evidence → final verification | Synthetic data only; provider acceptance and provider delivery stay separate. |
| 4 ↔ 8/13/14 | `docs/ROADMAP.md` | Serialize dated evidence writes; no slice overwrites another's history. |
| 5 ↔ 6 | Analytics page/helpers/client and dashboard contract | Serialize. Use namespaced sections and preserve each availability state. |
| 5 ↔ 7 | Analytics page/helpers/client and dashboard contract | Same ruling; integrate serially. |
| 5 → 8 | Release/cash/linkage snapshots → D+7/D+14 receipt | Hard dependency; Task 8 uses canonical cash availability, never status inference. |
| 5 ↔ 10 | Tracker telemetry exclusion contract | Task 10 UI must preserve the no-telemetry tracker boundary. |
| 5 ↔ 12 | Exact-flow schema/coverage → redirect measurement | Fixed redirect outcome must remain personless and flow-ID compatible. |
| 5 → 14 | Analytics UI/receipt → final verification | Verify degraded/unavailable as well as populated states. |
| 6 ↔ 7 | Analytics page/helpers/client and dashboard contract | Serialize into independent checkout/refill sections. |
| 6 → 9 | Failure code/category mapping and unified checkout → typed handoff | Hard dependency; Task 9 consumes Task 6's code/category contract. |
| 6 ↔ 12 | `app/actions/unified-checkout.ts` | Conditional W1 propagation must preserve typed failure metadata. |
| 6 → 14 | Checkout recovery view → final verification | Require legacy-unclassified and degraded-coverage proof. |
| 7 ↔ 13 | `docs/OPERATIONS.md` | Serialize cron-evidence and growth-hold documentation. |
| 7 → 14 | Refill evidence → final verification | Delivery, scheduler health, and 21-day outcomes remain distinct proofs. |
| 8 → 9 | Verified account-friction evidence → account handoff | Evidence dependency only; no calendar wait. |
| 2 → 10 | Real magic-link ownership proof → tracker access | Meaningful ownership dependency; D+14 removed. |
| 8 ↔ 13/14 | ROADMAP and PHI-free receipts | Append/serialize; never replace checkpoint history. |
| 9 ↔ 10 | Magic-link/account ownership semantics | Coordinate clean return routes and non-enumeration; keep pre-pay and tracker flows separate. |
| 9 ↔ 12 | Unified/guest checkout | Conditional W1 must preserve typed handoff and guest behavior. |
| 9 → 14 | Auth UI → browser proof | Verify identical public copy for existing and non-existing emails. |
| 10 → 14 | Tracker access UI/security → final proof | Verify uniform accepted response and no document/reply escalation. |
| 11 → 14 | SEO candidate → release/evidence | Indexing request stays approval-gated and is not a success assertion. |
| 12 ↔ 13 | Specialty registry/invariants and terminal-safety tests | Task 13 stays ED-policy-only; W1 must not change ED defaults. |
| 12 → 14 | Women's-health redirect/candidate → browser proof | Prove baseline instrumentation separately from any later candidate. |
| 13 → 14 | Growth-hold policy/docs → final proof | Evidence/proposals only; never turn state into an Ads mutation. |

### Per-task self-consistency

| Task | Status | Ruling carried into dispatch |
|---|---|---|
| 1 | Revise in implementation | Preserve the loopback, Playwright, non-Vercel development readiness lane; enforce/report fixed-fixture `exclude_from_reporting` in E2E setup/contracts rather than pretending the webhook policy can infer row-level reporting state. |
| 2 | Revise in implementation | Runner must explicitly provide production `NODE_ENV`, exact opt-in, test Stripe credentials, matching local Supabase URLs, and no Vercel environment. |
| 3 | Revise in implementation | Exercise four paths explicitly: normal approval, patient self-resend, staff resend, and email-hub reconstruction. The E2E is an action/bundle/outbox integration check, not a template snapshot. |
| 4 | Sound | Release proof remains separate from historical-resend approval. |
| 5 | Revise in implementation | Add availability/as-of/window ownership to guest linkage, directly or in the containing release snapshot. |
| 6 | Sound | Treat the 20-failure/<5% target as an outcome gate, not a merge assertion. |
| 7 | Revise in implementation | Name and update the actual `CRITICAL_CRONS` registry/contract in addition to diagnosing heartbeat recording. |
| 8 | Revise in implementation | Use the authoritative read-only deployment-SHA/timestamp source and pass explicit complete-window bounds. |
| 9 | Revise in implementation | Do not propagate arbitrary `error: string`; use a fixed public token/copy while raw details remain server-private. |
| 10 | Revise in implementation | Add callback destination allowlist and no-token-persistence coverage. |
| 11 | Sound | Global guide-body prohibition wins over the older audit suggestion; strengthen only existing non-guide links. |
| 12 | Revise in implementation | Any W1 assignment path stays default-off and fixture/explicit-candidate-only until a separate approved activation. |
| 13 | Sound | Preserve `hold > unavailable > watch > clear` and the two-hour target/six-hour new-scale distinction. |
| 14 | Sound after live recheck | The audit's former `fflate` blocker is already repaired on the base branch: workspace override `^0.4.9`, lockfile `0.4.9`, and fresh `corepack pnpm security:audit` passed with no known vulnerabilities. |

### Rulings

- Ruling: Do not add a standalone `fflate` pre-task — current code and a fresh audit prove the audit finding is stale — if wrong, the per-slice `release:check` will fail before any release.
- Ruling: Interpret Task 3's production E2E as an action/bundle/outbox integration test despite the general `docs/TESTING.md` guidance not to E2E template snapshots — the incident occurs at the server-action production bundle boundary — if wrong, the extra harness has maintenance cost but still cannot send provider email under the E2E seam.
- Ruling: Correct Task 3's nonexistent `reconstructEmailForRetry()` name to the current `reconstructEmailContent()` interface and cover normal approval, patient resend, staff resend, and no-frozen email-hub retry as four distinct paths — the code proves they have different authorization/recovery boundaries — if wrong, the harness may be broader than the single observed action but remains synthetic and provider-suppressed.
- Ruling: A green production-bundle reproduction with no Sentry frame ends Task 3 in `BLOCKED_DIAGNOSIS`; it does not earn a speculative React/template edit — if wrong, diagnosis takes longer, but the alternative risks shipping a no-op or new fulfilment defect.
- Ruling: The Task 3 runner must fail closed on explicit local Supabase coordinates, must not source or fall back to the primary `.env.local`, must use alternate local ports while the unrelated `moirai` stack owns 54321-54324, and must never stop a pre-existing stack or kill an unknown port-3060 process — if wrong, the harness could touch unrelated local or production state.
- Ruling: A `skipped_e2e` resend row cannot prove frozen-payload replay because provider suppression happens before payload freezing; seed a separate retryable no-frozen row for the reconstruction case and explicitly clean resend-attempt rows — if wrong, the regression would miss the recovery bundle seam or leave synthetic reservations behind.
- Ruling: Task 1's hosted production-build lane must also require `PLAYWRIGHT === "1"`, exact development/test values for the existing readiness lane, and both `VERCEL` and `VERCEL_ENV` absence; live events remain outside the test-event policy after signature verification — if wrong, a local opt-in could become broader than intended or required signed-event CI could fail.
- Ruling: Task 1 derives Supabase identity from effective `SUPABASE_URL ?? NEXT_PUBLIC_SUPABASE_URL` plus the public URL and requires an exact matching local/known-nonproduction identity; malformed/custom/production/mismatched targets fail closed and `E2E_ISOLATED_SUPABASE` is not authority — if wrong, the hosted lane could write to a wrong project.
- Ruling: Task 2 is code-implementable after Task 1, but the real hosted run is currently blocked on a dedicated `sk_test_*` key and matching test-mode price IDs; do not inherit the primary `.env.local`, whose discovered Stripe mode is live and Supabase target is production — if wrong, the preflight's retrieved-price `livemode === false` assertions still fail before checkout.
- Ruling: Task 2 uses a run-scoped alternate-port Supabase overlay (55320-55329) and a dynamic Mailpit endpoint from that overlay rather than the plan's literal 54324, because `moirai` owns the defaults — if wrong, the harness may need a different free port range but must still leave the unrelated stack untouched.
- Ruling: Repair the two confirmed fresh-schema convergence defects before accepting the production harness as a durable release gate: add forward-only idempotent nullable columns for `intake_answers.answers_encrypted`, `intake_answers.encryption_metadata`, and `patient_notes.created_by_name`; retain legacy `answers_enc`; do not blindly copy or backfill legacy ciphertext or historical author names — if wrong, fresh environments remain broken or stale data becomes authoritative.
- Ruling: The schema convergence task must remove Task 3's disposable `ALTER TABLE` shim and prove a fresh migration replay owns the runtime columns — if wrong, the production-bundle test can stay green while checked-in schema remains invalid.
- Ruling: Task 5 must expose start-cohort denominators/numerators separately from DB cash (`intakeStartedFlows`, `checkoutInitiatedFlows`, `purchaseCompletedFlows`) and derive unresolved validation as blocked flows without later medication completion — if wrong, Task 8 ratios would substitute incompatible accounting counts.
- Ruling: Task 5 cohort membership uses half-open `[from,to)` windows with an independent observation cutoff and per-horizon linkage maturity; 24h/7d/14d values may be pending/unavailable rather than zero — if wrong, immature retention cohorts would look like failures.
- Ruling: Task 5's guest denominator is reportable paid guest orders (`guest_email IS NOT NULL` as predicate only), with linkage requiring both `auth_user_id` and `email_verified_at >= paid_at`; verified-before-paid anomalies remain excluded and counted — if wrong, identifiers or impossible timestamps could distort retention.
- Ruling: Task 5 CLI requires an authoritative release-ready timestamp/receipt in addition to SHA, atomic aggregate-only JSON output, strict argument validation, and source-specific availability; it may not infer deployment time from git — if wrong, observation windows drift or failed reads masquerade as zeros.
- Ruling: Task 6 must first make the shared `CheckoutResult` a discriminated failure union with a centrally derived code/category/version, then update every authenticated, guest, duplicate-rebuild, and retry helper producer; browser code may never classify raw public errors — if wrong, deterministic branches remain `unknown` or leak account/provider detail into analytics.
- Ruling: Task 6 reserves the account-handoff code for Task 9, maps any current existing-account outcome to `identity_or_session`, and registers/allowlists only fixed checkout failure enums in personless analytics — if wrong, a machine-readable result could worsen account enumeration.
- Ruling: Task 6 lands after Task 5 and embeds its compact payment-failure section inside the existing five-card Business surface; category totals use first failure per valid v4 flow and only strictly later server purchases, with in-flight/eligible denominators plus legacy-unclassified and unjoinable event counts — if wrong, async recoveries or legacy rows are silently miscounted.

## Task 3 review record

- Implementer commits: `670a7d805`, `b4e2baf6e`, `b71c2d4fd`.
- Initial review: fixed dotenv/live-credential isolation, partial-start/signal/stop cleanup, and coverage of the real `executeCertApproval()` entry point.
- Round 2 review: added exact project-labelled Docker network verification alongside containers and volumes.
- Final task review: APPROVED.
- Outcome: current production Webpack bundle passes normal approval, patient resend, staff resend, and no-frozen hub reconstruction under synthetic provider suppression. The Sep 3 incident is not reproducible and Sentry frame access remains 403, so no speculative certificate production change is permitted.

## Schema convergence review record

- Implementer commits: `9021ed807`, `c6091f9b2`.
- Initial review: found that backend smoke still treated `intake_answers` as optional, allowing the legacy `request_answers` table to mask a missing encrypted-answer runtime contract.
- Correction: made `intake_answers` required, left only `request_answers` optional, and added a process-level contract proving a missing `answers_encrypted` column exits the real smoke command with failure.
- Final task review: APPROVED; focused re-review passed 1 file / 4 tests.
- Outcome: additive fresh-schema convergence is locally proven and the Task 3 disposable schema shim is gone. No production migration has been applied.

## Task 1 review record

- Implementer commits: `26358c0bc`, `055bd9331`.
- Initial review: found that treating every hosted Supabase ref except the known current production ref as non-production was denylist evidence and could admit a second production project.
- Correction: narrowed the production-bundle webhook-test lane to matching loopback Supabase URLs only; arbitrary hosted refs now fail closed as unknown.
- Final task review: APPROVED; focused payment/env verification passed 7 files / 128 tests.
- Outcome: signed test events can reach handlers only through the existing non-production development/test readiness lane or the explicit local production-bundle lane. Live events and authenticated admin replays remain unchanged; Task 2 still owns real hosted-Stripe browser proof.

## Task 2 review record

- Implementer/correction commits: `8e5daae1f`, `378ef5441`, `97013080f`, `f15265c41`, `c3f8d56fd`, `c7e5628bf`.
- Review corrections: count cleanup rows by the real scoped column; bind the run to one clean local Git SHA and a verified local Docker daemon; keep receipts ignored and Stripe secrets out of argv; scope CI secrets only to the hosted run; correct the documented focused-test count.
- Final task review: APPROVED as a repeatable local hosted-Stripe harness; focused verification passed 4 files / 84 tests plus lint, typecheck, diff, and missing-secret fail-closed smoke.
- Outcome: the runner covers repeat-Rx guest skip with no Auth user and med-cert magic-link linkage into the patient dashboard. Actual Stripe provider acceptance is not claimed until a fresh dedicated test key and the two exercised test Price IDs are supplied and the runner succeeds.

## Task 5 review record

- Implementer/correction commits: `fb3390d40`, `500ea85ae`, `e3f8a00a2`.
- Review corrections: use authoritative release readiness and half-open UTC cohorts; keep cash, funnel, medication, and guest-linkage evidence distinct; fail closed on invalid release timestamps; calculate mobile medication completion from flows that actually viewed the step on mobile while allowing a later cross-device completion.
- Final task review: APPROVED; focused verification passed 88 tests plus lint, typecheck, and invalid-date smoke.
- Outcome: release conversion, medication completion, canonical cash availability, and 24h/7d/14d guest linkage can be measured without exposing patient identifiers or turning immature cohorts into zeroes.

## Task 6 review record

- Implementer commit: `d2ff162fc`.
- Independent final task review: APPROVED; focused verification passed 8 files / 170 tests plus scoped lint, typecheck, and commit diff check. The implementer full suite passed 734 files / 6,910 tests.
- Outcome: every shared checkout producer returns a central fixed failure code/category/version; the browser emits only allowlisted personless dimensions; the Business surface reports first-failure recovery using strictly later server purchases with maturity, coverage, legacy, unjoinable, and fail-closed provider states. No live PostHog or authenticated-browser query is claimed.

## Task 11 review record

- Implementer/correction commits: `023751212`, `d6a8a9f43`, `65391e5ae`, `9986f7e20`.
- Final task review: APPROVED locally after centralising the guide-body acquisition boundary and strengthening only compliant non-guide links and crawl contracts.
- Outcome: `/prescriptions` has stronger crawl/index signals without reintroducing service acquisition links inside educational guide bodies. No GSC mutation or indexing-success claim was made.

## Task 12 review record

- Implementer/correction commits: `ab67d911a`, `84876b671`, `f28b5e1f3`, `e205ffdfd`.
- Review corrections: make the redirect event durable when the React PostHog client is unavailable; allow only a fixed PHI-free entry marker; synchronously deduplicate rapid activation; retain the navigation latch through source-flow hydration and clear it only at the exact repeat-script destination.
- Independent final task review: APPROVED; 12 focused files / 164 tests plus scoped lint, typecheck, and commit diff check passed.
- Outcome: current-pill patients can take the existing repeat-script handoff with one navigation and one personless outcome event. No W1 candidate, clinical scope, or safety-gate change was activated.

## Task 13 review record

- Implementer commit: `7c96d4835`.
- Independent final task review: APPROVED; 8 files / 158 tests, doc audit 10 files / 124 tests, lint, typecheck, and diff check passed.
- Outcome: the two-hour queue target is a watch signal, the six-hour threshold blocks only new scale, and 20-hour/24-hour, clinical, fulfilment, support, and QA evidence can create a hard hold with at most an approval-ready Ads pause proposal. No Ads mutation or ED/W1 activation occurred.
