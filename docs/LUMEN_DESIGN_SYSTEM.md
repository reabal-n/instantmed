# Lumen Health Design System

> **Version 3.0** — Clarity Emerging
> 
> A calm, premium design system for Lumen Health's telehealth platform. Defined by morning light, restraint, and quiet confidence.

---

## Brand Reference

See `/brand/LUMEN_BRAND_STYLE.md` for the complete brand guidelines. This design system implements those principles into code.

**Core Mantra:** *Lumen does not shout. Lumen does not rush. Lumen illuminates.*

---

## 1. Color System

### Philosophy
Colors are derived from early morning light — soft, warm, and low-saturation. Contrast is achieved through lightness and material, never harsh color jumps.

### Primary Palette — Morning Spectrum

```css
:root {
  /* Sky — Primary cool tone (from logo background) */
  --sky-50: #F7FAFC;
  --sky-100: #EDF4F8;
  --sky-200: #E1EEF5;
  --sky-300: #C5DDF0;
  --sky-400: #A8CCE8;
  --sky-500: #8ABBE0;
  
  /* Dawn — Primary warm tone (from logo sun) */
  --dawn-50: #FFFAF5;
  --dawn-100: #FEF3E8;
  --dawn-200: #FCEBD8;
  --dawn-300: #FBDCBA;
  --dawn-400: #F9C992;
  --dawn-500: #F5A962;
  --dawn-600: #E8924A;
  
  /* Ivory — Neutral warm base */
  --ivory-50: #FEFDFB;
  --ivory-100: #FBF9F5;
  --ivory-200: #F7F4ED;
  --ivory-300: #F0EBE0;
  --ivory-400: #E5DFD2;
  
  /* Peach — Soft accent */
  --peach-50: #FFF8F5;
  --peach-100: #FFEDE5;
  --peach-200: #FFE0D4;
  --peach-300: #FFCEBB;
  --peach-400: #FFB89D;
  
  /* Champagne — Warm highlight */
  --champagne-50: #FFFCF7;
  --champagne-100: #FFF8ED;
  --champagne-200: #FFF0DB;
  --champagne-300: #FFE5C4;
}
```

### Semantic Colors

```css
:root {
  /* Primary action — Dawn warmth */
  --color-primary: var(--dawn-500);
  --color-primary-hover: var(--dawn-600);
  --color-primary-light: var(--dawn-100);
  
  /* Background — Sky lightness */
  --color-background: var(--sky-100);
  --color-background-elevated: var(--ivory-50);
  
  /* Surface — Glass tones */
  --color-surface: rgba(255, 255, 255, 0.75);
  --color-surface-elevated: rgba(255, 255, 255, 0.85);
  
  /* Text — Soft, never harsh black */
  --color-text-primary: #2D3748;
  --color-text-secondary: #5A6777;
  --color-text-muted: #8896A6;
  
  /* Borders — Extremely subtle */
  --color-border: rgba(197, 221, 240, 0.4);
  --color-border-strong: rgba(197, 221, 240, 0.6);
  
  /* States */
  --color-success: #6BBF8A;
  --color-success-light: #E8F5ED;
  --color-warning: var(--dawn-400);
  --color-warning-light: var(--dawn-50);
  --color-error: #E07A7A;
  --color-error-light: #FFF0F0;
}
```

### Prohibited Colors
- ❌ Purple or violet tones
- ❌ Neon or high-saturation hues
- ❌ Dark blues (night/AI SaaS aesthetic)
- ❌ Pure black (`#000000`)
- ❌ Pure white (`#FFFFFF`) for backgrounds

### Tailwind Color Extensions

```js
// tailwind.config.js colors
colors: {
  sky: {
    50: '#F7FAFC',
    100: '#EDF4F8',
    200: '#E1EEF5',
    300: '#C5DDF0',
    400: '#A8CCE8',
    500: '#8ABBE0',
  },
  dawn: {
    50: '#FFFAF5',
    100: '#FEF3E8',
    200: '#FCEBD8',
    300: '#FBDCBA',
    400: '#F9C992',
    500: '#F5A962',
    600: '#E8924A',
  },
  ivory: {
    50: '#FEFDFB',
    100: '#FBF9F5',
    200: '#F7F4ED',
    300: '#F0EBE0',
    400: '#E5DFD2',
  },
  peach: {
    50: '#FFF8F5',
    100: '#FFEDE5',
    200: '#FFE0D4',
    300: '#FFCEBB',
    400: '#FFB89D',
  },
  champagne: {
    50: '#FFFCF7',
    100: '#FFF8ED',
    200: '#FFF0DB',
    300: '#FFE5C4',
  },
}
```

