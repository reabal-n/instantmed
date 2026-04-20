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

## Roadmap to 1.1.0 (Phase 2)

- C1 sweep complete (queue violet, alert-dialog shadow, hero-multi-service-mockup)
- C4 sweep (black shadows → sky-toned)
- M1 (`GlassCard` → `SolidCard` rename + 19-file migration)
- M2 (custom shadow arbitraries → canonical tokens)
- M6 (motion violations: `initial={false}` → `{}`, spring physics removal, duration reductions)

See `docs/plans/2026-04-20-design-system-95-sprint.md` for the full phase plan.
