# DESIGN_SYSTEM.md — InstantMed (Final)

> **Load every session.** This is the single source of truth for all visual, layout, and interaction decisions. The design system is law — no deviations without explicit approval.

> Brand essence: "Clarity emerging." Calm authority. Morning light. Good judgment. If it feels impressive but loud — kill it. If it resembles crypto/AI SaaS — kill it. If it feels like wellness marketing — kill it.

> Bento inspiration: Stripe (alive, interactive cells), Dub.co (fluid, breathing layouts). Each card is a living product moment. Not a static grid.

> Voice: Calm, experienced GP explaining their service. Dry wit. Never stiff, never slangy.

---

## 1. Color

```css
:root {
  /* ── Backgrounds (light mode — the default) ── */
  --bg:           #F8F7F4;   /* warm ivory — never pure white */
  --surface:      #FFFFFF;
  --elevated:     #F2F0EC;   /* hover states, nested regions */
  --overlay:      #ECEAE5;   /* dropdowns, tooltips */

  /* ── Backgrounds (dark mode — "Quiet Night Sky") ── */
  --bg-dark:      #0B1120;
  --surface-dark: #111827;
  --elevated-dark:#1A2332;
  --overlay-dark: #1F2D42;

  /* ── Borders ── */
  --border:         rgba(0, 0, 0, 0.07);
  --border-em:      rgba(0, 0, 0, 0.12);
  --border-focus:   rgba(59, 130, 246, 0.40);
  --border-dark:    rgba(255,255,255,0.07);
  --border-dark-em: rgba(255,255,255,0.12);

  /* ── Text ── */
  --text:      #1A1A2E;
  --muted:     #6B7280;
  --muted2:    #9CA3AF;
  --text-dark: #E8EDF5;
  --muted-dark:#8FA3BF;

  /* ── Semantic ── */
  --blue:         #3B82F6;
  --blue-light:   #EFF6FF;
  --blue-border:  rgba(59,130,246,0.20);
  --blue-glow:    rgba(59,130,246,0.15);

  --teal:         #5DB8C9;   /* dark mode primary accent */
  --teal-light:   rgba(93,184,201,0.12);

  --green:        #22C55E;
  --green-light:  #F0FDF4;
  --green-border: rgba(34,197,94,0.20);

  --coral:        #F87171;
  --coral-light:  #FEF2F2;
  --coral-border: rgba(248,113,113,0.20);

  --amber:        #F59E0B;
  --amber-light:  #FFFBEB;
  --amber-border: rgba(245,158,11,0.20);

  /* ── Service type tokens ── */
  --service-medcert:  #3B82F6;
  --service-referral: #8B5CF6;   /* only permitted purple use */
  --service-rx:       #22C55E;
  --service-hair:     #F59E0B;
  --service-weight:   #EC4899;

  /* ── Order status ── */
  --status-pending:    var(--amber);
  --status-processing: var(--blue);
  --status-complete:   var(--green);
  --status-rejected:   var(--coral);

  /* ── Trust signal ── */
  --trust-bg:     rgba(34,197,94,0.06);
  --trust-border: rgba(34,197,94,0.15);
  --trust-text:   #22C55E;

  /* ── Morning spectrum (marketing/hero only) ── */
  --morning-sky:   #BAD4F5;
  --morning-peach: #F5C6A0;
  --morning-ivory: #F7F3EC;
  --morning-champ: #E8D5A3;
}
```

### Rules

- Light mode is default. Dark mode ("Quiet Night Sky") for dashboard/app shell only.
- Never pure `#000000` or `#FFFFFF`.
- **Prohibited:** purple/violet (except `--service-referral`), neon, dark navy on marketing pages.
- Morning spectrum: marketing and hero only. Never inside the product UI.
- Sky-toned shadows only: `box-shadow: 0 4px 16px rgba(59,130,246,0.08)`. Never black shadows.
- Semantic colors convey status. Never use decoratively.

---

## 2. Typography

