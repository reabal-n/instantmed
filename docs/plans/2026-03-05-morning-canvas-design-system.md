# Morning Canvas — Platform Design System

> Approved 2026-03-05. Applies to ALL pages platform-wide: marketing, landing, service, SEO, guides, FAQ, legal, portals.

## Guiding Principle

Stripe's precision + Apple's spatial depth + Linear's motion fluidity + Vercel's clean minimalism. Light-first — dark mode is "nighttime," same brand, different time of day.

---

## 1. Background & Canvas

- **Animated mesh gradient**: 3 warm blobs (sky blue, dawn peach, soft ivory) at 0.03 opacity
- 20-second infinite cycle, `mix-blend-mode: soft-light`
- Subtle enough to be felt, not seen — never competes with content
- Respects `prefers-reduced-motion`: static gradient fallback
- Dark mode: blobs shift to deep navy tones, same subtlety

---

## 2. Page Structure

### Hero Variants (4 types)

| Variant | Layout | Pages |
|---------|--------|-------|
| **Split Hero** | Two-column: text left, image/visual right | Trust, About, service landing pages |
| **Centered Hero** | Single column centered, subtle bg animation | FAQ, Contact, legal pages |
| **Stats Hero** | Centered headline + animated stat strip below | Pricing, Clinical Governance |
| **Full-Bleed Hero** | Background image with text overlay + gradient scrim | How It Works, brand-forward pages |

Each hero shares the same mesh gradient canvas, motion tokens, and typography scale.

### Section Component Library (12 types)

Pages pick 4-6 from this menu. No page uses all of them.

| Component | Description |
|-----------|-------------|
| **ComparisonTable** | Side-by-side feature/price comparison with check/x marks |
| **FeatureGrid** | 3-4 column icon cards with hover tilt |
| **StatStrip** | Horizontal band of animated counters |
| **Timeline** | Vertical stepped timeline with scroll-triggered reveals |
| **TestimonialCarousel** | Scrolling testimonial cards with location badges |
| **AccordionSection** | Expandable Q&A with smooth height animation |
| **ImageTextSplit** | Classic two-column (text + image), alternating sides |
| **PricingCards** | Tiered pricing cards with highlight on recommended |
| **IconChecklist** | Bulleted list with animated check icons |
| **ProcessSteps** | Numbered horizontal steps with connecting line |
| **CTABanner** | Full-width gradient band with headline + button |
| **LogoBadgeStrip** | Trust indicators (AHPRA, encrypted, etc.) in a row |

### Page Compositions

| Page | Hero | Sections |
|------|------|----------|
| Med Cert Landing | Split | ProcessSteps → ComparisonTable → PricingCards → TestimonialCarousel → AccordionSection → CTABanner |
| Trust | Split (current) | StatStrip → ImageTextSplit → FeatureGrid → ImageTextSplit → LogoBadgeStrip → CTABanner |
| How It Works | Full-Bleed | Timeline → FeatureGrid → TestimonialCarousel → CTABanner |
| FAQ | Centered | AccordionSection (5 categories) → CTABanner |
| Clinical Governance | Stats | IconChecklist → Timeline → FeatureGrid → CTABanner |
| Pricing | Stats | PricingCards → ComparisonTable → AccordionSection → TestimonialCarousel → CTABanner |

---

## 3. Motion System

### Duration Tiers

| Tier | Duration | Use |
|------|----------|-----|
| **Micro** | 150ms | Button hover, icon state change |
| **Fast** | 250ms | Card hover tilt, tooltip appear |
| **Normal** | 400ms | Section fade-in, element reveal |
| **Dramatic** | 600-800ms | Hero entrance, word-by-word text, clip-path image reveal |
| **Ambient** | 15-25s | Mesh gradient cycle, floating orbs |

### Spring Presets

Existing: `gentle`, `calm`, `smooth`. New additions:

- **dramatic**: `{ stiffness: 80, damping: 15 }` — hero entrances, large-scale reveals
- **bouncy**: `{ stiffness: 300, damping: 20 }` — stat counter overshoot, badge pops

