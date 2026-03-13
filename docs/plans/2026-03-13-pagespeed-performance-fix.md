# PageSpeed Insights Performance Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve mobile PageSpeed score from 36 to 70+ by addressing LCP (11s → &lt;2.5s), FCP (3.4s → &lt;1.8s), TBT (1,500ms → &lt;200ms), and render-blocking resources.

**Architecture:** Prioritise above-the-fold content visibility (LCP element), defer third-party scripts, reduce main-thread work, and optimise critical path. Changes are incremental and measurable via Lighthouse.

**Tech Stack:** Next.js 15, React 19, PostHog, Sentry, Clerk, Framer Motion, Tailwind v4.

---

## Current State (Mobile Lighthouse)

| Metric | Current | Target |
|--------|---------|--------|
| Performance | 36 | 70+ |
| FCP | 3.4s | &lt;1.8s |
| LCP | 11.0s | &lt;2.5s |
| TBT | 1,500ms | &lt;200ms |
| SI | 7.1s | &lt;3.4s |

**Root causes:**
1. **LCP element render delay 3,360ms** — Hero `<motion.p>` starts with `opacity: 0`, waits for JS hydration
2. **Render-blocking CSS** — ~450ms from 3 CSS files (52.7 + 46.4 + 3.1 + 3.3 KiB)
3. **Third-party JS** — PostHog recorder (88 KiB), GTM (135 KiB), Clerk (118 + 85 KiB), Sentry replay
4. **Unused preconnects** — fonts, dicebear, accounts; missing clerk.instantmed.com.au (310ms), Sentry (300ms)
5. **Legacy JS polyfills** — 56 KiB (Array.at, Object.fromEntries, etc.)
6. **Long main-thread tasks** — chunks/8872 (2,368ms), posthog-recorder (380ms)

---

## Phase 1: LCP Critical Path (Biggest Impact)

### Task 1: Make Hero LCP Text Immediately Visible (No JS Delay)

**Files:**
- Modify: `components/marketing/hero.tsx`

**Step 1: Replace motion.p with plain p for LCP element**

The LCP element is the paragraph "Real Australian doctors review every request...". It uses `motion.p` with `initial={{ opacity: 0 }}`, which hides it until Framer Motion hydrates (~3.3s delay).

In `components/marketing/hero.tsx`, replace lines 48–55:

```tsx
{/* Before: motion.p with opacity: 0 */}
<motion.p
  className="text-sm sm:text-base lg:text-lg text-muted-foreground ..."
  initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
  ...
>
  Real Australian doctors review every request...
</motion.p>
```

With a plain `<p>` (no animation):

```tsx
<p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed text-balance">
  Real Australian doctors review every request. No appointments, no video calls — just fill in a quick form and a GP takes care of the rest. Most people are sorted within the hour.
</p>
```

**Step 2: Verify**

Run: `pnpm build && pnpm start`
Open homepage with JS disabled (DevTools → Settings → Disable JavaScript). The LCP paragraph should be visible immediately.

**Step 3: Commit**

```bash
git add components/marketing/hero.tsx
git commit -m "perf(hero): use plain p for LCP text to eliminate 3.3s render delay"
```

---

### Task 2: Reduce Hero Client Bundle — Lazy-Load Framer Motion for Hero

**Files:**
- Modify: `components/marketing/hero.tsx`

**Step 1: Use static markup for above-fold Hero, defer motion**

The LCP element is now server-rendered. For the rest of the Hero:
- Replace `motion.div` / `motion.h1` / `motion.p` with plain `div` / `h1` / `p` for above-fold content (DoctorAvailabilityPill, headline, subtext, price badge, CTAs)
- OR: Use CSS `animation` instead of Framer Motion for simple fade-in (no JS)
- Keep `RotatingText` and `MagneticButton` as client components but ensure they don't block LCP

**Step 2: Lazy-load Framer Motion for below-fold Hero image**

Wrap the hero image `motion.div` in `dynamic(() => import('...'), { ssr: false })` or use `useEffect` to add animation class after mount. Simpler: use CSS `@keyframes` for fade-in on the image container.

**Step 3: Verify**

Run Lighthouse mobile. Target: LCP &lt; 4s.

**Step 4: Commit**

```bash
git add components/marketing/hero.tsx
git commit -m "perf(hero): replace Framer Motion with CSS animations for above-fold content"
```

---

## Phase 2: Third-Party Script Deferral

### Task 3: Disable PostHog Session Replay on Homepage (or Globally)

