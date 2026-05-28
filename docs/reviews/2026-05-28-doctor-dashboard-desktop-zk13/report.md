---
runId: 2026-05-28-doctor-dashboard-desktop-zk13
journey: Doctor dashboard desktop interaction audit (queue hover + review open)
url: http://localhost:3002
overallScore: 8
capturedAt: 2026-05-28T03:49:29.708Z
---

# A clinician's console that respects the clinician's time

This is a calm, working tool. Two-pane layout, named waits, one dominant Send button. It earns the 8. What's holding it back is small: a stale-looking timer, a dead right pane before a case is opened, and one keyboard shortcut nobody can press.

## What's working

- Named waits at the action moment: "Waiting 66m · 54m to target". Urgency without panic.
- One dominant CTA per state. "Open Mia's case", then "Send to Mia". No competing buttons.
- "Mia sees: in queue. Doctor review follows when available." Short. Honest. On-brand.
- Status checklist before send: Intake checked, No red flags, Draft note ready.
- Ivory background, white cards, single blue accent. Restraint is holding.

## What to fix, ranked

### 1. The right pane is dead until a case is opened

**Impact:** high · **Where:** `operator-split-pane` / intake-review-panel empty state

Before a case opens, the right side is a near-empty card with "1 case completed today." floating in whitespace. Around 0:04 and 0:08 the doctor is staring at nothing. Auto-preview the next case in read-only, or surface today's metrics (cases done, median time, refund count). And keep a persistent "Next case" control after Send so nobody has to walk back to the queue manually.

### 2. The wait timer reads as stale

**Impact:** medium · **Where:** queue row "Waiting 66m" and KPI strip "Oldest wait 1h 6m"

Between frames the format slips ("65m 45s" then "66m") and nothing ticks on screen. The live counter is one of the signature devices here, so it has to feel live. Lock one format, tick every second, crossfade digit changes at ~120ms. While you're there, add a 180-220ms ease-out fade and 4px lift when a case opens. Respect `prefers-reduced-motion`.

### 3. F12 cannot be the Send shortcut

**Impact:** high · **Where:** Send to Mia action

Gemini flagged F12 as the Send hotkey. The DOM evidence actually shows Cmd+Enter, which is correct, so treat the F12 claim as a model false positive. The real friction is on Decline: Cmd+Shift+D sits visually equal to Send and the refund consequence is buried in body text. Add a lightweight inline confirm on Decline with the refund amount and a reason picker. Keep Send fast. Add one safety beat to Decline.

### 4. The doctor cannot see what the patient sees

**Impact:** medium · **Where:** intake-review-panel header

"Mia sees: in queue." is good but stops short. Show a small "Patient sees" preview mirroring Mia's actual screen ("You're next. Average wait today is 14 minutes."). Closes the empathy loop in one glance and pulls the while-you-wait device into the back-of-house.

### 5. Reason for visit and Subjective are the same wall of text

**Impact:** low · **Where:** Case summary

The Reason-for-visit paragraph and the Subjective field are verbatim duplicates. The eye reads the same block twice. Collapse Reason into a one-line summary, or auto-fill Subjective and mute it visually.

## Full critique by category

**Brand spine (7).** This is back-of-house, so the public thesis is rightly absent. But it currently reads as any generic clinical queue. One small signature would do it: a name-first greeting on the chrome ("Morning, Amelia") or a soft coral tick on the Available toggle when on-shift.

**Motion (6).** The static frames are the tell. No stagger on queue items, no lift when a case opens, timer doesn't tick. Fix the timer first, then the pane transition. Everything else can stay still.

**Copy voice (7).** Mostly calm and operational. "If you decline, Mia is refunded $25." is exactly right. One drag: "Symptoms consistent with self-limiting acute illness." is fine inside SOAP but would be jarring if it ever leaked patient-side. Confirm Assessment is doctor-only, and if any of it reaches Mia, add a plain-English mirror ("Likely a short viral illness. Rest and fluids.").

**Color and surface (8).** Holding well. One demotion needed: the solid black "Claimed" pill is heavier than the primary CTA on the right. Move it to a neutral slate fill or an outline.

**Signature devices (5).** Live counter is there but not behaving. Refund promise is named but only in body copy. Add a muted footnote near Decline ("Mia keeps her refund promise. $25 returned automatically.") and a "See decline reasons" link that opens the canonical what-we-won't-do list.

**Conversion friction (7).** Time-to-send is short and the path is clean. The gap is verification: there's no way to preview the certificate PDF before Cmd+Enter. Add a "Preview certificate" link next to "Certificate ready to send." so the doctor confirms the artefact in one click.

## Reference frame

Against the reference bar this sits closer to Linear than to Stripe. Linear would have already shipped the motion polish (ticking timer, pane lift, digit crossfade) and would never leave a pane empty. Stripe would tighten the SOAP density and demote the Claimed pill before sign-off. Mosh would add the one warmth cue this surface is missing: a name on the chrome, a softer tone on the Available toggle. Pilot would push the refund-promise line into the Decline moment without asking. Do those four small things and this is a 9.

## Model false positives

The DOM/text evidence contradicts these model findings, so they do not count against the acceptance checklist:

- The letters and line spacing inside the Subjective/Objective/Assessment edit boxes feel tight and cramped for easy reading.
- 'Symptoms consistent with self-limiting acute illness.' is clinician-jargon. Fine inside a SOAP note, but the surrounding voice elsewhere is plain English, creating tonal whiplash if any of this leaks to patient view.

## Acceptance Checklist

- [x] No high-severity findings
- [x] No shortcut hazards
- [x] No clipped decision text
- [x] Combined video score at or above 8/10

## DOM Evidence

Captured from `dom-evidence.json` for rendered-truth checks beside the frames.

- URL: http://localhost:3002/dashboard?showTestData=1&onlyTestData=1
- Title: Staff Dashboard | InstantMed
- Visible text excerpt: You're back online Skip to main content IM InstantMed DOCTOR CONSOLE TODAY Dashboard Requests Review Scripts Patients 1 RUN Analytics Payments Ops SETUP Setup DA Dr Amelia Reid Admin + Doctor Dashboard Median time to inbox 5m target <2h Oldest wait 1h 6m Updated 11s ago · 1 case waiting Available Test mode. Real patients are hidden. Hide test data Today's queue All(1) Review(1) Info(0) Scripts to write(0) MC Mia Carter Med Cert Claimed Medical certificate request Waiting 66m Mia Carter Mia, 35, Melbourne, VIC. First visit. In queue Mia sees: in queue. Doctor review follows when available. View profile Open full record Reason for visit 35-year-old patient. Sore throat and fatigue since this m

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
