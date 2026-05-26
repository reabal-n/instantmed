---
runId: 2026-05-25-paid-funnel-kkq2
journey: Paid funnel (homepage → /request med-cert → checkout)
url: http://localhost:3000
overallScore: 6
capturedAt: 2026-05-25T09:10:17.863Z
---

# The promise is clear. The paid funnel is hiding it.

Pricing, refund line, AHPRA trust markers: all in the right place. Then the date picker looks broken, the skeletons flash grey, and the cert-type buttons fight for thumb room on a 375px phone. A patient who needs a certificate today should not have to squint to buy one.

## What's working

- Copy reads like a doctor wrote it. No buzzwords, no journey talk.
- The refund line ("Full refund if our doctor can't help") is doing real work near the price.
- AHPRA cues land in the first second. Australians know immediately this is for them.
- Plus Jakarta Sans and Source Sans 3 hold up. The bones are fine.

## What to fix, ranked

### 1. The "Yesterday" date button looks disabled.

**Impact:** high · **Where:** /request med-cert, date selector (around the 0:12 mark)

A patient who needs a backdated cert taps "Yesterday" and pauses, because the light grey fill reads as "you can't pick this". That hesitation costs sales. Give every unselected date the same white surface, dark slate text, thin border. Reserve grey for actually disabled states. Nothing else.

### 2. Certificate type buttons are too tight on mobile.

**Impact:** high · **Where:** /request med-cert, cert type step (at 0:15)

Work, Study, Carer's leave crammed into one row on a small phone. Thumbs miss. Stack them vertically below 400px. One tap target per row. Done.

### 3. The loading skeletons break the "instant" promise.

**Impact:** medium · **Where:** step transitions in the form (at 0:11)

Big grey blocks flashing between steps make the form feel slow, even when it isn't. The product is called InstantMed. Replace the hard skeletons with low-opacity text outlines that fade in, or slide the next step in directly. Perceived speed is the whole brand.

## Full critique by category

**Typography (6).** Body copy on mobile is too tight. Bump line-height to 1.5rem on the hero paragraph and let it breathe. Right now it reads like a terms-and-conditions block, not a doctor explaining things.

**Color and surface (6).** The primary blue is fine. The problem is everywhere grey appears on something interactive. Pick one rule: grey means disabled, never "default". Apply it across the funnel.

**Motion (5).** The scrolling feature reel at 0:05 moves too fast and cards overlap. Halve the speed and ease out. Motion should feel like a calm exhale, not a slideshow on shuffle.

**Hierarchy and layout (7).** Desktop is sorted. Mobile grids compress and the cert-type row is the worst offender. Audit every multi-button row below 400px.

**Signature devices (5).** The biggest missed opportunity. There's a live wait-time story to tell and the checkout doesn't tell it. Put "Average delivery today: 12 mins" right next to the price. That single line sells the product.

## Reference frame

Mosh would have killed the grey skeletons on day one and would already be showing a live wait counter at the price. Pilot would have one CTA per mobile row, never three. Stripe would have made the date selector states unambiguous before it shipped. The bones here are closer to Mosh than to a generic clinic site, which is the right neighbourhood. The funnel just needs the small, surgical fixes above to stop undercutting its own promise.

## Frames

- [9s](frames/009s.png)
