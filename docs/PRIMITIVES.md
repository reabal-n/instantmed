# Marketing Primitives Registry

> Shared data modules and components that marketing pages must use instead of hardcoding values. High-risk factual copy must retain the evidence receipts in `lib/marketing/approved-claims.ts`; voice aliases and banned-phrase APIs remain in `lib/marketing/voice.ts`.

---

## 1. Social Proof — `lib/social-proof/index.ts`

Single source of truth for all platform metrics shown on marketing pages.

| Export | Type | What it provides |
|--------|------|-----------------|
| `SOCIAL_PROOF` | `const object` | Raw operational metrics: `certTurnaroundMinutes`, `averageResponseMinutes`, `refundPercent`, `operatingDays`, and internal historical counters. NO operating-hours window fields (service is 24/7; removed 2026-07-10). Review counts, testimonials, public numeric ratings, employer acceptance rates, approval rates, and fulfilment-rate claims are not public primitives. |
| `SOCIAL_PROOF_DISPLAY` | `const object` | Pre-formatted strings: `responseTime`, `certTurnaround`, `operatingSchedule`, `refundGuarantee`, and non-outcome trust phrasing. `operatingHours` was removed 2026-07-10 (computed a retired review-hours window). |
| `GOOGLE_REVIEWS` | `object` | Google Business Profile star-badge config. Gates the visual Google mark + stars badge only; do not expose review counts, numeric rating text, testimonial copy, or aggregate-rating schema. |

**Rule:** Never hardcode a social proof number on a marketing page. Import from `SOCIAL_PROOF` or `SOCIAL_PROOF_DISPLAY`.

There is no patient-count primitive or public patient-count API. The synthetic interpolation and all of its plumbing were retired on 2026-07-14. Any future count claim requires a verified persisted source and a fresh compliance review.

---

## 2. Trust Badges — `lib/marketing/trust-badges.ts`

Centralized badge definitions with icon, color, tooltip, and styled/plain tiers.

| Export | Type | What it provides |
|--------|------|-----------------|
| `BADGE_REGISTRY` | `Record<BadgeId, BadgeConfig>` | 26 badges across 6 categories: Credential (ahpra, tga advertising-aware, documented_protocols, medical_director, refund, privacy), Payment/Security (stripe, ssl, pci, au_data), Friction-free (no_call, no_speaking, form_only, no_waiting_room, no_appointment, from_your_phone, no_face_to_face, fast_form, same_day), Outcome (legally_valid, no_medicare, real_gp, instant_pdf), Social proof (social_proof), **Certifications (LegitScript and Google Ads Online Pharmacy Certification)**. |
| `BADGE_PRESETS` | `Record<string, PresetEntry[]>` | Pre-configured badge sets: `hero_medcert`, `hero_rx`, `hero_consult`, `hero_generic`, `doctor_credibility`, `pre_cta`, `medcert_pricing`, `medcert_outcome`, `checkout`, `footer`, `float`, **`trust_certifications`**. |
| `resolveEntry()` | `function` | Normalizes `PresetEntry` (string or `{id, variant}`) to `{id, variant}`. |

**Certification badges:** `legitscript` and `google_pharmacy` have styled tiers that render actual logos (LegitScript seal image, Google "G" multicolor SVG). Use `<TrustBadgeRow preset="trust_certifications" />` for an inline row, or the standalone components `LegitScriptSeal` (`components/marketing/legitscript-seal.tsx`) and `GoogleAdsCert` (`components/marketing/google-ads-cert.tsx`) for larger dedicated displays (e.g. footer logo row, trust page hero).

Certification copy comes from `legitscript_*` and `google_healthcare_ads_*` in `lib/marketing/approved-claims.ts`. Google approval is advertising eligibility, not a telehealth or clinical endorsement.

**Rule:** Max 2 styled badges per row. Never put `no_call` + `no_speaking` together (redundant). Use `BADGE_PRESETS` for standard placements; compose custom sets from `BADGE_REGISTRY` for page-specific needs.

**Clinical/advertising rule:** `no_call` and `no_speaking` are med-cert-only unless a clinician explicitly approves the context. Prescription, ED, hair loss, women's health, and weight-loss surfaces use `form_only`, `no_appointment`, `no_waiting_room`, or form-first copy instead.

---

## 3. Stats Strip — `components/marketing/total-patients-counter.tsx`

