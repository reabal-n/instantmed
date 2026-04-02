# DESIGN_SYSTEM.md — InstantMed

> **Load every session.** Single source of truth for all visual and layout decisions. The design system is law.

> **Motion & interactions:** Animations, easing curves, Framer Motion patterns, UI states, loading sequences, and dark mode interaction rules live in `INTERACTIONS.md`. Load both files for any UI/frontend work.

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
  --elevated:     #F5F7F9;   /* hover states, nested regions — Tailwind: bg-muted (mist-100) */
  --overlay:      #FFFFFF;   /* dropdowns, tooltips — Tailwind: bg-popover */

  /* -- Backgrounds (dark mode — "Quiet Night Sky") -- */
  --bg-dark:      #0B1120;   /* dark:bg-background */
  --surface-dark: rgba(17, 24, 39, 0.75);  /* dark:bg-card — translucent */
  --overlay-dark: rgba(17, 24, 39, 0.90);  /* dark:bg-popover — translucent */

  /* -- Borders -- */
  --border:         rgba(203, 213, 225, 0.50);  /* slate-300 at 50% — Tailwind: border-border */
  --border-dark:    rgba(148, 163, 184, 0.12);  /* slate-400 at 12% — dark mode */

  /* -- Text -- */
  --text:      #1E293B;   /* text-foreground (slate-800) */
  --muted:     #475569;   /* text-muted-foreground (slate-600) */
  --text-dark: #E8EEF4;
  --muted-dark:#94A3B8;

  /* -- Semantic -- */
  --blue:         #2563EB;   /* primary (WCAG AA 5.17:1 with white) */
  --blue-light:   #EFF6FF;
  --blue-border:  rgba(59,130,246,0.20);

  --teal:         #5DB8C9;   /* dark mode primary accent */
  --teal-light:   rgba(93,184,201,0.12);

  --green:        #15803D;   /* success (WCAG AA 5.02:1 on white) */
  --green-light:  #F0FDF4;
  --green-border: rgba(34,197,94,0.20);

  --coral:        #DC2626;   /* destructive (WCAG AA 4.63:1 on white) */
  --coral-light:  #FEF2F2;
  --coral-border: rgba(248,113,113,0.20);

  --amber:        #B45309;   /* warning (WCAG AA 5.02:1 on white) */
  --amber-light:  #FFFBEB;
  --amber-border: rgba(245,158,11,0.20);

  /* -- Service type tokens -- */
  --service-medcert:  #3B82F6;
  --service-referral: #8B5CF6;   /* only permitted purple use */
  --service-rx:       #22C55E;
  --service-hair:     #F59E0B;
  --service-weight:   #EC4899;

  /* -- Trust signal -- */
  --trust-bg:     rgba(34,197,94,0.06);
  --trust-border: rgba(34,197,94,0.15);
  --trust-text:   #22C55E;

  /* -- Morning spectrum (marketing/hero only) -- */
  --morning-sky:   #BAD4F5;
  --morning-peach: #F5C6A0;
  --morning-ivory: #F7F3EC;
  --morning-champ: #E8D5A3;

  /* -- Custom palettes (sky, dawn, ivory, peach, champagne) -- */
  /* Defined in tailwind.config.js (custom morning spectrum values) AND
     globals.css @theme (Tailwind v4 overrides). Note: dawn-* in globals.css
     uses amber tones (#F59E0B), while tailwind.config.js uses peach tones
     (#F5A962). CSS values take precedence at runtime in Tailwind v4. */
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
| display-xl | 68px | 400 | -0.04em | Homepage hero only — `lg:` breakpoint |
| display | 56px | 400 | -0.035em | Hero headlines, large section titles |
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
- Weights: 400 (body + display), 500 (label), 600 (headings), 700 (email templates only). Loaded weights: 400, 500, 600, 700.
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
6px   rounded-sm     Badges, tags
10px  rounded-lg     Buttons, inputs (--radius base)
14px  rounded-xl     Cards, modals
18px  rounded-2xl    Hero panels, feature containers
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
           hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(37,99,235,0.10),0_2px_6px_rgba(37,99,235,0.06)]
           transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"

