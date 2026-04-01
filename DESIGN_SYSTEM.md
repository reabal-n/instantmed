# DESIGN_SYSTEM.md — InstantMed

> **Load every session.** Single source of truth for all visual, layout, and interaction decisions. The design system is law.

> Brand essence: "Clarity emerging." Calm authority. Morning light. Good judgment. If it feels impressive but loud — kill it. If it resembles crypto/AI SaaS — kill it. If it feels like wellness marketing — kill it.

> Surface philosophy: **Solid depth, not frosted glass.** Real white cards with real shadows on warm backgrounds. Inspired by dub.co — each card has weight, lifts on hover, casts a sky-toned shadow. No backdrop-blur on content surfaces.

> Voice: Calm, experienced GP explaining their service. Dry wit. Never stiff, never slangy.

---

## 1. Color

> **Variable naming:** The design system uses conceptual names below for clarity. The actual Tailwind/shadcn CSS variables in `globals.css` use shadcn convention: `--background` (= `--bg`), `--card` (= `--surface`), `--popover` (= `--overlay`). Use Tailwind classes: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`.

```css
:root {
  /* -- Backgrounds (light mode — the default) -- */
  --bg:           #F8F7F4;   /* warm ivory — Tailwind: bg-background */
  --surface:      #FFFFFF;   /* pure white cards — Tailwind: bg-card / bg-white */
  --elevated:     #F2F0EC;   /* hover states, nested regions — Tailwind: bg-muted */
  --overlay:      #ECEAE5;   /* dropdowns, tooltips — Tailwind: bg-popover */

  /* -- Backgrounds (dark mode — "Quiet Night Sky") -- */
  --bg-dark:      #0B1120;   /* dark:bg-background */
  --surface-dark: #111827;   /* dark:bg-card */
  --elevated-dark:#1A2332;
  --overlay-dark: #1F2D42;

  /* -- Borders -- */
  --border:         rgba(0, 0, 0, 0.07);    /* border-border/50 */
  --border-em:      rgba(0, 0, 0, 0.12);
  --border-focus:   rgba(59, 130, 246, 0.40);
  --border-dark:    rgba(255,255,255,0.07);
  --border-dark-em: rgba(255,255,255,0.15);  /* dark:border-white/15 */

  /* -- Text -- */
  --text:      #1A1A2E;   /* text-foreground */
  --muted:     #6B7280;   /* text-muted-foreground */
  --muted2:    #9CA3AF;
  --text-dark: #E8EDF5;
  --muted-dark:#8FA3BF;

  /* -- Semantic -- */
  --blue:         #2563EB;   /* primary (WCAG AA 5.17:1 with white) */
  --blue-light:   #EFF6FF;
  --blue-border:  rgba(37,99,235,0.20);

  --teal:         #5DB8C9;   /* dark mode primary accent */
  --teal-light:   rgba(93,184,201,0.12);

  --green:        #15803D;   /* success (WCAG AA 5.02:1 on white) */
  --green-light:  #F0FDF4;
  --green-border: rgba(34,197,94,0.20);

  --coral:        #DC2626;   /* destructive (WCAG AA 4.83:1 on white) */
  --coral-light:  #FEF2F2;
  --coral-border: rgba(220,38,38,0.20);

  --amber:        #B45309;   /* warning (WCAG AA 5.02:1 on white) */
  --amber-light:  #FFFBEB;
  --amber-border: rgba(245,158,11,0.20);

  /* -- Service type tokens -- */
  --service-medcert:  #3B82F6;
  --service-referral: #8B5CF6;   /* only permitted purple use */
  --service-rx:       #22C55E;
  --service-hair:     #F59E0B;
  --service-weight:   #EC4899;

  /* -- Order status -- */
  --status-pending:    var(--amber);
  --status-processing: var(--blue);
  --status-complete:   var(--green);
  --status-rejected:   var(--coral);

  /* -- Trust signal -- */
  --trust-bg:     rgba(34,197,94,0.06);
  --trust-border: rgba(34,197,94,0.15);
  --trust-text:   #22C55E;

  /* -- Morning spectrum (marketing/hero only) -- */
  --morning-sky:   #BAD4F5;
  --morning-peach: #F5C6A0;
  --morning-ivory: #F7F3EC;
  --morning-champ: #E8D5A3;
}
```

### Semantic Tint Tokens

Every semantic color has light background, border, and text variants. These handle dark mode automatically via CSS variables — no need for explicit `dark:` overrides.

```css
/* Available for each semantic: success, warning, destructive, info */
bg-{semantic}-light    /* Light tinted background (alerts, badges, pills) */
border-{semantic}-border /* Subtle tinted border */
text-{semantic}         /* Status text color */