**Primary:** Source Sans 3 — all UI, marketing, body.
**Monospace:** JetBrains Mono — order IDs, certificate codes, API responses, code blocks only.
No serif. No decorative fonts. Never Inter, Roboto, Arial.

```css
@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
```

### Scale

```css
.text-display {
  font-size: 48px; font-weight: 300;
  letter-spacing: -0.03em; line-height: 1.05;
}
.text-h1 {
  font-size: 36px; font-weight: 600;
  letter-spacing: -0.025em; line-height: 1.1;
}
.text-h2 {
  font-size: 24px; font-weight: 600;
  letter-spacing: -0.02em; line-height: 1.2;
}
.text-h3 {
  font-size: 18px; font-weight: 600;
  letter-spacing: -0.01em;
}
.text-body {
  font-size: 16px; font-weight: 400;    /* 16px — patient readability, non-negotiable */
  line-height: 1.75; color: var(--muted);
}
.text-small  { font-size: 14px; line-height: 1.6; color: var(--muted); }
.text-label  { font-size: 13px; font-weight: 500; color: var(--muted); }
.text-caption{ font-size: 12px; color: var(--muted2); }
.text-overline {
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.10em; text-transform: uppercase; color: var(--muted2);
}
.text-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px; color: var(--blue);
}
```

### Rules

- Body 16px minimum on all patient-facing flows. Non-negotiable.
- Weights: 300 (display only), 400 (body), 500 (label), 600 (headings). Never 700+.
- Negative tracking on all headings.
- Left-aligned hero. Never centered.
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

Container: `max-width: 1200px; margin: 0 auto; padding: 0 40px;` (desktop) / `padding: 0 20px` (mobile)

---

## 4. Border Radius — Squircle-preferred

```css
--radius-sm:   6px;    /* badges, tags */
--radius-md:   10px;   /* buttons, inputs — rounder than standard */
--radius-lg:   14px;   /* cards, modals */
--radius-xl:   20px;   /* bento cards, hero panels */
--radius-full: 9999px; /* pills, avatars, toggles */
```

Rounded/squircle geometry only. No sharp corners anywhere.

---

## 5. Elevation

```css
/* Light mode — sky-toned shadows */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 4px rgba(59,130,246,0.05),
              0 4px 16px rgba(59,130,246,0.04);
  transition: border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease;
}
.card:hover {
  border-color: var(--border-em);
  box-shadow: 0 4px 24px rgba(59,130,246,0.09);
  transform: translateY(-1px);
}

/* Dark mode */
.card-dark {
  background: var(--surface-dark);
  border: 1px solid var(--border-dark);
  border-radius: var(--radius-lg);
  transition: border-color 200ms ease;
}
.card-dark:hover { border-color: var(--border-dark-em); }

/* Focus ring */
.input:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
}
```

---

## 6. Glass Morphism — Frosted, Sky-toned

Used on: hero feature cards, floating overlays, testimonial surfaces. Never black glass. Never glossy.

```css
.glass {
  background: rgba(255,255,255,0.65);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid rgba(255,255,255,0.45);
  border-radius: var(--radius-xl);
  box-shadow: 0 8px 32px rgba(59,130,246,0.08);
}
.glass-dark {
  background: rgba(11,17,32,0.72);
  backdrop-filter: blur(20px) saturate(1.2);
  border: 1px solid rgba(255,255,255,0.08);
}
```

- 4-level hierarchy: opaque > light > mid > heavy glass.
- Max blur: 20px. Never on data tables or forms.

---

## 7. Bento Grid System

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
}
.bento-2  { grid-column: span 2; }
.bento-3  { grid-column: span 3; }
.bento-4  { grid-column: span 4; }
.bento-6  { grid-column: span 6; }
.bento-8  { grid-column: span 8; }
.bento-12 { grid-column: span 12; }