// Tier 3: Highlighted card (popular/featured, with ring)
className="bg-white dark:bg-card border border-border/50 dark:border-white/15
           ring-2 ring-primary
           shadow-[0_4px_16px_rgba(37,99,235,0.12),0_1px_4px_rgba(37,99,235,0.08)]
           [box-shadow:inset_0_1px_0_rgba(255,255,255,0.9)]
           dark:shadow-none rounded-2xl
           hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(37,99,235,0.16),0_4px_8px_rgba(37,99,235,0.10)]
           transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"

// Section background (subtle tinted region)
className="bg-muted/50 dark:bg-white/[0.06]"
```

### Inner Highlight

The inner top-edge highlight (`inset 0 1px 0 rgba(255,255,255,0.8)`) simulates ambient light hitting the top of the card. Use on all Tier 2+ marketing cards. **Do not use in portals.**

In Tailwind: `[box-shadow:inset_0_1px_0_rgba(255,255,255,0.8)]` combined with the outer shadow using a comma-separated value.

### Card Hover

Marketing cards: **2px lift** (`-translate-y-0.5`) with panel easing. Use `duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]` — not `ease-out`.

```
hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(37,99,235,0.10),0_2px_6px_rgba(37,99,235,0.06)]
transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
```

### Dark Mode Card Pattern

In dark mode, cards use translucent backgrounds with border contrast instead of shadows:
- Background: `dark:bg-card` — maps to `rgba(17, 24, 39, 0.75)` (75% opacity, not fully solid)
- Border: `dark:border-white/15` (subtle white edge)
- Shadow: `dark:shadow-none` (no shadows in dark mode)
- Hover: border brightening only, no shadow

**Note:** Dark mode cards are intentionally translucent (75% opacity) despite the "solid depth" philosophy. The translucency allows the dark background to show through subtly. This is the only surface exception — all light mode cards remain fully solid (`bg-white`).

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
// Base Button component (components/ui/button.tsx) — uses CVA variants:
// Primary: bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:bg-primary/90
// Outline: border border-input bg-white dark:bg-card
// Ghost: hover:bg-muted/50
// All variants: active:scale-[0.97], transition-all duration-200

// Marketing CTA override — add glow classes on top of Button for hero/landing CTAs:
className="shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40
           active:scale-[0.98] active:shadow-md active:shadow-primary/15"
```

**Note:** The glow shadow (`shadow-primary/25`) is NOT in the base `Button` component — it's applied inline on marketing pages (hero CTAs, how-it-works, sticky CTA bars). Use the base Button for app UI; add glow classes only on marketing surfaces.

### CTA Button Glow

Marketing CTAs only (not the base Button component):
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

## 11. Brand Assets & Core Components

### Logo System

**Files:** All brand assets live in `/public/branding/`.

| File | Use |
|------|-----|
| `logo.svg` | Icon mark — single file, used in both light and dark mode |
| `wordmark.png` | Text lockup (dark mode: `dark:brightness-0 dark:invert`) |
| `logo-512.png` | Static/meta contexts (OG image, manifest) |
| `logo-192.png` | PWA icon |
| `seal.svg` | Trust/certification contexts |
| `favicon.ico` | Browser tab |

**Always use `BrandLogo` from `@/components/shared/brand-logo` — never import logo files directly in UI.**

### BrandLogo Component

```tsx
import { BrandLogo } from "@/components/shared/brand-logo"

// Default — sm size, links to /
<BrandLogo />

// Sizes
<BrandLogo size="sm" />   // 28px icon — navbar
<BrandLogo size="md" />   // 32px icon — standard
<BrandLogo size="lg" />   // 38px icon — hero/splash

// Icon only (no wordmark)
<BrandLogo iconOnly />

// Non-link usage
<BrandLogo href={undefined} />
```

- Uses single `logo.svg` for both themes (no theme-switching needed — the icon works on both backgrounds)
- Wordmark inverts on dark mode via `dark:brightness-0 dark:invert` — no separate dark wordmark file needed
- Always links to `/` by default — pass `href={undefined}` to render as a `div`