/* Trust signals */
bg-trust-bg  border-trust-border  text-trust-text

/* Service type tokens */
text-service-medcert  text-service-rx  text-service-hair  text-service-weight  text-service-referral
```

**Usage:** Always prefer semantic tokens over raw Tailwind palette colors. Use `bg-success-light` not `bg-green-50`, `text-destructive` not `text-red-600`, etc. Third-party brand colors (Stripe, social media) are exceptions.

### Background System

The page background is layered — not a flat color:

1. `body { background: transparent }` — body has no background
2. `<MeshGradientCanvas />` — global animated canvas element (renders in `app/layout.tsx`) provides the morning gradient backdrop on all pages
3. `--background: #F8F7F4` — warm ivory fallback (shows when canvas hasn't loaded, or in non-marketing areas like portals)
4. Cards use `bg-white dark:bg-card` — pure white for contrast against the canvas/ivory background

Never set `background` directly on `body` or `html`. Never use `bg-white` on the page wrapper — only on card surfaces.

### Rules

- Light mode is default. Dark mode ("Quiet Night Sky") supported site-wide — marketing, SEO pages, and app shell.
- Page backgrounds use warm ivory (`#F8F7F4`). Card surfaces use pure white for contrast.
- **Prohibited:** purple/violet (except `--service-referral` and AI indicators in internal portals), neon, dark navy on marketing pages.
- Morning spectrum: marketing heroes only. Never inside the product UI.
- Sky-toned shadows only: `shadow-primary/[0.06]`. Never black shadows on marketing surfaces. Exception: `dark:shadow-black/40` on image containers.
- Semantic colors convey status. Never use decoratively.
- **No raw Tailwind palette colors** for status states. Use semantic tokens (`bg-success-light`, `text-warning`, `border-destructive-border`). Raw colors (`bg-green-50`, `text-red-600`) are only for decorative/distinct-hue needs (charts, avatars, brand colors).

---

## 2. Typography

**Primary:** Source Sans 3 — all UI, marketing, body.
**Monospace:** JetBrains Mono — order IDs, certificate codes, API responses, code blocks only.
No serif. No decorative fonts. Never Inter, Roboto, Arial.

### Scale

| Class | Size | Weight | Tracking | Use |
|-------|------|--------|----------|-----|
| display-xl | 68px | 300 | -0.04em | Homepage hero only — `lg:` breakpoint |
| display | 56px | 300 | -0.035em | Hero headlines, large section titles |
| h1 | 40px | 600 | -0.03em | Page titles |
| h2 | 28px | 600 | -0.025em | Section headings |
| h3 | 18px | 600 | -0.015em | Card titles |
| body | 16px | 400 | — | Body text (non-negotiable minimum on patient flows) |
| small | 14px | 400 | — | Secondary text |
| label | 13px | 500 | — | Form labels |
| caption | 12px | 400 | — | Captions, fine print |
| overline | 11px | 600 | 0.10em | Section pills, uppercase only |
| mono | 13px | 400 | 0.04em | JetBrains Mono — codes, IDs |

### Rules

