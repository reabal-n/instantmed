# Indexing, Conversion & Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix Google indexing bottleneck (internal linking, broken redirects, HTML sitemap), add conversion optimization to service pages (social proof near CTAs, sticky CTA on pricing), standardize testimonial usage, and rebuild Terms/Privacy pages with Morning Canvas.

**Architecture:** Five workstreams that are mostly independent. Internal linking changes touch `lib/marketing/homepage.ts` (footer data), `app/page.tsx` (homepage content links), `next.config.mjs` (redirect fixes), and new `app/sitemap-html/page.tsx`. Conversion work adds social proof to CTABanner instances and a sticky CTA to the pricing page. Terms/Privacy are full page rewrites using CenteredHero + a shared `LegalSection` component.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind v4, Morning Canvas design system, Framer Motion

---

## Workstream 1: Internal Linking & Indexing Fixes

### Task 1.1: Fix broken and suboptimal redirects in next.config.mjs

**Files:**
- Modify: `next.config.mjs` (lines 147-171)

**Step 1: Fix `/erectile-dysfunction` → `/mens-health` (404)**

The destination `/mens-health` doesn't exist. Redirect to `/general-consult` instead (ED is handled via consult pathway).

```js
// Change this:
{ source: "/erectile-dysfunction", destination: "/mens-health", permanent: true }
// To this:
{ source: "/erectile-dysfunction", destination: "/general-consult", permanent: true }
```

**Step 2: Fix `/health/:path*` 302 → 301**

Change `permanent: false` to `permanent: true` — this is a permanent move to `/conditions/:path*`.

```js
// Change this:
{ source: "/health/:path*", destination: "/conditions/:path*", permanent: false }
// To this:
{ source: "/health/:path*", destination: "/conditions/:path*", permanent: true }
```

**Step 3: Fix redirect chain `/prescription` → `/repeat-prescription` → `/prescriptions`**

Skip the intermediate hop. `/prescription` should go directly to `/prescriptions`.

```js
// Change this:
{ source: "/prescription", destination: "/repeat-prescription", permanent: true }
// To this:
{ source: "/prescription", destination: "/prescriptions", permanent: true }
```

**Step 4: Delete duplicate `public/robots.txt`**

`app/robots.ts` is the authoritative version and takes precedence. The static file is dead weight.

```bash
rm public/robots.txt
```

**Step 5: Run typecheck**

```bash
pnpm typecheck
```

**Step 6: Commit**

```bash
git add next.config.mjs
git rm public/robots.txt
git commit -m "fix: broken redirects, 302→301, remove duplicate robots.txt"
```

---

### Task 1.2: Add `/for` and `/intent` to footer resources

**Files:**
- Modify: `lib/marketing/homepage.ts` (footerLinks.resources array, ~line 250-256)

**Step 1: Add missing hub pages to footer resources**

```ts
resources: [
  { label: "Health Conditions", href: "/conditions" },
  { label: "Symptoms Guide", href: "/symptoms" },
  { label: "How-To Guides", href: "/guides" },
  { label: "Compare Services", href: "/compare" },
  { label: "Locations", href: "/locations" },
  { label: "For You", href: "/for" },           // NEW
  { label: "Quick Answers", href: "/intent" },   // NEW
],
```