**Files:**
- Modify: `instrumentation-client.ts` (PostHog init is here; session recording is a PostHog feature)

**Step 1: Disable PostHog session recording**

PostHog loads `posthog-recorder.js` (88 KiB) and `rrweb-record` by default when session replay is enabled in the project. Add to PostHog init:

```ts
posthog.init(posthogKey, {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  person_profiles: "identified_only",
  capture_pageview: false,
  capture_pageleave: true,
  capture_exceptions: true,
  autocapture: true,
  disable_session_recording: true,  // Saves ~88 KiB + main-thread time
  debug: process.env.NODE_ENV === "development",
});
```

**Alternative:** If session replay is required for debugging, use `session_recording: { maskAll: true }` and load it only on error (`replaysOnErrorSampleRate`-style) — but that requires PostHog config. Simplest: `disable_session_recording: true` for now.

**Step 2: Verify**

Run Lighthouse. PostHog recorder should no longer appear in "Reduce unused JavaScript".

**Step 3: Commit**

```bash
git add instrumentation-client.ts
git commit -m "perf(posthog): disable session recording to reduce TBT and JS payload"
```

---

### Task 4: Defer Google Tag Manager Until After LCP

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Change GTM script strategy**

Current: `strategy="afterInteractive"`. Change to `strategy="lazyOnload"` so GTM loads after page is idle.

```tsx
<Script
  src="https://www.googletagmanager.com/gtag/js?id=AW-17795889471"
  strategy="lazyOnload"
/>
<Script id="google-gtag" strategy="lazyOnload">
  {/* ... */}
</Script>
```

**Step 2: Verify**

Lighthouse should show GTM no longer in critical path.

**Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "perf(gtm): defer GTM to lazyOnload to reduce main-thread blocking"
```

---

### Task 5: Reduce Sentry Replay Sample Rate

**Files:**
- Modify: `instrumentation-client.ts`

**Step 1: Lower Sentry replay rates**

Current: `replaysSessionSampleRate: 0.1`, `replaysOnErrorSampleRate: 1.0`. Reduce session sampling:

```ts
replaysSessionSampleRate: 0.01,  // 1% of sessions
replaysOnErrorSampleRate: 0.5,   // 50% on error (still captures most errors)
```

**Step 2: Verify**

Sentry replay bundle should load less frequently.

**Step 3: Commit**

```bash
git add instrumentation-client.ts
git commit -m "perf(sentry): reduce replay sample rates to lower TBT"
```

---

## Phase 3: Preconnects and Critical Path

### Task 6: Fix Preconnect Hints

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Add high-value preconnects**

Add before `</head>`:

```tsx
<link rel="preconnect" href="https://clerk.instantmed.com.au" />
<link rel="preconnect" href="https://o4510623218860032.ingest.us.sentry.io" />
```

**Step 2: Remove or conditionally apply unused preconnects**

- `fonts.googleapis.com` / `fonts.gstatic.com` — if using `next/font` (Source_Sans_3), fonts are self-hosted; remove these preconnects.
- `api.dicebear.com` — only used in avatar components (patient/doctor dashboards). Remove from root layout; add to dashboard layouts if needed.
- `accounts.instantmed.com.au` — Clerk uses `clerk.instantmed.com.au` for auth. Use `clerk.instantmed.com.au` for preconnect (already added). Remove `accounts.instantmed.com.au` if it's not the primary Clerk domain.

**Step 3: Verify**

Run Lighthouse. "Preconnect candidates" should show clerk and Sentry with savings. "Unused preconnect" should be gone.

**Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "perf(preconnect): add clerk/sentry, remove unused font/dicebear preconnects"
```

---

## Phase 4: CSS and Build Optimisation

### Task 7: Inline Critical CSS for Above-the-Fold (Optional — Higher Effort)

**Files:**
- Modify: `next.config.mjs`
- Investigate: `@next/third-parties` or manual critical CSS extraction

**Step 1: Evaluate**

Lighthouse reports ~450ms from render-blocking CSS. Next.js 15 already does CSS code-splitting. Options:
- Use `next/script` with `strategy="lazyOnload"` for non-critical stylesheets (complex)
- Ensure Tailwind purges unused styles (already default)
- Use `experimental.optimizeCss` if available (Next.js 15)

**Step 2: If minimal gain, skip**

Document as "Future: consider critical CSS extractor" and move on.

---

### Task 8: Add Browserslist for Modern Browsers (Reduce Legacy Polyfills)