- **3-step contrast rule:** Heading and body text must differ by at least 3 scale steps. Never put h3 directly next to display — use an intermediary or increase body size.
- Body 16px minimum on all patient-facing flows. Non-negotiable.
- Weights: 300 (display only), 400 (body), 500 (label), 600 (headings). Never 700+.
- Negative tracking on all headings. The larger the text, the tighter the tracking.
- Sentence case everywhere. All caps only on overline.
- Emoji: max 1 per block. Never in headings. Never medical emoji.
- Line height: display/h1 use `leading-[1.1]`, h2/h3 use `leading-[1.25]`, body uses `leading-relaxed`.

---

## 3. Spacing

```
4px   xs    Icon gaps, tight inline
8px   sm    Badge/pill padding
12px  md    Row gaps, compact form fields
16px  lg    Card padding, list items
24px  xl    Between card elements
32px  2xl   Between components
48px  3xl   Section internal padding
64px  4xl   Between page sections
96px  5xl   Between landing sections
```

Container: `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8` (standard) / `max-w-3xl` (content-focused)

### Section Spacing Rhythm

- **Major sections** (hero, testimonials, features, FAQ, CTA): `py-16 lg:py-24`
- **Compact sections** (stats strip, trust badges, dividers): `py-12 lg:py-16`

---

## 4. Border Radius — Squircle-preferred

```
6px   rounded-md     Badges, tags
10px  rounded-lg     Buttons, inputs
14px  rounded-xl     Cards, modals
20px  rounded-2xl    Hero panels, feature containers
9999px rounded-full  Pills, avatars, toggles
```

Rounded/squircle geometry only. No sharp corners anywhere.

---

## 5. Elevation — Solid Depth

The core surface pattern. Every card, panel, and container uses this system. **No glass, no backdrop-blur on content surfaces.**

Cards use a two-layer shadow system + an inner top-edge highlight for dimensional presence. This creates real physical weight without frosted glass.

### Card Tiers

```tsx
// Tier 1: Standard card (most common — dashboards, list items)
className="bg-white dark:bg-card border border-border/50 dark:border-white/15
           shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl"

// Tier 2: Elevated card (feature cards, pricing, service cards)
// Two-layer shadow + inner highlight for depth
className="bg-white dark:bg-card border border-border/50 dark:border-white/15
           shadow-[0_2px_8px_rgba(37,99,235,0.06),0_1px_3px_rgba(37,99,235,0.04)]
           [box-shadow:inset_0_1px_0_rgba(255,255,255,0.8)]
           dark:shadow-none rounded-2xl
           hover:-translate-y-2 hover:shadow-[0_8px_24px_rgba(37,99,235,0.10),0_2px_6px_rgba(37,99,235,0.06)]
           transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"

// Tier 3: Highlighted card (popular/featured, with ring)
className="bg-white dark:bg-card border border-border/50 dark:border-white/15
           ring-2 ring-primary
           shadow-[0_4px_16px_rgba(37,99,235,0.12),0_1px_4px_rgba(37,99,235,0.08)]
           [box-shadow:inset_0_1px_0_rgba(255,255,255,0.9)]
           dark:shadow-none rounded-2xl
           hover:-translate-y-2 hover:shadow-[0_12px_32px_rgba(37,99,235,0.16),0_4px_8px_rgba(37,99,235,0.10)]
           transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"

// Section background (subtle tinted region)
className="bg-muted/50 dark:bg-white/[0.06]"
```

### Inner Highlight

The inner top-edge highlight (`inset 0 1px 0 rgba(255,255,255,0.8)`) simulates ambient light hitting the top of the card. Use on all Tier 2+ marketing cards. **Do not use in portals.**

In Tailwind: `[box-shadow:inset_0_1px_0_rgba(255,255,255,0.8)]` combined with the outer shadow using a comma-separated value.

### Card Hover

