import type { DisplayIntakeStatus, IntakeStatus } from "@/types/intake"

export type AdminWorkLane = "clinical" | "admin" | "done" | "other"

export const ADMIN_WORK_LANE_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "clinical", label: "Clinical handoff" },
  { value: "admin", label: "Admin ops" },
  { value: "done", label: "Done" },
] as const

export type AdminWorkLaneFilterValue = (typeof ADMIN_WORK_LANE_FILTER_OPTIONS)[number]["value"]

export const ADMIN_INTAKE_STATUS_FILTER_OPTIONS = [
  { value: "all" },
  { value: "paid" },
  { value: "in_review" },
  { value: "pending_info" },
  { value: "awaiting_script" },
  { value: "approved" },
  { value: "declined" },
  { value: "completed" },
] as const

export type AdminIntakeStatusFilterValue =
  (typeof ADMIN_INTAKE_STATUS_FILTER_OPTIONS)[number]["value"]

export const CLINICAL_HANDOFF_STATUSES = [
  "awaiting_script",
  "paid",
  "in_review",
] as const satisfies readonly DisplayIntakeStatus[]

export const ADMIN_WORK_STATUSES = [
  "pending_info",
  "pending_payment",
  "checkout_failed",
  "disputed",
  "refunded",
  "escalated",
] as const satisfies readonly DisplayIntakeStatus[]

export const DONE_WORK_STATUSES = [
  "approved",
  "declined",
  "completed",
  "cancelled",
  "expired",
] as const satisfies readonly DisplayIntakeStatus[]

export const ADMIN_STATUS_PRIORITY: Record<string, number> = {
  awaiting_script: 0,
  escalated: 1,
  pending_info: 2,
  paid: 3,
  in_review: 4,
  checkout_failed: 5,
  disputed: 6,
  pending_payment: 7,
  refunded: 8,
  declined: 9,
  approved: 10,
  completed: 11,
  cancelled: 12,
  expired: 13,
}

const clinicalHandoffStatusSet = new Set<string>(CLINICAL_HANDOFF_STATUSES)
const adminWorkStatusSet = new Set<string>(ADMIN_WORK_STATUSES)
const doneWorkStatusSet = new Set<string>(DONE_WORK_STATUSES)

export function getAdminWorkLaneForStatus(
  status: IntakeStatus | DisplayIntakeStatus | string,
): AdminWorkLane {
  if (clinicalHandoffStatusSet.has(status)) return "clinical"
  if (adminWorkStatusSet.has(status)) return "admin"
  if (doneWorkStatusSet.has(status)) return "done"
  return "other"
}

export function matchesAdminWorkLaneFilter(
  status: IntakeStatus | DisplayIntakeStatus | string,
  filterValue: AdminWorkLaneFilterValue,
): boolean {
  if (filterValue === "all") return true
  return getAdminWorkLaneForStatus(status) === filterValue
}

export function matchesAdminStatusFilter(
  status: IntakeStatus | DisplayIntakeStatus | string,
  filterValue: AdminIntakeStatusFilterValue,
): boolean {
  return filterValue === "all" || status === filterValue
}
