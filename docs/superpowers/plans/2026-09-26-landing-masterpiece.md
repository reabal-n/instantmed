# Landing Masterpiece Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the homepage, `/medical-certificate`, `/prescriptions` and the shared header, Services menu, mobile menu, footer and sticky CTA. The result should feel warm, high-production and trustworthy, with:
- an owned illustration system;
- a truthful live status;
- a prominent green moat;
- lean, layered copy.

**Architecture:**
- **Visual system:** service "colour worlds" become CSS tokens, and hand-drawn SVG marks and illustrations live in `components/brand/`.
- **Rendering:** new sections are server components. Client code is limited to small islands (a qualifier popover, the specimen dialog, a scroll observer), so each page adds little JavaScript.
- **Shared primitives:** existing ones (`Hero`, `FAQSection`, `CTABanner`, `StickyCTA`, `ServiceIconTile`, `TrustBadge`) gain opt-in props, so pages outside this scope render unchanged.
- **Copy:** every sensitive string comes from `lib/marketing/approved-claims.ts`.

**Tech Stack:** Next.js 15.5 App Router (webpack), React 18.3, TypeScript 5.9, Tailwind v4.2.2 (CSS-first), Radix via shadcn (`Popover`, `Dialog`, `Accordion`), lucide-react, CSS keyframes (no new Framer Motion usage), Supabase service-role reads, `next/og` on the existing edge runtime, `qrcode`, Vitest (Node environment, `renderToStaticMarkup`), Playwright with `@axe-core/playwright`.

**Spec:** `docs/superpowers/specs/2026-09-26-landing-masterpiece-design.md`, approved by Rey on 2026-09-26. Read all of it before Task 1; section numbers below refer to it. The research base is `docs/research/2026-09-26-premium-health-landing-pages.md`.

---

## 0. Handoff for the executing session

**Objective:** implement the approved spec on one release branch. Prove the visual direction with Rey before the full build, then release after the 7 October Google Ads checkpoint.