**Never** import logo SVGs directly into components. **Never** use `<img>` — always `next/image`.

---

### SkyToggle (Dark Mode Toggle)

```tsx
import SkyToggle from "@/components/ui/sky-toggle"

// Default size — use in navbar
<SkyToggle />

// Custom size (controls CSS --toggle-size)
<SkyToggle size={24} />  // smaller
<SkyToggle size={36} />  // larger
```

- Animates sun → moon with clouds/stars CSS animation
- Respects `prefers-reduced-motion` (transitions reduced to 0.01s, not disabled — the state change still renders)
- Handles SSR hydration via `useSyncExternalStore` — renders a muted placeholder until mounted
- **Only use in the navbar.** One instance per page.

---

### MeshGradientCanvas (Page Background)

```tsx
import { MeshGradientCanvas } from "@/components/ui/morning/mesh-gradient-canvas"

// Placed once in app/layout.tsx — renders globally
<MeshGradientCanvas />
```

- Fixed position, `z-index: -10`, `pointer-events: none` — fully inert
- Automatically returns `null` on portal routes (`/patient`, `/doctor`, `/admin`) — no configuration needed
- Disabled on mobile (< 768px) — decorative only, saves main thread
- Respects `useReducedMotion()` — disables parallax and animation, keeps static blobs
- Three light blobs (sky blue, soft peach, ivory) + three dark blobs (deep navy variants)
- **Do not add additional instances.** One global render in `app/layout.tsx` only.
- **Do not use on portal pages** — the component handles this automatically, but don't fight it.

---

### WordReveal (Scroll-Triggered Heading Animation)

```tsx
import { WordReveal } from "@/components/ui/morning/word-reveal"

<WordReveal text="Get a medical certificate today" />

// With highlight words
<WordReveal
  text="Doctor reviewed. Delivered fast."
  highlightWords={["Doctor reviewed"]}
  highlightClassName="text-primary"
/>

// Custom element and timing
<WordReveal
  text="Your health, handled."
  as="h2"
  staggerDelay={0.08}
  wordDuration={0.5}
/>
```

**Props:** `text` (string), `highlightWords` (string[], words to apply `highlightClassName`), `highlightClassName` (string), `as` (h1/h2/h3/p/span — default h1), `staggerDelay` (seconds between words, default 0.06), `wordDuration` (per-word animation duration, default 0.4).

- Words animate from `opacity: 0, y: 20` to `opacity: 1, y: 0` using `useInView` (triggers once on scroll into view)
- Use in hero headings and major section headlines — not in body copy or repeated lists

---

### PerspectiveTiltCard (Mouse-Tracked 3D Card)

```tsx
import { PerspectiveTiltCard } from "@/components/ui/morning/perspective-tilt-card"

// Default — solid variant
<PerspectiveTiltCard>
  <YourCardContent />
</PerspectiveTiltCard>

// Variants
<PerspectiveTiltCard variant="glass" />     // glass surface
<PerspectiveTiltCard variant="solid" />     // bg-white / dark:bg-card
<PerspectiveTiltCard variant="gradient" />  // morning gradient fill
<PerspectiveTiltCard variant="outline" />   // border only

// Tuning
<PerspectiveTiltCard maxRotation={4} spotlightOpacity={0.1} />
```

**Props:** `children`, `className`, `maxRotation` (max tilt degrees, default 6), `spotlightOpacity` (radial highlight intensity, default 0.15), `variant` (glass/solid/gradient/outline).

- Mouse-tracked via `useMotionValue` + `useSpring` (stiffness: 120, damping: 20) — smooth, not snappy
- Spotlight overlay follows cursor as a radial gradient (white → transparent)
- Use for feature cards, pricing cards, testimonial cards — not for interactive form elements
- Respects `pointer: coarse` — tilt stays neutral on touch devices

---

### ClipPathImage (Scroll-Reveal Image)

