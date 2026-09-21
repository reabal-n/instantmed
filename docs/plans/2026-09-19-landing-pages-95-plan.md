# Landing Pages to 95+ Implementation Plan

> **Authority:** Reference only. This file does not change production behaviour or independently enter work into the active queue; `docs/ROADMAP.md` remains the sole active priority queue.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the seven public landing pages (`/`, `/medical-certificate`, `/prescriptions`, `/erectile-dysfunction`, `/hair-loss`, `/womens-health`, `/weight-loss`) from the 19 Sep 2026 audit scores (48–78) to 95+ each, with every gate enforced by a contract test or a Playwright spec so the score cannot regress silently.

**Architecture:** Every page renders through the shared `Hero` primitive inside a shell that reserves space for the fixed header; the hero pill carries the Google mark with its stars; copy is plain patient language enforced by a source-scanning contract test; the weight-management page is rebuilt on `LandingPageShell`; specialty pages lose their duplicate sections; a new `e2e/landing-pages.spec.ts` measures the geometry (pill clear of header, CTA above the fold, sticky bar, page length, type sizes) at 375×812 and 1440×900.

**Tech Stack:** Next.js 15.5 App Router, React 18.3, Tailwind v4, Vitest (source-scanning contract tests in `lib/__tests__/`), Playwright (`pnpm e2e`), the existing primitives `Hero`, `LandingPageShell`, `StickyCTA`, `HowItWorksInline`, `FAQSection`, `CTABanner`, `Heading`.

