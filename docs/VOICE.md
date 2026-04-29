# InstantMed Voice & Brand System

> Voice is the product's accent. Get it right once, reuse it everywhere, police it in CI.

**Source of truth:** `lib/marketing/voice.ts`
**Enforced by:** `tests/voice-guard.test.ts` (banned phrases + em-dash scan across `components/marketing/**` and `lib/marketing/**`)

---

## Core voice, one sentence

**A calm, unhurried GP who respects your time. Dry, direct, a little warm. Mosh's warmth with Pilot's CTA confidence. No hype, no sales talk, no medical jargon. Writes like a doctor who has seen everything and stopped being impressed.**

If a line sounds like it was written by a marketer, rewrite it. If it sounds like a real doctor talking to a real adult, ship it.

## Brand thesis (one line)

> *Telehealth without the small talk. A real doctor, ready in the time it takes to make a coffee.*

Used on the about page lede, OG image, brand-film outro, and as a hero supplement under the H1/H2 stack on key pages. One sentence captures what InstantMed is and how it feels.

---

## The 4-layer brand system

Four strings, four jobs. Do not mix them up.

| Layer | Line | Job | Where it lives |
|---|---|---|---|
| **Tagline** | *Faster than your GP.* | Logo-adjacent promise. The brand spine. Homepage H1, every LP header, every email header, OG image. | Brand surfaces sitewide. |
| **Tagline (paid-safe)** | *Faster than the wait at your GP.* | Google-Ads-safe variant of the tagline. Substantiable wait-time comparison; lower healthcare-ad-review risk than direct practitioner comparison. | Google Ads, Meta paid, programmatic display. Brand surfaces still use the primary tagline. |
| **Wedge** | *No appointment. No waiting room. Start with a secure clinical form.* | Default platform mechanism. Removes booking friction without promising that prescribing requests never need doctor contact. | Homepage, request hub, pricing, generic service pages, paid landing pages. |
| **Med-cert wedge** | *No video. No call. No appointment.* | Med-cert-specific mechanism for suitable administrative documentation requests. | Medical certificate surfaces only. |
| **Form-first wedge** | *Complete a secure clinical form. A doctor contacts you only if more information is clinically needed.* | Prescribing and specialty-service mechanism. Keeps the moat while preserving clinical discretion. | Prescriptions, ED, hair loss, women's health, weight loss. |
| **Prop phrase** | *Telehealth without the small talk.* | Voice signature. Doubles as the homepage H2 under the tagline H1, and as the campaign sign-off on ad end-frames, email footers, and the about-page lede. | Hero H2, ad end-frames, email footers, press leads, about page lede. |
| **Iconic hook** | *Three minutes. Done.* | The conversion-proximate kicker. Sits next to primary CTAs, runs as the headline on Google Ads, anchors the end of long-scroll marketing pages. | CTA proximity, Google Ads headlines, paid social creative, long-scroll closers. |

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

1. *Faster than your GP.*
2. *Faster than the wait at your GP.* (paid-safe variant)
3. *Telehealth without the small talk.*
4. *Three minutes. Done.*
5. *Telehealth without the small talk. A real doctor, ready in the time it takes to make a coffee.* (brand thesis)
6. *A real doctor, ready in the time it takes to make a coffee.*
7. *A real doctor, online, the moment you need one.*
8. *No appointment. No waiting room. Start with a secure clinical form.*
9. *No video. No call. No appointment.*
10. *Complete a secure clinical form. A doctor contacts you only if more information is clinically needed.*
11. *The doctor is in.* (legacy / alternative hook)
12. *Full refund if our doctor can't help.*
13. *Real doctors. No runaround.*
14. *A doctor, not a queue.*
15. *AHPRA doctors. Every single time.*
16. *Reviewed, not robo-approved.*
17. *Fill it out. Get on with it.*

## Phrases banned from every marketing surface

1. cutting-edge
2. world-class
3. holistic
4. wellness journey / your journey / healthcare journey
5. empower / empowered
6. seamless
7. revolutionary
8. game-changer / game-changing
9. at the end of the day
10. synergy
11. transformative
12. solutions
13. leverage
14. unlock
15. ai-powered / ai powered / powered by ai

If any of these appear inside `components/marketing/**`, `lib/marketing/**`, or `app/**` (excluding internal portals like `app/admin`, `app/doctor`, `app/dashboard`, `app/patient`, `app/api`, `app/actions`, `app/auth`, `app/login`, `app/account`, `app/email-preferences`, `app/intent`, `app/(dev)`), the voice-guard Vitest run fails the build. To add or remove a banned phrase, edit `BANNED_PHRASES` in `lib/marketing/voice.ts`. Do not edit the test to work around a failure.

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
| Homepage hero | `TAGLINE` (H1) + `PROP_PHRASE` (H2) + `WEDGE` (subhead) + `ICONIC_HOOK` (CTA-adjacent) + `GUARANTEE` (above CTA) |
| `/medical-certificate` | `TAGLINE` + `MED_CERT_WEDGE`, `ICONIC_HOOK` + `GUARANTEE` above CTA |
| `/prescriptions` | `TAGLINE` + `FORM_FIRST_WEDGE`, `ICONIC_HOOK` + `GUARANTEE` above CTA |
| `/erectile-dysfunction` | subtype-specific form-first copy, `GUARANTEE` above CTA |
| `/hair-loss` | subtype-specific form-first copy, `GUARANTEE` above CTA |
| `/weight-loss` | manual-review safety copy, no drug names, no outcome guarantee |
| Checkout | `GUARANTEE` above pay button, re-consent line below |
| About page | `BRAND_THESIS` as lede, `PROP_PHRASE` reinforced in body |
| Google Ads / paid creative | `ICONIC_HOOK` as headline, `TAGLINE_PAID_SAFE` as body, `PROP_PHRASE` on end-frame |
| Brand-film outro | `BRAND_THESIS` |
| Email header | `TAGLINE` |
| Email footer | `PROP_PHRASE` |
| OG image | `TAGLINE` (over hero photo) |
| Press page | `PROP_PHRASE` as lede |

---

## If you want to change a line

You change it in exactly one place: `lib/marketing/voice.ts`. Do not hardcode the string anywhere else. Do not copy-paste it into a component. Import the constant and render it. That is the whole rule.

If the tagline changes, every hero, every LP, every ad, every email updates on the next deploy. If the tagline is hardcoded in 47 places, it never changes.
