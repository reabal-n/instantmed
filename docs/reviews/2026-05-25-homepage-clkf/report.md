---
runId: 2026-05-25-homepage-clkf
journey: Homepage long-scroll + nav tour
url: http://localhost:3000
overallScore: 8
capturedAt: 2026-05-25T10:08:49.785Z
---

# The homepage holds up. Fix the first half-second.

The page does the job. Pricing is upfront, the doctor count is live, and the risk reversal sits where the eye lands. The only real wound is cosmetic, and it happens before the visitor has read a word.

## What's working

- "Faster than your GP" lands hard and gets backed up by AHPRA, Medicare, and Stripe in the same eyeline.
- Interactive form preview in the hero. People tap it. That's trust you cannot fake with a stock photo.
- Pricing sits on every condition card. No "from $X" hedging.
- "What we won't do" link. Honest in a category that rarely is.
- The ivory surface reads clinical without going cold. Blue CTAs cut through.

## What to fix, ranked

### 1. The hero headline clips on first paint

**Impact:** medium · **Where:** hero container, homepage

Around the 0:00 mark, "Faster than your GP" jumps as the page settles. First impression, first frame, first wobble. Lock the hero with a min-height and proper font-display so nothing reflows once the webfont arrives. This is the easiest trust win on the page.

### 2. "Most popular" badge is crowding the Medical Certificates card

**Impact:** low · **Where:** services grid, mobile

At 0:05 the overflow badge sits almost on the top edge of the card. Add top padding to the card so the badge has somewhere to breathe. Two minutes of work.

### 3. Theme toggle in the drawer is a small target

**Impact:** low · **Where:** mobile nav drawer

At 0:24 the appearance toggle is fiddly. Bring it to a 44x44 tap target. Nobody is rage-quitting over it, but accessibility audits will flag it and they'd be right.

## Full critique by category

**Brand spine.** The promise is clear and the proof points sit next to it. The only drag is the layout shift on load (see above).

**Hierarchy and layout.** Flow is logical top to bottom. The badge crowding on the certificates card is the one mobile margin that needs another look.

**Conversion friction.** Per-card CTAs, pricing inline, refund line under the button. This is the pattern. The only friction worth naming is the theme toggle hit area.

Typography, colour, motion, copy, and signature devices are all sitting at 8 or 9 with nothing actionable. Leave them alone.

## Reference frame

Pilot would ship this. They'd probably tighten the hero load and call it done. Mosh would push the doctor-count and signature even harder, maybe a face in the hero. Linear would strip another 20% of the copy and trust the whitespace. Stripe would obsess over the layout shift until it was gone, then move on. The page is closer to Pilot than to any of the others, which is the right neighbourhood for this category.

## Frames

- [6s](frames/006s.png)
- [13s](frames/013s.png)
- [19s](frames/019s.png)
- [25s](frames/025s.png)