Marketing cards: **2px lift** with spring easing. Use `duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]` (spring curve) — not `ease-out`.

```
hover:-translate-y-2 hover:shadow-[0_8px_24px_rgba(37,99,235,0.10),0_2px_6px_rgba(37,99,235,0.06)]
transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
```

### Dark Mode Card Pattern

In dark mode, cards rely on border contrast rather than shadows:
- Background: `dark:bg-card` (maps to `--surface-dark`)
- Border: `dark:border-white/15` (subtle white edge)
- Shadow: `dark:shadow-none` (no shadows in dark mode)
- Hover: border brightening only, no shadow

### Trust Badge Pills

```tsx
// Inline trust signals
className="flex items-center gap-2 bg-muted/50 dark:bg-white/[0.06]
           rounded-full px-3 py-1.5 border border-border/50
           text-xs text-muted-foreground"
```

### Backdrop-blur Exception

`backdrop-blur` is **only** permitted on functional overlays:
- Sticky mobile CTA bars (`backdrop-blur-lg`)
- Mobile navigation menus
- Modal/dialog overlays
- Popovers, dropdowns, selects

Never on content cards, sections, or marketing surfaces.

### Focus Ring

```tsx
className="focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
```

---

## 6. Hero Variants

Two hero patterns, chosen by context:

### Split Hero (service pages with images)

Left-aligned text + right image. Used on: medical certificate, homepage.

```tsx
// Text block: left-aligned, max-w-lg
// Image: rounded-2xl overflow-hidden, right side
// Badge: AHPRA pill floating on image
```

### Centered Hero (simpler pages)

Centered text, no image. Used on: hair-loss, weight-loss, pricing, about, contact.

```tsx
<CenteredHero
  pill="Section Label"
  title="Headline Here"
  highlightWords={["keyword"]}
  subtitle="Supporting description."
/>
```

### Stats Hero (data-driven pages)

Centered headline + animated stat counters. Used on: pricing, trust.

```tsx
<StatsHero
  pill="Label"
  title="Headline"
  stats={[{ value: 100, suffix: "%", label: "Refund if declined" }]}
/>
```

### Hero Rules

- Morning gradient background (`MeshGradientCanvas`) on all marketing heroes
- Availability indicator badge where relevant
- Emergency disclaimer on clinical service pages
- Trust badges below CTA (AHPRA, response time, refund guarantee)

---

## 7. Section Components

Reusable section building blocks. All accept `pill`, `title`, `subtitle`, `highlightWords` props via `SectionHeader`.

| Component | Use |
|-----------|-----|
| `FeatureGrid` | 2-4 column icon + text cards |
| `ProcessSteps` | Numbered step-by-step flow |
| `ComparisonTable` | Us vs them (GP clinic) |
| `AccordionSection` | FAQ groups |
| `CTABanner` | Final call-to-action block |
| `Timeline` | Chronological milestones |
| `SectionHeader` | Pill + title + subtitle (used by all above) |

---

## 8. Announcement Pill (Hero Badge)

Trust signal above the hero headline. Centered or left-aligned to match hero variant.

```tsx
// Tailwind pattern
className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
           bg-muted/50 dark:bg-white/[0.06] border border-border/50
           text-xs font-medium text-foreground/60"
```

Max ~40 chars. Examples:
- "AHPRA-registered doctors"
- "Simple pricing"
- "Hair Loss Treatment"

---

## 9. Pills

### Section Pills

Use `SectionPill` from `@/components/ui/section-pill` for all decorative label pills above section headings. Text-only, no icons.

```tsx
<SectionPill>How It Works</SectionPill>
```

Style: `rounded-full border-border/60 bg-background text-xs font-medium text-foreground/70 shadow-sm shadow-primary/[0.04]`. Dark mode aware. Includes fade-up animation via Framer Motion.

**Do not use for:** status badges, filter toggles, interactive pills, doctor availability indicators.

### Pill Variants

