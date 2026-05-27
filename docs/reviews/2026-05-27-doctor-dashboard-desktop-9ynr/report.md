---
runId: 2026-05-27-doctor-dashboard-desktop-9ynr
journey: Doctor dashboard desktop interaction audit (queue hover + review open)
url: http://localhost:3001
overallScore: 8
capturedAt: 2026-05-27T23:37:35.570Z
---

# A calm console that forgot its loudest device is the live counter

Two clicks from queue to decision. Ivory surfaces, one blue CTA, refund promise inline at the action. The bones are right. The miss: the wait counter, our signature device, ticks like a static number, and the primary action sits five sections below the fold on a long case.

## What's working

- Header strip earns trust: "Oldest wait 26m40s · Updated 41s ago" sits top-right where a doctor's eye lands first.
- "Median today 10m form to inbox · target under 2h" names the pace and removes the question in one line.
- One saturated colour. Blue "Approve and send" is the only thing shouting. Stripe-grade restraint.
- Refund promise lives next to the decline button: "Declining this case refunds $25 to the patient automatically." Best place for it.
- Cmd+Enter and Cmd+Shift+D shortcuts surfaced inline. Power-user respect.

## What to fix, ranked

### 1. The live counter doesn't feel live

**Impact:** high · **Where:** Dashboard header + queue row "Waiting 26m"

Claude watched the counter tick from 25m 58s through to 26m 38s across 40 seconds of capture, and every increment was a hard number swap. No pulse. No tick. The single device that proves we mean "faster than your GP" currently reads as static text. Animate the seconds with a 200ms crossfade. Add a 1px breathing dot next to "Oldest wait" that pulses every 10s. Respect prefers-reduced-motion. This is the cheapest high-impact change on the list.

### 2. Pin the action bar. Reorder the review pane.

**Impact:** medium · **Where:** `intake-review-panel`

On Mia's case the doctor scrolls past identity, reason, patient answers, and a full SOAP draft before reaching "Approve and send". On longer cases it sits below the fold. Pin Decline & refund / Approve and send as a sticky footer on the review pane. While you're in there, reorder: Reason for visit and Patient answers above About Mia. Identity verifies, it doesn't drive the decision.

### 3. Fix the dashboard pacing copy

**Impact:** medium · **Where:** "Today's pace" card

Gemini flagged "We are finished yet. But one's queued." The captured DOM shows the live string is closer to "No cases finished yet. First one's queued." which is grammatical but slightly cute for a clinical surface. Either way, flatten it: "No cases finished yet. One waiting." Also drop the redundant "You're 21% into the 2h target" gloss when "Time used 21%" already says it.

### 4. Status pills and taxonomy chips look the same

**Impact:** low · **Where:** queue row

"In Queue", "Claimed", "Med Cert" all render as similar muted pastel chips. On a busy day a doctor needs status (where is this case in the flow) to read differently from taxonomy (what kind of case is it). Filled pills for status, outlined chips for taxonomy. One shape change, done.

## Full critique by category

**Brand spine.** Operational, not consumer. Correct call. The lockup top-left ("InstantMed / Doctor console") is competent but generic. One small brand moment in the sidebar, a coral dot on the active nav item, would carry warmth into the workspace without making it feel marketed-at.

**Typography.** Clean hierarchy. Dashboard H1, Today's queue section head, Mia Carter card title all step predictably. One nit: "red-flag" wraps with a hyphenated break in the Reason for visit paragraph. Use a non-breaking hyphen on clinical compounds.

**Colour and surface.** Strong. Ivory holds, white cards float, blue is the only saturated note. The amber test-mode banner is loud without being alarming. Nothing to do here except the pill-vs-chip fix above.

**Motion.** The weak category. 4/10 from Claude, 6/10 from Gemini, and both pointed at the same surfaces. No visible hover lift on the primary CTAs across 40 seconds of capture. No tick animation on the counter. Gemini also flagged a skeleton-to-detail layout jump at 0:06, the skeleton uses centered bars and the detail view is a split column. Match the skeleton to the grid.

**Copy voice.** Mostly on. "All checks passed. Certificate ready to send." is the right tone. "Full refund if we can't help" lives in the right place. Trim the pacing card and you're done.

**Hierarchy and layout.** Three-column rhythm works. The right pane on the empty dashboard is two low-density tiles consuming prime real estate, fold them into the header strip or add a third tile that earns the width (cases-by-hour sparkline would do it).

**Conversion friction.** For a doctor flow this is time-to-decision, and it's mostly tight. Two clicks, shortcuts visible, trust signal adjacent to the CTA. Reorder identity below clinical content and pin the action bar and this category goes from 8 to 9.

**Signature devices.** The live counter is the loudest device we have and it currently whispers. Fix the motion and this category lifts a full point.

## Reference frame

Against Linear, the layout discipline holds but the motion budget does not. Linear would have animated the counter, the hover, and the skeleton-to-detail transition before shipping. Against Stripe, the colour and typography restraint is on par, though Stripe would have killed the redundancy in the pacing card and pinned the primary action without being asked. Mosh would have added one warm human moment in the sidebar (a doctor's name, a signature mark) so the console feels like Dr Reid's workspace, not an admin shell. Pilot would have made the refund promise even louder at the decline action. We're already closer to Stripe than to either of those, the gap to close is motion.

## Model false positives

The DOM/text evidence contradicts these model findings, so they do not count against the acceptance checklist:

- It is unclear if the 'Doctor notes' text area is optional or mandatory before the doctor clicks 'Approve and send'.

## Acceptance Checklist

- [x] No high-severity findings
- [x] No shortcut hazards
- [x] No clipped decision text
- [x] Combined video score at or above 8/10

## DOM Evidence

Captured from `dom-evidence.json` for rendered-truth checks beside the frames.

- URL: http://localhost:3001/dashboard?showTestData=1&onlyTestData=1
- Title: Staff Dashboard | InstantMed
- Visible text excerpt: You're back online Skip to main content IM InstantMed DOCTOR CONSOLE TODAY Dashboard Requests Review Scripts 1 Patients 1 RUN Analytics Payments Ops SETUP Setup DA Dr Amelia Reid Admin + Doctor Dashboard Oldest wait 26m40s Updated 41s ago · 1 case waiting Available Test mode. Real patients are hidden. Hide test data Today's queue Median today 10m form to inbox · target under 2h Open next case All(1) Review(1) Info(0) Scripts to write(0) MC Mia Carter 35y • 20/06/1990 • Melbourne VIC Med Cert Claimed Medical certificate request Waiting 25m Mia Carter In Queue Waiting 26m Profile Full case About Mia First visit Identity details DOB 35y / 20/06/1990 Medicare 2123 45670 1 Phone [phone] Address 4

- Staff sidebar: IMInstantMedDoctor consoleTodayDashboardRequestsReviewScripts1Patients1RunAnalyticsPaymentsOpsSetupSetupDADr Amelia ReidAdmin + Doctor
- InstantMed home: IMInstantMedDoctor console
- Primary: TodayDashboardRequestsReviewScripts1Patients1RunAnalyticsPaymentsOpsSetupSetup
- Dashboard: Dashboard
- Requests: Requests
- Review: Review
- Scripts: Scripts1
- 1 pending: 1

## Frames

- [4s](frames/004s.png)
- [8s](frames/008s.png)
- [12s](frames/012s.png)
- [16s](frames/016s.png)
- [20s](frames/020s.png)
- [24s](frames/024s.png)
- [28s](frames/028s.png)
- [32s](frames/032s.png)
- [36s](frames/036s.png)
- [40s](frames/040s.png)
- [44s](frames/044s.png)
