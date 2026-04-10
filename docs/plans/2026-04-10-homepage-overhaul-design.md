# Homepage Overhaul Design

> **Date:** 2026-04-10
> **Status:** Approved
> **Goal:** Transform homepage from trust-badge-overloaded certificate mill into a premium, conversion-focused telehealth landing page.

---

## Problem Statement

The current homepage has 16+ sections and 9 separate trust signal surfaces. The hero mockup shows a fake intake form ("Sarah Mitchell / Cold and flu symptoms / Submit request") which positions the platform as a certificate vending machine. Service cards for ED and Hair Loss use identical mockup templates. Missing Women's Health and Weight Loss services.

## Design Decisions

### Page Structure (7 Sections)

| # | Section | Content |
|---|---------|---------|
| 1 | Hero | Split: copy left + outcome mockup right |
| 2 | Services | 6 clean icon cards (4 active + 2 coming soon) |
| 3 | How It Works | Existing 3-step, minor polish |
| 4 | Social Proof | Reviews + stats combined into one section |
| 5 | FAQ | Existing accordion, unchanged |
| 6 | CTA Banner | Existing, minor copy polish |
| 7 | Footer | Unchanged |

### Removed Surfaces (10 items)

- `RegulatorLogoMarquee`
- `GoogleReviewsBadge`
- `LiveWaitTime` strip
- `DoctorCredibility` section
- `EmployerLogoMarquee`
- `StatsStrip`
- `TrustBadgeFloat` sticky sidebar
- `TotalPatientsCounter` pre-CTA badge
- `TrustBadgeRow preset="pre_cta"`
- `Browse by Topic` links section

### Hero (Redesigned)

**Left side:**
- `DoctorAvailabilityPill` (keep)
- Headline: "A doctor, without the waiting room."
- Sub-line: Single sentence covering services + price anchor. No paragraph.
- 2 CTAs: "Get started" (primary) + "See pricing" (outline)
- 3 trust pills: social_proof + no_call + refund

**Right side — New `HeroOutcomeMockup` component:**
- Approved certificate card (clean, minimal — no fake form fields)
- "Approved" status badge with doctor seal
- Floating notification: "Certificate ready — check your inbox"
- Doctor avatar with "Reviewed" green dot
- Shows the OUTCOME, not the input process

### Service Cards (Redesigned)

**Layout:** 3-col desktop, 2-col tablet, 1-col mobile. 6 cards.

**Active card:** Icon (colored, service-specific) + title + price + 2-line description + CTA button. No mockups, no bullet lists.

**Coming soon card:** Same layout, 60% opacity, "Coming Soon" pill badge, "Notify me" CTA with inline email capture.

**Card data:**
1. Medical Certificates — $19.95 — "Most popular" badge — emerald
2. Repeat Medication — $29.95 — cyan
3. ED Treatment — $49.95 — blue
4. Hair Loss Treatment — $49.95 — blue
5. Women's Health — $59.95 — coming soon — pink
6. Weight Loss — $89.95 — coming soon — rose

### Social Proof (New Combined Section)

- Section header: "Trusted by Australians"
- Inline stat pills: patient count / rating / same-day % / AHPRA
- Testimonial columns (reuse existing `TestimonialsColumnsWrapper`)
- Disclaimer line (keep existing)

### Trust Consolidation

Trust signals appear in exactly 2 places:
1. Hero — 3 trust pills (social_proof, no_call, refund)
2. Social Proof section — stats + testimonials

### Coming Soon Waitlist

- Inline email capture on card (input + submit button)
- Server action stores email + service type in Supabase `waitlist` table
- Toast confirmation on submit

## Files Affected

### New
- `components/marketing/hero-outcome-mockup.tsx` — new hero right-side mockup
- `components/marketing/service-card.tsx` — new clean card component
- `components/marketing/coming-soon-card.tsx` — card with waitlist capture
- `app/actions/waitlist.ts` — server action for email capture

### Modified
- `app/page.tsx` — restructure to 7 sections
- `components/marketing/hero.tsx` — updated layout, remove old mockup import
- `lib/marketing/homepage.ts` — add women's health + weight loss data, simplify card data

### Potentially Removable (after migration)
- `components/marketing/hero-product-mockup.tsx` — replaced by outcome mockup
- `components/marketing/mockups/ed-hero-mockup.tsx` — no longer used on homepage
- `components/marketing/mockups/hair-loss-hero-mockup.tsx` — no longer used on homepage

Note: mockup components may still be used on service landing pages. Check before deleting.

## Out of Scope

- Service landing page redesigns (separate effort)
- Footer changes
- Mobile nav changes
- New Supabase migration for waitlist table (simple, but track separately)
- SEO metadata changes (keep existing, it's well-optimized)