```tsx
import { ClipPathImage } from "@/components/ui/morning/clip-path-image"

// Default — reveals from bottom
<ClipPathImage src="/images/doctor.jpg" alt="Doctor" width={600} height={400} />

// Directional reveal
<ClipPathImage src="/images/hero.jpg" alt="Hero" width={800} height={500} direction="left" />
```

**Props:** `src`, `alt`, `width`, `height`, `className`, `priority` (passed to `next/image`), `direction` (bottom/left/right/top — default bottom).

- Animates `clip-path` from fully hidden → fully visible over 0.5s with a subtle 1.02 → 1 scale
- Use for editorial images, hero photography, how-it-works illustrations — not UI screenshots or logos

---

### NavigationProgress (Route Transition Bar)

```tsx
import { NavigationProgress } from "@/components/ui/morning/navigation-progress"

// Place once in app/layout.tsx — renders globally
<NavigationProgress />
```

- Fixed to the top of the viewport. Uses `bg-accent-teal` (teal accent color).
- Only visible after the first navigation — doesn't flash on initial page load
- Tracks `pathname` changes and `click` events to detect navigation start
- Fades out via `AnimatePresence` after route completes
- **One instance only.** Already placed in `app/layout.tsx` — do not add more.

---

### MorningSkyBackground (Full-Page Sky Gradient)

```tsx
import { MorningSkyBackground } from "@/components/ui/morning/morning-sky-background"

// Alternative to MeshGradientCanvas — use on specific pages, not globally
<MorningSkyBackground className="opacity-60" />
```

- Fixed, full viewport-height background with a higher-fidelity sky scene than `MeshGradientCanvas`
- **Light mode:** warm morning gradient + 3 cloud shapes (60-90s drift) + warm dawn accent
- **Dark mode:** deep navy gradient + scattered star specks + teal nebula wash
- Use on splash/landing pages where you want a richer sky scene — not as a global layout background
- Do not use alongside `MeshGradientCanvas` on the same page — they conflict visually

---

## 12. Layout

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

## 13. Trust Logos

Three regulatory logos displayed on service and marketing pages:

| Logo | Source | Width |
|------|--------|-------|
| AHPRA | `/logos/AHPRA.svg` | 100px |
| TGA | `/logos/TGA.svg` | 80px |
| Medicare | `/logos/medicare.svg` | 90px |

Dark mode: `dark:brightness-0 dark:invert` to convert to white.
Always use `unoptimized` prop with Next.js Image for SVGs.

---

## 14. Voice & Copy Rules

| Write this | Not this |
|------------|----------|
| "Get a medical certificate in 10 minutes." | "Revolutionising access to healthcare." |
| "A GP reviews your case. You get the cert." | "Our comprehensive platform leverages AI." |
| "Something wrong? We'll sort it." | "Our dedicated support team is here to help!" |
| "No hidden fees. No subscription." | "Transparent, seamless, patient-first care." |

---

## 15. Do / Don't

| Do | Don't |
|----|-------|
| Solid white cards with sky-toned shadows | Glass morphism / backdrop-blur on cards |
| `bg-white dark:bg-card` for all card surfaces | `bg-card/60 dark:bg-white/5 backdrop-blur` |
| `shadow-md shadow-primary/[0.06]` for depth | Black box-shadow anywhere |
| `hover:-translate-y-0.5` for card interaction | No interaction on hover |
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
| `initial={{}}` for reduced motion on `motion.*` | Hardcoded `initial={{ opacity: 0 }}` without reduced-motion check |
| `bg-success-light`, `text-warning`, `border-destructive-border` | `bg-green-50`, `text-amber-600`, `border-red-200` — raw palette colors |
| `bg-success`, `text-success` for live status dots | `bg-emerald-500` raw color |
| `font-semibold` (600) max weight in UI | `font-extrabold` (800) — 700 is loaded but reserved for email templates only |
| `viewport={{ once: true }}` always | Animating on every scroll pass |
| Product mockups as section anchors | Illustration-only grids |
| 48px min tap target on mobile | Small hit areas on patient forms |
| `unoptimized` on SVG Image components | Next.js optimization on SVGs |