**Step 2: Run typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add lib/marketing/homepage.ts
git commit -m "seo: add /for and /intent hub pages to footer for crawl discovery"
```

---

### Task 1.3: Add internal links to homepage body

**Files:**
- Modify: `app/page.tsx` (~line 155-175, between StatsStrip and AccordionSection)

The homepage currently has zero links to deep content pages. Add a "Browse by topic" section with links to the 5 main content hubs. Use `SectionHeader` + a simple link grid. Keep it lightweight — this is for crawl budget, not hero placement.

**Step 1: Add imports**

Add `SectionHeader` to the existing `components/sections` import.

**Step 2: Add content hub section between StatsStrip and FAQ**

```tsx
{/* Content hubs — internal links for crawl discovery */}
<section className="py-16 px-4">
  <SectionHeader
    title="Browse by Topic"
    subtitle="Find the information you need"
    highlightWords={["Topic"]}
  />
  <div className="mx-auto max-w-4xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
    {[
      { label: "Health Conditions", href: "/conditions", description: "48 conditions covered" },
      { label: "Symptom Guide", href: "/symptoms", description: "Common symptoms explained" },
      { label: "How-To Guides", href: "/guides", description: "Step-by-step health guides" },
      { label: "Compare Services", href: "/compare", description: "See how we stack up" },
      { label: "Locations", href: "/locations", description: "Find your nearest city" },
    ].map((hub) => (
      <Link
        key={hub.href}
        href={hub.href}
        className="group rounded-2xl border border-border/50 bg-white dark:bg-card p-4 shadow-sm shadow-primary/[0.04] hover:shadow-md hover:border-primary/20 transition-all"
      >
        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
          {hub.label}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">{hub.description}</p>
      </Link>
    ))}
  </div>
</section>
```

Also add `import Link from "next/link"` at the top if not already present.

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "seo: add content hub links to homepage for internal linking"
```

---

### Task 1.4: Add canonical tags to conditions and symptoms index pages

**Files:**
- Modify: `app/conditions/page.tsx` (metadata export)
- Modify: `app/symptoms/page.tsx` (metadata export)

**Step 1: Add alternates.canonical to conditions index**

```ts
export const metadata: Metadata = {
  // ... existing fields ...
  alternates: { canonical: "https://instantmed.com.au/conditions" },
}
```

**Step 2: Add alternates.canonical to symptoms index**

```ts
export const metadata: Metadata = {
  // ... existing fields ...
  alternates: { canonical: "https://instantmed.com.au/symptoms" },
}
```

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add app/conditions/page.tsx app/symptoms/page.tsx
git commit -m "seo: add canonical tags to conditions and symptoms index pages"
```

---

### Task 1.5: Expand symptoms index to show all symptom pages

**Files:**
- Modify: `app/symptoms/page.tsx` (replace hardcoded 5-item `symptoms` array with data from `lib/seo/symptoms.ts`)

Currently the symptoms index page hardcodes 5 symptoms. The data file has 14. The sitemap references 26 (hardcoded slugs). Show all available symptom pages from the data source.

**Step 1: Import `getAllSymptomSlugs` and `getSymptomPageBySlug` from `lib/seo/symptoms`**

**Step 2: Replace hardcoded `symptoms` array**

Build the card data from the actual symptom pages data:

```tsx
import { getAllSymptomSlugs, getSymptomPageBySlug } from "@/lib/seo/symptoms"

// Replace the hardcoded `symptoms` const with:
const allSlugs = getAllSymptomSlugs()
const symptomCards = allSlugs.map(slug => {
  const page = getSymptomPageBySlug(slug)!
  return {
    slug,
    name: page.symptom.name,
    description: page.symptom.description,
    commonCauses: page.symptom.commonCauses.slice(0, 4),
  }
})
```

Then update the grid to use `symptomCards` instead of `symptoms`. The grid should use `sm:grid-cols-2 lg:grid-cols-3` for better density with 14 items.

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add app/symptoms/page.tsx
git commit -m "seo: show all 14 symptom pages on symptoms index (was 5)"
```

---

### Task 1.6: Create HTML sitemap page

**Files:**
- Create: `app/sitemap-html/page.tsx`

A user-facing sitemap page that lists all public routes organized by category. This helps Google discover pages AND improves UX.

**Step 1: Create the page**

Server component. Use `CenteredHero` + organized link lists. Import slug data from the data files (`getAllConditionSlugs`, `getAllSymptomSlugs`, `getAllGuideSlugs`, `getAllComparisonSlugs`, `getAllIntentSlugs`). Also import audience page data and location data.

Structure:
- CenteredHero (pill="Sitemap", title="Site Map")
- Sections: Main Pages, Services, Health Conditions (all slugs), Symptoms, Guides, Comparisons, Locations, For You, Quick Answers, Blog, Legal
- Each section: h2 + grid of links
- CTABanner at bottom
- MarketingFooter

