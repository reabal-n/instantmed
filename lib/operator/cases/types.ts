import type { IntakeStatus } from "@/lib/data/status"

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
