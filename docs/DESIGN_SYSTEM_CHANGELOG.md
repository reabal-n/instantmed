# Design System Changelog

> Tracks breaking and notable changes to the InstantMed design system. Pin against `DESIGN_SYSTEM_VERSION` in `lib/design-system/version.ts`.

## [2.0.0] — 2026-04-29

> **BREAKING.** Portal rebuild Phase 1 (patient surfaces). The legacy 21st.dev "glass-forward" CSS layer that contradicted Morning Canvas is gone, the patient portal is on canonical solid-depth, and three new portal primitives are extracted. Doctor + admin sweeps follow in subsequent commits.

### Migration table

| Was | Use instead |
|---|---|
| `<div className="glass-card ...">` | `<DashboardCard tier="elevated" padding="none" className="...">` |
| `<div className="dashboard-card rounded-xl p-5">` | `<DashboardCard tier="standard">` (or canonical inline className) |
| `<div className="dashboard-card-elevated">` | `<DashboardCard tier="elevated">` (deleted in v2.0.0) |
| `<GlassStatCard>` | `<StatCard>` (alias retained, deprecated) |
| `<GlowBadge>` | `<StatusBadge>` (alias retained, deprecated) |
| `<DashboardCard spotlight>` | (removed; cursor-following effect was banned) |
| `<DashboardGrid animate>` | (no-op; use Framer `stagger` from `lib/motion.ts` for patient stagger) |
| `<h1 className="text-2xl font-semibold tracking-tight">…</h1>` | `<DashboardPageHeader title="…">` (or `<Heading level="h1">`) |
| `<section> + flex items-center justify-between mb-5 + h2` | `<DashboardSection title="…" viewAllHref="…">` |
| `bg-linear-to-br from-…/5 to-…/10` on content card | Solid tint: `bg-primary/[0.04] dark:bg-primary/[0.08]` |
| `border-orange-200 bg-orange-50 text-orange-700` (escalated status) | §10 step 3 canonical: `bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800` |
| `motion.div` animating `height: 0 → "auto"` | Animate `opacity` + `y` only (§12 perf budget) |
| `magnetic-button`, `hover-lift` legacy CSS classes | Removed; use canonical card hover pattern |

### Added
- `components/dashboard/dashboard-card.tsx` — `<DashboardCard tier="standard"|"elevated"|"highlighted">` primitive. Canonical solid-depth (Morning Canvas §5). Replaces all `glass-card`/`dashboard-card` className use in patient portal.
- `components/dashboard/dashboard-section.tsx` — `<DashboardSection title pill description action viewAllHref>` primitive. Replaces ~12 hand-rolled `flex items-center justify-between mb-5 + h2` blocks across patient surfaces.
- `components/dashboard/dashboard-page-header.tsx` — `<DashboardPageHeader title description badge backHref actions>` primitive. Replaces 16+ hand-rolled `<h1 className="text-2xl font-semibold tracking-tight">` instances. Always renders `<Heading level="h1">` internally.
- `scripts/check-portal-no-legacy-classes.sh` — CI smoke check that asserts the patient portal source is free of legacy classes (`glass-card`, `dashboard-card`, gradient on content surface, banned `border-l-*` stripes, raw violet, raw orange ad-hoc combos). Magic-comment allowlist `portal-shim:allow` for explicitly sanctioned patterns (e.g. §12 shimmer sweeps).

