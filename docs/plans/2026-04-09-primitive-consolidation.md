# Primitive Consolidation & Med-Cert Landing Hardening

**Date:** 2026-04-09
**Status:** All phases complete
**Branch:** `feat/ed-hairloss-hardening`

## Goal

Consolidate marketing page primitives (trust badges, social proof stats, FAQ, wait times) into canonical single-source-of-truth modules. Harden the med-cert landing page (primary Google Ads LP) for launch.

---

## Phase 1 — Med-Cert Landing Hardening (DONE)

| Item | File(s) | What changed |
|------|---------|-------------|
| Cert turnaround 24 -> 20 min | `lib/social-proof.ts` | `certTurnaroundMinutes: 20` |
| "Auto-reviewed" compliance fix | `live-wait-time.tsx` | Stripped AHPRA-violating copy, wait time now reads from `SOCIAL_PROOF` |
| Stats centralization | `total-patients-counter.tsx` | Added `STAT_PRESETS` export with `med-cert` and `prescription` presets |
| Stat duplication fix | `med-cert-landing.tsx` | 4th stat changed from `employerAcceptancePercent` (98%, duplicated in EmployerCalloutStrip) to `sameDayDeliveryPercent` (94%) |
| Badge copy centralization | `med-cert-landing.tsx` | `ROTATING_BADGES` now reads from `BADGE_REGISTRY` labels |
| Guide section accordion | `med-cert-guide-section.tsx` | Rewrote 1,500-word flat text as 5-item collapsible accordion using shadcn Accordion directly |
| Guide section repositioned | `med-cert-landing.tsx` | Moved from between cert-preview/doctor-profile to below FAQ (scan-to-CTA path stays clean) |
| Double-container audit | All accordion/FAQ files | **No double containers found.** `faq-cta-section.tsx` already uses flat styling; all others are card-per-item with flat outer containers |

---

## Phase 2 — FAQ Consolidation (DONE)

### What changed
1. **`funnel/faq-section.tsx`** — replaced inline Accordion reimplementation with `FAQList` primitive. Header + contact support kept; accordion code deleted. Card styling now comes from FAQList defaults (minor shadow difference: `hover:shadow-md` vs previous `hover:shadow-lg` — negligible).
2. **`lib/data/general-faq.ts`** — extracted 184 lines of inline FAQ data (7 categories, 34 questions) from `app/faq/faq-page-client.tsx`. Exported as `GENERAL_FAQ: FAQGroup[]` — compatible with both `FAQList` and `AccordionSection`.
3. **`app/faq/faq-page-client.tsx`** — now imports `GENERAL_FAQ` from canonical data file. Page reduced from 242 to 60 lines.

### Decision made
- Keep both `AccordionSection` (page-level section wrapper with SectionHeader) and `FAQList` (bare accordion primitive). They serve different layers.

---

## Phase 3 — Primitive Registry Doc (DONE)

### What changed
1. **`docs/PRIMITIVES.md`** — comprehensive registry of all 7 primitive categories:
   - Social proof: `lib/social-proof.ts` (SOCIAL_PROOF, SOCIAL_PROOF_DISPLAY, GOOGLE_REVIEWS, getPatientCount)
   - Trust badges: `lib/trust-badges.ts` (BADGE_REGISTRY with 24 badges, BADGE_PRESETS with 11 presets)
   - Stat presets: `total-patients-counter.tsx` (STAT_PRESETS for 3 service types)
   - Pricing: `lib/constants.ts` (PRICING, PRICING_DISPLAY)
   - FAQ data: `lib/data/*-faq.ts` (6 files covering all services + general)
   - Wait times: `live-wait-time.tsx` (SERVICE_CONFIG)
   - Funnel configs: `lib/marketing/service-funnel-configs.ts`
   - Includes "Quick Reference: Where to Change Things" lookup table.

### Deferred
- **ESLint rule** to flag hardcoded social proof numbers: Deferred to post-launch. Low ROI given current team size — the registry doc + code review covers this.

---

## Out of Scope

- Ticking patient counter (user decided to skip)
- Blog FAQ page refactor (user confirmed out of scope)
- StatsStrip component-level extension (data-only centralization was sufficient)
- FAQList type widening to support ReactNode answers (guide section uses Accordion directly instead)