.bento-cell {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 24px;
  overflow: hidden;
  position: relative;
  transition: border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease;
}
.bento-cell:hover {
  border-color: var(--border-em);
  box-shadow: 0 4px 24px rgba(59,130,246,0.08);
  transform: translateY(-2px);
}
.bento-cell-tall    { min-height: 320px; }
.bento-cell-wide    { min-height: 180px; }
.bento-cell-feature { min-height: 240px; }
```

### Bento Principles

- **Asymmetric always.** Mix 4+8, 3+9, 6+6, full-width. Never 3x3 identical rectangles.
- **Varied cell types** per row: stat card + chart card + screenshot card. Never two identical types adjacent.
- **Each cell has one job.** One number, one interaction, one screenshot.
- **Product screenshots as anchors.** At least one cell per section shows actual UI.
- **Dub.co style:** fluid hover, lift + border brightening, each cell breathes.
- Morning gradient fills allowed on tall hero cells only.

---

## 8. Announcement Pill (Hero Badge)

Loops-style trust signal above the hero headline. Icon badge + text. Centered. Max ~40 chars.

```css
.announce-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px 6px 6px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 400;
  white-space: nowrap;
  background: #FFFFFF;
  border: 1px solid rgba(0,0,0,0.10);
  color: #6B7280;
  box-shadow: 0 1px 4px rgba(59,130,246,0.06);
}
.announce-pill .badge-icon {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: #3B82F6; color: #fff;
  font-size: 13px; font-weight: 600; flex-shrink: 0;
}
```

```
// Examples
"LegitScript certified · Australian telehealth"
"AHPRA-compliant · GP-reviewed within 2 hours"
"Medicare-aligned · No hidden fees"
```

---

## 9. App-Icon Category Tabs (Dub-style)

Feature navigation tabs: coloured rounded-square icon badge + label. Selected: white bg + shadow.

```css
.tab-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(0,0,0,0.04);
  padding: 4px;
  border-radius: 14px;
}
.tab {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 7px 14px; border-radius: 10px;
  font-size: 14px; font-weight: 500;
  cursor: pointer; color: #6B7280;
  border: none; background: transparent;
  transition: all 150ms ease;
}
.tab.active {
  background: #FFFFFF; color: #1A1A2E;
  box-shadow: 0 1px 4px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06);
}
.tab-icon {
  width: 22px; height: 22px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; flex-shrink: 0;
}
```

---

## 10. Pills

Light Mode Pills (Dub-style — border only, minimal fill)

```css
.pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px; border-radius: 9999px;
  font-size: 12px; font-weight: 500; white-space: nowrap;
}
.pill.neutral { background: #F9FAFB; color: #6B7280; border: 1px solid #E5E7EB; }
.pill.blue    { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
.pill.green   { background: #F0FDF4; color: #16A34A; border: 1px solid #BBF7D0; }
.pill.red     { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
.pill.amber   { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }
.pill.purple  { background: #FAF5FF; color: #7C3AED; border: 1px solid #DDD6FE; }
.pill.mono    { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.04em; }
.pill .pill-icon { width: 14px; height: 14px; font-size: 10px; }
```

```tsx
// Order status
<span className="pill green">✓ Certificate issued</span>
<span className="pill blue">📋 Processing</span>
<span className="pill amber">⏳ GP reviewing</span>
<span className="pill red">✕ Rejected</span>
// Framework ref
<span className="pill purple mono">AHPRA</span>
<span className="pill blue mono">LegitScript</span>
```

---

## 11. Components

### Button

```css
.btn-primary {
  background: var(--blue); color: #fff; border: none;
  padding: 10px 20px; border-radius: var(--radius-md);
  font-family: 'Source Sans 3', sans-serif; font-size: 15px; font-weight: 600;
  cursor: pointer;
  transition: opacity 150ms ease, transform 150ms ease, box-shadow 150ms ease;
  box-shadow: 0 2px 8px rgba(59,130,246,0.25);
}
.btn-primary:hover  { opacity: 0.90; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(59,130,246,0.30); }
.btn-primary:active { transform: scale(0.98); }

.btn-secondary {
  background: var(--surface); color: var(--text);
  border: 1px solid var(--border-em);
  padding: 10px 20px; border-radius: var(--radius-md);
  font-size: 15px; font-weight: 500; cursor: pointer;
  transition: all 150ms ease;
  box-shadow: 0 1px 4px rgba(59,130,246,0.05);
}
.btn-secondary:hover { background: var(--elevated); border-color: var(--blue); }

.btn-ghost {
  background: transparent; color: var(--muted); border: none;
  padding: 10px 20px; border-radius: var(--radius-md);
  font-size: 15px; cursor: pointer;
  transition: color 150ms ease, background 150ms ease;
}
.btn-ghost:hover { color: var(--text); background: var(--elevated); }
```

### Input

```css
.input {
  background: var(--surface); border: 1px solid var(--border-em);
  color: var(--text); padding: 11px 14px; border-radius: var(--radius-md);
  font-family: 'Source Sans 3', sans-serif;
  font-size: 16px;    /* 16px prevents iOS zoom, patient readability */
  width: 100%; outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.input::placeholder { color: var(--muted2); }
.input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }

@media (max-width: 768px) {
  .input { min-height: 48px; }   /* min 48px tap target */
}
```

### Badge (dark surfaces — dashboard)

```css
.badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 9999px;
  font-size: 12px; font-weight: 500;
}
.badge-blue  { background: var(--blue-light);  color: var(--blue);  border: 1px solid var(--blue-border); }
.badge-green { background: var(--green-light); color: var(--green); border: 1px solid var(--green-border); }
.badge-amber { background: var(--amber-light); color: var(--amber); border: 1px solid var(--amber-border); }
.badge-red   { background: var(--coral-light); color: var(--coral); border: 1px solid var(--coral-border); }
.badge-dot   { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
```

### Code Block

```css
.code-block {
  background: #0B1120;   /* always dark */
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px; line-height: 1.75; overflow-x: auto; color: #CBD5E1;
}
/* Tokens: keywords #5DB8C9, strings #22C55E, comments #4B5563, default #94A3B8 */
```

---

## 12. Monospace Alert Row (Clerk-style)

Dark notification row. GP queue, system alerts, certificate processing status.

```css
.alert-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  background: #1A2332;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  font-family: 'JetBrains Mono', monospace; font-size: 13px;
}
.alert-row .alert-text  { flex: 1; color: #E8EDF5; }
.alert-row .alert-time  { font-size: 12px; color: #596F8A; }

@keyframes spin { to { transform: rotate(360deg); } }
.spinner {
  width: 14px; height: 14px; flex-shrink: 0;
  border: 1.5px solid rgba(255,255,255,0.15);
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
```

```tsx
<div className="alert-row">
  <div className="spinner" />
  <span className="alert-text">GP review in progress · IM-CERT-20240319-00421</span>
  <span className="alert-time">2m ago</span>
</div>
```

---

## 13. Certificate Preview Card

```css
.cert-preview {
  background: #FFFFFF;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  padding: 32px;
  max-width: 600px;
  box-shadow: 0 4px 24px rgba(59,130,246,0.06);
}
.cert-verification-strip {
  margin-top: 24px; padding-top: 16px;
  border-top: 1px solid rgba(0,0,0,0.06);
  display: flex; align-items: center; justify-content: space-between;
}
.cert-id {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px; color: #3B82F6; letter-spacing: 0.04em;
}
```

---

## 14. Order Status Stepper

```css
.stepper { display: flex; align-items: center; }
.step { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; position: relative; }

.step:not(:last-child)::after {
  content: ''; position: absolute;
  top: 14px; left: calc(50% + 14px); right: calc(-50% + 14px);
  height: 1px; background: rgba(0,0,0,0.10);
  transition: background 300ms ease;
}
.step.completed:not(:last-child)::after { background: #3B82F6; }

.step-dot {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; border: 2px solid rgba(0,0,0,0.10);
  background: #fff; transition: all 200ms ease;
}
.step.completed .step-dot {
  background: #3B82F6; border-color: #3B82F6; color: #fff;
  box-shadow: 0 0 0 4px rgba(59,130,246,0.12);
}
.step.active .step-dot {
  border-color: #3B82F6; color: #3B82F6;
  box-shadow: 0 0 0 4px rgba(59,130,246,0.12);
}
.step-label { font-size: 11px; font-weight: 500; color: #9CA3AF; text-align: center; }
.step.active .step-label, .step.completed .step-label { color: #3B82F6; }
```

---

## 15. Motion

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

### Animations

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes blurFade {
  from { opacity: 0; filter: blur(4px); transform: translateY(6px); }
  to   { opacity: 1; filter: blur(0); transform: translateY(0); }
}
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
.skeleton {
  background: linear-gradient(90deg, #F3F4F6 25%, #E9EAEC 50%, #F3F4F6 75%);
  background-size: 600px 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: 4px;
}
.skeleton-text  { height: 14px; border-radius: 4px; }
.skeleton-title { height: 24px; border-radius: 6px; }
.skeleton-pill  { height: 24px; width: 80px; border-radius: 9999px; }
.skeleton-card  { height: 120px; border-radius: 14px; }

/* Bento stagger */
.bento-cell:nth-child(1) { animation: fadeUp 0.35s var(--ease-spring) both 0ms; }
.bento-cell:nth-child(2) { animation: fadeUp 0.35s var(--ease-spring) both 50ms; }
.bento-cell:nth-child(3) { animation: fadeUp 0.35s var(--ease-spring) both 100ms; }
.bento-cell:nth-child(4) { animation: fadeUp 0.35s var(--ease-spring) both 150ms; }
```

### Hero Background

```css
.hero-bg {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 60% 50% at 20% 20%, rgba(186,212,245,0.25) 0%, transparent 60%),
    radial-gradient(ellipse 40% 40% at 80% 80%, rgba(245,198,160,0.15) 0%, transparent 55%);
}
```

### Framer Motion

```tsx
// Section entrance
<motion.div
  initial={{ opacity: 0, y: 10 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
/>

// Bento cell stagger
<motion.div
  initial={{ opacity: 0, y: 8 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ delay: index * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
/>

// Card hover — lift only
<motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }} />

// Button press
<motion.button whileTap={{ scale: 0.98 }} transition={{ duration: 0.1 }} />
```

### Rules

- `viewport={{ once: true }}` on every scroll-triggered animation. Always.
- `whileHover` scale never beyond 1.02.
- `prefers-reduced-motion` respected — wrap all animations.
- Never rotate, never elastic, never parallax on content.

---

## 16. Layout

```css
.grid-12 { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; }
.grid-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.grid-metrics  { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.grid-app      { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }

.hero { padding: 96px 0 80px; max-width: 600px; }
/* Left-aligned. Single soft morning gradient orb. Never centered. */
```

### InstantMed Layout Rules

- **Patient forms:** single column, max-width 480px, min 48px tap targets on all interactive elements.
- **Dashboard sidebar:** 240px, `--surface` bg, `1px solid var(--border)` right border.
- **Order status stepper:** horizontal, 4 steps max visible, progress in `--blue`.
- **Certificate preview:** centered card, max-width 600px.
- **All critical flows must work at 375px viewport.**

---

## 17. Utility Components

### Tooltip

```css
.tooltip {
  position: absolute; z-index: 100;
  padding: 6px 10px; border-radius: 6px;
  font-size: 12px; font-weight: 400; white-space: nowrap;
  pointer-events: none;
  background: #1F2937; color: #F9FAFB;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  animation: fadeUp 150ms var(--ease-spring);
}
```

### Keyboard Shortcut

```css
.kbd {
  display: inline-flex; align-items: center; gap: 2px;
  padding: 2px 6px; border-radius: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; font-weight: 500; line-height: 1.4;
  background: #F3F4F6; color: #374151;
  border: 1px solid #D1D5DB; box-shadow: 0 1px 0 #D1D5DB;
}
```

### Toast

```css
.toast {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-radius: 10px;
  font-size: 14px; min-width: 280px; max-width: 380px;
  background: #FFFFFF; border: 1px solid rgba(0,0,0,0.08);
  color: #1A1A2E; box-shadow: 0 4px 24px rgba(0,0,0,0.10);
  animation: fadeUp 300ms var(--ease-spring);
  position: relative; overflow: hidden;
}
.toast::before {
  content: ''; width: 3px; border-radius: 2px; align-self: stretch; flex-shrink: 0;
}
.toast.success::before { background: #22C55E; }
.toast.error::before   { background: #F87171; }
.toast.info::before    { background: #3B82F6; }
.toast.warning::before { background: #F59E0B; }
.toast-title { font-weight: 500; font-size: 14px; }
.toast-sub   { font-size: 12px; color: var(--muted); margin-top: 2px; }
```

### Dividers

```css
.divider { height: 1px; background: rgba(0,0,0,0.07); }
.divider-fade {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,0,0,0.08) 20%, rgba(0,0,0,0.08) 80%, transparent);
}
.divider-label {
  display: flex; align-items: center; gap: 16px;
  font-size: 12px; font-weight: 500; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--muted2);
}
.divider-label::before, .divider-label::after {
  content: ''; flex: 1; height: 1px; background: rgba(0,0,0,0.07);
}
```

### Empty State

```css
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 64px 24px; text-align: center; gap: 8px;
}
.empty-icon  { width: 40px; height: 40px; opacity: 0.25; margin-bottom: 8px; }
.empty-title { font-size: 15px; font-weight: 500; color: var(--text); }
.empty-sub   { font-size: 13px; color: var(--muted); max-width: 280px; line-height: 1.55; }
```

### Number Formatting

```ts
const formatCount = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n/1_000).toFixed(1)}K` : n.toString();
const formatAUD = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);
const formatPct = (n: number) => `${n.toFixed(1)}%`;
const formatDelta = (n: number) => `${n >= 0 ? '+' : ''}${n}`;
```

### Logo Strip

```css
.logo-strip { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 40px 56px; padding: 48px 0; }
.logo-item  { display: flex; flex-direction: column; align-items: center; gap: 6px; opacity: 0.45; filter: grayscale(1); transition: opacity 200ms ease; }
.logo-item:hover { opacity: 0.70; }
.logo-label { font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #9CA3AF; }
```

---

## 18. Voice & Copy Rules

| Write this | Not this |
|------------|----------|
| "Get a medical certificate in 10 minutes." | "Revolutionising access to healthcare." |
| "A GP reviews your case. You get the cert." | "Our comprehensive platform leverages AI." |
| "Something wrong? We'll sort it." | "Our dedicated support team is here to help!" |
| "No hidden fees. No subscription." | "Transparent, seamless, patient-first care." |

---

## 19. Do / Don't

| Do | Don't |
|----|-------|
| Asymmetric bento — stat + chart + screenshot per row | Identical card grid, uniform heights |
| Frosted glass — sky-toned, subtle | Black glass or glossy |
| Morning gradient — radial, ≤0.25 opacity, hero only | Full gradient page background |
| Left-aligned hero | Centered headline |
| 16px body on patient flows | 14px — too small for anxious patients |
| Sky-toned box-shadow | Black box-shadow anywhere |
| Squircle / rounded corners | Any sharp geometry |
| Source Sans 3 for everything | Inter, Roboto, serif, decorative |
| `scale: 0.98` on press | `scale: 0.95` — too aggressive |
| Product screenshot as bento anchor | Illustration-only grids |
| Dub.co fluid hover — lift + border glow | No interaction on hover |
| Light-mode Dub-style pills | Glowing dark pills (that's Provenance) |
| `viewport={{ once: true }}` always | Animating on every scroll pass |
| 48px min tap target on mobile | Small hit areas on patient forms |