**Spec:** The 19 Sep 2026 audit (https://claude.ai/artifact/8Znx1UhcTh9NqcLvL2BTHk) and the acceptance gates in §Spec below. The audit numbers quoted in this plan (type shares, screen counts, caveat counts) were measured on production on 2026-09-19; the plan argues from them.

## Global Constraints

- Stack pins are law: no `pnpm add`, no upgrade of next/react/tailwind/framer-motion, webpack only (CLAUDE.md §Stack Pin Policy).
- Public copy must use approved claims from `lib/marketing/approved-claims.ts` verbatim; never rewrite `form_first_wedge`, `med_cert_wedge`, `refund_guarantee`, `iconic_hook`, `prescribing_identity_required`, `clinical_review_sequence`, `refund_payment_process` text.
- No em-dashes (U+2014) anywhere in marketing sources (`voice-guard.test.ts` is CI-blocking).
- No review counts, numeric star ratings, testimonials, or aggregate-rating schema on public health surfaces. Stars render only next to the Google mark.
- Never promise "no call" outside medical-certificate surfaces; never state review-hours windows; never add time-bound refund promises.
- Sentence case for every heading; 16px body minimum is the design-system floor for patient surfaces (`DESIGN.md §2`); nothing under 12px except uppercase overlines.
- `main` is PR-first. Each PR below merges serially with green `build` + `e2e` checks. Never `--admin`, never direct push.
- Do not hand-edit `AGENTS.md`; edit `CLAUDE.md` and run `scripts/sync-agent-doc.sh`.
- Copy tasks (PR 2, PR 5) go through the `instantmed-marketing-compliance-review` skill before sign-off; ED/hair/women's-health/weight section deletions go through `instantmed-clinical-safety-review` (red-flag and boundary copy stays verbatim).
- Every PR ends with: `pnpm lint`, `pnpm typecheck`, `pnpm vitest run <changed contract tests> lib/__tests__/voice-guard.test.ts`, `pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts`, and screenshots at 375×812 and 1440×900 per the `instantmed-ui-browser-verification` skill.

---

## Spec: what "95" means, measured

A page scores 95+ when every gate below passes. The gates are the audit's categories turned into assertions. `e2e/landing-pages.spec.ts` (Task 6, extended in later tasks) and four contract tests own them.

| # | Gate | Measured how | Baseline (19 Sep) |
|---|------|--------------|-------------------|
| G1 | Hero pill fully below the fixed header at 375×812 | pill `boundingBox.y >= header height` | Hidden on rx, ED, hair, WH, med cert |
| G2 | Primary CTA fully inside the first phone viewport | CTA `bottom <= 812` | Pass on all 7 |
| G3 | No horizontal overflow at 375 | `scrollWidth <= clientWidth` | Pass |
| G4 | Sticky CTA visible after scrolling past the hero on every page | `region[aria-label="Quick purchase"]` in viewport | Missing on `/` and `/weight-loss` |
| G5 | Stars render only inside the Google badge | contract test on `hero.tsx` | Bare stars on 4 pages |
| G6 | Trust row is one row, at most 2 marks on phone | `[data-hero-trust-row]` children share one `top` | Orphaned seal on rx, hair, WH |
| G7 | No visible text under 12px unless uppercase overline; ≥45% of visible words at ≥16px at 1440 | `page.evaluate` word census | 8–32% under 12px; 23–42% at 16px+ |
| G8 | Phone page height within budget (screens of 812px) | `scrollHeight / 812` | home 7.6, mc 10.6, rx 8.7, ED 13.1, hair 12.8, WH 11.1, WL 10.2 |
| G9 | Desktop gap between the last hero element and the next section's first text ≤ 120px at 1440×900 | `page.evaluate` | 150–200px |
| G10 | Home services grid has no orphan row at ≥1024 | 6 cards share exactly 2 distinct `top` values | 2+3+1 |
| G11 | Plain-language vocabulary: zero "pathway", "form-first", "focused assessment", "child page", "Start Consultation", "doctor-owned"; caveat budget per file | contract test on landing sources | 31 "pathway", ED 8 decline mentions |
| G12 | One name per service; CTA grammar `Verb + object · $price` | contract test on catalog + landing sources | 5 names for repeat Rx; ` - $` separators |
| G13 | Price visible in the hero CTA on every service page | contract test | Missing on `/weight-loss` (page shows no price at all) and `/womens-health` hero |
| G14 | Every page uses the `Hero` primitive and a shell with the header offset | contract test | med cert, ED, WL bespoke |
| G15 | Zero console errors, zero axe serious/critical violations, light and dark | Playwright + `@axe-core/playwright` | Console clean; axe not gated |

Phone height budgets for G8 (Phase 1; ratchet down later): home ≤ 7.0, medical certificate ≤ 10.0, prescriptions ≤ 8.5, ED ≤ 9.5, hair ≤ 9.5, women's health ≤ 9.5, weight ≤ 9.5.

## File map

Created:
- `lib/marketing/home-anchors.ts` — `HOME_HERO_CTA_ID` constant shared by the server hero and the client sticky island.
- `components/marketing/home-client-controls.tsx` — home sticky CTA island (mirrors `med-cert-client-controls.tsx`).
- `lib/marketing/landing-vocabulary.ts` — `LANDING_BLOCKED_TERMS`, `LANDING_CAVEAT_BUDGETS`, `LANDING_SURFACES` (the list of files the vocabulary and type-floor tests scan).
- `lib/data/weight-loss-faq.ts` — `WEIGHT_LOSS_LANDING_FAQ`.
- `components/marketing/weight-loss-landing.tsx` — `WeightLossLanding` on `LandingPageShell` + `Hero` + `WeightHeroFacts`.
- `lib/__tests__/landing-hero-contract.test.ts` — G5, G6 (static), G14, hyphenation, header offset classes.
- `lib/__tests__/landing-vocabulary-contract.test.ts` — G11, G12 separator.
- `lib/__tests__/service-naming-contract.test.ts` — G12 names, G13 price-in-CTA.
- `lib/__tests__/landing-type-floor-contract.test.ts` — G7 static half (no `text-[9-13px]`, `text-xs` only with `uppercase`).
- `e2e/landing-pages.spec.ts` — G1–G4, G6–G10, G15.

Modified (main ones):
- `components/marketing/hero.tsx` — pill with Google badge, `pillLabel` prop, `hyphens-none` title, trust row 2 marks + `data-hero-trust-row`, wait counter visible on phone, bottom padding, `data-hero` on the section.
- `components/marketing/google-reviews-badge.tsx` — `variant="inline"`.
- `components/marketing/shared/landing-page-shell.tsx`, `components/marketing/prescriptions-landing.tsx`, `components/marketing/med-cert-landing.tsx` — header offset on the wrapper.
- `components/marketing/shared/sticky-cta.tsx` — 14px summary.
- `components/marketing/portfolio-route-map.tsx` — 3×2 grid, copy.
- `app/(marketing)/page.tsx` — sticky island, mock hidden on phone, how-it-works + verify line, subhead copy.
- `lib/services/service-catalog.ts` — titles/subtitles.
- `components/marketing/erectile-dysfunction-landing.tsx`, `hair-loss-landing.tsx`, `womens-health-landing.tsx`, `med-cert-landing.tsx`, `prescriptions-landing.tsx`, `*-client-controls.tsx` — copy, hero migration, section removal.
- `app/weight-loss/page.tsx` — renders `WeightLossLanding`; `app/weight-loss/weight-loss-client.tsx` deleted.
- Contract tests that pin the old structure (listed per task): `money-page-narrative-compression-contract.test.ts`, `portfolio-art-direction-contract.test.ts`, `marketing-request-reflow-contract.test.ts`, `money-page-lcp-critical-path.test.ts`, `advertising-compliance-guard.test.ts`, `e2e/service-hub.spec.ts`, `e2e/helpers/money-pages.ts`.
- Docs: `DESIGN.md §6`, `docs/AI_ONBOARDING.md`, `CLAUDE.md` (+ generated `AGENTS.md`), `docs/PRIMITIVES.md §6`.

## Delivery order (seven PRs, merged serially)

| PR | Branch | Tasks | Gates it turns green |
|----|--------|-------|----------------------|
| 1 | `codex/landing-foundation` | 1–6 | G1, G2, G3, G5, G6, G9, G14 (partial), G15 |
| 2 | `codex/landing-copy` | 7–12 | G11, G12, G13 (except WL) |
| 3 | `codex/landing-home` | 13–16 | G4 (home), G8 (home), G10 |
| 4 | `codex/landing-weight` | 17–19 | G4 (WL), G8 (WL), G13 (WL), G14 (WL) |
| 5 | `codex/landing-specialty` | 20–25 | G8 (all), G14 (med cert, ED) |
| 6 | `codex/landing-type-floor` | 26 | G7 |
| 7 | `codex/landing-docs` | 27–28 | Docs, re-score |

Worktrees live at `/Users/rey/Developer/instantmed-worktrees/<branch-slug>` (never nested in the repo). Each PR: branch → PR → green `build` + `e2e` → merge → delete worktree.

---

## PR 1: Landing foundation

### Task 1: Header offset in every landing shell

**Files:**
- Modify: `components/marketing/shared/landing-page-shell.tsx:117`
- Modify: `components/marketing/prescriptions-landing.tsx:290`
- Modify: `components/marketing/med-cert-landing.tsx:351,357`
- Test: `e2e/landing-pages.spec.ts` (created here, extended later)

**Interfaces:**
- Consumes: the fixed `<header>` rendered by `components/shared/navbar.tsx` (74px tall on phone, `fixed left-0 right-0 z-50`).
- Produces: every landing wrapper `<div>` carries `pt-[calc(5rem+env(safe-area-inset-top))]`, the same class the home page already uses at `app/(marketing)/page.tsx:104`.

Why: the home page pads its wrapper by 5rem so content starts below the fixed header. `LandingPageShell`, `PrescriptionsLanding` and `MedCertLanding` do not, so the hero pill renders at y=24–54 under a 74px header on phones (audit G1). Med cert only looks right in `e2e/intake-resume-chip.spec.ts` because the resume chip adds `mt-[calc(5.5rem+...)]` when a draft exists.

- [ ] **Step 1: Write the failing Playwright gate**

Create `e2e/landing-pages.spec.ts`:

```ts
/**
 * Landing-page geometry gates (19 Sep 2026 audit → docs/plans/2026-09-19-landing-pages-95-plan.md).
 *
 * Every gate here is a measurement, not a screenshot diff, so it survives
 * copy changes. Extend LANDING_PAGES and the per-page budgets when a page
 * is added or compressed; never widen a budget to make a red run green.
 */
import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { gotoPublicRoute, seedMoneyPageState } from "./helpers/money-pages"

const PHONE = { width: 375, height: 812 }
const DESKTOP = { width: 1440, height: 900 }

/** Phase-1 phone height budgets in 812px screens. Ratchet down, never up. */
export const LANDING_PAGES = [
  { path: "/", maxPhoneScreens: 7.0 },
  { path: "/medical-certificate", maxPhoneScreens: 10.0 },
  { path: "/prescriptions", maxPhoneScreens: 8.5 },
  { path: "/erectile-dysfunction", maxPhoneScreens: 9.5 },
  { path: "/hair-loss", maxPhoneScreens: 9.5 },
  { path: "/womens-health", maxPhoneScreens: 9.5 },
  { path: "/weight-loss", maxPhoneScreens: 9.5 },
] as const

async function headerHeight(page: Page): Promise<number> {
  const box = await page.locator("header").first().boundingBox()
  expect(box, "fixed header should have a layout box").not.toBeNull()
  return box!.height
}

async function settle(page: Page) {
  // Hero entrance animations run for up to 600ms; wait for the CSS keyframes to finish.
  await page.waitForTimeout(900)
}

test.describe("landing page geometry", () => {
  for (const landing of LANDING_PAGES) {
    test(`${landing.path} hero pill clears the fixed header on a phone`, async ({ page }) => {
      await page.setViewportSize(PHONE)
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, landing.path)
      await settle(page)

      const pill = page.locator("main .hero-availability-enter").first()
      await expect(pill).toBeVisible()
      const pillBox = await pill.boundingBox()
      expect(pillBox).not.toBeNull()
      expect(
        pillBox!.y,
        `${landing.path}: pill top ${pillBox!.y} sits under the ${await headerHeight(page)}px fixed header`,
      ).toBeGreaterThanOrEqual(await headerHeight(page))
    })

    test(`${landing.path} keeps the primary CTA inside the first phone viewport`, async ({ page }) => {
      await page.setViewportSize(PHONE)
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, landing.path)
      await settle(page)

      const cta = page.locator('main a[href*="/request"]').first()
      await expect(cta).toBeVisible()
      const box = await cta.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.y + box!.height, `${landing.path}: CTA bottom below the fold`).toBeLessThanOrEqual(PHONE.height)

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflow, `${landing.path}: horizontal overflow at 375px`).toBe(false)
    })
  }
})
```

- [ ] **Step 2: Run it to confirm the pill gate fails on the five affected pages**

Run: `pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts -g "clears the fixed header"`
Expected: FAIL for `/medical-certificate`, `/prescriptions`, `/erectile-dysfunction`, `/hair-loss`, `/womens-health` with "sits under the 74px fixed header". `/` passes. `/weight-loss` fails differently (no `.hero-availability-enter` until Task 18); that is expected until PR 4.

- [ ] **Step 3: Add the offset to the three wrappers**

`components/marketing/shared/landing-page-shell.tsx:117`:

```tsx
      <div className="min-h-screen overflow-x-hidden pt-[calc(5rem+env(safe-area-inset-top))]">
```

`components/marketing/prescriptions-landing.tsx:290`:

```tsx
      <div className="min-h-screen overflow-x-hidden pt-[calc(5rem+env(safe-area-inset-top))]">
```

`components/marketing/med-cert-landing.tsx:351` becomes the same wrapper class, and the resume chip at `:357` loses its compensating margin:

```tsx
          <IntakeResumeChip className="mx-4 mt-2 max-w-5xl sm:mx-auto" />
```

- [ ] **Step 4: Re-run the gate and the intake-resume spec**

Run: `pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts e2e/intake-resume-chip.spec.ts`
Expected: pill gate PASS on the six pages that have the class (WL still pending); `intake-resume-chip.spec.ts` PASS (its `main .hero-availability-enter` clears-nav assertion at `e2e/intake-resume-chip.spec.ts:84` now holds without a draft too).

- [ ] **Step 5: Commit**

```bash
git add e2e/landing-pages.spec.ts components/marketing/shared/landing-page-shell.tsx components/marketing/prescriptions-landing.tsx components/marketing/med-cert-landing.tsx
git commit -m "fix(landing): reserve fixed-header space in every landing shell"
```

### Task 2: Stars only with the Google mark, two-mark trust row

**Files:**
- Modify: `components/marketing/google-reviews-badge.tsx:21-25`
- Modify: `components/marketing/hero.tsx:112-135,150-157,303`
- Test: `lib/__tests__/landing-hero-contract.test.ts` (create)

**Interfaces:**
- Produces: `GoogleReviewsBadge({ variant?: "badge" | "inline", className? })`. `"badge"` (default) is the existing bordered pill; `"inline"` renders the G mark + stars with no border or padding for use inside another pill.
- Produces: `Hero` prop `pillLabel?: string` (default `"AHPRA-registered doctors"`).
- Produces: the hero trust row wrapper carries `data-hero-trust-row=""` and renders `GoogleAdsCert` + `LegitScriptSeal` only.

- [ ] **Step 1: Write the failing contract test**

Create `lib/__tests__/landing-hero-contract.test.ts`:

```ts
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")

describe("landing hero contract (19 Sep 2026 audit)", () => {
  const hero = read("components/marketing/hero.tsx")

  it("renders stars only inside the Google badge", () => {
    // The old pill drew five bare stars next to "AHPRA-registered doctors",
    // which reads as a doctor rating. Stars belong to the Google mark.
    expect(hero).not.toMatch(/\[1, 2, 3, 4, 5\]\.map/)
    expect(hero).not.toContain('aria-label="Google star rating"')
    const pillStart = hero.indexOf("function buildDefaultPill")
    const pillEnd = hero.indexOf("const DEFAULT_TITLE")
    expect(pillStart).toBeGreaterThan(-1)
    expect(hero.slice(pillStart, pillEnd)).toContain('<GoogleReviewsBadge variant="inline" />')
  })

  it("keeps the trust row to two marks on one row", () => {
    const trustStart = hero.indexOf("const DEFAULT_TRUST_ROW")
    const trustEnd = hero.indexOf("export function Hero")
    const trustRow = hero.slice(trustStart, trustEnd)
    expect(trustRow).toContain("<GoogleAdsCert")
    expect(trustRow).toContain("<LegitScriptSeal")
    expect(trustRow).not.toContain("GoogleReviewsBadge")
    expect(hero).toContain('data-hero-trust-row=""')
  })

  it("exposes a pillLabel so service pages keep the shared pill", () => {
    expect(hero).toContain("pillLabel?: string")
    expect(hero).toContain('pillLabel = "AHPRA-registered doctors"')
  })

  it("keeps display headlines unhyphenated inside the hero", () => {
    expect(hero).toMatch(/<Heading[\s\S]*?level="display"[\s\S]*?"hyphens-none"/)
  })

  it("shows the live wait counter on phones too", () => {
    expect(hero).not.toMatch(/hidden sm:inline-flex">\s*<WaitCounter/)
  })

  it("marks the hero section for geometry gates", () => {
    expect(hero).toContain('data-hero=""')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run lib/__tests__/landing-hero-contract.test.ts`
Expected: FAIL on every `it` (bare stars present, no `data-hero-trust-row`, no `pillLabel`, no `hyphens-none`, no `data-hero`).

- [ ] **Step 3: Add the inline variant to the badge**

Replace `components/marketing/google-reviews-badge.tsx:21-30` so the component reads:

```tsx
interface GoogleReviewsBadgeProps {
  className?: string
  /** "badge" is the bordered pill; "inline" is G mark + stars for use inside another pill. */
  variant?: "badge" | "inline"
}

export function GoogleReviewsBadge({ className, variant = "badge" }: GoogleReviewsBadgeProps) {
  if (!GOOGLE_REVIEWS.enabled) return null

  const rating = GOOGLE_REVIEWS.rating
  const filled = Math.round(rating)
  const frame =
    variant === "inline"
      ? "inline-flex items-center gap-1.5"
      : "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/50 shadow-sm"

  return (
    <div role="img" aria-label="Google star rating" className={`${frame} ${className ?? ""}`}>
```

Leave the SVG and star markup below unchanged.

- [ ] **Step 4: Rebuild the default pill, trust row, title and section attributes in `hero.tsx`**

Add `pillLabel` to `HeroProps` (after `pill`):

```tsx
  /** Text beside the Google badge in the default pill. Service pages may narrow it, e.g. "Routine short absences". */
  pillLabel?: string
```

Replace `buildDefaultPill` (`hero.tsx:112-135`):

```tsx
function buildDefaultPill(liveWait: WaitState | undefined, pillLabel: string) {
  return (
    <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-2.5 rounded-full px-3 py-1.5 text-sm font-medium bg-white dark:bg-card border border-border/60 shadow-sm shadow-primary/[0.04]">
      <GoogleReviewsBadge variant="inline" />
      <span className="text-border/70" aria-hidden="true">·</span>
      <span className="text-muted-foreground min-[241px]:whitespace-nowrap">{pillLabel}</span>
      <span className="text-border/70 hidden sm:inline" aria-hidden="true">·</span>
      {liveWait ? (
        <span className="inline-flex">
          <WaitCounter state={liveWait} variant="inline" />
        </span>
      ) : (
        DEFAULT_OPEN_NOW
      )}
    </div>
  )
}
```

Replace `DEFAULT_TRUST_ROW` (`hero.tsx:150-157`):

```tsx
const DEFAULT_TRUST_ROW = (
  <>
    <GoogleAdsCert size="sm" />
    <LegitScriptSeal size="sm" />
  </>
)
```

In the `Hero` signature add `pillLabel = "AHPRA-registered doctors",` after `pill,` and change the resolver line to:

```tsx
  const resolvedPill = pill === undefined ? buildDefaultPill(liveWait, pillLabel) : pill
```

On the `<section>` add `data-hero=""` before `className`. On the `Heading` add `"hyphens-none"` as its own string inside the `cn(...)` call, before `titleClassName`:

```tsx
            <Heading
              level="display"
              className={cn(
                "mb-5 sm:mb-7 min-h-[5rem] sm:min-h-[6.5rem] lg:min-h-[8rem]",
                "hyphens-none",
                titleClassName,
              )}
            >
```

On the trust row wrapper (`hero.tsx:303`) add `data-hero-trust-row=""` before `className`.

Keep every pinned string intact: `mx-auto max-w-5xl px-4 sm:px-8 lg:px-10`, `flex-1 w-full min-w-0 text-center lg:text-left`, `min-[241px]:whitespace-nowrap`, `max-[240px]:hidden`, `h-auto min-h-12 whitespace-normal px-4 py-3 text-center` (pinned by `lib/__tests__/marketing-request-reflow-contract.test.ts:20-27`).

- [ ] **Step 5: Run the contract tests that read hero.tsx**

Run: `pnpm vitest run lib/__tests__/landing-hero-contract.test.ts lib/__tests__/marketing-request-reflow-contract.test.ts lib/__tests__/marketing-copy-contract.test.ts lib/__tests__/money-page-lcp-critical-path.test.ts lib/__tests__/paid-claims-contract.test.ts`
Expected: all PASS (`marketing-copy-contract` still finds the `GoogleReviewsBadge` import at `hero.tsx`).

- [ ] **Step 6: Add the trust-row gate to the Playwright spec**

Append inside the `for (const landing of LANDING_PAGES)` loop in `e2e/landing-pages.spec.ts`:

```ts
    test(`${landing.path} keeps hero trust marks on one row on a phone`, async ({ page }) => {
      await page.setViewportSize(PHONE)
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, landing.path)
      await settle(page)

      const row = page.locator("[data-hero-trust-row]").first()
      if ((await row.count()) === 0) return // pages that pass trustRow={null}
      const tops = await row.evaluate((el) =>
        Array.from(el.children).map((child) => Math.round(child.getBoundingClientRect().top)),
      )
      expect(tops.length, `${landing.path}: trust row should carry at most 2 marks`).toBeLessThanOrEqual(2)
      expect(new Set(tops).size, `${landing.path}: trust marks wrapped to a second row`).toBe(1)
    })
```

Run: `pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts -g "trust marks"`
Expected: PASS on the six `Hero`-based pages.

- [ ] **Step 7: Commit**

```bash
git add components/marketing/google-reviews-badge.tsx components/marketing/hero.tsx lib/__tests__/landing-hero-contract.test.ts e2e/landing-pages.spec.ts
git commit -m "fix(hero): stars only with the Google mark, two-mark trust row, unhyphenated title"
```

### Task 3: Sticky bar summary at 14px

**Files:**
- Modify: `components/marketing/shared/sticky-cta.tsx:71`
- Test: `lib/__tests__/landing-type-floor-contract.test.ts` (created in Task 26; this task only changes the class)

- [ ] **Step 1: Change the summary line**

`components/marketing/shared/sticky-cta.tsx:71`:

```tsx
          <p className="mb-1.5 min-w-0 break-words text-center text-sm leading-tight text-muted-foreground">
```

Remove the comment above it that says "response time bumped to text-[13px]" (it is now wrong).

- [ ] **Step 2: Run the pinned sticky tests**

Run: `pnpm vitest run lib/__tests__/marketing-request-reflow-contract.test.ts lib/__tests__/marketing-reduced-motion-contract.test.ts lib/__tests__/specialty-landing-analytics-contract.test.ts lib/__tests__/marketing-copy-contract.test.ts`
Expected: PASS (every pinned string at `sticky-cta.tsx` is untouched).

- [ ] **Step 3: Commit**

```bash
git add components/marketing/shared/sticky-cta.tsx
git commit -m "fix(sticky-cta): 14px summary line"
```

### Task 4: Close the dead band under desktop heroes

**Files:**
- Modify: `components/marketing/hero.tsx:192`
- Modify: `components/marketing/portfolio-route-map.tsx:131`
- Test: `e2e/landing-pages.spec.ts`

Why: the hero section pads `lg:pb-24` (96px) and the next section pads `lg:py-24` (96px), so 192px of ivory separates the trust row from the next title at 1440×900 (audit G9).

- [ ] **Step 1: Add the desktop gap gate**

Append to `e2e/landing-pages.spec.ts` (new describe block after the geometry block):

```ts
test.describe("landing page desktop rhythm", () => {
  for (const landing of LANDING_PAGES) {
    test(`${landing.path} keeps the hero and the next section within 120px`, async ({ page }) => {
      await page.setViewportSize(DESKTOP)
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, landing.path)
      await settle(page)

      const gap = await page.evaluate(() => {
        const hero = document.querySelector("[data-hero]")
        if (!hero) return null
        const heroBottom = Math.max(
          ...Array.from(hero.querySelectorAll("a, p, span, img, svg")).map(
            (el) => el.getBoundingClientRect().bottom,
          ),
        )
        let next = hero.nextElementSibling
        while (next && !(next as HTMLElement).innerText?.trim()) next = next.nextElementSibling
        if (!next) return null
        const firstText = Array.from(next.querySelectorAll("h2, h3, p, span")).find(
          (el) => (el as HTMLElement).innerText.trim().length > 0,
        )
        return firstText ? firstText.getBoundingClientRect().top - heroBottom : null
      })
      expect(gap, `${landing.path}: no [data-hero] section`).not.toBeNull()
      expect(gap!, `${landing.path}: ${Math.round(gap!)}px of empty space under the hero`).toBeLessThanOrEqual(120)
    })
  }
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts -g "within 120px"`
Expected: FAIL on `/`, `/prescriptions`, `/hair-loss`, `/womens-health` (150–200px). `/medical-certificate`, `/erectile-dysfunction`, `/weight-loss` report "no [data-hero] section" until Tasks 18, 20, 21 migrate them.

- [ ] **Step 3: Tighten the hero and the first home section**

`components/marketing/hero.tsx:192`:

```tsx
    <section data-hero="" className={cn("relative overflow-x-clip pt-6 pb-8 sm:pt-14 sm:pb-12 lg:pt-20 lg:pb-10", className)}>
```

`components/marketing/portfolio-route-map.tsx:131`:

```tsx
      className="scroll-mt-20 px-4 pt-8 pb-12 sm:px-6 sm:pt-10 sm:pb-16 lg:pt-14 lg:pb-24"
```

- [ ] **Step 4: Re-run the gate**

Run: `pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts -g "within 120px"`
Expected: PASS on `/`, `/prescriptions`, `/hair-loss`, `/womens-health`.

- [ ] **Step 5: Commit**

```bash
git add components/marketing/hero.tsx components/marketing/portfolio-route-map.tsx e2e/landing-pages.spec.ts
git commit -m "fix(landing): close the empty band between hero and first section"
```

### Task 5: Console, axe and sticky-bar gates

**Files:**
- Modify: `e2e/landing-pages.spec.ts`
- Modify: `e2e/helpers/money-pages.ts:5-17` (add `/weight-loss` to `MONEY_ROUTES`)

- [ ] **Step 1: Add `/weight-loss` to the shared money routes**

`e2e/helpers/money-pages.ts`, after the Women's Health entry:

```ts
  { name: "Weight Management", path: "/weight-loss" },
```

- [ ] **Step 2: Add the sticky, console and axe gates**

Append to `e2e/landing-pages.spec.ts`:

```ts
/** Pages that own a sticky CTA today. Tasks 14 and 18 add "/" and "/weight-loss". */
const STICKY_PAGES = LANDING_PAGES.filter(
  (p) => p.path !== "/" && p.path !== "/weight-loss",
)

test.describe("landing page sticky CTA", () => {
  for (const landing of STICKY_PAGES) {
    test(`${landing.path} shows the quick-purchase bar after the hero scrolls out`, async ({ page }) => {
      await page.setViewportSize(PHONE)
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, landing.path)
      await settle(page)

      await page.mouse.wheel(0, 1400)
      await page.waitForTimeout(500)
      const region = page.getByRole("region", { name: "Quick purchase" })
      await expect(region).toBeVisible()
      const box = await region.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.y + box!.height).toBeLessThanOrEqual(PHONE.height + 1)
      expect(box!.height, `${landing.path}: sticky bar taller than 120px`).toBeLessThanOrEqual(120)
    })
  }
})

test.describe("landing page health", () => {
  for (const landing of LANDING_PAGES) {
    for (const theme of ["light", "dark"] as const) {
      test(`${landing.path} (${theme}) has no console errors and no serious axe violations`, async ({ page }) => {
        const errors: string[] = []
        page.on("pageerror", (err) => errors.push(err.message))
        page.on("console", (msg) => {
          if (msg.type() === "error") errors.push(msg.text())
        })
        await page.setViewportSize(DESKTOP)
        await seedMoneyPageState(page, theme)
        await gotoPublicRoute(page, landing.path)
        await settle(page)

        expect(errors, `${landing.path}: console errors`).toEqual([])
        const results = await new AxeBuilder({ page }).analyze()
        const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")
        expect(serious.map((v) => `${v.id}: ${v.nodes.length} nodes`), `${landing.path}: axe`).toEqual([])
      })
    }
  }
})
```

- [ ] **Step 3: Run the whole spec**

Run: `pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts`
Expected: PASS except the pending WL cases (no `.hero-availability-enter`, no `[data-hero]`) and the med cert / ED desktop gap cases; both are resolved in PR 4 and PR 5. Record the failing case names in the PR description.

- [ ] **Step 4: Commit**

```bash
git add e2e/landing-pages.spec.ts e2e/helpers/money-pages.ts
git commit -m "test(e2e): sticky, console and axe gates for landing pages"
```

### Task 6: Wire the new spec into CI and open PR 1

**Files:**
- Modify: `.github/workflows/ci.yml:500`

- [ ] **Step 1: Add the spec to the blocking no-auth group**

`.github/workflows/ci.yml:500` currently runs `admin.ops-index`, `marketing-dashboard-nav`, `dashboard.keyboard-safety`. Append the new spec:

```yaml
        run: pnpm exec playwright test --project=chromium e2e/admin.ops-index.spec.ts e2e/marketing-dashboard-nav.spec.ts e2e/dashboard.keyboard-safety.spec.ts e2e/landing-pages.spec.ts
```

Because three cases stay red until PR 4 and PR 5, guard them now: wrap the `/weight-loss` entries and the desktop-gap cases for `/medical-certificate` and `/erectile-dysfunction` with `test.fixme(<condition>, "resolved in PR 4/5")` at the top of each test body, e.g.

```ts
      test.fixme(landing.path === "/weight-loss", "hero migrates in PR 4")
```

Remove each `test.fixme` in the task that fixes it (Tasks 18, 20, 21).

- [ ] **Step 2: Run the PR 1 ladder**

```bash
pnpm lint
pnpm typecheck
pnpm vitest run lib/__tests__/landing-hero-contract.test.ts lib/__tests__/marketing-request-reflow-contract.test.ts lib/__tests__/marketing-copy-contract.test.ts lib/__tests__/money-page-lcp-critical-path.test.ts lib/__tests__/voice-guard.test.ts
pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts e2e/intake-resume-chip.spec.ts e2e/marketing-dashboard-nav.spec.ts
```

Expected: all green.

- [ ] **Step 3: Browser evidence**

Start the dev server (`preview_start` on `http://localhost:3060`), capture `/prescriptions`, `/hair-loss`, `/womens-health` at 375×812 (pill visible under the header, two trust marks on one row) and `/` at 1440×900 (no band under the hero). Attach to the PR.

- [ ] **Step 4: Commit and open the PR**

```bash
git add .github/workflows/ci.yml e2e/landing-pages.spec.ts
git commit -m "ci: gate landing-page geometry in the no-auth e2e group"
git push -u origin codex/landing-foundation
gh pr create --title "Landing foundation: header offset, Google-marked stars, hero rhythm, geometry gates" --body-file /dev/stdin <<'BODY'
Audit: https://claude.ai/artifact/8Znx1UhcTh9NqcLvL2BTHk (19 Sep 2026). PR 1 of 7 in docs/plans/2026-09-19-landing-pages-95-plan.md.

- Header offset in LandingPageShell / prescriptions / med cert wrappers (pill was hidden on 5 pages)
- Hero pill: Google badge with stars, no bare stars; trust row = Google cert + LegitScript
- Hero title hyphens-none; wait counter visible on phones; hero bottom padding closes the desktop band
- Sticky bar summary 14px
- e2e/landing-pages.spec.ts gates G1–G6, G9, G15 (three cases test.fixme until PR 4/5)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
```

---

## PR 2: Plain-language copy, one name per service, caveat budget

### Task 7: Vocabulary and caveat-budget contract test

**Files:**
- Create: `lib/marketing/landing-vocabulary.ts`
- Create: `lib/__tests__/landing-vocabulary-contract.test.ts`

**Interfaces:**
- Produces: `LANDING_SURFACES: readonly string[]` (repo-relative files the landing copy tests scan), `LANDING_BLOCKED_TERMS: ReadonlyArray<{ pattern: RegExp; reason: string }>`, `LANDING_CAVEAT_BUDGETS: ReadonlyArray<{ label: string; pattern: RegExp; max: number }>`. Tasks 14, 17 and 18 append files to `LANDING_SURFACES`; Task 26 reuses it.

Why: 31 uses of "pathway" across the seven pages, "form-first" in three catalog subtitles, "child page" on women's health, "Start Consultation" on weight, and decline/refund wording repeated up to eight times per page (audit G11). A source-scanning test in the `voice-guard` style makes the vocabulary a build rule, not a review comment.

- [ ] **Step 1: Create the vocabulary module**

```ts
// lib/marketing/landing-vocabulary.ts
/**
 * Plain-language rules for the seven public landing pages (19 Sep 2026 audit).
 *
 * Scanned by lib/__tests__/landing-vocabulary-contract.test.ts and
 * lib/__tests__/landing-type-floor-contract.test.ts. Comments and the Next.js
 * `metadata` export are stripped before scanning, so only rendered copy is held
 * to these rules. Approved claims in lib/marketing/approved-claims.ts are the
 * source of truth for regulated sentences and are never edited here.
 */

/** Files whose rendered strings patients read on a landing page. */
export const LANDING_SURFACES = [
  "app/(marketing)/page.tsx",
  "components/marketing/portfolio-route-map.tsx",
  "components/marketing/med-cert-landing.tsx",
  "components/marketing/med-cert-client-controls.tsx",
  "components/marketing/prescriptions-landing.tsx",
  "components/marketing/prescriptions-client-controls.tsx",
  "components/marketing/erectile-dysfunction-landing.tsx",
  "components/marketing/hair-loss-landing.tsx",
  "components/marketing/womens-health-landing.tsx",
  "components/marketing/womens-health-decision-fork.tsx",
  "components/marketing/hero.tsx",
  "components/marketing/shared/sticky-cta.tsx",
  "lib/services/service-catalog.ts",
  "lib/data/med-cert-faq.ts",
  "lib/data/prescription-faq.ts",
  "lib/data/ed-faq.ts",
  "lib/data/hair-loss-faq.ts",
  "lib/data/womens-health-faq.ts",
] as const

/** Words a patient should never have to decode. */
export const LANDING_BLOCKED_TERMS = [
  { pattern: /\bpathways?\b/i, reason: 'say "form", "request", "assessment" or "service"' },
  { pattern: /\bform-first\b/i, reason: 'describe the mechanism instead: "a doctor reviews your form"' },
  { pattern: /\bfocused assessments?\b/i, reason: 'say "doctor assessments"' },
  { pattern: /\bchild page\b/i, reason: "CMS vocabulary; say the page name" },
  { pattern: /Start Consultation/, reason: 'retired vocabulary; use "Start assessment"' },
  { pattern: /\bdoctor-owned\b/i, reason: "governance vocabulary; say what the doctor does" },
  { pattern: /\b(?:Renew|Request|Start|Get)\b[^"'`\n]{0,40} - \$\d/, reason: 'the price separator is " · ", not " - "' },
] as const

