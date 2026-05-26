---
runId: 2026-05-25-service-erectile-dysfunction-eoa9
journey: /erectile-dysfunction service landing long-scroll
url: http://localhost:3000
overallScore: 7
capturedAt: 2026-05-25T09:29:12.883Z
---

# Price up front, refund on the page, and the sticky bar still eats the screen

Trust lands fast. $49.95 sits next to the CTA, the refund promise is visible, and the copy skips the GP awkwardness without making a meal of it. The mobile experience is held back by a sticky footer that takes a fifth of the viewport and a hero headline that strands a single word on its own line.

## What's working

- $49.95 sits inline with the CTA. No clicks to find the price.
- "No account required" kills the obvious objection at the button.
- The live wait counter ("Avg response: ~44 min") gives the sticky bar a real job.
- "What we won't do" in the footer is the kind of honest link that earns trust.
- Warm off-white over clinical blue keeps it calm. Not sterile, not soft.
- Copy reads like a doctor wrote it. "We only interrupt you if something is missing" is the line of the page.

## What to fix, ranked

### 1. The sticky mobile footer eats 20% of the viewport

**Impact:** high · **Where:** mobile sticky CTA bar (visible around 0:08)

Two rows of metadata plus the button leaves almost nothing to read above it. Collapse the "2-min form" and "Avg response" line on scroll-down, keep the blue CTA. Bring the metadata back when the user scrolls up. Same trust signals, twice the reading window.

### 2. The hero headline orphans the word "visit." on mobile

**Impact:** medium · **Where:** H1, 375px viewport (around 0:01)

One word on its own line makes a $49.95 product look unfinished. Add `text-wrap: balance` to the H1, or a non-breaking space between "GP" and "visit." Five minutes of work.

### 3. The sidebar drawer slides in like it's 2014

**Impact:** low · **Where:** mobile nav drawer (around 0:26)

Linear easing on a premium telehealth page reads as default. Swap the timing function to `cubic-bezier(0.16, 1, 0.3, 1)` over 350ms. Small change, the whole nav feels considered.

## Full critique by category

**Brand spine (7).** The promise is clear and the price is honest. The mid-page sections lean on generic template patterns and lose the warmth the hero earns. Borrow a sentence or two from the copy voice and put a human face somewhere below the fold.

**Typography (7).** Plus Jakarta Sans is the right call. Editorial without being precious. The orphan on the H1 is the only thing standing between this and an 8.

**Motion (5).** Default transitions on the drawer. Everything else on the page is considered, so this one stands out.

**Hierarchy and layout (6).** Good flow, too much competing for the bottom of the screen on mobile. Fix the sticky bar and this moves to a 7.

## Reference frame

Pilot would have shipped the same price-on-the-button move, and they would have already collapsed the sticky bar on scroll. Mosh would have put a doctor's face and first name near the hero to warm up the mid-page. Linear would never have let that drawer ship with linear easing. Stripe would have balanced the H1 in the first design review. The bones here are competitive with all four. The polish is one sprint away.

## Frames

- [7s](frames/007s.png)
- [14s](frames/014s.png)
- [21s](frames/021s.png)
- [28s](frames/028s.png)