```tsx
// Neutral pill (default for trust badges, inline signals)
className="bg-muted/50 dark:bg-white/[0.06] border border-border/50
           text-foreground/60 text-xs rounded-full px-3 py-1.5"

// Status pills (order tracking, badges)
// Blue:  bg-blue-50 text-blue-600 border border-blue-200
// Green: bg-green-50 text-green-600 border border-green-200
// Red:   bg-red-50 text-red-600 border border-red-200
// Amber: bg-amber-50 text-amber-600 border border-amber-200

// Mono pill (codes, references)
// font-mono text-xs tracking-wider

// Trust signal pill (hero footer, inline trust signals with icons)
// Use for: refund guarantee, timing claims, regulatory signals
className="inline-flex items-center gap-1.5 text-xs text-muted-foreground
           bg-muted/50 border border-border/50 rounded-full px-3 py-1.5
           hover:border-primary/30 hover:text-foreground transition-colors duration-200"
// Icon: w-3 h-3, use text-success for refund/guarantee, text-primary for timing/regulatory
```

---

## 10. Components

### Button

```tsx
// Primary — stronger glow at rest, larger bloom on hover, physical press
className="bg-primary hover:bg-primary/90 text-primary-foreground
           shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40
           active:scale-[0.98] active:shadow-md active:shadow-primary/15
           transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"

// Secondary / Outline
className="bg-foreground hover:bg-foreground/90 text-background"
// or
variant="outline" // shadcn default

// Ghost
variant="ghost" // shadcn default
```

### CTA Button Glow

All primary marketing CTAs:
- **At rest:** `shadow-lg shadow-primary/25` — button is visually prominent
- **On hover:** `shadow-xl shadow-primary/40` — glow blooms, draws the eye
- **On press:** `scale-[0.98] shadow-md shadow-primary/15` — physically depresses

```
shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40
active:scale-[0.98] active:shadow-md active:shadow-primary/15
```

Secondary CTAs on colored backgrounds: `shadow-lg hover:shadow-xl` (no color tint).

### Input

```tsx
// Standard input
className="bg-white dark:bg-card border border-border
           rounded-lg px-3 py-2 text-base
           focus:border-primary focus:ring-2 focus:ring-primary/20"
// 16px font-size prevents iOS zoom. Min 48px height on mobile.
```

### Trust Logos

```tsx
// AHPRA, TGA, Medicare SVGs from /public/logos/
// Use Next.js Image with unoptimized prop for SVGs
<Image src="/logos/AHPRA.svg" unoptimized
       className="h-8 w-auto dark:brightness-0 dark:invert" />
```

---

## 11. Motion

**Two easing curves. Use the right one:**
- `--ease-out` — entrances, page loads, elements appearing. Decelerates into rest.
- `--ease-spring` — interactions, hover states, anything a user triggers. Has overshoot feel without bounce.

```css
--ease-out:    cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
```

### Durations

| Duration | Use |
|----------|-----|
| 150ms | Colour transitions, border changes, icon colour |
| 200ms | Button states, badge changes, icon scale |
| 300ms | Card lifts, input focus, list entry, link underline |
| 400ms | Page section entrance, modal open |
| 500ms | Hero entrance — hard ceiling |

No bounce. No elastic. No parallax on content. Patients don't need theatrics.

**Scale limits:**
- **Interactive (hover/press):** Icons max `1.1x`. Elements max `1.02x`. Press: `scale: 0.98`.
- **Non-interactive (loaders, background blobs):** No hard limit — decorative only.

### Framer Motion Patterns

