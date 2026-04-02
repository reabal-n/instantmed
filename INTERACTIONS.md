# INTERACTIONS.md — InstantMed

> Motion, animation, and UI state interactions. Load alongside DESIGN_SYSTEM.md for any UI/frontend work.

> **Scope:** Everything dynamic — how elements move, respond, transition, and communicate state. Static visual design (colors, typography, spacing, components) lives in DESIGN_SYSTEM.md.

> **Core rule:** Marketing pages and patient flows only. Never portals. See The Portal Rule below.

---

## Motion

**Canonical source:** `lib/motion.ts` — all timing, easing, and variant tokens live here. Import from this file, not hardcoded values.

**Two easing curves. Use the right one:**
- `easing.out` / `[0, 0, 0.2, 1]` — entrances, page loads, elements appearing. Primary curve.
- `easing.panel` / `[0.16, 1, 0.3, 1]` — panels, drawers, sheets. Confident arrival feel.

```ts
// lib/motion.ts — the only easing values you should use
import { easing, duration, transition, spring, fadeUp, stagger } from '@/lib/motion'

easing.out     // [0, 0, 0.2, 1]     — PRIMARY for most entrances
easing.panel   // [0.16, 1, 0.3, 1]  — panels, drawers, confident arrivals
easing.inOut   // [0.42, 0, 0.58, 1] — fallback only
```

**Note:** No CSS custom properties for easing exist. For CSS transitions, use `ease-out` keyword or inline the cubic-bezier.

**Widely used but not tokenized:** `[0.25, 0.1, 0.25, 1]` (the CSS standard `ease` curve) appears in 15+ section/marketing components and `PageTransitionProvider`. It's not exported from `lib/motion.ts` — components import it inline. If you're building a new section component and see this curve in adjacent code, it's intentional.

### Durations

All durations collapse to ~200ms for snappy, responsive feel. The token file is the authority:

| Token | Value | Use |
|-------|-------|-----|
| `duration.fast` | 200ms | Button states, badge changes, icon scale |
| `duration.normal` | 200ms | Standard smooth — most things |
| `duration.slow` | 220ms | Generous, reassuring — complex motions |
| `duration.slower` | 250ms | Final fallback for elaborate entrances |
| `duration.page` | 200ms | Page transitions |

Ad-hoc durations (400ms, 500ms) may appear in hero/marketing components but are not tokenized.

No bounce. No elastic. No parallax on content. Patients don't need theatrics.

**Scale limits:**
- **Interactive (hover/press):** Icons max `1.1x`. Elements max `1.02x`. Press: `scale: 0.98`.
- **Non-interactive (loaders, background blobs):** No hard limit — decorative only.

### Framer Motion Patterns

Prefer `lib/motion.ts` variants (`fadeUp`, `stagger`) over inline values. The canonical entrance is `fadeUp` (opacity 0→1, y 16→0).

```tsx
import { fadeUp, stagger, spring, easing } from '@/lib/motion'

// Section entrance — use the fadeUp variant directly
<motion.div variants={fadeUp} initial="initial" whileInView="animate" viewport={{ once: true }} />

// Staggered children — container + item system
<motion.div variants={stagger.container} initial="initial" whileInView="animate" viewport={{ once: true }}>
  {items.map(item => (
    <motion.div key={item.id} variants={stagger.item} />
  ))}
</motion.div>

// Card hover — subtle lift (0.5 = 2px, not 2 = 8px)
className="hover:-translate-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"

// Button press depth
<motion.button whileTap={{ scale: 0.97 }} transition={spring.snappy} />

// Icon spring on hover (inside a parent group)
// Parent: className="group"
// Icon:   className="transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
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

// PREFERRED: empty object disables animation cleanly
initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}

// ALSO VALID: initial={false} means "start at animate state, skip entrance"
// Framer Motion accepts this on motion.div — useful for AnimatePresence children
// that shouldn't animate on first mount. Use {} for reduced motion though.
```

### Rules

- `viewport={{ once: true }}` on every scroll-triggered animation. Always.
- `whileHover` icon scale max `1.1x`. Element scale max `1.02x`.
- Never rotate, never elastic, never parallax on content.
- Panel curve (`[0.16, 1, 0.3, 1]`) for drawers/sheets. Primary ease-out (`[0, 0, 0.2, 1]`) for everything else. Import from `lib/motion.ts`.

