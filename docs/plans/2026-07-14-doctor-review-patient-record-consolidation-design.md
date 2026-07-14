# Doctor Review and Patient Record Consolidation Design

**Date:** 2026-07-14

**Status:** Implemented 2026-07-14

**Scope:** Doctor request review, quick patient profile, and full patient record

**Authority:** Reference only. `docs/ROADMAP.md` remains the sole active priority queue.

**Relationship:** This design supersedes the layout and interaction assumptions in the historical prescribing-packet plan. Its executable implementation record is `docs/superpowers/plans/2026-06-26-06-doctor-review-ui-simplification.md`.

## Problem

The doctor review cockpit is organised around source components instead of the doctor's decision sequence. A repeat-prescription answer is independently transformed by attention flags, the clinical case summary, the generated draft note, and the prescribing packet. The result is repeated medicine names, doubled strengths, raw stored values, a large amount of vertical chrome, and patient identity/contact details below secondary clinical prose.

The quick profile repeats the active request but omits useful longitudinal clinical context already available in the authorised patient health-profile surface. The full patient record leads with operational state and a broad timeline instead of a clinical overview.

This is a consolidation project, not a new feature family or visual redesign.

## Locked Product Decisions

1. A sticky patient safety band always shows:
   - full name;
   - age and date of birth;
   - sex;
   - suburb and state;
   - phone;
   - Medicare/IHI readiness;
   - first-visit or prior-request count;
   - acquisition source and landing path;
   - quick-profile and full-record actions.
2. Missing or uncertain request fields render inside the single request packet. The separate large attention card is removed.
3. The draft clinical note is collapsed by default and labelled `Draft note · Review required`.
4. Prescription requests retain both visible actions:
   - `Prescribe` remains available when prescribing prerequisites pass;
   - the service-aware completion action remains visible but disabled until fulfilment is recorded.
5. Fulfilment never auto-completes the request. It refreshes the open request, enables completion, and shows `Prescription recorded — complete when ready`.
6. Request attribution shows a calm `Source · landing path` summary. Campaign, keyword, and click details stay in the full patient record.
7. Longitudinal health-profile data remains read-only in this project. Clinician corrections use the existing notes system rather than overwriting patient-entered facts.
8. The quick profile shows the three most recent clinically relevant events, total counts, and `Open full record`.
9. Clinical absence states remain distinct: `None reported`, `Not asked`, and `Not recorded` must never collapse into one state.
10. The full patient record uses `Clinical`, `History`, and `Operations` tabs, opening on `Clinical`.
11. Terminal action labels are service-aware and supplied by typed workflow metadata, not route-specific JSX.
12. The same review shell and packet contract apply to every request type. Service-specific clinical fields remain explicit through typed adapters; the UI must not hard-code medicine names or route strings.

## No-Bloat Constraints

- Add no new React component family.
- Add no database migration or new API route.
- Add no new realtime subscription, polling loop, state library, or background job.
- Reuse the existing review-data, patient-summary, and doctor health-profile data paths.
- Reuse `IntakeReviewPanel`, `RequestInfoCard`, `PatientProfilePanel`, `AttributionChip`, `PatientTimeline`, existing tabs, disclosures, buttons, and status primitives.
- Prefer one focused pure domain module over repeated parsing inside components.
- Delete superseded renderers, exports, comments, and tests after callers migrate; do not leave compatibility wrappers without a live caller.

## Architecture

### Canonical review packet

One typed review-packet model becomes the only source for default-visible request facts. It normalises current-intake answers into:

- request title and service kind;
- clinically relevant facts in display order;
- field status: confirmed, inferred, missing, not asked, or not applicable;
- source/provenance for values whose meaning could be ambiguous;
- unresolved issues attached to the affected fact;
- optional contextual facts;
- workflow metadata: service-aware action labels and prerequisites;
- fulfilment state.

The packet uses a typed adapter registry keyed by normalised service type/subtype. This is deliberate clinical variation, not view hard-coding. `RequestInfoCard` renders the common packet shape and does not switch on routes or medicine labels.

For repeat prescriptions, medicine parsing occurs once. A value such as `Effexor 75mg` may yield a clean medicine label and an inferred strength, but inferred strength must remain visibly unconfirmed and must not satisfy a required structured-strength rule. Stored enums are humanised before entering the view model.

`ClinicalCaseSummary` may continue to own non-duplicative patient narrative and draft-note generation, but it must consume canonical normalised values rather than parse medication answers again. Default-visible medicine, strength, dose, frequency, indication, and last-prescribed facts render only through the request packet.

