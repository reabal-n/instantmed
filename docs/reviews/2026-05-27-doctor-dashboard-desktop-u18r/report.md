---
runId: 2026-05-27-doctor-dashboard-desktop-u18r
journey: Doctor dashboard desktop interaction audit (queue hover + review open)
url: http://localhost:3001
overallScore: 8
capturedAt: 2026-05-27T09:59:54.005Z
---

# A doctor's console that respects the clock, with a few signals still hiding from the action

The console reads like Linear adjacent: ivory surface, restrained palette, queue on the left, case on the right, keyboard shortcuts in plain sight. The bones are right. Where it leaks is the last 500 pixels between "ready to approve" and the Approve button itself.

## What's working

- The brand spine for clinicians is speed made legible: "Oldest wait 15m · Updated 10s ago", "Avg med cert today 10m", "target under 2h". That is the operator analogue of "Faster than your GP."
- Copy is calm and Australian. "No one else waiting · target under 2h" is exactly the tone.
- Money named in the first breath: "Refunds $25.00 automatically on decline."
- Cmd+Enter and Cmd+Shift+D surfaced inline. Right call for a 14-minute target.
- Red is reserved for Decline, blue for Approve. Semantic, not decorative.

## What to fix, ranked

### 1. The readiness signal is 500px from the action it gates

**Impact:** high · **Where:** intake-review-panel, operator-action-rail (around the 0:08 mark)

"Details complete · Note ready" sits top-right of the patient card. Approve & send sits at the bottom of the action rail. The doctor has to scan up to confirm the green light, then back down to act. Mirror those two checks beside the Approve button so the all-clear lives with the click. While you're there, check the Approve button's enabled state at 0:08: it reads dimmed even when all data is present. If it is enabled, brighten it. If it is gated, name the gate ("Add a clinical note to approve").

### 2. Decline & refund is sharing visual weight with Approve

**Impact:** medium · **Where:** operator-action-rail (around 0:12)

Both buttons have icons, both have shortcuts, both pull the eye equally. Decline is the rarer, higher-consequence path and should not compete with the primary one. Demote it to a tertiary text button, keep the red on the icon, keep Cmd+Shift+D visible on hover. The refund-amount line stays where it is.

### 3. The "Oldest wait" dot cries wolf

**Impact:** medium · **Where:** top bar status pill (around 0:04)

An orange dot on a 15m wait against a 2h target reads as a warning when nothing is wrong. Tie the dot to the threshold: green under 50%, amber 50 to 80%, red over 80%. And render "Updated Xs ago" from first paint, even if it says "just now". The liveness label is the proof the number is real, so it should never be missing.

### 4. "Reason for visit" disappears when the note opens

**Impact:** medium · **Where:** Case summary transition between 0:08 and 0:12

Once the SOAP note expands, the reason paragraph is gone. A doctor mid-note may still want that context. Persist it as a collapsed strip above the note, or fold it into the "2 more facts" disclosure so it reads as tucked away, not deleted.

## Full critique by category

**Typography.** Hierarchy is clean: Dashboard, then Today's queue, then the patient row. Labels are quiet uppercase, values lead with weight. One nit: "Patient details / Identity and notes" double-stacks a heading with a subtitle that adds nothing. Drop the subtitle or replace it with a status line like "First visit · details complete".

**Colour and surface.** Ivory holds across every frame. Cards are solid white. Gemini flagged the draft note as muddy; the DOM shows it sitting on the same surface as the rest of the case card, so we're treating that as a model false positive. Real issue is the orange threshold dot (see above), not the card colour.

**Motion.** Cannot fully judge from the capture, but the 0:08 to 0:12 transition (intake summary collapsing as the note expands) is a meaningful state change. If the easing is currently a hard swap, give it 300ms ease-out so it feels physical rather than instant.

**Copy voice.** Strong. Two tightens worth shipping. "Auto-saves as you type. Only you can see this note until you send" becomes "Saved as you type. Private until you send." And the "In Queue" chip next to the patient name reads system-y. Use "Waiting" to match the timer two lines down, or drop the chip entirely.

**Hierarchy and layout.** Two-pane works. Eye lands on the patient row, then Approve & send, inside two seconds. Two cleanups: the "Issue sign-off: Dr Amelia Reid · MED0001234567" line sits inside the note card but belongs to the certificate. Give it a divider and a "Signed by" label, or move it into the facts grid. And hide "Next up: Mia waiting 15m" on the right rail when the queue length is 1, it duplicates the only row on screen.

**Signature devices.** The live wait counter, the "based on 7 certs sent in the last 7 days" anchor, the named refund amount: all the marketing devices have operator analogues here and they land. The "10m · Form to inbox" KPI is a number without a shape. A 7-day micro-sparkline under it, same data source as the "7 certs" line, would give it a story.

## Reference frame

Linear would have already shipped the easing on the note expand and the threshold-aware status dot, and they would not let Approve render in a dimmed state when it is live. Stripe would have moved the readiness checks to sit with the action and given the KPI a sparkline. Mosh would have softened the "In Queue" chip to plain language. Pilot would have demoted Decline to a text button without thinking twice. The console is closer to that bar than most internal tools get; it is the last 10% that separates "clean" from "quietly excellent".

## Acceptance Checklist

- [x] No high-severity findings
- [x] No shortcut hazards
- [x] No clipped decision text
- [x] Combined video score at or above 8/10

## Frames

- [4s](frames/004s.png)
- [8s](frames/008s.png)
- [12s](frames/012s.png)
- [16s](frames/016s.png)
