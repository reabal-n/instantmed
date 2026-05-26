---
runId: 2026-05-25-doctor-dashboard-7be0
journey: Doctor dashboard (queue + header chrome after 2026-05-25 cuts)
url: http://localhost:3000
overallScore: 5
capturedAt: 2026-05-25T07:57:20.858Z
---

# A login screen doing marketing's job, not the doctor's

The sign-in works. That's about all you can say. It's a returning-user screen wearing a homepage costume: trust badges, star ratings, a counter of Australians. None of it belongs here. The patient already signed up. Let them in.

## What's working

- Magic link option is present (around 0:02). Good. Fewer passwords, fewer problems.
- The form itself is short. Email, password, in.
- Sans-serif body type reads cleanly.

## What to fix, ranked

### 1. Strip the trust badges off the login card

**Impact:** medium · **Where:** sign-in card header

The "837+ Australians" line and the stars (see frame at 2s) are doing acquisition work on a screen built for people who've already chosen us. It makes the card feel cramped and a little desperate. Remove it. Returning patients want the field, not the pitch.

### 2. Fix the primary button colour

**Impact:** high · **Where:** Sign in CTA

The Sign in button sits in a washed-out periwinkle. It reads as secondary against its own secondary options. Move it to the brand blue (#2563EB), white text, full contrast. One clear primary path. That's the whole job of this screen.

### 3. Make "Forgot password?" actually readable

**Impact:** medium · **Where:** below the password field

Currently low-contrast grey at a size that fails on a phone in sunlight. Bump it to 14px and darken to match secondary text. The people clicking this link are already frustrated. Don't make them squint.

## Full critique by category

**Brand spine (4/10).** "Faster than your GP" is nowhere on the screen. The trust-badge clutter is filling space the promise should occupy. If anything lives here, it should be a quiet line about current wait time, not a star rating.

**Typography (5/10).** Body type is fine. Auxiliary links are the weak point, see above.

**Colour and surface (4/10).** The primary button is the headline issue. Desaturated blue on a sign-in CTA is a self-inflicted wound.

**Motion (2/10).** The card just appears. A 400ms ease-in on mount would do it. Nothing fancy. Just enough to feel built rather than rendered.

**Copy voice (5/10).** "Sign in to your account" is the kind of sentence a form library writes for you. Try "Let's get you back to your care." Same length, actual warmth.

**Hierarchy and layout (4/10).** The subtitle, the badges, the stars, the counter all stack on top of each other under the H1. Either give them 16px of air or, better, remove them. The fields need room to breathe.

**Conversion friction (6/10).** Magic link saves this category. Leave it alone.

**Signature devices (2/10).** No live wait counter, no clinician presence, nothing that says a real doctor is on the other side of this form. A small footer line like "Average script today: 8 minutes" would do more work than every trust badge combined.

## Reference frame

Stripe would delete two-thirds of this card and trust the brand to carry the rest. Linear would tighten the spacing and add the 400ms entry. Mosh would write a one-line welcome that sounds like a person. Pilot would commit to the primary blue and stop hedging. Right now this screen is doing a little of everyone's job and none of ours.

## Frames

- [8s](frames/008s.png)