### Scroll-Triggered Reveals

IntersectionObserver at `threshold: 0.15`, fire once:

- **Headings (H1/H2)**: Word-by-word fade+slide-up, 60ms stagger per word
- **Cards/grid items**: Stagger from left, 80ms between, scale 0.95→1 + fade
- **Images**: Clip-path `inset(100% 0 0 0)` → `inset(0)` over 600ms
- **Stat numbers**: Count-up with spring overshoot (110% then settle)
- **Timelines**: Each step reveals as you scroll past, line draws progressively

### Parallax

Subtle only — `speed: 0.1-0.3`. Background elements drift slower than foreground. Never move content the user is reading.

---

## 4. Card Interactions

### 3D Perspective Tilt

- `transform: perspective(800px) rotateX(Xdeg) rotateY(Ydeg)`
- **Max rotation**: 6 degrees
- **Spotlight**: Radial gradient overlay follows cursor, 15% white opacity
- **Transition out**: Spring back to flat on mouse leave (400ms, `smooth` spring)
- **Shadow shift**: Direction follows tilt for consistent light source
- **Mobile**: No tilt — tap triggers brief 150ms scale pulse (1.0→1.02→1.0)

### Card Variants

| Variant | Appearance | Use |
|---------|-----------|-----|
| **Glass** | Frosted blur + 1px border, semi-transparent | Feature cards, service cards |
| **Solid** | White bg (dark: navy), subtle shadow | Pricing cards, comparison cells |
| **Gradient** | Soft gradient fill (sky→ivory) | CTA cards, highlighted options |
| **Outline** | Transparent bg, 1px border, fills on hover | Filter chips, option selectors |

### Hover States (all cards)

1. Tilt + spotlight (desktop only)
2. Border brightens from `border-muted` to `border-primary/30`
3. Shadow deepens by one level
4. Internal icon/arrow nudges 4px in its direction

All transitions use `smooth` spring. No color jumps — everything interpolates.

---

## 5. Color Palette — Enhanced Morning Spectrum

### New Accent Tokens

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| **--accent-teal** | `#5DB8C9` | `#7DD3E1` | Interactive highlights, active states, progress |
| **--accent-gold** | `#D4A853` | `#E5C478` | Premium badges, recommended tags, star ratings |
| **--accent-peach** | `#F0B4A0` | `#E8A08C` | Warm callouts, notification dots, soft alerts |

### Gradient Presets

| Name | Colors | Use |
|------|--------|-----|
| **Morning Rise** | sky → ivory → peach (horizontal) | Hero backgrounds, CTA banners |
| **Dawn Glow** | peach → gold → transparent (radial) | Card spotlight hover |
| **Night Sky** | `#0B1120` → `#1A2340` → `#0B1120` (radial) | Dark mode mesh gradient |
| **Teal Wash** | primary → teal → transparent | Active indicators, progress bars |

### Surface Hierarchy

| Level | Light | Dark | Use |
|-------|-------|------|-----|
| **Canvas** | `#FAFBFD` | `#0B1120` | Page background |
| **Surface 1** | `#FFFFFF` | `#141D30` | Cards, panels |
| **Surface 2** | `#F5F7FA` | `#1A2340` | Nested containers, table rows |
| **Surface 3** | `#EEF1F5` | `#223050` | Hover states, active wells |

### Rules

- Accent teal, gold, peach are supplementary — sparingly, never for primary actions
- Gold reserved for "premium" or "recommended" only
- Gradients at low opacity (10-30%) unless CTA banner background

---

## 6. Typography & Text Animation

### Scale

| Role | Size | Weight | Tracking |
|------|------|--------|----------|
| **Display** | `text-5xl` / `text-6xl` | 700 | `-0.02em` |
| **H1** | `text-4xl` / `text-5xl` | 700 | `-0.015em` |
| **H2** | `text-3xl` / `text-4xl` | 600 | `-0.01em` |
| **H3** | `text-2xl` | 600 | normal |
| **Body** | `text-base` | 400 | normal |
| **Small** | `text-sm` | 400 | `0.01em` |
| **Caption** | `text-xs` | 500 | `0.02em` |