**Non-goals:**
- The other service pages (ED, hair loss, women's health, weight), the SEO guide pages and `/request`. A follow-up plan covers them.
- Photography, pricing changes, headline A/B tests and stack upgrades. Framer Motion 12 supports React 18, but do **not** upgrade.
- The certificate request-form simplification (`docs/superpowers/plans/2026-09-23-certificate-request-simplification.md`). That is a separate plan and ships separately.

**Authority:**
- Rey approved the spec on 2026-09-26.
- Rey chooses the execution method when this plan is handed over.
- Production release is authorised only after the 7 October Ads read, as one PR. The spec's Section 9 fixes are bundled into that PR, not shipped early.
- This plan authorises no Google Ads changes.

**Repository state at handoff:**
- The planning branch `claude/landing-premium-plan` holds the spec, the research report, this plan and a design-freeze note in `docs/ROADMAP.md`. It merges to `main` through a docs PR. Task 1 checks that it has.
- Do **not** build in the shared checkout `/Users/rey/Developer/instantmed`; other sessions use it. Use a sibling worktree (Task 1).
- Evidence captured during planning:
  - 28-day PostHog baselines (spec Section 1);
  - copy pre-clearance (spec Section 7A);
  - audit screenshots and the raw research notes in the ignored folder `/Users/rey/Developer/instantmed/output/landing-audit/`. That folder is local-only; never commit its contents (it includes competitor screenshots).

**Inputs still owed by Rey:**
1. A redacted screenshot of a real eScript SMS as patients receive it (Task 8). Until then, use the placeholder wording given there.
2. Approval of the direction proof (Task 10 gate).
3. Final sign-off before release (Task 24).

**Critical facts found while planning:**
- **`public/templates/template.pdf` is a flat raster** containing Rey's name, AHPRA number, handwritten signature and seal. Never render, rasterise or display it publicly (spec 6.6). `public/branding/eSignature.png` carries a readable name, so it is off-limits for public surfaces too.
- **`lib/pdf/template-renderer.ts` imports `fs`, `pdf-lib`, `qrcode` and Sentry.** Import its locked sentences only from server components.
- **Unit tests run in Node, not jsdom.** Component tests use `renderToStaticMarkup`; interaction tests are Playwright.
- **Tailwind:** it runs with `source(none)`, and the `@source` scopes `../components` and `../lib` already cover the new folders. Tailwind 4.2.2 compiles `inset-shadow-[0_1px_0_rgb(255_255_255/0.8)]` into an inset highlight that combines with `shadow-*` (checked during planning).
- **CI runs the full E2E job for this change.** Shared components, `app/(marketing)/page.tsx` and `globals.css` are all outside the skip list in `scripts/ci-e2e-required.sh`.
- **The live certificate share image carries banned claims:** "Under 1 Hour", "Accepted Everywhere", "AHPRA-Registered GP" and a GP price comparison. Task 20 removes them.
- **New `.md` files** need `docs/bookkeeping/expected-md-count` and `docs/bookkeeping/file-map.md` updates (`scripts/doc-audit.sh`).
- **Release protocol:** the ROADMAP "Sequential build session protocol" (under `docs/ROADMAP.md` section 4) applies: draft PRs, independent review, exact-head CI, and the receipt at the end of this plan.

**Planning refinements to the spec.** Each was decided from verified code while writing this plan; follow them over the spec wording:
1. Illustrations live in `components/brand/illustrations/` (spec 5.2) and marks in `components/brand/marks/`.
2. **Outcome screen wording copies the live product:**
   - dashboard card: "Your document is ready" (`app/patient/intakes/[id]/client.tsx:886`);
   - email headline: "Your certificate is ready" (`lib/email/components/templates/med-cert-patient.tsx:58`).

   The spec's examples differ slightly. Its rule to mirror real formats wins.
3. The clinical-check illustration uses a generic seal **without lettering**, because the art contract bans SVG text.
4. **Homepage sticky bar:** removed, not run as a PostHog experiment. No client feature-flag helper exists, and telemetry starts only after the first interaction, so a flag cannot decide the first render.
5. The FAQ keeps the shared Radix height animation rather than a `grid-template-rows` rewrite. The behaviour is the same, and the shared accordion is not forked.
6. Screenshot baselines stay in Playwright's default folder `e2e/marketing.visual.spec.ts-snapshots/`; Linux files end in `-chromium-linux.png`. The spec named `e2e/__screenshots__/`.
7. Share images keep today's edge runtime and load a bundled WOFF file, because Satori reads WOFF and TTF, not WOFF2.
8. **`LiveStatus` activity:** it counts clinical activity only by the doctors currently marked available. Test-fixture clinician emails and seeded E2E intakes are excluded. This is a stricter, more truthful reading of spec 6.1.
9. The trust-panel LegitScript seal uses the existing `sm` size (63 px). The spec's 56 px is approximate.
10. **No-call leak guard:** the Services menu's certificate row carries the no-call badge (spec 6.5). The leak guard therefore checks `<main>`, the sticky bar and the final band on prescription pages, not the whole DOM. Radix mounts the menu only when it is open.
11. **Step-by-step section:** `StepStory` renders on the server with a tiny client observer. Importing the illustration registry into a client component would ship all twelve illustrations as JavaScript.
12. **Specimen certificate:** it is server-rendered HTML passed into a client dialog. It enters the DOM only when opened; its text travels in the page's server payload, which is a few kilobytes and no JavaScript.

**Skills to load when their task starts:**
- `web-design`: Tasks 7–19.
- `instantmed-ui-browser-verification`: Tasks 10, 22 and 23.
- `instantmed-marketing-compliance-review` and `instantmed-clinical-safety-review`: Tasks 4 and 23.
- `superpowers:verification-before-completion`: before calling any task done.

**First bounded action:** Task 1.

---

## Global Constraints

- **Stack pins stay untouched:** `next` 15.5.24, `react` 18.3.1, `framer-motion` 11.18.2, `tailwindcss` 4.2.2, webpack only. No new dependencies. Use `RefObject<T>`, never `RefObject<T | null>`.
- **Colour:**
  - The primary CTA is system blue `#2563EB` (light) and teal `#5DB8C9` (dark).
  - World tints are fills and backgrounds only; meaning is carried by ink text.
  - No purple, violet, neon or dark-navy page backgrounds.
  - Shadows are sky-toned (`shadow-primary/…`).
  - Coral `#FF6B5B` appears only inside illustrations, as decoration.
  - Success green is used only for the moat badges, live status and success states.
- **Surfaces:**
  - No `backdrop-blur` on content surfaces and no `filter: blur()`. The exceptions are the sticky CTA bar, the mobile menu, modals and the navbar's existing scrolled state.
  - Cards are never nested inside cards.
- **Type:**
  - Source Sans 3 for body and UI. Plus Jakarta Sans display for the hero H1 only, at weight 450 after Task 3.
  - Sentence case.
  - Body text 16 px minimum; `text-xs` only together with `uppercase` in landing files (`landing-type-floor-contract`).
  - Headings `text-balance`, paragraphs `text-pretty`, prices and times `tabular-nums`.
  - No em dashes in any user-visible string.
  - Curly apostrophes and quotes (’ “ ”) in every string written for this redesign. Approved-claims strings stay byte-identical.
- **Copy:**
  - Read every approved-claims string through `getApprovedClaim()` or a `lib/marketing/voice.ts` constant; never retype it.
  - No unqualified "No call needed" on prescribing or specialty surfaces.
  - No medicine names, doctor names, doctor counts, testimonials, review counts or numeric ratings.
  - Say "24/7" only; never give an hours window.
  - The CTA price separator is " · ".
- **Motion:**
  - Animate `transform` and `opacity` only, plus the bounded glow and the header height.
  - Durations are 150–300 ms. The only repeat is the three-breath glow; nothing loops forever.
  - No scroll-fade reveals on the three pages (`Reveal` is not used there). The H1 and subheading are never faded.
  - Every animation is disabled under `prefers-reduced-motion: reduce`.
- **Layout:**
  - Use the constants in `lib/brand/surfaces.ts` (Task 2): one container `mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8`, major sections `py-16 md:py-24`, compact ones `py-12 md:py-16`, and `scroll-mt-24` on anchor targets.
  - Section headings are left-aligned; only the final CTA band is centred.
  - The primary CTA or hero menu sits fully inside 375x812, and there is no horizontal overflow at 320 px.
- **Performance:**
  - Lab LCP on `/medical-certificate` (4x CPU, Fast 4G, 390x844) is 800 ms or lower, with CLS 0.
  - Added client JavaScript is 15 KB gzipped or less per page.
  - Each illustration component is 6 KB gzipped or less.
- **Protected files:**
  - `public/templates/template.pdf` and `public/branding/eSignature.png` are never imported by a public component.
  - Locked certificate sentences are imported from `lib/pdf/template-renderer.ts`, never copied.
- **Scope:** pages outside the three keep today's visuals. New props on shared primitives default to current behaviour.

## Review Focus

1. **A stale "A doctor is online".** If Rey goes offline, the hero must drop to "Requests open 24/7" within about a minute. The online state needs both an available doctor and that same doctor's activity in the last 90 minutes, and the pages revalidate every 60 s. Owners: Task 6 (unit tests cover a failed query, available-but-idle, recent activity and the auto-approval actor) and Task 23 (production-build timing check).
2. **Disabled service or maintenance.** Moat badges and chips stay. CTAs and menu rows become "Contact us" or unavailable. `LiveStatus` and the reviews hide. Duration cards link to `/contact`. Owners: Task 9 (hero gate), Tasks 14, 16 and 17 (availability gates with fallbacks) and Task 22 (e2e with the med-cert service disabled).
3. **No-call leakage.** A prescribing surface must never claim no call. On `/prescriptions`, "No call needed" may appear only on the certificate row of the open Services menu; `<main>`, the sticky bar and the final band never contain it. Owners: Task 5 (`moat-badge-contract` source allowlist) and Task 22 (e2e on the rendered page).
4. **Small screens and large text.** At 320x568 with 200% text, the moat pair, chips, proof row, `OutcomeStage` and the 96 px sticky bar must not overlap or overflow. The sticky bar must not cover a focused control. Owner: Task 22.
5. **No JavaScript and reduced motion.** The hero is fully visible with no opacity-0 server render. Duration cards, FAQ answers (already in the DOM), "More detail" and the step-by-step section work without JavaScript. Every animation resolves to its end state. Owners: Tasks 8 and 14 (static render tests) and Task 22 (reduced-motion e2e).

---

## File structure

**Create:**

| Path | Responsibility |
|---|---|
| `lib/brand/worlds.ts` | World ids, service-to-world map, world class strings |
| `lib/brand/surfaces.ts` | Container, section rhythm, anchor offset, focus ring, tactile surface |
| `lib/typography/nbsp.ts` | Non-breaking joins for prices, durations and "about 3 minutes" |
| `lib/brand/live-status.ts` | Live-status signal reads (service role) and the pure resolver |
| `lib/marketing/faq-anchor.ts` | Stable FAQ anchor ids |
| `components/brand/art.tsx` | `ArtSvg` wrapper and shared art types |
| `components/brand/marks/*.tsx` | Six service marks, the assessments mark, `ServiceMark` |
| `components/brand/illustrations/*.tsx` | Twelve illustrations and `Scene` |
| `components/marketing/moat-badge.tsx` | `MoatBadge`, `MoatBadgePair` (server-safe) |
| `components/marketing/moat-qualifier.tsx` | Client "i" popover |
| `components/marketing/live-status.tsx` | Hero status line |
| `components/marketing/outcome-stage/*.tsx` | Phone frame, screens, status card, notice, `OutcomeStage` |
| `components/marketing/specimen/{certificate-specimen,specimen-viewer}.tsx` | A4 certificate replica and its dialog |
| `components/marketing/verify-demo.tsx` | Static employer-verification example |
| `components/marketing/clinical-model-panel.tsx` | "Who checks your request" with certification logos |
| `components/marketing/sections/{section-heading,world-band,chip-list,fit-check,more-detail,contact-line,what-you-need,fee-card,outcome-paths,step-story,step-story-observer,duration-picker}.tsx` | Section primitives |
| `components/marketing/home/{service-menu,services-overview,proper-medicine-band}.tsx` | Homepage sections |
| `app/prescriptions/opengraph-image.tsx` | Prescriptions share image |
| `app/_og/plus-jakarta-sans-latin-500-normal.woff` | Share-image display font (private folder, not a route) |
| `scripts/design/render-art-sheet.tsx` | Renders marks and illustrations to PNG contact sheets |
| `e2e/landing-redesign.spec.ts` | Behaviour, budgets, leak and accessibility checks |
| `.github/workflows/visual-regression.yml` | Manual baseline update and report-only comparison |
| `lib/__tests__/{design-tokens,landing-typography,landing-claims,moat-badge,live-status,brand-art,outcome-stage,specimen,landing-sections,landing-chrome,landing-motion,landing-analytics-option}-contract.test.ts(x)`, `lib/__tests__/{nbsp,faq-anchor}.test.ts` | Contracts and unit tests |

**Modify:**
- Styles and layout: `app/globals.css`, `app/tailwind-shared.css`, `app/layout.tsx`.
- Type: `components/ui/heading.tsx`, `lib/fonts/money-h1.ts`.
- Claims and badges: `lib/marketing/approved-claims.ts`, `lib/marketing/trust-badges.ts`, `components/shared/trust-badge.tsx`, `lib/marketing/landing-vocabulary.ts` (`LANDING_SURFACES`).
- Tiles: `components/icons/service-icons.tsx`.
- Shared primitives: `components/marketing/hero.tsx`, `components/sections/faq-section.tsx`, `components/sections/cta-banner.tsx`, `components/marketing/shared/sticky-cta.tsx`.
- Analytics: `lib/analytics/landing-analytics.ts`, `lib/hooks/use-landing-analytics.ts`.
- Pages: `app/(marketing)/page.tsx`, `app/medical-certificate/page.tsx`, `app/prescriptions/page.tsx`, `components/marketing/med-cert-landing.tsx`, `components/marketing/prescriptions-landing.tsx`, `components/marketing/{home,med-cert,prescriptions}-client-controls.tsx`, `components/marketing/med-cert-reason-links.tsx`.
- Chrome: `components/shared/navbar.tsx`, `components/shared/navbar/{services-dropdown,mobile-menu-content,mobile-drawer,user-menu}.tsx`, `components/shared/footer.tsx`.
- Share images: `app/opengraph-image.tsx`, `app/medical-certificate/opengraph-image.tsx`.
- E2E: `e2e/landing-pages.spec.ts`, `e2e/front-door.spec.ts`, `e2e/money-pages-foundations.spec.ts`, `e2e/marketing.visual.spec.ts`.
- The contract tests named in each task.
- Docs: `DESIGN.md`, `docs/VOICE.md`, `docs/ADVERTISING_COMPLIANCE.md`, `docs/CLINICAL.md`, `docs/BRAND.md`, `docs/PRIMITIVES.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/DESIGN_SYSTEM_CHANGELOG.md`, `lib/design-system/version.ts`, `docs/AI_ONBOARDING.md`, `wiki/architecture.md`, `docs/ROADMAP.md`.

**Delete** once replaced. List each deletion in `scripts/check-orphaned-files.sh`, per `code-clean-retirement-contract`. Before deleting, run `grep -rn "<basename>" app components lib e2e scripts` and update or remove every reference in the same commit; the tasks name the references known at planning time.
- `components/marketing/mockups/escript-hero-mockup.tsx` (Task 18)
- `components/marketing/portfolio-route-map.tsx` (Task 16)
- `components/marketing/sections/limitations-section.tsx` (Task 17; only the certificate page uses it)
- `components/shared/employer-logo-marquee.tsx` (Task 17, only if no importer remains)

**Keep:**
- `components/marketing/mockups/med-cert-hero-mockup.tsx` and `components/marketing/hero-doctor-review-mockup.tsx`: `/consult` renders `HeroDoctorReviewMockup`, which imports `MedCertHeroMockup`. Only the homepage and certificate page stop using them.
- `components/marketing/regulatory-partners.tsx`: six other pages use it.

---

# Phase A: Foundations and direction proof

### Task 1: Worktree and green baseline

**Files:** none changed.

- [ ] **Step 1: Confirm the planning docs are on `main`.**

```bash
cd /Users/rey/Developer/instantmed && git fetch -q origin main && git ls-tree -r origin/main --name-only | grep -c "docs/superpowers/plans/2026-09-26-landing-masterpiece.md"
```
Expected: `1`. If it prints `0`, stop: the planning PR has not merged.

- [ ] **Step 2: Create the worktree.**

```bash
git worktree add ../instantmed-worktrees/landing-masterpiece -b claude/landing-masterpiece origin/main
cd ../instantmed-worktrees/landing-masterpiece && cp ../../instantmed/.env.local . && pnpm install --frozen-lockfile
node -v && pnpm -v
```
Expected: Node `v24.x` and pnpm `10.23.0`.

- [ ] **Step 3: Run the landing contracts on untouched `main`.**

```bash
pnpm exec vitest run lib/__tests__/landing-hero-contract.test.ts lib/__tests__/marketing-copy-contract.test.ts lib/__tests__/money-page-narrative-contract.test.ts lib/__tests__/money-page-narrative-compression-contract.test.ts lib/__tests__/portfolio-art-direction-contract.test.ts lib/__tests__/landing-vocabulary-contract.test.ts lib/__tests__/landing-type-floor-contract.test.ts lib/__tests__/trust-badges.test.ts lib/__tests__/approved-claims-contract.test.ts
```
Expected: all pass. If any fail on untouched `main`, stop and report; do not build on red.

- [ ] **Step 4: Record the start commit** (`git rev-parse HEAD`) in the execution receipt at the end of this plan.

### Task 2: Colour worlds, surfaces and typographic utilities

**Files:**
- Modify: `app/globals.css`, `app/tailwind-shared.css`
- Create: `lib/brand/worlds.ts`, `lib/brand/surfaces.ts`, `lib/typography/nbsp.ts`
- Test: `lib/__tests__/design-tokens-contract.test.ts`, `lib/__tests__/nbsp.test.ts`

**Interfaces produced:**
- From `lib/brand/worlds.ts`: `ServiceWorldId`, `WorldId`, `SERVICE_WORLDS`, `WORLD_CLASSES`, `SPECTRUM_BAND`.
- From `lib/brand/surfaces.ts`: `CONTAINER`, `SECTION_Y`, `SECTION_Y_COMPACT`, `ANCHOR_OFFSET`, `FOCUS_RING`, `TACTILE_SURFACE`.
- From `lib/typography/nbsp.ts`: `NBSP` and `nbsp(text: string): string`.
- CSS variables `--world-{dawn|sky|dusk|champagne|rose|sage}-{50|100|200}`, `--art-ink` and `--moat-*`.
- Tailwind colours `world-*-*` and `art-ink`.
- The `.film-grain` class and a branded `::selection`.

- [ ] **Step 1: Write the failing tests.**

```ts
// lib/__tests__/design-tokens-contract.test.ts
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { ANCHOR_OFFSET, CONTAINER, FOCUS_RING, SECTION_Y, SECTION_Y_COMPACT, TACTILE_SURFACE } from "@/lib/brand/surfaces"
import { SERVICE_WORLDS, WORLD_CLASSES } from "@/lib/brand/worlds"

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8")
const WORLDS = ["dawn", "sky", "dusk", "champagne", "rose", "sage"] as const

describe("landing design tokens", () => {
  const css = read("app/globals.css")
  const theme = read("app/tailwind-shared.css")

  it("keeps #2563EB as the light primary", () => {
    expect(css).toMatch(/--primary:\s*#2563EB;/)
  })

  it("declares every world tint for light and dark and exposes it to Tailwind", () => {
    for (const world of WORLDS) {
      for (const step of [50, 100, 200]) {
        const matches = css.match(new RegExp(`--world-${world}-${step}:`, "g")) ?? []
        expect(matches.length, `${world}-${step} light+dark`).toBeGreaterThanOrEqual(2)
        expect(theme).toContain(`--color-world-${world}-${step}: var(--world-${world}-${step});`)
      }
    }
  })

  it("keeps world tokens free of violet and purple", () => {
    const start = css.indexOf("/* -- Service colour worlds")
    expect(start).toBeGreaterThan(-1)
    expect(css.slice(start, start + 2500)).not.toMatch(/violet|purple|#7C3AED|#8B5CF6/i)
  })

  it("maps every service to a world and every world to class strings", () => {
    expect(SERVICE_WORLDS).toEqual({
      "med-cert": "dawn", "repeat-rx": "sky", ed: "dusk",
      "hair-loss": "champagne", "womens-health": "rose", "weight-loss": "sage",
    })
    for (const world of WORLDS) {
      expect(WORLD_CLASSES[world].band).toBe(`bg-world-${world}-50`)
      expect(WORLD_CLASSES[world].tile).toBe(`bg-world-${world}-100`)
    }
  })

  it("exposes one container, section rhythm, anchor offset, focus ring and tactile surface", () => {
    expect(CONTAINER).toBe("mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8")
    expect(SECTION_Y).toBe("py-16 md:py-24")
    expect(SECTION_Y_COMPACT).toBe("py-12 md:py-16")
    expect(ANCHOR_OFFSET).toBe("scroll-mt-24")
    expect(FOCUS_RING).toContain("focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2")
    expect(TACTILE_SURFACE).toContain("inset-shadow-[0_1px_0_rgb(255_255_255/0.8)]")
  })

  it("adds bounded film grain and a branded selection colour", () => {
    expect(css).toContain(".film-grain::before")
    expect(css).toMatch(/::selection\s*\{[^}]*color-mix\(in srgb, var\(--primary\) 18%/)
  })
})
```

```ts
// lib/__tests__/nbsp.test.ts
import { describe, expect, it } from "vitest"

import { NBSP, nbsp } from "@/lib/typography/nbsp"

describe("nbsp", () => {
  it("joins prices, durations and about-minutes", () => {
    expect(nbsp("From $24.95")).toBe(`From${NBSP}$24.95`)
    expect(nbsp("3 days off")).toBe(`3${NBSP}days off`)
    expect(nbsp("Takes about 3 minutes.")).toBe(`Takes about${NBSP}3${NBSP}minutes.`)
  })
  it("is idempotent and leaves other text alone", () => {
    const once = nbsp("From $24.95 for 1 day")
    expect(nbsp(once)).toBe(once)
    expect(nbsp("Requests open 24/7")).toBe("Requests open 24/7")
  })
})
```

- [ ] **Step 2: Run them and confirm they fail.** Run `pnpm exec vitest run lib/__tests__/design-tokens-contract.test.ts lib/__tests__/nbsp.test.ts`. Expected: FAIL (modules missing and tokens absent).

- [ ] **Step 3: Add the tokens.**

In `app/globals.css`, inside the light `:root` block, directly after `--morning-champ: #E8D5A3;` (line 276):

```css
  /* -- Service colour worlds (landing redesign 2026-09-26). Fills and backgrounds only; meaning stays in ink text. -- */
  --world-dawn-50: #FFF6EE;      --world-dawn-100: #FDE8D6;      --world-dawn-200: #F5C6A0;
  --world-sky-50: #F2F7FE;       --world-sky-100: #DDEAFB;       --world-sky-200: #BAD4F5;
  --world-dusk-50: #F1F4F9;      --world-dusk-100: #E1E7F1;      --world-dusk-200: #C7D2E3;
  --world-champagne-50: #FBF7EE; --world-champagne-100: #F5EBD5; --world-champagne-200: #E8D5A3;
  --world-rose-50: #FDF3F4;      --world-rose-100: #FAE3E6;      --world-rose-200: #F2C4CB;
  --world-sage-50: #F3F7F3;      --world-sage-100: #E3EDE4;      --world-sage-200: #C6D9C9;
  --art-ink: #1E293B;
  --moat-bg-from: #ECFDF5; --moat-bg-to: #E1F8EC; --moat-border: rgba(5, 150, 105, 0.18);
  --moat-text: #065F46; --moat-glyph: #059669; --moat-check: #FFFFFF;
```

Inside the first `.dark {` block (line 335), after `--primary: #5DB8C9;`:

```css
  --world-dawn-50: #1F1A16;      --world-dawn-100: #2A221B;      --world-dawn-200: #6B4B33;
  --world-sky-50: #121A26;       --world-sky-100: #172235;       --world-sky-200: #33507A;
  --world-dusk-50: #141922;      --world-dusk-100: #1B2230;      --world-dusk-200: #3A465C;
  --world-champagne-50: #1C1A14; --world-champagne-100: #26221A; --world-champagne-200: #6B5B34;
  --world-rose-50: #1E1517;      --world-rose-100: #2A1C1F;      --world-rose-200: #6B3A43;
  --world-sage-50: #141B16;      --world-sage-100: #1B251E;      --world-sage-200: #3C5543;
  --art-ink: #E2E8F0;
  --moat-bg-from: rgba(6, 78, 59, 0.35); --moat-bg-to: rgba(6, 78, 59, 0.28); --moat-border: rgba(52, 211, 153, 0.25);
  --moat-text: #A7F3D0; --moat-glyph: #34D399; --moat-check: #022C22;
```

Append at the end of `app/globals.css`:

```css
/* ================================
   LANDING REDESIGN SURFACES (2026-09-26)
   ================================ */
::selection { background: color-mix(in srgb, var(--primary) 18%, transparent); }

/* 2-3% film grain behind hero and world-band gradients only (DESIGN.md section 12). */
.film-grain { position: relative; isolation: isolate; }
.film-grain::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: 0.025;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}
.dark .film-grain::before { opacity: 0.015; }
```

In `app/tailwind-shared.css`, inside `@theme inline` next to the `--color-morning-*` lines, add one declaration per line:

```css
  --color-world-dawn-50: var(--world-dawn-50);
  --color-world-dawn-100: var(--world-dawn-100);
  --color-world-dawn-200: var(--world-dawn-200);
  --color-world-sky-50: var(--world-sky-50);
  --color-world-sky-100: var(--world-sky-100);
  --color-world-sky-200: var(--world-sky-200);
  --color-world-dusk-50: var(--world-dusk-50);
  --color-world-dusk-100: var(--world-dusk-100);
  --color-world-dusk-200: var(--world-dusk-200);
  --color-world-champagne-50: var(--world-champagne-50);
  --color-world-champagne-100: var(--world-champagne-100);
  --color-world-champagne-200: var(--world-champagne-200);
  --color-world-rose-50: var(--world-rose-50);
  --color-world-rose-100: var(--world-rose-100);
  --color-world-rose-200: var(--world-rose-200);
  --color-world-sage-50: var(--world-sage-50);
  --color-world-sage-100: var(--world-sage-100);
  --color-world-sage-200: var(--world-sage-200);
  --color-art-ink: var(--art-ink);
```

- [ ] **Step 4: Create the helpers.**

```ts
// lib/brand/worlds.ts
import type { CanonicalServiceId } from "@/lib/services/service-catalog"

export type ServiceWorldId = "dawn" | "sky" | "dusk" | "champagne" | "rose" | "sage"
export type WorldId = ServiceWorldId | "spectrum"

export const SERVICE_WORLDS: Record<CanonicalServiceId, ServiceWorldId> = {
  "med-cert": "dawn",
  "repeat-rx": "sky",
  ed: "dusk",
  "hair-loss": "champagne",
  "womens-health": "rose",
  "weight-loss": "sage",
}

/** Literal class strings so Tailwind's scanner generates them. Tints are backgrounds only. */
export const WORLD_CLASSES: Record<ServiceWorldId, { band: string; tile: string; strongTile: string }> = {
  dawn: { band: "bg-world-dawn-50", tile: "bg-world-dawn-100", strongTile: "bg-world-dawn-200" },
  sky: { band: "bg-world-sky-50", tile: "bg-world-sky-100", strongTile: "bg-world-sky-200" },
  dusk: { band: "bg-world-dusk-50", tile: "bg-world-dusk-100", strongTile: "bg-world-dusk-200" },
  champagne: { band: "bg-world-champagne-50", tile: "bg-world-champagne-100", strongTile: "bg-world-champagne-200" },
  rose: { band: "bg-world-rose-50", tile: "bg-world-rose-100", strongTile: "bg-world-rose-200" },
  sage: { band: "bg-world-sage-50", tile: "bg-world-sage-100", strongTile: "bg-world-sage-200" },
}

/** Homepage band: sky to peach, hero and bands only. */
export const SPECTRUM_BAND = "bg-gradient-to-br from-world-sky-50 via-background to-world-dawn-50"
```

```ts
// lib/brand/surfaces.ts
/** Shared landing layout and surface classes (spec 5.4 and 5.9). Literal strings so Tailwind generates them. */
export const CONTAINER = "mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8"
export const SECTION_Y = "py-16 md:py-24"
export const SECTION_Y_COMPACT = "py-12 md:py-16"

/** In-page anchors land below the sticky header. */
export const ANCHOR_OFFSET = "scroll-mt-24"

/** One focus ring: 2 px primary (teal in dark mode through --primary) with a 2 px offset. */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"

/** DESIGN.md section 12 material: 1 px top highlight. Combines with shadow-* utilities. */
export const TACTILE_SURFACE =
  "inset-shadow-[0_1px_0_rgb(255_255_255/0.8)] dark:inset-shadow-[0_1px_0_rgb(255_255_255/0.06)]"
```

```ts
// lib/typography/nbsp.ts
export const NBSP = " "

/**
 * Keeps prices, durations and "about N minutes" from splitting across lines. Idempotent.
 * Apply at render time so source strings (and the contracts that match them) keep normal spaces.
 */
export function nbsp(text: string): string {
  return text
    .replace(/\b(From|from)[ ]+(\$\d)/g, `$1${NBSP}$2`)
    .replace(/(\d)[ ]+(days?|minutes?|min|hours?)\b/g, `$1${NBSP}$2`)
    .replace(/\babout[ ]+(\d)/g, `about${NBSP}$1`)
}
```

- [ ] **Step 5: Run the tests and typecheck.** Run `pnpm exec vitest run lib/__tests__/design-tokens-contract.test.ts lib/__tests__/nbsp.test.ts && pnpm typecheck`. Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add app/globals.css app/tailwind-shared.css lib/brand/worlds.ts lib/brand/surfaces.ts lib/typography/nbsp.ts lib/__tests__/design-tokens-contract.test.ts lib/__tests__/nbsp.test.ts
git commit -m "Add service colour worlds, shared surfaces, film grain and the nbsp helper"
```

### Task 3: Display weight and headline font loading

**Files:**
- Modify: `components/ui/heading.tsx`, `lib/fonts/money-h1.ts`, `DESIGN.md` (section 2), `lib/__tests__/money-page-lcp-critical-path.test.ts`
- Test: `lib/__tests__/landing-typography-contract.test.ts`

Both headline subsets are variable fonts with a 200–800 weight axis, so weight 450 needs no new font file. `lib/fonts/home-h1.ts` already uses `display: "swap"`. The H1 texts don't change, so the subsets need no regeneration.

- [ ] **Step 1: Write the failing test.**

```ts
// lib/__tests__/landing-typography-contract.test.ts
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8")

describe("landing typography", () => {
  it("sets the display step at weight 450 with tighter tracking", () => {
    const heading = read("components/ui/heading.tsx")
    expect(heading).toMatch(/display:\s*"font-display[^"]*font-\[450\][^"]*tracking-\[-0\.035em\]/)
    expect(heading).not.toMatch(/display:\s*"[^"]*font-light/)
  })
  it("swaps both preloaded headline subsets instead of dropping to the fallback", () => {
    for (const file of ["lib/fonts/money-h1.ts", "lib/fonts/home-h1.ts"]) {
      const font = read(file)
      expect(font, file).toContain('display: "swap"')
      expect(font, file).toContain("preload: true")
    }
  })
  it("documents the new display weight", () => {
    const design = read("DESIGN.md")
    expect(design).toMatch(/\| display \| 36px \| 48px \| 60px \| 450 \| -0\.035em \|/)
    expect(design).toContain("Weights: 450 (display only)")
  })
})
```

- [ ] **Step 2: Run it and confirm it fails.** `pnpm exec vitest run lib/__tests__/landing-typography-contract.test.ts` should report 3 failures.

- [ ] **Step 3: Implement.**
  - `components/ui/heading.tsx`: set the `display` value (lines 23–24) to `"font-display text-4xl sm:text-5xl lg:text-6xl font-[450] tracking-[-0.035em] leading-[1.04]"`.
  - `lib/fonts/money-h1.ts`: change `display: "optional"` to `display: "swap"`. Add to the doc comment: "Swap, so a slow first visit still renders the brand face once this small file arrives."
  - `DESIGN.md` section 2:
    - Change the display row (line 130) to `| display | 36px | 48px | 60px | 450 | -0.035em | Hero headlines |`.
    - Change line 146 to "Weights: 450 (display only), 400 (body), 500 (label), 600 (headings). Never 700+."
  - `lib/__tests__/money-page-lcp-critical-path.test.ts`: change the money-h1 expectation from `display: "optional"` to `display: "swap"`. Leave its `plusJakarta` layout assertions alone.

- [ ] **Step 4: Run the tests.** Run `pnpm exec vitest run lib/__tests__/landing-typography-contract.test.ts lib/__tests__/money-page-lcp-critical-path.test.ts`. Expected: PASS. The final weight is tuned between 400 and 500 at the Task 10 gate.

- [ ] **Step 5: Commit.**

```bash
git add components/ui/heading.tsx lib/fonts/money-h1.ts DESIGN.md lib/__tests__/landing-typography-contract.test.ts lib/__tests__/money-page-lcp-critical-path.test.ts
git commit -m "Set hero display weight to 450 and swap the money-page headline subset"
```

### Task 4: Approved claims for the redesign

**Files:**
- Modify: `lib/marketing/approved-claims.ts`
- Test: `lib/__tests__/landing-claims-contract.test.ts`

**Interfaces produced:** these `ApprovedClaimId` values, with their `APPROVED_CLAIMS` entries:
- `trust_no_video_call_label`, `trust_no_video_call_tooltip`
- `trust_no_call_needed_label`, `trust_no_call_needed_tooltip`
- `form_first_call_if_needed`
- `clinical_review_sequence_short`
- `clinical_governance_protocol`, `clinical_governance_doctor_review`, `clinical_governance_prescribing`
- `live_status_online`, `live_status_open`

- [ ] **Step 1: Write the failing test.**

```ts
// lib/__tests__/landing-claims-contract.test.ts
import { describe, expect, it } from "vitest"

import { APPROVED_CLAIMS, getApprovedClaim } from "@/lib/marketing/approved-claims"
import { containsBannedPhrase, containsEmDash } from "@/lib/marketing/voice"

const NEW_IDS = [
  "trust_no_video_call_label", "trust_no_video_call_tooltip",
  "trust_no_call_needed_label", "trust_no_call_needed_tooltip",
  "form_first_call_if_needed", "clinical_review_sequence_short",
  "clinical_governance_protocol", "clinical_governance_doctor_review", "clinical_governance_prescribing",
  "live_status_online", "live_status_open",
] as const

describe("landing redesign approved claims", () => {
  it("registers every new claim with sources and no em dash or banned phrase", () => {
    for (const id of NEW_IDS) {
      const claim = APPROVED_CLAIMS[id]
      expect(claim.id).toBe(id)
      expect(claim.sources.length).toBeGreaterThan(0)
      expect(containsEmDash(claim.text), id).toBe(false)
      expect(containsBannedPhrase(claim.text), id).toBeNull()
    }
  })

  it("keeps exact approved texts", () => {
    expect(getApprovedClaim("trust_no_video_call_label")).toBe("No video call")
    expect(getApprovedClaim("trust_no_call_needed_label")).toBe("No call needed")
    expect(getApprovedClaim("form_first_call_if_needed")).toBe("A doctor reviews your form and only calls if something needs checking.")
    expect(getApprovedClaim("live_status_online")).toBe("A doctor is online")
    expect(getApprovedClaim("live_status_open")).toBe("Requests open 24/7")
    expect(getApprovedClaim("clinical_governance_prescribing")).toBe("Every prescription requires a decision by an AHPRA-registered doctor.")
  })

  it("keeps the prescribing governance row identical to the approved decision model", () => {
    expect(getApprovedClaim("clinical_decision_model")).toContain(getApprovedClaim("clinical_governance_prescribing"))
  })

  it("scopes no-call to medical certificates only", () => {
    expect(APPROVED_CLAIMS.trust_no_call_needed_label.contexts).toEqual(["medical_certificate"])
    expect(APPROVED_CLAIMS.trust_no_call_needed_tooltip.contexts).toEqual(["medical_certificate"])
  })

  it("allows no-video-call and the conditional call line on prescribing surfaces", () => {
    expect(APPROVED_CLAIMS.trust_no_video_call_label.contexts).toEqual(expect.arrayContaining(["prescribing", "specialty", "platform", "medical_certificate"]))
    expect(APPROVED_CLAIMS.form_first_call_if_needed.contexts).toEqual(expect.arrayContaining(["prescribing", "specialty"]))
  })

  it("records Rey's dated Medical Director approval and attestation", () => {
    expect(APPROVED_CLAIMS.form_first_call_if_needed.notes).toMatch(/2026-09-26/)
    expect(APPROVED_CLAIMS.form_first_call_if_needed.notes).toMatch(/Medical Director/)
    expect(APPROVED_CLAIMS.trust_no_video_call_label.notes).toMatch(/2026-09-26/)
  })

  it("never lets the live claim imply a doctor count", () => {
    expect(getApprovedClaim("live_status_online")).not.toMatch(/doctors/i)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails** (the ids are not in the union yet).

- [ ] **Step 3: Implement.** Add the ids to the `ApprovedClaimId` union (lines 13–66), then add these entries to `APPROVED_CLAIMS`. `CLINICAL_RECEIPTS` (line 78) and `ADS_RECEIPTS` (line 85) already exist.

```ts
  trust_no_video_call_label: {
    id: "trust_no_video_call_label",
    text: "No video call",
    contexts: ["platform", "medical_certificate", "prescribing", "specialty"],
    risk: "low",
    sources: CLINICAL_RECEIPTS,
    notes: "Literally true: InstantMed runs no video consults (secure form, doctor messaging, phone only if needed). Approved by Rey as Medical Director, 2026-09-26.",
  },
  trust_no_video_call_tooltip: {
    id: "trust_no_video_call_tooltip",
    text: "No video consults. A doctor reviews your form and only calls if something needs checking.",
    contexts: ["platform", "medical_certificate", "prescribing", "specialty"],
    risk: "medium",
    sources: CLINICAL_RECEIPTS,
    notes: "Qualifier for the no-video-call moat badge. Approved by Rey as Medical Director, 2026-09-26.",
  },
  trust_no_call_needed_label: {
    id: "trust_no_call_needed_label",
    text: "No call needed",
    contexts: ["medical_certificate"],
    risk: "high",
    sources: [...CLINICAL_RECEIPTS, ...ADS_RECEIPTS],
    notes: "Certificate surfaces only; never on prescribing or specialty pages. Pair with trust_no_call_needed_tooltip where space allows. Fallback if compliance withdraws it: trust_simple_cert_label.",
  },
  trust_no_call_needed_tooltip: {
    id: "trust_no_call_needed_tooltip",
    text: "Suitable certificate requests are handled from the secure form. If something needs checking, a doctor may contact you.",
    contexts: ["medical_certificate"],
    risk: "medium",
    sources: CLINICAL_RECEIPTS,
    notes: "Qualifier for the certificate no-call badge.",
  },
  form_first_call_if_needed: {
    id: "form_first_call_if_needed",
    text: "A doctor reviews your form and only calls if something needs checking.",
    contexts: ["platform", "prescribing", "specialty"],
    risk: "medium",
    sources: CLINICAL_RECEIPTS,
    notes: "Medical Director approval and attestation (Rey, 2026-09-26): doctor phone calls to gather more information occurred in about 2 of several hundred requests. By that decision, this deliberately supersedes the form_first_wedge caution about implying contact is rare. Conditional wording never constrains a clinically indicated call (docs/CLINICAL.md form-first model). Leads the redesigned pages; form_first_wedge stays approved.",
  },
  clinical_review_sequence_short: {
    id: "clinical_review_sequence_short",
    text: "A doctor or our doctor-approved clinical protocol checks your request. Every prescription needs a doctor's decision.",
    contexts: ["platform", "medical_certificate", "prescribing", "specialty"],
    risk: "medium",
    sources: CLINICAL_RECEIPTS,
    notes: "Short How it works step. The long form stays in clinical_review_sequence inside More detail.",
  },
  clinical_governance_protocol: {
    id: "clinical_governance_protocol",
    text: "Standard certificates can follow our Medical Director-approved protocol.",
    contexts: ["governance", "medical_certificate", "platform"],
    risk: "medium",
    sources: CLINICAL_RECEIPTS,
    notes: "ClinicalModelPanel row 1. Matches the docs/CLINICAL.md protocol scope.",
  },
  clinical_governance_doctor_review: {
    id: "clinical_governance_doctor_review",
    text: "Anything concerning or uncertain goes to an AHPRA-registered doctor before it's issued.",
    contexts: ["governance", "medical_certificate", "platform", "prescribing", "specialty"],
    risk: "medium",
    sources: CLINICAL_RECEIPTS,
    notes: "ClinicalModelPanel row 2. docs/CLINICAL.md: concerning or uncertain requests route to a doctor before issue.",
  },
  clinical_governance_prescribing: {
    id: "clinical_governance_prescribing",
    text: "Every prescription requires a decision by an AHPRA-registered doctor.",
    contexts: ["governance", "platform", "prescribing", "specialty"],
    risk: "low",
    sources: CLINICAL_RECEIPTS,
    notes: "ClinicalModelPanel row 3. Same wording as the final sentence of clinical_decision_model.",
  },
  live_status_online: {
    id: "live_status_online",
    text: "A doctor is online",
    contexts: ["platform", "medical_certificate", "prescribing"],
    risk: "medium",
    sources: CLINICAL_RECEIPTS,
    notes: "Only via LiveStatus when getLiveStatus returns online (an available doctor with their own clinical activity in the last 90 minutes). Singular on purpose: the plural implies a doctor count.",
  },
  live_status_open: {
    id: "live_status_open",
    text: "Requests open 24/7",
    contexts: ["platform", "medical_certificate", "prescribing", "specialty"],
    risk: "low",
    sources: CLINICAL_RECEIPTS,
    notes: "LiveStatus fallback. Never 'offline' and never an hours window (hours-copy contract).",
  },
```

Keep the `contexts` values inside the existing context union. If `"governance"` is not a member, use the member the registry already uses for governance copy (check `doctor_registration`'s contexts) and change the entries to match.

- [ ] **Step 4: Run the tests.** Run `pnpm exec vitest run lib/__tests__/landing-claims-contract.test.ts lib/__tests__/approved-claims-contract.test.ts lib/__tests__/voice-guard.test.ts && pnpm typecheck`. Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib/marketing/approved-claims.ts lib/__tests__/landing-claims-contract.test.ts
git commit -m "Register the redesign's approved moat, live-status and clinical-model claims"
```

### Task 5: `MoatBadge` and the no-call guard

**Files:**
- Create: `components/marketing/moat-badge.tsx` (server-safe), `components/marketing/moat-qualifier.tsx` (client)
- Modify:
  - `lib/marketing/trust-badges.ts`: add `no_video_call` and restyle `no_appointment`.
  - `components/shared/trust-badge.tsx`: delegate the moat ids.
  - `app/globals.css`: check-draw keyframes.
  - `lib/__tests__/trust-badges.test.ts`: 27 ids.
- Test: `lib/__tests__/moat-badge-contract.test.tsx`

**Interfaces produced:**
- Types: `MoatClaim = "no-appointment" | "no-video-call" | "no-call"`, `MoatSize = "sm" | "md"`, `MoatSurface = "certificate" | "general"`.
- `MoatBadge(props)`, taking either:
  - `{ claim: "no-appointment" | "no-video-call"; size?; qualifier?; animateCheck?; className? }`, or
  - `{ claim: "no-call"; service: "med-cert"; … }`.
- `MoatBadgePair({ surface, size?, qualifier?, animateCheck?, className? })`.
- `MoatQualifier({ label, tooltip })`.

- [ ] **Step 1: Write the failing test.**

```tsx
// lib/__tests__/moat-badge-contract.test.tsx
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { MoatBadge, MoatBadgePair } from "@/components/marketing/moat-badge"
import { TrustBadge } from "@/components/shared/trust-badge"

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      if (!/node_modules|\.next|__tests__/.test(path)) walk(path, out)
    } else if (/\.tsx?$/.test(entry)) out.push(relative(root, path))
  }
  return out
}

/** Only these files may render or pass the certificate no-call claim. */
const NO_CALL_ALLOWED = new Set([
  "components/marketing/moat-badge.tsx",
  "components/shared/trust-badge.tsx",
  "components/marketing/med-cert-landing.tsx",
  "components/marketing/med-cert-client-controls.tsx",
  "components/marketing/home/service-menu.tsx",
  "components/marketing/home/services-overview.tsx",
  "components/shared/navbar/services-dropdown.tsx",
  "components/shared/navbar/mobile-menu-content.tsx",
  "app/medical-certificate/opengraph-image.tsx",
])
const NO_CALL_MARKERS = /claim="no-call"|surface="certificate"|moat="certificate"|trust_no_call_needed_label/

describe("moat badge", () => {
  it("renders registry text with a decorative check and an accessible qualifier button", () => {
    const html = renderToStaticMarkup(<MoatBadge claim="no-appointment" />)
    expect(html).toContain("No appointment")
    expect(html).toContain('data-moat-badge="no-appointment"')
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/)
    expect(html).toMatch(/aria-label="About &quot;No appointment&quot;"/)
  })

  it("omits the qualifier button when asked (for use inside links)", () => {
    const html = renderToStaticMarkup(<MoatBadge claim="no-video-call" size="sm" qualifier={false} />)
    expect(html).toContain("No video call")
    expect(html).not.toContain("<button")
  })

  it("pairs certificate and general claims correctly", () => {
    const cert = renderToStaticMarkup(<MoatBadgePair surface="certificate" qualifier={false} />)
    expect(cert.indexOf("No call needed")).toBeLessThan(cert.indexOf("No appointment"))
    const general = renderToStaticMarkup(<MoatBadgePair surface="general" qualifier={false} />)
    expect(general).toContain("No appointment")
    expect(general).toContain("No video call")
    expect(general).not.toContain("No call needed")
  })

  it("delegates the moat ids from TrustBadge", () => {
    expect(renderToStaticMarkup(<TrustBadge id="no_appointment" />)).toContain('data-moat-badge="no-appointment"')
    expect(renderToStaticMarkup(<TrustBadge id="no_video_call" />)).toContain('data-moat-badge="no-video-call"')
    expect(renderToStaticMarkup(<TrustBadge id="no_call" />)).toContain('data-moat-badge="no-call"')
  })

  it("never types the moat labels as literals", () => {
    const src = read("components/marketing/moat-badge.tsx")
    expect(src).not.toMatch(/"No (appointment|video call|call needed)"/)
    expect(src).toContain("getApprovedClaim(")
  })

  it("confines the no-call claim to certificate-scoped files", () => {
    const offenders = [...walk(join(root, "app")), ...walk(join(root, "components"))]
      .filter((file) => NO_CALL_MARKERS.test(read(file)) && !NO_CALL_ALLOWED.has(file))
    expect(offenders).toEqual([])
  })

  it("keeps prescribing and specialty landing files free of no-call markers", () => {
    for (const file of [
      "components/marketing/prescriptions-landing.tsx",
      "components/marketing/prescriptions-client-controls.tsx",
      "components/marketing/erectile-dysfunction-landing.tsx",
      "components/marketing/hair-loss-landing.tsx",
      "components/marketing/womens-health-landing.tsx",
      "components/marketing/weight-loss-landing.tsx",
    ]) {
      expect(read(file), file).not.toMatch(NO_CALL_MARKERS)
    }
  })
})
```

If `TrustBadge` requires props beyond `id`, pass the minimum its type demands. If a specialty landing file listed above does not exist under that name, point the test at the real file (`ls components/marketing/*landing*.tsx`).

- [ ] **Step 2: Run it and confirm it fails** (the module is missing).

- [ ] **Step 3: Implement the components.**

```tsx
// components/marketing/moat-badge.tsx
// Server-safe: no hooks. Only the qualifier popover is a client island.
import { TACTILE_SURFACE } from "@/lib/brand/surfaces"
import { type ApprovedClaimId, getApprovedClaim } from "@/lib/marketing/approved-claims"
import { cn } from "@/lib/utils"

import { MoatQualifier } from "./moat-qualifier"

export type MoatClaim = "no-appointment" | "no-video-call" | "no-call"
export type MoatSize = "sm" | "md"
export type MoatSurface = "certificate" | "general"

interface MoatBadgeBaseProps {
  size?: MoatSize
  /** Shows the "i" qualifier popover. Pass false inside links (a button cannot sit inside <a>). */
  qualifier?: boolean
  /** Draws the check once on first paint (hero only). */
  animateCheck?: boolean
  className?: string
}

export type MoatBadgeProps =
  | (MoatBadgeBaseProps & { claim: "no-appointment" | "no-video-call" })
  | (MoatBadgeBaseProps & { claim: "no-call"; service: "med-cert" })

const CLAIMS: Record<MoatClaim, { label: ApprovedClaimId; tooltip: ApprovedClaimId }> = {
  "no-appointment": { label: "trust_no_appointment_label", tooltip: "trust_no_appointment_tooltip" },
  "no-video-call": { label: "trust_no_video_call_label", tooltip: "trust_no_video_call_tooltip" },
  "no-call": { label: "trust_no_call_needed_label", tooltip: "trust_no_call_needed_tooltip" },
}

export function MoatBadge(props: MoatBadgeProps) {
  const { claim, size = "md", qualifier = true, animateCheck = false, className } = props
  const label = getApprovedClaim(CLAIMS[claim].label)
  const tooltip = getApprovedClaim(CLAIMS[claim].tooltip)
  const isMd = size === "md"

  return (
    <span data-moat-badge={claim} className={cn("inline-flex items-center gap-1", className)}>
      <span
        className={cn(
          "inline-flex items-center whitespace-nowrap rounded-full border border-[var(--moat-border)] bg-gradient-to-b from-[var(--moat-bg-from)] to-[var(--moat-bg-to)] font-semibold text-[var(--moat-text)] shadow-[0_1px_2px_rgba(5,150,105,0.08)]",
          TACTILE_SURFACE,
          isMd ? "h-[34px] gap-1.5 px-3.5 text-base" : "h-[26px] gap-1.5 px-2.5 text-sm",
        )}
      >
        <MoatCheck size={isMd ? 16 : 14} animate={animateCheck} />
        {label}
      </span>
      {qualifier ? <MoatQualifier label={label} tooltip={tooltip} /> : null}
    </span>
  )
}

function MoatCheck({ size, animate }: { size: number; animate: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="shrink-0">
      <circle cx="8" cy="8" r="8" fill="var(--moat-glyph)" />
      <path
        d="M4.6 8.3l2.1 2.1 4.7-4.8"
        fill="none"
        stroke="var(--moat-check)"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className={animate ? "moat-check-draw" : undefined}
      />
    </svg>
  )
}

export function MoatBadgePair({
  surface,
  size = "md",
  qualifier = true,
  animateCheck = false,
  className,
}: {
  surface: MoatSurface
  size?: MoatSize
  qualifier?: boolean
  animateCheck?: boolean
  className?: string
}) {
  const shared = { size, qualifier, animateCheck }
  return (
    <div data-moat-pair={surface} className={cn("flex flex-wrap items-center gap-2", className)}>
      {surface === "certificate" ? (
        <>
          <MoatBadge claim="no-call" service="med-cert" {...shared} />
          <MoatBadge claim="no-appointment" {...shared} />
        </>
      ) : (
        <>
          <MoatBadge claim="no-appointment" {...shared} />
          <MoatBadge claim="no-video-call" {...shared} />
        </>
      )}
    </div>
  )
}
```

```tsx
// components/marketing/moat-qualifier.tsx
"use client"

import { Info } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { FOCUS_RING } from "@/lib/brand/surfaces"
import { cn } from "@/lib/utils"

/** 24 px visual "i" with a 44 px hit area (spec 6.7 and section 8). */
export function MoatQualifier({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`About "${label}"`}
          className={cn(
            "relative inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 before:absolute before:-inset-2.5 before:content-[''] hover:text-foreground motion-reduce:transition-none",
            FOCUS_RING,
          )}
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="max-w-[260px] text-sm leading-relaxed">
        {tooltip}
      </PopoverContent>
    </Popover>
  )
}
```

Append to `app/globals.css`:

```css
@keyframes moat-check-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
.moat-check-draw { stroke-dasharray: 1; animation: moat-check-draw 260ms cubic-bezier(0, 0, 0.2, 1) 200ms both; }
@media (prefers-reduced-motion: reduce) { .moat-check-draw { animation: none; stroke-dasharray: none; } }
```

- [ ] **Step 4: Wire the badge system.**
  - **`lib/marketing/trust-badges.ts`:**
    - Add `'no_video_call'` to `BadgeId`.
    - Add this registry entry (import `VideoOff` from lucide-react): `no_video_call: { id: 'no_video_call', label: getApprovedClaim("trust_no_video_call_label"), icon: VideoOff, iconColor: 'text-emerald-600', pillClass: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300', hasStyledTier: true, tooltip: getApprovedClaim("trust_no_video_call_tooltip") }`.
    - Change `no_appointment.iconColor` and `pillClass` to the same emerald values.
  - **`components/shared/trust-badge.tsx`:** at the top of `TrustBadge`, return:
    - `<MoatBadge claim="no-appointment" size="sm" qualifier={false} className={className} />` for `no_appointment`;
    - `<MoatBadge claim="no-video-call" size="sm" qualifier={false} className={className} />` for `no_video_call`;
    - `<MoatBadge claim="no-call" service="med-cert" size="sm" qualifier={false} className={className} />` for `no_call`.

    Then delete the unreachable styled cases in the `switch` at line 600, including their looping pulse and X-draw animations. The only preset containing `no_call` is `hero_medcert`, which no page uses, so the label change from "No call for simple certs" to "No call needed" appears only on certificate surfaces.
  - **`lib/__tests__/trust-badges.test.ts`:** change the expected id count from 26 to 27 and add `'no_video_call'` wherever styled-tier ids are listed.
  - **`lib/__tests__/advertising-compliance-guard.test.ts`:** keep `NO_CALL_PATTERNS` (line 218) unchanged. Add a comment above it recording three things:
    - `form_first_call_if_needed` and the `trust_no_video_call_*` claims are Medical Director-approved (Rey, 2026-09-26) and intentionally not matched.
    - The certificate-only `trust_no_call_needed_*` claims are confined by `moat-badge-contract`.
    - Surface files must never type the no-call phrase literally; they render it through `MoatBadge`, whose `claim="no-call"` prop the patterns do not match.

- [ ] **Step 5: Run the tests.** Run `pnpm exec vitest run lib/__tests__/moat-badge-contract.test.tsx lib/__tests__/trust-badges.test.ts lib/__tests__/advertising-compliance-guard.test.ts && pnpm typecheck && pnpm exec eslint components/marketing/moat-badge.tsx components/marketing/moat-qualifier.tsx components/shared/trust-badge.tsx lib/marketing/trust-badges.ts`. Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add components/marketing/moat-badge.tsx components/marketing/moat-qualifier.tsx components/shared/trust-badge.tsx lib/marketing/trust-badges.ts app/globals.css lib/__tests__/moat-badge-contract.test.tsx lib/__tests__/trust-badges.test.ts
git commit -m "Add the green MoatBadge primitive with a certificate-only no-call guard"
```

### Task 6: Truthful `LiveStatus`

**Files:**
- Create: `lib/brand/live-status.ts`, `components/marketing/live-status.tsx`
- Modify: `app/globals.css` (glow keyframes)
- Test: `lib/__tests__/live-status.test.tsx`

**Interfaces produced:**
- `LIVE_ACTIVITY_WINDOW_MINUTES = 90`.
- `LiveStatusState`: `{ kind: "online"; medianMinutes?: number }` or `{ kind: "open" }`.
- `LiveStatusSignals = { availableClinicians: number; recentClinicianActivity: number; certificateWait?: WaitState }`.
- `resolveLiveStatus(signals: LiveStatusSignals | null, options: { withMedian: boolean }): LiveStatusState`.
- `getLiveStatus(options: { withMedian: boolean }): Promise<LiveStatusState>`.
- `<LiveStatus state={LiveStatusState} />`.

The spec's `hidden` state (maintenance or a disabled service) comes from the Hero's existing `ServiceAvailabilityGate` around the status slot (Task 9), not from this module.

- [ ] **Step 1: Write the failing test.**

```tsx
// lib/__tests__/live-status.test.tsx
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ unstable_cache: <T,>(fn: T) => fn }))
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: vi.fn() }))
vi.mock("@/lib/brand/wait-counter", () => ({ getWaitState: vi.fn(async () => ({ variant: "hidden" })) }))

