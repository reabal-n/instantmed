# Prescribing Packet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace duplicated medication/request rendering with one typed `PrescribingPacket` domain model used by review, queue, timeline, Parchment handoff, and notes context.

**Architecture:** A domain builder interprets raw intake answers, patient data, and prescription fulfilment into a normalized packet. UI components render compact or full variants and do not parse raw answers themselves.

**Tech Stack:** TypeScript 5.9, React 18.3, Next.js App Router, Vitest, existing doctor review components.

## Global Constraints

- Canonical term is `Prescribing packet`.
- Repeat prescriptions require medication, dose/strength, frequency/directions, and indication/reason.
- These required packet fields apply only to repeat prescriptions.
- Specialty services use service-specific clinical requirements.
- No request-more-info flow for missing repeat details in this rebuild.
- Legacy incomplete repeat requests block `Prescribe` and `Complete request` unless a clinical note exists; allow with warning when note exists.
- Draft note is collapsed by default.
- Do not repeat medication/dose strings across multiple cards.

---

## File Structure

- Create `lib/doctor/prescribing-packet.ts`: typed packet model and builder.
- Create `components/doctor/prescribing-packet-card.tsx`: full and compact renderers.
- Modify `lib/doctor/case-summary.ts`: consume packet builder.
- Modify `components/doctor/review/request-info-card.tsx`: render packet, not raw medication fields.
- Modify `components/doctor/review/prescription-recommendation-card.tsx`: remove duplicate medication summary or fold into packet renderer.
- Modify `components/doctor/review/intake-review-cockpit.tsx`: collapse draft note by default and position packet as primary content.
- Modify `components/doctor/patient-timeline.tsx`: use compact packet rendering for prescription events.
- Modify `components/doctor/parchment-prescribe-panel.tsx`: use packet for handoff context.
- Modify `lib/request/unified-checkout.ts`: block missing repeat required fields before checkout.
- Update tests in new `lib/__tests__/prescribing-packet.test.ts`, existing repeat-script and doctor-review UI contract tests.

## Task 1: Create Typed Prescribing Packet Model

**Files:**
- Create `lib/doctor/prescribing-packet.ts`
- Create `lib/__tests__/prescribing-packet.test.ts`

**Interfaces:**
- Produces:

```ts
export interface PrescribingPacket {
  serviceKind: "repeat_rx" | "ed" | "hair_loss" | "womens_health" | "consult" | "unknown"
  primaryLabel: string
  medicationLabel: string | null
  dose: string | null
  frequency: string | null
  indication: string | null
  clinicalBasis: string[]
  safetyBlockers: string[]
  optionalContext: string[]
  missingRequiredFields: Array<"medication" | "dose" | "frequency" | "indication">
  fulfilment: {
    status: "not_prescribed" | "prescribed_in_parchment" | "sent_outside_parchment" | "completed"
    prescribedMedicationLabel: string | null
  }
}

export function buildPrescribingPacket(input: BuildPrescribingPacketInput): PrescribingPacket
```

- [ ] **Step 1: Write failing tests**

Test repeat script:

```ts
const packet = buildPrescribingPacket({
  serviceType: "repeat_rx",
  subtype: null,
  answers: {
    medicationName: "Doxycycline 100 mg tablet",
    dose: "100 mg",
    frequency: "1 tablet once daily",
    indication: "Acne",
  },
  intake: { status: "paid", script_sent: false },
})

expect(packet.primaryLabel).toBe("Doxycycline 100 mg tablet · 100 mg · 1 tablet once daily · Acne")
expect(packet.missingRequiredFields).toEqual([])
```

Test legacy missing fields:

```ts
expect(packet.missingRequiredFields).toEqual(["dose", "frequency", "indication"])
```

- [ ] **Step 2: Run test and verify failure**

Run: `pnpm test -- lib/__tests__/prescribing-packet.test.ts`

Expected: FAIL because builder does not exist.

- [ ] **Step 3: Implement minimal builder**

Read common repeat-script answer keys already used in `case-summary.ts` and map them into packet fields. Include multiple legacy key aliases where existing tests show them.

- [ ] **Step 4: Add specialty service tests**

Assert ED/hair-loss/women’s health packets do not require repeat dose/frequency/indication fields and instead put subtype facts into `clinicalBasis`.

- [ ] **Step 5: Run tests**

Run: `pnpm test -- lib/__tests__/prescribing-packet.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/doctor/prescribing-packet.ts lib/__tests__/prescribing-packet.test.ts
git commit -m "feat: add prescribing packet domain model"
```

