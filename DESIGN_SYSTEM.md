# DESIGN_SYSTEM.md — InstantMed

> **Load every session.** Single source of truth for all visual, layout, and interaction decisions. The design system is law.

> Brand essence: "Clarity emerging." Calm authority. Morning light. Good judgment. If it feels impressive but loud — kill it. If it resembles crypto/AI SaaS — kill it. If it feels like wellness marketing — kill it.

> Surface philosophy: **Solid depth, not frosted glass.** Real white cards with real shadows on warm backgrounds. Inspired by dub.co — each card has weight, lifts on hover, casts a sky-toned shadow. No backdrop-blur on content surfaces.

> Voice: Calm, experienced GP explaining their service. Dry wit. Never stiff, never slangy.

---

## 1. Color

```css
:root {
  /* -- Backgrounds (light mode — the default) -- */
  --bg:           #F8F7F4;   /* warm ivory page background — never pure white */
  --surface:      #FFFFFF;   /* card surfaces — pure white for contrast against ivory */
  --elevated:     #F2F0EC;   /* hover states, nested regions */
  --overlay:      #ECEAE5;   /* dropdowns, tooltips */

  /* -- Backgrounds (dark mode — "Quiet Night Sky") -- */
  --bg-dark:      #0B1120;
  --surface-dark: #111827;   /* maps to dark:bg-card */
  --elevated-dark:#1A2332;
  --overlay-dark: #1F2D42;

  /* -- Borders -- */
  --border:         rgba(0, 0, 0, 0.07);    /* border-border/50 */
  --border-em:      rgba(0, 0, 0, 0.12);
  --border-focus:   rgba(59, 130, 246, 0.40);
  --border-dark:    rgba(255,255,255,0.07);
  --border-dark-em: rgba(255,255,255,0.15);  /* dark:border-white/15 */

  /* -- Text -- */
  --text:      #1A1A2E;
  --muted:     #6B7280;
  --muted2:    #9CA3AF;
  --text-dark: #E8EDF5;
  --muted-dark:#8FA3BF;

  /* -- Semantic -- */
  --blue:         #3B82F6;   /* primary */
  --blue-light:   #EFF6FF;
  --blue-border:  rgba(59,130,246,0.20);

  --teal:         #5DB8C9;   /* dark mode primary accent */
  --teal-light:   rgba(93,184,201,0.12);

  --green:        #22C55E;   /* success */
  --green-light:  #F0FDF4;
  --green-border: rgba(34,197,94,0.20);

  --coral:        #F87171;   /* destructive */
  --coral-light:  #FEF2F2;
  --coral-border: rgba(248,113,113,0.20);

  --amber:        #F59E0B;   /* warning */
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

### Rules

- Light mode is default. Dark mode ("Quiet Night Sky") supported site-wide — marketing, SEO pages, and app shell.
- Page backgrounds use warm ivory (`--bg`). Card surfaces use pure white (`--surface`) for contrast.
- **Prohibited:** purple/violet (except `--service-referral`), neon, dark navy on marketing pages.
- Morning spectrum: marketing heroes only. Never inside the product UI.
- **Sky-toned shadows only: `shadow-primary/[0.06]`.** Never black shadows on marketing surfaces. The global `--shadow-*` CSS tokens in `app/globals.css:175-183` are based on `rgba(59, 130, 246, ...)` (the primary blue at low alpha) — updated 2026-04-08 in commit `270e6c3a1`. Every `shadow-sm`/`shadow-md`/`shadow-lg` Tailwind utility now cascades through these sky-tinted values.
- **Dark mode card surfaces are SOLID**, not translucent. `--card` and `--popover` are `#111827` (not `rgba(17, 24, 39, 0.75)`) — updated 2026-04-08 in the same commit. Previously the translucent rgba values created an unintended glass effect on every card in dark mode.
- Semantic colors convey status. Never use decoratively.

---

## 2. Typography

**Primary:** Source Sans 3 — all UI, marketing, body.
**Monospace:** JetBrains Mono — order IDs, certificate codes, API responses, code blocks only.
No serif. No decorative fonts. Never Inter, Roboto, Arial.

### Scale

