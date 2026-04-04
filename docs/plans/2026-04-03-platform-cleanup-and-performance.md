# Platform Cleanup & Performance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up repo file hygiene, consolidate routes, optimize public assets, and add performance wins — without touching `proxy.ts` (the Next.js middleware).

**Architecture:** Six sequential phases, lowest-risk first. Each phase is independently deployable. Phases 1–3 are zero-risk deletions and asset work. Phases 4–6 touch routing and code.

**Tech Stack:** Next.js 16 App Router, Tailwind v4, SVGO (new devDep), pnpm, Vercel, Clerk (`proxy.ts` is the middleware — do NOT delete or rename it).

**⚠️ Critical: Never touch `proxy.ts`** — it is the Next.js Clerk middleware powering all auth routing. It is not a temp file.

---

## Phase 1 — Root & Git Hygiene

> Zero risk. Pure deletion and .gitignore. No app code changes.

### Task 1.1: Delete root-level screenshot PNGs

These are Playwright MCP debug screenshots. Already gitignored via `*.png` rule but physically on disk.

**Files to delete:**
```
about-desktop.png
about-mobile.png
homepage-desktop-full.png
homepage-desktop.png
homepage-mobile-full.png
homepage-mobile.png
how-it-works-desktop.png
how-it-works-mobile.png
medcert-desktop.png
medcert-mobile.png
our-doctors-desktop.png
prescriptions-desktop.png
prescriptions-mobile.png
pricing-desktop.png
pricing-mobile.png
request-flow-desktop.png
request-flow-step1.png
reviews-desktop.png
reviews-mobile.png
trust-cta.png
trust-dark-hero.png
trust-dark-pillars.png
trust-desktop.png
trust-faq.png
trust-full-page.png
trust-hero.png
trust-mobile-full.png
trust-mobile.png
trust-page-final.png
trust-page-redesign-full.png
trust-pillar1-card.png
trust-pillar1.png
trust-pillars.png
trust-testimonials.png
trust-timeline.png
```

**Step 1:** Run from repo root:
```bash
cd /Users/rey/Desktop/instantmed
rm -f about-desktop.png about-mobile.png homepage-desktop-full.png homepage-desktop.png \
  homepage-mobile-full.png homepage-mobile.png how-it-works-desktop.png how-it-works-mobile.png \
  medcert-desktop.png medcert-mobile.png our-doctors-desktop.png prescriptions-desktop.png \
  prescriptions-mobile.png pricing-desktop.png pricing-mobile.png request-flow-desktop.png \
  request-flow-step1.png reviews-desktop.png reviews-mobile.png trust-cta.png trust-dark-hero.png \
  trust-dark-pillars.png trust-desktop.png trust-faq.png trust-full-page.png trust-hero.png \
  trust-mobile-full.png trust-mobile.png trust-page-final.png trust-page-redesign-full.png \
  trust-pillar1-card.png trust-pillar1.png trust-pillars.png trust-testimonials.png trust-timeline.png
```

**Step 2:** Verify root is clean:
```bash
ls *.png 2>/dev/null && echo "ERROR: PNGs remain" || echo "OK"
```
Expected: `OK`

**Step 3:** Commit:
```bash
git add -A
git commit -m "chore: delete root-level debug screenshots"
```

---

### Task 1.2: Delete `lighthouse-report.json` and add to .gitignore

**Files:**
- Delete: `lighthouse-report.json` (1.1MB, 19k lines, not gitignored)
- Modify: `.gitignore`

**Step 1:** Delete and update gitignore:
```bash
rm lighthouse-report.json
```

**Step 2:** Add to `.gitignore` — open `.gitignore` and append after the `*.tsbuildinfo` line:
```
# Lighthouse / audit reports
lighthouse-report.json
lighthouse-report*.json
```

**Step 3:** Verify:
```bash
ls lighthouse-report.json 2>/dev/null && echo "ERROR: file remains" || echo "OK"
```

**Step 4:** Commit:
```bash
git add .gitignore
git commit -m "chore: delete lighthouse report, add to gitignore"
```

---

### Task 1.3: Delete all empty directories