**Files:**
- Create: `package.json` (add `browserslist` field) or `.browserslistrc`

**Step 1: Add browserslist**

In `package.json`:

```json
"browserslist": [
  "last 2 Chrome versions",
  "last 2 Firefox versions",
  "last 2 Safari versions",
  "last 2 Edge versions"
]
```

Or `.browserslistrc`:

```
last 2 Chrome versions
last 2 Firefox versions
last 2 Safari versions
last 2 Edge versions
```

**Step 2: Rebuild and verify**

Run: `pnpm build`
Check bundle size. Legacy JS audit should show fewer polyfills.

**Step 3: Commit**

```bash
git add package.json
git commit -m "perf(build): target modern browsers to reduce polyfill overhead"
```

---

## Phase 5: Images and Caching

### Task 9: Optimise Wordmark Image

**Files:**
- Modify: Component using `wordmark.png` (likely `Navbar` or `BrandLogo`)
- Check: `public/branding/wordmark.png`

**Step 1: Increase compression**

Lighthouse: "Increasing the image compression factor could improve this image's download size" (6.8 KiB savings per instance).

- Use Next.js Image with `quality={65}` or `quality={60}` for the wordmark
- Or precompress: `public/branding/wordmark.png` with higher compression (e.g. `pngquant`)

**Step 2: Add `fetchPriority="high"` for LCP image**

If the wordmark is in the hero/navbar and above fold, ensure it has `priority` or `fetchPriority="high"`.

**Step 3: Commit**

```bash
git add [affected files]
git commit -m "perf(images): optimise wordmark compression and fetch priority"
```

---

### Task 10: PostHog Static Asset Caching (Vercel Config)

**Files:**
- Modify: `next.config.mjs` headers

**Step 1: Add cache headers for PostHog proxy**

The rewrites `/ingest/static/:path*` serve PostHog assets. Add headers to cache them longer:

```js
{
  source: "/ingest/static/:path*",
  headers: [
    { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=3600" },
  ],
},
```

Note: This may require a separate `headers` entry. The rewrites don't support headers directly; use `headers()` in `next.config.mjs` with a matching source. Check Next.js docs for `rewrites` + `headers` interaction.

**Step 2: If not supported, skip**

PostHog assets are third-party; cache headers may not apply to rewrites. Document as "Future: CDN caching for /ingest".

---

## Phase 6: CSP and Accessibility (Quick Wins)

### Task 11: Fix CSP for Google Ads (Optional)

**Files:**
- Modify: `next.config.mjs`

**Step 1: Add pagead2.googlesyndication.com if needed**

Lighthouse reports: "Connecting to 'https://pagead2.googlesyndication.com/ccm/collect?...' violates CSP". If Google Ads conversion tracking is required, add:

```
connect-src ... https://pagead2.googlesyndication.com
img-src ... https://pagead2.googlesyndication.com
```

**Step 2: Verify**

Console errors for CSP should disappear.

**Step 3: Commit**

```bash
git add next.config.mjs
git commit -m "fix(csp): allow pagead2.googlesyndication.com for Google Ads"
```

---

### Task 12: Fix Accessibility Contrast and Heading Order (Passing Audit)

**Files:**
- Modify: Components with failing contrast (see Lighthouse "Failing Elements")
- Modify: `components/marketing/` or similar for heading order

**Step 1: Contrast**

Lighthouse lists: "Get your medical certificate", "Start a request", "Too sick to see a doctor in person?", etc. Fix by:
- Ensuring `text-primary` on `bg-primary` meets 4.5:1 contrast
- Darkening `text-muted-foreground` where it fails

**Step 2: Heading order**

"Healthcare on your schedule" is `<h3>`, "SERVICES" is `<h4>` — ensure no `<h2>` is skipped. Add `<h2>` or reorder headings.

**Step 3: Commit**

```bash
git add [affected files]
git commit -m "a11y: fix contrast and heading order for Lighthouse"
```

---

## Verification Checklist

After all tasks:

1. Run Lighthouse mobile (Slow 4G, Moto G Power): Performance ≥ 70
2. Run Lighthouse desktop: Performance ≥ 90
3. LCP &lt; 2.5s

---

## Execution Handoff

**Plan complete and saved to `docs/plans/2026-03-13-pagespeed-performance-fix.md`.**

**Two execution options:**

1. **Subagent-Driven (this session)** — I dispatch fresh subagent per task, review between tasks, fast iteration
2. **Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
