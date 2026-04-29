# Photography Commission Brief — InstantMed

> Creative direction for an Australian-context photography set replacing stock-style imagery across the marketing site. Generate via Nano Banana Pro / GPT-image / commission a freelancer. Target: lift visual quality from "telehealth template" to "Linear / Stripe / Loop-grade."

## Why we need this

Stock-style imagery currently caps the visual at ~9.0 on every page that uses it. Real, on-brand Australian-context photography lifts those pages by 0.3–0.5 each. The shoot pays back across **8 marketing pages**, ad creative, OG images, and email headers.

## Brand context (read this before generating)

- **Brand essence:** "Clarity emerging." Calm authority. Morning light. Good judgment. Read more in `DESIGN.md`.
- **Voice:** Calm, experienced GP explaining their service. Dry wit. Never stiff, never slangy.
- **Anti-patterns to AVOID:**
  - Crypto / SaaS / wellness influencer aesthetic
  - Smiling stock-photo "doctors" with stethoscopes draped artfully
  - Overlit white studio nothing-shots
  - Models in lab coats holding tablets
  - "Diverse smiling group around a laptop" tropes
  - Any visible non-Australian context (American outlets, EU power plugs, North American brand signage)

## What we want — visual signature

- **Morning light.** Soft, indirect, diffuse. Late-morning Sydney/Melbourne/Brisbane window light. NOT golden hour.
- **Australian context, subtly.** Eucalyptus visible through a window, a Bondi-style apartment balcony in soft focus, a Vegemite jar on a kitchen bench, an Australian power outlet. Don't yell it; let it ground.
- **Real homes, not studios.** Lived-in interiors — coffee cup, throw blanket, slightly unmade bed, daylight through linen curtains. Imperfection signals truth.
- **People in mid-action.** Holding a phone in their lap, half-glance at the screen, mid-coffee, mid-yawn. NOT eye-contact-with-camera. NOT posed.
- **Compositional restraint.** Single focal subject. Negative space. Rule-of-thirds. Loop.co/Linear restraint.
- **Phone-first focus.** The phone (where the cert / eScript / consult message lives) should be visible in most shots — but the *person* and *moment* are the subject, not the device.

## Shot list (8 final images)

Each shot should be deliverable in two crops: **16:9 (1920×1080)** for hero/banner use, and **4:3 (1600×1200)** for accent/content-section use. Prefer originals at higher resolution so we can re-crop for OG (1200×630) and email (600×200) without quality loss.

### 1. `home-1.webp` — Person at home reading their phone (replaces existing)
**Use:** /home (currently inside SocialProofSection accent), email headers
**Scene:** Australian, late 20s to mid 40s, in a sun-lit bedroom or living room. Sitting up in bed or on a couch, mug of tea on the side table, phone in hand. They look tired but calm — the moment they realise they don't have to leave the house. Linen sheets, eucalyptus through the window, soft.
**Mood:** Relief. "I don't have to drive anywhere."

### 2. `consult-1.webp` — Person on a video-free phone consult (replaces existing)
**Use:** /weight-loss, /consult, future ad creative
**Scene:** Person at a kitchen bench or dining table, phone on the bench in front of them, typing or reading. Late-morning light through a window. NOT a video call (we are async). A coffee or water glass nearby. They look engaged but unhurried.
**Mood:** Considered. "I'm answering this thoroughly because someone is going to read it."

### 3. `rx-1.webp` — At a pharmacy counter (replaces existing)
**Use:** /prescriptions (inside EScriptExplainerSection accent)
**Scene:** Person at an Australian pharmacy counter (Chemist Warehouse, Priceline, or generic). Phone screen visible showing an SMS-style eScript token. Pharmacist in soft focus background. Australian pharmacy interior cues — Healthy Living signage in soft background, AHPRA notice on a wall.
**Mood:** Frictionless. "I just showed them my phone and walked out with my medication."

### 4. `med-cert-context.webp` — Sick person on a couch with their laptop (NEW)
**Use:** /medical-certificate (currently no lifestyle photo), email confirmation
**Scene:** Person on a couch, throw blanket over their lap, laptop open showing a generic cert PDF preview (or just the email inbox). Tissue box on the side table, glass of water. Soft afternoon light. They look unwell but functional.
**Mood:** Honest. "I am genuinely sick and I'd rather not get out of this position."

### 5. `doctor-reviewing.webp` — A clinician's hands typing on a laptop (NEW)
**Use:** /trust, /clinical-governance, /our-doctors, /how-it-works
**Scene:** Top-down or over-the-shoulder shot of a clinician's hands typing on a laptop. Stethoscope visible but soft. Coffee mug. NOT showing the doctor's face (per CLAUDE.md "never advertise individual doctor names" + identity constraint — we cannot show the actual treating practitioner). Australian medical context cues — Medicare/AHPRA-pattern signage in soft background.
**Mood:** Considered. "Someone is reading this carefully."

### 6. `australian-context.webp` — Wide-shot Australian morning (NEW)
**Use:** /about, /trust, hero backdrop options
**Scene:** A wide environmental shot — a Sydney terrace at dawn, an Adelaide leafy street, a Brisbane apartment view with eucalyptus, a Melbourne laneway in soft early light. NO PEOPLE. Just place. Australian, unmistakably, but understated.
**Mood:** Grounded. "We're from here."

### 7. `phone-cert-detail.webp` — Macro of a phone showing a cert (NEW)
**Use:** OG image, hero detail shots, email confirmation
**Scene:** Tight macro of a hand holding a phone, screen in sharp focus showing a generic medical certificate PDF preview (or eScript token). The phone screen content can be a SPECIMEN watermark, no real names. Background shallow-DOF. Possibly a coffee mug ring on a wooden surface.
**Mood:** Resolved. "It's done. It's in my hand."