```tsx
// Section entrance — ease-out, 12px rise
<motion.div
  initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
/>

// Staggered children — spring, 40ms delay, 12px rise
<motion.div
  initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ delay: index * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
/>

// Card hover — CSS spring (preferred over Framer for simple lifts)
className="hover:-translate-y-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"

// Button press depth
<motion.button
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.1, ease: [0.16, 1, 0.3, 1] }}
/>

// Icon spring on hover (inside a parent group)
// Parent: className="group"
// Icon:   className="transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"

// Stat counter (spring count-up on enter)
<motion.span
  initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.85 }}
  whileInView={{ opacity: 1, scale: 1 }}
  viewport={{ once: true }}
  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
/>
```

### Portal Exception

**Doctor portal (`app/doctor/`) and admin portal (`app/admin/`) get no decorative motion.**
- No `whileHover`, no `whileTap`, no entrance animations on data rows
- `transition-colors duration-150` only — for state changes (loading, active, error)
- Lottie animations for empty states and feedback are still permitted
- Reason: doctors use the portal under time pressure. Animation is friction, not delight.

### Reduced Motion

**Critical:** Always respect `prefers-reduced-motion`. Use `useReducedMotion()` hook.

```tsx
const prefersReducedMotion = useReducedMotion()

// CORRECT: empty object disables animation
initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}

// WRONG on motion.div: false is not valid for initial prop
initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}  // DO NOT USE

// NOTE: AnimatePresence initial={false} IS valid — it means "don't animate on first mount"
// Only motion.div/motion.section initial={false} is wrong
```

### Rules

- `viewport={{ once: true }}` on every scroll-triggered animation. Always.
- `whileHover` icon scale max `1.1x`. Element scale max `1.02x`.
- Never rotate, never elastic, never parallax on content.
- Spring (`[0.16, 1, 0.3, 1]`) for interactions. Ease-out (`[0.25, 0.46, 0.45, 0.94]`) for entrances.

---

## 12. Premium Interactions

Every interactive element should feel alive. These patterns apply to marketing pages and patient flows. **Not portals** (see Motion § Portal Exception).

### Icon Spring

Icons inside buttons, cards, and nav items scale on hover with a spring curve. Always requires a `group` parent.

```tsx
// Parent
<div className="group ...">
// Icon
<Icon className="w-5 h-5 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110" />
```

Max scale: `1.1x`. Spring easing only. Never rotate.

### Link Underline Slide

Nav links, footer links, and inline text links animate an underline from left to right on hover. CSS-only, no JS.

```css
/* Apply to link elements */
.link-underline {
  position: relative;
  text-decoration: none;
}
.link-underline::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 0;
  height: 1px;
  background: currentColor;
  transition: width 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
.link-underline:hover::after {
  width: 100%;
}
```

Tailwind utility: add `link-slide` to `globals.css` as a component class.

### Card Lift

2px vertical lift with spring easing and shadow expansion. See §5 Elevation for full pattern.

```
hover:-translate-y-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
```

### Button Press Depth

Buttons physically depress on click. Shadow shrinks to reinforce the press.

```tsx
<motion.button
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.1, ease: [0.16, 1, 0.3, 1] }}
  className="... active:shadow-md active:shadow-primary/15"
/>
```

### Input Focus Glow

Inputs expand a soft blue ring on focus — immediate, not delayed.

```tsx
className="focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20
           transition-shadow duration-150"
```

### Image Hover Scale

Hero mockup images and card images scale subtly on hover. Never exceeds `1.03x`.

```
className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
           group-hover:scale-[1.02] overflow-hidden rounded-2xl"
```

Apply `overflow-hidden rounded-2xl` on the **container**, not the image — to clip the scale.

### Stat Counter Spring

Numbers/counters in hero and stats sections spring-scale into view.

```tsx
<motion.div
  initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.85 }}
  whileInView={{ opacity: 1, scale: 1 }}
  viewport={{ once: true }}
  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
/>
```

---

## 13. Lottie Animations

Use `LottieAnimation` from `@/components/ui/lottie-animation` for empty states, success, error, and loading feedback.

Available animations: `confetti`, `empty-state`, `error`, `loading-files`, `loading`, `notification`, `success`.

