# Doctor Review and Patient Record Consolidation Implementation Plan

> **Status (2026-07-14): Implemented and verified.** This plan implements `docs/plans/2026-07-14-doctor-review-patient-record-consolidation-design.md` and replaces the superseded June 2026 request-review plan. Repository, seeded Chromium, and bounded manual browser proof are recorded below.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. Use `superpowers:test-driven-development` for each behavioural slice and `superpowers:verification-before-completion` before reporting completion. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the duplicated doctor-review hierarchy with one clinically honest request packet, bring patient safety context above the fold, make fulfilment refresh only the open request, and turn the quick and full patient profiles into useful longitudinal clinical surfaces without adding a component family or data subsystem.

**Architecture:** `IntakeReviewPanel` remains the single review-data owner. A new pure `ReviewPacket` adapter layer normalises each active service into a shared fact and workflow contract. Existing review, profile, timeline, tabs, disclosure, attribution, and action components are recomposed around that contract. Existing authorised endpoints and the existing queue realtime signal are extended or reused; there is no new API route, database change, subscription, timer, or page-level refresh.

**Tech stack:** Next.js 15.5 App Router on webpack, React 18.3, TypeScript 5.9 strict, Tailwind v4, shadcn/Radix, lucide-react, Sonner, Supabase, Vitest, Playwright, and browser verification on port 3060.

---

## Locked constraints

- Add no new React component family. Recompose existing components and delete superseded ones.
- Add no database migration, API route, realtime subscription, polling loop, state library, or background job.
- Keep current-request, longitudinal-profile, and historical-record provenance separate.
- Never treat a value inferred from free text as a confirmed required clinical field.
- Preserve role checks, review locks, PHI audit boundaries, no-prefetch behaviour, and server-side prescribing guards.
- Keep both prescription actions visible: `Prescribe` and disabled `Complete request` before fulfilment; recorded prescribing state and enabled `Complete request` after fulfilment.
- Fulfilment never auto-completes a request.
- Apply one packet and workflow contract to every active request type; no medicine-name or route-string branching in JSX.
- Keep unsaved note state and focus stable during targeted refresh.
- Use `corepack pnpm`; do not alter stack pins or the lockfile.
- Finish each task with focused tests and a commit. Do not retain compatibility wrappers once all callers move.

## Final ownership map

| Concern | Canonical owner after this plan |
|---|---|
| Current request facts, field states, issues, workflow labels, fulfilment state | `lib/clinical/review-packet.ts` |
| Default request rendering | `components/doctor/review/request-info-card.tsx` |
| Patient identity/readiness/source band | recomposed `components/doctor/patient-decision-strip.tsx` |
| Selected intake data and targeted reload | `components/doctor/intake-review-panel.tsx` + review context |
| Genuine cross-cutting safety flags | narrowed `components/doctor/intake-flags-panel.tsx` |
| Draft note editing | existing `components/doctor/clinical-case-review.tsx`, collapsed by default |
| Quick longitudinal profile | existing `PatientProfilePanel` + existing patient-summary endpoint |
| Full patient record | existing patient page/client + existing Tabs primitive |

## Final deletion set

- `components/doctor/prescribing-packet-card.tsx`
- `lib/clinical/prescribing-packet.ts`
- `lib/__tests__/prescribing-packet.test.ts`
- stale imports, exports, source-contract assertions, and comments describing the competing packet/attention hierarchy
- selected-intake `router.refresh()` calls whose only job was to observe fulfilment

---

## Task 1: Build the canonical review packet with clinically honest medication normalisation

**Files:**

- Create: `lib/clinical/review-packet.ts`
- Create: `lib/__tests__/review-packet.test.ts`
- Modify: `lib/validation/repeat-script-medications.ts`
- Modify: `lib/__tests__/repeat-script-medications.test.ts` if present; otherwise cover the public behaviour in `review-packet.test.ts`

**Contract:**

```ts
export type ReviewFactState =
  | "confirmed"
  | "inferred"
  | "missing"
  | "not_asked"
  | "not_applicable"

export interface ReviewFact {
  key: string
  label: string
  value: string
  state: ReviewFactState
  provenance: "current_request"
  issue?: string
  optional?: boolean
}

export interface ReviewWorkflow {
  kind: "medical_certificate" | "repeat_prescription" | "prescribing_consult" | "consult"
  prescribeLabel: string | null
  completionLabel: string
  requiresFulfilment: boolean
}

export interface ReviewPacket {
  title: string
  workflow: ReviewWorkflow
  facts: ReviewFact[]
  issueCount: number
  fulfilment: { status: "pending" | "recorded"; recordedAt: string | null }
}
```

