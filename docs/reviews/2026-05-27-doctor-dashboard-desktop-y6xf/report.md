---
runId: 2026-05-27-doctor-dashboard-desktop-y6xf
journey: Doctor dashboard desktop interaction audit (queue hover + review open)
url: http://localhost:3001
overallScore: 7
capturedAt: 2026-05-27T14:26:39.047Z
---

# A calm console with two CTAs fighting for the same click

The doctor console is doing the hard part well. Queue is honest, copy is operational, keyboard shortcuts are Linear-grade. The thing holding it back is the bottom of the review pane, where the decline button shouts as loudly as approve. Fix that and the "Next up" mismatch and you're at a 9.

## What's working

- The numeric spine is right where it should be. "Form to inbox 10m · target under 2h", "Oldest wait 1h 58m · Updated 10s ago", "Avg med cert today 10m". A doctor knows the state of the world in one glance.
- Empty states tell the truth. "No reviews completed today" instead of a padded chart.
- "Before you sign · Intake · Safety · Note · 3/3" earns the click above the primary CTA. Good friction.
- Keyboard shortcuts surfaced inline (Cmd+Enter, Cmd+Shift+D). Exactly what a doctor doing 40 reviews a day wants.
- "Saved as you type. Private until you send." Quiet, specific, trustworthy. Keep writing copy like this.

## What to fix, ranked

### 1. Decline competes with Approve at the bottom of the review pane

**Impact:** high · **Where:** `intake-review-panel`, action footer (around the 0:12 mark)

Both buttons sit at similar weight in a pink/ivory band. The destructive action should not look like a sibling of the primary. Demote "Decline and refund" to a tertiary text button aligned right, keep Cmd+Shift+D, and let the blue "Approve and send" own the slot. While you're in there, rewrite the confirmation line: "A decline refunds $25 to the patient." The current "Declining refunds $25..." reads as a noun on first pass.

### 2. "Next up" points at Mia but the button opens Andres

**Impact:** high · **Where:** right pane empty state (around 0:08)

Andres has been waiting 1h 58m. Mia has been waiting 15m. The right pane labels Mia as "Next up" yet the CTA opens Andres. On a triage console, ambiguity on the primary action is a bug. Either rename the button to match the named patient, or surface two: "Open oldest (Andres)" and "Open next (Mia)". Pick one rule and hold it.

### 3. The red "Oldest wait" alert keeps shouting after a case is open

**Impact:** medium · **Where:** dashboard header (visible from 0:01, still loud at 0:12)

When Mia's case is open, the global red badge is still pointing at Andres. Anxiety without action. Soften the badge when any case is open, or make it a one-click "Jump to oldest". A doctor mid-review shouldn't be nagged by a problem they can't address without losing context.

### 4. Default the collapsed sections to expanded on first open

**Impact:** medium · **Where:** Identity details, Patient answers (visible at 0:16)

The DOM has DOB, Medicare, phone, address, full symptom list. The frame shows section headers with "2 more facts" hiding most of it. Density is below Linear here. Default both to expanded on first open in a session; collapse only after the doctor has signed at least one case.

### 5. Andres meta line truncates with room to spare

**Impact:** low · **Where:** queue row (around 0:04)

"Brisbane …" truncates while there's whitespace between the text and the Verify identity pill. Let the meta line use the available width, or wrap the pill to a second row at narrow widths.

## Full critique by category

**Brand spine.** This is an internal surface, so the consumer warmth isn't expected. What's here is internally consistent with the patient-side speed promise: 10m form-to-inbox, 2h target, $25 refund mirrored as the decline cost. Gemini wanted a warm accent in the sidebar. Disagree. The clinical restraint is correct.

**Typography.** Hierarchy reads cleanly: H1, section heads, patient names, "10m" as the numeric anchor. Gemini flagged tight line-height in "Reason for visit". The DOM shows comfortable paragraph spacing, so this is closer to a model false positive than a real defect. Truncation on the Andres card is the real typography bug.

**Colour and surface.** Ivory canvas, white cards, restrained shadows. Status colour is well-used: red for oldest wait, amber for Verify identity, blue for In Queue. The one issue is at the bottom of the review pane, where decline gets a pink band that competes with approve. See fix #1.

**Motion.** Can't fully judge from frames. The list-to-detail swap doesn't shift surrounding chrome, and the "Updated Xs ago" tick is predictable. Gemini called the skeleton-to-loaded transition abrupt; worth a 200-300ms ease-out if you have the cycles, but not a priority over the action footer.

**Copy and voice.** Operational, dry, correct for the surface. "Private until sent", "Saved as you type", "target under 2h" all sound like a calm GP. The one grammar stumble is the decline confirmation line (see fix #1). Gemini also flagged "No else waiting — target under 2h" but that string doesn't appear in the captured DOM, so treat it as a model false positive.

**Hierarchy and layout.** Two-pane works. The eye path on case open is right: name → status → reason → CTA. Two real issues: the global oldest-wait alert competes with the open case (fix #3), and collapsible sections hide content the doctor needs on first read (fix #4).

**Conversion friction.** For this surface, conversion is time-to-sign. Keyboard shortcuts, the 3/3 sign checklist, and the named decision cost are all working. The "Next up" button mismatch is the one friction worth fixing today (fix #2).

**Signature devices.** Live wait counter, target framing, and the $25 decline note as the internal mirror of the patient refund promise. All present. Nothing to add.

## Reference frame

Linear would have already collapsed the duplicate red alerts into a single actionable affordance and would not let a destructive button sit at the same weight as a primary one. Stripe would have demoted decline to a text link and put the keyboard hint in muted grey beside Approve. Mosh isn't the right comparison for an internal console, but the calm copy register here is the same one Mosh uses with patients, which is the right thread to keep pulling. Fix the action footer and the "Next up" mismatch and this console sits comfortably next to the references.

## Acceptance Checklist

- [x] No high-severity findings
- [x] No shortcut hazards
- [ ] No clipped decision text
- [ ] Combined video score at or above 8/10

## DOM Evidence

Captured from `dom-evidence.json` for rendered-truth checks beside the frames.

- URL: http://localhost:3001/dashboard?showTestData=1
- Title: Staff Dashboard | InstantMed
- Visible text excerpt: You're back online Skip to main content IM InstantMed DOCTOR CONSOLE TODAY Dashboard Requests Review Scripts 1 Patients 1 RUN Analytics Payments Ops SETUP Setup DA Dr Amelia Reid Admin + Doctor Dashboard Oldest wait 1h 58m Updated 10s ago 4 waiting at intake Test mode Available Today's queue Form to inbox 10m · target under 2h All(2) Review(1) Info(0) Scripts to write(1) AB Andres Burgos 25y • 27/09/2000 • M • Brisbane QLD ED consult Awaiting script ED consult request Verify identity · Missing 1 Waiting 1h 58m MC Mia Carter 35y • 20/06/1990 • Melbourne VIC Med Cert You Selected Medical certificate request Waiting 15m 2 in the queue · target under 2h Mia Carter In Queue Waiting 15m Profile Fu

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
