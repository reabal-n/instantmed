export const BATCH_REVIEW_DEADLINE_HOURS = 24
export const BATCH_REVIEW_DEADLINE_MS = BATCH_REVIEW_DEADLINE_HOURS * 60 * 60 * 1000

export function buildBatchReviewResolutionFields(
  doctorId: string,
  reviewedAt = new Date(),
) {
  return {
    batch_reviewed_at: reviewedAt.toISOString(),
    batch_reviewed_by: doctorId,
  }
}

export function getBatchReviewDeadline(aiApprovedAt: string): Date | null {
  const approvedAt = new Date(aiApprovedAt)
  if (!Number.isFinite(approvedAt.getTime())) return null
  return new Date(approvedAt.getTime() + BATCH_REVIEW_DEADLINE_MS)
}

export function isBatchReviewOverdue(
  aiApprovedAt: string | null,
  now = new Date(),
): boolean {
  if (!aiApprovedAt) return false
  const deadline = getBatchReviewDeadline(aiApprovedAt)
  return deadline ? deadline.getTime() <= now.getTime() : false
}