/** Every repeat of a caveat lowers the confidence the page is trying to build. */
export const LANDING_CAVEAT_BUDGETS = [
  { label: "clinically appropriate", pattern: /clinically appropriate/gi, max: 1 },
  { label: "may call / contact / message", pattern: /\bmay (?:call|contact|message)\b/gi, max: 2 },
  { label: "not guaranteed", pattern: /\b(?:not|never) guaranteed\b/gi, max: 1 },
  { label: "Full refund", pattern: /Full refund/g, max: 3 },
] as const
```

- [ ] **Step 2: Create the failing contract test**

```ts
// lib/__tests__/landing-vocabulary-contract.test.ts
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  LANDING_BLOCKED_TERMS,
  LANDING_CAVEAT_BUDGETS,
  LANDING_SURFACES,
} from "@/lib/marketing/landing-vocabulary"

const root = process.cwd()

/** Strip comments and the Next.js metadata export so only rendered copy is scanned. */
export function renderedSource(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "")
    .replace(/^export const metadata[\s\S]*?^}/m, "")
}

describe("landing vocabulary contract (19 Sep 2026 audit)", () => {
  for (const relativePath of LANDING_SURFACES) {
    describe(relativePath, () => {
      const source = renderedSource(relativePath)

      for (const term of LANDING_BLOCKED_TERMS) {
        it(`does not say ${term.pattern}`, () => {
          const hit = source.match(term.pattern)
          expect(hit, hit ? `"${hit[0]}": ${term.reason}` : undefined).toBeNull()
        })
      }

      for (const budget of LANDING_CAVEAT_BUDGETS) {
        it(`repeats "${budget.label}" at most ${budget.max} time(s)`, () => {
          const count = (source.match(budget.pattern) ?? []).length
          expect(count, `${budget.label} appears ${count} times`).toBeLessThanOrEqual(budget.max)
        })
      }
    })
  }
})
```

- [ ] **Step 3: Run it and record the hit list**

Run: `pnpm vitest run lib/__tests__/landing-vocabulary-contract.test.ts`
Expected: FAIL. The reporter names every hit with its file. Paste the list into the PR description; Tasks 8–12 clear it file by file. Known hits from the audit: `service-catalog.ts:102,114,127` (form-first); `portfolio-route-map.tsx:31,35,157`; `app/(marketing)/page.tsx:160`; `med-cert-landing.tsx:63,65,102,323,369`; `prescriptions-landing.tsx:118,126,141,302,322`; `prescriptions-client-controls.tsx:101`; `erectile-dysfunction-landing.tsx:142,152,179,184,189,415,457,512,570,605` plus "may call" ×3 literal and the fee-trio "Full refund" repeats; `hair-loss-landing.tsx:83,306,384,427`; `womens-health-landing.tsx:55,65,114,116,172,193,213,215,267,270,322,334`; `lib/data/prescription-faq.ts:21`; `lib/data/ed-faq.ts:54`; `lib/data/hair-loss-faq.ts:7,22`; `lib/data/womens-health-faq.ts:34,35,74`.

- [ ] **Step 4: Commit the red test**

```bash
git add lib/marketing/landing-vocabulary.ts lib/__tests__/landing-vocabulary-contract.test.ts
git commit -m "test(landing): plain-language vocabulary and caveat-budget contract (red)"
```

### Task 8: One name per service: catalog, nav, home cards

**Files:**
- Modify: `lib/services/service-catalog.ts:101-102,114,126-127`
- Modify: `components/marketing/portfolio-route-map.tsx:24-40,148-158`
- Modify: `app/(marketing)/page.tsx:159-162`
- Modify: `e2e/service-hub.spec.ts:7,9`
- Create: `lib/__tests__/service-naming-contract.test.ts`

**Interfaces:**
- Produces: canonical names read by the nav dropdown, mobile menu, `/request` hub, `/pricing`, `/consult`, the home grid and the SEO offering schema (all read `SERVICE_CATALOG[...].title/subtitle`).

- [ ] **Step 1: Write the failing naming contract**

```ts
// lib/__tests__/service-naming-contract.test.ts
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { SERVICE_CATALOG } from "@/lib/services/service-catalog"

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")

describe("one name per service (19 Sep 2026 audit)", () => {
  it("names the repeat and hair-loss services the way their pages do", () => {
    expect(SERVICE_CATALOG["repeat-rx"].title).toBe("Repeat prescription")
    expect(SERVICE_CATALOG["repeat-rx"].subtitle).toBe("Your regular medicine, reviewed by a doctor")
    expect(SERVICE_CATALOG.ed.subtitle).toBe("Private doctor assessment")
    expect(SERVICE_CATALOG["hair-loss"].title).toBe("Hair loss assessment")
    expect(SERVICE_CATALOG["hair-loss"].subtitle).toBe("Doctor-reviewed, from home")
  })

  it("uses one CTA grammar: verb + object · price", () => {
    const rx = read("components/marketing/prescriptions-landing.tsx")
    const rxControls = read("components/marketing/prescriptions-client-controls.tsx")
    const routeMap = read("components/marketing/portfolio-route-map.tsx")
    const ed = read("components/marketing/erectile-dysfunction-landing.tsx")
    const wh = read("components/marketing/womens-health-landing.tsx")

    expect(rx).toContain("Get your repeat · ${PRICING_DISPLAY.REPEAT_SCRIPT}")
    expect(rxControls).toContain("Get your repeat · ${PRICING_DISPLAY.REPEAT_SCRIPT}")
    expect(rx).toContain('ctaText="Get your repeat"')
    expect(routeMap).toContain('cta: "Get your repeat"')
    expect(rx).not.toContain("Renew")
    expect(rxControls).not.toContain("Renew")
    expect(ed).toContain("Start private assessment · ${PRICING_DISPLAY.MENS_HEALTH}")
    expect(ed).not.toContain("Request assessment -")
    expect(wh).toContain("Start assessment · ${PRICING_DISPLAY.WOMENS_HEALTH}")
  })
})
```

Run: `pnpm vitest run lib/__tests__/service-naming-contract.test.ts`
Expected: FAIL (old titles, "Renew medication - $29.95", ED "Request assessment - ").

- [ ] **Step 2: Rename in the catalog**

`lib/services/service-catalog.ts`:

```ts
    title: "Repeat prescription",
    subtitle: "Your regular medicine, reviewed by a doctor",
```

```ts
    subtitle: "Private doctor assessment",
```

```ts
    title: "Hair loss assessment",
    subtitle: "Doctor-reviewed, from home",
```

- [ ] **Step 3: Home grid card copy and the block under it**

`components/marketing/portfolio-route-map.tsx` `SERVICE_DETAILS`:

```ts
  "repeat-rx": {
    benefits: ["For your regular medication", "Doctor review before prescribing"],
    cta: "Get your repeat",
  },
  ed: {
    benefits: ["Private doctor assessment", "eScript if the doctor prescribes"],
    cta: "View ED assessment",
  },
  "hair-loss": {
    benefits: ["Doctor-assessed options", "eScript if the doctor prescribes"],
    cta: "View hair loss assessment",
  },
```

Section intro (`:141`): `Choose the service that fits. The fee is shown before you start.`

Block under the grid (`:157`): `<p className="text-sm font-semibold text-foreground">One secure form per service</p>` (the two paragraphs below it stay; the contract test pins `FORM_FIRST_WEDGE` and "regular GP or an in-person service").

- [ ] **Step 4: Home subhead**

`app/(marketing)/page.tsx:159-162`:

```tsx
            <p className="text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-6 sm:mb-8 leading-relaxed text-balance">
              Medical certificates, repeat prescriptions and doctor assessments for Australian
              adults 18+. From {PRICING_DISPLAY.MED_CERT} AUD.
            </p>
```

Leave the `metadata.title` ("Med Certs, Repeat Rx & Focused Assessments") alone: `lib/__tests__/public-service-scope-contract.test.ts:119-125` pins it and the vocabulary scanner strips the metadata block.

- [ ] **Step 5: Update the hub spec's exact names**

`e2e/service-hub.spec.ts:7` → `"Repeat prescription"`, `:9` → `"Hair loss assessment"`.

- [ ] **Step 6: Run the tests that read the catalog**

Run: `pnpm vitest run lib/__tests__/service-naming-contract.test.ts lib/__tests__/service-hub-mapping.test.ts lib/__tests__/navigation-routing-contract.test.ts lib/__tests__/pricing-display-no-hardcoded-contract.test.ts lib/__tests__/consult-subtype-contract.test.ts lib/__tests__/advertising-compliance-guard.test.ts lib/__tests__/portfolio-art-direction-contract.test.ts lib/__tests__/public-service-scope-contract.test.ts`
Expected: PASS except `service-naming-contract` "CTA grammar" (Tasks 10–11 finish it).

- [ ] **Step 7: Commit**

```bash
git add lib/services/service-catalog.ts components/marketing/portfolio-route-map.tsx "app/(marketing)/page.tsx" e2e/service-hub.spec.ts lib/__tests__/service-naming-contract.test.ts
git commit -m "copy(services): one name per service, plain card copy"
```

### Task 9: Medical certificate copy

**Files:**
- Modify: `components/marketing/med-cert-landing.tsx:62-65,102,264,323,369`
- Modify: `lib/data/med-cert-faq.ts` (whatever the vocabulary test names)

- [ ] **Step 1: Lead with the promise, qualify once**

`components/marketing/med-cert-landing.tsx:264` (the hero subhead paragraph):

```tsx
                {MED_CERT_WEDGE} Tell us what kept you from work, study or caring duties. If your request is suitable, your certificate arrives as a secure PDF. {GUARANTEE}
```

Flag for the compliance reviewer: the "suitable requests" qualifier moved from before the wedge to the sentence after it; the wedge text itself is unchanged.

- [ ] **Step 2: Rename the process step and fee row**

`:62-65`:

```ts
    title: "A doctor-approved protocol checks your request",
    description: CLINICAL_REVIEW_SEQUENCE,
    time: "Medical Director protocol",
```

`:102`: `title: "If more is needed",`

- [ ] **Step 3: Closer and how-it-works subheading**

`:323`: `Start with a short health form. If your request is suitable, your certificate arrives as a secure PDF.`

`:369`: `subheading="Fill a short form. If the request is suitable, you receive a secure PDF."`

- [ ] **Step 4: FAQ data**

Run `pnpm vitest run lib/__tests__/landing-vocabulary-contract.test.ts -t "med-cert-faq"` and rewrite each named line in `lib/data/med-cert-faq.ts` with the same substitutions: "pathway" → "request" or "service"; keep every approved-claim call.

- [ ] **Step 5: Verify**

Run: `pnpm vitest run lib/__tests__/landing-vocabulary-contract.test.ts -t "med-cert" lib/__tests__/money-page-narrative-compression-contract.test.ts lib/__tests__/canonical-trust-copy-contract.test.ts`
Expected: PASS for the med-cert files; the narrative contract still finds "Australia only", "Ages 18+", "No Medicare needed", "Routine short absences", the fee constants and `refund_payment_process`.

- [ ] **Step 6: Commit**

```bash
git add components/marketing/med-cert-landing.tsx lib/data/med-cert-faq.ts
git commit -m "copy(med-cert): promise first, plain process names"
```

### Task 10: Prescriptions copy and CTA

**Files:**
- Modify: `components/marketing/prescriptions-landing.tsx:118,126,141,302,322,349`
- Modify: `components/marketing/prescriptions-client-controls.tsx:101`
- Modify: `lib/data/prescription-faq.ts:21`

- [ ] **Step 1: Hero subhead and CTA**

`:302`: ``text: `Get your repeat · ${PRICING_DISPLAY.REPEAT_SCRIPT}`,``

`:322`:

```tsx
              {FORM_FIRST_WEDGE} For one regular medicine you already take. If approved, your eScript token is sent by SMS for any Australian pharmacy.