| Export | Type | What it provides |
|--------|------|-----------------|
| `StatsStrip` | `component` | Compact strip showing AHPRA-registered doctor review and the refund guarantee using verified primitives. It must not show synthetic patient counts, public approval-rate claims, or fulfilment-rate claims. |

**Usage:** Render `StatsStrip` on an approved marketing surface. Operational values come from `SOCIAL_PROOF`; factual doctor/refund labels come from `lib/marketing/approved-claims.ts`, directly or through a deliberate voice alias.

---

## 4. Pricing — `lib/constants/index.ts`

| Export | Type | What it provides |
|--------|------|-----------------|
| `PRICING` | `const object` | Raw prices: `MED_CERT` ($24.95), `MED_CERT_2DAY` ($29.95), `MED_CERT_3DAY` ($39.95), `REPEAT_SCRIPT` ($29.95), `NEW_SCRIPT` ($49.95), `CONSULT` ($49.95), `MENS_HEALTH` ($49.95), `WOMENS_HEALTH` ($49.95), `HAIR_LOSS` ($49.95), `WEIGHT_LOSS` ($89.95 reserved), `REFERRAL` ($29.95), `PATHOLOGY` ($29.95), `PRIORITY_FEE` ($9.95). Women's health is active; weight-loss remains reserved/future and must not render as a live checkout path until launch readiness is explicitly changed. |
| `PRICING_DISPLAY` | `const object` | Formatted strings: `MED_CERT` ("$24.95"), `FROM_MED_CERT` ("From $24.95"), `RANGE` ("$24.95 - $49.95"), etc. |

**Rule:** Never hardcode a price. Stripe price IDs are mapped separately in `lib/stripe/price-mapping.ts`.

**Business rule:** Repeat Rx subscription acquisition is dormant/future strategy. Do not add subscription display prices or market subscriptions until `docs/BUSINESS_PLAN.md` and `docs/REVENUE_MODEL.md` are updated to reactivate them.

---

## 4a. Approved Claims — `lib/marketing/approved-claims.ts`

Canonical control point for repeated public claims with clinical, operational, privacy, complaints, doctor, refund, or certification risk.

| Export | Type | What it provides |
|--------|------|-----------------|
| `APPROVED_CLAIMS` | `Record<ApprovedClaimId, ApprovedClaim>` | Approved text plus allowed contexts, risk level, implementation notes, and evidence-receipt paths. |
| `getApprovedClaim()` | `function` | Returns the approved text for a typed claim ID. Use this in components instead of copying the string. |

Core PR5 claims include `availability_24_7`, `clinical_decision_model`, `clinical_review_sequence`, `clinical_access_scope`, `complaints_timing`, `doctor_registration`, `refund_payment_process`, and the LegitScript/Google certification labels and tooltips. The clinical-model text must remain explicit: AI never prescribes or makes clinical decisions; eligible low-risk certificate requests may use a doctor-owned protocol and are individually reviewed afterward. The review-sequence claim keeps prescribing review-before-issue separate from eligible certificate protocol outcomes that receive individual review afterward.

**Rule:** A high-risk factual string is changed in this registry together with its contexts, risk, notes, and receipts. Do not fork it in `voice.ts`, a badge config, schema, metadata, or page copy. Public doctor claims use "AHPRA-registered doctors" without count or names.

---

## 4b. Voice — `lib/marketing/voice.ts`

| Export | Type | What it provides |
|--------|------|-----------------|
| `TAGLINE` | `string` | Logo-adjacent promise: "Faster than your GP." |
| `WEDGE` | `string` | Default platform wedge: no appointment, no waiting room, secure clinical form. |
| `MED_CERT_WEDGE` | `string` | Med-cert-only wedge: "No video. No call. No appointment." |
| `FORM_FIRST_WEDGE` | `string` | Prescribing/specialty wedge: doctor reviews the form and may call briefly before prescribing. |
| `GUARANTEE` | `string` | Outcome guarantee: "Full refund if the doctor declines." |
| `GUARANTEE_LABEL` | `string` | Compact display label: "Refund if declined". Use in stat strips, badges, and dense trust rows. |
| `BANNED_PHRASES` | `readonly string[]` | Brand voice banned phrases enforced by tests. |
| `containsBannedPhrase()` / `containsEmDash()` | `functions` | Reusable voice-policy guards. |

**Rule:** `voice.ts` owns stable brand aliases and voice-policy APIs. Its factual aliases resolve through `getApprovedClaim()` so evidence remains attached to the registry. Healthcare advertising rules live in `docs/ADVERTISING_COMPLIANCE.md`; SEO rules live in `docs/SEO_CONTENT_POLICY.md`.

