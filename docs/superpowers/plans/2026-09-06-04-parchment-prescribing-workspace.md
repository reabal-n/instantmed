# Session 4 — Room to prescribe

> **For agentic workers:** Use `superpowers:executing-plans` and the project clinical/UI skills. Work only this session plan. Follow the [ROADMAP session protocol](../../ROADMAP.md#sequential-build-session-protocol).

**Goal:** Give Parchment useful screen space while keeping the exact current patient and prescribing reference visible and returning reliably to the same review.

**Architecture:** Enlarge and reorganize the existing Parchment wrapper. Consume Session 3's accepted source-faithful summary. Preserve provider ownership of the embedded form, existing full-height mobile sheet, synchronization, recovery and completion logic.

**Tech stack:** Existing React/Next.js wrapper, Radix dialog/sheet, Tailwind tokens, Parchment iframe and verified callback/recovery actions.

**Spec/design brief:** [ROADMAP](../../ROADMAP.md), rank 2; [Session 3](2026-09-06-03-concise-clinical-review.md); [DESIGN](../../../DESIGN.md); [prescribing operations](../../OPERATIONS.md). Operator wants concise medicine/dose/frequency in the modal; Session 3 delivers that first.

**Status:** Runtime merged and deployed through protected PR #545 on September 10 Sydney after independent review, local release checks and required CI passed on the final head. Production and dashboard-authentication smoke passed. Automatic public-funnel review completed at 7/10 against its 8/10 target. Final release sign-off remains pending the public-quality decision, staff visual acceptance and actual provider/device proof. Session 5 is unstarted.

## Global constraints

- No new summary parser, clinical inference, automated provider-form filling, prescription issuance or completion-on-close.
- Completion depends on durable `script_sent`/exact request evidence. An iframe confirmation screen, received history row, phone click or local success message does not replace it.
- Preserve request/patient/reference matching, provider SSO/CSP rules, doctor capability and ownership checks, paginated recovery, truthful notification outcomes and audited fallback.
- Use existing portal colors/type and accessible controls. No decorative motion, screenshots of real clinical data or PHI-bearing URLs/analytics.

## Task 1 — Increase usable desktop space

**Files:** `components/doctor/parchment-prescribe-panel.tsx`, `components/doctor/intake-review-panel.tsx`, and existing dialog/sheet primitives only if a demonstrated shared primitive limitation requires it.

**Interface:** Use the summary and source fields accepted in Session 3. Keep open/close and request-change events connected to the existing note save and request selection owners.

- [x] Capture the shipped wrapper at 1366×768, 1440×900 and a narrow desktop width. The original desktop cap is 800px; compare actual iframe usable area before changing it.
- [x] Use a large desktop workspace with a narrow reference pane beside the provider form when sufficient width exists. The reference shows current patient, medicine/strength, dose/directions, frequency and indication. Preserve Session 3's verified generic-name-only medication-search copy and safe fallback; separate directions/frequency copies retain exact source units and qualifiers. Full regimen display does not authorize a new bundled prescribing instruction.
- [x] At widths where side-by-side reference makes the provider unusable, use the compact top reference from Session 3. Choose the breakpoint from browser evidence, not a forced two-column design.
- [x] Keep close, loading status and recovery controls reachable. The surrounding header must not consume the provider's working height or produce a whole-page scrollbar.
- [x] Verify long reference content and multiple medicines without truncating clinical details or shrinking the provider form below a usable size.

## Task 2 — Preserve mobile and interrupted journeys

**Files:** same wrapper and existing provider/doctor-panel hooks. Inspect current external-tab and slow-load recovery before editing; these behaviors already exist.

- [x] Preserve the full-height mobile sheet, safe-area spacing and keyboard accommodation at 390×844 and 360×740.
- [x] Keep a compact identity/regimen strip with an accessible expanded reference. The keyboard must not hide close/recovery actions or leave the background review scrollable.
- [x] Test iframe slow load, network loss, refresh, external-tab return, delayed webhook, failed recovery and a case that changes while the provider is open.
- [x] Restore the same selected request, note content, scroll position and sensible focus on close. When a background status change invalidates the request, display its current durable state instead of restoring stale actions.
- [x] Preserve distinction between prescription recorded, patient notification outcome and explicit Complete request. Failed email delivery must not be presented as sent.

## Verification and handoff

Use `lib/__tests__/parchment-prescribing-context.test.ts`, `lib/__tests__/parchment-client-workflows.test.ts`, `lib/__tests__/parchment-embed-policy.test.ts`, `lib/__tests__/prescription-fulfilment-dashboard.test.ts` and the existing mobile/dashboard/Parchment integration specs as appropriate to the changed behavior.

Provide seeded visual comparisons of reference readability and actual iframe area, plus keyboard/close/return assertions. Wrapper tests and a mocked provider do not prove real prescription issuance. Production read-only browser inspection may verify sizing/authenticated loading if available; do not generate a patient prescription for acceptance. Record that limit explicitly if provider inspection is unavailable.

Complete the shared release protocol and hand off the final wrapper dimensions, responsive mode boundary and return-state contract. Session 5 must reuse these rather than restyle them.

**Next-session prompt:** “Execute Session 5, Queue and Requests navigation, from ROADMAP. Preserve the released clinical review and Parchment workspace; simplify discovery and return navigation around them.”

## Execution receipt

Implementation started from freshly fetched `origin/main` at `ee3a955f14d45f25af5679edd784fdc9eecbce52`. The operator's later approval authorized this plan and demonstrated test-evidence repairs in the existing task; it did not grant a visual-quality exception or authorize Session 5.

**Changes:** runtime wrapper commit `75bf2e27d`; CI evidence preservation `8a18405bb`; owned-fixture cleanup `4159300b7`; isolated browser CI wiring `d9db9093c`. One reference render and existing clinical/copy semantics remain. Desktop width is viewport minus 32px, capped at 1440px; the 300px side reference starts at 1280px. Narrow/mobile reference stays above the provider. Retry removes the old iframe and cancels its delayed reveal; the shared panel owner handles cross-origin keyboard traversal. No parser, provider form filling, clinical decision, payment, credential or migration changes.

**Measured real-app provider region, same synthetic ED request:**

| Viewport | Before | After |
|---|---|---|
| 1366×768 | 798×483 | 1032×648 |
| 1440×900 | 798×615 | 1106×780 |
| 1024×768 | 798×483 | 990×483 |
| 390×844 | 388×539 | 388×539 |
| 360×740 | 358×435 | 358×435 |

Local comparison: `output/plan4-prescribing-workspace/comparison.html` in the primary checkout. Source images use owned synthetic records and deliberately blocked provider access. The isolated harness uses a loopback provider at a different origin. Both global and staff stylesheets must be compiled; an initial harness omission caused false wide-layout failures and was corrected before acceptance.

**Local evidence:**

- Thirty isolated wrapper scenarios passed: five viewports × short/long reference × light/dark, exact separate clipboard values, warning/disclosure access, pending/failed retry, the independent 600ms reveal race, fresh external-tab return, case replacement during pending load and delayed reveal, ordinary/shared-panel focus, cross-origin keyboard entry/forward/back, and simulated visual-viewport contraction. All thirty traces and seventy screenshots were retained under a unique `test-results/parchment-workspace/` directory.
- The real app passed the ten viewport/theme comparisons and same-request close/return. A synthetic durable script update while the modal was open unlocked Complete request after refresh and kept the request awaiting explicit completion; close alone left completion disabled. Notes and exact request identity remained intact.
- Existing `clinical-review-concise.spec.ts` and `doctor.prescription-ui.spec.ts`: 32 passed with retries disabled, covering save/failed-save recovery, request navigation, exact source facts, clarification, profile intent, another doctor's lock and durable completion gates.
- Before repairs, all six previously retry-dependent cases also passed unchanged with retries disabled. Neither the original decryption/transport/login cause nor an offending historical envelope was reproduced. A separate mocked fault injection proved cleanup errors were swallowed; the repaired helper passed eight focused tests and preserves exact-ID deletion order. This is not proof that cleanup caused the historical failures.
- Independent wrapper and cleanup reviews approved specification and code quality with no actionable findings. Focused units, typecheck, portal-class guard and documentation audit passed. Final local release and required CI evidence are recorded below.

**Evidence limits:** no real Parchment session or prescription was created. Simulated keyboard geometry is not a physical-device keyboard test. Actual provider acceptance requires an approved sandbox/test request; the prior public-funnel 7/10 score and final owner acceptance of staff visuals remain unresolved human/evidence gates. Per-test timeouts, retries, clinical assertions and release thresholds were not relaxed; the shared suite deadline changed as documented below. Session 5 remains unstarted.

**CI follow-up:** [PR #545](https://github.com/reabal-n/instantmed/pull/545), first head `46b3be82805976600949c9a47cf5b18974dbb857`, passed local `release:check` (7,613 tests passed, 122 skipped, production build and dependency audit passed). Required [CI run 34340805794](https://github.com/reabal-n/instantmed/actions/runs/34340805794) passed `build` and Lighthouse, including 7,612 CI unit tests and the isolated prescribing harness. E2E exceeded its 50-minute job limit: ops had 8 passed/1 skipped; med-cert had 78 passed/1 flaky; the 107-case paid suite was interrupted after repeated failed attempts. No final paid/mobile/resume acceptance or E2E artifact upload was available from that run.

Source investigation found the global staff navigation identity read was not restricted to synthetic patients in test mode. `f1bbdc773` and its typing correction `a6bd134ea` apply both synthetic markers before fetching/decrypting and partition the existing navigation cache; six query/decryption/cache regressions passed. This does not identify the exact historical offending ciphertext or attribute every retry to that read. `71f6c1fc3` adds a shared 45-minute Playwright deadline inside the unchanged 50-minute job limit; fourteen evidence tests passed, including an actual interrupted synthetic suite retaining its report and trace, and a later expired invocation preserving those files. Independent follow-up review found no actionable regression. Encryption alarms, per-test timeouts, retries and assertions remain intact.

The first local reproduction with CI-style key selection and retries disabled passed 31 of 32 cases with no decryption alarms. Its remaining failure reproduced a queue-clock hydration mismatch across server/browser render times. `a3f8f4fd5` shares the server's initial timestamp and retains the existing live clock effect. Two deterministic delayed-render cases failed before the repair and passed after it; the focused clock/dashboard suite passed all 31 tests. Independent review found no actionable regression. The complete browser rerun passed all 32 cases in 4.2 minutes with retries disabled and no decryption alarms. Local `release:check` passed on `84c170741a7bb4085ca0cdaa2ab9d84fcbff3c96`: 7,628 tests passed, 122 skipped; lint, type checking, production build, bundle budgets and dependency audit passed.

[CI run 34349871493](https://github.com/reabal-n/instantmed/actions/runs/34349871493) on that head passed build and Lighthouse, including 7,627 CI unit tests, and logged zero decryption alarms. Both isolated browser harnesses passed. Ops had 7 passed/1 flaky/1 skipped; certificate readiness had 78 passed/1 flaky; paid clinical desktop had all 107 passed on the first attempt; mobile had 1 passed. Signed guest recovery passed four cases before the shared deadline interrupted its final case and global teardown. Completion and cleanup of that final case were not established. Both reports and traces were retained, with upload steps completing in five seconds. The deadline is now 47 minutes inside the same 50-minute job limit, retaining three minutes for diagnostics. Per-test limits, retries and assertions remain intact; the adjusted head was subsequently verified by run 34355864062 below. The two earlier retry-dependent cases showed slow server navigation/action responses; their eventual passes are not first-attempt proof or a basis for inferring a new UI defect.

[CI run 34355864062](https://github.com/reabal-n/instantmed/actions/runs/34355864062) on `7dcd1f766ed8350148b9c09df30b0e86e57c6e4e` passed all required checks. Ops had 8 passed/1 skipped; certificate readiness had 79 passed; paid desktop had 104 passed/3 flaky; mobile had 1 passed; guest recovery had all 5 passed. Every global teardown completed, and both artifact uploads succeeded. The retained log still contained two decryption alarms during the passing ordinary-doctor weight queue test. Its bare dashboard path was not synthetic-only; this was separate from the three retry-dependent cases.

`a5900cce6` scopes queue rows, all counts/oldest selection and adjacent review-history streams before fetching, while preserving capability/actor filters and ordinary admin seed opt-ins. Two mocked regressions failed before the repair; 135 focused tests, typecheck and lint passed afterward. Independent review passed. The exact historical ciphertext remains unidentified.

Downloaded failed-attempt traces showed successful note/clarification response headers with unfinished RSC streams. Two later review-data responses confirmed the exact clarification message and pending-info status. The note attempt's durability was not reached and is not inferred from its open prescribing panel. The tests now retain exact action matching, HTTP success, visible outcomes and durable saved-note/message/status assertions without waiting for stream EOF. Independent review passed. A subsequent local run with CI-style key selection and encryption reads/writes enabled passed all 35 clinical, profile and weight-review cases in 4.4 minutes, retries disabled, zero decryption alarms and successful teardown. The other failed attempts were login/profile latency and a readback connection reset; no production defect or key change is inferred from those attempts.

### Final release receipt — September 10 Sydney

| Boundary | Evidence |
|---|---|
| Tested head | `591539e492521469b3b637b20bcfdbfb5231ce02` |
| Local release | `corepack pnpm release:check` passed: 7,635 tests passed, 122 skipped; lint, typecheck, production build, bundle budgets and zero-known-vulnerability audit passed. |
| Local clinical browser | 35/35 passed in 4.4 minutes with retries disabled, CI-style key selection, encryption reads/writes enabled, zero decryption alarms and successful teardown. |
| Required PR CI | [Run 34363687187](https://github.com/reabal-n/instantmed/actions/runs/34363687187) passed build, E2E and Lighthouse on the tested head. CI unit tests: 7,634 passed/123 skipped. Both isolated harnesses passed, including 30 prescribing scenarios. Ops: 8 passed/1 skipped; certificate: 78 passed/1 flaky; paid desktop: 106 passed/1 flaky; mobile: 1 passed; guest recovery: 5 passed. All five global teardowns succeeded. The complete log contains zero decryption alarms. Notes and clarification passed on their first attempts. |
| Retained CI artifacts | Report `10111183250` and traces `10111184820` uploaded successfully. Selected failed-attempt traces, safe receipts and final logs are preserved in the primary checkout at `output/plan4-prescribing-workspace/verification/`. |
| Runtime merge | [PR #545](https://github.com/reabal-n/instantmed/pull/545), merge `536e9498c7057188b53233a8f06f4573d94f04bc`, 2026-09-09T15:27:39Z. Strict required checks passed without bypass; the merged file tree exactly matches the tested head. |
| READY production | `dpl_LpF6ze5SPb9nDbjoCtgGyrXTQhWk`, source `536e9498c7057188b53233a8f06f4573d94f04bc`, ready 2026-09-09T15:30:31.484Z. The canonical `instantmed.com.au` alias was independently read back on this deployment. |
| Post-deploy public smoke | [Run 34370700427](https://github.com/reabal-n/instantmed/actions/runs/34370700427) passed against the runtime merge. Workflow metadata supplies the receipt; no canary payload is retained. |
| Dashboard authentication smoke | `corepack pnpm smoke:prod-dashboard` exited 0 against `https://instantmed.com.au`: unauthenticated dashboard access redirects without global error text. This establishes the auth boundary, not a clinician outcome. |
| Automatic video review | [Run 34370700627](https://github.com/reabal-n/instantmed/actions/runs/34370700627) completed successfully using the runtime merge and canonical production URL. Capture `2026-09-09-paid-funnel-04dn`, 2026-09-09T15:31:39.534Z: Gemini 6/10, Claude 7/10, synthesized 7/10; the >=8 acceptance checkbox remains unchecked. Artifact `10111905403` was downloaded and preserved under `verification/production-video-review/`. |

Downloaded traces narrow the two retry-dependent attempts: the certificate preview action returned HTTP 200 headers after 16.548 seconds while its dialog assertion expired after 15 seconds; the unfinished response has no retained body, so that attempt does not prove a completed preview. The profile drawer checks passed, then full-record navigation took 21.357 seconds and its page chunk remained pending when the Clinical-tab assertion failed. Both tests passed on retry. These observations do not establish a new application defect or first-attempt acceptance; no blanket timeout or retry increase was applied.

The automatic review remains a product-quality gate under [OPERATIONS](../../OPERATIONS.md#current-release-gate-updated-2026-06-12). Inspected frames show the unchanged overlapping hero artwork, dense introductory copy and wrapped review values; they do not establish a Plan 4 regression. The public marketing/request source paths are unchanged from the prior runtime. Capture reaches Review & pay with consent selected and Pay visible; it does not click Pay or prove hosted checkout/payment success. Suggestions to invent an average fulfilment time, weaken scope wording or promise delivery before a drink cools were not adopted. No public redesign, repeated scoring run or acceptance exception was applied.

The automatic main CI run [34370386113](https://github.com/reabal-n/instantmed/actions/runs/34370386113) repeats the already tested merged tree. Build passed; Lighthouse and E2E were not complete when this receipt was prepared. The completed required PR run above owns runtime CI acceptance. A later documentation-only merge may supersede this repeated run under the existing concurrency policy; that is not a passed main E2E result.

Rollback is a governed revert of PR #545. Prior production was `dpl_pJj8B3ghZq2krbckYMUcU2sXdaVi`, source `92cd3c47aa2fea6dd49120f2fff75952f7407d01`. No dependency, credential, schema or backfill changes require a separate rollback. A code revert does not undo notes or clinical outcomes already saved.

The documentation handoff uses a separate protected PR. Final main synchronization and removal of merged branches/worktrees are recorded in the primary checkout at `output/plan4-prescribing-workspace/verification/release-state.json`; the comparison and evidence remain outside the disposable worktree. Session 5 must reuse the released source summary, responsive workspace and return-state contract. Use the next-session prompt above after reviewing the outstanding acceptance gates.
