# Session 4 — Room to prescribe

> **For agentic workers:** Use `superpowers:executing-plans` and the project clinical/UI skills. Work only this session plan. Follow the [ROADMAP session protocol](../../ROADMAP.md#sequential-build-session-protocol).

**Goal:** Give Parchment useful screen space while keeping the exact current patient and prescribing reference visible and returning reliably to the same review.

**Architecture:** Enlarge and reorganize the existing Parchment wrapper. Consume Session 3's accepted source-faithful summary. Preserve provider ownership of the embedded form, existing full-height mobile sheet, synchronization, recovery and completion logic.

**Tech stack:** Existing React/Next.js wrapper, Radix dialog/sheet, Tailwind tokens, Parchment iframe and verified callback/recovery actions.

**Spec/design brief:** [ROADMAP](../../ROADMAP.md), rank 2; [Session 3](2026-09-06-03-concise-clinical-review.md); [DESIGN](../../../DESIGN.md); [prescribing operations](../../OPERATIONS.md). Operator wants concise medicine/dose/frequency in the modal; Session 3 delivers that first.

**Status:** Implemented locally on September 9 after the operator approved the bounded next actions. Independent code reviews and local browser checks passed. The first required CI run exposed test-read isolation and timeout evidence gaps; bounded repairs are undergoing release verification before protected merge and deployment. The preceding staff visual acceptance and public-funnel 7/10 quality decision remain separate human gates. Session 5 is unstarted.

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
- Independent wrapper and cleanup reviews approved specification and code quality with no actionable findings. Focused units, typecheck, portal-class guard and documentation audit passed. Full release check and exact-head CI receipts will be recorded after completion.

**Evidence limits:** no real Parchment session or prescription was created. Simulated keyboard geometry is not a physical-device keyboard test. Actual provider acceptance requires an approved sandbox/test request; the prior public-funnel 7/10 score and final owner acceptance of staff visuals remain unresolved human/evidence gates. Test retries, timeouts, clinical assertions and release thresholds were not relaxed. Session 5 remains unstarted.

**CI follow-up:** [PR #545](https://github.com/reabal-n/instantmed/pull/545), first head `46b3be82805976600949c9a47cf5b18974dbb857`, passed local `release:check` (7,613 tests passed, 122 skipped, production build and dependency audit passed). Required [CI run 34340805794](https://github.com/reabal-n/instantmed/actions/runs/34340805794) passed `build` and Lighthouse, including 7,612 CI unit tests and the isolated prescribing harness. E2E exceeded its 50-minute job limit: ops had 8 passed/1 skipped; med-cert had 78 passed/1 flaky; the 107-case paid suite was interrupted after repeated failed attempts. No final paid/mobile/resume acceptance or E2E artifact upload was available from that run.

Source investigation found the global staff navigation identity read was not restricted to synthetic patients in test mode. `f1bbdc773` and its typing correction `a6bd134ea` apply both synthetic markers before fetching/decrypting and partition the existing navigation cache; six query/decryption/cache regressions passed. This does not identify the exact historical offending ciphertext or attribute every retry to that read. `71f6c1fc3` adds a shared 45-minute Playwright deadline inside the unchanged 50-minute job limit; fourteen evidence tests passed, including an actual interrupted synthetic suite retaining its report and trace, and a later expired invocation preserving those files. Independent follow-up review found no actionable regression. Encryption alarms, per-test timeouts, retries and assertions remain intact.

The first local reproduction with CI-style key selection and retries disabled passed 31 of 32 cases with no decryption alarms. Its remaining failure reproduced a queue-clock hydration mismatch across server/browser render times. `a3f8f4fd5` shares the server's initial timestamp and retains the existing live clock effect. Two deterministic delayed-render cases failed before the repair and passed after it; the focused clock/dashboard suite passed all 31 tests. Independent review found no actionable regression. The complete browser rerun passed all 32 cases in 4.2 minutes with retries disabled and no decryption alarms. Local `release:check` passed on `84c170741a7bb4085ca0cdaa2ab9d84fcbff3c96`: 7,628 tests passed, 122 skipped; lint, type checking, production build, bundle budgets and dependency audit passed.

[CI run 34349871493](https://github.com/reabal-n/instantmed/actions/runs/34349871493) on that head passed build and Lighthouse, including 7,627 CI unit tests, and logged zero decryption alarms. Both isolated browser harnesses passed. Ops had 7 passed/1 flaky/1 skipped; certificate readiness had 78 passed/1 flaky; paid clinical desktop had all 107 passed on the first attempt; mobile had 1 passed. Signed guest recovery passed four cases before the shared deadline interrupted its final case and global teardown. Completion and cleanup of that final case were not established. Both reports and traces were retained, with upload steps completing in five seconds. The deadline is now 47 minutes inside the same 50-minute job limit, retaining three minutes for diagnostics. Per-test limits, retries and assertions remain intact; required CI on the adjusted head is pending. The two earlier retry-dependent cases showed slow server navigation/action responses; their eventual passes are not first-attempt proof or a basis for inferring a new UI defect.

**Release:** protected merge, passing required CI on the final head, production deployment and smoke pending. Rollback is the runtime PR revert; no data/schema rollback is required.