```

Then `grep -n "Renew" components/marketing/prescriptions-landing.tsx` and replace any remaining label (the availability-aware `PrescriptionHeroCTA` leaf renders its own text) with `Get your repeat`.

- [ ] **Step 2: Fit section**

`:118`: `This service is deliberately narrow. The doctor checks that a repeat is still safe and appropriate before deciding.`
`:126`: `A repeat may fit when`
`:141`: `See your GP or another service when`

- [ ] **Step 3: Closer and sticky**

`:349`: `ctaText="Get your repeat"`
`prescriptions-client-controls.tsx:101`: ``ctaText={isDisabled ? "Contact us" : `Get your repeat · ${PRICING_DISPLAY.REPEAT_SCRIPT}`}``

- [ ] **Step 4: FAQ**

`lib/data/prescription-faq.ts:21`: `"Yes. This service is for medicines you've already been prescribed. If you need a new medicine, see your regular GP unless your request matches one of` … (keep the rest of the sentence as is).

- [ ] **Step 5: Verify**

Run: `pnpm vitest run lib/__tests__/landing-vocabulary-contract.test.ts -t "prescription" lib/__tests__/service-naming-contract.test.ts lib/__tests__/money-page-narrative-compression-contract.test.ts lib/__tests__/money-page-lcp-critical-path.test.ts`
Expected: PASS for prescription files; `service-naming-contract` "CTA grammar" still fails on ED/WH until Task 11.

- [ ] **Step 6: Commit**

```bash
git add components/marketing/prescriptions-landing.tsx components/marketing/prescriptions-client-controls.tsx lib/data/prescription-faq.ts
git commit -m "copy(prescriptions): one name, plain fit copy"
```

### Task 11: ED, hair loss and women's health copy with a caveat budget

**Files:**
- Modify: `components/marketing/erectile-dysfunction-landing.tsx:142,147,152,179,184,189,258-261,415,457,512,570,605`
- Modify: `components/marketing/hair-loss-landing.tsx:83,381-385,427`
- Modify: `components/marketing/womens-health-landing.tsx:52-55,65,114,116,172,193,213,215,267,270,305,307,322,334`
- Modify: `lib/data/ed-faq.ts:54`, `lib/data/hair-loss-faq.ts:22`, `lib/data/womens-health-faq.ts:34,35,74`

- [ ] **Step 1: ED**

Delete the hero caveat paragraph at `:258-261` (`{REFUND_GUARANTEE_CLAIM} Prescription is not guaranteed. The doctor may call or message before deciding.`); the facts aside already states all three. Then:

- `:142` `title: "What this assessment covers",`
- `:147` `body: "Unclear medicines, cardiovascular risk, conflicting answers, or symptoms outside a straightforward ED pattern can need a call or message.",`
- `:152` `title: "What it does not cover",`
- `:179` `body: "For a stable medicine you already take, use the repeat prescription service.",`
- `:184` `body: "A separate men's-health assessment with its own history and safety screen.",`
- `:189` `body: "Chest pain is not an ED question. Read the urgent-care boundary before doing anything else.",`
- `:415` `Know where this assessment stops`
- `:457` `Complete the form, let the doctor review the safety picture, then get the next step the doctor decides on.`
- `:512` `Choose the service that matches the problem you need help with today.`
- `:570` ``Start private assessment · ${PRICING_DISPLAY.MENS_HEALTH}``
- `:605` `subtitle="The key clinical, cost, privacy and service questions before you start."`
- `lib/data/ed-faq.ts:54`: replace "This pathway" with "This assessment".

- [ ] **Step 2: Hair loss**

`:381-385` (the `beforeCta` line): replace the tautology with the same private-and-secure line women's health uses, swapping `Sparkles` for `Lock` in the import:

```tsx
            beforeCta={
              <p className="mx-auto inline-flex max-w-xl items-start gap-2 text-left text-sm leading-snug text-foreground lg:mx-0">
                <Lock className="mt-px h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <span>Private and secure.<span className="text-muted-foreground"> Reviewed by an Australian doctor.</span></span>
              </p>
            }
```

- `:83` `description: "The doctor may approve, ask for more detail, or recommend in-person care.",`
- `:427` `subtitle="A doctor reviews your assessment before deciding whether to prescribe."`
- `lib/data/hair-loss-faq.ts:22`: `"Yes. The assessment is reviewed by an Australian doctor, who decides whether treatment is suitable based on your pattern, medical history, and` … (keep the rest).

`:306` keeps its single "clinically appropriate".

- [ ] **Step 3: Women's health**

- `:52-55`:

```ts
  sticky: {
    ctaText: `Start assessment · ${PRICING_DISPLAY.WOMENS_HEALTH}`,
    ctaHref: REQUEST_HREF,
    mobileSummary: "UTI or the pill",
    responseTime: "Doctor-reviewed after submission",
  },
```

- `:65` `body: "Both assessments are for adults in Australia.",`
- `:114` `Two assessments, not a general consultation`
- `:116` `Each assessment page explains its own form and safety checks before you start. Choose the concern that matches today.`
- `:172` `The forms screen these issues before payment where possible. Do not start online when the safer route is already clear.`
- `:193` replace "route you away from this online start-or-switch pathway before payment" with "stop this online start-or-switch assessment before payment"
- `:213` `One fee for either assessment`
- `:215` `The UTI and pill forms use different safety screens, but the review, refund and pharmacy-cost boundaries are the same.`
- `:267` `<SectionPill>Choose your assessment</SectionPill>`
- `:270` `Choose an assessment to begin its safety screen. You can read the detailed pages above first if you prefer.`
- `:305` `title="UTI or the pill. Reviewed by a doctor, from home."`
- `:307` ``text: isDisabled ? "Contact us" : `Start assessment · ${PRICING_DISPLAY.WOMENS_HEALTH}`,``
- `:322`:

```tsx
              {FORM_FIRST_WEDGE} Choose UTI symptoms, or starting or switching the pill. Each form has its own safety screen before payment.
```

- `:334` `subtitle="The essentials before choosing the UTI or pill assessment."`
- `lib/data/womens-health-faq.ts:34` `question: "Can men or children use this UTI assessment?"`; `:35` replace "This pathway is designed for" with "This assessment is designed for" and "a different assessment pathway" with "a different assessment"; `:74` replace "this paid pathway stops" with "this paid assessment stops".

- [ ] **Step 4: Verify every contract that pins these three files**

Run: `pnpm vitest run lib/__tests__/landing-vocabulary-contract.test.ts lib/__tests__/service-naming-contract.test.ts lib/__tests__/money-page-narrative-compression-contract.test.ts lib/__tests__/money-page-art-direction-contract.test.ts lib/__tests__/womens-health-layout-contract.test.ts lib/__tests__/portfolio-art-direction-contract.test.ts lib/__tests__/hair-loss-tga-compliance.test.ts lib/__tests__/marketing-copy-contract.test.ts lib/__tests__/advertising-compliance-guard.test.ts`
Expected: all PASS. If a caveat budget still trips on ED, the remaining literal is inside the fee trio that Task 21 deletes. Do not defer it with a code comment; reduce the fee trio's "Full refund if the doctor declines." body to "Refund if declined" (the approved short label `refund_guarantee_label`) so the budget passes now.

- [ ] **Step 5: Commit**

```bash
git add components/marketing/erectile-dysfunction-landing.tsx components/marketing/hair-loss-landing.tsx components/marketing/womens-health-landing.tsx lib/data/ed-faq.ts lib/data/hair-loss-faq.ts lib/data/womens-health-faq.ts
git commit -m "copy(specialty): plain vocabulary, one caveat each, price in every CTA"
```

### Task 12: Compliance review and PR 2

- [ ] **Step 1: Run the marketing compliance review on the diff**

Invoke the `instantmed-marketing-compliance-review` skill against `git diff main...HEAD`. For each changed sentence record: claim type (operational fact / price / refund / clinical), source (approved claim id, catalog constant, or plain description), and verdict. The two lines that need an explicit "keep": the med-cert subhead qualifier move (Task 9) and the women's-health H1 (Task 11).

- [ ] **Step 2: Run the PR 2 ladder**

```bash
pnpm lint
pnpm typecheck
pnpm vitest run lib/__tests__/landing-vocabulary-contract.test.ts lib/__tests__/service-naming-contract.test.ts lib/__tests__/voice-guard.test.ts lib/__tests__/money-page-narrative-compression-contract.test.ts lib/__tests__/marketing-copy-contract.test.ts lib/__tests__/advertising-compliance-guard.test.ts lib/__tests__/approved-claims-contract.test.ts
pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts e2e/service-hub.spec.ts e2e/medical-certificate.spec.ts
```

- [ ] **Step 3: Browser evidence and PR**

Capture `/prescriptions`, `/womens-health`, `/erectile-dysfunction` heroes at 375×812 (new CTA labels with prices). Open the PR as in Task 6 with title "Landing copy: plain vocabulary, one name per service, caveat budget".

---

## PR 3: Home

### Task 13: Services grid 3 × 2

**Files:**
- Modify: `components/marketing/portfolio-route-map.tsx:49-62,143`
- Modify: `lib/__tests__/portfolio-art-direction-contract.test.ts:35-36`
- Modify: `lib/__tests__/marketing-request-reflow-contract.test.ts:125-127`
- Modify: `e2e/landing-pages.spec.ts`

Why: six cards render 2 + 3 + 1 at ≥1024px; Weight management sits alone on a fourth row (audit G10).

- [ ] **Step 1: Add the grid gate**

Append to `e2e/landing-pages.spec.ts`:

```ts
test("home services grid has no orphan row at desktop width", async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await seedMoneyPageState(page, "light")
  await gotoPublicRoute(page, "/")
  await settle(page)

  const rows = await page.locator("#pricing li").evaluateAll((cards) =>
    new Set(cards.map((card) => Math.round(card.getBoundingClientRect().top))).size,
  )
  expect(rows, "six service cards should sit in two rows of three").toBe(2)
})
```

Run: `pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts -g "orphan row"`
Expected: FAIL with `3` rows.

- [ ] **Step 2: Simplify the card wrapper and the grid**

`components/marketing/portfolio-route-map.tsx`. Remove the `index` parameter from `ServiceCard` and its `isCoreService` logic; the `<li>` becomes:

```tsx
    <li className="min-w-0">
```

The list (`:143`):

```tsx
        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </ul>
```

- [ ] **Step 3: Update the two contracts that pinned the old grid**

`lib/__tests__/portfolio-art-direction-contract.test.ts:35-36`:

```ts
    expect(map).toContain("sm:grid-cols-2 lg:grid-cols-3")
    expect(map).not.toContain("lg:col-span-3")
```

`lib/__tests__/marketing-request-reflow-contract.test.ts:125-127`:

```ts
    expect(routeMap).toContain("grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3")
    expect(routeMap).toContain('"min-w-0"')
    expect(routeMap).not.toContain("lg:col-span-2")
```

- [ ] **Step 4: Verify**

Run: `pnpm vitest run lib/__tests__/portfolio-art-direction-contract.test.ts lib/__tests__/marketing-request-reflow-contract.test.ts && pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts -g "orphan row"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/marketing/portfolio-route-map.tsx lib/__tests__/portfolio-art-direction-contract.test.ts lib/__tests__/marketing-request-reflow-contract.test.ts e2e/landing-pages.spec.ts
git commit -m "fix(home): six service cards in two rows of three"
```

### Task 14: Home sticky CTA

**Files:**
- Create: `lib/marketing/home-anchors.ts`
- Create: `components/marketing/home-client-controls.tsx`
- Modify: `app/(marketing)/page.tsx:145-171`
- Modify: `lib/marketing/landing-vocabulary.ts` (append the new file to `LANDING_SURFACES`)
- Modify: `e2e/landing-pages.spec.ts` (`STICKY_PAGES` no longer excludes `/`)

**Interfaces:**
- Produces: `HOME_HERO_CTA_ID = "home-hero-cta"`; `HomeClientControls()` client component rendering `StickyCTA` once the element with that id leaves the viewport.

- [ ] **Step 1: Turn the sticky gate on for home**

In `e2e/landing-pages.spec.ts` change `STICKY_PAGES` to exclude only `/weight-loss`:

```ts
const STICKY_PAGES = LANDING_PAGES.filter((p) => p.path !== "/weight-loss")
```

Run: `pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts -g "quick-purchase bar"`
Expected: FAIL for `/` (no region).

- [ ] **Step 2: Shared anchor id**

```ts
// lib/marketing/home-anchors.ts
/** Id of the home hero CTA wrapper; the sticky island observes it. */
export const HOME_HERO_CTA_ID = "home-hero-cta"
```

- [ ] **Step 3: The client island**

```tsx
// components/marketing/home-client-controls.tsx
"use client"

import { useEffect, useState } from "react"

import { StickyCTA } from "@/components/marketing/shared/sticky-cta"
import { PRICING_DISPLAY } from "@/lib/constants"
import { useLandingAnalytics } from "@/lib/hooks/use-landing-analytics"
import { HOME_HERO_CTA_ID } from "@/lib/marketing/home-anchors"
import { GUARANTEE } from "@/lib/marketing/voice"

/**
 * Home sticky CTA. Mirrors med-cert-client-controls.tsx: observe the hero CTA
 * wrapper, show the quick-purchase bar once it scrolls out. The home page
 * body stays server-rendered; this island owns only the bar.
 */
export function HomeClientControls() {
  const analytics = useLandingAnalytics("home")
  const [showStickyCTA, setShowStickyCTA] = useState(false)

  useEffect(() => {
    const el = document.getElementById(HOME_HERO_CTA_ID)
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCTA(!entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <StickyCTA
      show={showStickyCTA}
      ctaText="Get started"
      ctaHref="/request"
      mobileSummary={`From ${PRICING_DISPLAY.MED_CERT} · ${GUARANTEE}`}
      onCTAClick={() => analytics.trackCTAClick("sticky_mobile")}
    />
  )
}
```

- [ ] **Step 4: Wire it into the page**

`app/(marketing)/page.tsx`: import `HomeClientControls` and `HOME_HERO_CTA_ID`; render `<HomeClientControls />` as the first child inside the wrapper `div` (next to `<MedicalBusinessSchema />`); give the hero its anchor:

```tsx
          <Hero
            className="pt-6 sm:pt-6 lg:pt-6"
            title={TAGLINE}
            titleClassName={`${homeH1Font.className} min-h-0 sm:min-h-0 lg:min-h-0 mb-4 sm:mb-5`}
            liveWait={waitState}
            primaryCta={{ text: "Get started", href: "/request", wrapperId: HOME_HERO_CTA_ID }}
            secondaryCta={null}
```

Append `"components/marketing/home-client-controls.tsx",` to `LANDING_SURFACES`.

- [ ] **Step 5: Verify**

Run: `pnpm vitest run lib/__tests__/portfolio-art-direction-contract.test.ts lib/__tests__/money-page-lcp-critical-path.test.ts lib/__tests__/landing-vocabulary-contract.test.ts && pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts -g "quick-purchase bar" e2e/patient-journey-readability.spec.ts`
Expected: PASS (the home page keeps `secondaryCta={null}`, no `beforeCta`, no framer-motion import).

- [ ] **Step 6: Commit**

```bash
git add lib/marketing/home-anchors.ts components/marketing/home-client-controls.tsx "app/(marketing)/page.tsx" lib/marketing/landing-vocabulary.ts e2e/landing-pages.spec.ts
git commit -m "feat(home): sticky quick-purchase bar on phones"
```

### Task 15: Home proof: hide the abstract mock on phones, show how it works

**Files:**
- Modify: `app/(marketing)/page.tsx` (hero `mockupClassName`, new `HowItWorksInline` section, regulatory strip moved)
- Modify: `lib/__tests__/portfolio-art-direction-contract.test.ts:20`
- Modify: `e2e/landing-pages.spec.ts` (phone height budget test)

