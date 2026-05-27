export const REVIEW_LOCKABLE_INTAKE_STATUSES = [
  "paid",
  "in_review",
  "pending_info",
  "awaiting_script",
] as const

const REVIEW_LOCKABLE_STATUS_SET = new Set<string>(REVIEW_LOCKABLE_INTAKE_STATUSES)

export function isReviewLockableStatus(status: string | null | undefined): boolean {
  return Boolean(status && REVIEW_LOCKABLE_STATUS_SET.has(status))
}
