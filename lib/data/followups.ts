import { addMonths } from "date-fns"

export type FollowupMilestone = "month_3" | "month_6" | "month_12"
export type FollowupSubtype = "ed" | "hair_loss"

export interface ComputedMilestone {
  milestone: FollowupMilestone
  dueAt: Date
}

/**
 * Compute the three follow-up milestone dates given an approval timestamp.
 * Order: month_3, month_6, month_12.
 */
export function computeFollowupMilestones(approvedAt: Date): ComputedMilestone[] {
  return [
    { milestone: "month_3", dueAt: addMonths(approvedAt, 3) },
    { milestone: "month_6", dueAt: addMonths(approvedAt, 6) },
    { milestone: "month_12", dueAt: addMonths(approvedAt, 12) },
  ]
}
