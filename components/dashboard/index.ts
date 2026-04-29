/**
 * Dashboard Component Library
 *
 * Canonical Morning Canvas portal primitives. Solid depth, sky-toned shadows,
 * no glass / glow / spotlight. See `docs/DESIGN_SYSTEM.md` §5 + §10 + §12.
 *
 * Migration from the legacy 21st.dev stack (Phase 1, design system v2.0.0):
 *   GlassStatCard → StatCard
 *   GlowBadge     → StatusBadge
 *   DashboardCard.elevated  → DashboardCard tier="elevated"
 *   DashboardCard.spotlight → removed (no-op)
 *   DashboardGrid.animate   → removed (no-op; use Framer `stagger` for patient surfaces)
 *
 * Usage:
 *   import {
 *     DashboardCard,
 *     DashboardSection,
 *     DashboardPageHeader,
 *     StatCard,
 *     StatusBadge,
 *   } from "@/components/dashboard"
 */

// Canonical primitives
export {
  DashboardCard,
  type DashboardCardProps,
  type DashboardCardTier,
} from "./dashboard-card"
export { DashboardEmpty, type DashboardEmptyProps } from "./dashboard-empty"
export { DashboardGrid, type DashboardGridProps } from "./dashboard-grid"
export { DashboardHeader, type DashboardHeaderProps } from "./dashboard-header"
export {
  DashboardPageHeader,
  type DashboardPageHeaderProps,
} from "./dashboard-page-header"
export {
  DashboardSection,
  type DashboardSectionProps,
} from "./dashboard-section"

// Stat tile (canonical name + back-compat alias).
export {
  /** @deprecated Use StatCard. FIXME(2026-10-29): drop after admin + doctor migrate. */
  GlassStatCard,
  /** @deprecated Use StatCardProps. FIXME(2026-10-29): drop after admin + doctor migrate. */
  type GlassStatCardProps,
  StatCard,
  type StatCardProps,
  type StatCardStatus,
} from "./glass-stat-card"

// Status badge (canonical name + back-compat alias + helpers).
export {
  ErrorBadge,
  /** @deprecated Use StatusBadge. FIXME(2026-10-29): drop after admin + doctor migrate. */
  GlowBadge,
  /** @deprecated Use StatusBadgeProps. FIXME(2026-10-29): drop after admin + doctor migrate. */
  type GlowBadgeProps,
  /** @deprecated Use StatusBadgeStatus. FIXME(2026-10-29): drop after admin + doctor migrate. */
  type GlowBadgeStatus,
  InfoBadge,
  NeutralBadge,
  StatusBadge,
  type StatusBadgeProps,
  type StatusBadgeStatus,
  SuccessBadge,
  WarningBadge,
} from "./glow-badge"
