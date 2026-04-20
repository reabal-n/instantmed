# Design System 95-Readiness Sprint

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the 83→95 gap between the documented design system and shipping code. Unify service-icon system, kill prohibited colour/shadow drift, ship missing tooling, fix dark-mode regressions, normalise pickers, add trust strip, and lock it all down against future drift.

**Architecture:** Phased sweep. Phase 1 lands the single-source-of-truth primitives (`services.ts`, `<Heading/>`, `<Icon/>`) and the highest-ROI quick wins in one session. Phases 2-6 land follow-up sweeps in dedicated sessions. Each phase commits independently. No single mega-PR.

**Tech Stack:** Next.js 15.5 App Router · React 18.3 · TypeScript 5.9 strict · Tailwind v4 · Framer Motion 11 · Vitest + Playwright · ESLint flat config · (net-new) Chromatic, axe-core, eslint custom rule.

**Source audit:** `2026-04-20 visual/UX audit session` — scored platform at 83/100, identified 40+ specific violations. See audit artefacts in chat history.

---

## Scope summary

| Phase | Theme | Rough effort | Ships as |
|---|---|---|---|
| **1** | SSoT primitives + quick wins + C3 prototype | ~4-6 hrs (this session) | 1 PR, multiple commits |
| **2** | Colour + shadow + motion sweep (C1, C4, M2, M6) | ~1 day | 1 PR |
| **3** | Design-system tooling (ESLint, axe, Chromatic) | ~2 days | 1 PR each service |
| **4** | Dark-mode + a11y fixes (D1, D2, D5, aria-live) | ~1 day | 1 PR |
| **5** | Icon sweep — nav, mobile, /for/*, blog + sticker retirement | ~1 day | 1 PR |
| **6** | Long-tail (portal audit, full hex sweep, freeze policy) | ~1 day | 1 PR |

**Total:** ~7-9 engineering days of focused work. Consistent with the "~2 weeks" estimate from the audit.

---

## Phase 1 — SSoT primitives + quick wins (THIS SESSION)

### Task 1.1: Pin design-system version

**Files:**
- Modify: `docs/DESIGN_SYSTEM.md:1-5`
- Modify: `lib/motion/index.ts:1-15`
- Create: `lib/design-system/version.ts`

**Step 1:** Add `DESIGN_SYSTEM_VERSION = "1.0.0"` constant to `lib/design-system/version.ts`:

```ts
/**
 * Design System Version
 *
 * Bump on breaking changes to tokens, motion, or surface patterns.
 * Consumers of the system can pin against this.
 */
export const DESIGN_SYSTEM_VERSION = "1.0.0" as const
```

**Step 2:** Add version header to `docs/DESIGN_SYSTEM.md` line 3:

```markdown
> **Version: 1.0.0** · Updated 2026-04-20 · [Changelog](/docs/DESIGN_SYSTEM_CHANGELOG.md)
```

**Step 3:** Add version annotation to `lib/motion/index.ts` docblock.

**Step 4:** Create `docs/DESIGN_SYSTEM_CHANGELOG.md` with first 1.0.0 entry.

**Step 5:** Commit: `chore(design): pin DESIGN_SYSTEM_VERSION = 1.0.0`

### Task 1.2: Service catalog SSoT

**Files:**
- Create: `lib/services/service-catalog.ts`
- Create: `lib/services/__tests__/service-catalog.test.ts`

**Step 1:** Write the failing test asserting each canonical service has id, title, subtitle, price, effort, iconKey, colorToken, serviceRoute, and that lookup by id works.

**Step 2:** Run: `pnpm vitest lib/services/__tests__/service-catalog.test.ts --run`. Expect FAIL.

**Step 3:** Implement `service-catalog.ts`:

```ts
// Shape
export interface ServiceDef {
  id: CanonicalServiceId
  title: string
  subtitle: string
  price: string
  pricePrefix?: string
  effort: string
  iconKey: ServiceIconKey
  colorToken: ServiceColorToken
  serviceRoute: UnifiedServiceType
  subtype?: string
  popular?: boolean
  comingSoon?: boolean
}

