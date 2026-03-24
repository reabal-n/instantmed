# Homepage Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the homepage from static text blocks to a dynamic, product-demonstrating experience with floating UI mockups, real shadows, and scroll-triggered animations — inspired by dub.co.

**Architecture:** Same section structure, new visual execution. 7 new components (mockups + utilities), 6 existing components modified. All mockups are purely visual (CSS/SVG/HTML), no backend changes.

**Tech Stack:** React 19, Tailwind v4, Framer Motion, @phosphor-icons/react (via @/lib/icons barrel), cn() utility. No new dependencies.

**Design Doc:** `docs/plans/2026-03-20-homepage-redesign.md`

---

## Task 1: Global Utilities — DottedGrid + FloatingCard

**Files:**
- Create: `components/marketing/dotted-grid.tsx`
- Create: `components/marketing/floating-card.tsx`

**Step 1: Create DottedGrid component**

```tsx
// components/marketing/dotted-grid.tsx
"use client"

import { cn } from "@/lib/utils"

interface DottedGridProps {
  className?: string
}

export function DottedGrid({ className }: DottedGridProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 -z-10",
        className
      )}
      style={{
        backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    />
  )
}
```

**Step 2: Create FloatingCard component**

```tsx
// components/marketing/floating-card.tsx
"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"

interface FloatingCardProps {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: "left" | "right" | "up"
}

export function FloatingCard({ children, className, delay = 0, direction = "up" }: FloatingCardProps) {
  const prefersReducedMotion = useReducedMotion()

  const directionOffset = {
    left: { x: -20, y: 0 },
    right: { x: 20, y: 0 },
    up: { x: 0, y: 20 },
  }

  return (
    <motion.div
      className={cn(
        "rounded-2xl bg-white dark:bg-card border border-border/50 shadow-xl shadow-primary/[0.08] dark:shadow-none",
        className
      )}
      initial={prefersReducedMotion ? {} : { opacity: 0, ...directionOffset[direction] }}
      whileInView={prefersReducedMotion ? {} : { opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}
```

**Step 3: Run typecheck**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

**Step 4: Commit**

```bash
git add components/marketing/dotted-grid.tsx components/marketing/floating-card.tsx
git commit -m "feat: add DottedGrid and FloatingCard utility components for homepage redesign"
```

---

## Task 2: Hero Product Mockup

**Files:**
- Create: `components/marketing/hero-product-mockup.tsx`
- Modify: `components/marketing/hero.tsx`

**Step 1: Create HeroProductMockup component**

Build a floating product mockup showing a simplified intake form + doctor notification card.

The mockup should contain:
- A main card styled as a form with:
  - Header: "Medical Certificate" with a document icon
  - 3 fake form fields (Name, Reason, Duration) with pre-filled placeholder values
  - A blue "Submit request" button
  - A floating badge: "Takes ~2 min" with Clock icon
- An overlapping notification card (positioned bottom-right, overlapping the form):
  - Green status dot (pulsing)
  - Small avatar circle with initials
  - Text: "Dr. reviewing your request"
  - "Just now" timestamp

All purely visual — no interactivity. Styled with Tailwind, animated with Framer Motion stagger.

**Step 2: Modify hero.tsx — replace hero image with HeroProductMockup**

In `components/marketing/hero.tsx`, find the desktop-only hero image section (`hidden lg:block`) and replace it with `<HeroProductMockup />`. Keep the `hidden lg:block` wrapper so it only shows on desktop. Remove the Spotlight + Image import if no longer used.

**Step 3: Run typecheck**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

**Step 4: Verify visually**

Navigate to `http://localhost:3000` in browser. The hero should show the form mockup on the right side on desktop. On mobile, it should be hidden.

**Step 5: Commit**

```bash
git add components/marketing/hero-product-mockup.tsx components/marketing/hero.tsx
git commit -m "feat: replace hero image with floating product mockup (form + doctor notification)"
```

---