**Step 1:** Delete empty component stubs and macOS duplicate artifacts:
```bash
cd /Users/rey/Desktop/instantmed

# Empty component dirs (were placeholders, never populated)
rmdir components/error components/form components/medication components/questionnaire components/security

# Empty root dirs
rmdir data

# macOS " 2" copy artifacts in app/medical-certificates/
rmdir "app/medical-certificates/carers 2"
rmdir "app/medical-certificates/employer-acceptance 2"
rmdir "app/medical-certificates/study 2"
rmdir "app/medical-certificates/work 2"

# Empty coverage artifacts
rmdir "coverage/clinical 2" "coverage/security 2" 2>/dev/null || true

# Windsurf empty plans dir
rmdir .windsurf/plans 2>/dev/null || true
```

**Step 2:** Verify no empty component dirs remain:
```bash
for d in components/error components/form components/medication components/questionnaire components/security data; do
  [ -d "$d" ] && echo "ERROR: $d still exists" || echo "OK: $d gone"
done
```

**Step 3:** Commit:
```bash
git add -A
git commit -m "chore: delete empty placeholder directories and macOS duplicate artifacts"
```

---

## Phase 2 — Public Asset Cleanup

> Low risk. File moves + one reference update + redirect safety net.

### Task 2.1: Delete unused branding SVGs

`public/branding/logo.svg` (2.3MB) and `public/branding/wordmark.svg` (500KB) are NOT used by the app — `brand-logo.tsx` uses `logo.png` and `wordmark.png` exclusively. The SVGs contain base64-encoded PNG data inside SVG wrappers — not real vectors.

**Step 1:** Verify they're truly unused:
```bash
grep -r "branding/logo.svg\|branding/wordmark.svg" app/ components/ lib/ --include="*.tsx" --include="*.ts" --include="*.css" --include="*.mjs"
```
Expected: no output.

**Step 2:** Delete:
```bash
rm public/branding/logo.svg public/branding/wordmark.svg
```

**Step 3:** Commit:
```bash
git add -A
git commit -m "chore: delete unused 2.3MB logo.svg and 500KB wordmark.svg (base64 PNG-in-SVG artifacts)"
```

---

### Task 2.2: Move portrait JPGs from `/public/*.jpg` → `/public/images/people/`

13 testimonial/headshot JPGs are dumped at the public root. Only referenced in `lib/blog/articles/legacy-posts.ts`.

**Files to move:**
```
public/asian-australian-woman-professional-headshot-smili.jpg
public/asian-woman-professional-headshot-warm-smile.jpg
public/female-doctor-professional-headshot-warm-smile-aus.jpg
public/indian-australian-woman-professional-headshot-smil.jpg
public/middle-aged-australian-man-kind-face-professional-.jpg
public/middle-aged-australian-man-with-glasses-friendly-p.jpg
public/prescription-medication-pharmacy.jpg
public/professional-businesswoman-australian-headshot-con.jpg
public/young-australian-man-creative-professional-headsho.jpg
public/young-australian-man-with-beard-casual-friendly-he.jpg
public/young-australian-woman-red-hair-professional-heads.jpg
public/young-australian-woman-with-blonde-hair-smiling-pr.jpg
public/young-university-student-male-casual-headshot-frie.jpg
```

**Step 1:** Create directory and move:
```bash
mkdir -p public/images/people
mv public/asian-australian-woman-professional-headshot-smili.jpg public/images/people/
mv public/asian-woman-professional-headshot-warm-smile.jpg public/images/people/
mv public/female-doctor-professional-headshot-warm-smile-aus.jpg public/images/people/
mv public/indian-australian-woman-professional-headshot-smil.jpg public/images/people/
mv "public/middle-aged-australian-man-kind-face-professional-.jpg" public/images/people/
mv public/middle-aged-australian-man-with-glasses-friendly-p.jpg public/images/people/
mv public/prescription-medication-pharmacy.jpg public/images/people/
mv public/professional-businesswoman-australian-headshot-con.jpg public/images/people/
mv "public/young-australian-man-creative-professional-headsho.jpg" public/images/people/
mv public/young-australian-man-with-beard-casual-friendly-he.jpg public/images/people/
mv "public/young-australian-woman-red-hair-professional-heads.jpg" public/images/people/
mv public/young-australian-woman-with-blonde-hair-smiling-pr.jpg public/images/people/
mv public/young-university-student-male-casual-headshot-frie.jpg public/images/people/
```

**Step 2:** Update the one code reference in `lib/blog/articles/legacy-posts.ts`:

Open `lib/blog/articles/legacy-posts.ts` and do a find-replace on all occurrences:

Find: `"/asian-australian-woman` → `"/images/people/asian-australian-woman`
Find: `"/asian-woman-professional` → `"/images/people/asian-woman-professional`
Find: `"/female-doctor-professional` → `"/images/people/female-doctor-professional`
Find: `"/indian-australian-woman` → `"/images/people/indian-australian-woman`
Find: `"/middle-aged-australian` → `"/images/people/middle-aged-australian`
Find: `"/prescription-medication` → `"/images/people/prescription-medication`
Find: `"/professional-businesswoman` → `"/images/people/professional-businesswoman`
Find: `"/young-australian-man` → `"/images/people/young-australian-man`
Find: `"/young-australian-woman` → `"/images/people/young-australian-woman`
Find: `"/young-university-student` → `"/images/people/young-university-student`

Verify after: `grep '"/[a-z].*-headshot\|prescription-medication' lib/blog/articles/legacy-posts.ts` — should show all paths now starting with `/images/people/`.

**Step 3:** Add old-path redirects to `next.config.mjs` as a safety net (inside the `redirects()` array, before the closing `]`):
```js
// Public image path migration — old root paths redirected
{
  source: '/:filename(asian-australian-woman-professional-headshot-smili.jpg)',
  destination: '/images/people/:filename',
  permanent: true,
},
{
  source: '/:filename(asian-woman-professional-headshot-warm-smile.jpg)',
  destination: '/images/people/:filename',
  permanent: true,
},
{
  source: '/:filename(female-doctor-professional-headshot-warm-smile-aus.jpg)',
  destination: '/images/people/:filename',
  permanent: true,
},
{
  source: '/:filename(indian-australian-woman-professional-headshot-smil.jpg)',
  destination: '/images/people/:filename',
  permanent: true,
},
{
  source: '/:filename(middle-aged-australian-man-kind-face-professional-.jpg)',
  destination: '/images/people/:filename',
  permanent: true,
},
{
  source: '/:filename(middle-aged-australian-man-with-glasses-friendly-p.jpg)',
  destination: '/images/people/:filename',
  permanent: true,
},
{
  source: '/:filename(prescription-medication-pharmacy.jpg)',
  destination: '/images/people/:filename',
  permanent: true,
},
{
  source: '/:filename(professional-businesswoman-australian-headshot-con.jpg)',
  destination: '/images/people/:filename',
  permanent: true,
},
{
  source: '/:filename(young-australian-man-creative-professional-headsho.jpg)',
  destination: '/images/people/:filename',
  permanent: true,
},
{
  source: '/:filename(young-australian-man-with-beard-casual-friendly-he.jpg)',
  destination: '/images/people/:filename',
  permanent: true,
},
{
  source: '/:filename(young-australian-woman-red-hair-professional-heads.jpg)',
  destination: '/images/people/:filename',
  permanent: true,
},
{
  source: '/:filename(young-australian-woman-with-blonde-hair-smiling-pr.jpg)',
  destination: '/images/people/:filename',
  permanent: true,
},
{
  source: '/:filename(young-university-student-male-casual-headshot-frie.jpg)',
  destination: '/images/people/:filename',
  permanent: true,
},
```

**Step 4:** Verify no remaining root-level JPG references:
```bash
grep -r '"/[a-z].*-headshot\|"/prescription-medication\|"/asian\|"/female-doctor\|"/indian\|"/young-\|"/middle-aged\|"/professional-business' app/ components/ lib/ --include="*.tsx" --include="*.ts" | grep -v "images/people"
```
Expected: no output.

**Step 5:** Run typecheck:
```bash
pnpm typecheck
```
Expected: no errors.

**Step 6:** Commit:
```bash
git add -A
git commit -m "chore: move portrait JPGs from public root to /public/images/people/ + add redirect safety net"
```

---

## Phase 3 — SVG Optimization

> Low risk. Asset optimization only, no logic changes.

### Task 3.1: Install SVGO and optimize trust badge SVGs

Current sizes:
- `public/logos/RANZCR.svg` — 171KB → target ~3KB
- `public/logos/AHPRA.svg` — 131KB → target ~3KB
- `public/logos/JMIRO.svg` — 131KB → target ~3KB
- `public/logos/instantmed.svg` — 143KB → target ~5KB
- `public/logos/claude-vector.svg` — 316KB → target ~10KB
- `public/branding/seal.svg` — 321KB → target ~5KB