### Existing component composition

- `IntakeReviewPanel` remains the data-owning shell and lock/audit boundary.
- `RequestInfoCard` becomes the single default-visible request packet for all services.
- `ClinicalCaseReview` retains note review/editing but opens collapsed.
- `SafetyFlagsCard` retains genuine safety/red-flag information.
- Missing-field notices currently rendered through generic intake flags migrate into the affected request-packet rows.
- `PrescribingPacketCard` is deleted after its live information is absorbed into `RequestInfoCard`.
- `IntakeFlagsPanel` is deleted only if the caller audit proves its remaining output is fully owned by the request packet or genuine safety-flags surface. Otherwise it is narrowed to non-duplicative safety content.

No new React component is required for this composition.

## Review Cockpit

### Patient safety band

The band sits above the internal review scroller and remains visible with the fixed action rail. It presents compact patient identity, contact/readiness, prior-visit context, and acquisition source without nested cards.

Readiness must not conflate review and fulfilment. If clinical review may proceed but prescribing identity is incomplete, the band states both facts explicitly. All-clear operational states collapse to quiet text; blockers receive emphasis.

### Request packet

The packet follows the safety band and answers:

1. What is being requested?
2. What facts support the decision?
3. Which exact fields remain missing or uncertain?
4. What is the next permitted action?

An issue count may appear in the packet heading. The affected rows carry the explanation, so there is no second list repeating medicine names. Optional context is compact and appears once.

The full intake and draft note remain available through existing disclosure patterns. Neither competes with the default request packet.

### Actions

The fixed action rail remains visible. Typed workflow metadata supplies labels and prerequisites, for example:

- medical certificate: `Approve certificate`;
- prescription request before fulfilment: `Prescribe` plus disabled `Complete request`;
- prescription request after fulfilment: the prescribing control no longer permits a duplicate prescription, the recorded state is visible, and `Complete request` becomes enabled;
- non-prescribing consult completion: the explicit service-appropriate completion label.

`Sent outside Parchment` remains a secondary fallback with its existing durable evidence requirement. It must not compete with the normal prescribing path.

## Targeted Fulfilment Refresh

The review panel's existing review-data request is extracted into one reusable `reloadReviewData()` path. No additional subscription or timer is introduced.

The open request reloads when:

1. the dashboard's existing queue realtime callback reports an update for the selected intake;
2. the Parchment panel closes;
3. the browser regains focus while the selected prescription request still awaits fulfilment;
4. manual external fulfilment succeeds.

The reload updates only the selected review state. It must not remount the dashboard, lose unsaved note state, release the review lock, or require `router.refresh()` for the whole page.

A false-to-true transition of `script_sent` enables completion and emits one confirmation toast. Repeated reloads do not repeat the toast. If a targeted reload fails, actions remain in their last safe state and the UI offers a targeted status retry.

## Quick Patient Profile

`PatientProfilePanel` is recomposed as a fast longitudinal clinical snapshot. Opening it remains explicit user intent; there is no queue-hover or background PHI prefetch.

Order:

1. compact identity/contact summary;
2. allergies, active conditions, and current medicines with provenance and freshness;
3. clinically relevant differences between the current intake and saved profile;
4. the three most recent relevant requests, prescriptions, or clinician notes;
5. total request/prescription/note counts;
6. `Open full record`.

The active request is not repeated as a fake timeline event behind itself. Profile values remain read-only. Existing clinician notes hold corrections or qualifications.

Failure to load longitudinal data displays `Clinical profile unavailable` with a targeted retry. It must not erase or replace the already-loaded current request.

## Full Patient Record

The existing full record is reorganised with existing tab primitives:

### Clinical — default

- identity and contact summary;
- allergies, active conditions, and current medicines;
- provenance and last-updated state;
- current-versus-profile conflicts;
- recent prescriptions and clinically relevant notes;
- active clinical or fulfilment blockers only when present.

### History

- the existing complete timeline;
- existing request, prescription, note, email, and audit filters where clinically appropriate;
- no duplicated overview cards.

### Operations

- Parchment synchronisation and manual operational controls;
- identity administration;
- full acquisition attribution;
- duplicate management;
- email and audit detail.

Operational controls remain available but do not define the page's opening hierarchy.

## Data Boundaries and Provenance

Three evidence classes stay visibly separate:

1. **Current request:** episode-specific patient answers used for this decision.
2. **Longitudinal health profile:** patient-entered saved facts with freshness metadata.
3. **Historical record:** prior requests, prescriptions, and clinician notes.

