---
runId: 2026-05-27-doctor-dashboard-desktop-pwwf
journey: Doctor dashboard desktop interaction audit (queue hover + review open)
url: http://localhost:3001
overallScore: 8
capturedAt: 2026-05-27T16:03:57.553Z
---

# A calm console that does the job, with two wait numbers that argue with each other

The doctor surface holds together. Queue on the left, case on the right, decision rail anchored. Voice is on-brand, refund promise sits where it should. The two issues worth your morning: a wait-counter that contradicts itself, and transitions that feel like hard cuts instead of state changes.

## What's working

- Live "Oldest wait 19m · Updated 10s ago" top-right. That's the trust device, doing its job.
- The refund promise lands at the decision point: "Patient was shown: full refund if we can't help."
- Keyboard hints are visible inline (Cmd+Enter, Cmd+Shift+D). No menu hunting.
- SOAP note is pre-filled and sensible. The Plan reads like something Dr Reid would actually write.
- Destructive action is correctly demoted to text, not a button competing with Approve.

## What to fix, ranked

### 1. Two wait numbers, no relationship between them

**Impact:** high · **Where:** dashboard header + queue header

"Avg med cert today 10m" sits a few centimetres from "Oldest wait 19m" and "Waiting 19m". A doctor reading this can't tell which number is the promise, which is the median, and which is the live state. Rename the top stat to "Median today (last 7)" and let "Oldest wait 19m" carry the real-time signal. Same data, no contradiction.

### 2. Auto-select the only waiting patient

**Impact:** high · **Where:** dashboard default state

When the queue has one match, the right two-thirds of the console reads half-empty (see frames at 0:04 and 0:08). Open the case by default. One less click, and the canvas fills with the work that matters.

### 3. The queue-to-case transition is a hard cut

**Impact:** medium · **Where:** `intake-review-panel` mount

Both judges flagged this. Around 0:10 the case panel mounts with no enter animation, then content swaps in. Gemini called the skeleton-to-content jump jarring; Claude noted the relationship between the queue row and the opened case is lost. Add a 200 to 300ms ease-out fade-and-translate on the detail panel, gated by `useReducedMotion`. Static-height skeletons inside, so nothing pops when the data lands.

### 4. Sticky-pin the decision rail

**Impact:** medium · **Where:** right pane, bottom

On shorter viewports, "Approve and send" drops below the fold once the clinical note expands (see around 0:15). Pin the decision rail to the bottom of the right pane. The doctor should never have to scroll to find the action.

### 5. No claim state on the open case

**Impact:** medium · **Where:** case pane header

The queue row shows "Claimed", the right pane doesn't. On a regulated decision, double-handling is a real risk. Show "Claimed by you · 19m ago" at the top of the case, with a one-click release.

## Full critique by category

**Motion (5/10).** Claude is right here, Gemini softer. Across 0:04 to 0:20 the only motion is mount and swap, both instant. Add the panel transition and a 150ms cross-fade on the Patient answers to Clinical note section swap. Header stays fixed, body changes underneath.

**Signature devices (6/10).** Wait-counter present and well-placed. Refund promise merchandised. Missing: a preview of what the patient will receive. The doctor approves an artefact, not just a record. Collapsed "Patient will receive" block above Approve and send, showing the name-first greeting and signature mark.

**Conversion friction (7/10).** Reads as time-to-decision here, and it's low. Keyboard shortcuts surfaced, refund visible, one click into the case. Pre-fetching adjacent queue items on hover would shave the 1.5s loader Gemini caught at 0:10.

**Typography (8/10).** Hierarchy holds. The one real note: in Identity details, label and value sit at near-identical weight (DOB, Medicare, Phone, Address). Drop labels one step in size or shift to muted ink. Quiet label, loud value.

**Color and surface (8/10).** Ivory, white cards, blue primary, single coral on Decline. Restraint is intact. One small thing: the three readiness ticks (Intake, Safety, Draft) all render the same blue, so they read as decoration. Make pending an outline, done an ink tick, active the colour.

**Copy voice (8/10).** "No one else waiting · target under 2h", "Private until sent", "A decline refunds $25 to the patient." All on. The "Subjective" label is fine for a GP, but pair it with the rest of the SOAP scaffold visible up-front so the doctor sees the shape of the note.

**Hierarchy and layout (8/10).** Two-pane structure correct. Primary action is the visual anchor. The half-empty default state is the only real miss, and auto-selecting the case fixes it.

**Brand spine (7/10).** Internal tool, so the consumer thesis is correctly absent. The wait counter, ivory canvas, and refund promise carry enough spine.

## Reference frame

Stripe would have shipped the quiet-label-loud-value treatment on the identity block and pinned the action rail without being asked. Linear would have animated the panel mount and the section swap, both at sub-300ms, and made the readiness ticks earn their colour. Mosh would have made sure the doctor sees exactly what the patient is about to receive, name-first, before they hit Approve. Pilot would have reconciled the two wait numbers on day one, because a trust device that contradicts itself is worse than no trust device at all.

## Acceptance Checklist

- [x] No high-severity findings
- [x] No shortcut hazards
- [x] No clipped decision text
- [x] Combined video score at or above 8/10

## DOM Evidence

Captured from `dom-evidence.json` for rendered-truth checks beside the frames.

- URL: http://localhost:3001/dashboard?showTestData=1&onlyTestData=1
- Title: Staff Dashboard | InstantMed
- Visible text excerpt: You're back online Skip to main content IM InstantMed DOCTOR CONSOLE TODAY Dashboard Requests Review Scripts 1 Patients 1 RUN Analytics Payments Ops SETUP Setup DA Dr Amelia Reid Admin + Doctor Dashboard Oldest wait 19m Updated 10s ago Test mode Available Test mode. Real patients are hidden. Hide test data Today's queue Form to inbox 10m · target under 2h 1 match All(1) Review(1) Info(0) Scripts to write(0) MC Mia Carter 35y • 20/06/1990 • Melbourne VIC Med Cert Claimed Medical certificate request Waiting 19m No one else waiting · target under 2h Mia Carter In Queue Waiting 19m Profile Full case Patient details First visit Identity details DOB 35y / 20/06/1990 Medicare 2123 45670 1 Phone [ph

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