export const SERVICE_CATALOG: Record<CanonicalServiceId, ServiceDef> = {
  'med-cert': { ... iconKey: 'FileText', colorToken: 'emerald' ... },
  'repeat-rx': { ... iconKey: 'Pill', colorToken: 'cyan' ... },
  'ed': { ... iconKey: 'Lightning', colorToken: 'blue' ... },
  'hair-loss': { ... iconKey: 'Sparkles', colorToken: 'amber' ... }, // FIXES C2
  'general-consult': { ... iconKey: 'Stethoscope', colorToken: 'sky' ... },
  'womens-health': { ... iconKey: 'Heart', colorToken: 'pink', comingSoon: true },
  'weight-loss': { ... iconKey: 'Flame', colorToken: 'rose', comingSoon: true },
}

export function getService(id: CanonicalServiceId): ServiceDef
export function getActiveServices(): ServiceDef[]
export function getComingSoonServices(): ServiceDef[]
```

**Step 4:** Run test again. Expect PASS.

**Step 5:** Commit: `feat(services): single source of truth for service definitions`

### Task 1.3: Add Stethoscope to ServiceIconTile + amber token

**Files:**
- Modify: `components/icons/service-icons.tsx`
- Modify: `components/icons/stickers.tsx` (add stethoscope sticker if missing)

**Step 1:** Add `Stethoscope` import from lucide-react to `service-icons.tsx`:
```ts
import { FileCheck2, Heart, Pill, Sparkles, Stethoscope, TrendingDown, Zap } from "lucide-react"
```

**Step 2:** Add to `iconComponents` map:
```ts
Stethoscope,
```

**Step 3:** Add `amber` to `serviceColorConfig`:
```ts
amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', from: '#F59E0B', to: '#D97706', shadow: 'rgba(217,119,6,0.28)' },
```

**Step 4:** Remove `violet` key from `serviceColorConfig` — it's no longer used after Task 1.2 switches hair-loss to amber. (Will break imports; grep first: `rg "color=['\"]violet['\"]"` then fix each callsite in Phase 5.) **For Phase 1 only, keep violet in the config but flag for removal.**

**Step 5:** Commit: `feat(icons): add stethoscope + amber service tokens`

### Task 1.4: C3 — Rewire /request service hub to use ServiceIconTile

**Files:**
- Modify: `components/request/service-hub-screen.tsx:17` (replace StickerIcon import)
- Modify: `components/request/service-hub-screen.tsx:51-155` (SERVICES array → read from catalog)
- Modify render sites (`<StickerIcon name=... />` → `<ServiceIconTile iconKey=... color=... size="lg" />`)

**Step 1:** Replace import: `import { ServiceIconTile } from "@/components/icons/service-icons"`

**Step 2:** Replace the inline `SERVICES` + `COMING_SOON` arrays with:
```ts
import { getActiveServices, getComingSoonServices } from '@/lib/services/service-catalog'
const SERVICES = getActiveServices()
const COMING_SOON = getComingSoonServices()
```

**Step 3:** Replace every `<StickerIcon name={s.icon} size={48} />` with `<ServiceIconTile iconKey={s.iconKey} color={s.colorToken} size="lg" />`

**Step 4:** Typecheck: `pnpm typecheck`. Expect PASS.

**Step 5:** Visual verify at `/request` light + dark mode.

**Step 6:** Commit: `feat(request): unify service hub on ServiceIconTile (C3 part 1)`

### Task 1.5: C3 — Rewire /pricing cards to use ServiceIconTile

**Files:**
- Modify: `app/pricing/pricing-client.tsx` (locate service cards, replace soft-pill-with-Lucide with ServiceIconTile)

**Step 1:** Read `pricing-client.tsx` to find the Medical Cert / Prescription / Consultation card rendering.

**Step 2:** Replace the icon pill with `<ServiceIconTile iconKey={service.iconKey} color={service.colorToken} size="lg" />` sourced from the catalog.

**Step 3:** **CRITICAL:** Confirm the Rx icon renders as green (from catalog: `cyan` token which uses `#0EA5E9 → #0284C7`). **This fixes the prohibited-purple bug (C1 part 1).**

**Step 4:** Typecheck + visual verify.

**Step 5:** Commit: `feat(pricing): unify pricing cards on ServiceIconTile + fix Rx colour (C1/C3)`

### Task 1.6: M4 — Fix /consult duplicate "Full refund if we can't help"

**Files:**
- Modify: `app/consult/page.tsx` (or wherever the trust row lives)

**Step 1:** Grep for "Full refund if we can't help" in app/consult area.

**Step 2:** Identify both usages in the trust row under the hero. Replace the second occurrence with a different valid trust signal: `"No Medicare required"` or `"eScript sent to any pharmacy"`.