**Step 1:** Install SVGO as a dev dependency:
```bash
pnpm add -D svgo
```

**Step 2:** Run SVGO on all SVGs in `/public/logos/` and `/public/branding/seal.svg`:
```bash
# Optimize in-place
pnpm svgo public/logos/RANZCR.svg --output public/logos/RANZCR.svg
pnpm svgo public/logos/AHPRA.svg --output public/logos/AHPRA.svg
pnpm svgo public/logos/JMIRO.svg --output public/logos/JMIRO.svg
pnpm svgo public/logos/instantmed.svg --output public/logos/instantmed.svg
pnpm svgo public/logos/claude-vector.svg --output public/logos/claude-vector.svg
pnpm svgo public/branding/seal.svg --output public/branding/seal.svg
pnpm svgo public/logos/clerk.svg --output public/logos/clerk.svg
pnpm svgo public/logos/stripe.svg --output public/logos/stripe.svg
pnpm svgo public/logos/RACGP.jpg 2>/dev/null || true  # skip, it's a JPG
```

**Step 3:** Verify sizes reduced significantly:
```bash
ls -lah public/logos/*.svg public/branding/seal.svg
```
Expected: all SVGs should be dramatically smaller (80–95% reduction).

**Step 4:** Do a quick visual check — start dev server and open a page that uses the trust logos (e.g., `/trust` or `/medical-certificate`) and verify logos render correctly.

**Step 5:** Run typecheck + lint:
```bash
pnpm typecheck && pnpm lint
```

**Step 6:** Commit:
```bash
git add public/logos/ public/branding/seal.svg pnpm-lock.yaml package.json
git commit -m "perf: run SVGO on trust badge SVGs — ~90% size reduction"
```

---

## Phase 4 — Route Consolidation

> Medium risk. Touches routing. Test each change with `pnpm build`.

### Task 4.1: Consolidate weight-management → weight-loss

**Decision:** `/weight-loss` is canonical. `/weight-management` redirects to it permanently.

**Files:**
- Delete: `app/weight-management/page.tsx`, `app/weight-management/weight-management-client.tsx`
- Delete: `app/weight-management/` directory
- Modify: `next.config.mjs` (add redirect)

**Step 1:** Check for any internal links pointing to `/weight-management`:
```bash
grep -r "/weight-management" app/ components/ lib/ --include="*.tsx" --include="*.ts" --include="*.md"
```
Note all files that need updating.

**Step 2:** Update any internal links found above to point to `/weight-loss` instead.

**Step 3:** Add redirect to `next.config.mjs` inside the `redirects()` array:
```js
{
  source: '/weight-management',
  destination: '/weight-loss',
  permanent: true,
},
{
  source: '/weight-management/:path*',
  destination: '/weight-loss/:path*',
  permanent: true,
},
```

**Step 4:** Delete the weight-management directory:
```bash
rm -rf app/weight-management/
```

**Step 5:** Verify build:
```bash
pnpm build 2>&1 | tail -20
```
Expected: no errors.

**Step 6:** Verify redirect works locally — start dev server and hit `/weight-management`:
```bash
curl -sI http://localhost:3000/weight-management | grep -E "HTTP|location"
```
Expected: `301` with `location: /weight-loss`

**Step 7:** Commit:
```bash
git add -A
git commit -m "feat: consolidate /weight-management → /weight-loss (permanent redirect, remove duplicate page)"
```

---

### Task 4.2: Move redundant redirect page.tsx files to next.config.mjs

These page.tsx files exist solely to call `redirect()` — logic that belongs in `next.config.mjs` at the edge (no React rendering cost):

| Page file | Redirects to | Action |
|-----------|-------------|--------|
| `app/gp-consult/page.tsx` | `/consult` | Move to next.config, delete page |
| `app/consult/request/page.tsx` | `/request?service=consult` | Move to next.config, delete page |
| `app/prescriptions/request/page.tsx` | `/request?service=prescription` | Move to next.config, delete page |
| `app/prescriptions/new/page.tsx` | `/request?service=consult` | Move to next.config, delete page |
| `app/admin/studio/page.tsx` | `/admin/settings/templates` | Move to next.config, delete page |
| `app/admin/settings/page.tsx` | `/admin/features` | Move to next.config, delete page |

