# Session 4 — Room to prescribe

> **For agentic workers:** Use `superpowers:executing-plans` and the project clinical/UI skills. Work only this session plan. Follow the [ROADMAP session protocol](../../ROADMAP.md#sequential-build-session-protocol).

**Goal:** Give Parchment useful screen space while keeping the exact current patient and prescribing reference visible and returning reliably to the same review.

**Architecture:** Enlarge and reorganize the existing Parchment wrapper. Consume Session 3's accepted source-faithful summary. Preserve provider ownership of the embedded form, existing full-height mobile sheet, synchronization, recovery and completion logic.

**Tech stack:** Existing React/Next.js wrapper, Radix dialog/sheet, Tailwind tokens, Parchment iframe and verified callback/recovery actions.

**Spec/design brief:** [ROADMAP](../../ROADMAP.md), rank 2; [Session 3](2026-09-06-03-concise-clinical-review.md); [DESIGN](../../../DESIGN.md); [prescribing operations](../../OPERATIONS.md). Operator wants concise medicine/dose/frequency in the modal; Session 3 delivers that first.

**Status:** Implemented locally on September 9 after the operator approved the bounded next actions. Independent code reviews and local browser checks passed; release checks, protected merge and deployment are in progress. The preceding staff visual acceptance and public-funnel 7/10 quality decision remain separate human gates. Session 5 is unstarted.

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

**Release:** protected PR, exact-head CI, merge SHA, production deployment and smoke pending. Rollback is the runtime PR revert; no data/schema rollback is required.