| Class | Size | Weight | Tracking | Use |
|-------|------|--------|----------|-----|
| display | 48px | 300 | -0.03em | Hero headlines |
| h1 | 36px | 600 | -0.025em | Page titles |
| h2 | 24px | 600 | -0.02em | Section headings |
| h3 | 18px | 600 | -0.01em | Card titles |
| body | 16px | 400 | — | Body text (non-negotiable minimum on patient flows) |
| small | 14px | 400 | — | Secondary text |
| label | 13px | 500 | — | Form labels |
| caption | 12px | 400 | — | Captions, fine print |
| overline | 11px | 600 | 0.10em | Section pills, uppercase only |
| mono | 13px | 400 | 0.04em | JetBrains Mono — codes, IDs |

### Rules

- Body 16px minimum on all patient-facing flows. Non-negotiable.
- Weights: 300 (display only), 400 (body), 500 (label), 600 (headings). Never 700+.
- Negative tracking on all headings.
- Sentence case everywhere. All caps only on overline.
- Emoji: max 1 per block. Never in headings. Never medical emoji.

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

## 5. Elevation — Solid Depth (dub.co pattern)

The core surface pattern. Every card, panel, and container uses this system. **No glass, no backdrop-blur on content surfaces.**

### Card Tiers

```tsx
// Tier 1: Standard card (most common)
className="bg-white dark:bg-card border border-border/50 dark:border-white/15
           shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl"

// Tier 2: Elevated card (feature cards, pricing, treatments)
className="bg-white dark:bg-card border border-border/50 dark:border-white/15
           shadow-md shadow-primary/[0.06] dark:shadow-none rounded-2xl
           hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/[0.08]
           transition-all duration-300"

// Tier 3: Highlighted card (popular/featured, with ring)
className="bg-white dark:bg-card border border-border/50 dark:border-white/15
           ring-2 ring-primary shadow-lg shadow-primary/[0.1]
           hover:shadow-xl hover:shadow-primary/[0.15]
           hover:-translate-y-1 transition-all duration-300 rounded-2xl"

// Section background (subtle tinted region)
className="bg-muted/50 dark:bg-white/[0.06]"
```

### Card Hover

All marketing cards use a standard hover pattern:

```
hover:shadow-lg hover:shadow-primary/[0.08] hover:-translate-y-0.5 transition-all duration-300
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
- Modal overlays

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

## 7. Service Icon Tiles

All service icons use the `ServiceIconTile` component (`components/icons/service-icons.tsx`). No raw icon components or local icon containers — always use this.

**Visual treatment:** White-filled SVG icons on a per-service linear gradient tile (`135deg`), with a soft colored box-shadow.

```tsx
<ServiceIconTile iconKey="Lightning" color="blue" size="md" />
```

**Sizes:**

| Size | Classes | Use |
|------|---------|-----|
| `sm` | `w-8 h-8 rounded-lg` | Nav dropdowns, mobile menu, compact rows |
| `md` | `w-10 h-10 rounded-xl` | Compact cards |
| `lg` | `w-12 h-12 rounded-xl` | Main service cards (homepage grid) |

**Color tokens (`serviceColorConfig`):**

| Token | Gradient | Use |
|-------|----------|-----|
| `emerald` | `#10B981 → #059669` | Medical Certificates |
| `cyan` | `#0EA5E9 → #0284C7` | Repeat Medication |
| `blue` | `#6366F1 → #4F46E5` | ED Treatment |
| `violet` | `#A855F7 → #7C3AED` | Hair Loss |
| `pink` | `#EC4899 → #DB2777` | Women's Health |
| `rose` | `#F43F5E → #E11D48` | Weight Loss |

**Icon keys:** `"FileText"` · `"Pill"` · `"Lightning"` · `"Sparkles"` · `"Heart"` · `"Flame"`

**SVG fill pattern (duotone effect):** Primary shape `rgba(255,255,255,0.92)` · Secondary/depth `rgba(255,255,255,0.38–0.5)` · Content lines `rgba(0,0,0,0.10–0.16)`. The gradient background shows through semi-transparent white, creating a natural two-tone look.

---

## 8. Section Components

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

## 9. Announcement Pill (Hero Badge)

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

## 10. Pills

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
```

---

## 11. Components

### Button

```tsx
// Primary
className="bg-primary hover:bg-primary/90 text-primary-foreground
           shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30
           active:scale-[0.98] transition-all"