**Step 1:** Read each file to confirm it does nothing but redirect (no auth checks, no metadata that matters):
```bash
cat app/gp-consult/page.tsx
cat app/consult/request/page.tsx
cat app/prescriptions/request/page.tsx
cat app/prescriptions/new/page.tsx
cat app/admin/studio/page.tsx
cat app/admin/settings/page.tsx
```

**Step 2:** Add to `next.config.mjs` redirects array:
```js
// Consolidate redirect-only pages to edge-level redirects
{
  source: '/gp-consult',
  destination: '/consult',
  permanent: true,
},
{
  source: '/consult/request',
  destination: '/request?service=consult',
  permanent: false,  // query params, keep temporary
},
{
  source: '/prescriptions/request',
  destination: '/request?service=prescription',
  permanent: false,
},
{
  source: '/prescriptions/new',
  destination: '/request?service=consult',
  permanent: false,
},
{
  source: '/admin/studio',
  destination: '/admin/settings/templates',
  permanent: true,
},
{
  source: '/admin/settings',
  destination: '/admin/features',
  permanent: true,
},
```

**Step 3:** Delete the redirect-only pages and their directories (if no other files exist in them):
```bash
rm app/gp-consult/page.tsx && rmdir app/gp-consult/
rm app/consult/request/page.tsx && rmdir app/consult/request/ 2>/dev/null || true
rm app/prescriptions/request/page.tsx && rmdir app/prescriptions/request/ 2>/dev/null || true
rm app/prescriptions/new/page.tsx && rmdir app/prescriptions/new/ 2>/dev/null || true
rm app/admin/studio/page.tsx && rmdir app/admin/studio/ 2>/dev/null || true
rm app/admin/settings/page.tsx
# Note: app/admin/settings/ has subdirs (encryption/, templates/) so don't rmdir the parent
```

**Step 4:** `app/start/page.tsx` — keep this one. It has service param mapping logic (normalises 10 legacy service names) that can't be done in a static redirect config.

**Step 5:** Verify build:
```bash
pnpm build 2>&1 | tail -20
```

**Step 6:** Test redirects work:
```bash
# Start dev server, then:
curl -sI http://localhost:3000/gp-consult | grep -E "HTTP|location"
curl -sI http://localhost:3000/admin/studio | grep -E "HTTP|location"
```

**Step 7:** Commit:
```bash
git add -A
git commit -m "refactor: move redirect-only page.tsx files to next.config.mjs edge redirects"
```

---

### Task 4.3: Fix force-dynamic conflict on `/medical-certificate/[slug]`

`app/medical-certificate/[slug]/page.tsx` has BOTH `export const dynamic = "force-dynamic"` AND `export async function generateStaticParams()` — these are contradictory. `force-dynamic` prevents static generation, making `generateStaticParams` do nothing.

**Files:**
- Modify: `app/medical-certificate/[slug]/page.tsx:19`

**Step 1:** Read the full file to understand what `force-dynamic` is protecting:
```bash
head -50 "app/medical-certificate/[slug]/page.tsx"
```

**Step 2:** If the page reads auth state or cookies server-side (search for `cookies()`, `headers()`, `auth()`):
```bash
grep -n "cookies\|headers()\|auth()\|currentUser\|getAuth" "app/medical-certificate/[slug]/page.tsx"
```

**Step 3a:** If NO dynamic function calls found — remove `force-dynamic`, add ISR instead:
```ts
// Remove: export const dynamic = "force-dynamic"
// Add:
export const revalidate = 3600  // Revalidate every hour
```

**Step 3b:** If dynamic function calls ARE found — the `generateStaticParams` is misleading dead code. Add a comment explaining why force-dynamic is needed, or remove generateStaticParams if it's not generating useful paths:
```ts
// force-dynamic required: page reads [reason]. generateStaticParams below used for
// prerendering canonical paths only — Next.js will still dynamically render on request.
```

**Step 4:** Run build and verify pages load:
```bash
pnpm build 2>&1 | grep -E "error|warning|medical-certificate"
```

**Step 5:** Commit:
```bash
git add "app/medical-certificate/[slug]/page.tsx"
git commit -m "fix: resolve force-dynamic/generateStaticParams conflict on med-cert slug pages"
```

---

## Phase 5 — Performance Wins

> Direct LCP and load-time improvements.

### Task 5.1: Remove `unoptimized` from BrandLogo

