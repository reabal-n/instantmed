import type { IntakeFlag } from "@/lib/clinical/intake-flags"
import type { IntakeStatus } from "@/lib/data/status"
import type { CaseRowAttribution } from "@/lib/operator/cases/case-attribution"
import type { PaymentRecoveryIndicator } from "@/lib/operator/cases/payment-recovery-indicator"

/**
 * Compact refund indicator shown alongside the status dot when an intake has
 * payment activity that operators need to see at a glance from the ledger.
 * `null` (or absent) means "no refund signal worth surfacing".
 */
export type RefundIndicator =
  | "refunded"
  | "partially_refunded"
  | "refund_failed"
  | "refund_processing"

/**
 * Shape consumed by <CaseRow>. Caller maps domain models (intake, patient,
 * recovery item, etc.) into this shape so the same primitive renders
 * everywhere.
 */
export type CaseRowData = {
  id: string
  intakeRef: string
  patientName: string
  patientEmail?: string | null
  patientLocation?: string | null
  avatarInitials: string
  avatarUrl?: string | null
  serviceLabel: string
  status: IntakeStatus
  createdAt: string
  href: string
  isPriority?: boolean
  isStale?: boolean
  refundIndicator?: RefundIndicator | null
  paymentRecoveryIndicator?: PaymentRecoveryIndicator | null
  /**
   * True when the intake is a prescription request for a medicine the patient
   * already has on file (status active or completed). Informational chip only;
   * does not change clinical flow.
   */
  isRenewal: boolean
  /**
   * Pre-rendered tooltip string for the renewal chip, e.g.
   * "Renewal of: Atorvastatin 40mg". Built upstream so the queue row and the
   * operator case row stay in lockstep. Falls back to a generic message when
   * the matched medicine isn't known.
   */
  renewalMatchTitle?: string | null
  /**
   * Doctor-attention intake flags (softened intake gaps the form let through).
   * Drives the calm-chrome flag badge. Empty/absent = no badge. Parsed upstream
   * from intakes.risk_flags so the badge stays consistent across surfaces.
   */
  intakeFlags?: IntakeFlag[]
  /**
   * Raw payment_status value. Used to gate the per-row refund action button.
   * Only "paid" and "partially_refunded" are eligible for operator refunds.
   */
  paymentStatus?: string | null
  /** Original paid amount in cents. Drives the refund dialog amount preview. */
  amountCents?: number | null
  /** Already-refunded amount in cents. 0 if none. */
  refundAmountCents?: number | null
  /**
   * Compact acquisition source ("where did this patient come from?") built by
   * buildCaseRowAttribution — classifier group + short label, with the
   * self-reported heard_about_us answer standing in for dark Direct/Unknown
   * rows. Absent = caller didn't fetch attribution columns; renders nothing.
   */
  attribution?: CaseRowAttribution | null
}

export type Density = "compact" | "comfortable" | "spacious"

export const ROW_HEIGHT: Record<Density, string> = {
  compact: "h-10",
  comfortable: "h-14",
  spacious: "h-[72px]",
}

export const ROW_VERTICAL_PADDING: Record<Density, string> = {
  compact: "py-1",
  comfortable: "py-2",
  spacious: "py-3",
}

export type SortField = "createdAt" | "status" | "patient" | "service"
export type SortDirection = "asc" | "desc"

export type SortState = {
  field: SortField
  direction: SortDirection
}

export const DEFAULT_SORT: SortState = {
  field: "createdAt",
  direction: "desc",
}