```tsx
<LottieAnimation name="empty-state" size={100} loop={false} />
```

Respects `useReducedMotion`. Lazy-loads `lottie-web`. Use `loop={false}` for one-time feedback (success, error), `loop={true}` for ongoing states (loading).

---

## 14. Layout

### Grids

```tsx
// Feature grid (marketing)
className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"

// Pricing cards
className="grid md:grid-cols-2 gap-6"

// Dashboard sidebar
className="grid grid-cols-[240px_1fr] min-h-screen"
```

### Hero Layout

- **Split hero:** text left (max-w-lg), image right (rounded-2xl container)
- **Centered hero:** text centered, max-w-2xl, badges below
- Morning gradient background on all marketing heroes

### Layout Rules

- **Patient forms:** single column, max-w-md (480px), min 48px tap targets
- **Dashboard sidebar:** 240px, surface bg, right border
- **Certificate preview:** centered card, max-w-xl
- **All critical flows must work at 375px viewport**

---

## 15. Trust Logos

Three regulatory logos displayed on service and marketing pages:

| Logo | Source | Width |
|------|--------|-------|
| AHPRA | `/logos/AHPRA.svg` | 100px |
| TGA | `/logos/TGA.svg` | 80px |
| Medicare | `/logos/medicare.svg` | 90px |

Dark mode: `dark:brightness-0 dark:invert` to convert to white.
Always use `unoptimized` prop with Next.js Image for SVGs.

---

## 16. Voice & Copy Rules

| Write this | Not this |
|------------|----------|
| "Get a medical certificate in 10 minutes." | "Revolutionising access to healthcare." |
| "A GP reviews your case. You get the cert." | "Our comprehensive platform leverages AI." |
| "Something wrong? We'll sort it." | "Our dedicated support team is here to help!" |
| "No hidden fees. No subscription." | "Transparent, seamless, patient-first care." |

---

## 17. Do / Don't

| Do | Don't |
|----|-------|
| Solid white cards with sky-toned shadows | Glass morphism / backdrop-blur on cards |
| `bg-white dark:bg-card` for all card surfaces | `bg-card/60 dark:bg-white/5 backdrop-blur` |
| `shadow-md shadow-primary/[0.06]` for depth | Black box-shadow anywhere |
| `hover:-translate-y-1` for card interaction | No interaction on hover |
| `MeshGradientCanvas` global canvas as page background | Setting `background` on `body` or `html` directly |
| `bg-white dark:bg-card` for all card surfaces | `bg-card/60 backdrop-blur` — semi-transparent cards are glass morphism |
| Static single headline in heroes | Rotating/cycling text in h1 — kills LCP and conversion |
| Trust signal pills with icons in hero footer | Plain text dot-separated trust row |
| Split or centered hero (context-dependent) | One rigid hero layout for everything |
| Full dark mode support (`dark:` variants) | Dark mode limited to dashboard only |
| 16px body on patient flows | 14px — too small for anxious patients |
| Squircle / rounded corners | Any sharp geometry |
| Source Sans 3 for everything | Inter, Roboto, serif, decorative |
| `scale: 0.98` on press | `scale: 0.95` — too aggressive |
| `initial={{}}` for reduced motion on `motion.*` | `motion.div initial={false}` — invalid (`AnimatePresence initial={false}` is fine) |
| `bg-success-light`, `text-warning`, `border-destructive-border` | `bg-green-50`, `text-amber-600`, `border-red-200` — raw palette colors |
| `bg-success`, `text-success` for live status dots | `bg-emerald-500` raw color |
| `font-semibold` (600) max weight | `font-bold` (700) or `font-extrabold` (800) |
| `viewport={{ once: true }}` always | Animating on every scroll pass |
| Product mockups as section anchors | Illustration-only grids |
| 48px min tap target on mobile | Small hit areas on patient forms |
| `unoptimized` on SVG Image components | Next.js optimization on SVGs |