All Source Sans 3. JetBrains Mono for code only.

### Word-by-Word Heading Reveal

- Split heading into `<span>` per word
- Each word: `opacity: 0, y: 12px` → `opacity: 1, y: 0`
- Stagger 60ms between words, 400ms per word, `ease-out`
- Only H1 and H2 — smaller headings use simple fade-up
- Fires once (no re-trigger on scroll back)

### Body Text

- Paragraphs fade up as a block, 300ms, 100ms delay after heading finishes
- Lists/checklists: stagger items 50ms apart

### Highlighted Words

- Emphasis word gets `text-primary` color
- Subtle underline draws left→right (200ms, delayed until word appears)

---

## 7. Image Strategy

### Photography Direction

| Category | Style |
|----------|-------|
| **Patient at home** | Warm natural light, casual setting, phone/laptop in hand |
| **Doctor professional** | Clean clinic/desk setting, stethoscope, laptop |
| **Infrastructure** | Server rooms, blue-lit data centers, clean tech |
| **Australian lifestyle** | Outdoor cafes, beaches, suburban homes — recognizably AU |

### Technical Specs

| Property | Value |
|----------|-------|
| Format | JPEG, 80% quality |
| File size | 150-250KB target |
| Hero images | 1200x1500 (4:5 portrait) for split, 1920x800 for full-bleed |
| Section images | 1200x900 (4:3 landscape) |
| Rendering | Next.js `<Image>`, `priority` on hero, lazy elsewhere |
| Placeholder | `blur` with low-res inline data URL |

### Reveal Animation

- Clip-path: `inset(100% 0 0 0)` → `inset(0)`, 600ms `ease-out`
- Slight scale: `1.05` → `1.0` during reveal (Ken Burns feel)
- Scroll-triggered, fires once

### Dark Mode

- Images keep natural colors (no filter)
- Container gets `ring-1 ring-white/10` border for definition
- Shadow shifts from `shadow-sky-200/20` to `shadow-black/30`

### No-Image Fallback

Pages without images (FAQ, legal) rely on mesh gradient + section variety. No forced stock photos.

---

## 8. Mobile Adaptation

### What Changes

| Feature | Desktop | Mobile |
|---------|---------|--------|
| 3D card tilt | Full tilt + spotlight | Tap pulse (scale 1.02) |
| Word-by-word reveal | 60ms stagger | Fade-up entire heading |
| Clip-path image reveal | Bottom-wipe + scale | Simple fade-in |
| Parallax | Speed 0.1-0.3 | Disabled |
| Mesh gradient | 3 animated blobs | Single static gradient |
| Stat counter overshoot | Spring bounce | Linear count-up |
| Section overlap | Gradient overlap | Clean separation |
| Hero images | Visible in split | Hidden (`hidden lg:block`) |
| FeatureGrid | 3-4 columns | Single column |
| ComparisonTable | Side-by-side | Stacked cards |
| Timeline | Vertical with line | Simplified, no line |

### Touch & Performance

- All interactive elements: minimum 44x44px tap area
- `prefers-reduced-motion`: all animations instant (no duration, no spring)
- Mobile mesh gradient: CSS `background` only (no JS loop)
- All images: explicit dimensions or `aspect-ratio` — zero layout shift

---

## 9. Page Transitions

### View Transitions API (Crossfade)

- Next.js `useRouter` wrapped with `document.startViewTransition()`
- Duration: 250ms crossfade, `ease-out`
- Fallback: instant navigation (progressive enhancement, no polyfill)

### Transition Behavior

| Element | Transition |
|---------|-----------|
| Page content | Fade out 150ms → fade in 150ms (50ms overlap) |
| Navbar | Persists (shared layout) |
| Footer | Fades with page content |
| Mesh gradient | Persists (shared layout) |

### Loading States

- If next page >300ms: thin 2px teal progress bar at viewport top
- `--accent-teal` color, indeterminate shimmer
- Disappears on load (150ms fade)

### Scroll

- New page starts at top
- Back navigation restores previous position (browser default)