// Secondary / Outline
```

### CTA Button Glow

All primary marketing CTAs use a consistent shadow glow:

```
shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30
```

Secondary CTAs on colored backgrounds: `shadow-lg hover:shadow-xl` (no color tint).

```tsx
// Secondary / Outline
className="bg-foreground hover:bg-foreground/90 text-background"
// or
variant="outline" // shadcn default

// Ghost
variant="ghost" // shadcn default
```

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
// AHPRA, TGA, Medicare PNGs from /public/logos/
<Image src="/logos/AHPRA.png"
       className="h-8 w-auto rounded dark:bg-white/90 dark:p-0.5" />
```

---

## 12. Motion

```css
--ease-out:    cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
```

### Durations

| Duration | Use |
|----------|-----|
| 150ms | Hover colour, border transitions |
| 200ms | Button states, badge changes |
| 300ms | Card lifts, input focus, list entry |
| 400ms | Page section entrance, modal open |
| 500ms | Hero entrance — hard ceiling |

No bounce. No elastic. Max scale: 1.02x. Patients don't need theatrics.

### Framer Motion Patterns

```tsx
// Section entrance
<motion.div
  initial={{ opacity: 0, y: 10 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
/>

// Staggered children
<motion.div
  initial={{ opacity: 0, y: 8 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ delay: index * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
/>

// Card hover — CSS-only preferred over framer for simple lifts
className="hover:-translate-y-1 transition-all duration-300"

// Button press
<motion.button whileTap={{ scale: 0.98 }} transition={{ duration: 0.1 }} />
```

### Reduced Motion

**Critical:** Always respect `prefers-reduced-motion`. Use `useReducedMotion()` hook.

```tsx
const prefersReducedMotion = useReducedMotion()

// CORRECT: empty object disables animation
initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}

// WRONG: false is not valid for initial prop
initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}  // DO NOT USE
```

### Rules

- `viewport={{ once: true }}` on every scroll-triggered animation. Always.
- `whileHover` scale never beyond 1.02.
- Never rotate, never elastic, never parallax on content.

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
| AHPRA | `/logos/AHPRA.png` | 100px |
| TGA | `/logos/TGA.png` | 80px |
| Medicare | `/logos/medicare.png` | 90px |
| RACGP | `/logos/RACGP.png` | 90px |

Dark mode: `rounded dark:bg-white/90 dark:p-0.5` — adds white backing for PNGs with transparent backgrounds.

---

## 16. Voice & Copy Rules

| Write this | Not this |
|------------|----------|
| "Get a medical certificate in 10 minutes." | "Revolutionising access to healthcare." |
| "A GP reviews your case. You get the cert." | "Our comprehensive platform leverages AI." |
| "Something wrong? We'll sort it." | "Our dedicated support team is here to help!" |
| "No hidden fees. No subscription." | "Transparent, seamless, patient-first care." |

---

## 16. Do / Don't

| Do | Don't |
|----|-------|
| Solid white cards with sky-toned shadows | Glass morphism / backdrop-blur on cards |
| `bg-white dark:bg-card` for all card surfaces | `bg-card/60 dark:bg-white/5 backdrop-blur` |
| `shadow-md shadow-primary/[0.06]` for depth | Black box-shadow anywhere |
| `hover:-translate-y-1` for card interaction | No interaction on hover |
| Morning gradient — radial, hero background only | Full gradient page background |
| Split or centered hero (context-dependent) | One rigid hero layout for everything |
| Full dark mode support (`dark:` variants) | Dark mode limited to dashboard only |
| 16px body on patient flows | 14px — too small for anxious patients |
| Squircle / rounded corners | Any sharp geometry |
| Source Sans 3 for everything | Inter, Roboto, serif, decorative |
| `scale: 0.98` on press | `scale: 0.95` — too aggressive |
| `initial={{}}` for reduced motion | `initial={false}` — invalid prop |
| `viewport={{ once: true }}` always | Animating on every scroll pass |
| Product mockups as section anchors | Illustration-only grids |
| 48px min tap target on mobile | Small hit areas on patient forms |
| `unoptimized` on SVG Image components | Next.js optimization on SVGs |