## Task 2: Block Repeat Checkout When Required Packet Fields Are Missing

**Files:**
- Modify `lib/request/unified-checkout.ts`
- Modify repeat medication intake step files that collect medication details
- Modify `lib/__tests__/unified-intake-regressions.test.ts`

**Interfaces:**
- Repeat checkout requires medication, dose, frequency, indication.

- [ ] **Step 1: Add failing checkout tests**

Add tests that missing dose, frequency, or indication each block repeat-script checkout.

- [ ] **Step 2: Update intake fields**

Add simple required fields:

- medication selected/search result
- dose/strength
- frequency/directions
- indication/reason

Do not add mandatory side-effects/concerns.

- [ ] **Step 3: Update checkout validation**

Use the same packet builder or a shared validation helper so UI and checkout agree.

- [ ] **Step 4: Run tests**

Run: `pnpm test -- lib/__tests__/unified-intake-regressions.test.ts lib/__tests__/prescribing-packet.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/request/unified-checkout.ts components/request lib/__tests__/unified-intake-regressions.test.ts lib/__tests__/prescribing-packet.test.ts
git commit -m "fix: require repeat prescription request details"
```

## Task 3: Add Legacy Missing Details Blocker

**Files:**
- Modify `lib/doctor/prescribing-packet.ts`
- Modify review action blocker logic in `components/doctor/review-actions.tsx`, `app/doctor/intakes/[id]/use-intake-actions.tsx`, and related action button components
- Update tests in `lib/__tests__/doctor-review-ui-contract.test.ts`

**Interfaces:**
- Missing repeat fields + no clinical note blocks `Prescribe` and `Complete request`.
- Missing repeat fields + clinical note allows with warning.

- [ ] **Step 1: Add blocker tests**

Assert button disabled/copy appears for missing packet details with empty clinical note.

- [ ] **Step 2: Implement blocker helper**

Add helper:

```ts
export function getPrescribingPacketBlocker(packet: PrescribingPacket, doctorNotes: string | null): {
  blocked: boolean
  warning: boolean
  message: string | null
}
```

- [ ] **Step 3: Wire to action buttons**

Disable `Prescribe` and `Complete request` when `blocked` is true. Show warning when `warning` is true.

- [ ] **Step 4: Run tests**

Run: `pnpm test -- lib/__tests__/prescribing-packet.test.ts lib/__tests__/doctor-review-ui-contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/doctor/prescribing-packet.ts components/doctor app/doctor/intakes lib/__tests__
git commit -m "feat: block legacy scripts missing request details"
```

## Task 4: Replace Duplicate Medication Rendering

**Files:**
- Create `components/doctor/prescribing-packet-card.tsx`
- Modify `components/doctor/review/request-info-card.tsx`
- Modify `components/doctor/review/prescription-recommendation-card.tsx`
- Modify `components/doctor/review/intake-review-cockpit.tsx`
- Modify `components/doctor/patient-timeline.tsx`
- Modify `components/doctor/parchment-prescribe-panel.tsx`
- Modify `lib/doctor/case-summary.ts`

**Interfaces:**
- UI consumes `PrescribingPacket`, not raw answer parsing.

- [ ] **Step 1: Add UI contract tests**

Add source/HTML tests that medication label is rendered from `PrescribingPacketCard` and raw duplicate labels are removed from older cards.

- [ ] **Step 2: Build renderer**

`PrescribingPacketCard` supports:

- `variant="compact"`
- `variant="full"`
- `showFulfilment`

- [ ] **Step 3: Replace review card content**

Main review path shows:

`Medication · dose · frequency · indication`

Optional context appears below once.

- [ ] **Step 4: Collapse draft note by default**

Draft note is behind a collapsible `Draft note` control with readiness state.

- [ ] **Step 5: Run tests**

Run: `pnpm test -- lib/__tests__/doctor-review-ui-contract.test.ts lib/__tests__/prescribing-packet.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/doctor lib/doctor lib/__tests__
git commit -m "refactor: render prescribing packet across doctor surfaces"
```

## Verification

- Run `pnpm typecheck`.
- Run `pnpm test -- lib/__tests__/prescribing-packet.test.ts lib/__tests__/unified-intake-regressions.test.ts lib/__tests__/doctor-review-ui-contract.test.ts`.
- Run `pnpm lint`.
- Browser verify repeat-script review, queue row, timeline, and Parchment panel show one medication packet and no duplicated medication/dose blocks.