### Changed
- `app/dashboard-styles.css` reduced from ~465 lines to ~75 lines. Header rewritten from "21ST.DEV DASHBOARD DESIGN SYSTEM. Sleek, dark, glass-forward aesthetic" to a thin Morning Canvas compatibility shim. `.dashboard-card` and `.dashboard-bg` are kept as canonical-aligned className aliases (admin still references them directly; new code should use the primitive).
- `components/dashboard/glass-stat-card.tsx` exports `StatCard` as the canonical name. `GlassStatCard` retained as a deprecated alias. Stripped `dashboard-stat-*` inset-glow `box-shadow`s.
- `components/dashboard/glow-badge.tsx` exports `StatusBadge` as the canonical name. `GlowBadge` retained as a deprecated alias. Replaced neon `box-shadow: 0 0 12px ...` glows with canonical inset-ring status pills (§10).
- `components/dashboard/dashboard-grid.tsx` no longer applies the `dashboard-grid` CSS-stagger animation. The `animate` prop is preserved as a no-op for back-compat. Patient surfaces should wrap stagger with Framer Motion `stagger.container`/`stagger.item` from `lib/motion.ts`.
- `components/dashboard/dashboard-empty.tsx` rewritten with canonical Tailwind utilities. Lottie empty-state animation retained per §13.
- `components/dashboard/dashboard-header.tsx` now renders `<Heading level="h1">` internally and uses canonical token spacing.
- `components/patient/intake-status-tracker.tsx`: replaced height-based AnimatePresence transition (`height: 0 → "auto"`, banned by §12) with `opacity + y` only. Normalised "escalated" status palette to §10 severity step 3 (canonical `bg-orange-100 text-orange-700` etc).
- `components/patient/intake-card.tsx`, `profile-todo-card.tsx`, `referral-card.tsx`, `panel-dashboard.tsx`, `service-selector.tsx`, `what-happens-next.tsx`: all migrated off `bg-linear-to-br` / `bg-gradient-to-br` gradients on content surfaces. Now use solid tinted backgrounds.
- `app/patient/health-profile/health-profile-client.tsx`: rose icon gradient → solid `bg-primary/10 text-primary`. Sky-50/200/700 alert callout → `bg-info-light border-info-border text-info`.
- 16 patient surface h1s (intakes, prescriptions, documents, settings, messages, health-summary, notifications, payment-history, health-profile, intakes/cancelled, intakes/confirmed, intakes/[id]/error, error.tsx, not-found.tsx, followups/[id], intakes/success/error, intakes/confirmed/error) migrated from hand-rolled `text-2xl font-semibold tracking-tight` to `<DashboardPageHeader>` or `<Heading level="h1">`.
- `components/patient/panel-dashboard.tsx` "Documents ready", "Recent Requests", "Active Prescriptions" sections migrated from hand-rolled `<section>` blocks to `<DashboardSection viewAllHref>`.

### Deprecated
- `GlassStatCard`, `GlassStatCardProps` — use `StatCard` / `StatCardProps`. Alias removed in v3.0.0.
- `GlowBadge`, `GlowBadgeProps`, `GlowBadgeStatus` — use `StatusBadge` / `StatusBadgeProps` / `StatusBadgeStatus`. Alias removed in v3.0.0.
- `DashboardCard.elevated` boolean prop — use `tier="elevated"`. Removed in v3.0.0.
- `DashboardCard.spotlight` prop — accepted as no-op. Removed in v3.0.0.
- `DashboardGrid.animate` prop — accepted as no-op. Removed in v3.0.0.

### Removed
- `dashboard-card-elevated` (CSS class). No remaining consumers; the primitive's tier system replaces it.
- `dashboard-stat`, `dashboard-stat-success`, `dashboard-stat-warning`, `dashboard-stat-error`, `dashboard-stat-info` (CSS classes). Inset-glow box-shadows banned.
- `glow-badge`, `glow-badge-success`, `glow-badge-warning`, `glow-badge-error`, `glow-badge-info`, `glow-badge-neutral` (CSS classes). Neon glows banned by §1.
- `dashboard-spotlight` (CSS class) and the `dashboard-spotlight::after` cursor-following radial gradient.
- `dashboard-grid` CSS-driven nth-child animation stagger.
- `dashboard-sidebar`, `dashboard-nav-item`, `dashboard-row`, `dashboard-divider`, `dashboard-section-title`, `dashboard-empty`, `dashboard-header` CSS classes (no remaining consumers).
- Violet radial gradients in `--dashboard-bg` dark-mode background.
- `getEstimatedWaitTime(intakeId)` deterministic-hash function in `intake-status-tracker.tsx` — replaced with honest static range copy. (Shipped pre-rebuild as standalone P0 hotfix `8aebd5a1d`.)

### Fixed
- Patient portal no longer runs on a parallel "21st.dev glass-forward" design system that contradicted Morning Canvas §5 (solid depth) and §1 (no AI color palette).
- 16 hand-rolled h1s now render with canonical responsive scale and tracking from `<Heading level="h1">`.
- Status tracker no longer animates a layout property (height) inside an AnimatePresence transition.
- Health-profile callout no longer uses raw sky-50/200/700 outside the design-system tokens.