The UI may compare these classes but never silently merge them. A conflict identifies both sources and dates where available. `None reported`, `Not asked`, and `Not recorded` are distinct typed states and distinct copy.

Attribution uses the existing shared classifier and `AttributionChip`. The request band shows classification plus landing path; full campaign/click detail remains under Operations.

## Error and Empty States

- Unknown attribution renders `Source: Unknown`.
- Missing structured clinical data remains missing even when a value can be inferred from free text.
- Empty profile sections render the correct explicit absence state rather than disappearing.
- A longitudinal-profile error is isolated from current-request review.
- A fulfilment-refresh error keeps completion disabled unless the last confirmed review state already permits it.
- Existing authorisation, review-lock, audit, and server-side prescribing checks remain authoritative.

## Accessibility and Interaction

- Preserve keyboard navigation and doctor shortcuts.
- Do not remount the review panel on background data changes.
- Keep focus stable when a targeted refresh completes.
- Disclosures use accessible names and expose their state.
- Disabled completion actions expose the exact unmet prerequisite.
- Patient and request details remain readable at standard laptop and mobile widths without horizontal scrolling.
- No decorative motion is added to the staff cockpit.

## Verification

### Domain tests

- every active request type produces the shared packet contract;
- repeat-prescription fixtures cover embedded strength, separate strength, missing strength, missing form, dose, indication, and humanised recency;
- inferred fields do not satisfy confirmed-field requirements;
- workflow metadata supplies service-aware labels without route-specific view logic;
- absence-state distinctions remain stable.

### Component tests

- one default-visible request packet;
- medicine/strength is not duplicated;
- missing issues render only beside affected facts;
- draft note starts collapsed;
- sticky safety band contains the locked patient and attribution fields;
- completion remains visible and disabled before fulfilment;
- targeted refresh enables completion and emits one toast;
- profile drawer does not repeat the active request;
- full record opens on Clinical and retains History/Operations capabilities.

### Integration and browser proof

- exercise repeat prescription, medical certificate, ED, hair loss, and women's health reviews;
- verify normal, missing, inferred, empty-profile, profile-conflict, and prior-history states;
- verify Parchment close, existing realtime update, focus return, and manual fulfilment all use targeted refresh;
- verify no PHI-heavy review/profile request occurs before explicit open intent;
- verify desktop split-pane, slide-over, and mobile layouts;
- verify light/dark mode and keyboard/focus behaviour;
- run focused unit/contracts, lint, typecheck, build, and relevant Playwright coverage.

## Deletion and Documentation Hygiene

Implementation must finish with a caller/export audit and remove superseded code rather than leave dormant alternatives. At minimum, review:

- `PrescribingPacketCard` and its exports/tests;
- duplicate medication parsing in `ClinicalCaseSummary`;
- medication-detail output in generic intake flags;
- stale `router.refresh()` paths used only to update the selected request;
- comments and contract tests that describe the current duplicated hierarchy;
- the June 2026 simplification plan, which must be rewritten as the implementation plan for this design rather than retained as conflicting guidance.

After verified implementation, update the approved memory with the canonical packet, targeted-refresh, profile-provenance, and no-bloat decisions. Do not store patient data or screenshots in memory.

## Out of Scope

- editing or overwriting the longitudinal health profile;
- a clinician-verified overlay data model;
- database/schema changes;
- new intake questions or service launches;
- changes to clinical safety, prescribing, refund, or eligibility policy;
- auto-completing or auto-advancing a fulfilled request;
- exposing detailed campaign/click analytics in the clinical packet;
- a new dashboard, profile system, component library, or realtime framework.

## Acceptance Criteria

- The default request view contains one canonical request packet.
- No medicine label, strength, dose, indication, or recency value is duplicated by competing default-visible renderers.
- Patient identity, contact/readiness, visit context, and source are visible without scrolling.
- Missing and inferred values remain clinically honest and attached to their affected fields.
- The note and full intake are available but collapsed by default.
- Every service uses the common packet and action contract with explicit service-aware labels.
- Prescription completion is visibly disabled until fulfilment and enables through targeted refresh without a page reload.
- The quick profile adds longitudinal clinical context and does not repeat the active request.
- The full record opens on Clinical, with exhaustive History and operational tools preserved in their own tabs.
- No new React component family, API route, database schema, realtime subscription, or polling loop is introduced.
- Superseded code, exports, tests, comments, and stale plan content are removed or rewritten.