---

## Premium Interactions — Design Spec

> **Status: largely aspirational.** The patterns below are a design target, not a description of current implementation. Most Tier 1 and Tier 2 patterns are not yet built. Tier 3 is partially implemented. Implement selectively per-page when the ROI justifies it — never globally. Every pattern must pass the performance budget (see below) before shipping.

> Aliveness is not more animation. It's the right motion at the wrong level of perception — movement you feel before you consciously see it. Stay as close to the sub-perceptual threshold as possible without crossing it. Marketing pages and patient flows only. **Never portals.**

### The Three Tiers

**Tier 1 — Always on, fully ambient.** Never stops. Never reacts to user input. Environmental — forgotten during use, noticed only in absence. *(Mostly unimplemented — mesh gradient drift exists; hero float and cursor glow are not yet built.)*

**Tier 2 — Presence-aware.** Responds to the user being near, not touching. *(Not implemented — wake radius, gradient warmth, staggered wake are spec only.)*

**Tier 3 — Interaction-triggered.** Responds to hover, click, focus, scroll entry. *(Partially implemented — card lift, button press, icon spring, stagger rise exist. Button halo, link underline slide, magnetic CTA, shadow memory are not yet built.)*

Most implementations only build Tier 3. Aliveness comes from all three being right.

---

### Physics & Easing

**Tween-based, NOT spring physics.** `lib/motion.ts` explicitly avoids Framer Motion spring configs. All transitions use duration + easing.

```ts
// lib/motion.ts — actual presets
spring.snappy  // { duration: 0.15, ease: 'easeOut' } — icons, badges, small elements
spring.smooth  // { duration: 0.2, ease: 'easeOut' }  — cards, containers, panels
easing.out     // [0, 0, 0.2, 1]                      — primary curve
easing.panel   // [0.16, 1, 0.3, 1]                   — drawers, sheets, confident arrivals
```

No CSS custom properties exist for easing. For CSS transitions use inline cubic-bezier or the `ease-out` keyword.

**Asymmetric timing.** Enter slower than exit. If an element enters over 200ms, it exits in 100ms or less.

**Asynchrony.** Never have two ambient elements loop in perfect sync. Apply on mount:

```js
element.style.animationDelay    = `${Math.random() * -8}s`
element.style.animationDuration = `${5 + Math.random() * 1.5}s`
```

**Breathing curve.** For organic oscillations: `cubic-bezier(0.45, 0.05, 0.55, 0.95)` at 5–8s duration. The pause at each extreme is the biological detail.

**Interaction budget per state:**
- Resting: 1 active animation maximum
- Hover: 2 transitioning properties simultaneously
- Pressed: 1

---

### Shadows & Material

**Tinted shadows everywhere.** All `box-shadow` uses brand primary at 4–8% opacity — never black/grey.

```css
/* Resting */
box-shadow: 0 1px 3px hsl(var(--primary) / 0.06), 0 8px 32px hsl(var(--primary) / 0.08);
/* Hover (deepened) */
box-shadow: 0 2px 6px hsl(var(--primary) / 0.08), 0 16px 48px hsl(var(--primary) / 0.12);
```

**Inner top highlight.** `inset 0 1px 0 rgba(255,255,255,0.8)` on all cards and buttons. Makes surfaces feel physical with a slight bevel.

**Button press highlight flip.** On `:active`, flip the light direction:
- Resting: `inset 0 1px 0 rgba(255,255,255,0.25)` (lit from top)
- Pressed: `inset 0 -1px 0 rgba(0,0,0,0.15)` (shadowed from bottom)

**Noise/grain on gradients.** 2–4% opacity SVG noise filter over hero backgrounds. Never on cards or UI surfaces.

**Surface hierarchy:**
- Content cards: always solid white (`bg-white dark:bg-card`) — never glass
- Floating UI (dropdowns, tooltips, command palette, toasts): `backdrop-filter: blur(12px)` + `bg-white/75` + `border border-white/50`

---

### Tier 1 — Ambient Aliveness

**Three ambient elements per marketing page — no more:**

1. **Background gradient drift.** Hero mesh or gradient drifts its stop positions. 20–30s cycle, `--ease-sine`. Small enough that if asked "is this animating?" many users would pause before answering.

