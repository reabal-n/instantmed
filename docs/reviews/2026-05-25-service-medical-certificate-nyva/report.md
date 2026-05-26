---
runId: 2026-05-25-service-medical-certificate-nyva
journey: /medical-certificate service landing long-scroll
url: http://localhost:3000
overallScore: 8
capturedAt: 2026-05-25T09:56:23.921Z
---

# An 8/10 landing that loses its nerve in the middle

The hero does its job. A real doctor, AHPRA-registered, $19.95, no video call. The trust signals are where they should be. Then around the 0:14 mark, the page forgets it's a clinic and starts looking like a directory.

## What's working

- The hero lands the promise in one breath: certificate, no video, real doctor, priced.
- The handwritten doctor signature in the footer and the response timer do real work.
- Copy reads like a GP wrote it. No buzzwords. No padding.
- Warm off-white surface keeps the page out of cold-clinic territory.
- The "what we don't cover" list is rare and builds more trust than a testimonial ever will.

## What to fix, ranked

### 1. The tag pill block at 0:14 looks like a directory page

**Impact:** high · **Where:** mid-page popular searches / locations block

This is the only section that breaks the premium feel. Rows of location and condition pills read like SEO scaffolding, not a clinic. Either hide it behind a search-expandable component, restyle as a quiet text list, or move it below the footer. Right now it tells the user they've landed on something generic, right after the hero promised they hadn't.

### 2. The pre-flow day selector adds a decision the user shouldn't have to make yet

**Impact:** medium · **Where:** primary CTA area, around 0:10

Asking someone to pick 1-day vs multi-day before they've started the form is a choice the intake wizard should handle. Default the landing CTA to the standard 1-day certificate. Let the doctor or the form ask about longer durations in context. One button on the landing page, not a configurator.

### 3. "AHPRA-registered" wraps awkwardly in the hero

**Impact:** low · **Where:** hero subheading, at 0:01

The most important credential on the page breaks mid-word on narrower viewports. Non-breaking hyphen (U+2011) or a white-space: nowrap span around the term. Five-minute fix, and it's the first phrase the eye lands on.

## Full critique by category

**Typography (7).** Plus Jakarta Sans is the right call. The only blemish is the hero hyphen break on "AHPRA-registered". Fix that and this moves to an 8.

**Motion (6).** Transitions are clean but flat. There's no weight to anything. Not a launch blocker, but if you want to feel like Linear or Stripe, the next pass should be on micro-interactions: button press states, card hover, scroll-linked reveals on the trust strip.

**Hierarchy and layout (7).** Top and bottom are tight. The middle is the problem (see action 1). Fix the tag block and the whole page reads as a 9.

**Conversion friction (8).** Pricing upfront is right. The day selector is the one thing standing between a sick person and the form.

Everything else (brand spine, colour, copy, signature devices) is at 8 or 9 and doesn't need our attention this sprint.

## Reference frame

Mosh would have killed the tag pill block in the first review and replaced it with a single testimonial. Pilot would have made the CTA bigger and removed the day selector without asking. Linear would have spent a week on the motion pass and shipped a hero that feels heavier on scroll. Stripe would have caught the AHPRA line break in a typography audit. The bones are right. The middle of the page just needs the same discipline as the top.

## Frames

- [7s](frames/007s.png)
- [14s](frames/014s.png)
- [21s](frames/021s.png)
- [28s](frames/028s.png)
