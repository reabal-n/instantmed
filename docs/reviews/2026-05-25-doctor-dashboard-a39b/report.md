---
runId: 2026-05-25-doctor-dashboard-a39b
journey: Doctor dashboard (queue + header chrome after 2026-05-25 cuts)
url: http://localhost:3000
overallScore: 5
capturedAt: 2026-05-25T07:54:52.168Z
---

# A clean login that forgets it belongs to a doctor

The screen works. It just doesn't feel like ours. Three sign-in options share the same weight, the canvas is the default SaaS grey, and the one bit of warmth (the "837+ Australians" badge) is crammed too tight to read.

## What's working

- Copy is direct. No marketing fluff. "Australians" earns its place.
- Form fields are legible and easy to target.
- "Welcome back" lands cleanly without trying too hard.

## What to fix, ranked

### 1. Pick a primary action and mean it

**Impact:** high · **Where:** login card, around the 0:10 mark

Magic link, Google, and Sign in all look like the answer. They can't all be. Drop the OAuth and magic-link buttons to outline or icon-only treatments and let the blue Sign in button do its job. One clear path in, no thinking required.

### 2. Put the brand back on the canvas

**Impact:** medium · **Where:** viewport background, at 0:09

The page is sitting on flat grey. Swap it for the warm ivory (#F8F7F4) and give the card a soft elevation. Same layout, completely different feeling. Right now it could be any payroll tool. It should feel like a waiting room you actually want to be in.

### 3. Give "Forgot password?" room to breathe

**Impact:** medium · **Where:** password field, at 0:10

The link is sitting on top of the input boundary. On a 375px screen that's a mis-tap waiting to happen. Push it down at least 12px and the friction disappears.

## Full critique by category

**Brand spine (5/10).** The auth screen reads like a template. No tagline, no GP voice, nothing that says a real doctor is on the other side of this login. A single line under "Welcome back" naming the wait, or the doctor, would do more than any logo treatment.

**Typography (6/10).** Scale is fine. The trust badge is the weak point: tiny icons pressed against tiny text. Add 4px between the icon row and the label and let the letter-spacing open up a touch.

**Color and surface (5/10).** Default grey on default white. Warm ivory + a sky-toned shadow on the card and the whole screen warms up without changing a single component.

**Motion (4/10).** The card just appears. A 300ms ease-out lift on mount costs nothing and signals craft. Worth doing.

**Copy voice (7/10).** The strongest category. Holds the line, no jargon, "Australians" is a nice local touch. Leave it alone.

**Hierarchy and layout (5/10).** Covered above. Three equal CTAs is the core problem.

**Conversion friction (6/10).** Fields are tappable. The "Forgot password?" proximity is the only real snag.

**Signature devices (5/10).** The trust badge is the only thing doing brand work. A live "Dr. Sarah online now" or current wait time at the bottom of the card would earn its keep and nudge people through the form.

## Reference frame

Mosh would have a doctor's face on this screen and a wait time in the header before you finished reading "Welcome". Pilot would collapse to one CTA and make it impossible to miss. Linear would treat the canvas itself as a design surface, not a backdrop. Stripe would have the card lift on mount and the secondary providers tucked into a single muted row. The fix here isn't more design. It's less, with conviction.

## Frames

- [8s](frames/008s.png)
- [17s](frames/017s.png)