import { LiveStatus } from "@/components/marketing/live-status"
import { getLiveStatus, resolveLiveStatus } from "@/lib/brand/live-status"
import { SYSTEM_AUTO_APPROVE_ID } from "@/lib/constants"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

type Result = { data?: unknown; count?: number | null; error?: unknown }
function chain(result: Result) {
  const builder: Record<string, unknown> = {}
  for (const method of ["select", "in", "eq", "not", "gte", "or"]) builder[method] = () => builder
  builder.then = (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return builder
}
function mockDb(tables: { profiles: Result; intakes: Result }) {
  vi.mocked(createServiceRoleClient).mockReturnValue({
    from: (table: "profiles" | "intakes") => chain(tables[table]),
  } as never)
}

const liveWait = { variant: "live", medianMinutes: 16, sampleSize: 12, newestSampleAgeMinutes: 20, queueP95Minutes: 30, service: "med-cert" } as const

describe("resolveLiveStatus", () => {
  it("is open when the signals are unavailable", () => {
    expect(resolveLiveStatus(null, { withMedian: true })).toEqual({ kind: "open" })
  })
  it("is open when a doctor is available but idle, or active but unavailable", () => {
    expect(resolveLiveStatus({ availableClinicians: 1, recentClinicianActivity: 0 }, { withMedian: false })).toEqual({ kind: "open" })
    expect(resolveLiveStatus({ availableClinicians: 0, recentClinicianActivity: 3 }, { withMedian: false })).toEqual({ kind: "open" })
  })
  it("adds the certificate median only when the speed claim qualifies", () => {
    expect(resolveLiveStatus({ availableClinicians: 1, recentClinicianActivity: 2, certificateWait: liveWait }, { withMedian: true }))
      .toEqual({ kind: "online", medianMinutes: 16 })
    expect(resolveLiveStatus({ availableClinicians: 1, recentClinicianActivity: 2, certificateWait: { ...liveWait, sampleSize: 2 } }, { withMedian: true }))
      .toEqual({ kind: "online" })
    expect(resolveLiveStatus({ availableClinicians: 1, recentClinicianActivity: 2, certificateWait: liveWait }, { withMedian: false }))
      .toEqual({ kind: "online" })
  })
})

describe("getLiveStatus", () => {
  it("falls back to open when the clinician query fails", async () => {
    mockDb({ profiles: { data: null, error: { message: "boom" } }, intakes: { count: 4, error: null } })
    await expect(getLiveStatus({ withMedian: true })).resolves.toEqual({ kind: "open" })
  })
  it("is open when an available doctor has no activity in the window", async () => {
    mockDb({ profiles: { data: [{ id: "doc-1" }], error: null }, intakes: { count: 0, error: null } })
    await expect(getLiveStatus({ withMedian: false })).resolves.toEqual({ kind: "open" })
  })
  it("is online when an available doctor was recently active", async () => {
    mockDb({ profiles: { data: [{ id: "doc-1" }], error: null }, intakes: { count: 1, error: null } })
    await expect(getLiveStatus({ withMedian: false })).resolves.toEqual({ kind: "online" })
  })
  it("never counts the auto-approval system actor as a doctor", async () => {
    mockDb({ profiles: { data: [{ id: SYSTEM_AUTO_APPROVE_ID }], error: null }, intakes: { count: 9, error: null } })
    await expect(getLiveStatus({ withMedian: false })).resolves.toEqual({ kind: "open" })
  })
})

describe("LiveStatus", () => {
  it("renders the approved online line with a glowing dot and a divider before the median", () => {
    const html = renderToStaticMarkup(<LiveStatus state={{ kind: "online", medianMinutes: 16 }} />)
    expect(html).toContain("A doctor is online")
    expect(html).toContain("live-glow")
    expect(html).toContain("Certificates: median ~16 min over the last 24 hours")
    expect(html).not.toContain("·")
  })
  it("falls back to the 24/7 line without a glow", () => {
    const html = renderToStaticMarkup(<LiveStatus state={{ kind: "open" }} />)
    expect(html).toContain("Requests open 24/7")
    expect(html).not.toContain("live-glow")
  })
  it("never claims live review activity or a doctor count", () => {
    for (const state of [{ kind: "online" as const }, { kind: "open" as const }]) {
      const html = renderToStaticMarkup(<LiveStatus state={state} />)
      expect(html).not.toMatch(/right now|is reviewing|are reviewing|doctors online|reviewing now/i)
    }
  })
})
```

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement the data module.**

```ts
// lib/brand/live-status.ts
import { unstable_cache } from "next/cache"

import { getWaitState, type WaitState } from "@/lib/brand/wait-counter"
import { SYSTEM_AUTO_APPROVE_ID } from "@/lib/constants"
import { filterSeededE2EIntakes } from "@/lib/data/seeded-e2e-data"
import { buildMedCertSpeedClaimFromWaitState } from "@/lib/marketing/speed-claims"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("live-status")

export const LIVE_ACTIVITY_WINDOW_MINUTES = 90
/** E2E clinician fixtures are created under this domain (lib/data/seeded-e2e-data.ts). */
const TEST_CLINICIAN_EMAIL_PATTERN = "%@test.instantmed.com.au"

export type LiveStatusState = { kind: "online"; medianMinutes?: number } | { kind: "open" }

export interface LiveStatusSignals {
  availableClinicians: number
  recentClinicianActivity: number
  certificateWait?: WaitState
}

export function resolveLiveStatus(
  signals: LiveStatusSignals | null,
  { withMedian }: { withMedian: boolean },
): LiveStatusState {
  if (!signals || signals.availableClinicians < 1 || signals.recentClinicianActivity < 1) return { kind: "open" }
  const wait = signals.certificateWait
  if (withMedian && wait?.medianMinutes && buildMedCertSpeedClaimFromWaitState(wait).status === "under_hour") {
    return { kind: "online", medianMinutes: wait.medianMinutes }
  }
  return { kind: "online" }
}

async function readSignals(): Promise<LiveStatusSignals | null> {
  try {
    const supabase = createServiceRoleClient()
    const since = new Date(Date.now() - LIVE_ACTIVITY_WINDOW_MINUTES * 60_000).toISOString()
    const [clinicians, certificateWait] = await Promise.all([
      supabase.from("profiles").select("id")
        .in("role", ["doctor", "admin"])
        .eq("doctor_available", true)
        .not("email", "ilike", TEST_CLINICIAN_EMAIL_PATTERN),
      getWaitState(new Date(), "med-cert"),
    ])
    if (clinicians.error) {
      log.warn("live-status clinician query failed")
      return null
    }
    const ids = ((clinicians.data ?? []) as { id: string }[])
      .map((row) => row.id)
      .filter((id) => id !== SYSTEM_AUTO_APPROVE_ID)
    if (ids.length === 0) return { availableClinicians: 0, recentClinicianActivity: 0, certificateWait }

    // Activity must come from the doctors who are marked available, never the auto-approval actor.
    const [reviewed, claimed] = await Promise.all([
      filterSeededE2EIntakes(
        supabase.from("intakes").select("id", { count: "exact", head: true })
          .in("reviewed_by", ids)
          .gte("reviewed_at", since)
          .or("ai_approved.is.null,ai_approved.eq.false"),
      ),
      filterSeededE2EIntakes(
        supabase.from("intakes").select("id", { count: "exact", head: true })
          .in("claimed_by", ids)
          .gte("claimed_at", since),
      ),
    ])
    if (reviewed.error || claimed.error) {
      log.warn("live-status activity query failed")
      return null
    }
    return {
      availableClinicians: ids.length,
      recentClinicianActivity: (reviewed.count ?? 0) + (claimed.count ?? 0),
      certificateWait,
    }
  } catch (error) {
    log.warn("live-status signals unavailable", { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

const getCachedSignals = unstable_cache(readSignals, ["live-status-signals-v1"], { revalidate: 60 })

/** Server only. Returns a state, never a count or a name. */
export async function getLiveStatus({ withMedian }: { withMedian: boolean }): Promise<LiveStatusState> {
  return resolveLiveStatus(await getCachedSignals(), { withMedian })
}
```

If TypeScript rejects `filterSeededE2EIntakes` around a count builder, cast the builder the same way `lib/brand/wait-counter.ts` does around `filterReportableIntakes`.

- [ ] **Step 4: Implement the component** and append the glow keyframes to `app/globals.css`.

```tsx
// components/marketing/live-status.tsx
import type { LiveStatusState } from "@/lib/brand/live-status"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { cn } from "@/lib/utils"

export function LiveStatus({ state, className }: { state: LiveStatusState; className?: string }) {
  const online = state.kind === "online"
  return (
    <p data-live-status={state.kind} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-6 text-muted-foreground", className)}>
      <span className="inline-flex items-center gap-2">
        <span aria-hidden="true" className={cn("h-2 w-2 shrink-0 rounded-full bg-success", online && "live-glow")} />
        <span className={cn(online && "font-medium text-foreground")}>
          {getApprovedClaim(online ? "live_status_online" : "live_status_open")}
        </span>
      </span>
      {online && state.medianMinutes ? (
        <>
          <span aria-hidden="true" className="h-3.5 w-px bg-border" />
          <span className="tabular-nums">Certificates: median ~{state.medianMinutes} min over the last 24 hours</span>
        </>
      ) : null}
    </p>
  )
}
```

```css
@keyframes live-glow {
  0%, 100% { box-shadow: 0 0 0 3px rgb(34 197 94 / 0.18); }
  50% { box-shadow: 0 0 0 7px rgb(34 197 94 / 0); }
}
/* Three breaths (4.8 s, inside WCAG 2.2.2's five seconds), then a steady glow. */
.live-glow { box-shadow: 0 0 0 3px rgb(34 197 94 / 0.18); animation: live-glow 1.6s ease-in-out 3; }
@media (prefers-reduced-motion: reduce) { .live-glow { animation: none; } }
```

- [ ] **Step 5: Run the tests.** Run `pnpm exec vitest run lib/__tests__/live-status.test.tsx lib/__tests__/wait-counter-unverified-state-contract.test.tsx && pnpm typecheck`. Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add lib/brand/live-status.ts components/marketing/live-status.tsx app/globals.css lib/__tests__/live-status.test.tsx
git commit -m "Add truthful LiveStatus gated on an available doctor's own recent activity"
```

### Task 7: Art system scaffold and the four gate pieces

**Files:**
- Create: `components/brand/art.tsx`
- Create: `components/brand/marks/{certificate-mark,repeat-rx-mark,index}.tsx`
- Create: `components/brand/illustrations/{form-on-phone,certificate-arrives,index}.tsx`
- Create: `scripts/design/render-art-sheet.tsx`
- Test: `lib/__tests__/brand-art-contract.test.tsx`

**Interfaces produced:**
- `ArtWorld = ServiceWorldId | "spectrum"` and `ART_STROKE = 1.75`.
- `ArtSvg({ world, viewBox, className, children })`.
- `MarkProps = { world?: ArtWorld; className?: string }` and `SceneProps = { world: ArtWorld; className?: string }`.
- `SERVICE_MARK_COMPONENTS: Partial<Record<CanonicalServiceId, ComponentType<MarkProps>>>` (completed in Task 11).
- `ServiceMark({ service, size?: 40 | 48 | 56, className? })`.
- `SceneId` (widened in Task 11), `SCENE_COMPONENTS` and `Scene({ id, world, className? })`.

Load `web-design` now. The art must follow spec 5.2:
- one rounded line: `stroke="var(--art-ink)"` at 1.75, with round caps and joins;
- fills `var(--art-fill-1)` and `var(--art-fill-2)`, plus white highlights at 90%;
- at most one coral detail;
- no people, faces, hands, medicine, pens, stethoscopes or lettering;
- light and dark through variables only.

- [ ] **Step 1: Write the failing contract.**

```tsx
// lib/__tests__/brand-art-contract.test.tsx
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ServiceMark } from "@/components/brand/marks"
import { Scene } from "@/components/brand/illustrations"

const root = process.cwd()
const files = ["components/brand/marks", "components/brand/illustrations"].flatMap((dir) =>
  readdirSync(join(root, dir)).filter((f) => f.endsWith(".tsx")).map((f) => `${dir}/${f}`))
const pieces = files.filter((f) => !f.endsWith("index.tsx"))

describe("brand art", () => {
  it("draws with variables, never raw colours, filters, text, images or people and medicine", () => {
    for (const file of files) {
      const src = readFileSync(join(root, file), "utf8")
      expect(src, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      expect(src, file).not.toMatch(/blur|<filter|feGaussianBlur|<image|<text|<foreignObject/)
      expect(src, file).not.toMatch(/\b(pill|capsule|syringe|needle|injection|face|person|avatar|hand|stethoscope)\b/i)
    }
  })

  it("renders decorative SVG only", () => {
    const html = renderToStaticMarkup(<><ServiceMark service="med-cert" /><Scene id="form-on-phone" world="dawn" /></>)
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*focusable="false"/)
    expect(html).not.toContain("<title")
  })

  it("uses at most one coral detail per piece", () => {
    for (const file of pieces) {
      const src = readFileSync(join(root, file), "utf8")
      expect((src.match(/var\(--brand-coral\)/g) ?? []).length, file).toBeLessThanOrEqual(1)
    }
  })
})
```

The coral token is `--brand-coral` if `app/globals.css` defines it. If it doesn't, add `--brand-coral: #FF6B5B;` to the light `:root` block in this task, since coral is decorative only.

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement the scaffold and the four gate pieces.**

```tsx
// components/brand/art.tsx
import type { CSSProperties, ReactNode } from "react"

import type { ServiceWorldId } from "@/lib/brand/worlds"
import { cn } from "@/lib/utils"

export type ArtWorld = ServiceWorldId | "spectrum"
export const ART_STROKE = 1.75

const WORLD_FILLS: Record<ArtWorld, [string, string]> = {
  dawn: ["var(--world-dawn-100)", "var(--world-dawn-200)"],
  sky: ["var(--world-sky-100)", "var(--world-sky-200)"],
  dusk: ["var(--world-dusk-100)", "var(--world-dusk-200)"],
  champagne: ["var(--world-champagne-100)", "var(--world-champagne-200)"],
  rose: ["var(--world-rose-100)", "var(--world-rose-200)"],
  sage: ["var(--world-sage-100)", "var(--world-sage-200)"],
  spectrum: ["var(--world-sky-100)", "var(--world-dawn-200)"],
}

export interface MarkProps { world?: ArtWorld; className?: string }
export interface SceneProps { world: ArtWorld; className?: string }

export function ArtSvg({ world, viewBox, className, children }: { world: ArtWorld; viewBox: string; className?: string; children: ReactNode }) {
  const [fill1, fill2] = WORLD_FILLS[world]
  const style = { "--art-fill-1": fill1, "--art-fill-2": fill2 } as CSSProperties
  return (
    <svg
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
      className={cn("block", className)}
      style={style}
      fill="none"
      stroke="var(--art-ink)"
      strokeWidth={ART_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}
```

```tsx
// components/brand/marks/certificate-mark.tsx
import { ArtSvg, type MarkProps } from "../art"

/** A document with a folded corner and a seal. */
export function CertificateMark({ world = "dawn", className }: MarkProps) {
  return (
    <ArtSvg world={world} viewBox="0 0 48 48" className={className}>
      <path d="M14 7h14l8 8v24a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" fill="var(--art-fill-1)" />
      <path d="M28 7v6a2 2 0 0 0 2 2h6" />
      <path d="M17 20h9M17 25h13" />
      <circle cx="29.5" cy="32.5" r="5" fill="var(--art-fill-2)" />
      <circle cx="29.5" cy="32.5" r="1.5" fill="var(--brand-coral)" stroke="none" />
    </ArtSvg>
  )
}
```

```tsx
// components/brand/marks/repeat-rx-mark.tsx
import { ArtSvg, type MarkProps } from "../art"

/** A phone with a circular repeat arrow and a token chip. */
export function RepeatRxMark({ world = "sky", className }: MarkProps) {
  return (
    <ArtSvg world={world} viewBox="0 0 48 48" className={className}>
      <rect x="14" y="6" width="20" height="36" rx="4" fill="var(--art-fill-1)" />
      <path d="M21 10h6" />
      <rect x="18" y="17" width="12" height="9" rx="2" fill="var(--art-fill-2)" />
      <path d="M21 21.5h6" />
      <path d="M18.5 33a5.5 5.5 0 0 0 10 1.5M29.5 30a5.5 5.5 0 0 0-10-1.5" />
      <path d="M28.6 34.8l.3-1.4 1.4.3M19.4 27.2l-.3 1.4-1.4-.3" />
    </ArtSvg>
  )
}
```

```tsx
// components/brand/marks/index.tsx
import type { ComponentType } from "react"

import { SERVICE_WORLDS, WORLD_CLASSES } from "@/lib/brand/worlds"
import type { CanonicalServiceId } from "@/lib/services/service-catalog"
import { cn } from "@/lib/utils"

import type { MarkProps } from "../art"
import { CertificateMark } from "./certificate-mark"
import { RepeatRxMark } from "./repeat-rx-mark"

/** Completed for all six services in Task 11. */
export const SERVICE_MARK_COMPONENTS: Partial<Record<CanonicalServiceId, ComponentType<MarkProps>>> = {
  "med-cert": CertificateMark,
  "repeat-rx": RepeatRxMark,
}

export function ServiceMark({ service, size = 48, className }: { service: CanonicalServiceId; size?: 40 | 48 | 56; className?: string }) {
  const Mark = SERVICE_MARK_COMPONENTS[service]
  if (!Mark) return null
  const world = SERVICE_WORLDS[service]
  return (
    <span
      data-service-mark={service}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-xl border border-black/5 dark:border-white/10", WORLD_CLASSES[world].tile, className)}
      style={{ width: size, height: size }}
    >
      <Mark world={world} className="h-[72%] w-[72%]" />
    </span>
  )
}
```

```tsx
// components/brand/illustrations/form-on-phone.tsx
import { ArtSvg, type SceneProps } from "../art"

/** A phone showing a short secure form with two answered questions. */
export function FormOnPhoneScene({ world, className }: SceneProps) {
  return (
    <ArtSvg world={world} viewBox="0 0 320 240" className={className}>
      <ellipse cx="160" cy="212" rx="96" ry="10" fill="var(--art-fill-1)" stroke="none" />
      <rect x="110" y="24" width="100" height="184" rx="16" fill="var(--art-fill-1)" />
      <path d="M146 36h28" />
      <rect x="124" y="58" width="72" height="22" rx="6" fill="var(--art-fill-2)" />
      <path d="M130 69h40" />
      <circle cx="130" cy="98" r="6" fill="var(--art-fill-2)" />
      <path d="M127.5 98l1.8 1.8 3.4-3.6" />
      <path d="M142 98h46" />
      <circle cx="130" cy="120" r="6" fill="var(--art-fill-2)" />
      <path d="M127.5 120l1.8 1.8 3.4-3.6" />
      <path d="M142 120h38" />
      <circle cx="130" cy="142" r="6" />
      <path d="M142 142h42" />
      <rect x="124" y="170" width="72" height="20" rx="10" fill="var(--art-fill-2)" />
      <path d="M150 180h20" />
      <circle cx="232" cy="64" r="5" fill="var(--brand-coral)" stroke="none" />
    </ArtSvg>
  )
}
```

```tsx
// components/brand/illustrations/certificate-arrives.tsx
import { ArtSvg, type SceneProps } from "../art"

/** An envelope with a certificate card rising out and a secure-link glyph. */
export function CertificateArrivesScene({ world, className }: SceneProps) {
  return (
    <ArtSvg world={world} viewBox="0 0 320 240" className={className}>
      <ellipse cx="160" cy="214" rx="110" ry="10" fill="var(--art-fill-1)" stroke="none" />
      <rect x="112" y="40" width="96" height="120" rx="8" fill="var(--art-fill-1)" />
      <path d="M126 62h40M126 76h64M126 90h56" />
      <circle cx="186" cy="130" r="12" fill="var(--art-fill-2)" />
      <circle cx="186" cy="130" r="3.5" fill="var(--brand-coral)" stroke="none" />
      <path d="M84 118h152v82a8 8 0 0 1-8 8H92a8 8 0 0 1-8-8z" fill="var(--art-fill-2)" />
      <path d="M84 120l76 50 76-50" />
      <path d="M232 70a14 14 0 0 1 20 0M236 76a8 8 0 0 1 12 0" />
    </ArtSvg>
  )
}
```

```tsx
// components/brand/illustrations/index.tsx
import type { ComponentType } from "react"

import type { ArtWorld, SceneProps } from "../art"
import { CertificateArrivesScene } from "./certificate-arrives"
import { FormOnPhoneScene } from "./form-on-phone"

/** Widened to all twelve illustrations in Task 11. */
export type SceneId = "form-on-phone" | "certificate-arrives"

export const SCENE_COMPONENTS: Record<SceneId, ComponentType<SceneProps>> = {
  "form-on-phone": FormOnPhoneScene,
  "certificate-arrives": CertificateArrivesScene,
}

/** Server-render this. Importing it into a client component ships every illustration as JavaScript. */
export function Scene({ id, world, className }: { id: SceneId; world: ArtWorld; className?: string }) {
  const Component = SCENE_COMPONENTS[id]
  return <Component world={world} className={className} />
}
```

This geometry is a starting draft. In Step 5, refine every piece by eye for proportions, optical balance and stroke joins before the gate. The contract and style rules are fixed; the coordinates are not.

- [ ] **Step 4: Write the art-sheet renderer.**

```tsx
// scripts/design/render-art-sheet.tsx
// Usage: pnpm exec tsx scripts/design/render-art-sheet.tsx
// Writes output/art-sheet/{light,dark}@{1x,2x}.png for review. output/ is git-ignored.
import { mkdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { chromium } from "@playwright/test"
import { renderToStaticMarkup } from "react-dom/server"

import { SCENE_COMPONENTS, Scene, type SceneId } from "@/components/brand/illustrations"
import { SERVICE_MARK_COMPONENTS, ServiceMark } from "@/components/brand/marks"
import type { CanonicalServiceId } from "@/lib/services/service-catalog"

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")
const darkStart = css.indexOf(".dark {")
const pick = (block: string) => (block.match(/--(world|art|brand-coral|moat)[\w-]*:[^;]+;/g) ?? []).join("\n")
const lightVars = pick(css.slice(css.indexOf(":root"), darkStart))
const darkVars = pick(css.slice(darkStart, css.indexOf("}", darkStart)))

const services = Object.keys(SERVICE_MARK_COMPONENTS) as CanonicalServiceId[]
const scenes = Object.keys(SCENE_COMPONENTS) as SceneId[]
const body = renderToStaticMarkup(
  <main style={{ display: "grid", gap: 32, padding: 32 }}>
    <section style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
      {services.flatMap((s) => ([40, 48, 56] as const).map((size) => <ServiceMark key={`${s}-${size}`} service={s} size={size} />))}
    </section>
    <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 320px)", gap: 24 }}>
      {scenes.map((id) => (
        <figure key={id} style={{ margin: 0 }}>
          <Scene id={id} world="dawn" className="w-80" />
          <figcaption style={{ font: "14px system-ui" }}>{id}</figcaption>
        </figure>
      ))}
    </section>
  </main>,
)

async function main() {
  const out = join(process.cwd(), "output/art-sheet")
  mkdirSync(out, { recursive: true })
  const browser = await chromium.launch()
  for (const theme of ["light", "dark"] as const) {
    for (const scale of [1, 2]) {
      const page = await browser.newPage({ deviceScaleFactor: scale, viewport: { width: 1100, height: 900 } })
      const vars = theme === "light" ? lightVars : darkVars
      const bg = theme === "light" ? "#F8F7F4" : "#0B1120"
      const tiles = "[data-service-mark]{background:var(--art-fill-1,#fff);border-radius:12px;display:inline-flex;align-items:center;justify-content:center}"
      await page.setContent(`<html><head><style>:root{${vars}} body{margin:0;background:${bg}} .w-80{width:320px} .block{display:block} ${tiles}</style></head><body>${body}</body></html>`)
      await page.screenshot({ path: join(out, `${theme}@${scale}x.png`), fullPage: true })
      await page.close()
    }
  }
  await browser.close()
}

void main()
```

This bare page lacks Tailwind tile colours; review tile colour in the Task 10 page screenshots.

- [ ] **Step 5: Render, inspect and refine.** Run `pnpm exec tsx scripts/design/render-art-sheet.tsx` and open the four PNGs. Refine until:
  - strokes read cleanly at 40 px;
  - nothing touches the tile edges;
  - light and dark both hold contrast;
  - each piece reads as InstantMed's own, not a stock icon.

- [ ] **Step 6: Run the contract.** Run `pnpm exec vitest run lib/__tests__/brand-art-contract.test.tsx && pnpm typecheck`. Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add components/brand scripts/design/render-art-sheet.tsx lib/__tests__/brand-art-contract.test.tsx app/globals.css
git commit -m "Add the brand art system with the four direction-gate pieces"
```

### Task 8: `OutcomeStage` (phone, status story, delivery notice)

**Files:**
- Create: `components/marketing/outcome-stage/{phone-frame,status-card,delivery-notice,certificate-screen,escript-screen,outcome-stage,index}.tsx`
- Modify:
  - `app/globals.css`: stage keyframes and sun classes.
  - `lib/__tests__/advertising-compliance-guard.test.ts`: add `certificate-screen.tsx` to `MED_CERT_VISIBLE_CERTIFICATE_MOCKUP_SURFACES` (line 71) and `escript-screen.tsx` to `PAID_PRESCRIPTION_DESTINATION_SURFACES` (line 96).
- Test: `lib/__tests__/outcome-stage-contract.test.tsx`

**Interfaces produced:**
- `OUTCOME_STEPS: { certificate: readonly [string, string, string]; escript: readonly [string, string, string] }`.
- `PhoneFrame({ children, className? })`, `StatusCard({ steps, className? })`, `DeliveryNotice({ app, title, body?, className? })`.
- `CertificateScreen()`, `EscriptScreen()`.
- `OutcomeStage({ variant: "certificate" | "escript" | "home", specimenTrigger?: ReactNode, className? })`. All are server components.

**Screen wording.** The screens copy the live product (planning refinement 2):
- **Certificate screen:** the dashboard card reads "Your document is ready", with a document thumbnail marked "SPECIMEN", "Absence: 23 September 2026", a "Download PDF" button and "Verification code: SPECIMEN". The synthetic name is "Alex Taylor".
- **Certificate notice:** app "Email", title "Your certificate is ready".
- **Home notice:** app "Messages", title "Your eScript is ready".
- **eScript screen:** a lock screen with one message card. Until Rey's redacted screenshot arrives, use sender "Messages" and the text "Your electronic prescription is ready. Open the secure link in your message to access your token." Record the source you used in the receipt.

- [ ] **Step 1: Write the failing test.**

```tsx
// lib/__tests__/outcome-stage-contract.test.tsx
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { OUTCOME_STEPS, OutcomeStage } from "@/components/marketing/outcome-stage"

describe("OutcomeStage", () => {
  for (const variant of ["certificate", "escript", "home"] as const) {
    it(`${variant}: one labelled figure, decorative internals, example label, no timestamps`, () => {
      const html = renderToStaticMarkup(<OutcomeStage variant={variant} />)
      expect(html).toMatch(/^<figure[^>]*data-hero-facsimile=""/)
      expect(html).toMatch(/<figcaption class="sr-only">[^<]*[Ee]xample[^<]*<\/figcaption>/)
      expect(html).toMatch(/Example|SPECIMEN/)
      expect(html).not.toMatch(/\bnow\b|min ago|minutes ago|\d{1,2}:\d{2}/i)
      expect(html).not.toMatch(/sildenafil|tadalafil|finasteride|semaglutide|ozempic/i)
    })
  }
  it("tells a truthful status story per service", () => {
    expect(OUTCOME_STEPS.certificate).toEqual(["Form received", "Clinical check", "Certificate ready"])
    expect(OUTCOME_STEPS.escript).toEqual(["Form received", "Doctor review", "eScript sent"])
  })
  it("animates with CSS classes only and never server-renders opacity 0", () => {
    const html = renderToStaticMarkup(<OutcomeStage variant="certificate" />)
    expect(html).toContain("stage-rise")
    expect(html).toContain("status-tick-3")
    expect(html).not.toMatch(/style="[^"]*opacity:\s*0/)
  })
})
```

The status bar shows signal and battery glyphs only, never a clock.

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement.**

```tsx
// components/marketing/outcome-stage/outcome-stage.tsx
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import { CertificateScreen } from "./certificate-screen"
import { DeliveryNotice } from "./delivery-notice"
import { EscriptScreen } from "./escript-screen"
import { PhoneFrame } from "./phone-frame"
import { StatusCard } from "./status-card"

export const OUTCOME_STEPS = {
  certificate: ["Form received", "Clinical check", "Certificate ready"],
  escript: ["Form received", "Doctor review", "eScript sent"],
} as const

const CAPTIONS = {
  certificate: "Example: a specimen medical certificate ready to download on a phone, after a form is received and clinically checked.",
  escript: "Example: an eScript text message on a phone lock screen after a doctor review. Sent only if the doctor prescribes.",
  home: "Example: a specimen medical certificate on a phone, with an eScript message arriving for prescription requests.",
} as const

export function OutcomeStage({ variant, specimenTrigger, className }: { variant: "certificate" | "escript" | "home"; specimenTrigger?: ReactNode; className?: string }) {
  const isEscript = variant === "escript"
  return (
    <figure data-hero-facsimile="" data-outcome-stage={variant} className={cn("relative mx-auto w-full max-w-[26rem] pb-10 pt-4", className)}>
      <div aria-hidden="true" className={cn("pointer-events-none absolute left-1/2 top-0 aspect-square w-[95%] -translate-x-1/2 rounded-full", isEscript ? "stage-sun-sky" : "stage-sun-dawn")} />
      <div aria-hidden="true" className="stage-floor pointer-events-none absolute inset-x-[16%] bottom-2 h-10 rounded-[50%]" />
      <div aria-hidden="true" className="stage-rise relative mx-auto w-[64%] max-w-[16.5rem]">
        <PhoneFrame>{isEscript ? <EscriptScreen /> : <CertificateScreen />}</PhoneFrame>
      </div>
      <div aria-hidden="true" className="absolute bottom-0 left-0 w-[58%] sm:-left-6 sm:w-[54%]">
        <StatusCard steps={isEscript ? OUTCOME_STEPS.escript : OUTCOME_STEPS.certificate} />
      </div>
      {variant === "certificate" && (
        <div aria-hidden="true" className="notice-in absolute right-0 top-[12%] w-[70%] sm:-right-6">
          <DeliveryNotice app="Email" title="Your certificate is ready" />
        </div>
      )}
      {variant === "home" && (
        <div aria-hidden="true" className="notice-in absolute right-0 top-[12%] w-[70%] sm:-right-6">
          <DeliveryNotice app="Messages" title="Your eScript is ready" />
        </div>
      )}
      {specimenTrigger}
      <figcaption className="sr-only">{CAPTIONS[variant]}</figcaption>
    </figure>
  )
}
```

Build the remaining parts:
- **`PhoneFrame`:**
  - a graphite `#1d1f23` bezel, which is a device colour, not a page background;
  - a 390/844-aspect screen with `[container-type:inline-size]` and a dynamic-island pill;
  - lucide `Signal` and `BatteryFull` glyphs with `aria-hidden`, and no clock.
- **`StatusCard`:**
  - a white card with `TACTILE_SURFACE` and `shadow-md shadow-primary/[0.08]`;
  - one row per step, with a 20 px circle carrying `status-tick status-tick-1`, `-2` or `-3`;
  - the check glyph in `var(--moat-glyph)` and 14 px step text.
- **`CertificateScreen`:** a dashboard card laid out in `cqw` units, using the wording above.
- **`EscriptScreen`:** the lock screen on `bg-gradient-to-b from-world-sky-200 via-world-sky-100 to-world-dawn-50` with the one message card.
- **`DeliveryNotice`:** an app chip plus title and optional body. No time.
- **`index.tsx`:** re-exports `OutcomeStage` and `OUTCOME_STEPS`.

Append to `app/globals.css`:

```css
@keyframes stage-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.stage-rise { animation: stage-rise 280ms cubic-bezier(0, 0, 0.2, 1) both; }
@keyframes status-tick { from { transform: scale(0.85); } to { transform: none; } }
.status-tick { animation: status-tick 180ms cubic-bezier(0.23, 1, 0.32, 1) both; }
.status-tick-1 { animation-delay: 450ms; } .status-tick-2 { animation-delay: 750ms; } .status-tick-3 { animation-delay: 1050ms; }
@keyframes notice-in { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: none; } }
.notice-in { animation: notice-in 220ms cubic-bezier(0.23, 1, 0.32, 1) 1250ms both; }
.stage-sun-dawn { background: radial-gradient(circle at 50% 42%, var(--morning-peach) 0%, color-mix(in srgb, var(--world-dawn-100) 80%, white) 42%, transparent 70%); opacity: 0.9; }
.stage-sun-sky { background: radial-gradient(circle at 50% 42%, var(--morning-sky) 0%, color-mix(in srgb, var(--world-sky-100) 80%, white) 42%, transparent 70%); opacity: 0.9; }
.stage-floor { background: radial-gradient(ellipse at center, rgb(59 130 246 / 0.18) 0%, transparent 70%); }
.dark .stage-sun-dawn, .dark .stage-sun-sky { opacity: 0.35; }
@media (prefers-reduced-motion: reduce) { .stage-rise, .status-tick, .notice-in { animation: none; } }
```

`--morning-peach` and `--morning-sky` must exist next to `--morning-champ`. If a name differs, use the existing morning token.

- [ ] **Step 4: Run the tests.** Run `pnpm exec vitest run lib/__tests__/outcome-stage-contract.test.tsx lib/__tests__/advertising-compliance-guard.test.ts && pnpm typecheck`. Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add components/marketing/outcome-stage app/globals.css lib/__tests__/outcome-stage-contract.test.tsx lib/__tests__/advertising-compliance-guard.test.ts
git commit -m "Add OutcomeStage: code-built phone outcome with a truthful status story"
```

### Task 9: `Hero` opt-in props

**Files:**
- Modify: `components/marketing/hero.tsx`, `lib/__tests__/landing-hero-contract.test.ts`

**Interfaces produced:** new optional `Hero` props. Existing props keep their behaviour.
- `status?: ReactNode`, which takes precedence over `liveWait`;
- `moat?: ReactNode`;
- `chips?: ReactNode`;
- `decision?: ReactNode`, which replaces the CTA block;
- `headerCta?: { label: string; href: string }`, which the condensing header reads in Task 19.

The default `reassuranceRow` already renders `GUARANTEE` as the refund line (hero.tsx lines 68–73), so the new anatomy keeps it.

- [ ] **Step 1: Write the failing assertions** in `lib/__tests__/landing-hero-contract.test.ts`:

```ts
  it("offers opt-in status, moat, chips, decision and header CTA slots without changing defaults", () => {
    expect(hero).toMatch(/status\?: ReactNode/)
    expect(hero).toMatch(/moat\?: ReactNode/)
    expect(hero).toMatch(/chips\?: ReactNode/)
    expect(hero).toMatch(/decision\?: ReactNode/)
    expect(hero).toMatch(/headerCta\?: \{ label: string; href: string \}/)
    expect(hero).toContain('data-hero-moat=""')
    expect(hero).toContain('data-hero-chips=""')
    expect(hero).toContain("data-header-cta-label")
    expect(hero).toContain("decision ??")
    // The status slot stays inside the existing availability gate, so maintenance or a disabled service hides it.
    expect(hero).toContain("<ServiceAvailabilityGate serviceId={timingServiceId ?? availabilityServiceId}>")
  })
```

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement.**
  - Add the five props to `HeroProps` with JSDoc.
  - Compute `const statusNode = status ?? (hasTiming ? <WaitCounter state={liveWait!} /> : null)` and render it in the existing gated `data-hero-status` block. Keep the gate line exactly as it is.
  - On the `section[data-hero]` element (line 76), add `data-header-cta-label={headerCta?.label}` and `data-header-cta-href={headerCta?.href}`. React omits them when they are undefined.
  - After `{children}`, render:
    - `{moat && <div data-hero-moat="" className="mb-5">{moat}</div>}`;
    - `{chips && <div data-hero-chips="" className="mb-6">{chips}</div>}`.
  - Replace the CTA `div` with `{decision ?? (<div id={primaryCta.wrapperId} …>…existing CTA…</div>)}`.
  - Leave the reassurance, proof-row and mockup code unchanged.

- [ ] **Step 4: Run the hero contracts.** Run `pnpm exec vitest run lib/__tests__/landing-hero-contract.test.ts lib/__tests__/specialty-landing-analytics-contract.test.ts lib/__tests__/money-page-lcp-critical-path.test.ts && pnpm typecheck`. Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add components/marketing/hero.tsx lib/__tests__/landing-hero-contract.test.ts
git commit -m "Give the shared hero opt-in status, moat, chips, decision and header CTA slots"
```

### Task 10: Direction proof on `/medical-certificate` (Rey gate)

**Files:**
- Create: minimal `components/marketing/sections/chip-list.tsx` (tones added in Task 13)
- Modify:
  - `components/marketing/med-cert-landing.tsx` (hero only)
  - `app/medical-certificate/page.tsx`
  - the pins listed in Step 3

- [ ] **Step 1: Compose the certificate hero.**

In `app/medical-certificate/page.tsx`, make three changes:
- replace `revalidate = 3600` with `export const revalidate = 60`;
- compute `const liveStatus = await getLiveStatus({ withMedian: true })`;
- render `<MedCertLanding liveWait={liveWait} liveStatus={liveStatus} />`.

Create the minimal `ChipList`:

```tsx
// components/marketing/sections/chip-list.tsx (minimal; tones follow in Task 13)
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface ChipItem { label: string; icon?: LucideIcon }

export function ChipList({ items, label, className }: { items: readonly ChipItem[]; label?: string; className?: string }) {
  return (
    <ul aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {items.map(({ label: text, icon: Icon }) => (
        <li key={text} className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border/60 bg-white px-3 py-1 text-sm text-foreground dark:bg-card">
          {Icon ? <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : null}
          {text}
        </li>
      ))}
    </ul>
  )
}
```

In `med-cert-landing.tsx`, accept `liveStatus?: LiveStatusState` and change the hero (currently lines 268–301) to:

```tsx
<Hero
  title="Your medical certificate. Without the waiting room."
  titleClassName={cn(moneyH1Font.className, "text-balance")}
  availabilityServiceId="med-cert"
  status={liveStatus ? <LiveStatus state={liveStatus} /> : undefined}
  moat={<MoatBadgePair surface="certificate" animateCheck />}
  chips={<ChipList label="Who this is for" items={ELIGIBILITY_CHIPS} />}
  primaryCta={{
    text: `Get your certificate · ${PRICING_DISPLAY.FROM_MED_CERT}`,
    href: MED_CERT_START_HREF,
    wrapperId: MED_CERT_HERO_CTA_ID,
    dataAttributes: { "data-med-cert-cta": "hero" },
  }}
  headerCta={{ label: `Get your certificate · ${PRICING_DISPLAY.FROM_MED_CERT}`, href: MED_CERT_START_HREF }}
  secondaryCta={null}
  mockup={<OutcomeStage variant="certificate" />}
>
  <p className="mb-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
    For work, study or carer’s leave. Issued by AHPRA-registered Australian doctors.
  </p>
</Hero>
```

`ELIGIBILITY_CHIPS` (line 77) is the existing `{ label, icon }` list for "Australia only", "Ages 18+" and "No Medicare needed". Keep it and map its shape if it differs. The #608 blue accent `<span className="text-primary">` in the title is removed: one ink colour.

Move `MED_CERT_WEDGE` to be the How it works intro. Until Task 17, pass it as the `subheading` of the existing `HowItWorksInline`.

- [ ] **Step 2: Build and capture.**

```bash
pnpm build && (PLAYWRIGHT=1 pnpm start -p 3061 > /tmp/landing-proof.log 2>&1 &)
```

Load `instantmed-ui-browser-verification`. Capture `/medical-certificate` at:
- 1440x900 in light and dark;
- 390x844 in light and dark;
- 390x844 with reduced motion;
- 320x568.

Collect the `output/art-sheet/*` PNGs. Check the console for errors. Then run the geometry gate:

```bash
PLAYWRIGHT=1 PLAYWRIGHT_SERVER_MODE=production PLAYWRIGHT_PORT=3071 pnpm exec playwright test e2e/landing-pages.spec.ts --project=chromium -g "medical-certificate"
```

Expected: PASS, including the phone page length at 10.0 screens or fewer.

- [ ] **Step 3: Update the pins this hero touches.**
  - `money-page-narrative-contract`: the subheading becomes "For work, study or carer’s leave. Issued by AHPRA-registered Australian doctors."
  - `money-page-narrative-compression-contract`: replace "For short absences from work, study or caring duties" with "For work, study or carer’s leave".
  - `landing-hero-contract` and `money-page-lcp-critical-path`: the certificate title is a plain string with no accent span, and `titleClassName` now includes `text-balance`. Update any regex that asserts the old JSX title or the exact `titleClassName`.
  - `code-clean-retirement-contract`: the certificate page imports `OutcomeStage`.
  - `lib/marketing/landing-vocabulary.ts`: add `components/marketing/sections/chip-list.tsx`, `components/marketing/moat-badge.tsx`, `components/marketing/live-status.tsx` and `components/marketing/outcome-stage/certificate-screen.tsx` to `LANDING_SURFACES`. Then run `landing-vocabulary-contract` and `landing-type-floor-contract`.

- [ ] **Step 4: Open the draft PR and STOP.**

```bash
git add -A && git commit -m "Direction proof: certificate hero with live status, moat pair and outcome stage"
git push -u origin claude/landing-masterpiece
gh pr create --draft --title "Landing masterpiece redesign (draft: direction proof)" --body "Direction proof for Rey. Spec: docs/superpowers/specs/2026-09-26-landing-masterpiece-design.md. Plan: docs/superpowers/plans/2026-09-26-landing-masterpiece.md."
```

Send Rey the screenshots and art sheets with `SendUserFile`. **Do not start Task 11 until Rey approves.** Record his adjustments as a dated "Direction proof feedback" note under spec Section 2, including the final display weight between 400 and 500, and apply them before continuing.

---

# Phase B: Full build (after the direction proof is approved)

### Task 11: Complete the marks and illustrations; `ServiceIconTile` mark variant

**Files:**
- Create: `components/brand/marks/{ed,hair-loss,womens-health,weight,assessments}-mark.tsx`
- Create: `components/brand/illustrations/{clinical-check,verify,escript-message,pharmacy,around-the-clock,privacy,refund,id-card,calendar-days,australia}.tsx`
- Modify: `components/brand/marks/index.tsx`, `components/brand/illustrations/index.tsx`, `components/icons/service-icons.tsx`, `lib/__tests__/brand-art-contract.test.tsx`, `lib/__tests__/advertising-compliance-guard.test.ts`

- [ ] **Step 1: Add the failing assertions to the art contract.**

```tsx
import { AssessmentsMark, SERVICE_MARK_COMPONENTS } from "@/components/brand/marks"
import { SCENE_COMPONENTS } from "@/components/brand/illustrations"

  it("covers every service, the assessments group and every illustration", () => {
    expect(Object.keys(SERVICE_MARK_COMPONENTS).sort()).toEqual(["ed", "hair-loss", "med-cert", "repeat-rx", "weight-loss", "womens-health"])
    expect(typeof AssessmentsMark).toBe("function")
    expect(Object.keys(SCENE_COMPONENTS).sort()).toEqual([
      "around-the-clock", "australia", "calendar-days", "certificate-arrives", "clinical-check", "escript-message",
      "form-on-phone", "id-card", "pharmacy", "privacy", "refund", "verify",
    ])
  })
```

- [ ] **Step 2: Draw the pieces** to spec 5.2.
  - **ED:** a private chat bubble with a small lock.
  - **Hair loss:** a comb with three strands.
  - **Women's health:** a calendar ring with a leaf.
  - **Weight:** a level balance, with no body, tape or readout.
  - **Assessments:** a 2x2 set of rounded squares filled with the dusk, champagne, rose and sage 200 tints, used for the homepage "Private assessments" row. Its fills reference `var(--world-dusk-200)` and the other three tints directly.
  - **Illustrations:** as listed in spec 5.2. The clinical check uses a generic seal with no lettering (planning refinement 3). The pharmacy has a cross sign and no brand. Each piece has at most one coral detail.
  - Change `SERVICE_MARK_COMPONENTS` to a complete `Record` and widen `SceneId` to the twelve ids.

- [ ] **Step 3: Add the tile variant.** In `components/icons/service-icons.tsx`:
  - Add `variant?: 'tile' | 'sticker' | 'mark'` and `serviceId?: CanonicalServiceId`.
  - When `variant === 'mark'` and `serviceId` is set, render `<ServiceMark service={serviceId} size={…} />`, mapping the tile size to 40, 48 or 56. Otherwise keep today's tile.
  - Remove the unused `from`, `to` and `shadow` fields from `serviceColorConfig`, after checking with `grep -rn "\.from\b\|\.shadow\b" components/icons` that nothing reads them.

- [ ] **Step 4: Update the compliance guard.** Add `components/brand/illustrations/certificate-arrives.tsx` and `verify.tsx` to the visible-certificate wording surfaces in `advertising-compliance-guard.test.ts`, and add the illustrations folder to its fake-avatar scan (spec 10).

- [ ] **Step 5: Render and review.** Run `pnpm exec tsx scripts/design/render-art-sheet.tsx`, refine, then run `pnpm exec vitest run lib/__tests__/brand-art-contract.test.tsx lib/__tests__/advertising-compliance-guard.test.ts && pnpm typecheck`. Send the updated art sheet to Rey for information; it is not a gate.

- [ ] **Step 6: Commit** with the message "Complete the brand marks and illustrations and add the service tile mark variant".

### Task 12: `SpecimenViewer`, `CertificateSpecimen` and `VerifyDemo`

**Files:**
- Create: `components/marketing/specimen/certificate-specimen.tsx` (async server component), `components/marketing/specimen/specimen-viewer.tsx` (client), `components/marketing/verify-demo.tsx` (client)
- Test: `lib/__tests__/specimen-contract.test.tsx`

**Interfaces produced:**
- `SPECIMEN_INPUT: TemplatePdfInput`;
- `CertificateSpecimen(): Promise<JSX.Element>`;
- `SpecimenViewer({ trigger: ReactNode, children: ReactNode })`;
- `VerifyDemo()`.

- [ ] **Step 1: Write the failing test.**

```tsx
// lib/__tests__/specimen-contract.test.tsx
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CertificateSpecimen, SPECIMEN_INPUT } from "@/components/marketing/specimen/certificate-specimen"
import { VerifyDemo } from "@/components/marketing/verify-demo"
import { getBodyText, getReturnText, getSupportText } from "@/lib/pdf/template-renderer"

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8")

describe("certificate specimen", () => {
  it("never touches the clinician-identity raster or signature image", () => {
    for (const file of ["components/marketing/specimen/certificate-specimen.tsx", "components/marketing/specimen/specimen-viewer.tsx"]) {
      expect(read(file)).not.toMatch(/template\.pdf|public\/templates|renderTemplatePdf|eSignature/)
    }
  })

  it("prints the locked certificate sentences for synthetic data with a watermark and no clinician identity", async () => {
    const html = renderToStaticMarkup(await CertificateSpecimen())
    expect(html).toContain(getBodyText(SPECIMEN_INPUT))
    expect(html).toContain(getReturnText(SPECIMEN_INPUT))
    expect(html).toContain(getSupportText())
    expect(html).toContain("SPECIMEN · NOT A VALID CERTIFICATE")
    expect(html).toContain("AHPRA-registered medical practitioner")
    expect(html).not.toMatch(/\b[A-Z]{3}\d{10}\b/) // no AHPRA registration number
    expect(html).not.toMatch(/\bDr\.?\s+[A-Z][a-z]/) // no named doctor
  })
})

describe("verify demo", () => {
  it("is labelled an example and never fetches", () => {
    expect(read("components/marketing/verify-demo.tsx")).not.toMatch(/fetch\(|\/api\/verify/)
    const html = renderToStaticMarkup(<VerifyDemo />)
    expect(html).toContain("Example")
    expect(html).toContain("IM-SPECIMEN")
  })
})
```

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement.**

```tsx
// components/marketing/specimen/certificate-specimen.tsx (server only: template-renderer imports fs and pdf-lib)
import QRCode from "qrcode"

import { getBodyText, getReturnText, getSupportText, type TemplatePdfInput } from "@/lib/pdf/template-renderer"

export const SPECIMEN_INPUT = {
  certificateType: "work",
  patientName: "Alex Taylor",
  consultationDate: "23 September 2026",
  startDate: "23 September 2026",
  endDate: "23 September 2026",
  certificateRef: "SPECIMEN",
  issueDate: "23/09/2026",
} as const satisfies TemplatePdfInput

export async function CertificateSpecimen() {
  const qr = await QRCode.toString("https://instantmed.com.au/verify", { type: "svg", margin: 0 })
  // ...A4 sheet: see the layout list below.
}
```

Build the sheet as a white `aspect-[210/297]` page containing:
- the InstantMed wordmark, company address and ABN, taken from the platform identity constants;
- a title, the issue date and "To whom it may concern,";
- `getBodyText(SPECIMEN_INPUT)`;
- `getReturnText(SPECIMEN_INPUT)` followed by `getSupportText()` in one paragraph;
- a generic "AHPRA-registered medical practitioner" block;
- the QR code (`<div aria-hidden="true" dangerouslySetInnerHTML={{ __html: qr }} />`; the `qrcode` library's output is trusted);
- "Reference: SPECIMEN";
- a watermark layer: an absolutely positioned, `pointer-events-none`, `select-none` block at `opacity-[0.12]`, rotated −30° with a static transform, that repeats "SPECIMEN · NOT A VALID CERTIFICATE".

`SpecimenViewer` is a client component (`"use client"`):
- It renders `Dialog` with `DialogTrigger asChild` wrapping `trigger`.
- `DialogContent` holds a `DialogTitle` "Specimen medical certificate", a one-line `DialogDescription` "A labelled example. Not a valid certificate.", and a scroll area with `touch-action: pinch-zoom` around `children`.
- Radix handles Escape and returns focus.
- The page passes `<CertificateSpecimen />` as `children` from the server, so the specimen enters the DOM only when the dialog opens (planning refinement 12).

`VerifyDemo` is a client component. It contains:
- an "Example" label and the heading `getApprovedClaim("employer_verify_authenticity")`;
- a read-only `Input` with the value "IM-SPECIMEN" and a "Check" button that toggles a static result;
- the result: "Example result", "Valid certificate", "Issued 23 September 2026" and `getApprovedClaim("employer_privacy_limited")`;
- a "Check a real certificate" link to `/verify`.

- [ ] **Step 4: Run** `pnpm exec vitest run lib/__tests__/specimen-contract.test.tsx && pnpm typecheck`. Expected: PASS.

- [ ] **Step 5: Commit** with the message "Add the code-built certificate specimen viewer and the employer verify demo".

### Task 13: Section primitives, `OutcomePaths` and `ClinicalModelPanel`

**Files:**
- Create: `components/marketing/sections/{section-heading,world-band,fit-check,more-detail,contact-line,what-you-need,fee-card,outcome-paths}.tsx`, `components/marketing/clinical-model-panel.tsx`
- Modify: `components/marketing/sections/chip-list.tsx` (tones)
- Test: `lib/__tests__/landing-sections-contract.test.tsx`

All of these are server components.

**Interfaces produced:**
- `SectionHeading({ id, title, intro?: ReactNode, className? })`
- `WorldBand({ world: WorldId, id?, grain?, className?, children })`
- `ChipItem`, `ChipTone = "neutral" | "good" | "gp"`, `ChipList({ items, tone?, label?, className? })`
- `FitCheck({ goodTitle, good, gpTitle, gp, notes? })`
- `MoreDetail({ summary?, children, className? })`
- `ContactLine({ className? })`
- `WhatYouNeed({ variant: "certificate" | "prescription", className? })`
- `FeeCard({ rows: readonly { label: string; value: ReactNode }[], footnote?: ReactNode, className? })`
- `MORE_INFO_LINE` and `OutcomePaths({ delivery: "certificate" | "prescription" | "general", world: ServiceWorldId, className? })`
- `ClinicalModelPanel({ lead?: "certificate" | "prescription", className? })`

- [ ] **Step 1: Write the failing contract.**

```tsx
// lib/__tests__/landing-sections-contract.test.tsx
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ClinicalModelPanel } from "@/components/marketing/clinical-model-panel"
import { ContactLine } from "@/components/marketing/sections/contact-line"
import { MORE_INFO_LINE, OutcomePaths } from "@/components/marketing/sections/outcome-paths"
import { WhatYouNeed } from "@/components/marketing/sections/what-you-need"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { GUARANTEE } from "@/lib/marketing/voice"

const decode = (html: string) => html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&")

describe("landing section primitives", () => {
  it("OutcomePaths uses approved wording for all three outcomes", () => {
    expect(getApprovedClaim("clinical_decision_model")).toContain(MORE_INFO_LINE)
    const html = decode(renderToStaticMarkup(<OutcomePaths delivery="certificate" world="dawn" />))
    for (const text of ["Approved", "More information needed", MORE_INFO_LINE, "Not suitable", GUARANTEE, "We’ll explain why."]) {
      expect(html).toContain(text)
    }
    expect(html).toContain(getApprovedClaim("refund_payment_process"))
  })

  it("ClinicalModelPanel shows the governance rows, the certifications and their honest explanation", () => {
    const html = decode(renderToStaticMarkup(<ClinicalModelPanel />))
    for (const id of ["clinical_governance_protocol", "clinical_governance_doctor_review", "clinical_governance_prescribing", "doctor_registration", "legitscript_label", "legitscript_tooltip", "google_healthcare_ads_tooltip"] as const) {
      expect(html, id).toContain(getApprovedClaim(id))
    }
    expect(html).toContain("Clinical governance by our Medical Director")
    expect(html).toContain("legitscript.com")
    expect(html.indexOf(getApprovedClaim("clinical_governance_protocol"))).toBeLessThan(html.indexOf(getApprovedClaim("clinical_governance_prescribing")))
  })

  it("ClinicalModelPanel leads with prescribing on the prescription page", () => {
    const html = decode(renderToStaticMarkup(<ClinicalModelPanel lead="prescription" />))
    expect(html.indexOf(getApprovedClaim("clinical_governance_prescribing"))).toBeLessThan(html.indexOf(getApprovedClaim("clinical_governance_protocol")))
  })

  it("ContactLine is voicemail, not a live-call promise", () => {
    const html = renderToStaticMarkup(<ContactLine />)
    expect(html).toContain("leave a voice message")
    expect(html).toContain("mailto:support@instantmed.com.au")
    expect(html).toContain("tel:+61495049555")
    expect(html).not.toMatch(/call us/i)
  })

  it("WhatYouNeed restates the right requirements", () => {
    expect(renderToStaticMarkup(<WhatYouNeed variant="certificate" />)).toContain("No Medicare card needed")
    expect(renderToStaticMarkup(<WhatYouNeed variant="prescription" />)).toContain("Medicare card or IHI")
  })

  it("renders no em dashes", () => {
    for (const html of [renderToStaticMarkup(<OutcomePaths delivery="general" world="sky" />), renderToStaticMarkup(<ClinicalModelPanel />), renderToStaticMarkup(<ContactLine />)]) {
      expect(html).not.toContain("—")
    }
  })
})
```

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement the primitives.** Use `CONTAINER`, `SECTION_Y`, `ANCHOR_OFFSET`, `FOCUS_RING` and `TACTILE_SURFACE` from `lib/brand/surfaces.ts`.

```tsx
// components/marketing/sections/section-heading.tsx
import type { ReactNode } from "react"

import { Heading } from "@/components/ui/heading"
import { ANCHOR_OFFSET } from "@/lib/brand/surfaces"
import { cn } from "@/lib/utils"

export function SectionHeading({ id, title, intro, className }: { id: string; title: string; intro?: ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <Heading level="h2" id={id} className={cn("text-balance", ANCHOR_OFFSET)}>{title}</Heading>
      {intro ? <div className="mt-3 text-pretty text-lg leading-relaxed text-muted-foreground">{intro}</div> : null}
    </div>
  )
}
```

```tsx
// components/marketing/sections/world-band.tsx
import type { ReactNode } from "react"

import { CONTAINER, SECTION_Y } from "@/lib/brand/surfaces"
import { SPECTRUM_BAND, WORLD_CLASSES, type WorldId } from "@/lib/brand/worlds"
import { cn } from "@/lib/utils"

/** Full-bleed world tint with soft top and bottom fades (spec 6.4). */
export function WorldBand({ world, id, grain = false, className, children }: { world: WorldId; id?: string; grain?: boolean; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={cn("relative", world === "spectrum" ? SPECTRUM_BAND : WORLD_CLASSES[world].band, grain && "film-grain", className)}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent" />
      <div className={cn(CONTAINER, SECTION_Y, "relative")}>{children}</div>
    </section>
  )
}
```

```tsx
// components/marketing/sections/chip-list.tsx (replaces the Task 10 minimal version)
import { AlertCircle, CheckCircle2, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type ChipTone = "neutral" | "good" | "gp"
export interface ChipItem { label: string; icon?: LucideIcon }

const TONES: Record<ChipTone, { chip: string; icon: LucideIcon | null; iconClass: string }> = {
  neutral: { chip: "border-border/60 bg-white dark:bg-card", icon: null, iconClass: "text-primary" },
  good: { chip: "border-success/25 bg-success/5", icon: CheckCircle2, iconClass: "text-success" },
  gp: { chip: "border-border/60 bg-muted/40", icon: AlertCircle, iconClass: "text-muted-foreground" },
}

export function ChipList({ items, tone = "neutral", label, className }: { items: readonly ChipItem[]; tone?: ChipTone; label?: string; className?: string }) {
  const t = TONES[tone]
  return (
    <ul aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {items.map(({ label: text, icon }) => {
        const Icon = icon ?? t.icon
        return (
          <li key={text} className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-sm text-foreground", t.chip)}>
            {Icon ? <Icon className={cn("h-4 w-4 shrink-0", t.iconClass)} aria-hidden="true" /> : null}
            {text}
          </li>
        )
      })}
    </ul>
  )
}
```

```tsx
// components/marketing/sections/fit-check.tsx
import type { ReactNode } from "react"

import { type ChipItem, ChipList } from "./chip-list"

export function FitCheck({ goodTitle, good, gpTitle, gp, notes }: { goodTitle: string; good: readonly ChipItem[]; gpTitle: string; gp: readonly ChipItem[]; notes?: readonly ReactNode[] }) {
  return (
    <div className="mt-8 grid gap-8 md:grid-cols-2">
      <div>
        <h3 className="mb-3 text-lg font-semibold text-foreground">{goodTitle}</h3>
        <ChipList items={good} tone="good" label={goodTitle} />
      </div>
      <div>
        <h3 className="mb-3 text-lg font-semibold text-foreground">{gpTitle}</h3>
        <ChipList items={gp} tone="gp" label={gpTitle} />
      </div>
      {notes?.length ? (
        <div className="space-y-2 md:col-span-2">
          {notes.map((note, index) => <p key={index} className="text-pretty text-base text-muted-foreground">{note}</p>)}
        </div>
      ) : null}
    </div>
  )
}
```

```tsx
// components/marketing/sections/more-detail.tsx
import { ChevronDown } from "lucide-react"
import type { ReactNode } from "react"

import { FOCUS_RING } from "@/lib/brand/surfaces"
import { cn } from "@/lib/utils"

/** Layered copy that stays in the DOM for search engines (spec 5.6). */
export function MoreDetail({ summary = "More detail", children, className }: { summary?: string; children: ReactNode; className?: string }) {
  return (
    <details data-more-detail="" className={cn("group mt-3", className)}>
      <summary className={cn("inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-medium text-primary [&::-webkit-details-marker]:hidden", FOCUS_RING)}>
        {summary}
        <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <div className="mt-2 space-y-2 text-pretty text-base leading-relaxed text-muted-foreground">{children}</div>
    </details>
  )
}
```

```tsx
// components/marketing/sections/contact-line.tsx
import { FOCUS_RING } from "@/lib/brand/surfaces"
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_TEL } from "@/lib/constants"
import { cn } from "@/lib/utils"

const LINK = cn("rounded-sm font-medium text-foreground underline underline-offset-4", FOCUS_RING)

export function ContactLine({ className }: { className?: string }) {
  return (
    <p className={cn("text-pretty text-base leading-relaxed text-muted-foreground", className)}>
      Questions before you start? Email <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>{CONTACT_EMAIL}</a> or leave a voice message on{" "}
      <a href={`tel:${CONTACT_PHONE_TEL}`} className={cn(LINK, "whitespace-nowrap")}>{CONTACT_PHONE}</a>, any time.
    </p>
  )
}
```

```tsx
// components/marketing/sections/what-you-need.tsx
import { Check } from "lucide-react"

import { TACTILE_SURFACE } from "@/lib/brand/surfaces"
import { nbsp } from "@/lib/typography/nbsp"
import { cn } from "@/lib/utils"

const ITEMS = {
  certificate: ["No Medicare card needed. Just your details and about 3 minutes."],
  prescription: ["Your medicine’s name and dose", "Medicare card or IHI", "Your address and phone number"],
} as const

export function WhatYouNeed({ variant, className }: { variant: keyof typeof ITEMS; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-white p-4 dark:bg-card", TACTILE_SURFACE, className)}>
      <p className="text-sm font-semibold text-foreground">What you’ll need</p>
      <ul className="mt-2 space-y-1.5">
        {ITEMS[variant].map((item) => (
          <li key={item} className="flex gap-2 text-base text-muted-foreground">
            <Check className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            {nbsp(item)}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

```tsx
// components/marketing/sections/fee-card.tsx
import type { ReactNode } from "react"

import { TACTILE_SURFACE } from "@/lib/brand/surfaces"
import { cn } from "@/lib/utils"

export function FeeCard({ rows, footnote, className }: { rows: readonly { label: string; value: ReactNode }[]; footnote?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dl className={cn("divide-y divide-border/60 rounded-2xl border border-border/60 bg-white shadow-md shadow-primary/[0.06] dark:bg-card", TACTILE_SURFACE)}>
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-6 px-5 py-4">
            <dt className="text-base text-foreground">{row.label}</dt>
            <dd className="text-right text-base font-semibold tabular-nums text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
      {footnote ? <p className="mt-3 text-pretty text-base text-muted-foreground">{footnote}</p> : null}
    </div>
  )
}
```

```tsx
// components/marketing/sections/outcome-paths.tsx
import { CheckCircle2, MessageCircle, RotateCcw } from "lucide-react"

import { TACTILE_SURFACE } from "@/lib/brand/surfaces"
import { type ServiceWorldId, WORLD_CLASSES } from "@/lib/brand/worlds"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { GUARANTEE } from "@/lib/marketing/voice"
import { cn } from "@/lib/utils"

import { MoreDetail } from "./more-detail"

/** Second sentence of the approved clinical_decision_model claim (pinned by contract). */
export const MORE_INFO_LINE = "If more information is needed, a doctor may contact you."

const APPROVED_BODY = {
  certificate: "Your certificate link arrives by email.",
  prescription: "Your eScript arrives by text.",
  general: "Your certificate link arrives by email, or your eScript by text.",
} as const

export function OutcomePaths({ delivery, world, className }: { delivery: keyof typeof APPROVED_BODY; world: ServiceWorldId; className?: string }) {
  const paths = [
    { title: "Approved", body: APPROVED_BODY[delivery], Icon: CheckCircle2 },
    { title: "More information needed", body: MORE_INFO_LINE, Icon: MessageCircle },
    { title: "Not suitable", body: `${GUARANTEE} We’ll explain why.`, Icon: RotateCcw },
  ] as const
  return (
    <div className={cn("mt-12", className)}>
      <h3 className="text-lg font-semibold text-foreground">Three possible outcomes</h3>
      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        {paths.map(({ title, body, Icon }) => (
          <li key={title} className={cn("rounded-xl border border-border/60 bg-white p-4 dark:bg-card", TACTILE_SURFACE)}>
            <span aria-hidden="true" className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/5 dark:border-white/10", WORLD_CLASSES[world].tile)}>
              <Icon className="h-5 w-5 text-[var(--art-ink)]" strokeWidth={1.75} />
            </span>
            <p className="mt-3 font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-pretty text-base text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>
      <MoreDetail summary="How refunds work">{getApprovedClaim("refund_payment_process")}</MoreDetail>
    </div>
  )
}
```

`ClinicalModelPanel` (in `components/marketing/clinical-model-panel.tsx`) has two columns:
- **Left column (`lg:col-span-7`):**
  - an ordered list of three rows. Each row has a 40 px world tile containing its number, plus the row text from `getApprovedClaim`. The order is protocol → doctor review → prescribing, or prescribing → doctor review → protocol when `lead="prescription"`.
  - `<MoreDetail>{getApprovedClaim("doctor_registration")}</MoreDetail>`.
  - an inline `SignatureMark` beside "Clinical governance by our Medical Director". Code:

    ```tsx
    function SignatureMark({ className }: { className?: string }) {
      return (
        <svg viewBox="0 0 96 32" aria-hidden="true" focusable="false" className={className} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 22c6-10 10-14 13-12s-5 14 0 13 9-15 13-14-4 12 1 12 8-9 11-9 1 8 5 8 7-6 10-6 5 4 9 3 8-5 18-6" />
        </svg>
      )
    }
    ```

    It has no letterforms. Never use `eSignature.png`.
- **Right column (`lg:col-span-5`):**
  - `<LegitScriptSeal size="sm" />` with `getApprovedClaim("legitscript_label")` under it. The seal already links to its verification page; confirm the `legitscript.com` link renders.
  - `<GoogleAdsCert size="md" />`, which prints its own label.
  - `<MoreDetail summary="What is this?">` holding `legitscript_tooltip` and `google_healthcare_ads_tooltip`.

- [ ] **Step 4: Run** `pnpm exec vitest run lib/__tests__/landing-sections-contract.test.tsx && pnpm typecheck && pnpm exec eslint components/marketing/sections components/marketing/clinical-model-panel.tsx`. Expected: PASS.

- [ ] **Step 5: Commit** with the message "Add the landing section primitives, outcome paths and the clinical-model panel".

### Task 14: `StepStory` and `DurationPicker`

**Files:**
- Create: `components/marketing/sections/step-story.tsx` (server), `components/marketing/sections/step-story-observer.tsx` (client), `components/marketing/sections/duration-picker.tsx` (server)
- Modify: `lib/__tests__/landing-sections-contract.test.tsx`

**Interfaces produced:**
- `StepStoryStep = { title: string; body: ReactNode; scene: SceneId; aside?: ReactNode }`.
- `StepStory({ id, heading, intro?: ReactNode, steps, world: ArtWorld, after?: ReactNode })`.
- `StepStoryObserver({ storyId })`.
- `DurationPicker({ disabled?: boolean })`.

- [ ] **Step 1: Add the failing tests.**

```tsx
import { StepStory } from "@/components/marketing/sections/step-story"
import { DurationPicker } from "@/components/marketing/sections/duration-picker"
import { PRICING_DISPLAY } from "@/lib/constants"
import { buildMedCertRequestHref } from "@/lib/marketing/med-cert-selector"

  it("StepStory server-renders every step with inline and sticky illustrations and an active first scene", () => {
    const html = renderToStaticMarkup(
      <StepStory id="how" heading="How it works" world="dawn" steps={[
        { title: "One", body: "a", scene: "form-on-phone" },
        { title: "Two", body: "b", scene: "certificate-arrives" },
      ]} />,
    )
    expect(html.match(/<li[^>]*data-step-index=/g)?.length).toBe(2)
    expect(html).toContain("lg:hidden")
    expect(html).toMatch(/hidden[^"]*lg:block/)
    expect(html).toMatch(/data-step-scene=""[^>]*data-active="true"/)
    expect(html.match(/data-active="true"/g)?.length).toBe(2) // first scene + first step number
  })

  it("DurationPicker cards are direct links with catalogue prices, and fall back to contact when disabled", () => {
    const html = renderToStaticMarkup(<DurationPicker />)
    for (const [days, price] of [["1", PRICING_DISPLAY.MED_CERT], ["2", PRICING_DISPLAY.MED_CERT_2DAY], ["3", PRICING_DISPLAY.MED_CERT_3DAY]] as const) {
      expect(html).toContain(`href="${buildMedCertRequestHref({ duration: days }).replace(/&/g, "&amp;")}"`)
      expect(html).toContain(price)
    }
    expect(renderToStaticMarkup(<DurationPicker disabled />).match(/href="\/contact"/g)?.length).toBe(3)
  })
```

- [ ] **Step 2: Run them and confirm they fail.**

- [ ] **Step 3: Implement `StepStory`** as a server component, so illustrations never enter the client bundle (planning refinement 11):

```tsx
// components/marketing/sections/step-story.tsx
import type { ReactNode } from "react"

import type { ArtWorld } from "@/components/brand/art"
import { Scene, type SceneId } from "@/components/brand/illustrations"
import { cn } from "@/lib/utils"

import { SectionHeading } from "./section-heading"
import { StepStoryObserver } from "./step-story-observer"

export interface StepStoryStep { title: string; body: ReactNode; scene: SceneId; aside?: ReactNode }

export function StepStory({ id, heading, intro, steps, world, after }: { id: string; heading: string; intro?: ReactNode; steps: readonly StepStoryStep[]; world: ArtWorld; after?: ReactNode }) {
  return (
    <div data-step-story={id}>
      <SectionHeading id={id} title={heading} intro={intro} />
      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <ol className="space-y-10 lg:col-span-6">
          {steps.map((step, index) => (
            <li key={step.title} data-step-index={index} className="grid gap-4">
              <div className="lg:hidden">
                <Scene id={step.scene} world={world} className="mx-auto w-full max-w-[18rem]" />
              </div>
              <div className="flex gap-4">
                <span
                  aria-hidden="true"
                  data-step-number=""
                  data-active={index === 0}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 text-base font-semibold tabular-nums text-primary transition-colors duration-200 motion-reduce:transition-none lg:data-[active=true]:bg-primary lg:data-[active=true]:text-primary-foreground"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                  <div className="mt-1 text-pretty text-base leading-relaxed text-muted-foreground">{step.body}</div>
                  {step.aside ? <div className="mt-4">{step.aside}</div> : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div aria-hidden="true" className="hidden lg:col-span-6 lg:block">
          <div className="sticky top-28 aspect-[4/3]">
            {steps.map((step, index) => (
              <div
                key={step.title}
                data-step-scene=""
                data-active={index === 0}
                className={cn("absolute inset-0 transition-[opacity,transform] duration-[240ms] ease-out motion-reduce:transition-none", "data-[active=false]:translate-y-2 data-[active=false]:opacity-0")}
              >
                <Scene id={step.scene} world={world} className="h-full w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {after}
      <StepStoryObserver storyId={id} />
    </div>
  )
}
```

```tsx
// components/marketing/sections/step-story-observer.tsx
"use client"

import { useEffect } from "react"

/** Activates the sticky illustration for the step crossing 40% of the viewport (desktop). No-op without JS. */
export function StepStoryObserver({ storyId }: { storyId: string }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(`[data-step-story="${storyId}"]`)
    if (!root) return
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-step-index]"))
    const scenes = Array.from(root.querySelectorAll<HTMLElement>("[data-step-scene]"))
    const numbers = Array.from(root.querySelectorAll<HTMLElement>("[data-step-number]"))
    const activate = (active: number) => {
      scenes.forEach((el, i) => { el.dataset.active = String(i === active) })
      numbers.forEach((el, i) => { el.dataset.active = String(i === active) })
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) activate(Number((entry.target as HTMLElement).dataset.stepIndex))
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    )
    items.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [storyId])
  return null
}
```

- [ ] **Step 4: Implement `DurationPicker`** as a server component. Pages wrap it in `<ServiceAvailabilityGate serviceId="med-cert" fallback={<DurationPicker disabled />}>`.

```tsx
// components/marketing/sections/duration-picker.tsx
import Link from "next/link"

import { FOCUS_RING, TACTILE_SURFACE } from "@/lib/brand/surfaces"
import { WORLD_CLASSES } from "@/lib/brand/worlds"
import { PRICING_DISPLAY } from "@/lib/constants"
import { buildMedCertRequestHref } from "@/lib/marketing/med-cert-selector"
import { nbsp } from "@/lib/typography/nbsp"
import { cn } from "@/lib/utils"

const OPTIONS = [
  { days: "1", label: "1 day", price: PRICING_DISPLAY.MED_CERT },
  { days: "2", label: "2 days", price: PRICING_DISPLAY.MED_CERT_2DAY },
  { days: "3", label: "3 days", price: PRICING_DISPLAY.MED_CERT_3DAY },
] as const

export function DurationPicker({ disabled = false }: { disabled?: boolean }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map((option) => (
        <li key={option.days}>
          <Link
            href={disabled ? "/contact" : buildMedCertRequestHref({ duration: option.days })}
            data-med-cert-cta="pricing"
            data-duration={option.days}
            className={cn(
              "flex min-h-24 flex-col justify-between rounded-2xl border border-black/5 p-5 shadow-md shadow-primary/[0.06] transition-[transform,background-color] duration-150 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none dark:border-white/10",
              WORLD_CLASSES.dawn.tile,
              "hover:bg-world-dawn-200/60",
              TACTILE_SURFACE,
              FOCUS_RING,
            )}
          >
            <span className="text-lg font-semibold text-foreground">{nbsp(option.label)}</span>
            <span className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-semibold tabular-nums text-foreground">{option.price}</span>
              <span className="text-base font-medium text-primary">{disabled ? "Contact us" : "Start"}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 5: Run** the section contract and `pnpm typecheck`. Expected: PASS.

- [ ] **Step 6: Commit** with the message "Add server-rendered StepStory with a sticky desktop illustration and direct-start duration cards".

### Task 15: `FAQSection` split layout and anchors; `CTABanner` world and moat; `StickyCTA` moat

**Files:**
- Modify: `components/sections/faq-section.tsx`, `components/sections/cta-banner.tsx`, `components/marketing/shared/sticky-cta.tsx`
- Create: `lib/marketing/faq-anchor.ts`
- Test: `lib/__tests__/faq-anchor.test.ts`, and additions to `lib/__tests__/landing-sections-contract.test.tsx`

**Interfaces produced:**
- `faqAnchorId(question: string): string`.
- `FAQSection` new props: `layout?: "stacked" | "split"` (default `stacked`) and `aside?: ReactNode`.
- `CTABanner` new props: `world?: WorldId` and `moat?: MoatSurface`.
- `StickyCTA` new prop: `moat?: MoatSurface`.

- [ ] **Step 1: Write the failing tests.**

```ts
// lib/__tests__/faq-anchor.test.ts
import { describe, expect, it } from "vitest"

import { faqAnchorId } from "@/lib/marketing/faq-anchor"

describe("faqAnchorId", () => {
  it("builds stable lowercase ASCII slugs", () => {
    expect(faqAnchorId("Can I get a certificate backdated?")).toBe("faq-can-i-get-a-certificate-backdated")
    expect(faqAnchorId("What if the doctor can’t help?")).toBe("faq-what-if-the-doctor-can-t-help")
  })
  it("caps the slug at 60 characters without a trailing hyphen", () => {
    const id = faqAnchorId("A ".repeat(80))
    expect(id.length).toBeLessThanOrEqual(64)
    expect(id.endsWith("-")).toBe(false)
  })
})
```

Add to `landing-sections-contract.test.tsx`:

```tsx
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { FAQSection } from "@/components/sections/faq-section"
import { CTABanner } from "@/components/sections/cta-banner"
import { faqAnchorId } from "@/lib/marketing/faq-anchor"

  it("FAQ split layout anchors every item, offers copy links and shows one show-all control", () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ question: `Question ${i + 1}?`, answer: `Answer ${i + 1}.` }))
    const html = renderToStaticMarkup(<FAQSection layout="split" title="Before you start" items={items} initialCount={4} viewAllHref="/faq" />)
    expect(html).toContain(`id="${faqAnchorId("Question 1?")}"`)
    expect(html).toContain('aria-label="Copy link to this question"')
    expect(html).toContain("Show all 9 questions")
    expect(html).not.toContain("View all questions")
  })

  it("CTABanner world variant renders the band, the moat pair and no scroll reveal", () => {
    const html = renderToStaticMarkup(<CTABanner world="dawn" moat="certificate" title="Get back to bed." subtitle="x" ctaText="Go" ctaHref="/request" />)
    expect(html).toContain("bg-world-dawn-50")
    expect(html).toContain("No call needed")
    expect(readFileSync(join(process.cwd(), "components/sections/cta-banner.tsx"), "utf8")).toMatch(/world \?[\s\S]*Reveal|!world[\s\S]*Reveal/)
  })
```

The last assertion is only a guard that `Reveal` is conditional on `world`; adapt the regex to the code you write. Rendering `FAQSection` requires its item shape; use the real `items` type.

- [ ] **Step 2: Run them and confirm they fail.**

- [ ] **Step 3: Implement.**

```ts
// lib/marketing/faq-anchor.ts
export function faqAnchorId(question: string): string {
  const slug = question
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "")
  return `faq-${slug}`
}
```

**`FAQSection` split layout:**
- The heading column is `lg:col-span-5` and the accordion `lg:col-span-7`, inside `CONTAINER`. `aside` renders under the heading (used for `ContactLine`).
- Each `AccordionItem` gets `id={faqAnchorId(item.question)}` and `ANCHOR_OFFSET`. After the trigger sits a small "Copy link" `button` (`aria-label="Copy link to this question"`, 44 px hit area) that calls `navigator.clipboard.writeText(\`${location.origin}${location.pathname}#${id}\`)` and shows "Link copied" in a polite live region for 2 s.
- On mount, if `location.hash` matches an item id, open that item and scroll it into view.
- Render `viewAllHref` only when `initialCount` is not set. This fixes the double link (spec 9.2).
- Keep the shared Radix accordion animation (planning refinement 5), and confirm `animate-accordion-*` resolves instantly under reduced motion.
- The stacked layout is unchanged.

**`CTABanner` with `world`:**
- The card uses the world band class (or `SPECTRUM_BAND`) with `film-grain`, centred text and `<MoatBadgePair surface={moat} size="md" />` above the heading.
- The rest stays as today: the CTA, `trust` and refund line.
- It does **not** wrap content in `Reveal`. Without `world`, the markup is unchanged.

**`StickyCTA` with `moat`:**
- `moat` replaces the `mobileSummary` line with `<MoatBadgePair surface={moat} size="sm" qualifier={false} />`.
- Reduce the vertical padding so the bar measures 96 px or less at 390 px with a 48 px button.
- Keep the transition classes and `inert` exactly, per `marketing-reduced-motion-contract`.

- [ ] **Step 4: Run** `pnpm exec vitest run lib/__tests__/landing-sections-contract.test.tsx lib/__tests__/faq-anchor.test.ts lib/__tests__/marketing-reduced-motion-contract.test.ts lib/__tests__/specialty-landing-analytics-contract.test.ts lib/__tests__/moat-badge-contract.test.tsx && pnpm typecheck`. Expected: PASS.

- [ ] **Step 5: Commit** with the message "Extend FAQ, CTA banner and sticky CTA with split layout, anchors, worlds and moat".

### Task 16: Homepage composition

**Files:**
- Create: `components/marketing/home/{service-menu,services-overview,proper-medicine-band}.tsx`
- Modify: `app/(marketing)/page.tsx`, `components/marketing/home-client-controls.tsx`, `lib/analytics/landing-analytics.ts`, `lib/hooks/use-landing-analytics.ts`, `lib/marketing/landing-vocabulary.ts`
- Delete: `components/marketing/portfolio-route-map.tsx`
- Test: `lib/__tests__/landing-analytics-option-contract.test.ts`
- Update pins:
  - `marketing-copy-contract`: `PortfolioRouteMap` presence becomes absence; the six homepage FAQ questions stay byte-identical.
  - `portfolio-art-direction-contract`, `code-clean-retirement-contract`, `specialty-landing-analytics-contract`, `landing-hero-contract`, `money-page-lcp-critical-path`: the home title becomes `title={TAGLINE}` with no `HOME_HERO_TITLE` or `TAGLINE_ACCENT`, and the homepage no longer imports `HeroDoctorReviewMockup`.
  - Other references to `portfolio-route-map` found at planning time:
    - `service-naming-contract` and `marketing-request-reflow-contract`: point them at `components/marketing/home/services-overview.tsx`.
    - `lib/marketing/landing-vocabulary.ts`: swap the path in `LANDING_SURFACES`.
    - The comment in `lib/services/service-catalog.ts` (line 5): now names the services overview.
  - `scripts/check-orphaned-files.sh`.

**Interfaces produced:**
- `HeroServiceMenu()` (server): three rows, each carrying `data-home-cta="hero"` and `data-home-cta-option`.
- `ServicesOverview()` (server): `section#services`.
- `ProperMedicineBand()` (server).
- `trackCTAClick(location, detail?: { option?: string })`.

- [ ] **Step 1: Write the failing analytics test.**

```ts
// lib/__tests__/landing-analytics-option-contract.test.ts
import { describe, expect, it, vi } from "vitest"

import { createLandingAnalyticsTracker } from "@/lib/analytics/landing-analytics"

describe("landing CTA option", () => {
  it("adds cta_option only when a hero menu option is given", () => {
    const capture = vi.fn()
    const tracker = createLandingAnalyticsTracker({ service: "home", capture })
    tracker.trackCTAClick("hero", { option: "certificate" })
    tracker.trackCTAClick("final_cta")
    expect(capture).toHaveBeenNthCalledWith(1, "landing_cta_clicked", { service: "home", cta_location: "hero", cta_option: "certificate" })
    expect(capture).toHaveBeenNthCalledWith(2, "landing_cta_clicked", { service: "home", cta_location: "final_cta" })
  })
})
```

Keeping `cta_location: "hero"` for menu rows keeps the homepage hero click-through comparable with the spec Section 1 baseline.

- [ ] **Step 2: Implement the analytics option.**
  - In `lib/analytics/landing-analytics.ts`, `trackCTAClick` becomes `(location: CTALocation, detail?: { option?: string }) => track("landing_cta_clicked", { service, cta_location: location, ...(detail?.option ? { cta_option: detail.option } : {}), ...versionProperties })`.
  - In `lib/hooks/use-landing-analytics.ts`, pass `detail` through.
  - In `home-client-controls.tsx`, read the control with `const control = target.closest<HTMLElement>("[data-home-cta]")` and call `analytics.trackCTAClick(location, { option: control?.dataset.homeCtaOption })`.
  - Remove the homepage `StickyCTA` render (planning refinement 4), and remove state that only the sticky bar used.
  - Run the test. Expected: PASS.

- [ ] **Step 3: Update the pinned expectations (red)** to the spec 7.1 structure:
  - The homepage renders `<HeroServiceMenu />`, `<ServicesOverview />`, `<StepStory`, `<ProperMedicineBand />`, a `FAQSection` with `layout="split"` and a `CTABanner` with `world="spectrum"`.
  - It no longer renders `PortfolioRouteMap` or `RegulatoryPartners`. `RegulatoryPartners` stays for other pages.
  - "Australian adults 18+" remains in the homepage source, in the services intro.

- [ ] **Step 4: Compose per spec 7.1.**

`app/(marketing)/page.tsx`:
- `export const revalidate = 60`.
- `export const viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F8F7F4" }, { media: "(prefers-color-scheme: dark)", color: "#0B1120" }] }`. If the dark background token isn't `#0B1120`, use the real `--background` value.
- Hero:
  - `title={TAGLINE}` and `titleClassName={cn(homeH1Font.className, "text-balance", <existing min-h/margin classes>)}`;
  - `status={<LiveStatus state={await getLiveStatus({ withMedian: true })} />}` with `timingServiceId="med-cert"`;
  - children: `<p>` "Medical certificates, repeat scripts and private assessments from AHPRA-registered Australian doctors.";
  - `moat={<MoatBadgePair surface="general" animateCheck />}`;
  - `decision={<HeroServiceMenu />}`;
  - `headerCta={{ label: "Start a request", href: "/request" }}`;
  - `mockup={<OutcomeStage variant="home" />}`.
- Then:
  - `<ServicesOverview />`;
  - `<WorldBand world="spectrum" grain>` containing `<StepStory id="how-it-works">`, described below. Only the step section's heading carries the id, so ids stay unique;
  - `<ProperMedicineBand />`;
  - `<FAQSection layout="split" aside={<ContactLine />} items={faqItems} title="Before you start" />`;
  - `<CTABanner world="spectrum" moat="general" title="Ready when you are." subtitle={ICONIC_HOOK} ctaText="Start a request" ctaHref="/request" />`;
  - `MarketingFooter`.
- The `StepStory` inside the band has:
  - `heading="How it works"` and `world="spectrum"`;
  - `intro` set to `<ChipList items={[{ label: "About 3 minutes" }, { label: "Reviewed 24/7" }, { label: "Digital delivery" }]} />`;
  - step "Fill in a short form", body `ICONIC_HOOK`, illustration `form-on-phone`;
  - step "A clinical check", body `getApprovedClaim("clinical_review_sequence_short")` plus `<MoreDetail>{getApprovedClaim("clinical_review_sequence")}</MoreDetail>`, illustration `clinical-check`;
  - step "Your result, sent digitally", body "If approved, your certificate link arrives by email, or your eScript by text.", illustration `certificate-arrives`;
  - `after={<OutcomePaths delivery="general" world="sky" />}`.

`HeroServiceMenu`: three full-width rows, each at least 56 px tall with a mark tile, label, price and chevron. Wrap each in `<ServiceAvailabilityGate serviceId=… fallback={<Row unavailable />}>`.

| Row | Mark | Price | Link | `data-home-cta-option` |
|---|---|---|---|---|
| Medical certificate, plus `MoatBadge claim="no-call" service="med-cert" size="sm" qualifier={false}` | `ServiceMark med-cert` (40) | `PRICING_DISPLAY.FROM_MED_CERT` | `/medical-certificate` | `certificate` |
| Repeat prescription | `ServiceMark repeat-rx` (40) | `PRICING_DISPLAY.REPEAT_SCRIPT` | `/prescriptions` | `prescription` |
| Private assessments | `AssessmentsMark` on a 40 px spectrum tile | `PRICING_DISPLAY.FROM_CONSULT` | `#services` | `assessments` |

Rows use `TACTILE_SURFACE`, lift 2 px on hover and press to 0.99 (180 ms). Prices are `tabular-nums` and wrapped with `nbsp`.

`ServicesOverview` (`section#services` with `CONTAINER`, `SECTION_Y` and `ANCHOR_OFFSET`):
- `SectionHeading` "What do you need?" with intro "Choose a service. The fee is shown before you start. For Australian adults 18+."
- **Featured certificate card** (dawn tile band): `ServiceMark med-cert` (56), "Medical certificate", `FROM_MED_CERT`, `MoatBadge claim="no-call" service="med-cert" size="sm"`, `ChipList` "Work, study or carer’s leave" and "No Medicare needed", and a `Button` "Get a certificate" → `/medical-certificate`.
- **Featured prescription card** (sky): `ServiceMark repeat-rx`, "Repeat prescription", `REPEAT_SCRIPT`, `MoatBadgePair surface="general" size="sm"`, chips "One regular medicine" and "eScript by text if approved", and `Button` "Get your repeat" → `/prescriptions`.
- **Four assessment rows** from `getActiveServices().filter((s) => !["med-cert", "repeat-rx"].includes(s.id))`. Each row has `ServiceMark service={s.id}` (40), `s.title`, `s.subtitle`, `nbsp(`${s.pricePrefix ? `${s.pricePrefix} ` : ""}${s.price}`)`, a chevron and `getServiceMarketingHref(s)`. Wrap each in `ServiceAvailabilityGate serviceId={s.id}` with an "Unavailable" fallback row without a link.

`ProperMedicineBand` (white band):
- `SectionHeading` "Proper medicine, not a loophole."
- `<ClinicalModelPanel />`.
- One line, "Every certificate has a reference your employer can check at instantmed.com.au/verify.", linking to `/verify`.
- One link, "What we won’t do", to the existing page (find its route with `grep -rn "won’t do\|won't do" app`).

Add the three new home files to `LANDING_SURFACES`.

- [ ] **Step 5: Run** the updated contracts, then `pnpm typecheck` and `pnpm lint`. Expected: PASS.

- [ ] **Step 6: Browser check** at 1440 and 390, light and dark. Confirm:
  - the service menu's three rows sit inside 812 px, below the moat pair;
  - `#services` scrolls below the header;
  - no console errors.

- [ ] **Step 7: Commit** with the message "Compose the redesigned homepage".

### Task 17: Medical certificate composition and fixes

**Files:**
- Modify: `components/marketing/med-cert-landing.tsx`, `components/marketing/med-cert-client-controls.tsx`, `components/marketing/med-cert-reason-links.tsx`, `app/medical-certificate/page.tsx` (`viewport`)
- Delete: `components/marketing/sections/limitations-section.tsx`, and `components/shared/employer-logo-marquee.tsx` only if `grep -rn EmployerLogoMarquee app components` finds no other importer. Keep `med-cert-hero-mockup.tsx` for `/consult`; only remove its import from this page.
- Update pins:
  - `marketing-copy-contract`: the marquee assertion at line 540 becomes "the certificate page must not contain `EmployerLogoMarquee`", with a comment citing WCAG 2.2.2, trademark risk and the template tell.
  - `money-page-narrative-compression-contract`: the new section order.
  - `canonical-trust-copy-contract`: the local `CLINICAL_REVIEW_SEQUENCE` constant (line 46) now renders inside `MoreDetail` and the short claim leads; accept either (spec 5.6).
  - `seo-indexing-contract`: "Fair Work Act 2009" stays in the source.
  - `money-page-lcp-critical-path` and `advertising-compliance-guard`: the certificate page no longer imports `MedCertHeroMockup`. The file stays in the guard's surface lists because `/consult` still renders it.
  - If the marquee file is deleted, update:
    - `advertising-compliance-guard`: remove the path from `PUBLIC_TRUST_LOGO_SURFACES`;
    - `money-page-image-performance-contract` and `marketing-copy-contract`: remove their marquee references.
  - `limitations-section` references: `prescription-pricing-art-direction-contract` and `code-clean-retirement-contract`.
  - `scripts/check-orphaned-files.sh`, `lib/marketing/landing-vocabulary.ts`.

- [ ] **Step 1: Update the order pin (red):** `<Hero`, `<FitCheck`, `data-track-section="employer"`, `<StepStory`, `<ClinicalModelPanel`, `<DurationPicker`, `items={MED_CERT_LANDING_FAQ}`, `<CTABanner`, `<MedCertReasonLinks`.

- [ ] **Step 2: Compose per spec 7.2**, using the pre-cleared strings from spec 7A.
  - **Hero:** as in Task 10, plus `specimenTrigger`: an absolutely positioned transparent button over the phone labelled "See a specimen certificate", wrapped in `<SpecimenViewer trigger={…}><CertificateSpecimen /></SpecimenViewer>`.
  - **Fit check** (`SectionHeading` "Is this right for you?"):
    - Good for: "Cold and flu", "Gastro", "Migraine", "Back pain", "Period pain", "A mental health day", "Caring for a sick family or household member".
    - See a GP instead: "WorkCover, insurance or legal matters", "Exam deferral or fitness checks", `` `More than ${MAX_MED_CERT_DURATION_DAYS} days off` ``, "Needs a physical exam", "Ongoing or complex conditions", "Emergencies: call 000".
    - Note: "If your request isn’t suitable, you get a full refund."
    - This replaces `LimitationsSection`, fixing the "3–5 days" error (spec 9.1).
  - **Employer section** (white band, `data-track-section="employer"`, heading "Will my employer accept it?"):
    - **Left column:**
      - three facts: "Issued by AHPRA-registered Australian doctors.", "Each certificate has a reference your employer can check at instantmed.com.au/verify." and `MED_CERT_DOCUMENT_SCOPE`;
      - the line "Fair Work says evidence should satisfy a reasonable person. Employer and institution policies may vary.";
      - links "Verify a certificate" (`data-med-cert-cta="verify_link"`) and "For employers" (`data-med-cert-cta="employer_link"`);
      - the three resource links inside `MoreDetail`.
    - **Right column:** `VerifyDemo` over `<Scene id="verify" world="dawn" />`, and below it a "See the full certificate" `SpecimenViewer` trigger.
  - **`StepStory`** (`WorldBand world="dawn"`):
    - `id="how-it-works"`, `heading="How it works"`, `intro={MED_CERT_WEDGE}` verbatim.
    - Steps:
      - "Tell us what’s going on", body `ICONIC_HOOK`, illustration `form-on-phone`, `aside={<WhatYouNeed variant="certificate" />}`;
      - "A clinical check", body `getApprovedClaim("clinical_review_sequence_short")` plus `<MoreDetail>{CLINICAL_REVIEW_SEQUENCE}</MoreDetail>`, illustration `clinical-check`;
      - "Your certificate, by secure link", body "If approved, we email you a secure link to your PDF certificate.", illustration `certificate-arrives`.
    - `after={<OutcomePaths delivery="certificate" world="dawn" />}`.
  - **`<ClinicalModelPanel lead="certificate" />`** in a white band, heading "Who checks your request".
  - **Pricing:** `SectionHeading` "Pick your days"; `<ServiceAvailabilityGate serviceId="med-cert" fallback={<DurationPicker disabled />}><DurationPicker /></ServiceAvailabilityGate>`; the line "Covers the clinical check, your secure PDF and verification. No subscription."; the refund line `GUARANTEE` with `refund_payment_process` in `MoreDetail`.
  - **FAQ:** `layout="split"`, `aside={<ContactLine />}`.
  - **Final band:** `<CTABanner world="dawn" moat="certificate" title="Get back to bed." subtitle={ICONIC_HOOK} ctaText={`Get your certificate · ${PRICING_DISPLAY.FROM_MED_CERT}`} ctaHref={MED_CERT_START_HREF} />`. This replaces the `rounded-full` final CTA (spec 9.4).
  - **`MedCertReasonLinks`:** restyled as a visible compact link list with no `details` disclosure, carrying `data-seo-links=""`.
  - **Sticky bar:** `med-cert-client-controls.tsx` passes `moat="certificate"` to `StickyCTA` and tracks the `pricing` location.
  - **Viewport:** `export const viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#FFF6EE" }, { media: "(prefers-color-scheme: dark)", color: "#1F1A16" }] }`.

- [ ] **Step 3: Fix the unsized lazy images (spec 9.5).** Build, load all three pages and check the console, or Lighthouse's `unsized-images` audit, for images without dimensions. Add explicit `width` and `height` to each one flagged, and record the files in the receipt.

- [ ] **Step 4: Run** the updated contracts, `pnpm typecheck` and `pnpm lint`. Expected: PASS.

- [ ] **Step 5: Browser check** at 1440 and 390, in light, dark and reduced motion. Confirm:
  - the specimen opens and closes with the keyboard and focus returns;
  - the sticky bar is 96 px or less;
  - the phone page length is 10.0 screens or fewer (Task 22 ratchets it).

- [ ] **Step 6: Commit** with the message "Compose the redesigned medical-certificate page and fix its scope errors".

### Task 18: Prescriptions composition

**Files:**
- Modify: `components/marketing/prescriptions-landing.tsx`, `components/marketing/prescriptions-client-controls.tsx`, `app/prescriptions/page.tsx`
- Delete: `components/marketing/mockups/escript-hero-mockup.tsx`. Its known references are in `advertising-compliance-guard`, `marketing-reduced-motion-contract` and `money-page-lcp-critical-path`: point them at `components/marketing/outcome-stage/escript-screen.tsx`, or drop the entry.
- Update pins:
  - `money-page-narrative-compression-contract`: the order, and the retired-marker list (`HowItWorksInline` stays absent).
  - `prescription-pricing-art-direction-contract`: the lifecycle becomes a four-step `StepStory` with titles "Tell us your medicine", "Doctor review", "eScript by text" and "Any Australian pharmacy". The approved `prescription_if_approved` line keeps the "only if approved" meaning.
  - `marketing-copy-contract`: `prescribing_identity_required` is still present.
  - `code-clean-retirement-contract`, `lib/marketing/landing-vocabulary.ts`.

- [ ] **Step 1: Update the pins (red).**

- [ ] **Step 2: Compose per spec 7.3.**

`app/prescriptions/page.tsx`:
- `export const revalidate = 60` (from 86400);
- `const liveStatus = await getLiveStatus({ withMedian: false })`;
- `viewport` `themeColor` `#F2F7FE` light and `#121A26` dark.

Page sections:
- **Hero:**
  - `status={<LiveStatus state={liveStatus} />}`;
  - children `<p>{getApprovedClaim("form_first_call_if_needed")}</p>`;
  - `moat={<MoatBadgePair surface="general" animateCheck />}`;
  - `chips` "One regular medicine" and "Medicare or IHI needed";
  - the existing `PrescriptionHeroCTA` as primary CTA content ("Get your repeat · $29.95");
  - `headerCta={{ label: \`Get your repeat · ${PRICING_DISPLAY.REPEAT_SCRIPT}\`, href: <existing start href> }}`;
  - `mockup={<OutcomeStage variant="escript" />}`;
  - no accent span in the title.
- **Fit check** (heading "Check it fits"):
  - "A repeat may fit when": "Previously prescribed", "Stable dose", "One regular medicine", "Health details up to date", "In Australia", "Aged 18 or over".
  - "See your GP instead when": "A new medicine", "Controlled or dependence-forming medicines", "Needs tests or an exam", "Urgent symptoms (call 000 in an emergency)".
  - Notes: `getApprovedClaim("prescribing_identity_required")` verbatim, and "Medicines for ED, hair loss, the pill or weight have their own assessment."
- **`StepStory`** (`WorldBand world="sky"`):
  - `id="how-it-works"`, heading "From form to pharmacy", intro "No appointment, no video call. Here’s the whole path."
  - Steps:
    - "Tell us your medicine", body `ICONIC_HOOK`, `form-on-phone`, `aside={<WhatYouNeed variant="prescription" />}`;
    - "Doctor review", body `form_first_call_if_needed`, `clinical-check`;
    - "eScript by text", body `prescription_if_approved`, `escript-message`;
    - "Any Australian pharmacy", body "Show the token at the pharmacy. You pay for the medicine there.", `pharmacy`.
  - `after={<OutcomePaths delivery="prescription" world="sky" />}`.
- **`<ClinicalModelPanel lead="prescription" />`** in a white band, heading "Who checks your request".
- **`FeeCard`** (heading "One review fee. Medicine paid separately."):
  - rows: `{ label: "Doctor review, once per request", value: PRICING_DISPLAY.REPEAT_SCRIPT }`, `{ label: "Your medicine, paid at the pharmacy", value: "PBS or private price" }`, `{ label: "If the doctor declines", value: "Full refund" }`;
  - footnote "No subscription."
- **FAQ:** `layout="split"`, `initialCount={4}`, `aside={<ContactLine />}`, no `viewAllHref`.
- **Final band:** `<CTABanner world="sky" moat="general" title="Ready for your repeat?" subtitle={ICONIC_HOOK} price=… />`.
- **Learn more:** `PrescriptionResourceNav`, restyled and carrying `data-seo-links=""`.
- **Sticky bar:** `moat="general"`.

- [ ] **Step 3: Run the contracts,** then build and check that no "No call needed" leaks into the page body: `pnpm build && grep -o "No call needed" .next/server/app/prescriptions.html | wc -l`. Expected: `0`. The Services menu is not in the static HTML while closed.

- [ ] **Step 4: Browser check** at 1440 and 390, in light and dark.

- [ ] **Step 5: Commit** with the message "Compose the redesigned prescriptions page".

### Task 19: Header, Services menu, mobile menu and footer

**Files:**
- Modify: `components/shared/navbar.tsx`, `components/shared/navbar/services-dropdown.tsx`, `components/shared/navbar/mobile-menu-content.tsx`, `components/shared/navbar/mobile-drawer.tsx`, `components/shared/navbar/user-menu.tsx`, `components/shared/footer.tsx`
- Test: `lib/__tests__/landing-chrome-contract.test.ts`, plus updates to `navigation-routing-contract`, `marketing-reduced-motion-contract` and `money-page-lcp-critical-path` where they pin navbar strings

**Interfaces produced:** `isCatalogServiceAvailable(service: ServiceDef, isServiceDisabled: (id: ServiceId) => boolean): boolean`. It is extracted from the logic in `services-dropdown.tsx` (lines 44–50) and exported from the same file, so the menu, mobile menu and services overview share it.

- [ ] **Step 1: Write the failing test.**

```ts
// lib/__tests__/landing-chrome-contract.test.ts
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8")

describe("landing chrome", () => {
  const dropdown = read("components/shared/navbar/services-dropdown.tsx")
  const mobile = read("components/shared/navbar/mobile-menu-content.tsx")
  const navbar = read("components/shared/navbar.tsx")
  const footer = read("components/shared/footer.tsx")

  it("renders a solid grouped Services panel with marks, prices and the certificate moat", () => {
    expect(dropdown).not.toMatch(/backdrop-blur|border-dawn/)
    expect(dropdown).toContain("Most requested")
    expect(dropdown).toContain("Private assessments")
    expect(dropdown).toMatch(/ServiceMark|variant="mark"/)
    expect(dropdown).toContain('claim="no-call"')
    expect(dropdown).toContain("getServiceMarketingHref(")
    expect(dropdown).toContain("export function isCatalogServiceAvailable")
    expect(mobile).toMatch(/ServiceMark|variant="mark"/)
  })

  it("uses the new primary action and condenses on scroll past the hero", () => {
    for (const file of ["components/shared/navbar/user-menu.tsx", "components/shared/navbar/mobile-drawer.tsx"]) {
      expect(read(file), file).toContain("Start a request")
      expect(read(file), file).not.toContain("Get started")
    }
    expect(navbar).toContain("data-condensed")
    expect(navbar).toContain("[data-hero]")
    expect(navbar).toContain("data-header-cta-label")
  })

  it("keeps the footer's certifications, contact and emergency line and drops the three-chip row", () => {
    expect(footer).toContain("LegitScriptSeal")
    expect(footer).toContain("GoogleAdsCert")
    expect(footer).toContain("StripeBadge")
    expect(footer).toContain('getApprovedClaim("prop_phrase")')
    expect(footer).toContain("24/7 voice message support")
    expect(footer).not.toContain("BADGE_REGISTRY")
  })
})
```

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement.**
  - **Header bar:** keep the floating rounded bar, but with a solid `bg-white dark:bg-card` surface and a sky shadow. Items: Services (menu), How it works, Pricing, Contact us, Log in and a primary "Start a request" → `/request`. Replace "Get started" in `user-menu.tsx` and `mobile-drawer.tsx`.
  - **Services panel:**
    - solid `bg-white dark:bg-card`, `border border-border/60` and `shadow-xl shadow-primary/[0.08]`, about 360 px wide;
    - opens with a 0.98→1 scale from the trigger in 180 ms, instant under reduced motion;
    - two groups. "Most requested" holds certificate and prescription; "Private assessments" holds the four specialty services;
    - each row is a link with a 40 px mark tile, title, catalogue subtitle and price;
    - the certificate row adds `MoatBadge claim="no-call" service="med-cert" size="sm" qualifier={false}` (spec 6.5).

    This fixes the pale yellow blurred border (spec 9.3).

    `services-dropdown.tsx` is in `NON_MEDCERT_FORM_FIRST_SURFACES` in `advertising-compliance-guard`, because the menu appears on prescribing pages. The badge follows the existing precedent: the catalogue subtitle "No call for suitable requests" already renders on the certificate row. Keep the no-call wording attached to that row only, and never type the phrase literally in this file.
  - **Mobile menu:** the same grouped rows with 48 px targets, then the secondary links, then a pinned "Start a request". The sheet slides in 220 ms and out 160 ms, instant under reduced motion. Keep every `marketing-reduced-motion-contract` string.
  - **Condensing header (`lg` and up):**
    - When `[data-hero]` leaves the viewport (IntersectionObserver), set `data-condensed="true"`.
    - The bar slims from 64 to 52 px with `transition-[height,padding] duration-200 motion-reduce:transition-none`.
    - It reveals a compact CTA whose label and href come from the hero's `data-header-cta-label` and `data-header-cta-href`, falling back to "Start a request" → `/request`.
    - Keep the existing `scrolled` logic.
  - **Footer (spec 6.5):**
    - one unboxed layout;
    - a brand block: logo, `getApprovedClaim("prop_phrase")` ("Telehealth without the small talk."), `CONTACT_EMAIL`, `CONTACT_PHONE` and "24/7 voice message support";
    - Services, Help, About and Legal columns; the Services links show 40 px marks;
    - a trust row: `StripeBadge`, `LegitScriptSeal`, `GoogleAdsCert` and the text "AHPRA-registered doctors";
    - the emergency line, ABN and copyright, and the theme toggle;
    - remove the three-chip `BADGE_REGISTRY` row.

- [ ] **Step 4: Run** `pnpm exec vitest run lib/__tests__/landing-chrome-contract.test.ts lib/__tests__/navigation-routing-contract.test.ts lib/__tests__/marketing-reduced-motion-contract.test.ts lib/__tests__/money-page-lcp-critical-path.test.ts lib/__tests__/moat-badge-contract.test.tsx && pnpm typecheck`. Expected: PASS.

- [ ] **Step 5: Browser check:**
  - the Services menu by keyboard (Enter, arrows, Escape);
  - the mobile menu at 320, 768 and 844x390 (the `front-door` cases);
  - the condensing header at 1440, on all three pages.

- [ ] **Step 6: Commit** with the message "Redesign the header, Services menu, mobile menu and footer".

### Task 20: Share images and browser tint

**Files:**
- Modify: `app/opengraph-image.tsx`, `app/medical-certificate/opengraph-image.tsx`, `app/layout.tsx`
- Create: `app/prescriptions/opengraph-image.tsx`, `app/_og/plus-jakarta-sans-latin-500-normal.woff`
- Update: `lib/__tests__/marketing-copy-contract.test.ts` (share-image strings), `lib/__tests__/opengraph-image-contract.test.ts` (add the prescriptions image)

- [ ] **Step 1: Add the font.** It is OFL-licensed; the licence is already in `lib/fonts/OFL-Plus-Jakarta-Sans.txt`.

```bash
mkdir -p app/_og && curl -fsSL -o app/_og/plus-jakarta-sans-latin-500-normal.woff "https://cdn.jsdelivr.net/npm/@fontsource/plus-jakarta-sans@5/files/plus-jakarta-sans-latin-500-normal.woff"
```

- [ ] **Step 2: Update the pins (red).** The share-image sources read the moat text through `getApprovedClaim`, so the pins check claim ids rather than literals.
  - The root image contains "Faster than your GP." (`TAGLINE`) and references `trust_no_appointment_label`.
  - The certificate image contains "Your medical certificate. Without the waiting room." and references `trust_no_call_needed_label`. It must **not** contain "Under 1 Hour", "Accepted Everywhere", "AHPRA-Registered GP" or "Typically ~".
  - The prescriptions image contains "Your regular medication. A simpler repeat." and references `trust_no_video_call_label`. It must not reference `trust_no_call_needed_label`, since `app/prescriptions` is a non-certificate surface for `advertising-compliance-guard`.
  - All three keep explicit flex declarations for the edge renderer (existing contract).

- [ ] **Step 3: Implement the three images:**
  - 1200x630, `runtime = 'edge'`;
  - the world gradient, the page's mark drawn inline as SVG and the H1 in Plus Jakarta 500;
  - the moat pill: text from `getApprovedClaim`, the green colours from Task 2 as literals, since Satori cannot read CSS variables;
  - the InstantMed wordmark via the existing logo fetch.

  Load the font with `fetch(new URL("./_og/plus-jakarta-sans-latin-500-normal.woff", import.meta.url)).then((r) => r.arrayBuffer())` in `app/opengraph-image.tsx`, and with `"../_og/…"` in the nested routes. Pass it as `fonts: [{ name: "Plus Jakarta Sans", data, weight: 500, style: "normal" }]`.

  In `app/layout.tsx`, set the default `themeColor` to ivory `#F8F7F4` with the dark variant. Per-route values come from the page `viewport` exports added in Tasks 16–18.

- [ ] **Step 4: Run** `pnpm exec vitest run lib/__tests__/opengraph-image-contract.test.ts lib/__tests__/marketing-copy-contract.test.ts`. Then open `/opengraph-image`, `/medical-certificate/opengraph-image` and `/prescriptions/opengraph-image` in the browser.

- [ ] **Step 5: Commit** with the message "Redesign share images, remove banned certificate claims and tint the browser bar per page".

### Task 21: Documentation

**Files:**
- `DESIGN.md`:
  - section 1: primary `#2563EB` and the world tokens;
  - section 6: hero anatomy and `LiveStatus` rules;
  - section 7: marks, the `mark` tile variant, and removal of the indigo exception;
  - section 9: navigation;
  - section 12: motion corrections;
  - a new "Moat badge" rule;
  - the rule that success green is used only for the moat, live status and success states.
- `docs/DESIGN_SYSTEM_CHANGELOG.md`, `lib/design-system/version.ts`, `docs/AI_ONBOARDING.md` and the `DESIGN.md` version line: bump to 2.1.0 together (`design-system-retired-shims.test.ts` pins all four).
- `docs/VOICE.md`, `docs/ADVERTISING_COMPLIANCE.md`, `docs/CLINICAL.md`, `docs/BRAND.md` section 6.1, `docs/PRIMITIVES.md`.
- `docs/ARCHITECTURE.md`: component patterns, including fixing the stale `ServiceIconTile` section, and directory counts.
- `docs/TESTING.md`: the visual regression workflow and its report-only period.
- `wiki/architecture.md`: counts.

- [ ] **Step 1: Write the doc changes** from spec 7A's "Docs updated" list, plus the following. Keep the existing `form_first_wedge` sentence ("Complete a secure clinical form. A doctor reviews it and may call you briefly before prescribing.") in `docs/BUSINESS_PLAN.md`, `docs/VOICE.md`, `docs/ADVERTISING_COMPLIANCE.md` and `docs/PRIMITIVES.md`, because `approved-claims-contract` requires it there. Add the new line beside it; do not replace it.
  - **`docs/VOICE.md`:**
    - The form-first wedge row lists `form_first_call_if_needed` as the lead line on redesigned pages.
    - Rule 3 records Rey's clinician approval (2026-09-26) of "No video call" and the conditional call line.
    - Add the rule that "A doctor is online" is singular and appears only through `LiveStatus`.
  - **`docs/ADVERTISING_COMPLIANCE.md` sections 5 and 6:** the approved phrasing. The unqualified "No call needed" ban for prescribing stays.
  - **Tagline substantiation:** add a subsection to `docs/ADVERTISING_COMPLIANCE.md`.
    - Fetch the current ABS "Patient Experiences" release. Cite the share of people who waited longer than they felt acceptable for a GP appointment, and the share who waited 24 hours or more for urgent care, with the URL and the date read.
    - Include InstantMed's certificate median from the live status.
    - Then add `ADS_RECEIPTS` to `APPROVED_CLAIMS.tagline.sources` (spec 7.1).
  - **`docs/CLINICAL.md` form-first section:** the approved public phrasing. The engineering implication is unchanged: pathways support call escalation, and copy never constrains a clinically indicated call.
  - **`docs/BRAND.md` section 6.1:** rewrite for `LiveStatus`: data source, the 90-minute activity window by the available doctor, the singular "A doctor is online" and the "Requests open 24/7" fallback. Keep "Dot indicators use success green".
  - **`DESIGN.md` section 12:**
    - `initial={false}` is valid in Framer Motion 11.
    - Scroll fades are not a mobile default.
    - Large transitions with spatial meaning may run 300–400 ms.

- [ ] **Step 2: Run** `pnpm exec vitest run lib/__tests__/project-docs-drift-contract.test.ts lib/__tests__/design-system-retired-shims.test.ts lib/__tests__/approved-claims-contract.test.ts lib/__tests__/canonical-trust-copy-contract.test.ts lib/__tests__/marketing-copy-contract.test.ts && pnpm doc:audit`. Expected: PASS. Fix the counts it reports.

- [ ] **Step 3: Commit** with the message "Document the landing redesign system and approved moat phrasing".

---

# Phase C: Verification and release

### Task 22: End-to-end coverage, motion contract and the screenshot gate

**Files:**
- Create: `e2e/landing-redesign.spec.ts`, `lib/__tests__/landing-motion-contract.test.ts`, `.github/workflows/visual-regression.yml`
- Modify: `e2e/landing-pages.spec.ts`, `e2e/front-door.spec.ts`, `e2e/money-pages-foundations.spec.ts`, `e2e/marketing.visual.spec.ts`

- [ ] **Step 1: Write the motion contract.**

```ts
// lib/__tests__/landing-motion-contract.test.ts
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8")

describe("landing motion", () => {
  const css = read("app/globals.css")
  const block = css.slice(css.indexOf("LANDING REDESIGN SURFACES"))

  it("never loops forever; only the live glow repeats, three times", () => {
    expect(block).not.toMatch(/infinite/)
    expect(css).toMatch(/\.live-glow \{[^}]*animation: live-glow 1\.6s ease-in-out 3;/)
  })

  it("turns every new animation off under reduced motion", () => {
    for (const name of ["moat-check-draw", "live-glow", "stage-rise", "status-tick", "notice-in"]) {
      expect(css, name).toMatch(new RegExp(`prefers-reduced-motion: reduce\\)[^}]*\\.${name}[^}]*animation: none`))
    }
  })

  it("keeps scroll reveals off the three pages", () => {
    for (const file of ["app/(marketing)/page.tsx", "components/marketing/med-cert-landing.tsx", "components/marketing/prescriptions-landing.tsx"]) {
      expect(read(file), file).not.toMatch(/<Reveal\b|from "@\/components\/[^"]*reveal"/)
    }
  })
})
```

Adapt the reduced-motion regex if several classes share one `@media` block. It must assert each class ends at `animation: none`.

- [ ] **Step 2: Write `e2e/landing-redesign.spec.ts`,** using the availability stub pattern in `e2e/landing-pages.spec.ts`. For `/`, `/medical-certificate` and `/prescriptions`, cover:
  - **Hero word budget:** clone `[data-hero]`, remove `h1, figure[data-hero-facsimile], [data-hero-status], [data-hero-proof], [data-hero-reviews], .sr-only`, count words, and expect 38 or fewer.
  - **Page word budget** (spec 1): count words in `main` after removing FAQ answer panels (`[data-state] [role="region"]` or the accordion content), `[data-more-detail] > :not(summary)`, `[data-seo-links]`, `header`, `footer` and `nav`. Expect 420 or fewer on home, 480 on the certificate page and 440 on prescriptions.
  - **Overflow:** no horizontal overflow at 320x568, and none at 320x568 with `document.documentElement.style.fontSize = "200%"`.
  - **Sticky bar:** after a 1,400 px scroll, the bar is 96 px or less (service pages only). With the last FAQ trigger focused, its bounding box does not intersect the bar.
  - **Reduced motion:** with `page.emulateMedia({ reducedMotion: "reduce" })`, `.stage-rise`, `.status-tick`, `.notice-in`, `.live-glow` and `.moat-check-draw` have computed `animation-name: none`, and the condensed header's `transition-duration` is `0s`.
  - **Moat qualifier:**
    - Tab to the first `button[aria-label^="About"]`, press Enter, see the popover text, press Escape, and confirm focus returns to the button.
    - Repeat with `page.tap` in a 390x844 touch context.
  - **No-call leak:** on `/prescriptions`, `main`, the sticky bar and the final band contain no "No call needed". On `/medical-certificate`, the hero does.
  - **Specimen** (`/medical-certificate`): click "See the full certificate"; a dialog named "Specimen medical certificate" shows "SPECIMEN · NOT A VALID CERTIFICATE"; Escape closes it and focus returns.
  - **Duration cards:** the three `a[data-med-cert-cta="pricing"]` hrefs contain `duration=1`, `2` and `3`.
  - **FAQ hash:** read the `id` of the first FAQ item, visit `/medical-certificate#<id>`, and see that answer expanded.
  - **Disabled service:** with the stub set to `disable_med_cert: true`, the certificate hero CTA says "Contact us", `[data-live-status]` is hidden, and the duration card hrefs are `/contact`.
  - **Condensing header:** at 1440, after scrolling past the hero, `[data-condensed="true"]` is visible and shows the page's price label.
  - **Browser tint:** `meta[name="theme-color"]` matches the per-route light values.
  - **Share images:** `GET` each `opengraph-image` returns 200 with `content-type` `image/png`.
  - **Accessibility:** `new AxeBuilder({ page }).analyze()` from `@axe-core/playwright` returns no `serious` or `critical` violations, in light and in dark (`emulateMedia({ colorScheme: "dark" })`).

- [ ] **Step 3: Update the existing specs.**
  - **`e2e/landing-pages.spec.ts`:**
    - Replace the homepage `#pricing ul.grid > li` assertion (line 215) with "the services overview renders two featured cards and four assessment rows".
    - Ratchet `maxPhoneScreens` for the three pages (lines 19–21) down to the new measured values, rounded up to the nearest 0.25.
  - **`e2e/front-door.spec.ts`:**
    - The reduced-motion case targets `.stage-rise`.
    - Move the specimen-font case to the new certificate screen, or delete it with the old mockup.
    - Keep the headline glyph-coverage case.
  - **`e2e/money-pages-foundations.spec.ts`:** the homepage specimen case expects the caption "Example: a specimen medical certificate on a phone…".

- [ ] **Step 4: Set up the screenshot gate** (spec 10 and planning refinement 6).
  - In `e2e/marketing.visual.spec.ts`:
    - Replace the entries for home, medical-certificate and prescriptions with light-mode full-page captures at 1440x900 and 390x844, plus the open Services menu (1440) and the mobile menu (390).
    - Use `animations: "disabled"`; mask `[data-live-status]`, `[data-hero-reviews]` and date text; set `maxDiffPixelRatio: 0.01`.
  - Delete the stale darwin PNGs for those three pages from `e2e/marketing.visual.spec.ts-snapshots/`.
  - Create `.github/workflows/visual-regression.yml`:
    - **Triggers:** `workflow_dispatch` with input `update` (boolean, default false), and `pull_request` limited by `paths:` to `app/(marketing)/page.tsx`, `app/medical-certificate/**`, `app/prescriptions/**`, `components/marketing/**`, `components/shared/navbar/**`, `components/shared/footer.tsx`, `components/brand/**` and `app/globals.css`.
    - **Job:** install, build, then run `pnpm exec playwright test e2e/marketing.visual.spec.ts --project=chromium` against a production build with the availability stub. Add `--update-snapshots` when `inputs.update` is true.
    - **Output:** upload the snapshot directory and the Playwright report as artifacts.
    - **Report-only:** the comparison step has `continue-on-error: true`, so it is not a required check.
  - Run the workflow with `update: true` and commit the `*-chromium-linux.png` baselines from its artifact. The commit message must say it updates baselines.
  - Record in `docs/TESTING.md` the date the two-week report-only period ends. Making the check required later is a separate ruleset change and needs Rey's approval.

- [ ] **Step 5: Run everything** against a production build:

```bash
pnpm exec vitest run lib/__tests__/landing-motion-contract.test.ts
PLAYWRIGHT=1 PLAYWRIGHT_SERVER_MODE=production PLAYWRIGHT_PORT=3071 pnpm exec playwright test e2e/landing-redesign.spec.ts e2e/landing-pages.spec.ts e2e/front-door.spec.ts e2e/money-pages-foundations.spec.ts --project=chromium
```

Expected: PASS.

- [ ] **Step 6: Commit** with the message "Cover the landing redesign end to end and add the screenshot gate".

### Task 23: Full verification and reviews

- [ ] **Step 1: Run the full suite:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Record the pass counts.

- [ ] **Step 2: Performance.**
  - Run a production-build trace on `/medical-certificate` at 390x844 with 4x CPU and Fast 4G. Expect LCP of 800 ms or lower and CLS 0.
  - Check the added client JavaScript per page with the repo's bundle-size gate. Expect 15 KB gzipped or less.
  - Run mobile Lighthouse on all three pages. Expect 100 for accessibility, best practices and SEO.

- [ ] **Step 3: Browser proof matrix** with `instantmed-ui-browser-verification`. For each page, check:
  - 1440x900 and 390x844, in light and dark;
  - reduced motion;
  - 320x568 at 200% text;
  - keyboard navigation through the header, moat qualifiers, specimen, FAQ and sticky CTA;
  - the desktop step-by-step sequence sampled at entry, at each step and at exit.

  Then check a stale-status case: with `doctor_available` true but no activity in the window, the hero shows "Requests open 24/7". Test locally by mocking the signals, or wait out the 90-minute window on a production build. Assemble contact sheets.

- [ ] **Step 4: Template-tell review** (spec 5.8, judged by eye). Confirm none of the 11 tells remain:
  - identical icon-card grids;
  - thin monochrome decorative icons;
  - a blue accent phrase in a headline;
  - all-caps eyebrows;
  - middle-dot fact strings in body copy;
  - an arrow on every link;
  - an auto-scrolling marquee;
  - scroll fades;
  - stat rows;
  - cream-plus-serif;
  - a generic "Get started" as the homepage action.

  Record the result.

- [ ] **Step 5: Compliance and clinical pass.**
  - Rerun `instantmed-marketing-compliance-review` and `instantmed-clinical-safety-review` on the **rendered** strings of the three pages, the chrome and the share images.
  - Confirm the no-call badge sits within the approved certificate protocol under the Medical Board telehealth guidance (spec 10).
  - Record keep, revise or block for each string in the PR body. Any "revise" blocks release until fixed.

- [ ] **Step 6: Independent review.** Use `superpowers:requesting-code-review` on the whole branch against `origin/main`, and resolve every finding.

- [ ] **Step 7: Mark the PR ready** and let CI run. The required checks are `build` and `e2e`, and this change runs the full E2E suite. Do not merge before 8 October.

### Task 24: Release and measurement (on or after 8 October)

- [ ] **Step 1: Pre-merge checks.**
  - Confirm with Rey that the 7 October Ads read is complete.
  - Confirm the certificate form-simplification release is at least 7 days apart from this one, or record the overlap.
  - Recheck the ProductReview listing (spec 5.7) and update `lib/social-proof/index.ts` if the score has changed.

- [ ] **Step 2: Merge** after exact-head CI passes, following the ROADMAP protocol.
  - Wait for the Vercel production deployment.
  - Confirm the `post-deploy-smoke` workflow passes, and load the three pages yourself.
  - Annotate the release in PostHog (`annotation` create) with the merge SHA, and ask Rey to annotate it in Google Ads.

- [ ] **Step 3: Measure.**
  - At 14 days, compare hero CTA click-through and canonical `intake_started` per landing session against the 14 days before release, per route, using the spec Section 1 query definitions. Repeat the 28-day table at 28 days.
  - If a route drops by more than 10%, open a revert PR for that route's composition and reopen its design (spec 1 and 11).
  - Samples are small: the homepage hero drew 14 click sessions in 28 days. When a route has fewer than 30 hero-click sessions in the 14-day window, extend to 28 days before deciding.
  - Record the numbers in the receipt.

- [ ] **Step 4: Tidy up.**
  - Delete the merged branch and worktree.
  - Change the `docs/ROADMAP.md` design-freeze paragraph to "released", with the date and SHA.
  - Write the follow-up plan prompt for the remaining service pages as a ready-to-use handoff. Do not start that work.

---

## Execution receipt (fill in during execution)

| Item | Value |
|---|---|
| Start commit (Task 1) | |
| eScript SMS format source (Task 8) | |
| Final display weight (Task 10 gate) | |
| Direction proof sent / approved; feedback applied | |
| Unsized images fixed (Task 17) | |
| Tagline substantiation source and date read (Task 21) | |
| Visual baseline workflow run and commit | |
| Local verification counts (Task 23) | |
| LCP / CLS / bundle delta / Lighthouse (Task 23) | |
| Template-tell review (Task 23) | |
| Compliance and clinical results (Task 23) | |
| Independent review outcome | |
| PR / merge SHA / production deployment | |
| 14-day and 28-day measurement | |
| Follow-up plan prompt | |