---

## 2. Typography

### Philosophy
Typography is authoritative and neutral. Serif for calm authority in headings, sans-serif for clarity in body text. Type carries trust — it must never compete with the visual identity.

### Font Stack

```css
:root {
  /* Serif — Headings, editorial moments */
  --font-serif: 'Lora', Georgia, 'Times New Roman', serif;
  
  /* Sans — Body text, UI elements */
  --font-sans: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

### Font Loading (Next.js)

```tsx
// app/layout.tsx
import { Lora, Source_Sans_3 } from 'next/font/google'

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

// Apply to body
<body className={`${lora.variable} ${sourceSans.variable} font-sans`}>
```

### Type Scale

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| Display | Lora | 48px / 3rem | 500 | 1.1 |
| H1 | Lora | 36px / 2.25rem | 500 | 1.2 |
| H2 | Lora | 28px / 1.75rem | 500 | 1.25 |
| H3 | Lora | 22px / 1.375rem | 500 | 1.3 |
| H4 | Source Sans 3 | 18px / 1.125rem | 600 | 1.4 |
| Body Large | Source Sans 3 | 18px / 1.125rem | 400 | 1.6 |
| Body | Source Sans 3 | 16px / 1rem | 400 | 1.6 |
| Body Small | Source Sans 3 | 14px / 0.875rem | 400 | 1.5 |
| Caption | Source Sans 3 | 12px / 0.75rem | 500 | 1.4 |
| Button | Source Sans 3 | 15px / 0.9375rem | 600 | 1 |

### Tailwind Typography Classes

```tsx
// Headings — Serif, calm authority
className="font-serif text-4xl font-medium tracking-tight text-gray-800"

// Body — Sans, clear and readable  
className="font-sans text-base text-gray-600 leading-relaxed"

// Labels — Sans, slightly bolder
className="font-sans text-sm font-semibold text-gray-700"

// Captions — Sans, muted
className="font-sans text-xs font-medium text-gray-500"
```

### Tailwind Config

```js
// tailwind.config.js
fontFamily: {
  serif: ['var(--font-serif)', 'Georgia', 'serif'],
  sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
},
```

---

## 3. Glass Material System

### Philosophy
Glass surfaces create depth through translucency and blur, not harsh shadows. The effect should be subtle — frosted, not glossy. Glass edges must remain readable at all sizes.

### Base Glass

```css
.glass-surface {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px) saturate(120%);
  -webkit-backdrop-filter: blur(20px) saturate(120%);
  border: 1px solid rgba(197, 221, 240, 0.35);
}
```

### Glass Hierarchy

| Level | Use Case | Background | Blur | Border Opacity |
|-------|----------|------------|------|----------------|
| 1 | Page sections | `white/60` | `blur-lg` | 25% |
| 2 | Cards, containers | `white/75` | `blur-xl` | 35% |
| 3 | Modals, overlays | `white/85` | `blur-2xl` | 45% |
| 4 | Tooltips, popovers | `white/90` | `blur-2xl` | 50% |

### Tailwind Glass Classes

```tsx
// Level 1 — Subtle section background
className="bg-white/60 backdrop-blur-lg border border-sky-300/25"

// Level 2 — Standard card
className="bg-white/75 backdrop-blur-xl border border-sky-300/35"

// Level 3 — Elevated modal
className="bg-white/85 backdrop-blur-2xl border border-sky-300/45"

// Level 4 — Tooltip
className="bg-white/90 backdrop-blur-2xl border border-sky-300/50"
```

### Shadow System

**No harsh black shadows.** Shadows are soft, warm, and suggest gentle depth.

```css
/* Subtle shadow — cards at rest */
--shadow-soft: 0 4px 20px rgba(197, 221, 240, 0.15);

/* Medium shadow — hover states */
--shadow-medium: 0 8px 30px rgba(197, 221, 240, 0.20);

/* Elevated shadow — modals, dropdowns */
--shadow-elevated: 0 12px 40px rgba(197, 221, 240, 0.25);

/* Warm glow — focus states, primary actions */
--shadow-glow: 0 0 20px rgba(245, 169, 98, 0.15);
```

### Tailwind Shadow Utilities

```tsx
// Card shadow (soft, cool)
className="shadow-[0_4px_20px_rgba(197,221,240,0.15)]"

