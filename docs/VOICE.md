# InstantMed Voice & Brand System

> Voice is the product's accent. Get it right once, reuse it everywhere, police it in CI.

**Source of truth:** `lib/marketing/voice.ts`
**Enforced by:** `tests/voice-guard.test.ts` (banned phrases + em-dash scan across `components/marketing/**` and `lib/marketing/**`)

---

## Core voice, one sentence

**A calm, unhurried GP who respects your time. Dry, direct, a little warm. No hype, no sales talk, no medical jargon. Writes like a doctor who has seen everything and stopped being impressed.**

If a line sounds like it was written by a marketer, rewrite it. If it sounds like a real doctor talking to a real adult, ship it.

---

## The 4-layer brand system

Four strings, four jobs. Do not mix them up.

| Layer | Line | Job | Where it lives |
|---|---|---|---|
| **Tagline** | *A doctor without the wait.* | Logo-adjacent promise. Always paired with the wordmark. | Hero headline, LP headers, email headers, OG images. |
| **Wedge** | *No appointment. No waiting room. Start with a secure clinical form.* | Default platform mechanism. Removes booking friction without promising that prescribing requests never need doctor contact. | Homepage, request hub, pricing, generic service pages, paid landing pages. |
| **Med-cert wedge** | *No video. No call. No appointment.* | Med-cert-specific mechanism for suitable administrative documentation requests. | Medical certificate surfaces only. |
| **Form-first wedge** | *Complete a secure clinical form. A doctor contacts you only if more information is clinically needed.* | Prescribing and specialty-service mechanism. Keeps the moat while preserving clinical discretion. | Prescriptions, ED, hair loss, women's health, weight loss. |
| **Prop phrase** | *A GP, the way it should've been.* | Aspirational campaign sign-off. The line that sits under the logo on the last frame of an ad. | Ad end-frames, email footers, press pull-quotes, about page lede. |
| **Iconic hook** | *The doctor is in.* | Optional opener. Disarming, a little cheeky, drops the reader into the universe. | Select ad creatives, social copy openers, hero eyebrow on campaign landings. |

**Plus one guarantee, always visible at conversion points:**

> *Full refund if our doctor can't help.*

This is the merchandised promise. It lives above checkout CTAs, inline on hero CTAs, and on `/guarantee`. It is not a tagline, not a wedge, and not a time guarantee.

---

## 5 Dos

1. **Short sentences. Full stops.** Three full stops beat one comma every time. *Fill it out. Get on with it.*
2. **Name the wait, then remove it.** *You used to wait three weeks for a GP. Not anymore.*
3. **Use negation carefully.** *No appointment. No waiting room.* is broadly safe. *No call* is med-cert-specific unless a clinician has explicitly approved the service context.
4. **Lead with the human.** A real Australian doctor reviews your request. Say that. Don't hide behind "our platform."
5. **Price in the first breath, not the footer.** Numbers are trust signals. *Medical certificate, $19.95. Reviewed in under 30 minutes.*

## 5 Don'ts

1. **Never use em-dashes** (`—`). Use commas, periods, colons, or parens. The em-dash is an AI-writing tell. Zero exceptions. The voice-guard test fails the build if one slips in.
2. **Never use hype words.** `cutting-edge`, `world-class`, `revolutionary`, `game-changer`, `transformative`, `seamless`, `empower`, `holistic`, `wellness journey`, `synergy`, `at the end of the day`. Banned list enforced in code.
3. **Never say "our platform" or "our solution."** You are a doctor. Patients don't want a platform, they want a doctor.
4. **Never write a sentence a real GP wouldn't say out loud.** If you can't imagine a doctor saying it during a consult, cut it.
5. **Never stack adjectives.** *Fast, easy, convenient* is three lies in a row. Pick one and prove it with a number.

---

## Phrases you own (use freely)

1. *A doctor without the wait.*
2. *No appointment. No waiting room. Start with a secure clinical form.*
3. *No video. No call. No appointment.*
4. *Complete a secure clinical form. A doctor contacts you only if more information is clinically needed.*
5. *A GP, the way it should've been.*
6. *The doctor is in.*
7. *Full refund if our doctor can't help.*
8. *Real doctors. No runaround.*
9. *A doctor, not a queue.*
10. *AHPRA doctors. Every single time.*
11. *Reviewed, not robo-approved.*
12. *Fill it out. Get on with it.*

## Phrases banned from every marketing surface

1. cutting-edge
2. world-class
3. holistic
4. wellness journey
5. empower / empowered
6. seamless
7. revolutionary
8. game-changer / game-changing
9. at the end of the day
10. synergy
11. transformative

If any of these appear inside `components/marketing/**` or `lib/marketing/**`, the voice-guard Vitest run fails the build. To add or remove a banned phrase, edit `BANNED_PHRASES` in `lib/marketing/voice.ts`. Do not edit the test to work around a failure.

## Healthcare compliance copy rules

These rules sit above normal brand voice.

| Context | Approved copy | Avoid |
|---|---|---|
| Medical certificates | No video. No call. No appointment. | Accepted by all employers, 98% accepted, special consideration, deferred exam. |
| Prescription services | Complete a secure clinical form. A doctor contacts you only if more information is clinically needed. | No call needed, guaranteed prescription, get [drug] online. |
| ED / hair loss | Private form-first assessment. Doctor contact only if clinically needed. | No call needed, drug names in ads, outcome guarantees. |
| Weight loss | Doctor review for weight management options. Extra information or a call may be required for safety. | Weight loss injections, guaranteed weight loss, before/after claims. |
| Paid ads | Service-level, no drug terms, no testimonials. | Drug names, prescription-only medicine prices, remarketing to health audiences. |

Deeper rules: `docs/ADVERTISING_COMPLIANCE.md` and `docs/SEO_CONTENT_POLICY.md`.

---

## Where each layer renders

| Surface | Uses |
|---|---|
| Homepage hero | `TAGLINE` + `WEDGE` in body copy, `GUARANTEE` on CTA |
| `/medical-certificate` | `TAGLINE` + `MED_CERT_WEDGE`, `GUARANTEE` above CTA |
| `/prescriptions` | `TAGLINE` + `FORM_FIRST_WEDGE`, `GUARANTEE` above CTA |
| `/erectile-dysfunction` | subtype-specific form-first copy, `GUARANTEE` above CTA |
| `/hair-loss` | subtype-specific form-first copy, `GUARANTEE` above CTA |
| `/weight-loss` | manual-review safety copy, no drug names, no outcome guarantee |
| Checkout | `GUARANTEE` above pay button, re-consent line below |
| Ad creatives | `ICONIC_HOOK` as opener, service-safe wedge as body, `PROP_PHRASE` on end-frame |
| Email header | `TAGLINE` |
| Email footer | `PROP_PHRASE` |
| OG image | `TAGLINE` |
| Press page | `PROP_PHRASE` as lede |

---

## If you want to change a line

You change it in exactly one place: `lib/marketing/voice.ts`. Do not hardcode the string anywhere else. Do not copy-paste it into a component. Import the constant and render it. That is the whole rule.

If the tagline changes, every hero, every LP, every ad, every email updates on the next deploy. If the tagline is hardcoded in 47 places, it never changes.
