// ============================================
// INTAKE-RELATED TYPES
// ============================================
// Canonical intake status and lifecycle types shared across
// patient/, doctor/, admin/, and lib/ domains.
// Import from "@/types/intake" — do NOT duplicate these.

/**
 * All possible intake statuses in the system.
 * This is the canonical definition — used by:
 * - types/db.ts (Intake interface)
 * - lib/data/status.ts (status config/display)
 * - lib/data/intake-lifecycle.ts (state machine transitions)
 *
 * Note: lib/intake/structured-intake-schema.ts defines a DIFFERENT
 * IntakeStatus for structured intake AI pipeline (in_progress, ready_for_review, etc.)
 * That is intentionally separate and should NOT be merged here.
 */
export type IntakeStatus =
  | "draft"
  | "pending_payment"
  | "checkout_failed"
  | "paid"
  | "in_review"
  | "pending_info"
  | "approved"
  | "declined"
  | "escalated"
  | "completed"
  | "cancelled"
  | "expired"
  | "awaiting_script"

export type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded" | "failed"

/**
 * Display-layer intake status type.
 * Extends the lifecycle IntakeStatus with UI-only statuses
 * (pending, disputed, refunded) used for badge rendering.
 * These statuses don't exist in the DB state machine but are
 * derived for display purposes.
 *
 * Used by:
 * - lib/data/status.ts (INTAKE_STATUS config, badge colors)
 * - Patient/doctor/admin dashboard components
 */
export type DisplayIntakeStatus =
  | "approved"
  | "completed"
  | "paid"
  | "in_review"
  | "pending"
  | "pending_payment"
  | "declined"
  | "pending_info"
  | "cancelled"
  | "awaiting_script"
  | "expired"
  | "disputed"
  | "checkout_failed"
  | "refunded"

/**
 * Display-layer payment status type.
 * Used for badge rendering in patient/admin UI.
 */
export type DisplayPaymentStatus = "paid" | "pending" | "failed"