**Step 3:** Visual verify no duplicate copy in hero region.

**Step 4:** Commit: `fix(consult): deduplicate trust signal copy`

### Task 1.7: C5 — /request service hub skeleton loading state

**Files:**
- Modify: `components/request/service-hub-screen.tsx` (add skeleton shown during hydration / before draft load)
- OR: Convert the service list card to server-rendered + client hydration for interactive bits

**Step 1:** Add a `isLoading` state gate. Render `<ServiceHubSkeleton />` until drafts + preferences resolve.

**Step 2:** Create `components/request/service-hub-skeleton.tsx` that mirrors the final layout (5 skeleton rows matching the final card geometry) using existing `Skeleton` primitives from `components/ui/skeleton.tsx`.

**Step 3:** Visual verify: throttle network to slow-3G, reload `/request`, confirm no empty white card flash.

**Step 4:** Commit: `fix(request): add skeleton loading state to service hub (C5)`

### Task 1.8: `<Heading level>` primitive

**Files:**
- Create: `components/ui/heading.tsx`
- Create: `components/ui/__tests__/heading.test.tsx`

**Step 1:** Write the failing test asserting `<Heading level={1}>` renders an h1 with the display class (`text-[48px] font-light tracking-[-0.03em]`), `level={2}` with h1-style classes (36px), etc.

**Step 2:** Run test. Expect FAIL.

**Step 3:** Implement:

```tsx
const headingConfig = {
  display: { tag: 'h1', className: 'text-[48px] font-light tracking-[-0.03em] leading-[1.05]' },
  1: { tag: 'h1', className: 'text-[36px] font-semibold tracking-[-0.025em] leading-[1.1]' },
  2: { tag: 'h2', className: 'text-[24px] font-semibold tracking-[-0.02em] leading-[1.2]' },
  3: { tag: 'h3', className: 'text-[18px] font-semibold tracking-[-0.01em] leading-[1.3]' },
} as const

export function Heading({ level = 1, as, className, children }: ...) { ... }
```

**Step 4:** Run test. Expect PASS.

**Step 5:** Commit: `feat(ui): Heading primitive with canonical typography scale`

### Task 1.9: M3 — Replace Work/Study/Carer's low-contrast picker

**Files:**
- Locate: intake step 1 component (grep "Choose the type that matches your situation")
- Replace the current picker with `<RadioGroupCard>` from `components/ui/radio-group-card.tsx`

**Step 1:** Grep: `rg "Choose the type that matches"` → find the file.

**Step 2:** Replace the current 3-up button grid with `<RadioGroupCard>` entries, matching the visual style of "How many days?" picker directly below.

**Step 3:** Visual verify all three pickers on the step now read as one coherent system.

**Step 4:** Commit: `fix(request): unify certificate-type picker on RadioGroupCard (M3)`

### Task 1.10: Price anchor on ED + hair-loss heroes

**Files:**
- Modify: `app/erectile-dysfunction/page.tsx` (or its client) — add "Typically ~$120+ at a GP clinic" anchor
- Modify: `app/hair-loss/page.tsx` (or its client) — add same anchor

**Step 1:** Find the current hero price display ("$49.95 · no hidden fees") and append or adjacent-place: `<span className="text-xs text-muted-foreground">Typically ~$120+ at a GP clinic</span>`

**Step 2:** Match the same composition already used on /medical-certificate and /prescriptions.

**Step 3:** Commit: `feat(ed,hair-loss): add GP price anchor to heroes (conversion)`

### Task 1.11: Sticky trust strip on mobile for service landers

**Files:**
- Create: `components/marketing/sticky-trust-strip.tsx`
- Consumer: mount in layouts for service landers `/medical-certificate`, `/prescriptions`, `/erectile-dysfunction`, `/hair-loss`, `/consult`

**Step 1:** Build a mobile-only (`md:hidden`) sticky strip that renders small LegitScript + Google Pharmacy Certified badges alongside the sticky CTA button. Uses `backdrop-blur-lg` (permitted per §5 for sticky mobile CTA bars).

**Step 2:** Mount on all 5 service lander pages. Ensure it doesn't double-render with the existing `sticky-cta-bar` component (reuse or extend).

**Step 3:** Commit: `feat(marketing): sticky trust strip on mobile service landers`

### Task 1.12: AI onboarding doc

