/**
 * Decline reason templates for the doctor review surface.
 *
 * Consolidated 2026-06-08: this module previously held its own copy of the
 * decline-reason list, which drifted from `lib/doctor/constants.ts`. Both are
 * now a single source of truth — this file re-exports from constants so the
 * two historical import paths (`@/lib/doctor/constants` and
 * `@/lib/doctor/decline-reasons`) resolve to the same list.
 */
export type { DeclineReason } from "./constants"
export { DECLINE_REASONS } from "./constants"