2. **Hero float.** Primary hero visual: `translateY(0 → -8px → 0)`, 5s, `--ease-sine`, infinite. Amplitude strictly 6–10px. Period (5s) must be non-harmonic with the drift period (20–30s) — they should never peak simultaneously.

3. **Ambient cursor glow.** Hero sections only. 200–300px radial gradient, primary at 0.03–0.06 opacity, 0.06 lag multiplier on cursor position. Below all content in z-index. Cursor position only — never scroll. When cursor stops: glow expands (+20% radius) and fades over 2s. When cursor moves: snaps back.

**Sub-perceptual threshold — stay within these ranges:**

| Property | Range | Duration |
|---|---|---|
| Scale | 0.998 → 1.004 | 5–8s |
| Opacity | ±0.025 | 6–10s |
| translateY | ±3px | 5–8s |
| Shadow spread | ±2px | 5–8s |
| Gradient position | ±4% | 20–30s |
| Border opacity | ±8% | 4–6s |

---

### Tier 2 — Presence-Aware

**The wake radius.** `mousemove` on section container. Calculate cursor distance to each key element center. Apply CSS custom property intensity: 120px = 0%, 0px = 100%. Within the zone, before hover: shadow deepens slightly, halo brightens, border opacity increases from 40% to 55%.

**Gradient warmth response.** Hero gradient shifts color temperature ±5% hue rotation based on cursor X position. Sub-perceptual — felt, not seen.

**Staggered wake on scroll entry.** After stagger-rise completes, each element's shadow briefly intensifies (1.2× spread) and settles over 600ms. Like taking a breath after being stationary.

---

### Tier 3 — Hover & Cursor

**Card lift.**
```tsx
// translateY(-2px) + shadow deepen + border brighten — all one unit
className="hover:-translate-y-0.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
           hover:shadow-[0_2px_6px_hsl(var(--primary)/0.08),0_16px_48px_hsl(var(--primary)/0.12)]
           hover:border-border/70"
```

**Button halo.** Behind primary CTA only (`z-index: -1`):
```css
.btn-primary::before {
  content: '';
  position: absolute;
  inset: -50%;
  background: radial-gradient(closest-side, hsl(var(--primary) / 0.25), transparent);
  border-radius: 50%;
  z-index: -1;
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}
.btn-primary:hover::before { transform: scale(1.2); }
```

**Button breath at rest.** Primary CTAs only: `scale(1 → 1.008 → 1)`, 4s, `--ease-sine`, infinite. On hover, oscillation stops — button holds perfectly still. Stillness on hover reads as readiness.

**Button press depth.**
```tsx
<motion.button
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.1 }}
  className="active:shadow-[0_1px_2px_hsl(var(--primary)/0.15)]"
/>
// Also flip inner highlight direction on :active (see Shadows & Material above)
```

**Icon spring.** Scale to 1.1× on hover using `--ease-spring-fast`. Hard cap at 1.1×.
```tsx
<Icon className="transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110" />
```

**Link underline slide.** Enter from left, exit from right:
```css
.link-slide {
  position: relative;
  text-decoration: none;
}
.link-slide::after {
  content: '';
  position: absolute;
  bottom: -1px; left: 0;
  width: 100%; height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
}
.link-slide:hover::after { transform: scaleX(1); }
.link-slide::after:not(:hover) { transform-origin: right; }
```

**Letter-spacing on nav and display text.** `letter-spacing` increases by `0.02em` on hover. 200ms, `--ease-standard`.

**Variable font weight.** Hover of display headings (40px+): `font-weight` animates up one step. Variable fonts only.

**Zero-delay color shifts.** Status badges, toggle states, active nav: `transition-duration: 0ms`.

**Magnetic CTA.** One per page — primary hero action only. 80px proximity radius, max 8px displacement. `mousemove` on parent container.

**Cursor-responsive gradient.** Hero backgrounds only. 0.05–0.08 displacement multiplier, lagged. Full cursor travel shifts stops ~80px maximum.

**Shadow memory.** Cards fade their hover shadow back to resting over 2–3s after cursor leaves. The card remembers being touched.

---

### Scroll & Reveal

