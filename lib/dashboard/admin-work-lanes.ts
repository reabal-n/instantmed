import type { DisplayIntakeStatus, IntakeStatus } from "@/types/intake"

export type AdminWorkLane = "clinical" | "recovery" | "done" | "other"

export const ADMIN_WORK_LANE_FILTER_OPTIONS = [
  { value: "all", label: "All requests" },
  { value: "clinical", label: "Clinical" },
  { value: "recovery", label: "Payment & recovery" },
  { value: "done", label: "Completed" },
] as const

export type AdminWorkLaneFilterValue = (typeof ADMIN_WORK_LANE_FILTER_OPTIONS)[number]["value"]

export const ADMIN_INTAKE_STATUS_FILTER_OPTIONS = [
  { value: "all" },
  { value: "paid" },
  { value: "in_review" },
  { value: "pending_info" },
  { value: "pending_payment" },
  { value: "checkout_failed" },
  { value: "awaiting_script" },
  { value: "approved" },
  { value: "declined" },
  { value: "completed" },
  { value: "cancelled" },
] as const

export type AdminIntakeStatusFilterValue =
  (typeof ADMIN_INTAKE_STATUS_FILTER_OPTIONS)[number]["value"]

export const CLINICAL_HANDOFF_STATUSES = [
  "awaiting_script",
  "paid",
  "in_review",
  "pending_info",
  "escalated",
] as const satisfies readonly DisplayIntakeStatus[]

export const RECOVERY_WORK_STATUSES = [
  "pending_payment",
  "checkout_failed",
] as const satisfies readonly DisplayIntakeStatus[]

export const DONE_WORK_STATUSES = [
  "approved",
  "declined",
  "completed",
  "cancelled",
  "expired",
] as const satisfies readonly DisplayIntakeStatus[]

const clinicalHandoffStatusSet = new Set<string>(CLINICAL_HANDOFF_STATUSES)
const recoveryWorkStatusSet = new Set<string>(RECOVERY_WORK_STATUSES)
const doneWorkStatusSet = new Set<string>(DONE_WORK_STATUSES)

export function getAdminWorkLaneForStatus(
  status: IntakeStatus | DisplayIntakeStatus | string,
): AdminWorkLane {
  if (clinicalHandoffStatusSet.has(status)) return "clinical"
  if (recoveryWorkStatusSet.has(status)) return "recovery"
  if (doneWorkStatusSet.has(status)) return "done"
  return "other"
}
