# Design System Changelog

> Tracks breaking and notable changes to the InstantMed design system. Pin against `DESIGN_SYSTEM_VERSION` in `lib/design-system/version.ts`.

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
- `DESIGN_SYSTEM.md §7`: removed stale `violet` row, added `amber`/`sky`, added service-icon exception block for `blue` token.

See `docs/plans/2026-04-20-design-system-95-sprint.md` for full audit rubric and success criteria.