**Stagger rise.** Default scroll-entry for lists, grids, card groups. Use `stagger.container` + `stagger.item` from `lib/motion.ts`:
```tsx
<motion.div variants={stagger.container} initial="initial" whileInView="animate" viewport={{ once: true }}>
  {items.map(item => <motion.div key={item.id} variants={stagger.item} />)}
</motion.div>
```
Hard cap: 8 items per stagger group.

**Emergence.** For hero and feature sections — elements resolve into focus:
```tsx
initial={{ opacity: 0, filter: 'blur(8px)', scale: 0.98 }}
animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
// Add will-change: filter. Test on throttled CPU. @supports fallback: opacity + scale only.
```

**Product fly-in.** UI screenshots and product imagery: `translateY(40px → 0)` + `opacity(0 → 1)`, `--ease-expo`, 60ms stagger, IntersectionObserver at 15%.

**Editorial text reveal.** Display headings only (40px+). Each line wrapped in `overflow: hidden`. Text translates `100% → 0` on scroll entry, 60ms stagger per line. Never on body copy.

**Scroll storytelling.** Sticky panel + scrolling text column. Each text block triggers 200ms crossfade in the panel via IntersectionObserver.

**Trend/data draw.** `stroke-dashoffset` full-length → 0 on mount or scroll entry. 600ms, `--ease-sine`. Always left to right.

**Metric count-up.** 0 → value, spring easing, 1–2% overshoot. Never on currency or clinical values.

**Scroll velocity parallax.** Track velocity per frame, apply multiplier to parallax elements, decay with spring.

**Hero content fade.** Hero content fades `opacity: 1 → 0.6` over first 200px of scroll. Not a translate — a soft fade communicating "leaving this section."

---

### Scroll & Momentum

- `scroll-behavior: smooth` on html element for anchor navigation
- `overscroll-behavior: none` on modals/panels; `overscroll-behavior: contain` on all overflow containers
- `-webkit-overflow-scrolling: touch` on scrollable containers for iOS momentum
- `scroll-snap-type: y mandatory` only for intentionally paginated layouts — never force-snap a standard page

---

### Page & State Transitions

**Route transitions.** `PageTransitionProvider` uses opacity + subtle translateY (6px enter, -4px exit), 250ms, ease `[0.25, 0.1, 0.25, 1]`. Kept minimal — no dramatic slides.

**Modal entrance.** `scale(0.95 → 1)` + `opacity(0 → 1)`, spring. Exit: opacity only, 80ms.

**Command palette.** `scale(0.95 → 1)`, stiffness 500+, 100ms max. Exit: 60ms opacity.

**Tab indicator.** One element repositioned across a shared track, spring. Never per-tab show/hide.

**Number transition.** Old value exits upward (`translateY: -100%`, fade), new enters from below (`translateY: 100% → 0`, fade in). 200ms.

**Shimmer skeleton.** Gradient sweep left to right, 30% element width, soft edges, 1.5s repeat.

**Status stream.** All items present, revealed with 8ms stagger. Not typewriter.

---

## UI States

### Form & Input

**Input focus glow.**
```tsx
className="focus:outline-none focus:border-primary
           focus:ring-2 focus:ring-primary/15
           focus:shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]
           transition-shadow duration-150"
```

**Focus ring (keyboard nav).**
```css
:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 3px;
  box-shadow: 0 0 0 4px hsl(var(--primary) / 0.15);
}
```
Never `outline: none` without a replacement.

**Error shake.**
```tsx
<motion.div
  animate={hasError ? { x: [0, -8, 5, -5, 3, 0] } : {}}
  transition={{ duration: 0.4, ease: 'easeInOut' }}
/>
// Simultaneously: border → destructive, background tint → destructive/5
```

**Optimistic UI.** Update UI immediately on action. On failure: animate revert (number slot in reverse) + error shake. Apply to soft writes (toggles, saves). Conservative for hard writes (payments, deletions, submissions).

### Loading & Feedback Sequence

```
1. Trigger → button scale 0.98 + shimmer begins
2. In-flight → shimmer continues, button holds
3. Success → shimmer stops, success spring, button returns
4. Failure → shake, error color, button returns
```

**Submit loading.** Shimmer sweep across button background. Never a spinner inside the button.

**Success spring.** Checkmark scales 0 → 1, spring. One ring pulse (scale 1 → 1.3, opacity 0.6 → 0, 600ms). One pulse only.