## Task 3: Trust Badge Slider — Dub-Style Depth

**Files:**
- Modify: `components/marketing/trust-badge-slider.tsx`

**Step 1: Restyle badge cards**

Update the badge card styling in `trust-badge-slider.tsx`:
- Card: `bg-white dark:bg-card shadow-md shadow-primary/[0.06] border border-border/30 hover:shadow-lg hover:shadow-primary/[0.1] hover:-translate-y-1 transition-all duration-300`
- Icon container: keep colored backgrounds but increase padding and contrast
- Remove all `dawn-*` classes (already partially done), all transparency/blur
- Ensure solid white background, real depth

**Step 2: Add DottedGrid behind section**

Wrap the section content in a `relative` container and add `<DottedGrid />` as first child. The section already has `py-12 lg:py-16` — increase to `py-16 lg:py-20` for more breathing room.

**Step 3: Restyle CTA block**

The CTA block below the badges:
- Remove the 3 radial gradient decorations (`absolute inset-0 bg-[radial-gradient...]`)
- Replace gradient background with clean `bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06]`
- Increase heading size to `text-3xl lg:text-4xl`
- Add more padding

**Step 4: Run typecheck**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

**Step 5: Verify visually**

Check trust badges section on homepage. Badges should have real shadows, hover lift, and dotted grid behind them. CTA block should be clean white with no gradient artifacts.

**Step 6: Commit**

```bash
git add components/marketing/trust-badge-slider.tsx
git commit -m "feat: trust badges with dub-style depth, dotted grid, and clean CTA block"
```

---

## Task 4: Service Picker — Product Preview Mockups

**Files:**
- Create: `components/marketing/mockups/certificate.tsx`
- Create: `components/marketing/mockups/escript.tsx`
- Create: `components/marketing/mockups/consult.tsx`
- Modify: `components/marketing/service-picker.tsx`

**Step 1: Create CertificateMockup**

A mini document preview that looks like a medical certificate:
- Small card (~200px tall) with white background
- Header bar with InstantMed logo text + "Medical Certificate" title
- Faked content lines (gray bars of varying width)
- Doctor signature area (handwriting-style line + "Dr." text)
- Official-looking stamp/seal circle in corner
- Floating badge: "Delivered to your inbox" with Mail icon

**Step 2: Create EScriptMockup**

A phone SMS preview:
- Phone-shaped container (rounded, dark bezel, ~200px tall)
- SMS bubble: "Your eScript is ready. Show this at any pharmacy."
- Below: a code/token string (e.g., "TOKEN: 4R7X-9K2M")
- Floating badge: "Works with any chemist" with Pill icon

**Step 3: Create ConsultMockup**

A chat interface preview:
- Chat container with header ("Dr. Sarah" + online dot)
- Doctor message bubble: "Based on what you've described, I'd recommend..."
- Patient reply input bar at bottom (placeholder: "Type your message...")
- Floating badge: "GP reviewed" with Stethoscope icon

**Step 4: Integrate mockups into ServicePicker**

In `service-picker.tsx`, add the mockup component at the top of each service card, inside the existing card container. Map service IDs to mockups:
- `med-cert` → `<CertificateMockup />`
- `scripts` → `<EScriptMockup />`
- `consult` → `<ConsultMockup />`

**Step 5: Add "No call needed" green glow treatment**

For the "No call needed" benefit line on med-cert and scripts cards:
- Style: `text-emerald-600 dark:text-emerald-400 font-medium`
- Add subtle glow: wrap in a span with `shadow-[0_0_12px_rgba(16,185,129,0.2)]` or use a `bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full` pill treatment
- The PhoneOff icon should also be emerald

**Step 6: Update card shadows**

Cards get dub-style depth:
- Resting: `shadow-lg shadow-primary/[0.06]`
- Hover: `shadow-xl shadow-primary/[0.1] hover:-translate-y-1`
- Mockup area scales subtly on card hover: `group-hover:scale-[1.02] transition-transform`

