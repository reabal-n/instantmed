# BRAND.md — InstantMed

> **Version: 1.0.0** · Created 2026-04-29 · Single source of truth for brand identity, voice, signature devices, and brand-stretch rules.
>
> **Load every brand or marketing session.** This doc is the spine. It points to the supporting docs that own the deeper layers (voice, design, photography). Copy lives in code (`lib/marketing/voice.ts`); rules and rationale live here.

---

## 1. Brand thesis

> *Telehealth without the small talk. A real doctor, ready in the time it takes to make a coffee.*

This single sentence is the spine. It tells you who the brand is for (people who don't have time for a full GP visit), what they get (a real doctor, not a chatbot), how it feels (warm, immediate, no friction), and where it lives (online, the moment they need it).

If a piece of copy or a design choice doesn't ladder up to this sentence, it's drifting.

## 2. Patient

**Time-poor urban professional, 25-45.** Works full-time, values speed, hates GP wait times, will pay a premium to skip the call. Ethnically diverse, urban Sydney / Melbourne / Brisbane / Perth, lives in an apartment or a small terrace, takes the tram, drinks the morning coffee, opens their laptop on the couch when they're sick. They don't want a healthcare brand to talk to them like a clinic; they want it to talk to them like a friend who happens to be a doctor.

This anchor archetype shapes voice, photography, headline tone, and which features we prioritise. Other archetypes (regional patients, anxious health-avoiders, parents) are valid and welcome, but they are not the primary lens.

## 3. Voice

| Trait | Do | Don't |
|---|---|---|
| **Direct** | "Got the flu? You'll need a cert. Start here." | "Are you feeling unwell and require documentation for your employer?" |
| **Warm but not cute** | "We've got you. Three minutes." | "Hey friend! Let's get you sorted!" |
| **Confidently fast** | "Faster than your GP. Same training." | "Lightning-fast medical solutions powered by AI!" |
| **Quietly clever** | "Skip the waiting room. Keep the chair." | Puns about pills, winks about ED, jokes about being sick. |
| **Of-Australia, of-now** | Australian English. Real cities. Tuesday-arvo references. | Generic "global telehealth" copy that could be from anywhere. |

The dial: **Mosh's warmth with Pilot's CTA confidence.** Two competitors who've each owned half of what we want. We sit between them.

Deeper rules — sentence-length, dos/don'ts, voice-by-surface, banned phrases, healthcare compliance copy — live in [`docs/VOICE.md`](VOICE.md). Brand thesis lives there too. The code constants live in [`lib/marketing/voice.ts`](../lib/marketing/voice.ts) and are scanned in CI by `lib/__tests__/voice-guard.test.ts`.

## 4. Tagline system

Three lines, three jobs. Repetition across surfaces locks recognition.

| Surface / job | Line | Code constant |
|---|---|---|
| Brand spine (homepage H1, GBP cover, email signature) | *Faster than your GP.* | `TAGLINE` |
| Conversion hook (CTA proximity, paid creative headlines) | *Three minutes. Done.* | `ICONIC_HOOK` |
| Voice signature (homepage H2, about lede, ad end-frame, footer) | *Telehealth without the small talk.* | `PROP_PHRASE` |
| Google-Ads-safe variant (paid only) | *Faster than the wait at your GP.* | `TAGLINE_PAID_SAFE` |
| About page lede / OG image / brand-film outro | *Telehealth without the small talk. A real doctor, ready in the time it takes to make a coffee.* | `BRAND_THESIS` |

Hero stack reads:
> # Faster than your GP.
> ## Telehealth without the small talk.
> [Get started — three minutes, done.]

H2 and voice signature share the same line on purpose. Saying it twice across the brand is the recognition device, not a duplicate.

## 5. Visual system

| Layer | Decision |
|---|---|
| **Page background** | Warm ivory `#F8F7F4`, never pure white |
| **Card surface** | Pure white on ivory, sky-toned shadows, solid (never frosted) |
| **Primary CTA / system blue** | `--primary` `#2563EB` (light) / `#5DB8C9` teal (dark). Unchanged. |
| **Brand signature accent (NEW)** | Warm coral `--brand-coral` `#FF6B5B`. Used sparingly on brand-recognition moments only — see §6 for placement rules. |
| **Display type (NEW)** | Plus Jakarta Sans for hero headlines (`font-display` Tailwind utility, 48px+). Body type unchanged (Source Sans 3). |
| **Photography** | Real-AU candid, soft morning light, no white coats / stethoscopes / sterile clinic. Brief: [`docs/PHOTOGRAPHY_BRIEF.md`](PHOTOGRAPHY_BRIEF.md) |
| **Illustration** | 12-piece soft hand-drawn line-and-fill spot system. Used at empty states, confirmation pages, section breaks. To be commissioned/generated in the brand-rehaul sprint. |
| **Motion** | One signature: ivory-to-dawn gradient sweep on page enter + 300ms ease-out lift on primary CTA hover. Respect `useReducedMotion()`. |

Deeper rules — full token list, spacing, radius, shadow, hero variants, motion presets — live in [`DESIGN.md`](../DESIGN.md). The design system is law; this brand doc complements it, doesn't override it.

## 6. Signature brand devices

Five distinctive moves that make the brand recognisable beyond colour and type. All five must ship in the brand-rehaul sprint. They compound: each independently low-cost, together they make InstantMed unmistakable.

### 6.1 Live wait-counter

A small live counter on hero pages: *"Average med cert today: 14 minutes from form to inbox."* Pulled from real data via PostHog `request_submitted` → `request_approved` event delta. Median, rolling 4-hour window.

**Graceful degradation rules:**
- Cap displayed queue length at "6+" (don't display "47 ahead of yours" — backfires)
- Pre-6am / post-10pm AEST for Rx/consults: show "On standby. First review at 6am." (or relevant hours)
- If a doctor is actively reviewing: show "Doctor reviewing now" rather than a count
- If no data in last 24h: hide the counter entirely (don't fake a number)

**Implementation:** `<WaitCounter />` component in `components/marketing/`, data via `lib/brand/wait-counter.ts`. Brand-coral pulse on the dot indicator.

### 6.2 Doctor's handwritten signature

Real signature from the Medical Director. The image asset already exists at `public/branding/eSignature.png`.

**Surface rules** (compliant with CLAUDE.md "no individual doctor names on marketing pages"):
- Marketing pages, homepage footer: stylised signature mark only, no readable name. Acts as a logo-adjacent device.
- Cert PDFs, decline emails, dashboard messages, email signoff: full *Dr. [Name]* + signature.
- Decline messages: full name OK (patient-facing).

**Multi-doctor scaling:** When the second clinician onboards, the signature becomes per-doctor. Architect now: `<DoctorSignature doctorId={...} />` component pulling from `doctors` table, falling back to the Medical Director's mark on marketing surfaces. Don't paint into the corner of a single-doctor identity.

### 6.3 "What we won't do" page

A short, plainspoken page (`/what-we-wont-do` or merged into `/guarantee`) listing the limits we lead with. Counter-intuitive trust-building: most competitors hide their limits, we lead with them.

Examples:
- We won't issue a cert if you should see a doctor in person.
- We won't prescribe controlled drugs.
- We won't pretend AI is a doctor.
- We won't write a cert for high-stakes use cases (court, exam deferral, fitness-to-drive, fitness-to-fly, custody, NDIS).
- We won't ghost you. Every request gets a real-doctor outcome, even when the answer is no.

Linked from footer + homepage trust strip + decline messages.

### 6.4 Patient-name-first emails

Not "Dear Patient." Not "Hi Reabal,". Just "Reabal," on a line by itself, then the message. More like a real doctor's secretary than a SaaS product. Tiny, distinctive, applied across cert delivery, decline, follow-up, and invoice emails.

### 6.5 "While you wait" specificity screen

Replaces the post-submit generic spinner. Shows specific data:

> *Dr. [Name] is reviewing 4 requests ahead of yours. Average wait today: 18 minutes. We'll email the moment it's ready, you can close this tab.*

Specificity is the brand promise. If we can't be specific (off-hours, queue empty), the screen falls back to a calm, honest line ("We'll email the moment a doctor reviews this. You can close this tab."). Never lies.

## 7. Brand stretch (multi-category rules)

The brand is constant across categories; the *temperature* shifts. Same person, dressed for different occasions.

| Surface | Voice tilt | Photography tilt | Headline temperature |
|---|---|---|---|
| Med cert | Light, utility, almost cheeky | Daylight, urban, kettle/laptop | Warm, fast |
| Repeat Rx | Quiet, reliable, almost domestic | Kitchen counter, morning routine | Calm, trustworthy |
| ED (future) | Mature, private, confident, never winking | Dimmer light, single male subject, no clichés | Direct, dignified |
| Hair loss (future) | Grounded, scientific-but-human | Neutral, head-and-shoulder portraits | Practical, results-led |
| Weight loss (future) | Clinically credible, evidence-led, never aspirational-aesthetic | Daylight, real bodies, never before/after | Conservative, factual |

**Brand spine that stays constant across all of these:** palette (ivory + coral accent + system blue), Plus Jakarta Sans display, sentence-fragment voice, signature devices, banned phrases, AHPRA-compliant copy rules.

**Specific brand-stretch rules to honour now even though some pages launch later:**

- **ED:** never euphemistic (no "rise and shine", no "performance", no "stand up"). Mature, direct, dignified. The patient is an adult; speak to one.
- **Hair loss:** medical not cosmetic. Results-led not shame-led. No before/after photography. The frame is "treat it like a medical thing, because it is."
- **Weight loss:** evidence-led only. Per `docs/ADVERTISING_COMPLIANCE.md`, no Schedule 4 drug names, no outcome guarantees, no "transform your body" language. The frame is medical risk management, not aesthetic transformation.

## 8. Banned words / patterns

Enforced in CI via `lib/__tests__/voice-guard.test.ts`. The full list lives in `BANNED_PHRASES` in `lib/marketing/voice.ts`. Highlights:

- `solutions`, `leverage`, `unlock`, `world-class`, `seamless`, `revolutionary`, `transformative`
- `your journey` / `wellness journey` / `healthcare journey`
- `empower` / `empowered`
- `ai-powered` / `powered by ai` (positioning is *real doctor*; AI is plumbing, not the brand)
- Em dashes (`—`) anywhere — use commas, periods, colons, or parens
- Stretched-smile testimonials, "trusted by thousands" without specificity, apologising microcopy ("Sorry for the inconvenience...")

## 9. Photography & illustration

[`docs/PHOTOGRAPHY_BRIEF.md`](PHOTOGRAPHY_BRIEF.md) is the brief. It covers:

- 8-shot launch list with scenes and moods
- Acceptance criteria (Australian context, no stock-photo feel, no doctor face per CLAUDE.md identity rule)
- GPT prompt scaffold for generative AI
- Cost benchmarks (commission vs. stock vs. generative)

Illustration system: 12-piece set, soft hand-drawn line-and-fill, warm coral as the optional accent within illustrations. To be commissioned or generated in the brand-rehaul sprint and stored under `public/illustrations/`.

## 10. Compliance notes

- **TGA / AHPRA on `Faster than your GP.`** — comparative health-service advertising. Defensible because it compares process speed (booking + appointment time) not clinical outcome and is substantiable. May trigger Google Ads healthcare review — switch paid creative to `TAGLINE_PAID_SAFE` ("Faster than the wait at your GP.") which is lower-risk.
- **Substantiation page** — `/why-instant` (or merged into `/about`) shows the math: median GP wait per ABS / RACGP source vs. our median delivery time. Required if we keep the comparative tagline as the brand spine.
- **Identity rule** — no individual doctor name on marketing pages (CLAUDE.md). Cert PDFs, decline messages, dashboard, and email signoff use the full name; marketing pages use the stylised signature mark only.

Deeper compliance rules in [`docs/ADVERTISING_COMPLIANCE.md`](ADVERTISING_COMPLIANCE.md) and [`docs/SEO_CONTENT_POLICY.md`](SEO_CONTENT_POLICY.md).

## 11. Where to change things

| You want to change | You edit |
|---|---|
| The tagline / prop phrase / iconic hook / brand thesis / paid-safe variant | `lib/marketing/voice.ts` (one place, every surface re-renders next deploy) |
| The voice rules, banned phrases, voice-by-surface rendering | `docs/VOICE.md` + `lib/marketing/voice.ts` (BANNED_PHRASES list) |
| The visual system (colour, type, spacing, motion) | `DESIGN.md` + `app/globals.css` |
| Photography brief / shot list / generative prompts | `docs/PHOTOGRAPHY_BRIEF.md` |
| The brand thesis, archetype, signature devices, brand-stretch rules | this doc (`docs/BRAND.md`) |

If a brand string is hardcoded in a component, that's a bug. Import the constant from `lib/marketing/voice.ts` and render it.

---

**Maintained by:** Rey + Anthropic Opus collaborative.
**Last reviewed:** 2026-04-29 (initial version).