Use the same card surface style as homepage hub links: `bg-white dark:bg-card border border-border/50 shadow-sm`.

**Step 2: Add to footer links**

Add `{ label: "Sitemap", href: "/sitemap-html" }` to `footerLinks.company` in `lib/marketing/homepage.ts`.

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add app/sitemap-html/page.tsx lib/marketing/homepage.ts
git commit -m "seo: add HTML sitemap page with links to all public routes"
```

---

## Workstream 2: Conversion Optimization

### Task 2.1: Add social proof counter near CTABanner on homepage

**Files:**
- Modify: `app/page.tsx` (near the CTABanner at bottom)

**Step 1: Import `TotalPatientsCounter` from `@/components/marketing/total-patients-counter`**

**Step 2: Add counter as child content or adjacent element to CTABanner**

The CTABanner component accepts `children` — check if it does. If not, add the counter just above the CTABanner section:

```tsx
{/* Social proof before final CTA */}
<div className="mx-auto max-w-4xl px-4 pb-2 flex justify-center">
  <TotalPatientsCounter variant="badge" />
</div>

{/* Final CTA */}
<CTABanner ... />
```

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add social proof counter near homepage CTA for conversion"
```

---

### Task 2.2: Add sticky CTA to pricing page

**Files:**
- Modify: `app/pricing/pricing-client.tsx`

The pricing page has no sticky CTA. Add a mobile-only sticky bottom bar (matching the pattern from `StickyCTABar`) that appears after scrolling past the pricing cards.

**Step 1: Add a sticky CTA component inside pricing-client.tsx**

```tsx
// Inside the client component, after the pricing cards section:
// Use IntersectionObserver on the pricing cards to trigger visibility
// Mobile only (md:hidden), fixed bottom-0, z-40
// Content: "From $19.95" + "Get started" button
// Slides in with Framer Motion, respects useReducedMotion
```

Use the same pattern as `med-cert-landing.tsx`'s mobile sticky CTA:
- Track a ref on the pricing cards section
- IntersectionObserver triggers when cards scroll out of view
- `AnimatePresence` + `motion.div` for slide-in from bottom
- `useReducedMotion()` — if reduced motion, use `initial={{}}` (empty object)

**Step 2: Run typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add app/pricing/pricing-client.tsx
git commit -m "feat: add mobile sticky CTA to pricing page"
```

---

## Workstream 3: Standardize Testimonial Usage

### Task 3.1: Standardize weight-loss and hair-loss testimonial rendering

**Files:**
- Modify: `app/weight-loss/weight-loss-client.tsx`
- Modify: `app/hair-loss/hair-loss-client.tsx`

Both pages call `getTestimonialsByService` directly and have bespoke rendering. Switch them to use the shared `TestimonialsSection` component for consistency (includes the disclaimer footnote).

**Step 1: Read both files to understand current testimonial rendering**

**Step 2: Replace bespoke rendering with `TestimonialsSection`**

Import `TestimonialsSection` and `getTestimonialsByService`, `getTestimonialsForColumns` from the shared modules. Follow the same pattern as `service-funnel-page.tsx` (lines 49-58):

```tsx
import { TestimonialsSection } from '@/components/marketing/sections/testimonials-section'
import { getTestimonialsByService, getTestimonialsForColumns } from '@/lib/data/testimonials'

// Build testimonial data
const serviceTestimonials = getTestimonialsByService('consultation')
  .filter(t => t.rating >= 4)
const testimonialsForColumns = serviceTestimonials.length >= 6
  ? serviceTestimonials.map(t => ({ text: t.text, image: t.image || '', name: t.name, role: t.location }))
  : getTestimonialsForColumns()

// Render:
<TestimonialsSection
  testimonials={testimonialsForColumns}
  title="What our patients say"
  subtitle="Real reviews from Australians"
/>
```

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add app/weight-loss/weight-loss-client.tsx app/hair-loss/hair-loss-client.tsx
git commit -m "refactor: standardize testimonials on weight-loss and hair-loss pages"
```