**Step 7: Run typecheck**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

**Step 8: Verify visually**

Check service picker section. Each card should have a product mockup at top, concise benefits below, green-glowing "No call needed" on med-cert and scripts. Cards should lift and shadow on hover.

**Step 9: Commit**

```bash
git add components/marketing/mockups/ components/marketing/service-picker.tsx
git commit -m "feat: service cards with product preview mockups and green glow on no-call-needed"
```

---

## Task 5: How It Works — Timeline with Floating Cards

**Files:**
- Modify: `components/marketing/how-it-works.tsx`

**Step 1: Redesign layout to horizontal timeline**

Replace the current vertical step list + side image layout with:
- Desktop: horizontal 3-column grid with connecting timeline line
- Mobile: vertical stack (similar to current but with floating cards)
- Remove the static laptop image

**Step 2: Build step mockup cards**

Each step gets a floating product UI card:

**Step 1 card — "Tell us what's going on":**
- Mini form with 2 fields being "filled in" (text visible in inputs)
- Animated cursor/caret (CSS `@keyframes blink`)
- Badge: "~2 min" with Clock icon

**Step 2 card — "A real GP reviews it":**
- Doctor avatar (DiceBear notionists) + "Dr. Sarah" name
- 3-item checklist, items have checkmark icons
- Status badge: "Approved" with green background and CheckCircle icon

**Step 3 card — "Sorted":**
- Email notification mockup: envelope icon + "Your medical certificate is ready"
- Attachment line: document icon + "MedCert_2026.pdf"
- Download button (styled, non-functional)
- Badge: "Same day"

**Step 3: Add timeline connector**

Horizontal line connecting the 3 steps on desktop:
- `border-t-2 border-dashed border-primary/20` positioned between step numbers
- Step numbers: large light background text (`text-5xl font-light text-muted-foreground/15`) centered above each card

**Step 4: Add DottedGrid behind section**

Wrap section in relative container, add `<DottedGrid />`.

**Step 5: Animate on scroll**

Cards stagger in with `whileInView`:
- Card 1: delay 0, direction "left"
- Card 2: delay 0.15, direction "up"
- Card 3: delay 0.3, direction "right"

All wrapped in `FloatingCard` component.

**Step 6: Run typecheck**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

**Step 7: Verify visually**

How It Works section should show 3 floating product cards in a horizontal timeline on desktop, vertical on mobile. Cards should animate in on scroll.

**Step 8: Commit**

```bash
git add components/marketing/how-it-works.tsx
git commit -m "feat: how-it-works with horizontal timeline and floating product mockup cards"
```

---

## Task 6: Testimonials + FAQ — Subtle Polish

**Files:**
- Modify: testimonials component (styling only)
- Modify: `components/sections/accordion-section.tsx` (styling only)

**Step 1: Testimonial cards — add depth**

Find the testimonial card component used by `TestimonialsColumnsWrapper` and update card styling:
- Add `shadow-md shadow-primary/[0.05]` resting shadow
- Solid white background `bg-white dark:bg-card`
- Remove any transparency/blur if present
- Keep everything else as-is

**Step 2: FAQ — spacing and typography**

In `accordion-section.tsx`:
- Increase gap between accordion items slightly
- Bump trigger text to `font-semibold` if not already
- Add subtle `shadow-sm` to accordion item borders on hover
- Minimal changes — keep it scannable

**Step 3: Run typecheck**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

**Step 4: Commit**

```bash
git add <modified-testimonial-file> components/sections/accordion-section.tsx
git commit -m "style: testimonial card depth and FAQ spacing polish"
```

---

## Task 7: Final CTA — Confident Closer

**Files:**
- Modify: `components/sections/cta-banner.tsx`

**Step 1: Restyle CTA banner**

- Replace gradient background with clean white: `bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06]`
- Remove `PulseGlow` wrapper if it adds visual noise
- Increase heading size: `text-3xl lg:text-4xl font-bold`
- More generous padding: `p-10 lg:p-16`

