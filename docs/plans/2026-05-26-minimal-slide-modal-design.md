# Minimal slide modal + ED prescription recommendation + auto-approve fixes

> **Authority:** Reference only. This file has no independent execution authority. `docs/ROADMAP.md` is the sole active queue; execute from this record only when the ROADMAP explicitly activates it.

**Date:** 2026-05-26
**Status:** Approved (operator). Ready for implementation plan.
**Authors:** rey + Claude

## Why now

While reviewing today's queue we hit three friction points that all sit on the same surface:

1. A vanilla 2-day sick cert ("fever nose full get cold") sat in manual review for 3h 22m. The auto-approve rule only fires for 1-day certs (or any cert from a 2+ approval returning patient). And the slide showed an empty `"Already claimed by System (Auto-Approve) ( minutes remaining)"` banner: a render bug masquerading as a stuck process.
2. The doctor slide-over cockpit is dense: three tabs (Request / Notes / History), a 3×2 identity grid, a wrapped "Recommended plan" card, and a draft-note disclosure. For a 2-day cold cert the doctor only needs to read 1 to 2 lines of patient story and click Approve.
3. The ED slide leaves prescribing as "Doctor to select agent, strength, directions, quantity and repeats in Parchment after final review." Patient already told us their preference (daily / PRN / doctor decides), so we should map straight to a real medication + dose + directions so the doctor can copy-paste into Parchment.

The three are bundled because they share the same surface and the same goal: get the doctor to a decision in under 30 seconds without losing safety signal.

## Goals

- A 2-day med cert with only soft flags auto-approves for any patient (not just returning ones).
- The claim banner never renders an empty `( minutes remaining)` value. When the System (Auto-Approve) actor is holding the claim, show "Auto-approval in progress" with a sane countdown or no countdown at all.
- The slide-over panel is a single scrollable column. No tabs. Notes + history collapse into a bottom disclosure ("Show full intake · N prior requests · M notes").
- ED prescriptions ship a real recommendation: medication name, strength, quantity, repeats, directions, all derived from the patient's stated `treatment_preference`.

## Non-goals

- Hair-loss preset stays generic for now. (Follow-up task: same pattern as ED, different drug table.)
- Repeat-script preset already names the medication from the patient request; no change needed.
- We are NOT introducing a new auto-approve rule for prescription / consult intakes. Auto-approval stays med-cert only.
- We are NOT auto-prescribing in Parchment. The doctor still clicks through Parchment; we just hand them a filled-in preset.

## Design

### 1. Auto-approve widening

**File:** `lib/clinical/auto-approval.ts:481-499`

Current logic (paraphrased):
```
if (durationDays === 1 && hasOnlySoftFlags) auto-approve
if (previousApprovals >= 2 && hasOnlySoftFlags) auto-approve
otherwise: manual queue
```

New logic:
```
if (durationDays <= 2 && hasOnlySoftFlags) auto-approve   // widened from 1 to 2
if (previousApprovals >= 2 && durationDays <= 3 && hasOnlySoftFlags) auto-approve  // unchanged (cap is 3)
otherwise: manual queue
```

Reasoning: a 2-day cert is well inside the 3-day hard cap (`MAX_MED_CERT_DURATION_DAYS = 3`) and matches the most common cold/flu pattern. All hard-block keywords (mental health, injury, chronic, pregnancy, high-stakes use case) still prevent auto-approval. Soft flags still get recorded for batch review.

Bump `ELIGIBILITY_ENGINE_VERSION` from `"2.4"` to `"2.5"`.

### 2. Auto-approve claim banner: empty parenthesis

**File:** `lib/data/intake-lock.ts` + the Postgres RPC `claim_intake_for_review`

The screenshot shows `"Already claimed by System (Auto-Approve) ( minutes remaining)"`. Trace:
- UI string comes from `lockWarning` → `result.warning` → `LockResult.warning` → `claim?.error_message` from the Postgres RPC.
- The SQL function builds the message from `current_claimant` (text) + minutes since `review_started_at`. When the claimant is the System actor, `review_started_at` is either NULL or so stale the minutes display blanks out.

**Fix (client-side, safe + immediate):**
In `lib/data/intake-lock.ts:65`, if `claim?.error_message` mentions "Auto-Approve", short-circuit to a hand-written string:

