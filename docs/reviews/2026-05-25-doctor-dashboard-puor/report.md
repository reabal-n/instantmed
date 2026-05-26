---
runId: 2026-05-25-doctor-dashboard-puor
journey: Doctor dashboard (queue + header chrome after 2026-05-25 cuts)
url: http://localhost:3000
overallScore: 6
capturedAt: 2026-05-25T07:45:21.645Z
---

# A login screen with a clipped logo and a CTA that whispers

Solid bones. Warm ivory, clean card, magic-link option on the front door. But there's a blue brand element clipped at the top of the modal, and the Sign in button is wearing the wrong colour. Fix those two things and this screen jumps a full point.

## What's working

- Warm off-white background. Clinical without being cold.
- Magic link alongside Google sign-in. Fewer fields, fewer reasons to bounce.
- Copy is short and direct. "Welcome back" does its job.

## What to fix, ranked

### 1. The clipped logo at the top of the card

**Impact:** high · **Where:** sign-in card wrapper

A blue brand asset is being chopped off at the top edge of the white modal (see frame at 0:14). It's the first thing the eye lands on and it reads as broken. Check the card's `overflow` and `padding-top`. This is a one-line fix that's been sitting in production.

### 2. The Sign in button is the wrong blue

**Impact:** medium · **Where:** primary CTA

Right now the button reads as muted lavender. The brand blue is `#2563EB`. Use it. A login button should look like the next step, not a placeholder.

### 3. The "837+ Australians" cluster under the heading

**Impact:** medium · **Where:** card header

Trust micro-proof belongs on a marketing page, not a return-user login. Anyone signing in is already a customer. Drop the block, or move it to the signup variant only.

## Full critique by category

**Brand spine (5/10).** The clinical warmth is there but diluted by the trust cluster sitting awkwardly inside a login gate. Strip it back. A returning user doesn't need to be sold to.

**Typography (6/10).** Readable, but tight. The "Forgot password?" link is glued to the password field. Give it room to breathe.

**Colour and surface (7/10).** The ivory is right. The CTA blue isn't. Fix the button and this category lifts to an 8.

**Motion (4/10).** The screen snaps in cold. A 300ms opacity ease on mount would do it. Nothing fancy. Just stop the hard cut.

**Hierarchy and layout (5/10).** The centre-aligned card is fine. The clipped logo is not. See action 1.

**Signature devices (4/10).** No wait-counter, no "while you wait" cue. Fair enough on a login screen, but if there's a way to surface "doctors online now" once signed in, that's where the brand earns its keep.

## Reference frame

Mosh would have softened the entry with a sweep and made the CTA unmissable. Pilot would have stripped the trust block on the return state without thinking twice. Linear would have caught the clipped logo in code review. Stripe would have made the button feel like the only thing on the page. The gap here isn't taste, it's polish: three small fixes from a screen that holds its own.

## Frames

- [8s](frames/008s.png)
- [17s](frames/017s.png)
- [24s](frames/024s.png)
