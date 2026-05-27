---
runId: 2026-05-27-doctor-dashboard-desktop-4j2e
journey: Doctor dashboard desktop interaction audit (queue hover + review open)
url: http://localhost:3001
overallScore: 8
capturedAt: 2026-05-27T19:59:43.729Z
---

# A composed doctor console. Fix the layout jump and you've got Linear-grade.

This is a quiet, confident surface. Wait counter up top, queue left, case right, refund line at the CTA, keyboard shortcut on the primary button. The work to do is small and specific: kill the height jump between skeleton and loaded state, and make the most operational number on the page actually pop when time runs out.

## What's working

- The wait counter sells itself. "Oldest wait 1h 15m · Updated 40s ago · 1 case waiting · 45m to target" does the job of three dashboards.
- "Full refund if we can't help. Declining this case refunds $25 to the patient automatically." sits where the decision is made. Exactly right.
- Cmd+Enter on Approve, surfaced inline. A fast operator notices this immediately.
- Restrained palette. Ivory canvas, white cards, blue for primary, amber for test mode. No colour creep.
- "Buttons enable when answers load." Tiny copy that reads like a person wrote it.

## What to fix, ranked

### 1. Reserve the case-pane height so the panel stops growing on load

**Impact:** high · **Where:** `intake-review-panel`, skeleton state around 0:08 into the loaded state at 0:16

The skeleton state is the right call. The problem is that when answers arrive, the right pane physically grows as Patient details, Reason for visit, Patient answers and footer appear in sequence. On every case open, the doctor sees the layout expand. Reserve the final card heights with correctly-sized skeleton blocks and fade content in. The motion goes from mechanical to invisible.

### 2. Prefetch on hover. Promote "Open next case" into the header.

**Impact:** high · **Where:** queue row hover, header strip

The Approve button is disabled while answers load. On a 14-minute SLA, that dead time is real. Prefetch patient answers on queue-row hover so by the time the doctor clicks, the case is live. Then add a primary "Open next: E2E Test Patient · 1h 15m" action in the header strip next to the wait counter. The job-to-be-done is "start the next case", so put it where the eye already lands.

### 3. Make "45m to target" a status token. Take coral off the Decline label.

**Impact:** medium · **Where:** wait-counter meta row, sticky footer at 0:16

"45m to target" is the most actionable number on the page when it goes red. Right now it sits in the meta row at the same weight as everything else. Treat it as a three-state token: green above 30m, amber 10 to 30m, red under 10m. Separately, "Decline & refund" is rendered in coral. Coral is for brand-recognition moments, not destructive actions. Move Decline to a muted slate with a distinct warning red on hover.

### 4. Lift the weight of patient identifiers

**Impact:** medium · **Where:** Patient details row at 0:16

DOB, Medicare and Phone sit as inline label/value pairs at low weight and low contrast. A doctor verifying Medicare under screen glare shouldn't have to lean in. Either bump labels to weight 500 in a muted slate with values in default ink, or stack label-above-value to match the Patient answers grid directly below. Consistency does half the work.

## Full critique by category

**Brand spine (7).** This is an internal surface, so the consumer voice isn't expected here. The operational spine ("Faster than your GP") shows up in the wait counter and the median pace line. Fair. A small wordmark next to "Doctor Console" would help a sibling product feel like family, but it's a low-priority polish.

**Typography (7).** Clean hierarchy. "1h 15m" lands first. Tabular numerals on the metric cards is the right call. Two snags: patient identifiers blur into themselves, and the zero on "Today's pace" reads ambiguous without a unit. "0 cases" or a de-emphasised zero solves it.

**Colour and surface (8).** Stripe-grade restraint. The one issue is coral being used on the Decline label, which dilutes the brand accent. The Available toggle's green also sits outside the system palette. Define a single status green token or render the on-state in system blue.

**Motion (6).** The skeleton-to-loaded transition is the only obvious defect. Fix the reserved height and this category lifts to an 8. The live wait counter would benefit from a subtle pulse on the orange dot, gated by `useReducedMotion`. Small touch, makes "live" feel physical.

**Copy voice (9).** Calm, operational, no jargon. "Full refund if we can't help" is exactly the merchandised promise delivered plainly. Two micro-notes: "Hide test data" reads slightly product-y next to the warmer banner sentence ("Dismiss" works better), and the three tick circles next to "All checks passed" duplicate the sentence. Give the ticks hover labels (ID, Medicare, Red flags) so each one earns its place, or drop them.

**Hierarchy and layout (7).** Two-pane split is correct. The eye path works. The drag is that "Review note / Profile / Full case" are three peer bordered buttons top-right, competing with the bottom-right primary CTA. Demote two to text links or an overflow menu so "Approve and send" clearly owns primary.

**Conversion friction (8).** Low friction on the doctor path. The shortcut inconsistency is worth a tidy: Cmd+Enter sits on the Approve button, Cmd+Shift+D sits inline next to Decline. Pick one pattern.

**Signature devices (7).** The live wait counter and median pace are doing real work. "45m to target" deserves to be promoted to a status token, as above. Everything else expected on this surface is correctly absent.

## Reference frame

Stripe Dashboard is the closest cousin and the bar this surface is already clearing on restraint. Linear is the cousin to learn from on hover-prefetch and on collapsing peer actions into a single primary path. Mosh's warmth doesn't belong on an internal console, and Pilot's CTA confidence is already present in the sticky footer. Ship the height fix and the prefetch, and this stops being a competent clinical tool and starts being a workspace doctors prefer.

## Acceptance Checklist

- [x] No high-severity findings
- [x] No shortcut hazards
- [x] No clipped decision text
- [x] Combined video score at or above 8/10

## DOM Evidence

Captured from `dom-evidence.json` for rendered-truth checks beside the frames.

- URL: http://localhost:3001/dashboard?showTestData=1&onlyTestData=1
- Title: Staff Dashboard | InstantMed
- Visible text excerpt: You're back online Skip to main content IM InstantMed DOCTOR CONSOLE TODAY Dashboard Requests Review Scripts 1 Patients 1 RUN Analytics Payments Ops SETUP Setup DE Dr. E2E Operator Admin + Doctor Dashboard Oldest wait 1h 15m Updated 40s ago · 1 case waiting · 45m to target Median today 10m form to inbox · under 2h Available Test mode. Real patients are hidden. Hide test data Today's queue Median today 10m form to inbox · target under 2h 1 match All(1) Review(1) Info(0) Scripts to write(0) ET E2E Test Patient 35y • 20/06/1990 • Melbourne VIC E2E Cert Claimed Medical certificate request Waiting 1h 15m E2E Test Patient In Queue Waiting 1h 15m Review note Profile Full case Patient details First 

- Staff sidebar: IMInstantMedDoctor consoleTodayDashboardRequestsReviewScripts1Patients1RunAnalyticsPaymentsOpsSetupSetupDEDr. E2E OperatorAdmin + Doctor
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