```ts
const isSystemClaim = (claim?.current_claimant || "").includes("Auto-Approve")
return {
  acquired: false,
  existingLock: { ... },
  warning: isSystemClaim
    ? "Auto-approval check in progress. You can review and act now if needed."
    : (claim?.error_message || "This case could not be claimed for review."),
}
```

**Follow-up (SQL):** clean the RPC template so the empty parenthesis can't escape regardless of caller. Tracked as a separate ticket, out of scope here.

### 3. Minimal slide modal: single column, no tabs

**Files to touch:**
- `components/doctor/review/intake-review-cockpit.tsx` (top-level layout, drop Tabs)
- `components/doctor/review/request-info-card.tsx` (already accepts `compact` + `hideFullAnswers`)
- `components/doctor/patient-decision-strip.tsx` (already accepts `compact`)
- New: `components/doctor/review/intake-secondary-disclosure.tsx`, the bottom "Show full intake" expandable that holds patient timeline + notes editor + full identity strip

**Current cockpit structure** (intake-review-cockpit.tsx:213-296):
```
PatientDecisionStrip (compact)
ReviewBlockersStrip
SafetyFlagsCard
Tabs [Request | Notes | History]
  Request: RequestInfoCard + PatientMessageThread + CertificateDeliveryCard
  Notes:   ClinicalNotesEditor
  History: PatientTimeline
IntakeActionButtons (sticky bottom)
```

**New cockpit structure (single column, top to bottom):**
```
PatientDecisionStrip (compact, one line: name · age · sex · "First request" or "Returning x4")
ReviewBlockersStrip            (hidden when none)
SafetyFlagsCard                (hidden when none)
RequestInfoCard (compact, hideFullAnswers)
PatientMessageThread           (only when patient has messaged)
PrescriptionRecommendationCard (NEW: only when prescriptionIntent exists)
CertificateDeliveryCard        (only after approval)
IntakeSecondaryDisclosure      (closed by default)
  └─ "Show full intake · 4 prior requests · 0 notes"
     ├─ ClinicalNotesEditor (always shown when expanded)
     ├─ PatientTimeline (compact, max 20 items)
     └─ Full identity strip (DOB, Medicare, address, phone)
IntakeActionButtons (sticky bottom: Approve / Decline)
```

Visible-by-default removes ~40% of the vertical real estate currently spent on tab chrome and unused identity cards. Notes editor isn't lost: `Cmd+N` shortcut now opens the disclosure AND focuses the notes textarea (same hook wire as today). Approve flow with too-short notes opens the disclosure as a side effect of the existing min-length validation.

**Sticky bottom action bar stays put.** That's the load-bearing UX of the cockpit and we don't touch it.

### 4. ED prescription recommendation

**File:** `lib/clinical/case-summary.ts:273-280` (`edSummary` function, `prescriptionIntent` block)

Replace generic search hint with a concrete preset:

```ts
const ED_PRESETS = {
  daily: {
    medicationName: "Tadalafil",
    strength: "5mg",
    form: "tablet",
    quantityTemplate: "30 tablets",
    repeatsTemplate: "2",
    directionsTemplate: "Take 1 tablet once daily, at the same time each day.",
    medicationSearchHint: "Tadalafil 5mg tablet",
  },
  prn: {
    medicationName: "Sildenafil",
    strength: "50mg",
    form: "tablet",
    quantityTemplate: "8 tablets",
    repeatsTemplate: "2",
    directionsTemplate: "Take 1 tablet 1 hour before sexual activity. Maximum 1 tablet per 24 hours.",
    medicationSearchHint: "Sildenafil 50mg tablet",
  },
  doctor_decides: {
    // Default to Sildenafil 50mg PRN (most common starting option),
    // with Tadalafil 5mg daily as an alternative shown in subtext.
    medicationName: "Sildenafil",
    strength: "50mg",
    form: "tablet",
    quantityTemplate: "8 tablets",
    repeatsTemplate: "2",
    directionsTemplate: "Take 1 tablet 1 hour before sexual activity. Maximum 1 tablet per 24 hours.",
    medicationSearchHint: "Sildenafil 50mg tablet",
    alternativeNote: "Patient hasn't expressed a preference. Tadalafil 5mg daily is an alternative for patients who prefer daily dosing.",
  },
} as const
```

