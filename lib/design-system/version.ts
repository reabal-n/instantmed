/**
 * Design System Version
 *
 * Canonical version pin for the InstantMed design system.
 * Bump on breaking changes to tokens, motion, or surface patterns.
 *
 * History:
 *   1.0.0 (2026-04-20) — Initial pin. Sets canon against 2026-Q2 audit.
 *
 * Consumers (plan doc, future packages) pin against this. Changelog lives
 * at docs/DESIGN_SYSTEM_CHANGELOG.md.
 */
export const DESIGN_SYSTEM_VERSION = "1.0.0" as const

export type DesignSystemVersion = typeof DESIGN_SYSTEM_VERSION