---

## 5. FAQ Data — `lib/data/*-faq.ts`

Canonical FAQ content per service. All exports are `FAQItem[]` or `FAQGroup[]` (from `components/ui/faq-list.tsx`).

| File | Export | Items | Used by |
|------|--------|-------|---------|
| `med-cert-faq.ts` | `MED_CERT_FAQ` | Flat `FAQItem[]` | `faq-cta-section.tsx` (med-cert landing) |
| `prescription-faq.ts` | — | Flat `FAQItem[]` | Prescription funnel |
| `consult-faq.ts` | — | Flat `FAQItem[]` | Consult funnel |
| `ed-faq.ts` | — | Flat `FAQItem[]` | ED landing |
| `hair-loss-faq.ts` | — | Flat `FAQItem[]` | Hair loss landing |
| `general-faq.ts` | `GENERAL_FAQ` | `FAQGroup[]` (7 categories, 34 Qs) | `/faq` page via `AccordionSection` |

**Rendering primitives:**
- `FAQList` (`components/ui/faq-list.tsx`) — bare accordion, flat or grouped. Card-style default. Override with `itemClassName`.
- `AccordionSection` (`components/sections/accordion-section.tsx`) — page-level section wrapper with `SectionHeader`, grouped accordion.

**Rule:** New FAQ content goes in `lib/data/<service>-faq.ts`. Page components import data; they don't define it inline.

---

## 6. Wait Times — `lib/brand/wait-counter.ts` + `components/marketing/live-wait-time.tsx`

Metric-backed wait display per service. No fake randomization.

| Constant | Scope |
|----------|-------|
| `SERVICE_CONFIG` | Internal to `live-wait-time.tsx`. Keys: `med-cert`, `scripts`, `consult`, `consult-ed`, `consult-hair-loss`. |

`getWaitState()` reads recent medical-certificate rows and degrades to neutral review copy when metrics are missing, stale, or the queue is pressured. Client-only `LiveWaitTime` surfaces must use neutral "fast doctor review" or submit/review copy unless a server-fed metric state is passed in. Prescription, ED, hair-loss, and broad consult surfaces must not render under-hour approval or prescribing claims.

**Components:** `LiveWaitTime` (single service), `WaitTimeStrip` (all services in a row).

---

## 7. Service Funnel Template — RETIRED (deleted 2026-07-03)

The generic service funnel template (`components/marketing/service-funnel-page.tsx`, `components/marketing/funnel/*`, `lib/marketing/service-funnel-configs.ts`) was deleted: its only consumer was the General Consult route retired 2026-05-20, and it sat unmounted for six weeks while compliance sweeps kept polishing its dead copy. Every live service page (med-cert, ED, hair loss, prescriptions) uses a dedicated custom layout — copy one of those, do not resurrect the template.

---

## Quick Reference: Where to Change Things

| "I need to change..." | Edit this file |
|------------------------|---------------|
| A social proof number (rating, approval %, turnaround) | `lib/social-proof/index.ts` |
| A price | `lib/constants/index.ts` |
| A high-risk factual claim or its evidence | `lib/marketing/approved-claims.ts` |
| A tagline, wedge, or guarantee | `lib/marketing/approved-claims.ts`, then its stable alias in `lib/marketing/voice.ts` |
| A high-risk trust-badge label or tooltip | `lib/marketing/approved-claims.ts` |
| A trust-badge icon, colour, tier, or composition | `lib/marketing/trust-badges.ts` |
| Which badges appear on a page | `lib/marketing/trust-badges.ts` → `BADGE_PRESETS` |
| FAQ content for a service | `lib/data/<service>-faq.ts` |
| General FAQ content (/faq page) | `lib/data/general-faq.ts` |
| Wait time display | `components/marketing/live-wait-time.tsx` → `SERVICE_CONFIG` |
| Stat strip metrics for a service | `components/marketing/total-patients-counter.tsx` → `STAT_PRESETS` |
| Google Reviews config | `lib/social-proof/index.ts` → `GOOGLE_REVIEWS` |
| A patient-count claim | No current primitive; establish a verified persisted source and complete compliance review first |
| Paid ads or acquisition copy | `docs/ADVERTISING_COMPLIANCE.md` |
| Educational prescription/medicine SEO content | `docs/SEO_CONTENT_POLICY.md` |
