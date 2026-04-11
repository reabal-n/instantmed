# Homepage Polish — Pre-Google Ads Launch

> Date: 2026-04-11
> Status: Approved
> Scope: Homepage hardening + FAQ primitive + med cert mockup relocation

---

## Goal

Harden the homepage to project "premium telehealth clinic" (not "certificate mill") before Google Ads go live. Fix visual issues across 5 areas.

---

## Changes

### 1. Hero Product Mockup: Multi-Service Outcome Cards

**Problem:** Current `HeroOutcomeMockup` shows only a med cert approval card + notification toast. Homepage looks like a certificate mill.

**Solution:** New `HeroMultiServiceMockup` component — 3 stacked/overlapping outcome cards:
- Card 1 (back): Treatment plan — violet accent, "Doctor-reviewed" badge
- Card 2 (middle): eScript — cyan accent, mini QR icon, "Sent to phone" badge
- Card 3 (front): Certificate — green accent, "Approved" badge (smallest visual weight of the three)

Staggered entrance animation (0.2s delay per card). Desktop only — hidden on mobile (consistent with current behavior).

**Relocation:** Move existing `HeroOutcomeMockup` to med cert landing page as a standalone section after How It Works (between section 4 and 5). Acts as visual payoff showing the approval outcome.

**Files:**
- New: `components/marketing/hero-multi-service-mockup.tsx`
- Edit: `components/marketing/hero.tsx` — swap `HeroOutcomeMockup` for `HeroMultiServiceMockup`
- Edit: `components/marketing/med-cert-landing.tsx` — add `HeroOutcomeMockup` section after `HowItWorksSection`

### 2. Service Cards: Feature Checkmarks + Visual Uplift

**Problem:** Cards show icon + title + price + 2-line description. Bland, no differentiation.

**Solution:**
- Add 3 green checkmark features per card (data already exists in `serviceCategories[].benefits`)
- Coming soon cards (women's health, weight loss): `opacity-50`, greyed icon, "Coming Soon" badge, `WaitlistForm` CTA
- Grid stays `lg:grid-cols-3` — top row: med-cert, repeat rx, ED. Bottom row: hair loss, women's health, weight loss
- All cards same height via flex layout

**Files:**
- Edit: `components/marketing/service-cards.tsx` — add benefits rendering with green `Check` icons to both `ServiceCard` and `ComingSoonCard`

### 3. Remove Employer Logos from Homepage

**Problem:** Employer logos (KPMG, Bupa, Coles, etc.) only relevant to med certs, not ED/hair loss/Rx.

**Solution:** Remove `<EmployerLogoMarquee>` from `app/page.tsx`. Keep on med cert landing page and `/for/universities`.

**Files:**
- Edit: `app/page.tsx` — remove `EmployerLogoMarquee` import and usage

### 4. Social Proof: Bento Grid Stats

**Problem:** Flat icon + number + label row looks generic and AI-generated.

**Solution:** 2x2 bento grid of stat cards:
- Each card: large `NumberFlow`-animated number, descriptive label, subtle icon, light tinted background
- Card 1: `3,012+` Australians helped (primary tint)
- Card 2: `4.8/5` patient rating (amber tint)
- Card 3: `94%` delivered same day (blue tint)
- Card 4: `100%` AHPRA-registered (emerald tint)
- Mobile: 2x2 grid. Scroll-triggered animation.
- Data sourced from existing `SOCIAL_PROOF` / `getPatientCount()`

**Files:**
- Edit: `components/marketing/social-proof-section.tsx` — rewrite stats portion to bento grid with NumberFlow

### 5. FAQ: New `FAQSection` Component

**Problem:** `AccordionSection` creates double-container visual bug — each `AccordionItem` gets `rounded-xl border` card styling, and expanded content creates nested border appearance.

**Solution:** New `FAQSection` component with clean design:
- API: `<FAQSection title="..." items={[{question, answer}]} />`
- Divider-separated rows (no card border per item), chevron animation, answer fade-in
- `max-w-3xl` centered, optional `id` for scroll anchoring
- Section header with optional pill badge, title, subtitle

**Migration:** Update main landing pages to use `FAQSection` for flat FAQ lists. Keep `AccordionSection` for `/faq` page (needs category grouping).

**Pages to migrate:** `app/page.tsx`, `med-cert-landing.tsx` (via `faq-cta-section.tsx`), `prescriptions-landing.tsx`, `erectile-dysfunction-landing.tsx`, `hair-loss-landing.tsx`, `trust-client.tsx`, `weight-loss-client.tsx`, `about-client.tsx`

**Files:**
- New: `components/sections/faq-section.tsx`
- Edit: 8+ pages to swap `AccordionSection` for `FAQSection`

---

## Out of Scope

- Testimonials columns (keep as-is)
- HowItWorks section redesign
- CTABanner styling
- Footer changes
- Mobile-specific hero variations
- Service page hero redesigns (beyond med cert mockup relocation)

## Risks

- FAQ migration touches ~8 pages — need to verify each page's FAQ data format
- NumberFlow animation on bento grid needs `useInView` — already used elsewhere, no new deps
- Hero multi-service mockup must feel distinct from service cards section below it
