# Session 4 — Room to prescribe

> **For agentic workers:** Use `superpowers:executing-plans` and the project clinical/UI skills. Work only this session plan. Follow the [ROADMAP session protocol](../../ROADMAP.md#sequential-build-session-protocol).

**Goal:** Give Parchment useful screen space while keeping the exact current patient and prescribing reference visible and returning reliably to the same review.

**Architecture:** Enlarge and reorganize the existing Parchment wrapper. Consume Session 3's accepted source-faithful summary. Preserve provider ownership of the embedded form, existing full-height mobile sheet, synchronization, recovery and completion logic.

**Tech stack:** Existing React/Next.js wrapper, Radix dialog/sheet, Tailwind tokens, Parchment iframe and verified callback/recovery actions.

**Spec/design brief:** [ROADMAP](../../ROADMAP.md), rank 2; [Session 3](2026-09-06-03-concise-clinical-review.md); [DESIGN](../../../DESIGN.md); [prescribing operations](../../OPERATIONS.md). Operator wants concise medicine/dose/frequency in the modal; Session 3 delivers that first.

**Status:** Planned. Requires Session 3's deployed summary, accepted visual hierarchy and note-preservation proof.

## Global constraints

- No new summary parser, clinical inference, automated provider-form filling, prescription issuance or completion-on-close.
- Completion depends on durable `script_sent`/exact request evidence. An iframe confirmation screen, received history row, phone click or local success message does not replace it.
- Preserve request/patient/reference matching, provider SSO/CSP rules, doctor capability and ownership checks, paginated recovery, truthful notification outcomes and audited fallback.
- Use existing portal colors/type and accessible controls. No decorative motion, screenshots of real clinical data or PHI-bearing URLs/analytics.

## Task 1 — Increase usable desktop space

**Files:** `components/doctor/parchment-prescribe-panel.tsx`, `components/doctor/intake-review-panel.tsx`, and existing dialog/sheet primitives only if a demonstrated shared primitive limitation requires it.

**Interface:** Use the summary and source fields accepted in Session 3. Keep open/close and request-change events connected to the existing note save and request selection owners.

- [ ] Capture the shipped wrapper at 1366×768, 1440×900 and a narrow desktop width. The original desktop cap is 800px; compare actual iframe usable area before changing it.
- [ ] Use a large desktop workspace with a narrow reference pane beside the provider form when sufficient width exists. The reference shows current patient, medicine/strength, dose/directions, frequency and indication. Preserve Session 3's verified generic-name-only medication-search copy and safe fallback; separate directions/frequency copies retain exact source units and qualifiers. Full regimen display does not authorize a new bundled prescribing instruction.
- [ ] At widths where side-by-side reference makes the provider unusable, use the compact top reference from Session 3. Choose the breakpoint from browser evidence, not a forced two-column design.
- [ ] Keep close, loading status and recovery controls reachable. The surrounding header must not consume the provider's working height or produce a whole-page scrollbar.
- [ ] Verify long reference content and multiple medicines without truncating clinical details or shrinking the provider form below a usable size.

## Task 2 — Preserve mobile and interrupted journeys

**Files:** same wrapper and existing provider/doctor-panel hooks. Inspect current external-tab and slow-load recovery before editing; these behaviors already exist.

- [ ] Preserve the full-height mobile sheet, safe-area spacing and keyboard accommodation at 390×844 and 360×740.
- [ ] Keep a compact identity/regimen strip with an accessible expanded reference. The keyboard must not hide close/recovery actions or leave the background review scrollable.
- [ ] Test iframe slow load, network loss, refresh, external-tab return, delayed webhook, failed recovery and a case that changes while the provider is open.
- [ ] Restore the same selected request, note content, scroll position and sensible focus on close. When a background status change invalidates the request, display its current durable state instead of restoring stale actions.
- [ ] Preserve distinction between prescription recorded, patient notification outcome and explicit Complete request. Failed email delivery must not be presented as sent.

## Verification and handoff

Use `lib/__tests__/parchment-prescribing-context.test.ts`, `lib/__tests__/parchment-client-workflows.test.ts`, `lib/__tests__/parchment-embed-policy.test.ts`, `lib/__tests__/prescription-fulfilment-dashboard.test.ts` and the existing mobile/dashboard/Parchment integration specs as appropriate to the changed behavior.

Provide seeded visual comparisons of reference readability and actual iframe area, plus keyboard/close/return assertions. Wrapper tests and a mocked provider do not prove real prescription issuance. Production read-only browser inspection may verify sizing/authenticated loading if available; do not generate a patient prescription for acceptance. Record that limit explicitly if provider inspection is unavailable.

Complete the shared release protocol and hand off the final wrapper dimensions, responsive mode boundary and return-state contract. Session 5 must reuse these rather than restyle them.

**Next-session prompt:** “Execute Session 5, Queue and Requests navigation, from ROADMAP. Preserve the released clinical review and Parchment workspace; simplify discovery and return navigation around them.”

## Execution receipt

Unstarted. Record actual viewport choices, behavioral acceptance and release evidence when performed.
