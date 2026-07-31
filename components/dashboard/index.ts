/**
 * Dashboard Component Library
 *
 * Canonical Morning Canvas portal primitives. Solid depth, sky-toned shadows,
 * no glass / glow / spotlight. See `DESIGN.md` §5 + §10 + §12.
 *
 * Usage:
 *   import {
 *     DashboardCard,
 *     DashboardSection,
 *     DashboardPageHeader,
 *     StatusBadge,
 *   } from "@/components/dashboard"
 */

// Canonical primitives
export {
  DashboardCard,
  type DashboardCardProps,
  type DashboardCardTier,
} from "./dashboard-card"
export {
  DashboardPageHeader,
  type DashboardPageHeaderProps,
} from "./dashboard-page-header"
export {
  DashboardSection,
  type DashboardSectionProps,
} from "./dashboard-section"

// Status badge.
export {
  ErrorBadge,
  InfoBadge,
  NeutralBadge,
  StatusBadge,
  type StatusBadgeProps,
  type StatusBadgeStatus,
  SuccessBadge,
  WarningBadge,
} from "./status-badge"
