---
runId: 2026-05-25-service-medical-certificate-mqaw
journey: /medical-certificate service landing long-scroll
url: http://localhost:3000
overallScore: 7
capturedAt: 2026-05-25T09:26:08.695Z
---

# The page sells trust. The sticky bar undersells the price.

The landing reads like a clinic that knows what it's doing. Calm, clear, priced upfront. One bug breaks the spell: pick a 2 or 3-day certificate and the sticky CTA still says $19.95.

## What's working

- "Telehealth without the small talk" lands in the first five seconds.
- Pricing shows up early. No hunting.
- The certificate preview card, doctor signature, and "what we won't do" link all do real trust work.
- Plus Jakarta Sans on warm ivory feels clinical without feeling cold.

## What to fix, ranked

### 1. The sticky price doesn't match the page

**Impact:** high · **Where:** sticky CTA footer

Tap 2 days ($29.95) or 3 days ($39.95) and the footer button keeps showing $19.95 (around the 0:11 mark). That's the kind of thing a patient notices at checkout and bounces from. Bind the footer price to the active day selector. Same state, same number, everywhere.

### 2. The live wait counter is hiding

**Impact:** medium · **Where:** hero and sticky footer

"Avg response: ~44 min" is the most persuasive thing on the page and it's buried in low-contrast text in the footer ticker (see frame at 0:07). Pull it under the hero CTA as a micro-badge. Bump the footer text to at least 11px on solid white. Let the number do its job.

### 3. The "~20 min" vs "~44 min" mismatch

**Impact:** medium · **Where:** comparison list and sticky ticker

The comparison list at 0:07 promises ~20 min while the live ticker shows ~44 min. Both can be true, but the page doesn't say so. Label one as "doctor review time" and the other as "total turnaround" or drop one entirely.

## Full critique by category

**Brand spine (8).** The voice is set in the first breath. Trust signals land without being shouted. Just resolve the two timing numbers so they tell the same story.

**Typography (7).** The type system is well chosen. The sticky ticker undoes the rest of the work by going too small and too gray on blue.

**Colour and surface (8).** Ivory and white play nicely. The compliance logos in the gray footer block (around 0:27) are washed out. Lift the asset opacity or change the strip background.

**Motion (6).** The sidebar slides like a 2015 dropdown (0:33). Swap the default transition for `cubic-bezier(0.16, 1, 0.3, 1)` at 320ms and it'll feel like the rest of the page.

**Copy voice (8).** Clean and uncluttered. The "Most patients are trying to avoid a waiting room, not decode a health platform" line (0:19) talks about the page instead of the patient. Replace with "Straightforward fees, no surprises."

**Hierarchy and layout (7).** Scroll rhythm is fine until the multi-day selector at 0:10, where two start CTAs sit next to each other on a 375px viewport. Collapse to one segmented control with one button beneath it.

**Conversion friction (8).** Pricing is anchored early, the next step is obvious. The sticky price bug is the only thing standing between this and a 9.

**Signature devices (8).** The live counter, the doctor signature, the "what we won't do" link. All good. Give the counter the hero placement it deserves.

## Reference frame

Mosh would put the wait counter directly under the CTA in a serif callout and own it. Pilot would tighten the pricing block into a single segmented control with one button and never let the footer price drift from the page price. Linear would fix the sidebar easing in the first week and never speak of it. Stripe would resolve the ~20 vs ~44 minute story with one line of labelled microcopy and move on. This page is closer to that bar than the 7 suggests. Fix the sticky price and it's an 8.

## Frames

- [7s](frames/007s.png)
- [14s](frames/014s.png)
- [21s](frames/021s.png)
- [28s](frames/028s.png)