- [x] **Step 1: Write failing normalisation tests**

Add fixtures proving all of the following before implementation:

```ts
it("does not duplicate a strength embedded in a medication name", () => {
  const packet = buildReviewPacket(repeatRxFixture({
    medication: { name: "Effexor 75mg", strength: "75mg", form: "tablet" },
  }))

  expect(packet.facts.find((fact) => fact.key === "medicine")?.value).toBe("Effexor")
  expect(packet.facts.find((fact) => fact.key === "strength")?.value).toBe("75mg")
})

it("marks embedded free-text strength as inferred and keeps the required issue", () => {
  const packet = buildReviewPacket(repeatRxFixture({
    medication: { name: "Effexor 75mg", strength: "", form: "tablet" },
  }))

  expect(packet.facts.find((fact) => fact.key === "strength")).toMatchObject({
    value: "75mg",
    state: "inferred",
    issue: "Confirm strength",
  })
})

it("humanises stored recency enums", () => {
  const packet = buildReviewPacket(repeatRxFixture({ lastPrescribed: "3_to_6_months" }))
  expect(packet.facts.find((fact) => fact.key === "last_prescribed")?.value).toBe(
    "3–6 months ago",
  )
})

it.each(["medical_certificate", "repeat_prescription", "ed", "hair_loss", "womens_health"])(
  "builds the shared packet contract for %s",
  (pathway) => {
    expect(buildReviewPacket(activeServiceFixture(pathway))).toMatchObject({
      workflow: expect.objectContaining({ completionLabel: expect.any(String) }),
      facts: expect.any(Array),
    })
  },
)
```

Also cover missing form, missing dose, missing indication, a separately confirmed strength, multiple medicines, script recorded, and `not_asked` versus `missing`.

- [x] **Step 2: Run the focused tests and verify RED**

Run:

```bash
corepack pnpm test -- lib/__tests__/review-packet.test.ts
```

Expected: FAIL because `review-packet.ts` does not exist or the new assertions are unmet.

- [x] **Step 3: Fix medication display-part normalisation**

Update `getRepeatScriptMedicationDisplayParts()` so it removes an embedded strength from the medicine label when that same value is represented separately. Return enough information for the packet builder to distinguish a structured value from a display-only inference. Do not mutate the persisted intake answer.

Required behaviour:

```ts
getRepeatScriptMedicationDisplayParts({ name: "Effexor 75mg", strength: "75mg" })
// { name: "Effexor", strength: "75mg", strengthSource: "structured", ... }

getRepeatScriptMedicationDisplayParts({ name: "Effexor 75mg", strength: "" })
// { name: "Effexor", strength: "75mg", strengthSource: "inferred", ... }
```

- [x] **Step 4: Implement typed service adapters**

Create `buildReviewPacket(input)` with a private adapter registry keyed by the normalised service/workflow kind. Keep clinical variation explicit in TypeScript and keep JSX branch-free. Reuse existing service predicates and intake-answer extractors rather than matching URL paths.

Rules:

- Repeat prescription: medicine, strength, form, patient-reported dose/frequency, indication, and humanised recency appear once.
- Medical certificate: certificate type, requested dates/duration, reason, work capacity, and relevant safety context.
- ED, hair loss, and women's health: shared prescribing workflow metadata with subtype-specific clinical facts from the current intake.
- Unknown optional values may be omitted; required absent values render with `missing` and an exact issue.
- `issueCount` derives from affected facts; it is not a second independently maintained list.
- `script_sent === true` is the only client display proof that fulfilment has been recorded; server actions remain authoritative.

- [x] **Step 5: Run tests and verify GREEN**

```bash
corepack pnpm test -- lib/__tests__/review-packet.test.ts lib/__tests__/derive-intake-flags.test.ts
```

- [x] **Step 6: Self-review and commit**

Audit for medicine labels, route strings, unsafe casts, and duplicated enum formatting:

```bash
rg -n "Effexor|3_to_6_months|6_to_12_months" lib/clinical/review-packet.ts lib/validation/repeat-script-medications.ts
git diff --check
```

Commit:

```bash
git add lib/clinical/review-packet.ts lib/validation/repeat-script-medications.ts lib/__tests__
git commit -m "refactor: add canonical doctor review packet"
```

---

## Task 2: Recompose the cockpit around one request packet and collapse the draft note

**Files:**

- Modify: `components/doctor/review/intake-review-cockpit.tsx`
- Modify: `components/doctor/review/request-info-card.tsx`
- Modify: `components/doctor/clinical-case-review.tsx`
- Modify: `components/doctor/review/intake-review-context.tsx`
- Modify: `components/doctor/intake-flags-panel.tsx`
- Modify: `lib/clinical/case-summary.ts`
- Modify: `lib/clinical/intake-flags.ts`
- Modify: `components/doctor/review/intake-action-buttons.tsx`
- Modify: any remaining live caller of `getPrescribingPacketBlocker()`
- Delete: `components/doctor/prescribing-packet-card.tsx`
- Delete: `lib/clinical/prescribing-packet.ts`
- Delete: `lib/__tests__/prescribing-packet.test.ts`
- Modify: `lib/__tests__/clinical-case-review-render.test.tsx`
- Modify: `lib/__tests__/intake-review-cockpit-no-tabs.test.tsx`
- Modify: `lib/__tests__/doctor-review-ui-contract.test.ts`
- Modify: `lib/__tests__/intake-flags-panel-render.test.tsx`

- [x] **Step 1: Write failing render and source-contract tests**

Lock these behaviours:

- one `RequestInfoCard` owns default-visible request facts;
- `PrescribingPacketCard` is absent;
- strength/dose/indication/recency do not appear through `ClinicalCaseReview` when the packet is visible;
- missing strength/form appears beside the matching fact, not in a large attention block;
- genuine pathway, identity-duplicate, and red-flag output remains visible;
- draft note trigger is `Draft note · Review required` and the note body is initially closed;
- the shortcut that opens the note also expands it before focus.

Representative assertion:

```tsx
expect(screen.getAllByText("Effexor")).toHaveLength(1)
expect(screen.getByRole("button", { name: /Draft note · Review required/i })).toHaveAttribute(
  "aria-expanded",
  "false",
)
expect(screen.queryByText(/47yo requesting a repeat prescription/i)).not.toBeInTheDocument()
```

- [x] **Step 2: Run focused tests and verify RED**

```bash
corepack pnpm test -- \
  lib/__tests__/clinical-case-review-render.test.tsx \
  lib/__tests__/intake-review-cockpit-no-tabs.test.tsx \
  lib/__tests__/doctor-review-ui-contract.test.ts \
  lib/__tests__/intake-flags-panel-render.test.tsx
```

- [x] **Step 3: Make `RequestInfoCard` the packet renderer**

Build the packet once in `IntakeReviewCockpit` and pass it to the existing card. Render:

1. request title and optional issue count;
2. ordered fact rows with value and field state;
3. the issue directly below an affected row;
4. compact optional context once;
5. the existing draft-note disclosure.

Do not add a replacement packet component. Use existing card, badge, separator, and disclosure primitives.

- [x] **Step 4: Stop secondary parsers from rendering packet facts**

Allow `ClinicalCaseReview` to accept the already-built `ClinicalCaseSummary` and an option that suppresses default request facts while retaining note editing, safety narrative, and non-duplicative clinician context. Remove repeat-medication parsing from `case-summary.ts` where the canonical packet now owns it.

Keep a controlled `draftNoteOpen` state in `IntakeReviewCockpit`. The existing note shortcut must set it true, wait one animation frame, then focus the note field. Targeted refresh later must not reset this state.

- [x] **Step 5: Narrow generic intake flags**

Move these field-quality issues into packet rows:

- `medication_needs_identification`
- `medication_strength_missing`
- `medication_form_missing`
- `dose_not_stated`

Retain genuine non-duplicative flags, including wrong-pathway medication and duplicate-patient identity warnings. Do not change how flags are derived or persisted unless a test proves a semantic defect; this task changes ownership of display, not clinical policy.

- [x] **Step 6: Migrate blocker callers and delete the old packet**

Replace `getPrescribingPacketBlocker()` callers with the packet workflow/issue contract or an existing server-authoritative blocker. Then delete the old packet module, card, test, exports, and imports in the same commit.

Prove no callers remain:

```bash
rg -n "PrescribingPacket|prescribing-packet|PrescribingPacketCard|getPrescribingPacketBlocker" \
  app components lib --glob '!lib/__tests__/review-packet.test.ts'
```

Expected: no live matches.

- [x] **Step 7: Run tests and commit**

```bash
corepack pnpm test -- \
  lib/__tests__/review-packet.test.ts \
  lib/__tests__/clinical-case-review-render.test.tsx \
  lib/__tests__/intake-review-cockpit-no-tabs.test.tsx \
  lib/__tests__/doctor-review-ui-contract.test.ts \
  lib/__tests__/intake-flags-panel-render.test.tsx \
  lib/__tests__/intake-flags.test.ts
git diff --check
git add app components lib
git commit -m "refactor: consolidate doctor request review"
```

---

## Task 3: Turn the existing patient strip into the above-fold safety band

**Files:**

- Modify: `components/doctor/patient-decision-strip.tsx`
- Modify: `components/doctor/intake-review-panel.tsx`
- Modify: `components/doctor/review/intake-review-cockpit.tsx`
- Modify: `app/doctor/intakes/[id]/intake-detail-header.tsx`
- Modify: `components/doctor/attribution-chip.tsx` only if its existing compact variant cannot render the locked summary
- Modify: `lib/__tests__/doctor-review-ui-contract.test.ts`
- Modify: relevant patient-decision-strip render/source test or create `lib/__tests__/patient-safety-band-render.test.tsx`

- [x] **Step 1: Write failing safety-band tests**

Assert one above-fold band contains:

- full name;
- age and DOB;
- sex;
- suburb and state;
- phone;
- Medicare/IHI readiness rather than a full identifier;
- first visit or prior-request count;
- `Source: <classification> · <landing path>`;
- `View profile` and `Open full record` actions.

Also assert it renders before the review scroller/packet and does not render again near the action rail.

- [x] **Step 2: Run tests and verify RED**

```bash
corepack pnpm test -- \
  lib/__tests__/doctor-review-ui-contract.test.ts \
  lib/__tests__/patient-safety-band-render.test.tsx
```

- [x] **Step 3: Recompose `PatientDecisionStrip`**

Keep the existing component and its authorisation boundary, but change its presentation from a low-page identity snapshot into a compact safety band. Reuse `AttributionChip` and the endpoint fields already present in review data. Do not introduce a second patient-header component.

Rules:

- Show phone because it is operationally necessary for clinical contact.
- Show readiness/status for Medicare/IHI, not the full identifier in the band.
- Render all-clear readiness quietly; emphasise only blockers.
- Unknown attribution is `Source: Unknown`.
- Show only the landing pathname in the band; keep campaign, keyword, and click identifiers out.
- Preserve explicit profile-open intent; no drawer fetch on hover or queue selection.

- [x] **Step 4: Move it above the internal review scroller**

Render the band from `IntakeReviewPanel` beneath lock state and above request content, using the existing fixed-height split-pane composition. Remove the old render from `IntakeReviewCockpit` and align the full-intake header to the same component/data contract.

- [x] **Step 5: Run tests and commit**

```bash
corepack pnpm test -- \
  lib/__tests__/doctor-review-ui-contract.test.ts \
  lib/__tests__/patient-safety-band-render.test.tsx \
  lib/__tests__/patient-details-canskip-contract.test.ts
git diff --check
git add app components lib/__tests__
git commit -m "refactor: surface patient safety context"
```

---

## Task 4: Unify action labels and replace whole-page fulfilment refresh

**Files:**

- Modify: `components/doctor/intake-review-panel.tsx`
- Modify: `components/doctor/review/intake-review-context.tsx`
- Modify: `components/doctor/review/intake-action-buttons.tsx`
- Modify: `components/doctor/review-actions.tsx`
- Modify: `components/doctor/parchment-prescribe-panel.tsx`
- Modify: `app/doctor/queue/queue-client.tsx`
- Modify: `app/doctor/intakes/[id]/intake-detail-header.tsx`
- Modify: `app/doctor/intakes/[id]/use-intake-actions.tsx`
- Modify: `lib/__tests__/doctor-review-ui-contract.test.ts`
- Modify: `e2e/doctor.prescription-ui.spec.ts`
- Modify: `e2e/doctor.review-panel.spec.ts`

- [x] **Step 1: Write failing lifecycle tests**

Cover at minimum:

```tsx
expect(screen.getByRole("button", { name: "Prescribe" })).toBeEnabled()
expect(screen.getByRole("button", { name: "Complete request" })).toBeDisabled()

// after targeted review-data response transitions script_sent false -> true
expect(screen.getByText("Prescription recorded"))
expect(screen.getByRole("button", { name: "Complete request" })).toBeEnabled()
expect(toast.success).toHaveBeenCalledWith("Prescription recorded — complete when ready")
```

Also cover:

- medical certificate label `Approve certificate`;
- non-prescribing consult completion metadata;
- no second toast on a repeated `script_sent: true` reload;
- manual external fulfilment invokes the same targeted reload;
- no selected-intake `router.refresh()` on Parchment close;
- a reload failure preserves the last confirmed safe disabled/enabled state.

- [x] **Step 2: Run focused tests and verify RED**

```bash
corepack pnpm test -- \
  lib/__tests__/review-packet.test.ts \
  lib/__tests__/doctor-review-ui-contract.test.ts
```

- [x] **Step 3: Extract one stable `reloadReviewData()` path**

In `IntakeReviewPanel`, replace the effect-local fetch with a `useCallback` that:

- fetches only `/api/doctor/intakes/${intakeId}/review-data`;
- returns the parsed `ReviewData` or `null`;
- can run as foreground or background without clearing current content;
- applies fresh data atomically;
- exposes an error/retry only for the selected request;
- compares the previous `script_sent` value before updating state;
- sends the confirmation toast once on false-to-true transition;
- never resets doctor-note state after its first initialisation for that intake.

Add the function to `IntakeReviewContext` so existing action components can call the same path.

- [x] **Step 4: Wire the four existing refresh triggers**

1. **Existing queue realtime:** pass the selected intake's `updated_at` (or an incrementing selected-intake revision) from `QueueClient` into the inline panel. When that value changes after mount, call the background reload. Do not subscribe again.
2. **Parchment close:** pass `reloadReviewData` through the existing `onIntakeRefresh` callback instead of `router.refresh()`.
3. **Window focus:** if the visible selected request is a prescribing workflow still awaiting fulfilment, background reload on focus. This is an event-driven check, not polling.
4. **Manual fulfilment:** after durable evidence succeeds, call `reloadReviewData` and let returned server state drive action enablement.

Do not key/remount the panel to observe revisions. Preserve focus, draft disclosure, and unsaved note text.

- [x] **Step 5: Render workflow metadata consistently**

Use `ReviewPacket.workflow` in both inline and full-intake action surfaces. For prescriptions:

- before fulfilment: `Prescribe` enabled when existing blockers pass; `Complete request` visible but disabled with exact unmet prerequisite;
- after fulfilment: prevent duplicate prescribe, render a quiet `Prescription recorded` state, and enable `Complete request` subject to the existing lock/clinical guards;
- `Sent outside Parchment` remains secondary and retains durable evidence requirements.

No action component may branch on route strings or medicine names.

- [x] **Step 6: Run focused and E2E tests**

```bash
corepack pnpm test -- \
  lib/__tests__/review-packet.test.ts \
  lib/__tests__/doctor-review-ui-contract.test.ts \
  lib/__tests__/dashboard-simplicity-performance-contract.test.ts
PLAYWRIGHT=1 corepack pnpm exec playwright test \
  e2e/doctor.prescription-ui.spec.ts \
  e2e/doctor.review-panel.spec.ts
```

- [x] **Step 7: Prove stale refresh paths are gone and commit**

```bash
rg -n "router\.refresh\(\)" \
  components/doctor/review-actions.tsx \
  components/doctor/review/intake-action-buttons.tsx \
  components/doctor/intake-review-panel.tsx
git diff --check
git add app components e2e lib
git commit -m "fix: refresh prescription fulfilment in place"
```

Expected `rg`: no selected-review fulfilment refresh call remains. Unrelated navigation refreshes may remain only with an explicit reason.

---

## Task 5: Recompose the quick profile into a longitudinal clinical snapshot

**Files:**

- Modify: `app/api/doctor/patients/[patientId]/summary/route.ts`
- Modify: `components/doctor/patient-profile-panel.tsx`
- Modify: `components/doctor/patient-timeline.tsx` only if its existing compact/max-items API is insufficient
- Modify: all `PatientProfilePanel` call sites to pass `currentIntakeId`
- Create or modify: `lib/__tests__/patient-profile-panel-render.test.tsx`
- Modify: `lib/__tests__/doctor-review-ui-contract.test.ts`
- Modify: relevant authorised endpoint contract tests

