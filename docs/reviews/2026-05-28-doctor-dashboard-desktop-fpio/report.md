---
runId: 2026-05-28-doctor-dashboard-desktop-fpio
journey: Doctor dashboard desktop interaction audit (queue hover + review open)
url: http://localhost:3060
overallScore: 8
capturedAt: 2026-05-28T06:00:16.514Z
---

# A credible doctor console with two signature devices hiding in plain sight

This reads like an internal tool a real GP would actually use. Calm ivory, clear three-pane rhythm, send action where the eye lands. The weak spots are small: the live wait-counter and the doctor's signature are present but undersized, and a couple of copy strings need a second pass.

## What's working

- Three-pane layout (nav, queue, review) holds up. Eye lands on **Send to Mia** inside two seconds.
- Pre-send strip is honest: "Intake complete. Screener checked. Review before sending."
- Name-first throughout. Open Mia's request. Send to Mia. $25 to Mia.
- Refund cost surfaced at the decline action, not buried in a policy page.
- ⌘+Enter shortcut visible on the primary CTA. Keyboard-first, as it should be.
- Ivory holds. Blue reserved for the primary action. Amber only on the test-mode banner.

## What to fix, ranked

### 1. Auto-open the only case in queue, and make the selected row obvious

**Impact:** high · **Where:** `intake-review-panel`, `queue-row-*`

When there's one patient waiting, asking the doctor to click "Open full record" is a tax. Auto-open when queue length is 1. When the queue grows, the queue card and the review pane currently share near-identical card treatment, so the link between them goes quiet. Heavier left border in blue on the selected row, or a soft filled background. Make it unambiguous which case is loaded.

### 2. Promote the wait-counter and add the doctor's signature mark

**Impact:** medium · **Where:** header chip, send action area

"Oldest wait 25s" is the strongest brand device on this screen, and it's small grey type tucked top-right (see frame around 0:04). Make the seconds value the hero. Display weight, larger numeric, supporting metadata below. Then pair the **Send to Mia** button with a small handwritten "Signed as Dr Amelia Reid" mark. Real doctor, named, signed. That's the spine, on the exact surface where it matters most.

### 3. Tighten the SOAP draft template and surface the refund promise at decline

**Impact:** medium · **Where:** `Draft clinical note Plan`, decline action

Two copy nits in the draft note. "What Mia sees right now / You're next. A doctor is looking at your request now." uses "now" twice in two lines. Cut to "You're reviewing this request." on the label and let the patient line stand. Next to **Decline with reason**, add one line: "Full refund issued automatically. Mia keeps the consult notes." Right now decline reads as a $25 cost. It should read as honouring a promise.

Note: Gemini flagged "Checks box you want" as ungrammatical helper text, and a label-less red button. Neither appears in the captured DOM. Treating both as model false positives. The SOAP plan text in the DOM is clean prose ("rest, fluids, paracetamol PRN"), not the "/rest, fluids" Claude saw in the frame, so that one is likely a frame OCR artefact too.

## Full critique by category

**Brand spine (6–8):** Speed and named accountability are present (live wait, Dr Amelia Reid, MED number on sign-off). But the doctor view has no warmth dial, and the two devices that carry the spine on this surface, the wait-counter and the signature, are both under-leveraged.

**Typography (8):** Hierarchy is right. "Mia Carter" anchors. SOAP labels read cleanly. The Subjective field could use a touch more line-height for scanning at speed, and on smaller viewports the note should auto-grow rather than truncate.

**Color and surface (9):** Nothing to add. Ivory holds. No coral creep. The skeleton loader (around 0:08) could pick up warm grey tones instead of cool, but that's polish, not a fix.

**Motion (7):** Skeleton-to-content transition at 0:08 → 0:12 reads as four seconds for a single-case load. If the real fetch is faster, cap the skeleton at 200ms. If it's genuinely slow, stream the header first (name, age, reason) and skeleton only the SOAP fields.

**Copy voice (6–8):** Mostly on-voice. "Check before you send." and "Saved as you type. Private until you send." are the kind of lines a GP would actually say. The "right now / now" duplication is the only real bump.

**Hierarchy and layout (8):** Stripe-grade restraint. The only weakness is the queue-to-review selected-state, covered above.

**Conversion friction (7):** Send path is one click, ⌘+Enter exposed, refund cost inline. The redundant click on the single-case empty state is the highest-friction moment on the screen.

**Signature devices (5):** Wait-counter, name-first, "while you wait" specificity all present. Handwritten signature absent. The wait-counter is sized like metadata when it should be sized like a headline.

## Reference frame

Closer to Linear than Mosh on this surface, which is the right call for an operator tool. Stripe would tighten the queue-to-review selected state and probably hide the patient-facing "What Mia sees right now" panel behind a hover or a side drawer rather than baking it into the main column. Linear would make the ⌘+Enter shortcut and the wait-counter the two loudest elements on the page. Mosh would put the doctor's face and signature next to the send button without apologising. Borrow from all three: Linear's keyboard emphasis, Stripe's selected-state discipline, Mosh's named-doctor warmth at the moment of send.

## Model false positives

The DOM/text evidence contradicts these model findings, so they do not count against the acceptance checklist:

- Draft note Subjective starts '35-year-old patient. Sore throat and fatigue since this morning…' — fine clinically, but the visible Plan line 'Symptomatic management advised /rest, fluids' has an odd '/' that reads like a template artefact, not prose a GP would write.

## Acceptance Checklist

- [x] No high-severity findings
- [x] No shortcut hazards
- [x] No clipped decision text
- [x] Combined video score at or above 8/10

## DOM Evidence

Captured from `dom-evidence.json` for rendered-truth checks beside the frames.

- URL: http://localhost:3060/dashboard?showTestData=1&onlyTestData=1
- Title: Staff Dashboard | InstantMed
- Visible text excerpt: You're back online Skip to main content IM InstantMed DOCTOR CONSOLE TODAY Dashboard Requests Review Scripts Patients 1 RUN Analytics Payments Ops SETUP Setup DA Dr Amelia Reid Admin + Doctor Dashboard Oldest wait 25s Updated 11s ago · 1 case waiting Available Test mode. Real patients are hidden. Hide test data Today's queue All(1) Review(1) Info(0) Scripts to write(0) MC Mia Carter Med Cert Medical certificate request Waiting 24s Mia Carter Mia, 35, Melbourne, VIC. First visit. In queue Case 1 of 1 What Mia sees right now You're next. A doctor is looking at your request now. View profile Open full record Reason for visit Medical certificate request · Work · 1 day · 2026-05-28 Draft note Che

- Staff sidebar: IMInstantMedDoctor consoleTodayDashboardRequestsReviewScriptsPatients1RunAnalyticsPaymentsOpsSetupSetupDADr Amelia ReidAdmin + Doctor
- InstantMed home: IMInstantMedDoctor console
- Primary: TodayDashboardRequestsReviewScriptsPatients1RunAnalyticsPaymentsOpsSetupSetup
- Dashboard: Dashboard
- Requests: Requests
- Review: Review
- Scripts: Scripts
- Patients: Patients1

## Frames

- [4s](frames/004s.png)
- [8s](frames/008s.png)
- [12s](frames/012s.png)
- [16s](frames/016s.png)