The intent goes through the existing `makeIntent(...)` path so `clipboardText` is populated for the Copy buttons. Safety checks unchanged.

**Why these doses (operator-confirmed):**
- Tadalafil 5mg: lowest effective daily dose. Higher (10mg) reserved for poor responders.
- Sildenafil 50mg: standard adult starting dose. Doctor escalates to 100mg only after a 50mg trial.
- Quantities (30 tabs daily = 1 month; 8 tabs PRN = ~weekly use over 2 months) are conservative starting prescriptions that map cleanly to PBS pack sizes.

**Hard contraindications stay upstream.** `hasBlock || needsLiveReview` short-circuits before `prescriptionIntent` is created, so we never recommend Sildenafil to a nitrate user.

### 5. PrescriptionRecommendationCard: new component

**File:** `components/doctor/review/prescription-recommendation-card.tsx` (new)

Renders a `prescriptionIntent` as a clean card replacing the current generic "Parchment preset" hint card:

```
RECOMMENDED PRESCRIPTION
Tadalafil 5mg tablet
Quantity: 30 tablets · Repeats: 2
Take 1 tablet once daily, at the same time each day.
[Copy all] [Copy medication name]
[Open Parchment]
```

For `doctor_decides` preference, append the alternative-note as a small italic line under the directions.

Calm chrome (per CLAUDE.md 2026-05-21 rule): no colored-background pill. Solid white card with `border-border/50 shadow-md shadow-primary/[0.06]`, the standard depth pattern.

## Open question (non-blocking)

The `claim_intake_for_review` SQL function has the same empty-parenthesis bug in any other path that surfaces a `current_claimant` of a non-doctor actor. Cleaning the SQL is the right long-term fix but is out of scope here. The client-side mask in §2 is enough to ship today.

## Testing

- `lib/__tests__/auto-approval-pipeline.test.ts`: add cases for 2-day cert + non-returning patient + soft flags only → eligible.
- `lib/__tests__/auto-approval.test.ts` (if it exists, otherwise inline): bump `ELIGIBILITY_ENGINE_VERSION` assertion.
- New: `lib/__tests__/ed-prescription-preset.test.ts`: assert each preference branch returns the right medication name + dose + directions.
- New: `components/doctor/review/__tests__/intake-review-cockpit-no-tabs.test.tsx`: assert the cockpit renders no `[role="tablist"]` and that Notes/History live in a disclosure.

## Risks

- **Auto-approve widening:** moves more revenue forward without doctor friction; medico-legal exposure stays inside the soft-flag boundary. Low risk; the hard-block keyword list already gates the dangerous categories.
- **Tabs removal:** doctors who relied on the Notes tab as a default landing pane now have to expand the disclosure. Mitigated by keeping `Cmd+N` as the shortcut + opening the disclosure on approve-with-empty-notes.
- **ED preset:** recommending a specific drug shifts decision weight away from the doctor's clinical judgment. We label this clearly as "Recommended" not "Prescribed", and the doctor still selects in Parchment.

## Out of scope

- Cleaning the `claim_intake_for_review` SQL function.
- Hair-loss preset rewrite to specific medication recommendations.
- Repeat-script preset already names the requested medication; no change.
- Auto-approval for prescription / consult intakes.
- New auto-approve daily-cap or rate-limit changes.

## Definition of done

- [ ] `auto-approval.ts` widens to 2-day for any patient; engine version bumped to 2.5.
- [ ] Claim banner never renders `( minutes remaining)` with empty value.
- [ ] Intake review cockpit renders without tabs; notes/history collapsed into bottom disclosure.
- [ ] `Cmd+N` shortcut still opens notes editor (opens disclosure first if collapsed).
- [ ] ED preset returns specific Tadalafil 5mg / Sildenafil 50mg with directions, quantity, repeats per preference.
- [ ] PrescriptionRecommendationCard renders the preset on the slide with Copy + Open Parchment buttons.
- [ ] All existing E2E tests still pass; new unit tests cover preset and cockpit layout.
- [ ] One PR, squash-merged via `gh pr merge --auto --squash --delete-branch`.