- [x] **Step 1: Write failing endpoint and component tests**

Lock the response and render contract:

```ts
expect(response).toMatchObject({
  healthProfile: expect.anything(),
  totals: {
    requests: expect.any(Number),
    prescriptions: expect.any(Number),
    notes: expect.any(Number),
  },
})
```

Component assertions:

- identity/contact first;
- allergies, active conditions, and current medicines second;
- no active intake in the three recent events;
- exact `None reported`, `Not asked`, and `Not recorded` copy;
- provenance/freshness shown for saved profile data;
- total request/prescription/note counts;
- one `Open full record` CTA;
- longitudinal failure says `Clinical profile unavailable` and leaves current review untouched;
- endpoint is fetched only after the drawer is opened.

- [x] **Step 2: Run tests and verify RED**

```bash
corepack pnpm test -- \
  lib/__tests__/patient-profile-panel-render.test.tsx \
  lib/__tests__/doctor-review-ui-contract.test.ts
```

- [x] **Step 3: Extend the existing authorised summary endpoint**

After the current patient-access check, fetch in parallel using existing data helpers/service client:

- saved health profile;
- recent requests;
- recent prescriptions;
- recent clinician notes;
- exact counts for requests, prescriptions, and notes.

Return only the fields required by the drawer. Do not expose campaign/click detail here. Do not create a new endpoint. Preserve current no-store/cache and role/audit behaviour.

- [x] **Step 4: Recompose `PatientProfilePanel`**

Use the existing panel and timeline. Render in this order:

1. compact identity/contact;
2. saved allergies, conditions, and medicines with `Patient profile · updated <date>` provenance;
3. current-request differences only when meaningful and source-labelled;
4. three most recent relevant events across prior requests, prescriptions, and notes;
5. total counts;
6. `Open full record`.

Filter `currentIntakeId` before handing events to `PatientTimeline`. Do not issue a second health-profile request from the client.

Absence rules:

- no health-profile row: `Not recorded`;
- existing profile with an intentionally empty field: `None reported`;
- current service adapter never asked the field: `Not asked`.

- [x] **Step 5: Run tests and commit**

```bash
corepack pnpm test -- \
  lib/__tests__/patient-profile-panel-render.test.tsx \
  lib/__tests__/doctor-review-ui-contract.test.ts \
  lib/__tests__/patient-profile-merge.test.ts \
  lib/__tests__/patient-profile-merge-audit.test.ts
git diff --check
git add app/api/doctor/patients components/doctor lib/__tests__
git commit -m "refactor: add clinical context to quick profile"
```

---

## Task 6: Reorganise the full patient record into Clinical, History, and Operations

**Files:**

- Modify: `app/doctor/patients/[id]/page.tsx`
- Modify: `app/doctor/patients/[id]/patient-detail-client.tsx`
- Modify: `components/doctor/patient-timeline.tsx` only if necessary for existing data filters
- Create or modify: `lib/__tests__/doctor-patient-record-tabs.test.tsx`
- Modify: `lib/__tests__/doctor-review-ui-contract.test.ts`

- [x] **Step 1: Write failing tab and provenance tests**

Assert:

- tabs are named `Clinical`, `History`, and `Operations`;
- `Clinical` is selected initially;
- Clinical owns identity/contact, saved allergies/conditions/current medicines, freshness, recent prescriptions, and relevant notes;
- History owns the complete request/prescription/note timeline;
- Operations owns Parchment controls, identity administration, full attribution, duplicate management, email, and audit detail;
- `Add note` remains available;
- existing operational controls are moved, not removed;
- an empty saved profile uses explicit absence copy.

- [x] **Step 2: Run tests and verify RED**

```bash
corepack pnpm test -- \
  lib/__tests__/doctor-patient-record-tabs.test.tsx \
  lib/__tests__/doctor-review-ui-contract.test.ts
```

- [x] **Step 3: Add health-profile data to the existing page loader**

Fetch `getHealthProfile(patientId)` alongside the existing authorised patient history queries and pass it to `PatientDetailClient`. Reuse the current request, prescription, note, email, attribution, duplicate, and Parchment data; do not add another route or client fetch.