### 8. `family-context.webp` — Parent + child sick day (NEW)
**Use:** /for/parents, /faq, future "carer's leave" content
**Scene:** Parent on a couch with their child (toddler or primary-school age), child napping with their head on the parent's lap. Parent's phone visible, screen showing a calendar or message. Linen blanket, daylight, simple.
**Mood:** Domestic. "I needed a carer's leave certificate without dragging a sick kid to a clinic."

## Technical specs

- **Aspect ratios delivered:** 16:9 (banner), 4:3 (accent), 1:1 (social), 1200×630 (OG)
- **Format:** WebP (primary), with JPG fallback for OG
- **Color profile:** sRGB
- **DPI:** 72ppi on web, but capture at 300ppi originals
- **Quality target:** 85 (WebP), preserve detail in shadows
- **File naming:** Match existing `/public/images/*.webp` convention

## Color & light direction

- **Palette:** Morning Canvas (warm ivory, soft sky blue, dawn peach, champagne) per `DESIGN.md` §1
- **Color temperature:** 5200K–5800K. Warm but not orange.
- **Avoid:** Green-tinted fluorescent, cold blue mid-day, golden-hour saturation
- **Whites:** Should read as warm-white not cool-white. Pure white = wrong era of photography.
- **Skin tones:** True-to-life. No teal-and-orange grading.

## Diversity

The Australian audience is genuinely diverse. Across the 8 shots, represent:
- Age range 20s through 60s
- Mix of ethnicities reflecting AU demographics (ABS 2021 census broad strokes)
- At least one shot featuring an older patient (over 55) given prescriptions skew older
- Realistic body types — not exclusively slim
- No clichéd casting

## Generative-AI specific notes (Nano Banana Pro / GPT-image)

- **Disclose AI generation in image metadata** if you publish AI-generated humans (TGA / AHPRA compliance: don't pass off generated humans as real patient testimonials).
- **Do NOT generate fake doctor faces.** The "doctor reviewing" shot must be hands-only or face-obscured per the identity-constraint memory rule.
- **Watermark generated certificates with SPECIMEN.** Do not generate realistic-looking certificates that could be screenshotted out of context.
- **Test prompts ground the model in Australia.** Phrasings like "Australian morning light", "Sydney apartment interior", "AHPRA-context pharmacy" steer the generator away from American defaults.

## Where each image will be used

| File | Pages |
|---|---|
| `home-1.webp` | / (SocialProofSection accent), email |
| `consult-1.webp` | /weight-loss (above treatments), /consult (mockup fallback), ads |
| `rx-1.webp` | /prescriptions (EScriptExplainerSection accent) |
| `med-cert-context.webp` | /medical-certificate (NEW slot, recommended adjacent to LimitationsSection) |
| `doctor-reviewing.webp` | /trust, /clinical-governance, /our-doctors, /how-it-works (NEW slots) |
| `australian-context.webp` | /about, /trust hero accent (NEW slot) |
| `phone-cert-detail.webp` | OG images, hero details (NEW) |
| `family-context.webp` | /for/parents, /faq carer's leave content (NEW) |

## Acceptance criteria

Before swapping any image into `public/images/`:
- [ ] Australian context legible (window foliage, power outlet, signage, etc.)
- [ ] No "stock photo" feel (no posed eye contact, no overlit white)
- [ ] Morning Canvas palette honored (warm light, no cool-blue dominance)
- [ ] Per CLAUDE.md identity rule: no individual doctor face/name visible
- [ ] WebP optimized to ≤200KB at 1920×1080 (use `cwebp -q 85`)
- [ ] Alt text drafted alongside the file (not "person at home" — describe the moment)
- [ ] Reduced-motion behaviour: no parallax / no auto-zoom on these images

## Cost benchmark

- Freelance commission (1-day shoot, AU-based): $800–1,500 inc 8 final delivered shots
- Stock library (Getty / Adobe): $40–200 per shot, lower brand fit
- Generative AI (Nano Banana Pro / GPT-image): minutes of compute, requires careful prompting + curation pass

If commissioning a freelancer, brief them with this doc plus screenshots of Loop.co, Linear, and dub.co for the visual reference target.

## Generative AI prompt scaffold (GPT-image / Nano Banana Pro)

When generating images with GPT-image or similar, use this standing prompt as a base. Adjust the *scene* clause per shot from the shot list above; everything else stays identical for visual consistency.

> "Photograph in the style of Australian editorial lifestyle photography. Late-morning Sydney/Melbourne window light, soft and indirect, slightly overexposed in highlights. Shallow depth of field, single focal subject, candid mid-action moment (not posed, not eye-contact-with-camera). Real lived-in interior or street, NOT a studio. Australian, ethnically diverse, age 25–45 unless the shot specifies otherwise. Subtle Australian-context cues (eucalyptus, AU power outlet, AU pharmacy signage, Bondi-style apartment) but understated, never literal. Warm coral or amber may appear as an organic prop colour (a mug, a throw, a piece of clothing) — never as a graphic overlay. NO: white coats, stethoscopes, hands-on-tablets, sterile clinic, smiling-stock-doctor cliché, generic SaaS hero shot, AI-glow aesthetic. Captured on a Leica Q3-style sensor, 28mm equivalent, f/2.8."
>
> *Scene:* [insert scene clause from the shot list above]

After generation, run a curation pass against the §Acceptance criteria checklist before any image is committed to `public/images/`. Discard anything that fails even one criterion; iteration is cheaper than a stock-photo-feel hero in production.

---

**Last updated:** 2026-04-29. Update this doc when commissioning the next batch.