Why: on phones the "Doctor review" mock fills the second screen before any service appears; nothing on the page shows the product; the regulatory strip and the "one form per service" note sit where proof should be (audit Home).

- [ ] **Step 1: Add the phone-height budget gate**

Append to `e2e/landing-pages.spec.ts` (uses `maxPhoneScreens` from `LANDING_PAGES`):

```ts
test.describe("landing page length", () => {
  for (const landing of LANDING_PAGES) {
    test(`${landing.path} fits ${landing.maxPhoneScreens} phone screens`, async ({ page }) => {
      test.fixme(landing.path !== "/", "budgets for service pages land in PR 5")
      await page.setViewportSize(PHONE)
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, landing.path)
      await settle(page)
      const screens = await page.evaluate(() => document.documentElement.scrollHeight / window.innerHeight)
      expect(screens, `${landing.path}: ${screens.toFixed(1)} screens`).toBeLessThanOrEqual(landing.maxPhoneScreens)
    })
  }
})
```

Run: `pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts -g "fits"`
Expected: FAIL for `/` (7.6 > 7.0).

- [ ] **Step 2: Hide the mock below `lg` and add how-it-works**

In `app/(marketing)/page.tsx` add a lazy import next to the others:

```tsx
const HowItWorksInline = dynamic(
  () => import('@/components/marketing/sections/how-it-works-inline').then(m => ({ default: m.HowItWorksInline })),
)
```

Add the step data above `HomePage`:

```tsx
const HOME_HOW_IT_WORKS_STEPS = [
  {
    sticker: 'medical-history' as const,
    step: 1,
    title: 'Fill in a short form',
    description: 'Tell us what you need and answer the safety questions. Takes about 3 minutes.',
    time: '~3 minutes',
  },
  {
    sticker: 'stethoscope' as const,
    step: 2,
    title: 'A doctor reviews it',
    description: 'Requests can be submitted and reviewed 24/7. The doctor may call you briefly before prescribing.',
    time: 'Reviewed 24/7',
  },
  {
    sticker: 'certificate' as const,
    step: 3,
    title: 'Certificate to your inbox, eScript to your phone',
    description: 'Every certificate carries a reference your employer can check at instantmed.com.au/verify.',
    time: 'Digital delivery',
  },
]
```

Give the hero `mockupClassName="hidden lg:block"` and change the section order inside `<main>` to:

```tsx
          <PortfolioRouteMap />

          <HowItWorksInline
            steps={HOME_HOW_IT_WORKS_STEPS}
            ctaHref="/request"
            ctaText="Get started"
            heading="How it works"
            subheading="One secure form, one doctor decision, one email."
          />

          <FAQSection ... />   {/* unchanged */}

          <CTABanner ... />    {/* unchanged */}

          <RegulatoryPartners className="border-t border-b border-border/30 bg-muted/20 dark:bg-white/[0.02]" />

          <HomeServiceLinks />
```

- [ ] **Step 3: Update the contract that forbade the retired `<HowItWorks />`**

`lib/__tests__/portfolio-art-direction-contract.test.ts:20` becomes:

```ts
    expect(homepage).not.toMatch(/<HowItWorks\s*\/>/)
```

(`<HowItWorksInline` is the shared section primitive, not the retired component; `code-clean-retirement-contract.test.ts:213` still forbids the retired import path.)

- [ ] **Step 4: Check the non-blocking home first-paint spec**

Run: `pnpm exec playwright test --project=chromium e2e/money-pages-foundations.spec.ts -g "doctor card"`. If it asserts the mock's list items at a phone viewport, change that case's viewport to 1440×900 (the mock is desktop-only by design now) and note it in the PR.

- [ ] **Step 5: Verify**

Run: `pnpm vitest run lib/__tests__/portfolio-art-direction-contract.test.ts lib/__tests__/code-clean-retirement-contract.test.ts lib/__tests__/money-page-lcp-critical-path.test.ts lib/__tests__/marketing-copy-contract.test.ts && pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts -g "fits|within 120px|quick-purchase" e2e/patient-journey-readability.spec.ts e2e/intake-resume-chip.spec.ts`
Expected: PASS; `/` now ≤ 7.0 screens.

- [ ] **Step 6: Commit**

```bash
git add "app/(marketing)/page.tsx" lib/__tests__/portfolio-art-direction-contract.test.ts e2e/landing-pages.spec.ts
git commit -m "feat(home): how-it-works proof, desktop-only hero mock, strip demoted"
```

### Task 16: Retire dead homepage data and open PR 3

**Files:**
- Modify: `lib/marketing/homepage.ts` (delete `siteConfig`, `heroRotatingTexts`, `trustSignals`, `proofMetrics`, `featuredServices`, `slaPolicy`, and `FEATURED_SERVICE_COPY` / `HOMEPAGE_SERVICE_ORDER` if nothing else imports them)
- Modify: `scripts/dead-code-baseline.json` (regenerated)

Why: those exports have no consumers (`grep -rln` over `app components lib` finds none) and carry "doctor-owned clinical pathways" copy that will confuse the next editor. The dead-code ratchet lists them, so removing them also shrinks the baseline.

- [ ] **Step 1: Delete and re-baseline**

Delete the exports listed above. Then:

```bash
pnpm vitest run lib/__tests__/marketing-copy-contract.test.ts lib/__tests__/canonical-trust-copy-contract.test.ts lib/__tests__/seo-indexing-contract.test.ts lib/__tests__/navigation-routing-contract.test.ts lib/__tests__/business-landing-contract.test.ts lib/__tests__/advertising-compliance-guard.test.ts
```

If any of those imports a deleted export, restore that single export and stop. Otherwise:

```bash
pnpm deadcode:baseline && pnpm deadcode:check
```

Expected: `deadcode:check` PASS with the homepage entries gone from `scripts/dead-code-baseline.json`.

- [ ] **Step 2: PR 3 ladder and evidence**

```bash
pnpm lint && pnpm typecheck
pnpm vitest run lib/__tests__/portfolio-art-direction-contract.test.ts lib/__tests__/marketing-request-reflow-contract.test.ts lib/__tests__/landing-vocabulary-contract.test.ts lib/__tests__/voice-guard.test.ts
pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts e2e/patient-journey-readability.spec.ts e2e/intake-resume-chip.spec.ts e2e/marketing-dashboard-nav.spec.ts
```

Capture `/` at 375×812 (hero → services on screen two, sticky bar after scroll) and 1440×900 (3×2 grid, how-it-works). Open PR 3 "Home: 3×2 grid, sticky bar, how-it-works proof".

```bash
git add lib/marketing/homepage.ts scripts/dead-code-baseline.json
git commit -m "chore(home): retire unused homepage data exports"
```

---

## PR 4: Weight management rebuilt on the shared hero

### Task 17: FAQ data module

**Files:**
- Create: `lib/data/weight-loss-faq.ts`
- Modify: `lib/marketing/landing-vocabulary.ts` (append `"lib/data/weight-loss-faq.ts"`)

- [ ] **Step 1: Create the module**

Move the ten FAQ items from `app/weight-loss/weight-loss-client.tsx:96-151` into:

```ts
// lib/data/weight-loss-faq.ts
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { GUARANTEE } from "@/lib/marketing/voice"

const AVAILABILITY = getApprovedClaim("availability_24_7")

/** Weight-management landing FAQ. No prescription medicine names, no outcome claims. */
export const WEIGHT_LOSS_LANDING_FAQ = [
  {
    question: "What does the doctor assess?",
    answer:
      "The doctor reviews your BMI, health history, current medications, previous weight management attempts, and any safety concerns before deciding what next step is suitable.",
  },
  {
    question: "Do I need to have tried other weight management methods first?",
    answer:
      "Generally, yes. Medical weight management support is usually considered alongside lifestyle changes. Your doctor will discuss your history as part of the assessment.",
  },
  {
    question: "Will medicine costs be discussed?",
    answer:
      "Yes. If the doctor decides a prescription option is clinically appropriate, they will explain relevant costs and pharmacy considerations after assessment.",
  },
  {
    question: "How quickly is my assessment reviewed?",
    answer: `${AVAILABILITY} New patients may be asked for extra information, which can extend timing.`,
  },
  {
    question: "What if a treatment option is not suitable?",
    answer: `The doctor will explain why and may recommend lifestyle support, GP follow-up, pathology, or in-person care. ${GUARANTEE}`,
  },
  {
    question: "Will I need follow-up?",
    answer:
      "Often, yes. Weight management care can require monitoring, progress checks, and safety review. The doctor will tell you what follow-up is appropriate for your situation.",
  },
  {
    question: "Is this service covered by Medicare?",
    answer:
      "The review fee is not Medicare-rebateable. Any pharmacy or subsidy questions are discussed after the doctor reviews your assessment.",
  },
  {
    question: "What happens if I'm not eligible for treatment?",
    answer: `${GUARANTEE} The doctor may also recommend lifestyle support, GP follow-up, or specialist care.`,
  },
  {
    question: "Can I use this service if I've had weight loss surgery?",
    answer:
      "You can submit an assessment, but it is important to disclose any previous bariatric surgery. The doctor will review your surgical history and current health status before deciding whether online care is suitable.",
  },
  {
    question: "Do I need to provide photos or measurements?",
    answer:
      "Measurements are part of the initial assessment. Photos are not always required, but the doctor may request extra information if it is needed for safe review. Any files you provide are stored securely and treated as confidential medical information.",
  },
] as const
```

Two answers changed on purpose: "consultation fee" → "review fee" (the service is form-first, not a consultation) and the timing answer now uses the approved availability claim instead of "Doctor reviews when available".

- [ ] **Step 2: Verify the vocabulary and approved-claims contracts**

Run: `pnpm vitest run lib/__tests__/landing-vocabulary-contract.test.ts -t "weight-loss-faq" lib/__tests__/approved-claims-contract.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/data/weight-loss-faq.ts lib/marketing/landing-vocabulary.ts
git commit -m "feat(weight): landing FAQ data module"
```

### Task 18: `WeightLossLanding` on the shared hero and shell

**Files:**
- Create: `components/marketing/weight-loss-landing.tsx`
- Modify: `lib/marketing/landing-vocabulary.ts` (append the new file)

**Interfaces:**
- Consumes: `LandingPageShell` (`components/marketing/shared/landing-page-shell.tsx`), `Hero` with `pillLabel`, `HowItWorksInline`, `FAQSection`, `CTABanner`, `ServiceClaimSection`, `WEIGHT_LOSS_LANDING_FAQ`.
- Produces: `WeightLossLanding()`; `WeightHeroFacts()` (aside labelled "Weight management assessment facts", four `dl > div` groups like ED and hair).

- [ ] **Step 1: Write the component**

```tsx
// components/marketing/weight-loss-landing.tsx
"use client"

/**
 * Weight-management landing. LIVE since 2026-08-10. Rebuilt 2026-09 on the
 * shared Hero + LandingPageShell after the 19 Sep audit (no price on the page,
 * off-system hero, no sticky bar). Copy rules: no prescription medicine names,
 * no outcome guarantees, BMI thresholds match lib/clinical/weight-loss-eligibility.
 */
import { CheckCircle2, Clock3, ShieldCheck, Stethoscope, WalletCards } from "lucide-react"
import dynamic from "next/dynamic"

import { Hero } from "@/components/marketing/hero"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { type LandingPageConfig, LandingPageShell } from "@/components/marketing/shared/landing-page-shell"
import { Heading } from "@/components/ui/heading"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { WEIGHT_LOSS_LANDING_FAQ } from "@/lib/data/weight-loss-faq"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { getService } from "@/lib/services/service-catalog"

const HowItWorksInline = dynamic(
  () => import("@/components/marketing/sections/how-it-works-inline").then((module) => module.HowItWorksInline),
)
const FAQSection = dynamic(
  () => import("@/components/sections/faq-section").then((module) => module.FAQSection),
)
const CTABanner = dynamic(
  () => import("@/components/sections/cta-banner").then((module) => module.CTABanner),
)

const REQUEST_HREF = "/request?service=consult&subtype=weight_loss"
const WEIGHT_SERVICE = getService("weight-loss")
const FORM_FIRST_CLAIM = getApprovedClaim("form_first_wedge")
const REFUND_GUARANTEE_CLAIM = getApprovedClaim("refund_guarantee")
const IDENTITY_CLAIM = getApprovedClaim("prescribing_identity_required")

const LANDING_CONFIG: LandingPageConfig = {
  serviceId: "weight-loss",
  analyticsId: "weight-loss",
  sticky: {
    ctaText: `Start assessment · ${PRICING_DISPLAY.WEIGHT_LOSS}`,
    ctaHref: REQUEST_HREF,
    mobileSummary: "6-min form",
    responseTime: "Doctor-reviewed after submission",
  },
}

const HERO_FACTS = [
  {
    icon: ShieldCheck,
    label: "Eligibility",
    value: "Australia only · Ages 18+",
    body: "BMI 30 or higher, or 27 or higher with a weight-related condition. " + IDENTITY_CLAIM,
  },
  {
    icon: WalletCards,
    label: "Review fee",
    value: PRICING_DISPLAY.WEIGHT_LOSS,
    body: `One-off doctor review. ${REFUND_GUARANTEE_CLAIM}`,
  },
  {
    icon: Clock3,
    label: "Assessment",
    value: WEIGHT_SERVICE.effort,
    body: FORM_FIRST_CLAIM,
  },
  {
    icon: Stethoscope,
    label: "If approved",
    value: "The doctor explains the next step.",
    body: "Any medicine cost is separate. Prescription is not guaranteed.",
  },
] as const

const ELIGIBLE = [
  "Adults 18+ with BMI of 30 or higher",
  "BMI 27+ with weight-related conditions (diabetes, high blood pressure)",
  "Have tried diet and exercise without adequate results",
  "No contraindications that make online care unsuitable",
] as const

const NOT_SUITABLE = [
  "Under 18 years of age",
  "Pregnant or breastfeeding",
  "History of eating disorders",
  "Certain heart conditions or uncontrolled blood pressure",
  "Some medication interactions",
] as const

const HOW_IT_WORKS_STEPS = [
  {
    sticker: "medical-history" as const,
    step: 1,
    title: "Complete the health form",
    description: "Your BMI, health history, current medicines, previous attempts and what support you want the doctor to consider.",
    time: "~6 minutes",
  },
  {
    sticker: "stethoscope" as const,
    step: 2,
    title: "A doctor reviews it",
    description: "An AHPRA-registered Australian doctor reviews the full picture. Extra information or a call may be required for safety.",
    time: "Review operates 24/7",
  },
  {
    sticker: "scales" as const,
    step: 3,
    title: "Receive the next step",
    description: "The doctor explains the outcome: a suitable option, more information needed, or GP or in-person care.",
    time: "After review",
  },
]

function WeightHeroFacts() {
  return (
    <aside aria-label="Weight management assessment facts" className="w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border/50 bg-white shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none sm:w-[360px]">
      <div className="border-b border-border/50 bg-muted/35 px-5 py-4 dark:border-white/10 dark:bg-white/[0.04]">
        <p className="text-sm font-medium text-primary">Before you start</p>
        <Heading level="h3" as="h2" className="mt-1">The practical facts</Heading>
      </div>
      <dl className="divide-y divide-border/50 px-5 dark:divide-white/10">
        {HERO_FACTS.map((fact) => (
          <div key={fact.label} className="py-3.5">
            <dt className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--service-weight)]/10 text-[color:var(--service-weight)]">
                <fact.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>{fact.label}</span>
            </dt>
            <dd className="ml-12 mt-1 text-sm font-semibold text-foreground">{fact.value}</dd>
            <dd className="ml-12 mt-1 text-sm leading-6 text-muted-foreground">{fact.body}</dd>
          </div>
        ))}
      </dl>
    </aside>
  )
}

function WeightEligibilitySection() {
  return (
    <section id="eligibility" className="py-12 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal instant>
          <SectionPill>Eligibility</SectionPill>
          <Heading level="h2" className="mt-4">Who this assessment is for</Heading>
        </Reveal>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Reveal instant className="min-w-0 rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
            <h3 className="text-base font-semibold text-foreground">You may be eligible if</h3>
            <ul className="mt-3 space-y-2 text-base text-foreground">
              {ELIGIBLE.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal instant className="min-w-0 rounded-2xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] dark:border-white/15 dark:bg-card dark:shadow-none">
            <h3 className="text-base font-semibold text-foreground">May not be suitable if</h3>
            <ul className="mt-3 space-y-2 text-base text-muted-foreground">
              {NOT_SUITABLE.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-1 text-muted-foreground/60">&bull;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export function WeightLossLanding() {
  return (
    <LandingPageShell config={LANDING_CONFIG}>
      {({ isDisabled, heroCTARef, requestCtaHref, handleHeroCTA, handleHowItWorksCTA, handleFinalCTA, handleFAQOpen }) => (
        <>
          <Hero
            title="Weight management, reviewed by a doctor."
            primaryCta={{
              text: isDisabled ? "Contact us" : `Start assessment · ${PRICING_DISPLAY.WEIGHT_LOSS}`,
              href: isDisabled ? "/contact" : requestCtaHref,
              onClick: handleHeroCTA,
              ref: heroCTARef,
            }}
            secondaryCta={{ text: "See how it works", href: "#how-it-works" }}
            mockup={<WeightHeroFacts />}
          >
            <p className="mx-auto mb-6 max-w-xl text-balance text-base leading-relaxed text-muted-foreground lg:mx-0 lg:text-lg">
              A one-off doctor assessment for {PRICING_DISPLAY.WEIGHT_LOSS}. {FORM_FIRST_CLAIM} Extra information or a call may be required for safety.
            </p>
          </Hero>

          <ServiceClaimSection
            eyebrow="Clinical, not cosmetic"
            headline={<><span className="text-primary">Doctor-supervised</span> weight management.</>}
            body="Not a meal-plan subscription. Not a wellness program. A structured doctor review for adults with BMI 30+ (or 27+ with related conditions). Your doctor checks suitability, safety, and whether online care is appropriate."
          />

          <WeightEligibilitySection />

          <HowItWorksInline
            steps={HOW_IT_WORKS_STEPS}
            ctaHref={requestCtaHref}
            ctaText={`Start assessment · ${PRICING_DISPLAY.WEIGHT_LOSS}`}
            onCTAClick={handleHowItWorksCTA}
            isDisabled={isDisabled}
            heading="How it works"
            subheading="A health form first, then an Australian doctor reviews the complete picture and decides the safest next step."
            revealInstant
          />

          <FAQSection
            pill="FAQ"
            title="Weight management questions"
            subtitle="Eligibility, cost, follow-up and suitability before you start."
            items={WEIGHT_LOSS_LANDING_FAQ}
            initialCount={5}
            onFAQOpen={handleFAQOpen}
            viewAllHref="/faq"
            className="bg-background"
          />

          <CTABanner
            title="Start a weight management assessment."
            subtitle="A doctor reviews your health form and explains what is suitable for you."
            ctaText="Start assessment"
            ctaHref={requestCtaHref}
            onCtaClick={handleFinalCTA}
            isDisabled={isDisabled}
            price={PRICING.WEIGHT_LOSS}
            microcopy="Takes about 6 minutes."
            revealInstant
          />
        </>
      )}
    </LandingPageShell>
  )
}
```