**Step 2: Add floating "certificate ready" card**

Add a small `FloatingCard` positioned to the right or below the CTA text:
- Green checkmark circle icon
- Text: "Your certificate is ready"
- Subtitle: "Delivered to your inbox"
- Animates in on scroll

**Step 3: Update homepage CTA props**

In `app/page.tsx`, update the `CTABanner` props:
- Change title to "Ready when you are"
- Keep or simplify subtitle
- Keep CTA button text and href

**Step 4: Run typecheck**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

**Step 5: Verify visually**

Final CTA should be clean white card with bold heading, floating certificate-ready card, and prominent button.

**Step 6: Commit**

```bash
git add components/sections/cta-banner.tsx app/page.tsx
git commit -m "feat: final CTA with confident typography and floating certificate-ready card"
```

---

## Task 8: Global Spacing + Typography Pass

**Files:**
- Modify: `app/page.tsx` (section spacing)
- Modify: various section components (typography tweaks)

**Step 1: Increase section gaps**

In `app/page.tsx` or the `MarketingPageShell`, increase vertical spacing between major sections from the current ~64px to 80-96px. This may be controlled by:
- A wrapper div with `space-y-` classes
- Individual section `py-` padding
- Check both and adjust consistently

**Step 2: Typography confidence pass**

Across all modified sections, ensure:
- Hero headline: 48-52px range (`text-5xl lg:text-[52px]`)
- Section headings (How It Works, Service Picker, FAQ): `text-2xl lg:text-3xl font-bold`
- Body text has generous `leading-relaxed`
- Negative tracking on large headings: `tracking-tight`

**Step 3: Run typecheck**

Run: `npx tsc --noEmit --pretty`
Expected: No errors

**Step 4: Full visual review**

Scroll through entire homepage. Check:
- Consistent shadow system across all cards
- Dotted grid only on trust badges + how it works sections
- No section feels cramped — generous whitespace throughout
- Dark mode works on all new components
- Mobile responsive — mockups stack/hide appropriately

**Step 5: Commit**

```bash
git add app/page.tsx <any-other-modified-files>
git commit -m "style: global spacing and typography confidence pass"
```

---

## Task 9: Dark Mode + Responsive QA

**Files:**
- Modify: any components with dark mode issues

**Step 1: Dark mode pass**

Toggle dark mode and check every section:
- Floating cards: `dark:bg-card` with appropriate borders
- Mockups: form fields, SMS bubbles, chat — all need dark variants
- DottedGrid: may need `dark:` opacity adjustment
- Shadows: should be `dark:shadow-none` or very subtle in dark mode
- Text contrast: all text readable

**Step 2: Mobile responsive pass**

Check at 375px (iPhone SE) and 768px (tablet):
- Hero: mockup hidden on mobile, text centered or left-aligned
- Trust badges: 2-col grid on mobile
- Service cards: stack vertically, mockups scale down or simplify
- How It Works: vertical stack on mobile, cards stack
- CTA: floating card below text on mobile

**Step 3: Fix any issues found**

**Step 4: Run full CI**

Run: `pnpm ci`
Expected: lint, tests, build all pass

**Step 5: Final commit**

```bash
git add -A
git commit -m "fix: dark mode and responsive polish for homepage redesign"
```

---

## Execution Order Summary

| Task | Section | Estimated Complexity |
|------|---------|---------------------|
| 1 | Global utilities (DottedGrid, FloatingCard) | Low |
| 2 | Hero product mockup | Medium |
| 3 | Trust badges depth | Low-Medium |
| 4 | Service picker mockups | High |
| 5 | How It Works timeline | High |
| 6 | Testimonials + FAQ polish | Low |
| 7 | Final CTA | Medium |
| 8 | Global spacing + typography | Low |
| 9 | Dark mode + responsive QA | Medium |

Tasks 1-7 are sequential (each builds on previous utilities). Tasks 8-9 are polish passes.
