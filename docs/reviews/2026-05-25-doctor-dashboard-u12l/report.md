---
runId: 2026-05-25-doctor-dashboard-u12l
journey: Doctor dashboard (queue + header chrome after 2026-05-25 cuts)
url: http://localhost:3000
overallScore: 4
capturedAt: 2026-05-25T07:49:01.953Z
---

# The login screen forgot whose login screen it is

A doctor signing in at 7am should know they're in the right place before they reach for the keyboard. Right now they don't. No logo, no wordmark, a faded CTA, and three sign-in options competing for the same click. Fixable in an afternoon.

## What's working

- Type hierarchy reads cleanly. Headline, sub, form.
- Email and password inputs sit where the eye expects them.
- The card itself is calm. Good bones under the missing paint.

## What to fix, ranked

### 1. Put the brand on the brand's login screen

**Impact:** high · **Where:** auth card header

There is no InstantMed mark anywhere on this page (see frame at 0:01). A doctor logging in should see the logo before they see the form. Drop a wordmark above the card title. That's the fix.

### 2. The primary button doesn't look primary

**Impact:** medium · **Where:** Sign in CTA

The CTA sits in a washed-out periwinkle that reads as disabled at a glance. Push it to a confident blue (#2563EB or similar). The button should look like the thing you're meant to press.

### 3. Three ways to sign in is two too many

**Impact:** medium · **Where:** auth card body

Password, magic link, and Google all stacked as equal-weight buttons around the 0:03 mark. Pick the primary path (email + password), keep Google as a secondary option, and demote the magic link to a text link underneath. Returning doctors want one obvious click.

## Full critique by category

**Brand spine.** Anonymous. A login page without a logo is a login page a phishing kit could clone in ten minutes. Add the mark.

**Color and surface.** The CTA is the loudest tell. Periwinkle on white reads as inactive. A saturated blue fixes the read instantly and lifts the whole card.

**Motion.** Static everywhere. A 200-300ms hover lift on the CTA is enough. Nothing fancy, just a sign the page is alive.

**Copy voice.** "837+ Australians" with stars belongs on a Shopify storefront, not a clinician portal. Try "Trusted by 837 patients this week" or drop the social proof entirely on the doctor-facing login. Doctors don't need testimonials to log in to work.

**Hierarchy and layout.** Three CTAs of equal weight. Demote two of them. The form should feel like a form, not a menu.

**Conversion friction.** The choice paralysis costs a second or two per login. Across a clinic that adds up. One primary path, one secondary, one tertiary text link.

**Signature devices.** No wait-time strip, no "Faster than your GP" anchor. A small line above the card ("Queue: 4 patients waiting") would tell a doctor what they're signing in to before they sign in. Worth testing.

## Reference frame

Linear's login is a logo, two fields, one button. Stripe's is the same with a calmer palette. Mosh and Pilot both lean on the brand mark and a single confident CTA colour. Any of those teams would have shipped this with the logo present and the button saturated on day one. The rest is polish, but those two are table stakes.

## Frames

- [8s](frames/008s.png)