Check before committing: `WEIGHT_SERVICE.effort` is `"~6 min"` (`lib/services/service-catalog.ts:156`); the BMI sentence matches the thresholds in `lib/clinical/weight-loss-eligibility.ts` (open the file and compare 30 / 27); `"scales"` is a valid sticker name (`grep -n '"scales"' components/icons/stickers.tsx`; if not, use `"pulse"`); `--service-weight` exists in `app/globals.css` (DESIGN.md §1 lists it). Append `"components/marketing/weight-loss-landing.tsx",` to `LANDING_SURFACES`.

- [ ] **Step 2: Typecheck and the vocabulary contract**

Run: `pnpm typecheck && pnpm vitest run lib/__tests__/landing-vocabulary-contract.test.ts -t "weight-loss-landing"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/marketing/weight-loss-landing.tsx lib/marketing/landing-vocabulary.ts
git commit -m "feat(weight): landing rebuilt on the shared hero and shell"
```

### Task 19: Wire the route, retire the old client, update pinned tests, open PR 4

**Files:**
- Modify: `app/weight-loss/page.tsx`
- Delete: `app/weight-loss/weight-loss-client.tsx`
- Modify: `lib/__tests__/advertising-compliance-guard.test.ts:100,646`
- Modify: `e2e/landing-pages.spec.ts` (remove the `/weight-loss` `test.fixme` lines; `STICKY_PAGES = LANDING_PAGES`)

- [ ] **Step 1: Point the route at the new component and keep the FAQ schema**

```tsx
// app/weight-loss/page.tsx
import type { Metadata } from "next"

import { WeightLossLanding } from "@/components/marketing/weight-loss-landing"
import { FAQSchema } from "@/components/seo/healthcare-schema"
import { WEIGHT_LOSS_LANDING_FAQ } from "@/lib/data/weight-loss-faq"

export const metadata: Metadata = { /* unchanged from the current file */ }

export default function WeightLossPage() {
  return (
    <>
      <FAQSchema faqs={WEIGHT_LOSS_LANDING_FAQ.map(({ question, answer }) => ({ question, answer }))} />
      <WeightLossLanding />
    </>
  )
}
```

Delete `app/weight-loss/weight-loss-client.tsx`.

- [ ] **Step 2: Retarget the compliance guard**

`lib/__tests__/advertising-compliance-guard.test.ts:100`: replace `"app/weight-loss/weight-loss-client.tsx"` with `"components/marketing/weight-loss-landing.tsx"` in the drug-term scan list. `:646`: the `existsSync` assertion points at the same new path.

- [ ] **Step 3: Turn the WL gates on**

In `e2e/landing-pages.spec.ts` delete every `test.fixme(landing.path === "/weight-loss", ...)` line and set `const STICKY_PAGES = LANDING_PAGES`.

- [ ] **Step 4: Verify**

```bash
pnpm lint && pnpm typecheck
pnpm vitest run lib/__tests__/advertising-compliance-guard.test.ts lib/__tests__/landing-vocabulary-contract.test.ts lib/__tests__/code-clean-retirement-contract.test.ts lib/__tests__/voice-guard.test.ts
bash scripts/check-orphaned-files.sh
pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts e2e/consult-subtypes.spec.ts -g "weight|Weight"
```

Expected: PASS. `/weight-loss` now passes pill, CTA, overflow, trust row, sticky, desktop gap, console and axe gates; `consult-subtypes` still reaches `$89.95` at review.

- [ ] **Step 5: Browser evidence and PR**

Capture `/weight-loss` at 375×812 (price in CTA, facts aside, sticky after scroll) and 1440×900, light and dark. Open PR 4 "Weight management: shared hero, price on the page, sticky bar".

```bash
git add app/weight-loss/page.tsx lib/__tests__/advertising-compliance-guard.test.ts e2e/landing-pages.spec.ts
git rm app/weight-loss/weight-loss-client.tsx
git commit -m "feat(weight): route to the shared landing, retire the bespoke client"
```

---

## PR 5: Specialty pages on the shared hero, compressed

### Task 20: Medical certificate hero on the shared primitive with the live wait counter

**Files:**
- Modify: `components/marketing/med-cert-landing.tsx:79-92,242-313,348-360`
- Modify: `app/medical-certificate/page.tsx` (await the wait state, pass it down)
- Modify: `lib/__tests__/money-page-narrative-compression-contract.test.ts:78`
- Modify: `lib/__tests__/money-page-lcp-critical-path.test.ts:37-38`
- Modify: `e2e/landing-pages.spec.ts` (remove the med-cert desktop-gap `test.fixme`)

Why: the med-cert hero is a hand-rolled copy of `Hero` (audit G14). It drifts (no live wait counter on the one service with real median data, its own pill, no `data-hero`).

- [ ] **Step 1: Fetch the wait state in the page**

`app/medical-certificate/page.tsx`: mirror `app/(marketing)/page.tsx:99`:

```tsx
import { getWaitState } from "@/lib/brand/wait-counter"
// ...
export default async function MedicalCertificatePage() {
  const liveWait = await getWaitState(new Date(), "med-cert")
  return <MedCertLanding liveWait={liveWait} />
}
```

Change the page's `export const revalidate = 86400` to `3600` so the counter is at most an hour stale, the same as the home page; keep the metadata export. Making the component `async` is the only other structural change.

- [ ] **Step 2: Replace `MedCertHero` with `Hero`**

In `components/marketing/med-cert-landing.tsx`: delete `MED_CERT_PILL` (`:79-92`) and the whole `function MedCertHero()` (`:242-313`). Add `import { Hero } from "@/components/marketing/hero"` and `import type { WaitState } from "@/lib/brand/wait-counter"`. Change the export to accept the prop and render the primitive where `<MedCertHero />` was:

```tsx
export function MedCertLanding({ liveWait }: { liveWait?: WaitState }) {
  return (
    <MarketingPageShell>
      <div className="min-h-screen overflow-x-hidden pt-[calc(5rem+env(safe-area-inset-top))]">
        <MedCertClientControls stickyTargetId={MED_CERT_HERO_CTA_ID} />
        <ReturningPatientBanner className="mx-4 mt-2" />
        <Navbar variant="marketing" />

        <main className="relative">
          <IntakeResumeChip className="mx-4 mt-2 max-w-5xl sm:mx-auto" />
          <Hero
            title="Medical certificate. From your bed."
            titleClassName={moneyH1Font.className}
            immediateSubheadline
            pillLabel="Routine short absences"
            liveWait={liveWait}
            primaryCta={{
              text: `Get your certificate · ${PRICING_DISPLAY.FROM_MED_CERT}`,
              href: MED_CERT_START_HREF,
              wrapperId: MED_CERT_HERO_CTA_ID,
              dataAttributes: { "data-med-cert-cta": "hero" },
            }}
            secondaryCta={null}
            beforeCta={(
              <>
                <ul aria-label="Medical certificate eligibility" className="mx-auto flex max-w-xl flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-foreground lg:mx-0 lg:justify-start">
                  <li>Australia only</li>
                  <li aria-hidden="true" className="text-border">&middot;</li>
                  <li>Ages 18+</li>
                  <li aria-hidden="true" className="text-border">&middot;</li>
                  <li>No Medicare needed</li>
                </ul>
                <p className="mx-auto mt-3 inline-flex max-w-xl items-start gap-2 text-left text-sm leading-snug text-foreground sm:items-center sm:text-center lg:mx-0 lg:text-left">
                  <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-success sm:mt-0" aria-hidden="true" />
                  <span>
                    Issued by AHPRA-registered Australian doctors.
                    <span className="text-muted-foreground"> Employer and institution policies may vary.</span>
                  </span>
                </p>
              </>
            )}
            reassuranceRow={null}
            mockup={<MedCertHeroMockup />}
          >
            <p className="mx-auto mb-6 max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:mb-7 lg:mx-0 lg:text-lg">
              {MED_CERT_WEDGE} Tell us what kept you from work, study or caring duties. If your request is suitable, your certificate arrives as a secure PDF. {GUARANTEE}
            </p>
          </Hero>
          <LimitationsSection />
```

Remove imports that are now unused (`ArrowRight`, `Link` if only the old hero used them). The old hero's trust row (`GoogleAdsCert` + `LegitScriptSeal`) is now the `Hero` default; drop those imports too if unused elsewhere in the file.

- [ ] **Step 3: Update the two pinned contracts**

`lib/__tests__/money-page-narrative-compression-contract.test.ts:78`: replace `"<MedCertHero />"` with `"<Hero"` in the ordered list (keep the rest).

`lib/__tests__/money-page-lcp-critical-path.test.ts:37-38`:

```ts
    expect(medCertLanding).toContain('moneyH1Font.className')
    expect(medCertLanding).toMatch(/<Hero[\s\S]*?title="Medical certificate\. From your bed\."/)
```

- [ ] **Step 4: Turn on the desktop-gap gate for med cert and verify**

Remove the med-cert `test.fixme` from the "within 120px" test. Then:

```bash
pnpm typecheck
pnpm vitest run lib/__tests__/money-page-narrative-compression-contract.test.ts lib/__tests__/money-page-lcp-critical-path.test.ts lib/__tests__/code-clean-retirement-contract.test.ts lib/__tests__/landing-hero-contract.test.ts lib/__tests__/landing-vocabulary-contract.test.ts
pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts -g "medical-certificate" e2e/medical-certificate.spec.ts e2e/intake-resume-chip.spec.ts
```

Expected: PASS. `e2e/medical-certificate.spec.ts` still finds the link `/get your certificate/i`, a `$` price and an "AHPRA … doctor" text in `main`.

- [ ] **Step 5: Commit**

```bash
git add components/marketing/med-cert-landing.tsx app/medical-certificate/page.tsx lib/__tests__/money-page-narrative-compression-contract.test.ts lib/__tests__/money-page-lcp-critical-path.test.ts e2e/landing-pages.spec.ts
git commit -m "refactor(med-cert): shared hero with the live wait counter"
```

### Task 21: ED hero on the shared primitive, duplicate sections removed

**Files:**
- Modify: `components/marketing/erectile-dysfunction-landing.tsx` (`EdHero` → `EdHeroFacts` + `Hero`; delete `EdAlternativesSection`, the fee trio in `EdReviewCostOutcomeSection`, the three scope cards in `EdScopeBoundarySection`)
- Modify: `lib/__tests__/money-page-narrative-compression-contract.test.ts:196-207`
- Modify: `lib/__tests__/marketing-request-reflow-contract.test.ts:42-56`
- Modify: `e2e/landing-pages.spec.ts` (remove the ED desktop-gap `test.fixme`)

Why: 1,112 words and 13.1 phone screens; safety is explained twice (decision map and scope cards); fee explained twice (facts aside and fee trio); bespoke flat hero without trust marks (audit ED). The red-flag alert ("Do not wait for the online form", call 000, erection longer than 4 hours, chest-pain medicines) stays verbatim; run the `instantmed-clinical-safety-review` skill on this diff.

- [ ] **Step 1: Extract the facts aside**

Rename the inline `<aside aria-label="ED assessment facts" …>` block from `EdHero` into its own function above `EdEligibilitySection`:

```tsx
function EdHeroFacts() {
  return (
    <aside aria-label="ED assessment facts" className="w-[320px] max-w-[calc(100vw-2rem)] rounded-3xl border border-border/50 bg-white p-5 shadow-xl shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none sm:w-[360px] sm:p-6">
      {/* unchanged inner markup: the "Before you start" header block and the HERO_FACTS <dl> */}
    </aside>
  )
}
```

Keep the `dl > div` structure and the four `dt` labels exactly ("Eligibility", "Review fee", "Assessment", "If approved"): `e2e/money-pages-foundations.spec.ts:656-685` pins them.

- [ ] **Step 2: Replace the bespoke hero with `Hero`**

Delete `function EdHero(...)` entirely. In `ErectileDysfunctionLanding`, where `<EdHero … />` was:

```tsx
          <Hero
            title="Private ED assessment, from home."
            titleClassName="max-[240px]:text-[1.75rem] max-[240px]:hyphens-none max-[240px]:[overflow-wrap:normal]"
            immediateSubheadline
            primaryCta={{
              text: isDisabled ? "Contact us" : `Start private assessment · ${PRICING_DISPLAY.MENS_HEALTH}`,
              href: isDisabled ? "/contact" : requestCtaHref,
              onClick: handleHeroCTA,
              ref: heroCTARef,
            }}
            secondaryCta={{ text: "See how it works", href: "#how-it-works" }}
            reassuranceRow={null}
            mockup={<EdHeroFacts />}
          >
            <p data-speakable className="mx-auto mb-6 max-w-xl text-balance text-base leading-relaxed text-muted-foreground lg:mx-0 lg:text-lg">
              A one-off private doctor assessment for {PRICING_DISPLAY.MENS_HEALTH}. Complete a secure form from home, then an Australian doctor reviews the full picture.
            </p>
          </Hero>
```

Remove the now-unused imports (`Button`, `Link`, `ArrowRight`, `Lock`, `SectionPill` if only the hero used them, `Reveal` only if no other section uses it).

- [ ] **Step 3: Remove the duplicates**

- Delete `function EdAlternativesSection()` (`:503-526`), its data constant (the three "Other routes" entries around `:175-191`) and `<EdAlternativesSection />` from the render list. The FAQ and nav already route to repeat prescriptions and hair loss.
- In `EdReviewCostOutcomeSection` (`:441-501`) delete the three-column fee grid (`DOCTOR REVIEW / IF DECLINED / IF PRESCRIBED`), keep the three numbered steps and the `Start private assessment` button. Keep `id="how-it-works"` on the section.
- In `EdScopeBoundarySection` (`:409-439`) delete the `ScopeCard` grid and the `ScopeCard` helper (`:399-407`) and its data (`:140-160`); keep the section heading, intro sentence and the red-flag alert box unchanged.

