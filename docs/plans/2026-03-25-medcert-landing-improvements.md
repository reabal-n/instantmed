# Med Cert Landing Page — Exit Intent, Hero Animation, Page Speed

> **Date:** 2026-03-25

## 1. Exit-Intent Popup + Redundancy Fix

### Redundancy Fix

Two sticky CTAs compete on `/medical-certificate`:
- Global `StickyCTABar` (root layout via `LazyOverlays`) — `z-40`, `md:hidden`
- Inline sticky CTA in `med-cert-landing.tsx` — `z-50`, `lg:hidden`

**Fix:** Exclude `/medical-certificate` from the global `StickyCTABar`. The inline version is better tailored (IntersectionObserver-based, page-specific copy).

### Exit-Intent Overlay

New component: `components/marketing/exit-intent-overlay.tsx`

- **Trigger:** Desktop only. `mouseleave` on `documentElement` when `clientY < 0`.
- **Guards:** Once per session (`sessionStorage`). 10s arming delay. Doesn't fire on `/request` paths.
- **Content:** Centered modal — headline, 3 reassurance bullets, price anchor, CTA, dismiss.
- **UI:** shadcn `Dialog`, solid depth card, Framer Motion fade+scale. Respects `useReducedMotion`.
- **Scope:** Rendered inside `med-cert-landing.tsx` only.
- **Loading:** `next/dynamic` with `ssr: false`.

## 2. Hero Mockup Sequential Animation

Timeline card steps stagger in sequentially using `variants` + `staggerChildren: 0.2`:
- Timeline card enters at delay 0.6 (unchanged)
- Steps appear one by one: submitted → reviewed → sent
- Reduced motion: all visible immediately

## 3. Page Speed

- Lazy-load `TestimonialsSection` and `CertificateShowcaseMockup` via `next/dynamic`
- Lazy-load `ExitIntentOverlay` via `next/dynamic` with `ssr: false`
- Suppress global `StickyCTABar` on `/medical-certificate`