`components/shared/brand-logo.tsx` has `unoptimized` on both `logo.png` and `wordmark.png`. This serves PNGs at full size on every page. Removing it enables Next.js to serve WebP with proper caching.

**Files:**
- Modify: `components/shared/brand-logo.tsx:42,49`

**Step 1:** Read the current file:
```bash
cat components/shared/brand-logo.tsx
```

**Step 2:** Remove the `unoptimized` prop from both `<Image>` components in the file. The `priority` prop stays — these are above-fold images on every page.

**Step 3:** Test dev server — navigate to homepage and verify logo renders correctly in both light and dark mode.

**Step 4:** Check there are no other `unoptimized` props on above-fold images:
```bash
grep -rn "unoptimized" app/ components/ --include="*.tsx" | grep -v node_modules
```
Review each hit — `unoptimized` is only valid for SVGs or dynamically-generated images where size is already controlled.

**Step 5:** Run typecheck:
```bash
pnpm typecheck
```

**Step 6:** Commit:
```bash
git add components/shared/brand-logo.tsx
git commit -m "perf: remove unoptimized from BrandLogo — enables WebP serving and caching"
```

---

### Task 5.2: Add preconnect hints for DiceBear avatars

`app/layout.tsx` already has preconnect for Clerk, Sentry, PostHog, and dns-prefetch for Stripe. Missing DiceBear (used for patient/doctor avatars on portal pages).

**Files:**
- Modify: `app/layout.tsx` (near line 148 where existing preconnects are)

**Step 1:** Read the current `<head>` section in `app/layout.tsx`:
```bash
grep -n "preconnect\|dns-prefetch\|link rel" app/layout.tsx
```

**Step 2:** Add after the existing preconnect lines:
```tsx
<link rel="preconnect" href="https://api.dicebear.com" />
```

**Step 3:** Run typecheck:
```bash
pnpm typecheck
```

**Step 4:** Commit:
```bash
git add app/layout.tsx
git commit -m "perf: add preconnect hint for DiceBear avatar CDN"
```

---

### Task 5.3: Add cache headers to public read-only API endpoints

Two public API endpoints return essentially static data and currently have no cache headers:
- `/api/patient-count` — returns a display count, changes rarely
- `/api/services/pricing` — pricing is in `lib/constants.ts`, changes only on deploy

**Files:**
- Modify: `app/api/patient-count/route.ts`
- Modify: `app/api/services/pricing/route.ts`

**Step 1:** Read both files:
```bash
cat app/api/patient-count/route.ts
cat app/api/services/pricing/route.ts
```

**Step 2:** In each `GET` handler, add cache headers to the response. For `patient-count`:
```ts
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  },
})
```
For `services/pricing` (truly static — changes only on deploy):
```ts
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  },
})
```

**Step 3:** Verify no auth/cookie reads in these routes (they must be truly public):
```bash
grep -n "auth\|cookies\|headers\|currentUser" app/api/patient-count/route.ts app/api/services/pricing/route.ts
```

**Step 4:** Run typecheck:
```bash
pnpm typecheck
```

**Step 5:** Commit:
```bash
git add app/api/patient-count/route.ts app/api/services/pricing/route.ts
git commit -m "perf: add cache headers to public read-only API endpoints"
```

---

## Phase 6 — Expert Additions

> Architectural improvements for a seamless, fluid platform.

### Task 6.1: Suspense boundary audit on portal pages

Patient and doctor dashboard pages should render their shell (nav, skeleton) immediately via streaming SSR, with data deferred into Suspense boundaries. This turns a slow TTFB into a fast initial paint.

**Files to audit:**
- `app/patient/page.tsx`
- `app/patient/intakes/page.tsx`
- `app/doctor/dashboard/page.tsx`
- `app/doctor/queue/page.tsx`

**Step 1:** For each file above, check if top-level `await` calls block the entire render:
```bash
grep -n "await " app/patient/page.tsx | head -10
grep -n "await " app/doctor/dashboard/page.tsx | head -10
```

**Step 2:** If data fetches are at the top level of the page component, extract them into sub-components wrapped in `<Suspense fallback={<SkeletonDashboard />}>`. Pattern:

```tsx
// Before (blocks entire page)
export default async function PatientPage() {
  const intakes = await getPatientIntakes(userId)  // blocks shell render
  return <IntakeList intakes={intakes} />
}

// After (shell renders immediately, data streams in)
export default async function PatientPage() {
  return (
    <Suspense fallback={<SkeletonDashboard />}>
      <IntakeListWithData />  {/* async server component that fetches */}
    </Suspense>
  )
}
```

