---
runId: 2026-05-27-doctor-dashboard-desktop-2cmt
journey: Doctor dashboard desktop interaction audit (queue hover + review open)
url: http://localhost:3001
overallScore: 8
capturedAt: 2026-05-27T13:01:14.894Z
---

# The console is calm. The motion isn't.

The doctor side of the house is holding the brand promise: wait named, wait removed, ivory surface, blue reserved for the one CTA that matters. The damage is concentrated in two places: the right pane swap reads as a flash, and a few labels sound like product managers wrote them, not GPs.

## What's working

- The operational thesis lands. "Oldest wait 33m", "Form to inbox 10m · target under 2h", "Waiting 14m" on the selected card. The consumer promise has a back-of-house equivalent.
- Keyboard-first sign-off. Cmd+Enter to approve, Cmd+Shift+D to decline, 3/3 checks gate the primary CTA.
- Refund mechanic stated where the decision happens: "Decline returns $25 to the patient automatically." The marketing promise is honoured operationally.
- Ivory holds across every frame. Blue is used once. Amber only on wait warnings. No coral creep.

## What to fix, ranked

### 1. The right pane swap reads as a cut, not a transition

**Impact:** high · **Where:** `intake-review-panel`, content swap around 0:12 to 0:16

Between opening Mia Carter's case and the Clinical note appearing, the panel content swaps with no opacity or height animation. The Pre-flight checks row stays pinned while the body flashes. On a regulated surface, that flash undercuts the trust the rest of the page earns. Add a 200ms opacity plus 4px-y ease-out on the swapped block, animate height with FLIP, and respect `prefers-reduced-motion`. Both models flagged this independently and Claude's frame evidence is the more concrete read.

### 2. "Pre-flight checks" is aviation jargon on a medical surface

**Impact:** medium · **Where:** sticky action bar, around 0:12

A GP would not say "pre-flight checks" out loud before signing a certificate. Rename to "Before you sign" or "Safety checks". While you're in there: on hover or focus of each check, show who completed it and when. The audit trail is the trust signal on a regulated action, and right now the three green ticks are unattributed.

### 3. The "Available" toggle out-shouts the primary CTA

**Impact:** medium · **Where:** top status bar, visible from 0:04

The saturated green track on the Available switch is the loudest pixel on the page. Louder than the H1, louder than "Approve & send". Drop to a sage or teal track, or let the status dot carry the signal and calm the track. Then group Test mode and Available into one status cluster so the top bar stops competing with the page title.

### 4. Patient details duplicates the queue row and pushes Reason for visit down

**Impact:** medium · **Where:** review pane, around 0:12

Age, DOB, location all appear in the queue card and again in Patient details. On a 13-inch laptop that pushes "Reason for visit" (the only thing the doctor actually needs in the first three seconds) below the fold. Collapse Patient details to a one-line summary with an expand affordance. Lead the pane with Reason for visit.

### 5. Approve has no undo, Decline has a confirm

**Impact:** medium · **Where:** sticky action bar, around 0:16

Cmd+Enter fires Approve & send instantly. Decline asks for confirmation. The asymmetry is backwards: the irreversible regulated action should be the one with a recovery path. Skip the modal. Add a 2-second undo toast after Approve. Keeps the speed, recovers the mis-click.

## Full critique by category

**Typography (8/10).** Hierarchy is clean. Patient name anchors, labels in muted caps, values in regular weight. One nit: the "In Queue" pill and "Waiting 14m" status sit at the same weight as section labels and nibble attention away from the H1. Drop the pill to xs/medium and lighten the wait text to a tertiary tone.

**Colour and surface (8/10).** Warm ivory holds, blue is rationed, amber only signals wait. The skeleton loader Gemini flagged uses a cool grey that breaks the warmth. Move it to a warm grey tint (around #EAE9E4) so loading states stop looking borrowed from another product.

**Motion (5/10).** This is the weak category. Selected queue card has no left rail accent or lift to confirm selection on a list this short. Pane swap is a cut. Both judges agree, frames confirm. Fix the swap first, then add the selection treatment.

**Copy voice (7/10).** Mostly on-brand: "Form to inbox. Target under 2h." and "Confirm first. Decline returns $25 to the patient automatically." Two snags. "Pre-flight checks" (covered above). And "What the patient told **us**" uses first person plural while the rest of the surface uses second person ("You" chip, "Open Andres"). Switch to "What the patient told you" or "Patient's words". Also drop the redundant "Draft note" subtitle under Clinical note, or swap it for "Saved 12s ago".

**Hierarchy and layout (8/10).** Dual-column rhythm works, eye lands on queue then SLA within two seconds. Top bar is too chip-dense though: Oldest wait, Waiting at intake, Test mode, Available, Updated 10s ago, all competing with the H1. Group them, demote "Updated just now" to a tooltip.

**Conversion friction (8/10).** This is the time-to-decision surface, not a checkout. Strong gating, strong keyboard story, refund mechanic visible. See ranked fix 5 for the undo asymmetry.

**Signature devices (6/10).** The wait counter is the strongest brand touchpoint on the surface. But "Next up · Waiting 33m" doesn't surface SLA breach risk against the 2h target. Add a "Due in 1h 27m" sub-label per queue item, amber under 30m, red at breach. The "2 reviews completed today" counter is flat. Replace with a today-vs-target stat that mirrors the public "while you wait" specificity. Something like "Avg time to decision today: 6m".

## Reference frame

Linear would have fixed the pane swap before shipping; that single motion gap is what keeps this surface at 8 instead of 9. Stripe would have collapsed the top status bar into one cluster and let the H1 breathe. Mosh would have rewritten "Pre-flight checks" on instinct, and would never have used "us" and "you" on the same screen. Pilot would have built the undo toast on Approve before the confirm modal on Decline. None of these are large pieces of work. They're the difference between a competent clinical console and one that feels like the brand built it on purpose.

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