**Files:**
- Create: `docs/AI_ONBOARDING.md`

**Step 1:** Write a concise doc (~200 lines max) listing the 5 canonical files an AI must read before touching UI:
1. `docs/DESIGN_SYSTEM.md`
2. `lib/motion/index.ts`
3. `lib/services/service-catalog.ts`
4. `components/ui/heading.tsx`
5. `components/icons/service-icons.tsx`

Plus rules of thumb: use tokens not arbitraries, never violet except referrals, always `fadeUp` from motion canon, etc.

**Step 2:** Reference from `CLAUDE.md` in the satellite docs table.

**Step 3:** Commit: `docs: add AI_ONBOARDING.md`

### Task 1.13: Component inventory doc

**Files:**
- Create: `docs/COMPONENT_INVENTORY.md`

**Step 1:** Enumerate every canonical "surface" (Card tier 1/2/3, Pills neutral/status, Inputs, Badges, Trust badges, Buttons primary/secondary/ghost) with: import path, canonical classes, do/don't examples, test-ID.

**Step 2:** Link from `CLAUDE.md` satellite docs table.

**Step 3:** Commit: `docs: add COMPONENT_INVENTORY.md`

### Task 1.14: /design-system internal route scaffold

**Files:**
- Create: `app/(dev)/design-system/page.tsx`
- Modify: `middleware.ts` to include `/design-system` in dev-only block

**Step 1:** Create a page that renders every component in every state: Buttons (5 variants × 3 sizes × 4 states), Cards (3 tiers × light+dark), Pills (5 types), Inputs (normal, focused, error, disabled), Badges (6 severity levels), Service icon tiles (all 7 services × 3 sizes), Headings (display/1/2/3), Trust badges.

**Step 2:** Toggle buttons for light/dark scheme and reduced motion at top of page.

**Step 3:** Wire middleware block for prod/preview (following existing `/email-preview` pattern).

**Step 4:** Commit: `feat(dev): add /design-system internal audit page`

### Task 1.15: Phase 1 verification

**Step 1:** Run `pnpm typecheck` → expect PASS
**Step 2:** Run `pnpm lint` → expect PASS
**Step 3:** Run `pnpm test` → expect PASS
**Step 4:** `pnpm dev` → visual spot-check `/`, `/request`, `/pricing`, `/erectile-dysfunction`, `/medical-certificate`, `/design-system` in both light and dark

**Step 5:** Update `CLAUDE.md` migration count if any DB migrations added (none expected).

**Step 6:** Final Phase 1 commit message: `chore: phase 1 verification`

---

## Phase 2 — Colour/shadow/motion sweep (follow-up session)

Tasks:
- **C1 sweep:** kill violet in `alert-dialog.tsx`, `dropdown-menu.tsx`, `queue-table.tsx` (AI-reviewed badge → teal), `intake-detail-header.tsx`, `hero-multi-service-mockup.tsx` (Treatment Plan card → blue), `supported-medications-section.tsx`, `feature-flag-detail.tsx` (admin is OK to keep, but audit).
- **C4 sweep:** black shadows → `shadow-{sm|md|lg} shadow-primary/[0.0{4|6|8}]` in `tabs.tsx`, `switch.tsx`, `radio-group-card.tsx`, `animated-select.tsx`, `consult-flow-client.tsx`.
- **M2 sweep:** custom shadow arbitraries in `onboarding-flow.tsx` (9 shadows), `consult-flow-client.tsx` (5+), `progress.tsx`, `alert-dialog.tsx`, `radio-group-card.tsx`, `cinematic-switch.tsx`.
- **M1:** rename `GlassCard` → `SolidCard`, fix the "purple"→amber prop-name bug, migrate 19 consumers.
- **M6:** motion violations — `initial={false}` → `{}` (11 files), spring physics removal (5 files), duration > 0.4s reductions (6 files).
- Migration of `--service-referral` purple is preserved (explicit exception in docs).

**Ships as:** `feat(design): colour + shadow + motion sweep (C1, C4, M1, M2, M6)`

---

## Phase 3 — Tooling (follow-up session)

