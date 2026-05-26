---
runId: 2026-05-25-marketing-about-hgwz
journey: /about marketing page long-scroll
url: http://localhost:3000
overallScore: 7
capturedAt: 2026-05-25T10:03:04.857Z
---

# The brand says "without the small talk". The page asks for ten minutes of reading.

The voice is right. The colour palette is right. The about page then buries the reader in long-form paragraphs and hides the CTA at the bottom of the scroll. Fix those two things and this is an 8.

## What's working

- Warm ivory canvas at #F8F7F4 with soft sky shadows. Restrained, clinical, calm.
- Plus Jakarta Sans and Source Sans 3 do the heavy lifting without showing off.
- Copy sounds like a GP, not a marketing team. Keep it.
- Signature devices land: the GP comparison chart, the doctor's signature in the footer.

## What to fix, ranked

### 1. No CTA in the mobile hero

**Impact:** high · **Where:** /about hero, mobile viewport

A user on the about page has already decided you're interesting. Don't make them scroll the full marketing essay to find "Start a request" (see the buried CTA around the 0:31 mark). Put a primary button under the hero paragraph, and add a sticky CTA in the mobile header so it follows the scroll. Three seconds from landing to form, not thirty.

### 2. Walls of text under "Who we are and how we work"

**Impact:** medium · **Where:** /about, around 0:20

The paragraphs at 0:20 to 0:28 are dense enough to feel like a policy document. That contradicts the brand thesis. Cut the body copy by half, or move the longer explanations into accordion panels styled like the FAQ. Cap paragraphs at three sentences. Lift line-height to 1.625rem on mobile.

### 3. Layout flash on initial paint

**Impact:** medium · **Where:** app shell, around 0:04

A white sidebar container flashes in before the layout settles. First impression of a premium product should not be a layout shift. Default the nav drawer to hidden state before paint and keep it out of the initial layout tree.

## Full critique by category

**Brand spine (8).** The thesis is sharp and well differentiated. The long-read about page works against it. Shorter blocks would make "without the small talk" feel earned, not claimed.

**Typography (7).** Type choices are good, spacing is not. Tight line-height plus long paragraphs on a 375px screen is hard work. Also, the "Our story" and "About InstantMed" pill tags stack too close to their headings (around 0:05). Pick one label per section.

**Colour and surface (9).** Almost nothing to say. One note: the dark blue solid ring around the 100% refund stat (0:15) is heavier than everything around it. A softer track or a hand-drawn loop would match the rest of the page.

**Motion (6).** The scroll itself is smooth. The drawer slide-out at 0:36 uses a flat linear curve and feels mechanical. Swap to cubic-bezier(0.16, 1, 0.3, 1) and it will feel snappier without any other change. The 0:04 flash is the bigger fix.

**Copy voice (8).** Honest, warm, no hype. Leave it alone.

**Hierarchy and layout (7).** The GP comparison chart wraps awkwardly at 0:15, pushing "~20 min" above the bar instead of inline. Drop the font size on narrow viewports or lock the row with min-widths so the comparison stays scannable.

**Conversion friction (6).** Covered above. The whole page is built for someone with twenty minutes. Most visitors have two.

**Signature devices (8).** "What we won't do" is buried in the footer (0:33). That's a trust asset, not a footer link. Promote it to a card next to "Our values".

## Reference frame

Pilot would have a sticky CTA in the header from pixel one and would have cut the body copy by 40% before shipping. Mosh would keep the warmth but break the long sections into shorter, scannable cards with one clear next step under each. Linear would obsess over the 0:04 layout flash until it was gone. Stripe would tighten the type rhythm and ship the comparison chart as a proper component, not a wrapping flex row. The bones here are good. The discipline needs to match the brand promise.

## Frames

- [7s](frames/007s.png)
- [14s](frames/014s.png)
- [21s](frames/021s.png)
- [28s](frames/028s.png)
- [35s](frames/035s.png)