**Step 3:** Use existing skeleton components — they're already defined:
- `SkeletonDashboard` from `@/components/ui/skeleton`
- `SkeletonList` from `@/components/ui/skeleton`

**Step 4:** Test locally — use Network throttling in DevTools (Slow 3G) to verify shell renders before data.

**Step 5:** Run typecheck + all tests:
```bash
pnpm typecheck && pnpm test
```

**Step 6:** Commit:
```bash
git add app/patient/ app/doctor/
git commit -m "perf: add Suspense boundaries to portal pages for streaming SSR"
```

---

### Task 6.2: Audit and reduce `force-dynamic` on public marketing pages

78 files use `force-dynamic`. Marketing/SEO pages don't need server-side rendering on every request — they need ISR. Each unnecessary `force-dynamic` on a public page bypasses Vercel's edge cache, adding ~100–300ms of server latency per visit.

**Step 1:** Get the full list of marketing pages with `force-dynamic`:
```bash
grep -rl "force-dynamic" app/ --include="*.tsx" --include="*.ts" | \
  grep -v "patient\|doctor\|admin\|account\|auth\|api\|cron\|flow\|request\|start\|track\|sign-in\|sign-up\|not-found\|(dev)"
```

**Step 2:** For each file in the result, check if it calls any dynamic function (`cookies()`, `headers()`, `auth()`, `currentUser()`):
```bash
# Example check for each file
grep -n "cookies()\|headers()\|auth()\|currentUser()\|getAuthenticatedUser" app/faq/page.tsx
```

**Step 3:** For pages with NO dynamic function calls: replace `export const dynamic = "force-dynamic"` with ISR:
```ts
// Remove: export const dynamic = "force-dynamic"
// Add:
export const revalidate = 3600  // or 300 for more volatile pages
```