- [x] **Step 4: Recompose the existing client with Tabs**

Use the existing shadcn Tabs primitive directly in `patient-detail-client.tsx`; do not create tab-wrapper components.

- `Clinical`: saved clinical overview, freshness/provenance, meaningful current-versus-profile conflicts, recent prescriptions and clinically relevant notes.
- `History`: complete clinical timeline without email/audit noise.
- `Operations`: existing status tiles, Parchment/manual controls, identity administration, full attribution, duplicate tools, email logs, and audit activity.

Keep destructive/operational dialogs mounted at the existing safe level so moving their trigger does not change behaviour.

- [x] **Step 5: Run tests and commit**

```bash
corepack pnpm test -- \
  lib/__tests__/doctor-patient-record-tabs.test.tsx \
  lib/__tests__/doctor-review-ui-contract.test.ts \
  lib/__tests__/patient-profile-merge.test.ts
git diff --check
git add app/doctor/patients components/doctor lib/__tests__
git commit -m "refactor: prioritise clinical patient record"
```

---

## Task 7: Remove stale contracts and reconcile canonical documentation

**Files:**

- Modify: `docs/plans/2026-07-14-doctor-review-patient-record-consolidation-design.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/TESTING.md` only if durable verification ownership changes
- Modify: `components/operator/README.md` only if it still describes the old review hierarchy
- Modify: `docs/bookkeeping/file-map.md`
- Modify: stale contract tests found by the caller audit
- Add after successful verification only: `/Users/rey/.codex/memories/extensions/ad_hoc/notes/<timestamp>-doctor-review-consolidation.md`

- [x] **Step 1: Audit stale source and prose**

```bash
rg -n \
  "Needs doctor attention|PrescribingPacket|prescribing packet|Patient snapshot|Draft note.*Check before|router\.refresh\(\)" \
  app components lib docs --glob '!docs/archive/**'
```

Classify each match as current intentional copy, stale implementation, or stale test/doc. Remove or update stale matches; do not weaken useful contract tests merely to make them pass.

- [x] **Step 2: Update canonical docs**

- Mark the design `Implemented` only after the code and focused tests pass.
- Document `ReviewPacket` as the request-fact/workflow owner in `docs/ARCHITECTURE.md`.
- Document targeted selected-intake refresh and explicit-open profile loading at the correct architectural level.
- Update the file map description for this implementation plan.
- Do not add a roadmap item; `docs/ROADMAP.md` remains the sole priority queue and this work was already explicitly requested.

- [x] **Step 3: Run documentation and dead-code checks**

```bash
corepack pnpm doc:audit
corepack pnpm deadcode:check
git diff --check
```

- [x] **Step 4: Commit repository hygiene**

```bash
git add docs components/operator/README.md app components lib e2e
git commit -m "docs: align doctor review architecture"
```

Do not create the memory note yet; memory records the verified outcome, not intent.

---

## Task 8: Full verification, browser proof, and memory update

**Files:**

- Modify source only for defects found during verification.
- Add one ad-hoc memory note after all required proof passes; include architecture decisions only and no patient data or screenshots.

- [x] **Step 1: Run focused regression suite**

```bash
corepack pnpm test -- \
  lib/__tests__/review-packet.test.ts \
  lib/__tests__/clinical-case-review-render.test.tsx \
  lib/__tests__/intake-review-cockpit-no-tabs.test.tsx \
  lib/__tests__/doctor-review-ui-contract.test.ts \
  lib/__tests__/intake-flags-panel-render.test.tsx \
  lib/__tests__/patient-profile-panel-render.test.tsx \
  lib/__tests__/doctor-patient-record-tabs.test.tsx
```

- [x] **Step 2: Run repository gates**

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm doc:audit
corepack pnpm deadcode:check
```

All commands must pass on the pinned Node 24/pnpm 10 runtime. Do not change dependencies to resolve implementation errors.

- [x] **Step 3: Run relevant Playwright proof**

```bash
PLAYWRIGHT=1 corepack pnpm exec playwright test \
  e2e/doctor.prescription-ui.spec.ts \
  e2e/doctor.review-panel.spec.ts