### Migration scope (admin + doctor follow-up)
Admin and doctor portals still import the legacy CSS shim and reference `dashboard-card`/`glass-card`/`border-l-*`/`border-violet-*` patterns flagged in the parallel doctor audit. Phase 1 of those rebuilds will mirror this migration; expect them in v2.1.0 (admin) and v2.2.0 (doctor).

## [1.1.0] — 2026-04-28

> Home-page Pass 2. Resolves the AI_ONBOARDING.md §1.5 TBD on the `<Heading>` primitive and rationalises hero composition. No breaking token changes.

### Added
- `components/ui/heading.tsx` — `<Heading level>` primitive with baked-in typography scale (display / h1 / h2 / h3). Replaces hand-rolled `<h1 className="text-[48px] font-light tracking-[-0.03em]">` patterns. Accepts `as` prop to decouple visual hierarchy from semantic element. Resolves AI_ONBOARDING §1.5.
- `components/marketing/hero-doctor-review-mockup.tsx` — replaces `hero-multi-service-mockup.tsx`. Single primary "doctor reviewing" card + four floating service-output cards (cert, eScript, repeat Rx, treatment plan). Anti-cert-mill positioning: doctor is the hero, platform breadth visible, no real doctor name exposed.
- `MockupSlot` slot prop on `<Hero>` so service pages can swap their own mockup without touching the hero shell.

### Changed
- Display scale extended to 60px on `lg+` (`text-6xl`) for hero impact. 48px remains the canonical `sm+` target. Locks the hero h1 at the previously-spec'd 48px on tablet and steps up to 60px on desktop, matching premium peers.
- Home-page hero composition rationalised: GuaranteeBadge, AHPRA TrustBadgeRow pill, HeroTestimonialRotator, and the inflated patient counter removed from the hero pill. `GoogleAdsCert` (now "Telehealth Certified") + LegitScript pair retained as the trust anchor with a repositioned `LastReviewedSignal`.
- `GoogleAdsCert` label: `Pharmacy Certified` → `Telehealth Certified`. Reflects positioning — InstantMed is a doctor-led telehealth service, not a pharmacy.
- `GoogleReviewsBadge` simplified to stars-only display. Drops the numeric rating + review count; the badge now reads as a Google trust marker without leading with a small N. Used only inside `SocialProofSection`.
- `lib/social-proof/index.ts` patient-count anchors recalibrated: ANCHOR_COUNT 3,000 → 500 (April 11 launch), TARGET_COUNT 8,000 → 2,500 (Dec 31). Defensible given current GBP review base.
- `serviceCards` distilled: per-card testimonial removed; benefit list capped at 2 visible (3 → 2); 5-element card pattern locked.
- Lifestyle photo relocated from full-bleed hero/services scroll-break into a 5/2 accent inside `SocialProofSection` at constrained width.
- `RegulatoryPartners` demoted from hero to a thin standalone trust strip between hero and ServiceCards.

### Fixed
- Hero mockup `overflow-visible` parent so the bottom-right notification card no longer clips at tablet breakpoints.
- Home-page typography drift: hero h1 was rendering at `font-semibold tracking-tight` instead of the spec'd display weight 300 / tracking -0.03em. Now flows through `<Heading level="display">`.

### Deprecated
- `HeroMultiServiceMockup` — replaced by `HeroDoctorReviewMockup`. Old file retained as `.deprecated` shim for any service page still importing it; remove in 1.2.0.

## [1.0.0] — 2026-04-20

### Added
- `lib/design-system/version.ts` exports `DESIGN_SYSTEM_VERSION = "1.0.0"`.
- `lib/services/service-catalog.ts` — canonical single source of truth for service definitions (title, subtitle, price, iconKey, colorToken, route).
- `amber` service colour token in `components/icons/service-icons.tsx` `serviceColorConfig`.
- `Stethoscope` and `Flame` as first-class `iconComponents` entries in `ServiceIconTile`.
- `ServiceIconTile` accepts `variant: "tile" | "sticker"` prop. Default is `tile` (canonical gradient-tile look). `sticker` is opt-in for marketing illustration contexts.

### Changed
- Hair-loss service colour: `violet` → `amber`. Resolves audit findings C1 and C2.
- Home page service grid (`lib/marketing/homepage.ts` → `serviceCategories`) updated to use `amber` for hair loss.
- `/request` service hub (`components/request/service-hub-screen.tsx`) now reads from `lib/services/service-catalog` and renders `ServiceIconTile` with `variant="tile"`. Retires inline service definitions and `StickerIcon` usage on the hub.
- `/pricing` cards (`app/pricing/pricing-client.tsx`) now render `ServiceIconTile` instead of hand-rolled hex-tinted pill. Fixes prohibited indigo (`#4f46e5`) on the Prescription card.

