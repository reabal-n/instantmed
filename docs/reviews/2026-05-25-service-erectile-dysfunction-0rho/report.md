---
runId: 2026-05-25-service-erectile-dysfunction-0rho
journey: /erectile-dysfunction service landing long-scroll
url: http://localhost:3000
overallScore: 8
capturedAt: 2026-05-25T09:59:14.524Z
---

# Price, refund, and a real doctor. All visible before you scroll.

This page does the hard thing well. It says what it costs, who you'll speak to, and what happens if we can't help, all in the first viewport. The fixes left are cosmetic, not structural.

## What's working

- Price and refund promise sit in the hero. No hunting.
- The ivory palette (#F8F7F4) reads warm, not clinical.
- Copy stays direct. No buzzwords, no journey talk.
- AHPRA and LegitScript signals are present without shouting.
- The "average med cert today" ticker and the "what we won't do" link earn trust the slow way.

## What to fix, ranked

### 1. Tidy the trust badge stack under the hero CTA

**Impact:** medium · **Where:** hero, around the 0:01 mark

The Google Telehealth and LegitScript badges are doing real work, but they're sitting at different heights and breaking the line of the CTA. Put them in a single row. Cap the max-height. Let them read as one unit, not three loose objects.

### 2. Soften the mobile drawer transition

**Impact:** low · **Where:** mobile nav, at 0:25

The drawer slides in on a linear curve and lands with a thud. Swap to `cubic-bezier(0.16, 1, 0.3, 1)` over 350ms. Small change, but it's the difference between a page that feels built and one that feels assembled.

### 3. Loosen the hero H1 line-height on mobile

**Impact:** low · **Where:** hero, at 0:01

The multi-line headline is sitting too tight on narrow viewports. Move from `leading-tight` to `leading-snug`. The headline should breathe.

## Full critique by category

**Typography.** Plus Jakarta Sans is the right call. Modern, readable, not trying too hard. Only quibble is the mobile H1 sitting too close to itself, fixed above.

**Motion.** Standard slides and fades. They work, but they don't have weight. The drawer is the obvious tell. Pick one timing curve, use it everywhere, and the whole site moves up a tier.

**Hierarchy and layout.** Clean overall. The badge cluster is the only spot that pulls the eye the wrong way. Fix that and the hero is done.

## Reference frame

Mosh would have shipped this. Pilot would have spent another week on the drawer curve and the badge alignment, and they'd be right to. Linear would have set one motion token and reused it from the nav to the modals. Stripe would have lined the badges up without thinking about it, because their design system would not let them ship otherwise. The page is in good company. The remaining work is the work of caring about the last 10%.

## Frames

- [7s](frames/007s.png)
- [14s](frames/014s.png)
- [21s](frames/021s.png)
