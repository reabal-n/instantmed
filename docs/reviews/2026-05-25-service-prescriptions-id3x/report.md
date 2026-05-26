---
runId: 2026-05-25-service-prescriptions-id3x
journey: /prescriptions service landing long-scroll
url: http://localhost:3000
overallScore: 6
capturedAt: 2026-05-25T09:27:49.480Z
---

# The sticky footer says "Avg response: -44 min". Fix that today.

A real doctor reviews this page, and pricing lands in the first scroll. Good bones. But there's a maths bug in the footer telling every visitor the response time is negative, and the surfaces still feel like a clinic waiting room instead of a kitchen table. Fix three things and this jumps from a 6 to an 8.

## What's working

- Price shows up in the first breath. No hunting.
- Money-back guarantee sits next to the buttons, where it belongs.
- The handwritten doctor signature in the footer reads human, not corporate.
- 375px layout holds together. CTA is where the thumb lands.

## What to fix, ranked

### 1. The sticky footer is showing negative minutes

**Impact:** high · **Where:** sticky footer wait-time estimator (visible around 0:10)

"Avg response: -44 min" rides along the entire scroll. A medical service cannot ship a broken number on every page. Wrap the calc in `Math.abs()` or guard the render until you have a real value. Until that's fixed, nothing else on this page matters.

### 2. The New Prescription card has no button

**Impact:** high · **Where:** pricing tier cards (around 0:11)

The Repeat card has a CTA. The New Prescription card does not. Half the visitors hit a dead end. Add an outline "Get started" button inside the New Prescription card so both paths move forward.

### 3. The background is too clinical

**Impact:** medium · **Where:** global body, hero (from 0:04)

The cold blue-grey gradient reads like a hospital intranet. Set the body to warm ivory (#F8F7F4). It's a one-line change that takes the edge off and stops the page feeling like a template.

## Full critique by category

**Colour and surface (5/10).** Beyond the ivory swap, the condition grid leans on pink, orange and green gradient borders that fight the rest of the palette. Drop them to a uniform light grey or a soft sky shadow. Save the brand colours for buttons you actually want pressed.

**Copy and voice (5/10).** The copy is plain and the pricing is honest. The score is dragged down entirely by the negative-minutes bug. Fix the number, the score moves up on its own.

**Motion (4/10).** The side drawer slides in on a linear curve and lands with a thud. Swap to `transform 350ms cubic-bezier(0.16, 1, 0.3, 1)`. That's the iOS sheet feel. Cheap to add, expensive to skip.

**Hierarchy and layout (7/10).** The trust pills ("No appointment", "Secure form first") wear arrow icons and heavy borders, so they look clickable. They aren't. Strip the arrows and borders so labels read as labels.

**Typography (7/10).** Jakarta and Source Sans 3 hold up. The repeat-scripts alert card is too tight. Push line-height to 1.5rem and add 12px under the heading.

**Signature devices (6/10).** The doctor signature is good. The time-saved comparison table is static when it pretends to be live. Pull in a city-aware line ("Estimated GP wait in Sydney today") and let the comparison do real work.

**Brand spine (6/10).** Trust anchors are present. The warmth isn't. Mosh would feel like a friend texting you back. This feels like a portal.

## Reference frame

Mosh would warm the whole canvas, soften the type, and write the sticky bar like a person ("A doctor's online now"). Pilot would tighten the pricing grid, give both tiers identical CTAs, and never ship a negative number to production. Linear would have caught the `-44 min` bug in CI. Stripe would have made the trust pills visually quieter and let the price do the talking. The page is closer to all four than the score suggests. Three fixes is the gap.

## Frames

- [7s](frames/007s.png)
- [14s](frames/014s.png)
- [21s](frames/021s.png)
- [28s](frames/028s.png)
- [35s](frames/035s.png)
