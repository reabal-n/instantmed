---
runId: 2026-05-25-homepage-l0yn
journey: Homepage long-scroll + nav tour
url: http://localhost:3000/consult
overallScore: 8
capturedAt: 2026-05-25T08:23:58.171Z
---

# An 8/10 page held back by three seconds of blank white

The homepage does the hard part well. Calm voice, prices in plain sight, refund policy where you can actually see it. The damage is at the edges: a white flash on load, a CTA that hides below the fold on mobile, and a missing live signal that would prove the speed claim.

## What's working

- The ivory surface. Warm, quiet, not a hospital.
- "Four things, properly" on the hero. One promise, no hedging.
- Refund line sits next to the button, not buried in a footer.
- Copy reads like a GP, not a startup. No buzzwords made it through.

## What to fix, ranked

### 1. Kill the white flash on load

**Impact:** high · **Where:** initial page mount, hero

For nearly three seconds at 0:00, the page is blank white before the ivory loads in. That's the first thing every visitor sees, and it undoes the calm we spent the rest of the page earning. Set the ivory as the base background on the document itself so it paints before the bundle. The gradient can come after.

### 2. Pull the mobile CTA above the fold

**Impact:** high · **Where:** hero card, mobile breakpoint

Around 0:03 on mobile, "Start a certificate" sits below the fold. People have to scroll to find the thing the page is asking them to do. Tighten the card padding and the vertical margins on screens under 640px tall. The button needs to be visible the moment the page settles.

### 3. Add a live wait-time badge

**Impact:** medium · **Where:** under each card header

"1-2h target" is a static promise. "Average review time: 14 mins" is a fact. We say faster than your GP everywhere else, so prove it on the page. A small live badge under the card header does more for trust than another paragraph of copy.

## Full critique by category

**Brand spine (7/10).** The four-things framing is clear, but "Faster than your GP" never lands in the hero. It's the line that does the most work in the brand, and right now it's nowhere near the first thing you read. Promote it to a kicker above the headline.

**Typography (8/10).** Hierarchy is clean. The one rough spot is the inline 1/2/3-day price row on the certificate card (around 0:04), which reads as cramped dash-separated text. A small badge row would let each price breathe.

**Motion (6/10).** The accordion behaves. The page entry does not. See action #1.

**Hierarchy and layout (7/10).** Desktop rhythm is fine. Mobile is where the problem lives, see action #2.

**Signature devices (6/10).** The page is honest but static. The wait-counter is the obvious thing missing, and it's the one device that would let the rest of the copy stop working so hard.

## Reference frame

Mosh would already have the live wait time on the page, probably with a friendly avatar next to it. Pilot would have the CTA nailed to the bottom of the mobile viewport so you never have to find it. Linear would never have shipped a three-second white flash. Stripe would have made the price row a proper component the first time. None of these are hard fixes. They're the difference between an 8 and a 9.

## Frames

- [6s](frames/006s.png)
- [13s](frames/013s.png)
- [19s](frames/019s.png)
