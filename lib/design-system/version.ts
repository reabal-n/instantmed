/**
 * Design System Version
 *
 * Canonical version pin for the InstantMed design system.
 * Bump on breaking changes to tokens, motion, or surface patterns.
 *
 * History:
 *   1.0.0 (2026-04-20) — Initial pin. Sets canon against 2026-Q2 audit.
 *   1.1.0 (2026-04-28) — Heading primitive added. Display scale extended to
 *                         60px on lg+ for hero impact (48px remains canonical
 *                         sm+ target). Home-page Pass 2.
 *   2.0.0 (2026-04-29) — BREAKING. Portal rebuild Phase 1. Legacy 21st.dev
 *                         "glass-forward" portal CSS layer reduced from ~465
 *                         to ~75 lines. Patient portal
 *                         migrated off `glass-card`, `dashboard-card`-as-
 *                         className, gradients on content surfaces, raw
 *                         orange status drift, and a banned height animation.
 *                         New primitives: `<DashboardCard tier>`,
 *                         `<DashboardSection>`, `<DashboardPageHeader>`.
 *                         legacy dashboard aliases removed. Doctor + admin
 *                         portal sweeps tracked separately.
 *   2.0.1 (2026-05-01) — Removed unused glass/glow shim files and the unused
 *                         GlassCard effect module. Canonical files now use
 *                         `stat-card.tsx` and `status-badge.tsx`.
 *   2.0.2 (2026-05-01) — Removed unused portal/SEO/status compatibility
 *                         shims, renamed marketing wrappers, and removed
 *                         legacy Select/DashboardHeader compatibility APIs.
 *
 * Consumers (plan doc, future packages) pin against this. Changelog lives
 * at docs/DESIGN_SYSTEM_CHANGELOG.md.
 */
export const DESIGN_SYSTEM_VERSION = "2.0.2" as const

export type DesignSystemVersion = typeof DESIGN_SYSTEM_VERSION