- [ ] **Step 4: Update the pinned contracts**

`lib/__tests__/money-page-narrative-compression-contract.test.ts:196-207` ordered list becomes:

```ts
    expectInOrder(source, [
      "function EdHeroFacts",
      "<Hero",
      "<EdReviewCostOutcomeSection",
      "<EdEligibilitySection />",
      "<EdSafetyDecisionMap />",
      "<EdScopeBoundarySection />",
      "<EdSourcesSection />",
      "items={ED_LANDING_FAQ}",
      "<EdFinalCta",
    ])
```

`lib/__tests__/marketing-request-reflow-contract.test.ts:42-56`: remove the ED row from the `it.each` table (the ED hero no longer owns a bespoke grid; `hero.tsx` carries the reflow guarantees and is pinned separately). Keep the `expect(ed).toContain("max-[240px]:text-[1.75rem] …")` assertion above it; it still holds via `titleClassName`.

- [ ] **Step 5: Verify**

```bash
pnpm typecheck
pnpm vitest run lib/__tests__/money-page-narrative-compression-contract.test.ts lib/__tests__/money-page-art-direction-contract.test.ts lib/__tests__/marketing-request-reflow-contract.test.ts lib/__tests__/landing-vocabulary-contract.test.ts lib/__tests__/service-naming-contract.test.ts lib/__tests__/advertising-compliance-guard.test.ts lib/__tests__/marketing-copy-contract.test.ts
pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts -g "erectile" e2e/money-pages-foundations.spec.ts -g "ED"
```

Expected: PASS. `money-page-art-direction` still finds the decision-map attributes and `<EdReviewCostOutcomeSection` before `<EdSafetyDecisionMap />`; the foundations spec finds the H1 with `hyphens: none`, the hero CTA and "See how it works" inside the hero `<section>`, and the four fact groups. Remove the ED `test.fixme` from the desktop-gap test.

- [ ] **Step 6: Commit**

```bash
git add components/marketing/erectile-dysfunction-landing.tsx lib/__tests__/money-page-narrative-compression-contract.test.ts lib/__tests__/marketing-request-reflow-contract.test.ts e2e/landing-pages.spec.ts
git commit -m "refactor(ed): shared hero, one safety explanation, one fee explanation"
```

### Task 22: Hair loss compression

**Files:**
- Modify: `components/marketing/hair-loss-landing.tsx` (remove `<RegulatoryPartners` from `HairLossPricingSection`; delete `HairLossLimitationsSection`)
- Modify: `lib/__tests__/money-page-narrative-compression-contract.test.ts:246-267`

- [ ] **Step 1: Remove the strip and the limitations section**

In `HairLossPricingSection` delete the `<RegulatoryPartners …/>` element and, if nothing else uses it, the `RegulatoryPartners` dynamic import. Delete `function HairLossLimitationsSection()` and `<HairLossLimitationsSection />`. First confirm the sentence "does not diagnose the cause of hair loss" also lives in the assessment-model figcaption (`grep -n "does not diagnose" components/marketing/hair-loss-landing.tsx` should show two hits); if only the limitations section carried it, move that one sentence into the figcaption of `HairAssessmentModel`.

- [ ] **Step 2: Update the pinned contract**

`lib/__tests__/money-page-narrative-compression-contract.test.ts`: change `pricingEnd` to `source.indexOf("export function HairLossLanding")`, replace `expect(source.slice(pricingStart, pricingEnd)).toContain("<RegulatoryPartners")` with `.not.toContain("<RegulatoryPartners")`, and drop `"<HairLossLimitationsSection />"` from the ordered list.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm vitest run lib/__tests__/money-page-narrative-compression-contract.test.ts lib/__tests__/money-page-art-direction-contract.test.ts lib/__tests__/hair-loss-tga-compliance.test.ts lib/__tests__/canonical-trust-copy-contract.test.ts && pnpm exec playwright test --project=chromium e2e/money-pages-foundations.spec.ts -g "hair"`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/marketing/hair-loss-landing.tsx lib/__tests__/money-page-narrative-compression-contract.test.ts
git commit -m "refactor(hair-loss): drop the regulatory strip and the duplicate limitations block"
```

### Task 23: Women's health compression

**Files:**
- Modify: `components/marketing/womens-health-landing.tsx` (delete `WomensHealthPathwaysSection`; move its two detail-page links into `WomensHealthFinalChoice`; remove `<RegulatoryPartners` from `WomensHealthReviewAndPriceSection`)
- Modify: `lib/__tests__/money-page-narrative-compression-contract.test.ts:314-327`

Why: three choosers (hero fork, pathways section, final choice) plus a self-disclaiming strip on an 11.1-screen phone page. The fork and the final choice stay; the middle chooser goes.

- [ ] **Step 1: Delete the middle chooser and keep its links**

Delete `function WomensHealthPathwaysSection()` (`:108-162`) and `<WomensHealthPathwaysSection />`. In `WomensHealthFinalChoice`, under the two CTA buttons, add:

```tsx
          <p className="mt-4 text-sm text-muted-foreground">
            Want the detail first? Read the <Link href="/uti-assessment-online" className="font-medium text-primary underline-offset-4 hover:underline">UTI assessment page</Link> or the <Link href="/contraceptive-pill-assessment-online" className="font-medium text-primary underline-offset-4 hover:underline">contraceptive pill page</Link>.
          </p>
```

(`money-page-narrative-compression-contract.test.ts:300-302` pins both hrefs and `href="/prescriptions"`, which stays in the final-choice repeat line.)

Remove `<RegulatoryPartners …/>` from `WomensHealthReviewAndPriceSection` and the dynamic import if unused.

- [ ] **Step 2: Update the pinned contract**

`lib/__tests__/money-page-narrative-compression-contract.test.ts`: replace `expect(source.slice(reviewStart, reviewEnd)).toContain("<RegulatoryPartners")` with `.not.toContain("<RegulatoryPartners")`; drop `"<WomensHealthPathwaysSection />"` from the ordered list.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm vitest run lib/__tests__/money-page-narrative-compression-contract.test.ts lib/__tests__/womens-health-layout-contract.test.ts lib/__tests__/portfolio-art-direction-contract.test.ts lib/__tests__/landing-vocabulary-contract.test.ts && pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts -g "womens"`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/marketing/womens-health-landing.tsx lib/__tests__/money-page-narrative-compression-contract.test.ts
git commit -m "refactor(womens-health): one fork, one closer, no strip"
```

### Task 24: Regulatory strip off the remaining money pages

**Files:**
- Modify: `components/marketing/med-cert-landing.tsx` (remove `<RegulatoryPartners />` and its import)
- Modify: `components/marketing/prescriptions-landing.tsx:342` (remove `<RegulatoryPartners className="py-12" exclude={["Medicare"]} />` and its import)
- Modify: `lib/__tests__/money-page-narrative-compression-contract.test.ts:85,138`

Why: greyed regulator logos with a caption that says none of them endorse InstantMed subtract trust on a money page. The component stays for `/how-it-works`, `/employers` and `/for/*`.

- [ ] **Step 1: Remove and update the two ordered lists**

Delete the two elements and imports. In the contract, drop `"<RegulatoryPartners />"` from the med-cert list and `"<RegulatoryPartners"` from the prescriptions list.

- [ ] **Step 2: Verify**

Run: `pnpm lint && pnpm vitest run lib/__tests__/money-page-narrative-compression-contract.test.ts lib/__tests__/retired-compat-modules.test.ts lib/__tests__/canonical-trust-copy-contract.test.ts lib/__tests__/money-page-image-performance-contract.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/marketing/med-cert-landing.tsx components/marketing/prescriptions-landing.tsx lib/__tests__/money-page-narrative-compression-contract.test.ts
git commit -m "refactor(landing): regulatory strip only on explainer pages"
```

### Task 25: Phone-length budgets on, PR 5

**Files:**
- Modify: `e2e/landing-pages.spec.ts` (remove the `test.fixme(landing.path !== "/", …)` line from the length test)
- Possibly modify: section padding on any page still over budget

- [ ] **Step 1: Turn the budgets on**

Delete the `test.fixme` line in the "fits N phone screens" test. Run:

`pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts -g "fits"`

Expected: PASS on all seven. If a page is over by less than one screen, reduce that page's section rhythm from `py-14 sm:py-16 lg:py-20` to `py-10 sm:py-12 lg:py-16` on its own sections (not on shared primitives) and re-run. If a page is over by more than one screen, stop and report which section is longest (`page.evaluate` over `main > section` heights); do not raise the budget.

- [ ] **Step 2: Reviews**

Run the `instantmed-clinical-safety-review` skill over the ED, hair and women's-health diffs (the red-flag and boundary copy must be byte-identical to `main`; confirm with `git diff main...HEAD -- components/marketing/erectile-dysfunction-landing.tsx | grep -n "000\|4 hours\|Chest-pain"`). Run the `instantmed-marketing-compliance-review` skill over the med-cert hero move.

- [ ] **Step 3: PR 5 ladder and evidence**

```bash
pnpm lint && pnpm typecheck
pnpm vitest run lib/__tests__/money-page-narrative-compression-contract.test.ts lib/__tests__/money-page-art-direction-contract.test.ts lib/__tests__/marketing-request-reflow-contract.test.ts lib/__tests__/money-page-lcp-critical-path.test.ts lib/__tests__/landing-hero-contract.test.ts lib/__tests__/landing-vocabulary-contract.test.ts lib/__tests__/voice-guard.test.ts
pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts e2e/medical-certificate.spec.ts e2e/intake-resume-chip.spec.ts e2e/consult-subtypes.spec.ts e2e/money-pages-foundations.spec.ts
```

Capture `/medical-certificate`, `/erectile-dysfunction`, `/hair-loss`, `/womens-health` at 375×812 (hero + one scroll position) and 1440×900, light and dark. Open PR 5 "Specialty pages: shared hero, one explanation each, phone length budgets".

---

## PR 6: Type floor

### Task 26: 16px body, nothing under 12px

**Files:**
- Create: `lib/__tests__/landing-type-floor-contract.test.ts`
- Modify: every file in `LANDING_SURFACES` plus `components/sections/faq-section.tsx` as the sweep table says
- Modify: `e2e/landing-pages.spec.ts` (word-census gate)

Why: 14px carries 31–61% of the words on every page and 8–32% render at 12px or smaller against a 16px patient floor (audit G7). The specimen and eScript mocks (`components/marketing/mockups/*`, `hero-doctor-review-mockup.tsx`) are document facsimiles and are exempt.

- [ ] **Step 1: The static half of the gate**

```ts
// lib/__tests__/landing-type-floor-contract.test.ts
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { LANDING_SURFACES } from "@/lib/marketing/landing-vocabulary"

const root = process.cwd()

/** Files whose className strings are patient-facing type on the seven landing pages. */
const TYPE_SURFACES = [
  ...LANDING_SURFACES.filter((p) => p.endsWith(".tsx")),
  "components/sections/faq-section.tsx",
  "components/marketing/sections/how-it-works-inline.tsx",
] as const

const CLASS_ATTR = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{cn\(([\s\S]*?)\)\})/g

describe("landing type floor (DESIGN.md §2: 16px body, 12px minimum)", () => {
  for (const relativePath of TYPE_SURFACES) {
    it(`${relativePath} has no text under 12px and no non-overline 12px text`, () => {
      const source = readFileSync(join(root, relativePath), "utf8")
      expect(source, "arbitrary sub-14px sizes").not.toMatch(/text-\[(?:9|10|11|13)px\]/)
      const offenders: string[] = []
      for (const match of source.matchAll(CLASS_ATTR)) {
        const classes = match[1] ?? match[2] ?? match[3] ?? ""
        if (/\btext-xs\b/.test(classes) && !/\buppercase\b/.test(classes)) offenders.push(classes.trim().slice(0, 80))
      }
      expect(offenders, "text-xs is for uppercase overlines only").toEqual([])
    })
  }
})
```

Run: `pnpm vitest run lib/__tests__/landing-type-floor-contract.test.ts`
Expected: FAIL; the reporter lists every offending className.

- [ ] **Step 2: The measured half of the gate**

Append to `e2e/landing-pages.spec.ts`:

```ts
test.describe("landing page type floor", () => {
  for (const landing of LANDING_PAGES) {
    test(`${landing.path} renders no small text and at least 45% of words at 16px+`, async ({ page }) => {
      await page.setViewportSize(DESKTOP)
      await seedMoneyPageState(page, "light")
      await gotoPublicRoute(page, landing.path)
      await settle(page)

      const census = await page.evaluate(() => {
        const walker = document.createTreeWalker(document.querySelector("main")!, NodeFilter.SHOW_TEXT)
        let total = 0
        let large = 0
        const small: string[] = []
        let node: Node | null
        while ((node = walker.nextNode())) {
          const text = node.textContent?.trim()
          if (!text) continue
          const el = node.parentElement
          if (!el || el.closest("[data-hero-mockup], [aria-label='Specimen'], .hero-mockup-enter")) continue
          const cs = getComputedStyle(el)
          if (cs.display === "none" || cs.visibility === "hidden") continue
          const rect = el.getBoundingClientRect()
          if (rect.width === 0 && rect.height === 0) continue
          const size = parseFloat(cs.fontSize)
          const words = text.split(/\s+/).length
          total += words
          if (size >= 16) large += words
          if (size < 12 && cs.textTransform !== "uppercase") small.push(`${Math.round(size)}px: ${text.slice(0, 40)}`)
        }
        return { total, share: total ? large / total : 0, small }
      })
      expect(census.small, `${landing.path}: text under 12px`).toEqual([])
      expect(census.share, `${landing.path}: ${(census.share * 100).toFixed(0)}% of words at 16px+`).toBeGreaterThanOrEqual(0.45)
    })
  }
})
```

Add `data-hero-mockup=""` to the wrapper `div` of the mockup column in `hero.tsx` (`:311`) so the facsimiles are excluded from the census.

- [ ] **Step 3: The sweep**

Apply these substitutions, file by file, then re-run both halves of the gate until green. Do not touch the mockup directories.

| File | From | To |
|------|------|----|
| `hero.tsx` reassurance row | `text-xs text-muted-foreground` | `text-sm text-muted-foreground` |
| `hero.tsx` default subhead | `text-sm sm:text-base lg:text-lg leading-[1.5rem] sm:leading-relaxed` | `text-base lg:text-lg leading-relaxed` |
| `hero.tsx` secondary CTA | `text-sm font-medium` | `text-base font-medium` |
| `portfolio-route-map.tsx` card subtitle, benefits, CTA link, pill price | `text-sm` | `text-base` |
| `portfolio-route-map.tsx` block under the grid | `text-sm` (both paragraphs) | `text-base` |
| Every facts aside (`EdHeroFacts`, `HairHeroFacts`, `WeightHeroFacts`, `WomensHealthCommonFacts`) | `dd … text-xs leading-5` / `text-sm leading-5` | `text-sm leading-6` (labels keep `text-xs … uppercase`) |
| `med-cert-landing.tsx` eligibility list + AHPRA line | `text-[13px]` (already `text-sm` after Task 20) | `text-sm` |
| `hair-loss-landing.tsx`, `womens-health-landing.tsx` `beforeCta` lines | `text-[13px]` | `text-sm` |
| `prescriptions-landing.tsx` hero `beforeCta` list | `text-xs … sm:text-sm` | `text-sm` |
| `prescriptions-landing.tsx` reassurance paragraph | `text-xs leading-5` | `text-sm leading-6` |
| Section body paragraphs in all five landing files (`text-sm leading-6 text-muted-foreground` on `<p>`) | `text-sm leading-6` | `text-base leading-7` |
| `components/sections/faq-section.tsx` answer body | `text-sm` (if present) | `text-base` |
| `components/marketing/sections/how-it-works-inline.tsx` step description and time label | `text-xs` / `text-sm` | `text-sm` / `text-base` |
| `sticky-cta.tsx` summary | done in Task 3 | — |

Uppercase overlines (`text-xs font-medium uppercase tracking-[0.08em]`) stay at 12px by design.

- [ ] **Step 4: Verify every contract that pins class strings**