```

Verify the no-PHI-prefetch assertion remains intact.

- [x] **Step 4: Browser-verify on port 3060 with an explicit proof boundary**

Use the repo-approved browser workflow and exercise:

- repeat prescription with confirmed fields;
- embedded-but-unconfirmed strength;
- missing strength/form;
- medical certificate;
- ED, hair loss, and women's health prescribing requests;
- empty and populated saved profiles;
- prior history and profile conflict;
- Parchment close, existing realtime update, focus return, and manual fulfilment;
- inline desktop split pane, slide-over, mobile layout, dark mode, keyboard disclosure/focus.

Confirm visually and through network logs:

- one default-visible request packet;
- patient safety band visible without scrolling;
- completion disabled before and enabled after fulfilment;
- no whole-page reload;
- no profile/history PHI request before explicit profile open;
- quick profile shows only three prior relevant events;
- full record opens on Clinical and retains all operational controls.

- [x] **Step 5: Fix, rerun affected proof, and commit**

Any defect found must get the smallest relevant regression test, then a fix, then the affected focused and repository gate rerun.

```bash
git diff --check
git add app components lib e2e docs
git commit -m "polish: verify doctor review consolidation"
```

Skip this commit if verification required no source changes.

- [x] **Step 6: Record the verified architecture decision in memory**

Create one small file under:

```text
/Users/rey/.codex/memories/extensions/ad_hoc/notes/<timestamp>-doctor-review-consolidation.md
```

Include only:

- canonical `ReviewPacket` ownership;
- no-bloat composition decision;
- targeted selected-intake refresh triggers;
- prescription completion lifecycle;
- current-request/profile/history provenance boundary;
- quick/full profile information architecture;
- verification commands and proof scope.

Do not include patient names, DOBs, identifiers, screenshots, intake IDs, request content, or copied clinical values.

- [x] **Step 7: Final caller, status, and commit audit**

```bash
rg -n "PrescribingPacket|prescribing-packet|PrescribingPacketCard|getPrescribingPacketBlocker" \
  app components lib
git status --short
git log --oneline --decorate -12
```

Expected:

- no superseded packet implementation remains;
- worktree clean;
- each implementation slice has its own commit;
- original dirty main worktree is untouched.

---

## Verification evidence

- Focused packet policy: `21` tests passed.
- Full Vitest suite: `496` files passed; `4,342` tests passed and `1` existing test skipped.
- Static and production gates: typecheck, zero-warning lint, and the Next.js production build passed; the build generated `489/489` static pages.
- Documentation and hygiene: `doc:audit` passed `9` files / `90` tests with the expected `120` Markdown files; the dead-code ratchet remained `2,881`.
- Seeded Chromium: `7/7` doctor-review tests passed in one run. These cover in-place fulfilment refresh, legacy recorded-script reconciliation, the women's-health UTI completion gate, the single inline request packet, collapsed disclosures, quick-profile provenance, full-record tabs, and acquisition attribution.
- Manual port `3060` proof: the seeded desktop medical-certificate request showed patient safety context before the request scroller, one request packet, collapsed draft/full-intake disclosures, explicit-open quick profile, and the Clinical / History / Operations record split. The profile summary request occurred only after explicit profile intent, and the browser console contained no errors.
- Exact visual boundary: repeat-prescription fulfilment and women's-health UTI were exercised in Chromium E2E rather than the manual `3060` session. ED, hair loss, narrow/mobile, slide-over, and dark-mode rendering rely on the same typed packet/components and passed unit/source contracts, but were not separately captured in this manual proof pass. No production environment was exercised.

---

## Acceptance checklist

- [x] One canonical request packet is default-visible across every active request type.
- [x] Medicine, strength, form, dose, indication, and recency are not repeated by competing renderers.
- [x] Structured missing values remain missing even when free text permits an inference.
- [x] Patient identity, contact/readiness, visit context, source, and navigation are above the fold.
- [x] Draft note and full intake are available but collapsed by default.
- [x] Completion remains visible and disabled until fulfilment is confirmed.
- [x] Fulfilment enables completion through a selected-intake reload without remounting or page refresh.
- [x] Quick profile provides saved clinical context, three prior relevant events, and counts without repeating the active request.
- [x] Full patient record opens on Clinical and preserves History and Operations capabilities.
- [x] No new React component family, API route, schema, realtime subscription, polling loop, or state library exists.
- [x] Superseded code, exports, tests, comments, refresh paths, and plan language are removed.
- [x] Focused tests, typecheck, lint, full tests, build, docs audit, dead-code check, Playwright, and browser proof pass or are reported with an exact evidence boundary.