### Removed
- None yet (violet token retained during deprecation window for downstream consumers still migrating — slated for removal in Phase 2 sweep).

### Fixed
- **C1 (partial):** Prohibited indigo colour on the Prescription pricing card.
- **C2:** Internal documentation contradiction (hair loss = amber in §1, violet in §7). Amber is now canonical.
- **C3 (partial):** Service icon system inconsistency between `/`, `/request`, `/pricing`. All three now render via `ServiceIconTile`. Further sweep (nav, mobile menu, `/for/*`, blog) tracked in Phase 5.
- **M4:** Duplicate "Full refund if we can't help" copy on `/consult` and `/prescriptions` service funnel configs. Second occurrence replaced with more specific trust signals.

### Deprecated
- Direct use of `StickerIcon` for service tiles — marketing-only from now on. Service tiles must use `ServiceIconTile`.

### Upgrade notes (for future sessions)
- Consumers pinning to this major line (`1.x`) can rely on: `SERVICE_CATALOG`, `getActiveServices()`, `getComingSoonServices()`, `ServiceIconTile(iconKey, color, size, variant)`.
- Hair loss colour change (`violet` → `amber`) is a one-time migration; search `color: "violet"` in any remaining consumer and update.

---

## Sprint 2026-04-20 — 83 → 95 readiness (Phases 1–6)

Completed same day as 1.0.0 pin. All phases shipped on `main`.

### Phase 2 (2a–2d)
- C1 full sweep: violet/purple purged from system UI, marketing surfaces, hero mockup, mobile menu, queue shadows.
- C4 full sweep: black `rgba(0,0,0,...)` shadows replaced with sky-toned `rgba(2,132,199,...)`/`rgba(5,150,105,...)` across all UI primitives.
- M1 full sweep: `GlassCard` → `SolidCard` rename across 19 files.
- M2 full sweep: custom `shadow-[0_...]` arbitraries → canonical `shadow-primary/[...]` tokens.
- M5 sweep: word-reveal highlight matching fixed for multi-word phrases.

### Phase 3
- `scripts/verify-tokens.sh`: 5-check CI guard (shadow arbitraries, `initial={false}`, spring physics, violet rgba, duration cap).
- `pnpm verify:tokens` script added.
- `.github/workflows/ci.yml`: verify-tokens runs before route/orphan checks.
- `eslint.config.mjs`: `no-restricted-syntax` rules for shadow arbitraries, `initial={false}`, spring physics with per-file exception overrides.

### Phase 4
- D1/D2: dark-mode `muted-foreground` contrast verified ≥ 4.5:1 (actual 7.34:1 — no change needed).
- `aria-live="polite"` wired to doctor queue daily stats strip.
- `e2e/accessibility.spec.ts`: 11-page axe-core suite, dark-mode pass, helper functions.
- `WordReveal` default `wordDuration` 0.4 → 0.3.

### Phase 5
- Icon sweep: unified `<Icon variant="tile|sticker" />` facade (`components/icons/icon.tsx`).
- `violet` removed from `serviceColorConfig`.
- Hero multi-service mockup: stale `violet` branch replaced with `sky`.
- Services dropdown: hair loss `color: "violet"` → `"amber"`.

### Phase 6
- `.github/CODEOWNERS`: design system files require @rey review.
- `.github/pull_request_template.md`: light/dark/reduced-motion checklist.
- Hex audit: `AHPRALogo` `#4F46E5` → `#0284C7`, `TGALogo` `#7C3AED` → `#0F766E`, confetti `#4f46e5` → `#0EA5E9`.
- `med-cert-hero.tsx`: removed hardcoded `"Trusted by 3,000+"` fallback, now uses `getPatientCount()`.
- `regulator-logo-marquee.tsx`: `hover:scale-110` bounce on logo hover.
- `DESIGN.md §7`: removed stale `violet` row, added `amber`/`sky`, added service-icon exception block for `blue` token.

See `docs/plans/2026-04-20-design-system-95-sprint.md` for full audit rubric and success criteria.