**Status pulse.** Ring scale 1 → 1.4, opacity 0.6 → 0, 2s loop. If a user consciously notices it, it's too prominent.

---

## Lottie Animations

Use `LottieAnimation` from `@/components/ui/lottie-animation` for empty states, success, error, and loading feedback.

Available animations: `confetti`, `empty-state`, `error`, `loading-files`, `loading`, `notification`, `success`.

```tsx
<LottieAnimation name="empty-state" size={100} loop={false} />
```

Respects `useReducedMotion`. Lazy-loads `lottie-web`. Use `loop={false}` for one-time feedback (success, error), `loop={true}` for ongoing states (loading).

---

## Dark Mode Interaction Rules

Depth and light reverse in dark mode. Adjust accordingly:

- **Shadows invisible on dark.** Replace two-layer shadow with: `border: 1px solid rgba(255,255,255,0.12)` + `inset 0 1px 0 rgba(255,255,255,0.06)`. Depth through border contrast, not shadow.
- **Glows intensify.** Button halo opacity: 0.12–0.18. Cursor glow opacity: 0.06–0.10.
- **Card lift on dark.** Lean into inner highlight + border brighten on hover. Card brightens — doesn't deepen.
- **Noise reduces.** 1–2% opacity in dark mode vs 2–4% in light.
- **Glass on dark.** `backdrop-filter: blur(12px)` + `background: rgba(15,20,30,0.75)` + `border: 1px solid rgba(255,255,255,0.1)`.
- **Button halo on dark.** Mix hue toward white — `hsl(var(--primary) / 0.2)` with slight lightness increase to prevent muddy appearance.

---

## Performance Budget

**Composite-only — always safe:** `transform` (translate, scale, rotate), `opacity`. These animate on the GPU compositor and never trigger layout or paint.

**Expensive — use carefully:** `filter: blur()`, `backdrop-filter`, `box-shadow` during animation, `clip-path` during animation. Always add `will-change: filter` before blur animations. Test on throttled hardware.

**Never animate:** `width`, `height`, `top`, `left`, `margin`, `padding`, `font-size`. Full layout recalculation.

**`will-change` rules:** Declare immediately before animation, remove after. Never on more than 6–8 elements simultaneously.

**Emergence fallback:**
```css
@supports not (filter: blur(1px)) {
  .emerge { opacity: 0; transform: scale(0.98); }
  .emerge.visible { opacity: 1; transform: scale(1); }
}
```

**Frame budget.** 60fps = 16ms per frame. If any animation causes frame time to exceed 12ms on a mid-range device on 4× CPU throttle in DevTools, it ships without that animation.

---

## The Portal Rule

None of the above applies inside `app/doctor/`, `app/admin/`, or authenticated patient portal views.

In utility interfaces: zero ambient motion, zero cursor effects, zero scroll animations. Hover: color-only. Focus: standard ring. Transitions: opacity at 100ms max.

---

## Reduced Motion (Full Rules)

All Tier 1 and Tier 2 animations fully disabled under `prefers-reduced-motion`. Preferred pattern: `initial={prefersReducedMotion ? {} : { ... }}`. `initial={false}` is also valid — it means "start at animate state, skip entrance" (used in `AnimatePresence` children and 7+ components). Tier 3 feedback (color shifts, hover states, focus rings) remains. Remove timing and transforms, keep the endpoint state.

---

## Anti-Patterns

- Stagger beyond 8 items
- Magnetic pull on more than one element per page
- Glass on content cards
- Ambient motion in portals
- Repeat pulses on success states
- Scale beyond 1.1× on hover
- Animations longer than 500ms that aren't hero/marketing
- Typewriter text — use stagger reveal
- Black/grey shadows on marketing surfaces — use tinted
- `will-change` on more than 8 elements simultaneously
- `filter: blur()` without performance testing and `@supports` fallback
- Animating layout properties (`width`, `height`, `top`, `left`)
- `outline: none` without a replacement focus state
- Spring physics (stiffness/damping) in transitions — use tween presets from `lib/motion.ts`. Exception: `useSpring` for continuous mouse-tracking (e.g. `PerspectiveTiltCard`)
- Hardcoded easing values — import from `lib/motion.ts` (exception: `[0.25, 0.1, 0.25, 1]` standard ease curve used inline in section components)
