# Homepage Redesign — "Floating Product UI"

**Date:** 2026-03-20
**Status:** Approved
**Scope:** Homepage only (`app/page.tsx` + marketing components)
**Inspiration:** dub.co — dynamic, interactive, product-demonstrating sections

---

## Design Philosophy

Transform every homepage section from "describes the product" to "shows the product." Same section structure, dramatically different visual execution. Blend three approaches:

- **Primary: Floating Product UI** — each section gets a product mockup/preview (form, review card, certificate, SMS) rendered as elevated floating cards with real shadows and scroll-triggered animations
- **Secondary: Typography + Whitespace** — larger, bolder headings, generous spacing, dotted grid backgrounds for texture
- **Tertiary: Interactive Energy** — concentrated in How It Works with animated timeline and progressive UI card reveals

### Three Messages (All Within 5 Seconds)

1. "I can get a medical certificate without leaving bed"
2. "This is a legit telehealth platform with real doctors"
3. "Fill in a form, a doctor reviews it, done — no calls, no waiting rooms"

---

## Section-by-Section Design

### 1. Hero

**Layout:** Two-column desktop (text left, visual right). Full-width stacked mobile.

**Left — Typography:**
- Headline at ~48px display weight, tight tracking, generous whitespace
- Current headline content stays: "Medical certificate from $19.95 — most reviewed within 1-2 hours."
- Subtitle, two CTAs, price anchor pill all stay
- Trust strip at bottom (AHPRA, employer-accepted, refund guarantee)

**Right — Floating Product UI (new):**
- Stylized browser/phone frame containing a simplified intake form mockup:
  - Form header: "Medical Certificate"
  - 2-3 pre-filled form fields (name, reason, dates)
  - "Submit" button
  - Floating badge: "Takes ~2 min" with clock icon
- Overlapping notification card: "Dr. Sarah is reviewing your request" with green dot + avatar
- Staggered entrance animations on load, subtle parallax feel

**Mobile:** Form mockup stacks below text, notification card overlaps bottom-right of form.

**Components affected:** `components/marketing/hero.tsx` — replace hero image with new `HeroProductMockup` component.

---

### 2. Trust Badge Slider

**Current:** 4 flat cards with icons. Feels like a checklist.

**New — Dub-style pills with depth:**
- Same 4 badges, same content
- Elevated pill/card styling:
  - Real box shadows (`shadow-md`), not flat borders
  - Hover lift (`hover:-translate-y-1`) with shadow increase
  - White background with solid presence, no transparency/blur
  - Icon containers with soft colored backgrounds (emerald, blue, amber per badge)
- Dotted grid background behind section (subtle `radial-gradient` dot pattern at ~2% opacity)
- Section gets more vertical padding

**CTA block below ("Healthcare on your schedule"):**
- Larger heading typography
- Remove radial gradient decorations — clean white/subtle background
- More whitespace

**Components affected:** `components/marketing/trust-badge-slider.tsx`

---

### 3. Service Picker

**Current:** 3 cards with bullet-point benefits. Static.

**New — Cards with product preview mockups:**
- Same 3-card grid, same content hierarchy
- Each card gets a **mini product mockup** in the top portion:
  - **Med Cert:** Certificate document preview — InstantMed header, redacted patient name, doctor signature line. Badge: "Delivered to your inbox"
  - **Repeat Medication:** Phone SMS mockup with eScript token message. Badge: "Works with any chemist"
  - **General Consult:** Chat bubble mockup — doctor avatar + message. Badge: "GP reviewed"
- Dub-style card depth: `shadow-lg` resting, `shadow-xl` + lift on hover
- "Most common" badge on Med Cert stays
- Product mockup scales subtly on hover (1.02x max)

**Benefits:** Stay as concise bullet points.

**"No call needed":** Rendered with emerald green glow treatment (`text-emerald-600` + `shadow-emerald-500/20` glow) on Med Cert and Repeat Medication cards. Visually distinct from other bullets.

**Components affected:** `components/marketing/service-picker.tsx` or equivalent — add `ServiceMockup` sub-components.

---

### 4. How It Works

**Current:** 3 vertical numbered steps with static laptop image.

