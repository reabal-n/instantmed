---
runId: 2026-05-27-doctor-dashboard-desktop-9j9x
journey: Doctor dashboard desktop interaction audit (queue hover + review open)
url: http://127.0.0.1:3001
overallScore: 7
capturedAt: 2026-05-27T17:58:36.395Z
---

# Calm console, but the SLA breach doesn't earn its weight

The doctor surface is doing the quiet, useful things right. Ivory background, restrained palette, one queue, one detail pane, one claim flow. Where it stumbles is in hierarchy and copy: the breached 2h 13m wait shares altitude with three lesser widgets, and a couple of strings ("Mia is next.", "Claiming case") read like placeholders.

## What's working

- Ivory + white card system holds up against the usual sterile CRM look.
- SLA framing is honest: "Median today 10m form to inbox · target under 2h".
- One screen, no modals: queue → claim → review.
- "Release" sits next to "Claimed for review" as a clean undo.
- Test-mode strip is appropriately quiet.

## What to fix, ranked

### 1. The breached wait is buried in the header row

**Impact:** high · **Where:** dashboard header, around the 0:04 mark

Both judges land here. The 2h 13m oldest wait is the single most important number on the screen and it's typeset at roughly the same scale as "Median today 10m", the test-mode toggle, and the availability switch. Pull SLA + median into a dominant left metric block (28–32px on the breached value), and drop test-mode and availability into a smaller utility cluster top-right.

### 2. After claim, the next action disappears

**Impact:** high · **Where:** intake-review-panel, around 0:16

Once a case is claimed, the pill flips to "Claimed for review · just now" and the doctor has to figure out the next move on their own. Surface a primary "Start review" button at the top of the patient pane the moment the claim lands. While you're in there, fix the ambiguous "Claiming case" label: if it's a state, "Claiming…"; if it's the action, "Claim case". Pick one.

### 3. "Next step. Mia is next." reads cute on a clinical surface

**Impact:** medium · **Where:** dashboard header / next-step card, around 0:04

Replace with a structured line a doctor can scan in half a second: "Next: Mia Carter · Med Cert · waiting 2h 13m". Who, what, how late. Done.

### 4. Two red signals for the same fact

**Impact:** medium · **Where:** over-target banner + header pill, around 0:04

The "Over review target" banner and the header's oldest-wait pill are both shouting in red about the same case. Soften the banner to a pale rose with a single red icon and red headline. Let the header pill carry the live metric. One alarm, not two.

### 5. Hard swap into the patient pane

**Impact:** medium · **Where:** right pane, between 0:10 and 0:12

Opening Mia's file is an instant content swap with no continuity cue. A 180–240ms cross-fade with a small upward translate would anchor the spatial change. Respect prefers-reduced-motion.

## Full critique by category

**Brand spine (7).** This is an internal surface, so the patient-facing spine ("Faster than your GP", refund promise) shouldn't dominate. Worth adding one quiet line that ties the doctor to the patient promise, e.g. "Patients are promised under 2h. Median today: 10m." Gemini's call to add "medical-grade iconography" we're dropping. It's exactly the decoration tax this console correctly avoids.

**Typography (6).** Hierarchy is mostly readable but the metric row flattens the most urgent number into the noise. Patient detail labels (DOB, Medicare, Phone, Address) sit too close in weight to their values. Push labels to 12px uppercase muted, values to 15–16px regular, two-column grid.

**Colour and surface (7).** Strong restraint. The only issue is doubled-up red on the over-target state. Fix that and this category goes to 8.

**Motion (5).** Two abrupt transitions: pane swap on case open, and the claim state change with no micro-confirmation. A short tint-and-settle on the claim pill plus a 2px lift on the case card would confirm ownership without theatre.

**Copy voice (5).** Mostly calm and operational. "Mia is next." and "Claiming case" are the two that need rewriting. Gemini's note about "Open it now" being demanding we're partially keeping, "Open it next" already softens it in the DOM. Gemini misread the live string.

**Hierarchy and layout (6).** Header row is four widgets fighting for the same altitude. Selected queue row needs a stronger affordance (2px left accent in primary blue, slight shadow lift). Gemini's three-column-compression claim we're flagging as a false positive: the DOM shows a two-pane split (queue + detail), not a forced three-column squeeze. Claude's frame-grounded read is the one to trust here.

**Conversion friction (7).** N/A for the paid path. The operational friction is the missing post-claim CTA, covered above.

**Signature devices (6).** Wait-counter appears three times in three formats (header pill, queue subhead, case row). Pick one canonical format and use it identically. Worth adding a one-line footer on the case pane: "Patient refunded if you can't help. Use Release if out of scope." It mirrors the public promise without shouting.

## Reference frame

Stripe would make the SLA breach the typographic hero and let everything else fall back two steps. Linear would nail the claim → review handoff with a single primary CTA appearing exactly where your eye lands after the claim. Mosh would rewrite "Mia is next." in about four seconds and never look back. The console is closer to that bar than the score suggests. Fix the header weight, the post-claim CTA, and the two cute strings, and this lands at 8.

## Acceptance Checklist

- [x] No high-severity findings
- [x] No shortcut hazards
- [x] No clipped decision text
- [ ] Combined video score at or above 8/10

## DOM Evidence

Captured from `dom-evidence.json` for rendered-truth checks beside the frames.

- URL: http://127.0.0.1:3001/dashboard?showTestData=1&onlyTestData=1
- Title: Staff Dashboard | InstantMed
- Visible text excerpt: You're back online Skip to main content IM InstantMed DOCTOR CONSOLE TODAY Dashboard Requests Review Scripts 1 Patients 1 RUN Analytics Payments Ops SETUP Setup DA Dr Amelia Reid Admin + Doctor Dashboard Oldest wait 2h 13m Updated 10s ago Median today 10m form to inbox · under 2h Test mode Available Test mode. Real patients are hidden. Hide test data Today's queue Median today 10m form to inbox · target under 2h 1 match Over review target Oldest case has waited 2h 13m. Open it next. All(1) Review(1) Info(0) Scripts to write(0) MC Mia Carter 35y • 20/06/1990 • Melbourne VIC Med Cert Claimed Medical certificate request Waiting 2h 13m Mia Carter In Queue Waiting 2h 13m Claimed for review · just

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
