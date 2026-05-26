---
runId: 2026-05-25-service-prescriptions-6xwj
journey: /prescriptions service landing long-scroll
url: http://localhost:3000
overallScore: 9
capturedAt: 2026-05-25T09:57:55.867Z
---

# The 44-minute wait counter is doing real work

The prescriptions page reads like a doctor wrote it, not a marketer. Price is upfront, the refund promise is in plain sight, and AHPRA, PBS and eScripts get named without fuss. Three small polish jobs stand between this and best-in-class.

## What's working

- Hero promise lands in one breath: prescription without the waiting room.
- The sticky bottom bar showing average response at 44 minutes. Quiet, specific, persuasive.
- Copy uses Australian terms a patient actually recognises. No hype, no jargon.
- "No account required" anchor removes the last excuse to bounce.
- Type pairing (Plus Jakarta Sans over Source Sans 3) holds up across the scroll.

## What to fix, ranked

### 1. Calm the card borders in the "Common areas we can review" grid

**Impact:** medium · **Where:** the conditions grid (around the 0:17 mark)

Pink, yellow, green and teal borders on the same row pull focus away from the ivory spine. Drop the borders to a soft neutral and let the icons carry the colour. The page will feel more like a clinic and less like a pamphlet.

### 2. Stop the hero phone mockup cropping on 375px

**Impact:** medium · **Where:** hero eScript mockup (around the 0:04 mark)

The phone showing the eScript token is clipped on the right margin on narrow mobiles. First thing a visitor sees, and it lands half-off-screen. Tighten the responsive container so the mockup scales inside a 375px viewport.

### 3. Give the drawer menu a softer landing

**Impact:** low · **Where:** mobile side drawer (around the 0:35 mark)

The drawer slides in on a flat linear curve. Swap it for an ease-out cubic-bezier (0.16, 1, 0.3, 1) or a light spring. Small detail, but it's the difference between feeling mechanical and feeling considered.

## Full critique by category

**Color and surface.** Ivory base is the right call. The grid section breaks the calm with four different border hues. Pull them back to one neutral.

**Motion.** Smooth enough, but the easing is stock. A single curve change on the drawer would lift the whole page.

**Hierarchy and layout.** Clean rhythm, generous spacing. Only the hero mockup misbehaves on narrow screens.

## Reference frame

Mosh would have shipped this and slept fine. Pilot would lean harder on the 44-minute counter, probably pull it into the hero. Linear would have already fixed the drawer easing before merge. Stripe would have caught the mobile crop in design review. None of them would have let four border colours into the same grid.

## Frames

- [7s](frames/007s.png)
- [14s](frames/014s.png)
- [21s](frames/021s.png)
- [28s](frames/028s.png)
- [35s](frames/035s.png)