---

## Workstream 4: Terms & Privacy Morning Canvas Rebuild

### Task 4.1: Create shared LegalSection component

**Files:**
- Create: `components/shared/legal-section.tsx`

Both terms and privacy pages use identical `S` helper functions. Extract to a shared component.

**Step 1: Create the component**

```tsx
interface LegalSectionProps {
  number: string
  title: string
  id?: string
  children: React.ReactNode
}

export function LegalSection({ number, title, id, children }: LegalSectionProps) {
  return (
    <section id={id || `section-${number}`} className="pt-8 first:pt-0">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {number}. {title}
      </h2>
      <div className="text-sm text-muted-foreground space-y-3 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80">
        {children}
      </div>
    </section>
  )
}
```

**Step 2: Run typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add components/shared/legal-section.tsx
git commit -m "feat: extract shared LegalSection component from terms/privacy pages"
```

---

### Task 4.2: Rebuild Terms page with Morning Canvas

**Files:**
- Modify: `app/terms/page.tsx`

**Step 1: Read the full terms page**

Read the entire file to capture all section content.

**Step 2: Rewrite with Morning Canvas pattern**

Keep as a Server Component (legal pages don't need client interactivity). Replace:
- Hand-coded pill/h1 → `CenteredHero` with `pill="Legal"`, `title="Terms of Service"`, `subtitle="Last updated: February 2026"`
- Local `S` function → imported `LegalSection` from `@/components/shared/legal-section`
- Keep the same card wrapper: `bg-white dark:bg-card rounded-2xl border border-border/50 shadow-md shadow-primary/[0.06] p-8 sm:p-12 divide-y divide-border/40`
- Add `CTABanner` before footer with "Questions about our terms?" + link to contact
- Use `MarketingPageShell` wrapper if other rebuilt pages use it

All section content stays identical — only the layout shell changes.

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add app/terms/page.tsx
git commit -m "refactor: rebuild terms page with Morning Canvas design system"
```

---

### Task 4.3: Rebuild Privacy page with Morning Canvas

**Files:**
- Modify: `app/privacy/page.tsx`

Same treatment as Task 4.2. Read full file first, then:
- `CenteredHero` with `pill="Legal"`, `title="Privacy Policy"`
- Replace local `S` → `LegalSection`
- Consistent card shadow: `shadow-md shadow-primary/[0.06]`
- Add `CTABanner` with "Questions about your privacy?" + link to contact
- All privacy section content stays identical

**Step 1: Read the full privacy page**

**Step 2: Rewrite with Morning Canvas**

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add app/privacy/page.tsx
git commit -m "refactor: rebuild privacy page with Morning Canvas design system"
```

---

## Workstream 5: Final Validation

### Task 5.1: Full typecheck and test suite

**Step 1: Run typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors

**Step 2: Run unit tests**

```bash
pnpm test -- --run
```

Expected: All tests pass (921+)

**Step 3: Run production build**

```bash
pnpm build
```

Expected: Build succeeds

**Step 4: Commit any fixes if needed**

---

## Summary of Changes

| Workstream | Files Changed | Impact |
|------------|---------------|--------|
| 1. Internal linking | `next.config.mjs`, `lib/marketing/homepage.ts`, `app/page.tsx`, `app/conditions/page.tsx`, `app/symptoms/page.tsx`, `app/sitemap-html/page.tsx` (new), `public/robots.txt` (deleted) | Fix broken 404, improve crawl budget, connect homepage to deep content |
| 2. Conversion | `app/page.tsx`, `app/pricing/pricing-client.tsx` | Social proof near CTA, sticky mobile CTA on pricing |
| 3. Testimonials | `app/weight-loss/weight-loss-client.tsx`, `app/hair-loss/hair-loss-client.tsx` | Consistent rendering + disclaimer |
| 4. Terms/Privacy | `components/shared/legal-section.tsx` (new), `app/terms/page.tsx`, `app/privacy/page.tsx` | Morning Canvas design system consistency |
| 5. Validation | — | Typecheck + tests + build |
