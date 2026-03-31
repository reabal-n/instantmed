# Bespoke Landing Pages: `/prescriptions` and `/general-consult`

> Date: 2026-03-31
> Status: Approved
> Pattern: Follows `MedCertLanding` architecture — bespoke client components with lazy-loaded sections, service-specific hero mockups, full conversion infrastructure.

## Goal

Replace the generic `ServiceFunnelPage` (prescriptions) and custom-but-unpolished client component (general-consult) with bespoke landing pages matching the quality and conversion infrastructure of `/medical-certificate`.

## Architecture

Each page gets a single `"use client"` orchestrator component with lazy-loaded below-fold sections, a custom hero mockup, animated stats, and full conversion infrastructure (sticky CTAs, exit-intent overlay, analytics hooks).

### Files Created

**Prescriptions:**
- `components/marketing/prescriptions-landing.tsx` — main orchestrator
- `components/marketing/mockups/escript-hero-mockup.tsx` — phone showing eScript SMS
- `components/marketing/sections/escript-explainer-section.tsx` — how eScripts work
- `components/marketing/sections/supported-medications-section.tsx` — medication category grid
- `lib/data/prescription-faq.ts` — FAQ data for SEO schema reuse

**General Consult:**
- `components/marketing/general-consult-landing.tsx` — main orchestrator
- `components/marketing/mockups/consult-chat-mockup.tsx` — phone showing doctor chat thread
- `components/marketing/sections/common-concerns-section.tsx` — condition grid
- `components/marketing/sections/specialised-consults-section.tsx` — ED, hair loss, women's health, weight cards
- `lib/data/consult-faq.ts` — FAQ data for SEO schema reuse

### Files Updated

- `app/prescriptions/page.tsx` — swap `ServiceFunnelPage` → `PrescriptionsLanding`
- `app/general-consult/page.tsx` — swap client component → `GeneralConsultLanding`

### Files Deleted

- `app/general-consult/general-consult-client.tsx` — replaced by new landing component

### Shared Components (reused, not duplicated)

- `ExitIntentOverlay` (already accepts `service` prop)
- `useLandingAnalytics` hook
- `LiveWaitTime`, `RegulatoryPartners`, `MarketingPageShell`, `ReturningPatientBanner`
- `PricingSection`, `TestimonialsSection`, `DoctorProfileSection`
- `FaqCtaSection` or service-specific FAQ section
- `FinalCtaSection`
- `MagneticButton`, `DoctorAvailabilityPill`, `RotatingText`

## Section Structure

### Prescriptions Landing

| # | Section | Notes |
|---|---------|-------|
| 1 | Hero — eScript phone mockup, headline, rotating badges, CTA, closing countdown | Custom mockup |
| 2 | LiveWaitTime strip | Shared |
| 3 | Social proof stats (approval %, turnaround, rating, pharmacy acceptance) | Custom stats |
| 4 | PBS Subsidy callout strip | Unique to Rx |
| 5 | How It Works (enter medication → doctor reviews → sent to phone) | Custom content |
| 6 | eScript Explainer ("What is an eScript?" visual walkthrough) | Unique to Rx |
| 7 | Supported Medications grid | Unique to Rx |
| 8 | Doctor Profile | Shared |
| 9 | Limitations ("Not for controlled drugs") | Custom content |
| 10 | Pricing with comparison | Custom content |
| 11 | Testimonials (prescription-filtered) | Shared component |
| 12 | RegulatoryPartners | Shared |
| 13 | FAQ | Custom content via `lib/data/prescription-faq.ts` |
| 14 | Referral strip | Shared |
| 15 | Final CTA | Custom content |
| — | Exit-intent overlay, sticky mobile/desktop CTAs, analytics hooks | Full parity with med-cert |

### General Consult Landing

| # | Section | Notes |
|---|---------|-------|
| 1 | Hero — doctor chat phone mockup, headline, rotating badges, CTA | Custom mockup |
| 2 | LiveWaitTime strip | Shared |
| 3 | Social proof stats (response time, rating, conditions treated) | Custom stats |
| 4 | "Expect a call" reassurance strip | Unique to consult |
| 5 | How It Works (describe concern → doctor assessment → treatment plan) | Custom content |
| 6 | Common Concerns grid (skin, infections, cold/flu, allergies, mental health, etc.) | Unique to consult |
| 7 | Specialised Consults cards (ED, hair loss, women's health, weight) | Unique to consult |
| 8 | Doctor Profile | Shared |
| 9 | Limitations ("Not for emergencies") | Custom content |
| 10 | Pricing with comparison | Custom content |
| 11 | Testimonials (consult-filtered) | Shared component |
| 12 | RegulatoryPartners | Shared |
| 13 | FAQ | Custom content via `lib/data/consult-faq.ts` |
| 14 | Referral strip | Shared |
| 15 | Final CTA | Custom content |
| — | Exit-intent overlay, sticky mobile/desktop CTAs, analytics hooks | Full parity with med-cert |

## Hero Mockups

**eScript Hero Mockup:** Tailwind-rendered phone frame showing an SMS notification: "Your eScript is ready. Show this at any pharmacy to collect your medication." with a token link. Matches `MedCertHeroMockup` visual style (not an image — pure CSS/Tailwind).

**Consult Chat Mockup:** Tailwind-rendered phone frame showing a brief doctor-patient message thread: patient describes symptoms → doctor responds with follow-up → treatment advice. Same visual language as eScript mockup.

## Content Sources

- FAQ, pricing, how-it-works, testimonials content sourced from existing `repeatScriptFunnelConfig` and `generalConsultFunnelConfig` in `lib/marketing/service-funnel-configs.ts`
- Testimonials from `lib/data/testimonials.ts` filtered by service
- Social proof stats from `lib/social-proof.ts`
- Pricing from `lib/constants.ts`

## Conversion Infrastructure (full parity with med-cert)

- Sticky mobile CTA (bottom drawer, appears when hero CTA scrolls out)
- Sticky desktop CTA (top bar with price + CTA button)
- Exit-intent overlay with email capture (service-specific)
- `useLandingAnalytics` hook for CTA clicks, FAQ opens, exit-intent events
- `ReturningPatientBanner` for repeat visitors
- `DoctorAvailabilityPill` in hero
- `ClosingCountdown` component
- Contextual messaging (day/time-aware copy)