Tasks:
- **ESLint custom rule:** `eslint-plugin-instantmed-design-system/no-custom-shadows` — fails if `shadow-\[0_` outside allow-list.
- **axe-core in CI:** run axe against `/`, `/request`, `/pricing`, `/erectile-dysfunction`, `/medical-certificate`, `/sign-in`, `/faq` in both light + dark mode. Fail build on new AA violations.
- **Chromatic setup:** baseline all routes × light/dark × desktop/mobile. Visual regression diffs as PR comments.
- **Reduced-motion snapshot test:** Vitest snapshot of page DOM with `prefers-reduced-motion: reduce` set. Fails if any transform/opacity animation fires at mount.

**Ships as:** Three separate PRs (ESLint → axe → Chromatic) to keep reviewable.

---

## Phase 4 — Dark-mode + a11y (follow-up session)

Tasks:
- **D1:** Fix /pricing hero headline token resolution in dark mode.
- **D2:** Replace hardcoded `text-primary` highlight uses with `text-brand-accent` that resolves to primary (light) / teal (dark). Define `--brand-accent` in `globals.css`.
- **D5:** Bump `--muted-dark` to pass WCAG AA on `--surface-dark` (current 3.5:1 → target 4.5:1+).
- **a11y:** Wire `aria-live="polite"` on queue updates, toast notifications, form error messages. Verify focus return after dialog/sheet close.

**Ships as:** `fix(design): dark-mode contrast + accent token + a11y wiring`

---

## Phase 5 — Icon sweep completion

Tasks:
- Services dropdown (`components/shared/navbar/services-dropdown.tsx`) — switch to `ServiceIconTile` with `size="sm"`.
- Mobile menu (`components/ui/mobile-nav.tsx` / `animated-mobile-menu.tsx`) — same.
- `/for/tradies`, `/for/students`, `/for/shift-workers`, `/for/corporate`, `/for/employers/[company]`, `/for/universities` — swap service icons.
- Blog/article icon inline uses (`components/blog/article-template.tsx` + `components/blog/articles-page.tsx`) — audit and swap.
- **Retire `StickerIcon`** entirely OR build unified `<Icon variant="tile|sticker|line" />` primitive that subsumes all 3 systems. **Decision: build unified `<Icon />` per user directive.**

**Ships as:** `feat(icons): unified Icon primitive + full sweep across nav/mobile/for/blog (C3 completion)`

---

## Phase 6 — Long-tail

Tasks:
- **Portal live-audit** — fix cookie routing in preview browsers (httpOnly issue); then visually audit patient dashboard + intake detail + doctor queue + intake document.
- **Full hex audit** — `rg "#[0-9A-F]{6}" components/ app/ --type tsx` → audit each, replace non-token uses.
- **Pre-launch freeze policy** — add `.github/CODEOWNERS` entry for design system files + PR template checkbox "Verified in both light + dark mode? Checked reduced motion?"
- **DESIGN_SYSTEM.md §1 vs §7 docs resolution** — explicit exception block added to §1 for service-icon gradient palette.
- **Trusted by 3,184+** dedupe on home hero (appears 3 times).
- **"Compliant with" logo bar** polish (unified height, monochrome grayscale, hover bounce).

**Ships as:** `chore(design): long-tail polish + freeze policy + portal visual audit`

---

## Success criteria

- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass at each phase commit.
- Score moves from 83 → 95 per the audit rubric (measured by follow-up audit).
- No regressions in core conversion flows (measured by PostHog funnel through med-cert completion).
- Design system drift lint fails CI on new violations going forward (from Phase 3 onwards).
- All 6 phases documented in `docs/DESIGN_SYSTEM_CHANGELOG.md`.

## Risks

1. **Scope creep in Phase 1.** If any task blocks, move it to Phase 2 rather than degrading verification discipline.
2. **Breaking change to service catalog consumers.** Phase 1 introduces `lib/services/service-catalog.ts`; downstream files (home service grid, nav dropdown, mobile menu) continue using their own inline definitions until Phase 5. No break in Phase 1.
3. **Visual regression on /request + /pricing** from icon swap (C3). Mitigated by side-by-side screenshot before/after.
4. **Portal audit deferred to Phase 6** because of cookie routing in the preview tool. Requires a separate fix (Playwright context creation with explicit cookie seeding) to test live.
5. **Chromatic/axe-core incur ongoing cost.** Flag to user before setting up a paid account; axe-core is free.

## Out-of-scope (explicit)

- Full 19-file migration of `GlassCard` is Phase 2, not Phase 1.
- Admin portal audit (lower business value).
- New features of any kind.
- Refactors not serving the 83 → 95 goal.
