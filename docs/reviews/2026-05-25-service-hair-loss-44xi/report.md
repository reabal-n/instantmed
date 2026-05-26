---
runId: 2026-05-25-service-hair-loss-44xi
journey: /hair-loss service landing long-scroll
url: http://localhost:3000
overallScore: 9
capturedAt: 2026-05-25T09:30:38.372Z
---

# The page is doing its job. Three small finishes left.

A real doctor reviews it, the price sits next to the button, and the AHPRA badge does its work without shouting. This is close to shippable. What's left is polish: a softer step animation, a touch more breathing room on mobile, and a comparison table that behaves on a small phone.

## What's working

- Hero leads with the verdict, not the methodology. Pricing visible at the first scroll.
- AHPRA and ADHA badges sit where the eye lands, not buried in the footer.
- Sticky bar stays useful the whole way down. Never gets in the way.
- The handwritten doctor's signature in the footer earns its keep.
- Copy sounds like a GP, not a brand team.

## What to fix, ranked

### 1. Smooth the step card animation

**Impact:** medium · **Where:** `components/StepsCard.tsx`

The checkmarks pop in around the 0:05 mark. It reads as a state flip, not a process. A 200ms ease-in-out on opacity and scale fixes it. Small change, big difference in how finished the page feels.

### 2. Stack the comparison table under 375px

**Impact:** medium · **Where:** `ComparisonSection`

Around 0:10 the columns get squeezed and the copy breaks awkwardly. Stack vertically on the smallest phones. Anyone reading on an old iPhone SE deserves a fair look at the comparison.

### 3. Loosen the body copy on mobile

**Impact:** low · **Where:** `components/Hero.tsx`

At 0:02 the hero paragraph runs tight on narrow screens. Push line-height to 1.5rem below 640px. The compliance lines need to be easy to scan, not endured.

## Full critique by category

**Typography.** Plus Jakarta Sans is doing exactly what we hired it for. Headlines have scale, the hierarchy is clean. Only the hero paragraph wants more air on small screens.

**Motion.** Layout transitions are calm. The one weak link is the step card state change. Fix that and the whole page reads as one piece.

**Hierarchy and layout.** Rhythm is good and the sticky bar holds up. The comparison table is the one block that doesn't survive the smallest viewport.

## Reference frame

This sits comfortably next to Pilot and Stripe. Pilot would probably tighten the sticky bar copy by another two words and trust the user more. Stripe would have caught the comparison table on a 320px viewport in code review. Mosh would shoot the doctor's signature as a short video loop rather than a static mark. None of those are wrong calls. None of them block shipping this.

## Frames

- [7s](frames/007s.png)
- [14s](frames/014s.png)
- [21s](frames/021s.png)
- [28s](frames/028s.png)