// Hover shadow (slightly elevated)
className="hover:shadow-[0_8px_30px_rgba(197,221,240,0.20)]"

// Modal shadow (prominent but soft)
className="shadow-[0_12px_40px_rgba(197,221,240,0.25)]"

// Focus glow (warm dawn tone)
className="focus:shadow-[0_0_20px_rgba(245,169,98,0.15)]"
```

---

## 4. Geometry & Shape

### Philosophy
All shapes are rounded and balanced. Nothing should feel fast, jagged, or angular. Squircle forms preferred where possible.

### Border Radius Scale

| Element | Radius | Tailwind Class |
|---------|--------|----------------|
| Buttons | 12px | `rounded-xl` |
| Inputs | 12px | `rounded-xl` |
| Cards | 20px | `rounded-2xl` |
| Modals | 24px | `rounded-3xl` |
| Tags/Badges | 8px | `rounded-lg` |
| Avatars | Full | `rounded-full` |
| Small chips | 6px | `rounded-md` |

### Shape Guidelines
- All interactive elements have rounded corners
- Minimum border-radius: 8px for any UI element
- Containers use generous padding (p-6 minimum for cards)
- Forms have consistent vertical rhythm (space-y-4 or space-y-6)

---

## 5. Motion & Animation

### Philosophy
**Motion exists to confirm, not to impress.** All animation is slow, intentional, and subtle. No bounce, snap, or aggressive acceleration.

### Timing Guidelines

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Button hover | 250ms | ease-out |
| Card hover | 350ms | ease-out |
| Modal open | 400ms | ease-out |
| Modal close | 250ms | ease-in |
| Focus ring | 200ms | ease |
| Page transition | 500ms | ease-in-out |

### Easing Functions

```css
:root {
  /* Standard — most interactions */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Gentle — appearing elements */
  --ease-gentle: cubic-bezier(0.25, 0.1, 0.25, 1);
  
  /* Calm — slow, deliberate motion */
  --ease-calm: cubic-bezier(0.33, 0, 0.2, 1);
}
```

### Tailwind Motion Classes

```tsx
// Standard transition
className="transition-all duration-300 ease-out"

// Gentle hover lift (subtle, not energetic)
className="transition-transform duration-350 ease-out hover:-translate-y-0.5"

// Slow fade
className="transition-opacity duration-400 ease-in-out"
```

### Framer Motion Presets

```tsx
// Gentle spring — no bounce
const gentleSpring = {
  type: "spring",
  stiffness: 200,
  damping: 30,
  mass: 1
};

// Modal variants — slow, intentional
const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.98,
    y: 8 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 8,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 1, 1]
    }
  }
};

// Card hover — very subtle
const cardHover = {
  rest: { 
    y: 0,
    boxShadow: "0 4px 20px rgba(197, 221, 240, 0.15)"
  },
  hover: { 
    y: -2,
    boxShadow: "0 8px 30px rgba(197, 221, 240, 0.20)",
    transition: { duration: 0.35, ease: "easeOut" }
  }
};
```

### Motion Don'ts
- ❌ No bounce effects
- ❌ No elastic/springy overshoots
- ❌ No aggressive scale changes (max 1.02x)
- ❌ No fast animations under 200ms for emphasis
- ❌ No rotation or complex transforms

---

## 6. Component Patterns

### Primary Button

```tsx
<button className="
  bg-dawn-500
  text-white
  font-sans font-semibold text-[15px]
  px-6 py-3
  rounded-xl
  shadow-[0_4px_20px_rgba(245,169,98,0.25)]
  transition-all duration-300 ease-out
  hover:bg-dawn-600
  hover:shadow-[0_8px_30px_rgba(245,169,98,0.30)]
  hover:-translate-y-0.5
  active:translate-y-0
  focus:outline-none focus:ring-2 focus:ring-dawn-300 focus:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
">
  Continue
</button>
```

### Secondary Button

```tsx
<button className="
  bg-white/75
  backdrop-blur-xl
  border border-sky-300/40
  text-gray-700
  font-sans font-semibold text-[15px]
  px-6 py-3
  rounded-xl
  shadow-[0_4px_20px_rgba(197,221,240,0.15)]
  transition-all duration-300 ease-out
  hover:bg-white/85
  hover:border-sky-300/50
  hover:shadow-[0_8px_30px_rgba(197,221,240,0.20)]
  hover:-translate-y-0.5
  focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2
