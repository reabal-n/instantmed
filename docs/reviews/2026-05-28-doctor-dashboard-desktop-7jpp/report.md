---
runId: 2026-05-28-doctor-dashboard-desktop-7jpp
journey: Doctor dashboard desktop interaction audit (queue hover + review open)
url: http://localhost:3060
overallScore: 8
capturedAt: 2026-05-28T07:26:25.371Z
---

# A competent doctor console that forgets it's an InstantMed product

The queue-to-draft path is fast, the SOAP block is clean, and Cmd+Enter is right where a doctor expects it. What's missing is the brand. The wait counter, the refund promise, the decline path: all sit on the page as system text, not as the voice patients are reading on the other side.

## What's working

- Two-column layout puts patient name, SLA chip, and primary CTA exactly where the eye lands.
- "Test mode. Real patients are hidden." is the right tone. Short. Declarative. No hedge.
- "Saved as you type. Private until you send." earns trust without selling.
- Cmd+Enter shortcut visible next to Send. Stripe-grade detail.
- "Intake checked. Review before you send." lives next to the CTA, where reassurance belongs.

## What to fix, ranked

### 1. The refund promise is hiding on the decline path

**Impact:** high · **Where:** sticky footer, right pane (around the 0:12 mark)

"Refund on decline: $25 to Mia" reads as a penalty, not a promise. And "Decline with reason" is rendered in coral, which the system reserves for brand moments, not destructive ones. Rewrite the line: "Full refund if you can't help. $25 back to Mia." Demote the decline link to neutral grey. Decline is a clinical good, not an error state.

### 2. The brand's wait counter never reaches the console

**Impact:** medium · **Where:** queue card SLA chip (visible from 0:04)

"Waiting 21s · On track" is a metric. The patient sees the branded version. Doctors should too. Add a sibling line: "Average med cert today: 14 min." Now the doctor sees the SLA in the voice patients are quoting back, and the brand spine reaches the room where the work happens.

### 3. Duplicate loading copy and a redundant click target

**Impact:** medium · **Where:** empty state and skeleton transition (0:04 to 0:08)

Two things at once. The empty state shows "Open Mia's request when you're ready" with a button that duplicates the queue card click. And "Loading Mia's answers." appears twice when the skeleton lands. Drop the secondary button (the queue card is already the target). Show the loading line once. Cross-fade the empty state into the skeleton over ~200ms so the swap stops feeling mechanical.

## Full critique by category

**Brand spine.** This is an internal tool, so warmth is rightly dialled down. But "What Mia sees right now" is the perfect place to mirror the exact patient-facing copy, verbatim. Doctors should see what the patient sees, in the same words.

**Typography.** Clean. "Mia Carter" as H1, muted sub-line, small-caps section labels. Gemini flagged low contrast on "Reason for visit" / "Objective" / "Plan" labels at 0:08. Worth a contrast pass to 4.5:1, but not urgent.

**Color and surface.** Restraint holds. Ivory, white cards, blue primary. The one slip is coral on "Decline with reason" (covered above). Coral is a brand colour, not a danger colour.

**Motion.** The queue-to-detail swap lands without a curve. Skeleton pops in. 150 to 200ms opacity ease on the skeleton, plus a cross-fade out of the empty state, gets this from mechanical to deliberate.

**Copy voice.** Mostly grounded. "Open Mia's request when you're ready" is limp; try "Mia is next. Open when ready." Drop one of the two "Check before you send" lines (the CTA-adjacent one is stronger). The SOAP draft itself is clinical and well-pitched.

**Hierarchy and layout.** The footer crowds. Gemini's note on padding between the refund line and the primary CTA is fair: give the action footer room to breathe.

**Conversion friction.** Time-to-send is strong. Roughly 8 seconds from queue click to draft-ready. The duplicate click target in the empty state is the only real friction.

**Signature devices.** This is the weakest category and the highest leverage. The live wait counter exists but isn't phrased in the brand's voice. The Send confirmation has no preview of the name-first email Mia will receive. Add a one-line preview above Send: "Email opens with: Hi Mia,". Doctors then see the voice they're authorising.

## Reference frame

Linear would have cross-faded the empty state into the skeleton and killed the duplicate button without asking. Stripe would have made the refund line a trust signal, not a penalty, and would never have used a brand colour for a destructive-looking action. Mosh would have made sure the doctor reads the same sentence the patient is reading, in the same voice. Pilot would have put a price and a promise next to every decision the doctor has to make. The console is 80% there. The missing 20% is the brand showing up at the moments the doctor actually decides something.

## Model false positives

The DOM/text evidence contradicts these model findings, so they do not count against the acceptance checklist:

- The 'What Mia sees right now' panel is the perfect spot to echo brand voice ('A doctor is looking at your request now.') but the sentence is flat and doesn't reuse the coffee/time-to-cert promise that defines the brand.

## Acceptance Checklist

- [x] No high-severity findings
- [x] No shortcut hazards
- [x] No clipped decision text
- [x] Combined video score at or above 8/10

## DOM Evidence

Captured from `dom-evidence.json` for rendered-truth checks beside the frames.

- URL: http://localhost:3060/dashboard?showTestData=1&onlyTestData=1
- Title: Staff Dashboard | InstantMed
- Visible text excerpt: You're back online Skip to main content IM InstantMed DOCTOR CONSOLE TODAY Dashboard Requests Review Scripts Patients 1 RUN Analytics Payments Ops SETUP Setup DA Dr Amelia Reid Admin + Doctor Dashboard Available Test mode. Real patients are hidden. Hide test data Today's queue All(1) Review(1) Info(0) Scripts to write(0) MC Mia Carter Med Cert Medical certificate request Waiting 21s · On track Mia Carter Mia, 35, Melbourne, VIC. First visit. In queue Waiting 21s · On track Case 1 of 1 What Mia sees right now You're next. A doctor is looking at your request now. View profile Open full record Reason for visit Medical certificate request · Work · 1 day · 2026-05-28 Draft note Check before you s

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
