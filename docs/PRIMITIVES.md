# Marketing Primitives Registry

> Shared data modules and components that marketing pages must use instead of hardcoding values. If a number, label, or FAQ appears on a marketing page, it should come from one of these.

---

## 1. Social Proof — `lib/social-proof.ts`

Single source of truth for all platform metrics shown on marketing pages.

| Export | Type | What it provides |
|--------|------|-----------------|
| `SOCIAL_PROOF` | `const object` | Raw numbers: `averageRating`, `certTurnaroundMinutes`, `averageResponseMinutes`, `certApprovalPercent`, `scriptFulfillmentPercent`, `sameDayDeliveryPercent`, `refundPercent`, `reviewCount`, etc. |
| `SOCIAL_PROOF_DISPLAY` | `const object` | Pre-formatted strings: `rating`, `ratingWithStar`, `responseTime`, `certTurnaround`, `operatingHours`, `refundGuarantee`, `sameDayDelivery`, etc. |
| `GOOGLE_REVIEWS` | `object` | Google Business Profile config: `enabled`, `placeId`, `reviewsUrl`, `rating`, `count`. Gates `GoogleReviewsBadge` and `OrganizationSchema`. |
| `getPatientCount()` | `function` | Server-safe interpolated patient count. Client hook: `usePatientCount()` from `lib/use-patient-count.ts`. |

**Rule:** Never hardcode a social proof number on a marketing page. Import from `SOCIAL_PROOF` or `SOCIAL_PROOF_DISPLAY`.

---

## 2. Trust Badges — `lib/trust-badges.ts`

Centralized badge definitions with icon, color, tooltip, and styled/plain tiers.

| Export | Type | What it provides |
|--------|------|-----------------|
| `BADGE_REGISTRY` | `Record<BadgeId, BadgeConfig>` | 26 badges across 6 categories: Credential (ahpra, tga, racgp, medical_director, refund, privacy), Payment/Security (stripe, ssl, pci, au_data), Friction-free (no_call, no_speaking, form_only, no_waiting_room, no_appointment, from_your_phone, no_face_to_face, fast_form, same_day), Outcome (legally_valid, no_medicare, real_gp, instant_pdf), Social proof (social_proof), **Certifications (legitscript, google_pharmacy)**. |
| `BADGE_PRESETS` | `Record<string, PresetEntry[]>` | Pre-configured badge sets: `hero_medcert`, `hero_rx`, `hero_consult`, `hero_generic`, `doctor_credibility`, `pre_cta`, `medcert_pricing`, `medcert_outcome`, `checkout`, `footer`, `float`, **`trust_certifications`**. |
| `resolveEntry()` | `function` | Normalizes `PresetEntry` (string or `{id, variant}`) to `{id, variant}`. |

**Certification badges:** `legitscript` and `google_pharmacy` have styled tiers that render actual logos (LegitScript seal image, Google "G" multicolor SVG). Use `<TrustBadgeRow preset="trust_certifications" />` for an inline row, or the standalone components `LegitScriptSeal` (`components/marketing/legitscript-seal.tsx`) and `GoogleAdsCert` (`components/marketing/google-ads-cert.tsx`) for larger dedicated displays (e.g. footer logo row, trust page hero).

**Rule:** Max 2 styled badges per row. Never put `no_call` + `no_speaking` together (redundant). Use `BADGE_PRESETS` for standard placements; compose custom sets from `BADGE_REGISTRY` for page-specific needs.

---

## 3. Stat Presets — `components/marketing/total-patients-counter.tsx`

Service-specific stat configurations for social proof strips.

| Export | Type | What it provides |
|--------|------|-----------------|
| `StatEntry` | `interface` | `{ icon: LucideIcon, value: number, suffix: string, label: string, color: string, decimals?: number }` |
| `STAT_PRESETS` | `Record<string, readonly StatEntry[]>` | 3 presets: `med-cert` (approval%, turnaround, rating, same-day delivery), `prescription` (fulfillment%, response time, rating, refund guarantee), `consult` (review time, rating, approval%, refund guarantee). All values sourced from `SOCIAL_PROOF`. |
| `TotalPatientsCounter` | `component` | Variants: `inline`, `card`, `hero`, `badge`. Uses `usePatientCount()` + `NumberFlow`. |
| `StatsStrip` | `component` | Compact strip showing patients served, approval rate, avg rating. |

**Usage:** Import `STAT_PRESETS['med-cert']` and render with an `AnimatedStat` component or map directly.

---

## 4. Pricing — `lib/constants.ts`

| Export | Type | What it provides |
|--------|------|-----------------|
| `PRICING` | `const object` | Raw prices: `MED_CERT` ($19.95), `MED_CERT_2DAY` ($29.95), `MED_CERT_3DAY` ($39.95), `REPEAT_SCRIPT` ($29.95), `NEW_SCRIPT` ($49.95), `CONSULT` ($49.95), `MENS_HEALTH` ($49.95), `WOMENS_HEALTH` ($59.95), `HAIR_LOSS` ($49.95), `WEIGHT_LOSS` ($89.95), `REFERRAL` ($29.95), `PATHOLOGY` ($29.95), `PRIORITY_FEE` ($9.95). |
| `PRICING_DISPLAY` | `const object` | Formatted strings: `MED_CERT` ("$19.95"), `FROM_MED_CERT` ("From $19.95"), `RANGE` ("$19.95 - $49.95"), etc. |

**Rule:** Never hardcode a price. Stripe price IDs are mapped separately in `lib/stripe/price-mapping.ts`.

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

## 6. Wait Times — `components/marketing/live-wait-time.tsx`

Static, honest wait time display per service. No fake randomization.

| Constant | Scope |
|----------|-------|
| `SERVICE_CONFIG` | Internal to `live-wait-time.tsx`. Keys: `med-cert`, `scripts`, `consult`, `consult-ed`, `consult-hair-loss`. |

Med-cert wait time reads from `SOCIAL_PROOF.certTurnaroundMinutes` (currently 20 min). Other services use fixed "Under 1 hour".

**Components:** `LiveWaitTime` (single service), `WaitTimeStrip` (all services in a row).

---

## 7. Service Funnel Configs — `lib/marketing/service-funnel-configs.ts`

Full-page configuration objects for the generic service funnel template (`service-funnel-page.tsx`). Each config defines hero, how-it-works, pricing, trust, testimonials, FAQ, and CTA content.

Type: `ServiceFunnelConfig` (from `components/marketing/funnel/funnel-types.ts`).

**Note:** Specialty landing pages (med-cert, ED, hair loss) use custom layouts, not the funnel template. The funnel template is for prescriptions and general consults.

---

## Quick Reference: Where to Change Things

| "I need to change..." | Edit this file |
|------------------------|---------------|
| A social proof number (rating, approval %, turnaround) | `lib/social-proof.ts` |
| A price | `lib/constants.ts` |
| A trust badge label, icon, or tooltip | `lib/trust-badges.ts` |
| Which badges appear on a page | `lib/trust-badges.ts` → `BADGE_PRESETS` |
| FAQ content for a service | `lib/data/<service>-faq.ts` |
| General FAQ content (/faq page) | `lib/data/general-faq.ts` |
| Wait time display | `components/marketing/live-wait-time.tsx` → `SERVICE_CONFIG` |
| Stat strip metrics for a service | `components/marketing/total-patients-counter.tsx` → `STAT_PRESETS` |
| Google Reviews config | `lib/social-proof.ts` → `GOOGLE_REVIEWS` |
| Patient counter growth model | `lib/social-proof.ts` → anchor/target constants |