">
  Learn More
</button>
```

### Glass Card

```tsx
<div className="
  bg-white/75
  backdrop-blur-xl
  border border-sky-300/35
  rounded-2xl
  p-6
  shadow-[0_4px_20px_rgba(197,221,240,0.15)]
  transition-all duration-350 ease-out
  hover:shadow-[0_8px_30px_rgba(197,221,240,0.20)]
  hover:-translate-y-0.5
">
  <h3 className="font-serif text-xl font-medium text-gray-800 mb-2">
    Card Title
  </h3>
  <p className="font-sans text-gray-600 leading-relaxed">
    Card content goes here with calm, readable typography.
  </p>
</div>
```

### Input Field

```tsx
<div className="space-y-2">
  <label className="font-sans text-sm font-semibold text-gray-700">
    Email address
  </label>
  <input
    type="email"
    placeholder="you@example.com"
    className="
      w-full
      bg-white/60
      backdrop-blur-lg
      border border-sky-300/30
      rounded-xl
      px-4 py-3
      font-sans text-gray-800
      placeholder:text-gray-400
      transition-all duration-200 ease-out
      focus:bg-white/75
      focus:border-dawn-400/50
      focus:shadow-[0_0_20px_rgba(245,169,98,0.12)]
      focus:outline-none
    "
  />
</div>
```

### Select / Dropdown

```tsx
<select className="
  w-full
  bg-white/60
  backdrop-blur-lg
  border border-sky-300/30
  rounded-xl
  px-4 py-3
  font-sans text-gray-800
  transition-all duration-200 ease-out
  focus:bg-white/75
  focus:border-dawn-400/50
  focus:shadow-[0_0_20px_rgba(245,169,98,0.12)]
  focus:outline-none
  appearance-none
  cursor-pointer
">
  <option>Select an option</option>
</select>
```

### Modal

```tsx
// Backdrop
<div className="
  fixed inset-0
  bg-sky-900/20
  backdrop-blur-sm
  transition-opacity duration-300
"/>

// Modal content
<div className="
  bg-white/90
  backdrop-blur-2xl
  border border-sky-300/45
  rounded-3xl
  p-8
  shadow-[0_20px_60px_rgba(197,221,240,0.30)]
  max-w-lg w-full
">
  <h2 className="font-serif text-2xl font-medium text-gray-800 mb-4">
    Modal Title
  </h2>
  <p className="font-sans text-gray-600 leading-relaxed mb-6">
    Modal content with comfortable reading experience.
  </p>
</div>
```

### Toast / Notification

```tsx
<div className="
  bg-white/90
  backdrop-blur-2xl
  border border-sky-300/40
  rounded-xl
  px-4 py-3
  shadow-[0_8px_30px_rgba(197,221,240,0.25)]
  flex items-center gap-3
">
  <div className="w-2 h-2 rounded-full bg-green-500" />
  <p className="font-sans text-sm text-gray-700">
    Your request has been submitted.
  </p>
</div>
```

### Badge / Tag

```tsx
// Status badge
<span className="
  inline-flex items-center
  bg-dawn-100
  text-dawn-600
  font-sans text-xs font-semibold
  px-2.5 py-1
  rounded-lg
">
  Pending Review
</span>

// Neutral badge
<span className="
  inline-flex items-center
  bg-sky-100
  text-sky-600
  font-sans text-xs font-semibold
  px-2.5 py-1
  rounded-lg
">
  Medical Certificate
</span>
```

### Navigation Link

```tsx
<a className="
  font-sans text-[15px] font-medium
  text-gray-600
  transition-colors duration-250
  hover:text-gray-800
  relative
  after:absolute after:bottom-0 after:left-0
  after:w-0 after:h-0.5
  after:bg-dawn-400
  after:transition-all after:duration-300
  hover:after:w-full
">
  About Us
</a>
```

---

## 7. Background Patterns

### Dawn Gradient Background

```tsx
// Full page background
<div className="
  min-h-screen
  bg-gradient-to-b from-sky-100 via-ivory-50 to-peach-50
