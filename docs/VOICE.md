# InstantMed Voice & Brand System

> Voice is the product's accent. Get it right once, reuse it everywhere, police it in CI.

**High-risk factual claims:** `lib/marketing/approved-claims.ts` (copy, contexts, risk, and evidence receipts)
**Voice aliases and guards:** `lib/marketing/voice.ts` (brand aliases, banned-phrase API, and em-dash API)
**Enforced by:** `lib/__tests__/approved-claims-contract.test.ts` and `lib/__tests__/voice-guard.test.ts`

---

## Core voice, one sentence

**A calm, unhurried doctor who respects your time. Dry, direct, a little warm. Mosh's warmth with Pilot's CTA confidence. No hype, no sales talk, no medical jargon. Writes like a doctor who has seen everything and stopped being impressed.**

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
| **Form-first wedge** | *Complete a secure clinical form. A doctor reviews it and may call you briefly before prescribing.* | Prescribing and specialty-service mechanism. Keeps a possible brief doctor call visible instead of framing contact as a rare exception. | Prescriptions, ED, hair loss, and women's health. Future weight-loss use requires explicit launch approval. |
| **Prop phrase** | *Telehealth without the small talk.* | Voice signature. Doubles as the homepage H2 under the tagline H1, and as the campaign sign-off on ad end-frames, email footers, and the about-page lede. | Hero H2, ad end-frames, email footers, press leads, about page lede. |
| **Iconic hook** | *Start with a secure form. Takes about 3 minutes.* | The conversion-proximate kicker. Sits next to primary CTAs, runs as the headline on Google Ads, anchors the end of long-scroll marketing pages. | CTA proximity, Google Ads headlines, paid social creative, long-scroll closers. |

**Plus one guarantee, always visible at conversion points:**

> *Full refund if the doctor declines.*

This is the merchandised promise. It lives above checkout CTAs, inline on hero CTAs, and on `/guarantee`. It is not a tagline, not a wedge, and not a time guarantee.

---

## 5 Dos

1. **Short sentences. Full stops.** Three full stops beat one comma every time. *Fill it out. Get on with it.*
2. **Name the wait, then remove it.** *You used to wait three weeks for a GP. Not anymore.*
3. **Use negation carefully.** *No appointment. No waiting room.* is broadly safe. *No call* is med-cert-specific unless a clinician has explicitly approved the service context.
4. **Lead with clinical accountability.** Use the approved doctor and clinical-model claims. Do not erase the doctor-owned certificate protocol or hide behind "our platform."
5. **Price in the first breath, not the footer.** Numbers are trust signals. *Medical certificate, $24.95. Start with a secure form.*

## 5 Don'ts

1. **Never use em-dashes** (`—`). Use commas, periods, colons, or parens. The em-dash is an AI-writing tell. Zero exceptions. The voice-guard test fails the build if one slips in.
2. **Never use hype words.** `cutting-edge`, `world-class`, `revolutionary`, `game-changer`, `transformative`, `seamless`, `empower`, `holistic`, `wellness journey`, `synergy`, `at the end of the day`. Banned list enforced in code.
3. **Never say "our platform" or "our solution."** You are a doctor. Patients don't want a platform, they want a doctor.
4. **Never write a sentence a real doctor wouldn't say out loud.** If you can't imagine a doctor saying it during a consult, cut it.
5. **Never stack adjectives.** *Fast, easy, convenient* is three lies in a row. Pick one and prove it with a number.

---

## Brand phrases and aliases

1. *Faster than your GP.*
2. *Faster than the wait at your GP.* (paid-safe variant)
3. *Telehealth without the small talk.*
4. *Start with a secure form. Takes about 3 minutes.*
5. *Telehealth without the small talk. A real doctor, ready in the time it takes to make a coffee.* (brand thesis)
6. *A real doctor, ready in the time it takes to make a coffee.*
7. *A real doctor, online, the moment you need one.*
8. *No appointment. No waiting room. Start with a secure clinical form.*
9. *No video. No call. No appointment.*
10. *Complete a secure clinical form. A doctor reviews it and may call you briefly before prescribing.*
11. *The doctor is in.* (legacy / alternative hook)
12. *Full refund if the doctor declines.*
13. *Real doctors. No runaround.*
14. *A doctor, not a queue.*
15. *Doctor-owned. Clearly explained.*
16. *Fill it out. Get on with it.*

These are voice-layer strings, not permission to improvise factual claims. Several aliases in `lib/marketing/voice.ts` deliberately resolve through `getApprovedClaim()` so their evidence stays attached.

## Approved factual claims (do not rewrite)