```bash
pnpm lint && pnpm typecheck
pnpm vitest run lib/__tests__/landing-type-floor-contract.test.ts lib/__tests__/marketing-request-reflow-contract.test.ts lib/__tests__/money-page-art-direction-contract.test.ts lib/__tests__/portfolio-art-direction-contract.test.ts lib/__tests__/womens-health-layout-contract.test.ts lib/__tests__/marketing-reduced-motion-contract.test.ts lib/__tests__/money-page-narrative-compression-contract.test.ts
pnpm exec playwright test --project=chromium e2e/landing-pages.spec.ts e2e/patient-journey-readability.spec.ts e2e/money-pages-foundations.spec.ts
```

Expected: PASS. If a page misses the 45% share, the census output names the size buckets; promote the largest 14px group on that page (usually FAQ answers or card bodies) and re-run. If the length budget from Task 25 now fails because larger type made a page taller, trim that page's section padding as Task 25 Step 1 describes; never widen a budget.

- [ ] **Step 5: Evidence and PR 6**

Capture all seven pages at 375×812 (hero) before/after. Open PR 6 "Landing type floor: 16px body, nothing under 12px".

```bash
git add -A lib/__tests__/landing-type-floor-contract.test.ts e2e/landing-pages.spec.ts components/marketing components/sections "app/(marketing)/page.tsx"
git commit -m "style(landing): 16px body and a 12px floor on every landing page"
```

---

## PR 7: Documentation and re-score

### Task 27: Update the design and onboarding docs

**Files:**
- Modify: `DESIGN.md` §6 Hero Variants (lines 259–305) and §11 Trust Logos note
- Modify: `docs/AI_ONBOARDING.md` (rule 9 note, gotchas)
- Modify: `docs/PRIMITIVES.md` §6 Wait Times
- Modify: `CLAUDE.md` Gotchas (one bullet), then `scripts/sync-agent-doc.sh` and `scripts/sync-agent-doc.sh --check`

- [ ] **Step 1: DESIGN.md §6**

Replace the "Used on:" lines and the Hero Rules list with:

```markdown
### Split Hero (`<Hero>` from `components/marketing/hero.tsx`)

Used on every landing page: home, medical certificate, prescriptions, ED, hair loss, women's health, weight management. Bespoke hero markup is not permitted; extend the primitive's slot props.

### Hero Rules

- The shell reserves the fixed header: every landing wrapper carries `pt-[calc(5rem+env(safe-area-inset-top))]` (`LandingPageShell`, `PrescriptionsLanding`, `MedCertLanding`, home).
- Pill = `GoogleReviewsBadge variant="inline"` (G mark + stars) · `pillLabel` (default "AHPRA-registered doctors") · live `WaitCounter` when the page passes `liveWait`, otherwise "Open now". Stars never render without the Google mark.
- Trust row = `GoogleAdsCert` + `LegitScriptSeal`, two marks, one row. Pages with their own marks pass `trustRow={null}`.
- Display titles are `hyphens-none`; long words wrap with `overflow-wrap:anywhere`.
- Bottom padding `pb-8 sm:pb-12 lg:pb-10`; the next section starts within 120px at 1440×900 (`e2e/landing-pages.spec.ts`).
- Ambient `MorningSkyBackground` comes from `MarketingPageShell`; do not mount a second canvas per hero.
- Emergency disclaimer on clinical service pages; price in the primary CTA on every service page.
```

Delete the "Centered Hero … Used on: hair-loss, weight-loss" sentence (weight-loss no longer uses it; pricing/about/contact still do).

- [ ] **Step 2: AI_ONBOARDING, PRIMITIVES, CLAUDE.md**

`docs/AI_ONBOARDING.md` gotchas, add:

```markdown
- **Landing pages are gated (2026-09).** `lib/__tests__/landing-vocabulary-contract.test.ts` bans "pathway", "form-first", "focused assessment", "child page", "Start Consultation" and "doctor-owned" on the files in `lib/marketing/landing-vocabulary.ts`, and budgets caveats per file. `landing-type-floor-contract.test.ts` allows `text-xs` only with `uppercase`. `e2e/landing-pages.spec.ts` measures pill-under-header, CTA above the fold, sticky bar, page length and the 16px share. Fix the copy or layout; never widen a budget.
- **`app/weight-loss/weight-loss-client.tsx` is retired.** `/weight-loss` renders `components/marketing/weight-loss-landing.tsx` on `LandingPageShell`.
```

`docs/PRIMITIVES.md` §6: add "The medical-certificate page passes `getWaitState(new Date(), 'med-cert')` into `<Hero liveWait>`; the home page passes the default (med-cert) state."

`CLAUDE.md` Gotchas, one bullet:

```markdown
- **Landing-page gates (2026-09-19 audit → docs/plans/2026-09-19-landing-pages-95-plan.md)**: every landing page uses `<Hero>` inside a shell with the header offset; stars only render inside `GoogleReviewsBadge`; plain-language vocabulary and caveat budgets are enforced by `landing-vocabulary-contract`; type floor by `landing-type-floor-contract`; geometry, sticky bar, page length and 16px share by `e2e/landing-pages.spec.ts` (CI-blocking, no-auth group). Weight management renders `components/marketing/weight-loss-landing.tsx`.
```

Then:

```bash
bash scripts/sync-agent-doc.sh && bash scripts/sync-agent-doc.sh --check
```

- [ ] **Step 3: Commit**

```bash
git add DESIGN.md docs/AI_ONBOARDING.md docs/PRIMITIVES.md CLAUDE.md AGENTS.md
git commit -m "docs: landing hero rules, vocabulary and type gates"
```

### Task 28: Re-score against the audit and close out

- [ ] **Step 1: Re-measure production after PR 6 deploys**

Run the audit's measurement in the in-app browser against `https://instantmed.com.au` for each page at 1440×900 and 375×812 (the same `page.evaluate` snippets the spec uses: pill top vs header, CTA bottom, screens, word census, hero gap, sticky). Record the values in a table in the PR 7 description next to the 19 Sep baseline from §Spec.

- [ ] **Step 2: Re-score**

Score each page again on the audit's seven categories. The plan is complete when every page scores ≥95 and every gate in §Spec is green in CI. Anything below 95 gets a named follow-up task appended to this file, not a widened gate.

- [ ] **Step 3: Update memory and open PR 7**

Append the measured table and the new scores to the audit memory (`landing-audit-2026-09-19.md`) and open PR 7 "Docs and re-score for the landing-page plan".

---

## Self-review

**Spec coverage.** G1 → Task 1; G2, G3 → Task 1 (gate) held by every later task; G4 → Tasks 5, 14, 18; G5, G6 → Task 2; G7 → Task 26; G8 → Tasks 15, 25 (budgets), compression in 21–24; G9 → Tasks 4, 20, 21; G10 → Task 13; G11 → Tasks 7–12; G12 → Tasks 8, 10, 11; G13 → Tasks 11 (WH), 18 (WL); G14 → Tasks 18, 20, 21 (+ `landing-hero-contract`); G15 → Task 5. Audit items deliberately not in scope: naming Schedule 4 treatments on ED/hair (TGA), testimonials (banned), a customer-facing review-time promise (banned).

**Placeholder scan.** Every code step carries the code; the two conditional instructions (sticker name `"scales"`, `does not diagnose` sentence location) state the exact check and the fallback.

**Name consistency.** `GoogleReviewsBadge variant="inline"` (Task 2, used in Task 27 docs); `pillLabel` (Tasks 2, 20); `data-hero`, `data-hero-trust-row`, `data-hero-mockup` (Tasks 2, 4, 26); `HOME_HERO_CTA_ID` / `HomeClientControls` (Task 14); `LANDING_SURFACES`, `LANDING_BLOCKED_TERMS`, `LANDING_CAVEAT_BUDGETS` (Tasks 7, 14, 17, 18, 26); `LANDING_PAGES`, `STICKY_PAGES`, `settle`, `headerHeight` (Tasks 1, 5, 13, 14, 15, 19, 25, 26); `WeightLossLanding`, `WeightHeroFacts`, `WEIGHT_LOSS_LANDING_FAQ` (Tasks 17–19); `EdHeroFacts` (Task 21 and the narrative contract update).

**Known non-blocking debt this plan does not fix.** `e2e/brand-surfaces.smoke.spec.ts` pins the retired guarantee sentence and already fails on `main`; `e2e/money-pages-narrative.spec.ts` expects 5 pricing cards where six services exist. Both belong to a separate e2e-hygiene PR.

## Follow-ups (Task 25, 2026-09-19)

Task 25 turned the phone-length gate on for all seven landing pages and applied the one authorised page-owned padding reduction (`py-14 sm:py-16 lg:py-20` → `py-10 sm:py-12 lg:py-16`, plus the matching one-step reduction for a section using `py-12 sm:py-14` or `py-14 sm:py-16`) to `/medical-certificate`, `/erectile-dysfunction` and `/hair-loss`. Three pages remain over budget after that reduction and are deferred with an honest `test.fixme` in `e2e/landing-pages.spec.ts` rather than a widened budget. This section is reference only: it names compression candidates from the Task 25 coordinator amendments' measurements; no new work is authorised here.

**F1. `/medical-certificate` — 10.8 screens measured against a 10.0 budget.**
No page-owned section on this page matched either authorised padding pattern (`FeeSuitabilityPanel` is already `py-10 sm:py-14`; `MedCertFinalCta` is already `px-4 py-8 sm:py-10 lg:py-16`; `MedCertReasonLinks` is already `py-8`), so Task 25 made no change to this page and the measurement is unchanged at 10.4 screens. Compression candidates by measured height: how-it-works 1.64 screens (shared `HowItWorksInline` primitive) and hero 1.41 screens (shared `Hero` primitive) are the two largest sections; both are off-limits shared primitives, so closing the remaining ~0.4-screen gap needs either a primitive-level change (its own follow-up, since other pages depend on the same primitives) or a further page-owned reduction to fee panel (1.26) or limitations (1.21, also a shared `LimitationsSection` primitive).

**F2. `/erectile-dysfunction` — 11.3 screens measured against a 9.5 budget.**
Task 25's reduction saved roughly 0.2 screens (10.94 → 10.75 measured, five page-owned sections touched); still over by roughly 1.2 screens. Compression candidates by measured height: decision-map 2.23 screens (`EdSafetyDecisionMap`, page-owned, already reduced once this task) and hero 1.59 screens (shared `Hero` primitive). The decision-map's three-column safety figure is the largest single block on the page and is the most likely next target for content-density work, not further padding.

**F3. `/hair-loss` — 12.3 screens measured against a 9.5 budget.**
Task 25's reduction saved roughly 0.05 screens (12.04 → 11.99 measured, two page-owned sections touched); still over by roughly 2.5 screens, the largest gap of the three deferred pages. Compression candidates by measured height: assessment-model 2.72 screens (`HairAssessmentModel`, page-owned, already reduced once this task) and hero/how-it-works, tied at 1.59 screens each (shared `Hero` and `HowItWorksInline` primitives). The assessment-model's four-signal grid plus outcomes list is the single largest section measured across all seven pages and is the primary lever for this page.

**F4. `/womens-health` — 9.6 screens measured against a 9.5 budget (regression introduced by Task 26).**
Task 25 measured this page at 9.37 screens (PASS, real, no source touched). Task 26's type-floor sweep — the shared `Hero` subhead/reassurance-row size increase applied to every page, plus promoting three page-owned `<p>` paragraphs in `WomensHealthBoundarySection` and `WomensHealthReviewAndPriceSection` from `text-sm leading-6` to `text-base leading-7` — pushed it to 9.7 screens. Applying the one authorised page-owned padding reduction (`py-14 sm:py-16 lg:py-20` → `py-10 sm:py-12 lg:py-16`) to all three eligible page-owned sections (`WomensHealthBoundarySection`, `WomensHealthReviewAndPriceSection`, `WomensHealthFinalChoice`) recovered 0.1 screens (9.7 → 9.6), leaving it 0.1 screens over. `WomensHealthCommonFacts` is already `py-8`, below the reduction floor, so it offers no further authorised headroom. Compression candidates: none of the three trimmed sections have a further authorised padding step available; closing the remaining ~0.1-screen gap needs either a page-owned content-density reduction or accepting the type-floor's height cost on this page.

**Cross-page lever.** Every page also carries roughly 3 screens of shared navbar/footer/margin chrome on top of its own sections (measured state, Task 25 coordinator amendments item 2). A reduction there is not authorised in this task — `Navbar` and `MarketingFooter` are shared primitives — but it would move all three deferred pages, and every other page's margin, toward budget at once, and is worth scoping before further per-page section compression.

## Follow-ups (Task 28 update, 2026-09-20)

Task 28 re-measured all seven pages locally (see `.superpowers/sdd/2026-09-19-landing-pages-95-plan/task-28-measurements.md` and `task-28-rescore.md`, both untracked coordinator files) and found the three phone-length deferrals below are now measurably larger than recorded above, because Task 26's type-floor sweep (16px body minimum, larger reassurance-row and subhead text) ran after Task 25 measured F1 to F3 and added roughly 0.3 to 0.5 screens of height on every page it touched. No gate was widened and no source was changed for this update; it only corrects the recorded numbers and adds three new pages that did not reach the plan's 95-point bar despite passing every gate.

**F1 addendum.** `/medical-certificate` now measures 10.81 screens against the 10.0 budget (was 10.4 to 10.45 when F1 was written), an overage of 0.81 screens. The compression candidates named above are unchanged. Re-score: 87/100, capped by Scroll (55/100); the next-largest gap is Typography (88/100, only 47.8% of words at 16px or larger, the narrowest margin of all seven pages).

**F2 addendum.** `/erectile-dysfunction` now measures 11.26 screens against the 9.5 budget (was 10.7 to 10.75 when F2 was written), an overage of 1.76 screens. The compression candidates named above are unchanged. Re-score: 86/100, capped by Scroll (45/100); the next-largest gap is Content (85/100: the removed chest-pain symptom-guide link, and the audit's still-unconfirmed suggestion to answer the privacy question in the hero facts).

**F3 addendum.** `/hair-loss` now measures 12.28 screens against the 9.5 budget (was 11.99 to 12.0 when F3 was written), an overage of 2.78 screens, still the largest of all seven pages. The compression candidates named above are unchanged. Re-score: 85/100, capped by Scroll (38/100, the lowest score in this entire re-score); the next-largest gap is Content (89/100, driven by the density of the assessment-model figure rather than any missing element).

**F4 confirmation.** `/womens-health` measures 9.62 screens against the 9.5 budget, matching the 9.6 recorded when F4 was written. Re-score: 89/100, capped by Scroll (68/100, the smallest overage of the four deferred pages); the next-largest gap is Copy (90/100: the H1 "choose the right online assessment" was not confirmed rewritten to a promise-led form, only its banned vocabulary).

**F5 (new).** `/` re-scores at 94/100, the highest of all seven pages and the only one with a comfortable Scroll margin (8.78 of a 9.0-screen budget) among the pages once flagged for length. It does not reach 95 because Content scores 88/100: the new how-it-works proof section (Task 15) was not independently re-verified against the audit's specific suggestion to reuse the specimen certificate or eScript mock as the hero mock. No new work is authorised by this entry; it is reference only.

**F6 (new).** `/prescriptions` re-scores at 92/100. It passes its own 8.5-screen Scroll budget by only 0.05 screens (8.45 measured), the thinnest margin of any passing page and effectively zero headroom for any future content addition. No new work is authorised by this entry; it is reference only.

**F7 (new).** `/weight-loss` re-scores at 91/100, the largest single improvement of all seven pages (was 48). It does not reach 95 because Content and Copy score 85 and 90: this is the newest and least field-tested page (it needed a same-task follow-up fix, commit `93f332e86`, for loading placeholders and a labelled eligibility section), so its depth was scored conservatively rather than confirmed defective. No new work is authorised by this entry; it is reference only.

**F8 (new, final-review S7).** Two gates on `/medical-certificate` and one on `/prescriptions` pass with almost no margin, so a future content addition could turn the required `e2e` check red for a reason nobody connects back to their change. `/medical-certificate`'s sticky bar measures 126.1px against the 130px cap (`e2e/landing-pages.spec.ts:150`); its 16px word share is 47.8% against the 45% floor, the narrowest of all seven pages (see the F1 addendum above); `/prescriptions` clears its 8.5-screen Scroll budget by 0.05 screens (8.45 measured, see F6 above). None of this is a failure today. No new work is authorised by this entry; it is reference only.
