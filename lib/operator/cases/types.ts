import type { IntakeStatus } from "@/lib/data/status"

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
