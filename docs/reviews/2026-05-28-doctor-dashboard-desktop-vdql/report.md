---
runId: 2026-05-28-doctor-dashboard-desktop-vdql
journey: Doctor dashboard desktop interaction audit (queue hover + review open)
url: http://localhost:3001
overallScore: 8
capturedAt: 2026-05-28T01:43:42.534Z
---

# A calm clinical console that loses its voice the moment a case opens

The dashboard does the hard work: oldest wait at the top, one primary action, refund promise pinned to the decision. The bones are right. What's missing is the InstantMed signature on a doctor surface, and a bit of motion to tell the clinician they've crossed into a case.

## What's working

- "Oldest wait 28m 43s" ticks live in the header. Real urgency, no theatre.
- One primary action on land: "Open next case". No competing CTAs.
- Refund promise sits at the action bar, exactly where the decision happens.
- Keyboard-first: Cmd+Enter to send, Cmd+Shift+D to decline. Respects time-poor doctors.
- Copy holds the line. "Median form-to-inbox today: 10m. Target: under 2h." Short, plain, honest.
- "Send to Mia" / "Decline & refund Mia" keep the patient named, not numbered.

## What to fix, ranked

### 1. The case panel opens with a hard swap

**Impact:** high · **Where:** intake-review-panel mount, around the 0:08 mark

Between the queue view and the case view there's no transition. The right pane just becomes a different thing. Add a 200-240ms ease-out fade with a 4px Y lift on mount, gated by prefers-reduced-motion. This is the Linear-grade cue that tells the doctor "you are now in clinical context", and it's the single biggest gap on the surface.

### 2. SLA pressure disappears once the case opens

**Impact:** high · **Where:** action bar, intake-review-panel

The "1h 32m to target" chip lives in the header but never travels with the decision. Pin a compact "Waiting 28m · 1h 32m to target" chip to the left of the Send button. Also tighten the decline copy: link reads "Decline & refund Mia $25.", status line reads "If you decline, Mia is refunded $25 automatically." One action, one sentence.

### 3. The queue column goes dead after a case opens

**Impact:** medium · **Where:** left rail, operator-split-pane

One card, lots of empty column. The doctor loses the "what's next" signal at exactly the moment throughput matters. Either collapse the rail to a 64px icon column with hover-expand, or surface a small "Up next: name · type · waiting Xm" card under the current case. Reclaim the column for signal.

### 4. The surface reads as generic SaaS, not as InstantMed

**Impact:** medium · **Where:** header strip, stat tiles

Strip the IM monogram and this could be any health admin tool. Rewrite the wait tile in voice: "Oldest wait · 28m. Updated just now." with a muted second line "Median form to inbox today: 10m." Under "Mia Carter" in the case header, add one muted line: "Mia, 35, Melbourne. First visit." Small lifts, big tonal shift.

## Full critique by category

**Typography.** Hierarchy is mostly clean, but "28m" out-weighs the H1 "Dashboard" and the eye lands on the stat first. Pick one anchor: either demote the stat numerals by a few pixels or promote the H1. In the patient answers block, labels and values read at similar weight, which flattens the form. Drop labels to 500 / 12px muted; keep values at 15-16px regular.

**Colour and surface.** Ivory holds. Coral is correctly rare, used only for the test-mode dot and the decline link. Two notes: the full-width amber test-mode banner nags above the queue card, collapse it to an inline chip near the title. And the action bar blends into the page; lift it with a cooler 1px top border or a soft sky-toned shadow so it reads as a persistent shelf, not page content.

**Motion.** Only the wait counter moves. The case-open transition is a hard swap (see above). One small thing on the counter itself: split it into stable minute glyphs and a separate seconds span with tabular-nums and fixed width, so only the seconds repaint. Stops the sub-pixel jitter on the trailing digits.

**Copy and voice.** Holds. Short sentences, full stops, no jargon, no hype. The only ambiguity is "Declining refunds $25 to Mia automatically", which reads as two things at once. Fix as noted above.

**Hierarchy and layout.** Stripe-adjacent rhythm in the case panel: Reason → Patient answers → Clinical note → Action bar. Good. The "Profile" and "Full case" buttons in the case header read as siblings but do different jobs, make "Full case" the ghost-primary and "Profile" a tertiary text link with the user icon.

**Conversion friction.** One real gap: "Open next case" doesn't tell the doctor what they're about to claim. Add one line under it: "Opens Mia Carter · Med Cert · waiting 28m." Removes hesitation, mirrors what the queue already knows.

**Signature devices.** The wait counter is present but reads as a generic stat tile. Rewrite it in voice as above. Name-first is honoured in the actions; extend it to the case header with one warmth line under the patient name.

## Reference frame

Mosh would warm the case header. Pilot would put the SLA chip next to the Send button without asking. Linear would never let a panel mount without a transition. Stripe would fix the label/value weight contrast and let the H1 win over the stat tiles. The bones here are closer to Stripe than to Mosh; what's missing is the InstantMed warmth signature on a surface that currently behaves correctly but doesn't quite sound like us.

## Acceptance Checklist

- [x] No high-severity findings
- [x] No shortcut hazards
- [x] No clipped decision text
- [x] Combined video score at or above 8/10

## DOM Evidence

Captured from `dom-evidence.json` for rendered-truth checks beside the frames.

- URL: http://localhost:3001/dashboard?showTestData=1&onlyTestData=1
- Title: Staff Dashboard | InstantMed
- Visible text excerpt: You're back online Skip to main content IM InstantMed DOCTOR CONSOLE TODAY Dashboard Requests Review Scripts 1 Patients 2 RUN Analytics Payments Ops SETUP Setup DA Dr Amelia Reid Admin + Doctor Dashboard Oldest wait 28m 43s Updated 41s ago · 1 case waiting Available Test mode. Real patients are hidden. Hide test data Today's queue Median form-to-inbox today: 10m. Target: under 2h. Case open All(1) Review(1) Info(0) Scripts to write(0) MC Mia Carter 35y • 20/06/1990 • Melbourne VIC Med Cert Claimed Medical certificate request Waiting 28m 30s Mia Carter In Queue Waiting 28m 30s Profile Full case Reason for visit 35-year-old patient. Sore throat and fatigue since this morning. Mild headache. No

- Staff sidebar: IMInstantMedDoctor consoleTodayDashboardRequestsReviewScripts1Patients2RunAnalyticsPaymentsOpsSetupSetupDADr Amelia ReidAdmin + Doctor
- InstantMed home: IMInstantMedDoctor console
- Primary: TodayDashboardRequestsReviewScripts1Patients2RunAnalyticsPaymentsOpsSetupSetup
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