**New — Horizontal timeline with floating UI cards:**
- Horizontal layout desktop (vertical mobile) connecting 3 steps
- Each step has a floating product UI card, scroll-animated:
  - **Step 1 "Tell us what's going on":** Mini intake form with cursor blink animation on fields being typed. Time badge: "~2 min"
  - **Step 2 "A real GP reviews it":** Doctor avatar + checklist with checkmarks animating in. Status badge transitions from "In review" → "Approved" (green pulse)
  - **Step 3 "Sorted":** Email inbox mockup — "Your medical certificate is ready" with attachment icon + download button. Time badge: "Same day"
- Steps connected by animated line/dots that progresses on scroll
- Cards stagger in (left, center, right) with y-offset

**Typography:** Step numbers as large background elements (`text-6xl font-light text-muted-foreground/20`) behind cards.

**Components affected:** `components/marketing/how-it-works.tsx` — significant rework. New `StepMockup` sub-components.

---

### 5. Testimonials

**Changes — minimal:**
- Cards get dub-style depth (real shadows, white cards)
- Subtle dotted grid background for consistency
- Keep carousel behavior, keep "Verified" badges
- No product mockups — social proof stays human

**Components affected:** Minor styling changes to existing testimonial components.

---

### 6. FAQ

**Changes — minimal:**
- More generous spacing between accordion items
- Subtle shadow treatment on cards for consistency
- Typography bump on question headings
- No visual overhaul — utility section stays scannable

**Components affected:** Minor styling tweaks.

---

### 7. Final CTA

**Current:** Gradient card with heading + buttons.

**New — confident closer with product visual:**
- Clean white/light card (drop gradient background)
- Larger, bolder headline: "Ready when you are"
- Single primary CTA: "Start a request" — large, magnetic hover
- Floating visual: mini status card "Your certificate is ready" with green checkmark, scroll-animated
- Refund guarantee line below button
- Generous whitespace

**Components affected:** `components/marketing/trust-badge-slider.tsx` (CTA block lives here currently) or extract to new component.

---

## Global Elements

### Dotted Grid Background
- `radial-gradient(circle, #000 1px, transparent 1px)` at ~2% opacity
- Applied to 2-3 alternating sections (trust badges, how it works)
- Not every section — avoids repetition

### Shadow System
- Cards: rest at `shadow-md`, hover to `shadow-lg`
- Floating product mockups: `shadow-xl`
- Sky-toned per design system: `rgba(59,130,246,0.08)`

### Typography
- Hero headline: 48-52px display weight
- Section headings: more tracking space
- More generous line-height on body text
- All Source Sans 3

### Whitespace
- Section gaps: 80-96px (up from 64px)
- Cards: more internal padding
- Everything breathes

### Motion
- Scroll-triggered staggered entrances on floating UI cards (200-500ms, ease-out)
- Hover lifts on interactive cards (max `-translate-y-1`, scale 1.02x)
- Timeline connector animates on scroll in How It Works
- All respects `useReducedMotion()` via Framer Motion

---

## New Components Needed

| Component | Purpose | Location |
|-----------|---------|----------|
| `HeroProductMockup` | Intake form + doctor notification floating cards | `components/marketing/hero-product-mockup.tsx` |
| `CertificateMockup` | Mini certificate document preview | `components/marketing/mockups/certificate.tsx` |
| `EScriptMockup` | SMS/eScript token phone preview | `components/marketing/mockups/escript.tsx` |
| `ConsultMockup` | Doctor chat bubble preview | `components/marketing/mockups/consult.tsx` |
| `StepMockup` | Per-step floating UI card for How It Works | `components/marketing/mockups/step-mockup.tsx` |
| `DottedGrid` | Reusable dotted grid background | `components/marketing/dotted-grid.tsx` |
| `FloatingCard` | Reusable elevated card wrapper with shadow + hover | `components/marketing/floating-card.tsx` |

---

## Constraints

- All colors from Morning Canvas design system — no new color tokens
- Motion: 200-500ms, ease-out, no bounce, max scale 1.02x
- Typography: Source Sans 3 only
- Shadows: sky-toned only (never pure black)
- Must respect `useReducedMotion()`
- Dark mode must work (all mockup components need dark variants)
- Mobile responsive — mockups stack/scale appropriately
- No new dependencies unless absolutely necessary (Framer Motion already available)
- Brand voice: confident, not flashy. Premium minimalism. If it feels like a SaaS landing page template, it's wrong.

---

## Out of Scope

- Other marketing pages (service pages, about, pricing) — homepage first
- Actual interactive demos (clicking through real forms) — visual mockups only
- New content/copy — same messaging, new presentation
- Backend changes — purely frontend