Public factual copy with clinical, operational, privacy, complaint, refund, doctor, or certification risk comes from `lib/marketing/approved-claims.ts`. Use the relevant claim ID rather than a near-duplicate:

- `availability_24_7`: *Requests can be submitted and reviewed 24/7. Review timing varies with clinical complexity, follow-up questions, and queue volume.*
- `clinical_decision_model`: *AI never prescribes or makes clinical decisions. Eligible low-risk certificate requests may be approved under a doctor-owned protocol and are individually reviewed afterward.*
- `clinical_review_sequence`: *Prescribing requests receive doctor review before any prescription is issued. Eligible low-risk certificate requests may follow a doctor-owned protocol and are individually reviewed afterward.*
- `clinical_access_scope`: *Clinical access is role-scoped. Doctors and the owner-admin can access records needed for care; support sees only bounded, masked operational data.*
- `complaints_timing`: *We acknowledge complaints within 24 hours. Clinical complaints target resolution within 14 days.*
- `doctor_registration`: *Clinical reviews are performed by AHPRA-registered doctors under documented clinical governance.*
- `refund_payment_process`: *You pay upfront. If the doctor declines, the full request fee and priority fee are automatically refunded to the original payment method.*

Certification labels also come from the registry. Google advertising eligibility is `Google Ads Online Pharmacy Certification`; it is not a telehealth or clinical endorsement. Public doctor copy must not disclose doctor count or individual names, or add fellowship, training, insurance-coverage, or monitoring claims without current evidence receipts.

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

Weight-loss entries below are future-ready guidance only. They do not authorise public service acquisition, paid traffic, or checkout access while weight loss remains gated.

| Context | Approved copy | Avoid |
|---|---|---|
| Availability | Requests can be submitted and reviewed 24/7. Review timing varies with clinical complexity, follow-up questions, and queue volume. | Review-hours windows, vague availability caveats, or guaranteed turnaround. |
| Clinical decisions | AI never prescribes or makes clinical decisions. Eligible low-risk certificate requests may be approved under a doctor-owned protocol and are individually reviewed afterward. | "Every request is manually reviewed", "AI approves", or broad claims that nothing is automated. |
| Medical certificates | No video. No call. No appointment. | Accepted by all employers, 98% accepted, special consideration, deferred exam. |
| Prescription services | Complete a secure clinical form. A doctor reviews it and may call you briefly before prescribing. | No call needed, guaranteed prescription, get [drug] online. |
| ED / hair loss | Private form-first assessment. A doctor reviews it and may call briefly before prescribing. | No call needed, drug names in ads, outcome guarantees. |
| Weight loss (future/gated) | Doctor review for weight management options. Extra information or a call may be required for safety. | Weight loss injections, guaranteed weight loss, before/after claims. |
| Complaints | We acknowledge complaints within 24 hours. Clinical complaints target resolution within 14 days. | Business-day acknowledgement wording, a fixed public service-resolution promise, or presenting the 14-day target as guaranteed. |
| Paid ads | Service-level, no drug terms, no testimonials. | Drug names, prescription-only medicine prices, remarketing to health audiences. |

Deeper rules: `docs/ADVERTISING_COMPLIANCE.md` and `docs/SEO_CONTENT_POLICY.md`.

---

## Where each layer renders

| Surface | Uses |
|---|---|
| Homepage hero | `TAGLINE` (H1) + `PROP_PHRASE` (H2) + the focused five-service boundary (subhead) |
| `/medical-certificate` | `TAGLINE` + `MED_CERT_WEDGE`, `ICONIC_HOOK` + `GUARANTEE` above CTA |
| `/prescriptions` | `TAGLINE` + `FORM_FIRST_WEDGE`, `ICONIC_HOOK` + `GUARANTEE` above CTA |
| `/erectile-dysfunction` | subtype-specific form-first copy, `GUARANTEE` above CTA |
| `/hair-loss` | subtype-specific form-first copy, `GUARANTEE` above CTA |
| `/weight-loss` (future/gated) | Educational or coming-soon copy only; manual-review safety framing, no drug names, no outcome guarantee, and no active-service CTA until launch approval. |
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

- For a high-risk factual claim, edit `lib/marketing/approved-claims.ts` and update its contexts, risk, notes, and evidence receipts. Then use `getApprovedClaim()` or a deliberate voice alias.
- For a stable brand alias or the banned-phrase and em-dash APIs, edit `lib/marketing/voice.ts`.
- Do not hardcode either class of string in a component.

This separation keeps tone reusable without detaching operational or clinical statements from proof. A factual claim without a current receipt does not ship.