**Step 4:** For pages with auth calls that show conditional UI (e.g., "logged in" header state): consider moving auth to client-side (e.g., Clerk's `useUser()` hook) rather than server-side, so the page can be statically cached.

**Step 5:** Run `pnpm build` and check the build output. Next.js will show which pages are Static (○), ISR (~), or Dynamic (λ). Goal: all marketing pages should be ○ or ~.
```bash
pnpm build 2>&1 | grep -E "○|~|λ" | grep -v "api\|cron"
```

**Step 6:** Commit per batch of pages:
```bash
git add app/[affected-pages]/
git commit -m "perf: replace force-dynamic with ISR on static marketing pages"
```

---

### Task 6.3: Verify `generateStaticParams` coverage on programmatic SEO pages

These 12 dynamic route pages already have `generateStaticParams`. Verify each is actually statically generated (not silently falling back to dynamic due to a conflicting config):

```
app/blog/[slug]
app/conditions/[slug]
app/conditions/[slug]/[city]
app/compare/[slug]
app/for/[audience]
app/guides/[slug]
app/intent/[slug]
app/locations/[city]
app/medical-certificate/[slug]
app/medications/[slug]
app/medical-certificate/location/[suburb]
app/symptoms/[slug]
```

**Step 1:** For each, check for conflicting directives:
```bash
for f in app/blog/\[slug\]/page.tsx app/conditions/\[slug\]/page.tsx app/compare/\[slug\]/page.tsx app/for/\[audience\]/page.tsx app/guides/\[slug\]/page.tsx app/intent/\[slug\]/page.tsx app/locations/\[city\]/page.tsx app/symptoms/\[slug\]/page.tsx; do
  echo "=== $f ===" && grep -n "force-dynamic\|revalidate\|generateStaticParams\|dynamic " "$f" | head -5
done
```

**Step 2:** Any page with `generateStaticParams` that also has `force-dynamic` needs the `force-dynamic` removed (see Task 4.3 as the template).

**Step 3:** Run build and verify the pages show as Static (○) or ISR (~) in build output:
```bash
pnpm build 2>&1 | grep -E "conditions|compare|guides|intent|locations|symptoms|blog"
```

**Step 4:** Commit any fixes found.

---

### Task 6.4: Rename docs/GOOGLE-ADS-AUDIT.md and clean up docs/

`docs/` contains one file (`GOOGLE-ADS-AUDIT.md`) and an empty `plans/` subdirectory (now used by this plan). Clean up structure.

**Step 1:** Move the Google Ads audit to a more descriptive path or archive:
```bash
# If the audit is still relevant/active:
mkdir -p docs/audits
mv docs/GOOGLE-ADS-AUDIT.md docs/audits/google-ads-audit.md

# Or if it's complete and just historical reference:
# keep it — just note it in CLAUDE.md
```

**Step 2:** Commit:
```bash
git add docs/
git commit -m "chore: reorganize docs/ structure"
```

---

### Task 6.5: Playwright config consolidation

Three playwright configs exist:
- `playwright.config.ts` — main E2E config
- `playwright.intake.config.ts` — purpose unclear
- `playwright.preview.config.ts` — purpose unclear

**Step 1:** Read all three configs:
```bash
cat playwright.config.ts && echo "---" && cat playwright.intake.config.ts && echo "---" && cat playwright.preview.config.ts
```

**Step 2:** If `intake` and `preview` configs duplicate the main config with only minor differences (different base URL, different timeout), consolidate using environment-driven config in the main `playwright.config.ts`:
```ts
// In playwright.config.ts
use: {
  baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
}
```

**Step 3:** Delete redundant configs and update `package.json` scripts to remove references:
```bash
# Example if they're confirmed redundant:
rm playwright.intake.config.ts playwright.preview.config.ts
```

**Step 4:** Update any CI/CD scripts or package.json that reference the deleted configs.

**Step 5:** Run E2E tests to verify:
```bash
PLAYWRIGHT=1 pnpm e2e --reporter=list 2>&1 | tail -10
```

**Step 6:** Commit:
```bash
git add -A
git commit -m "chore: consolidate playwright configs"
```

---

### Task 6.6: Add `tailwind.config.js` documentation comment or remove

With Tailwind v4 (CSS-first config in `globals.css`), the root `tailwind.config.js` may be a v3 artifact. However, it defines custom screens (`xs`, `tablet`, `3xl`) and fontFamily — these must still be loaded if they're used.

**Step 1:** Check if `tailwind.config.js` is referenced anywhere:
```bash
grep -rn "tailwind.config" next.config.mjs postcss.config.mjs package.json
```

**Step 2:** Check if the custom screens defined in it (`xs: '475px'`, `tablet: '834px'`, `3xl: '1920px'`) are used in the codebase:
```bash
grep -rn "\bxs:\|tablet:\|3xl:" app/ components/ --include="*.tsx" --include="*.css" | grep -v node_modules | head -20
```

**Step 3a:** If the config IS still needed by postcss/Next.js build — add a comment at the top:
```js
// NOTE: Tailwind v4 is CSS-first (see app/globals.css).
// This file is still loaded by postcss for custom screens (xs, tablet, 3xl)
// and fontFamily. Do not delete.
```

**Step 3b:** If the custom utilities ARE defined in `globals.css` too — remove this file and verify the build:
```bash
pnpm build 2>&1 | tail -20
```

**Step 4:** Commit the appropriate change.

---

## Final Verification

After all phases, run full CI:

```bash
pnpm ci
```
Expected: lint ✓, typecheck ✓, test (669 tests) ✓, build ✓

Run E2E on critical paths:
```bash
PLAYWRIGHT=1 pnpm e2e --reporter=list 2>&1 | tail -20
```
Expected: 93 tests pass.

Deploy to Vercel preview and check:
1. Homepage LCP in Lighthouse (target: <2.5s)
2. Trust badge logos render correctly
3. `/weight-management` → `/weight-loss` redirect fires (301)
4. `/gp-consult` → `/consult` redirect fires (301)
5. Brand logo renders in both light and dark mode
6. Patient portal loads with skeleton → content transition (streaming SSR)

---

## Summary

| Phase | Risk | Estimated Time | Impact |
|-------|------|---------------|--------|
| 1: Root & Git hygiene | Zero | 20 min | Clean repo |
| 2: Public asset cleanup | Low | 45 min | Org + perf |
| 3: SVG optimization | Low | 30 min | LCP (-90% logo payload) |
| 4: Route consolidation | Medium | 2h | Clean routing graph |
| 5: Performance wins | Medium | 1h | LCP + TTI |
| 6: Expert additions | Medium | 3h | TTFB, streaming, SEO |

**Never touch:** `proxy.ts` (Next.js Clerk middleware)