">
```

### Atmospheric Radial Glow

```css
.atmospheric-bg {
  background: 
    radial-gradient(ellipse at 30% 20%, rgba(245, 169, 98, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(197, 221, 240, 0.12) 0%, transparent 50%),
    linear-gradient(to bottom, var(--sky-100), var(--ivory-50));
}
```

### Tailwind Atmospheric Background

```tsx
className="
  bg-sky-100
  bg-[radial-gradient(ellipse_at_30%_20%,rgba(245,169,98,0.08)_0%,transparent_50%),radial-gradient(ellipse_at_70%_80%,rgba(197,221,240,0.12)_0%,transparent_50%)]
"
```

---

## 8. Iconography

### Guidelines
- Use Lucide React icons
- Stroke width: 1.5px (default) or 2px for emphasis
- Size: 20px for inline, 24px for standalone
- Color: Inherit from text color, or use `text-gray-500` for muted

### Icon Usage

```tsx
import { Heart, ArrowRight, Check } from 'lucide-react'

// Inline with text
<span className="inline-flex items-center gap-2 text-gray-600">
  <Heart className="w-5 h-5" />
  Healthcare you can trust
</span>

// In button
<button className="inline-flex items-center gap-2">
  Continue
  <ArrowRight className="w-4 h-4" />
</button>
```

---

## 9. Accessibility

### Contrast Requirements
- All text meets WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text)
- Glass backgrounds include sufficient opacity for text contrast
- Focus states are clearly visible

### Focus States

```tsx
className="
  focus:outline-none
  focus:ring-2
  focus:ring-dawn-300
  focus:ring-offset-2
  focus:ring-offset-white
"
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Touch Targets
- Minimum touch target: 44×44px
- Buttons: min-height 44px
- Interactive elements have adequate spacing

---

## 10. Do's and Don'ts

### ✅ Do
- Use the morning color palette consistently
- Apply glass effects with subtle blur
- Keep motion slow and intentional
- Use serif for headings, sans for body
- Maintain generous whitespace
- Create depth through translucency, not shadows

### ❌ Don't
- Use purple, neon, or high-saturation colors
- Apply harsh black shadows
- Use bouncy or energetic animations
- Mix multiple decorative typefaces
- Create busy or cluttered layouts
- Make any element feel "loud" or attention-grabbing

---

## 11. Quick Reference

### Standard Glass Card
```tsx
className="bg-white/75 backdrop-blur-xl border border-sky-300/35 rounded-2xl p-6 shadow-[0_4px_20px_rgba(197,221,240,0.15)] transition-all duration-350 ease-out hover:shadow-[0_8px_30px_rgba(197,221,240,0.20)] hover:-translate-y-0.5"
```

### Primary Button
```tsx
className="bg-dawn-500 text-white font-sans font-semibold text-[15px] px-6 py-3 rounded-xl shadow-[0_4px_20px_rgba(245,169,98,0.25)] transition-all duration-300 ease-out hover:bg-dawn-600 hover:shadow-[0_8px_30px_rgba(245,169,98,0.30)] hover:-translate-y-0.5"
```

### Glass Input
```tsx
className="w-full bg-white/60 backdrop-blur-lg border border-sky-300/30 rounded-xl px-4 py-3 font-sans text-gray-800 placeholder:text-gray-400 transition-all duration-200 ease-out focus:bg-white/75 focus:border-dawn-400/50 focus:shadow-[0_0_20px_rgba(245,169,98,0.12)] focus:outline-none"
```

### Page Background
```tsx
className="min-h-screen bg-gradient-to-b from-sky-100 via-ivory-50 to-peach-50"
```

---

## 12. CSS Variables Summary

```css
:root {
  /* Colors */
  --color-sky-100: #EDF4F8;
  --color-sky-300: #C5DDF0;
  --color-dawn-500: #F5A962;
  --color-dawn-600: #E8924A;
  --color-ivory-50: #FEFDFB;
  --color-ivory-100: #FBF9F5;
  --color-peach-100: #FFEDE5;
  
  /* Typography */
  --font-serif: 'Lora', Georgia, serif;
  --font-sans: 'Source Sans 3', system-ui, sans-serif;
  
  /* Shadows */
  --shadow-soft: 0 4px 20px rgba(197, 221, 240, 0.15);
  --shadow-medium: 0 8px 30px rgba(197, 221, 240, 0.20);
  --shadow-glow: 0 0 20px rgba(245, 169, 98, 0.15);
  
  /* Motion */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-gentle: cubic-bezier(0.25, 0.1, 0.25, 1);
  --duration-fast: 200ms;
  --duration-normal: 300ms;
  --duration-slow: 400ms;
}
```

---

*Last updated: January 2026*
*Design System Version: 3.0 — Clarity Emerging*
*Brand: Lumen Health*
*Reference: /brand/LUMEN_BRAND_STYLE.md*

