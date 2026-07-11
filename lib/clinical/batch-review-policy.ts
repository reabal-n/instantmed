export const BATCH_REVIEW_DEADLINE_HOURS = 24
export const BATCH_REVIEW_DEADLINE_MS = BATCH_REVIEW_DEADLINE_HOURS * 60 * 60 * 1000

// Batch review applies only to delivered (`approved`) auto-approved med certs.
// Med certs terminate at `approved` — they never reach `completed` (that status
// is written only by the prescription script flow). `completed` is a DB
// terminal state, so a revoke from there can never reopen the intake: including
// it stranded the case (cert revoked, status update rejected, batch_reviewed_at
// never stamped, permanent overdue alert). Keep this to `approved` only.
export const BATCH_REVIEW_ELIGIBLE_STATUSES = ["approved"] as const

// Certs auto-approved before the individual-review feature shipped had no way to
// be reviewed — the banner, attestation, and cron did not exist yet. They are
// grandfathered: enforcement (overdue alarm, dashboard banner, attest/revoke
// eligibility) applies only from this cutover forward. The 24h window is an
// InstantMed governance control, not a statutory AHPRA requirement, so a
// forward-only cutover is a legitimate operator decision (2026-07-11). The
// marker is the moment the guarded-reopen trigger migration landed
// (20260711071506); every pending cert as of that decision was approved before
// it, so this closes the historical backlog without faking a doctor attestation.
export const BATCH_REVIEW_ENFORCEMENT_START = "2026-07-11T07:15:06Z"
const BATCH_REVIEW_ENFORCEMENT_START_MS = Date.parse(BATCH_REVIEW_ENFORCEMENT_START)

export interface BatchReviewCandidate {
  ai_approved?: boolean | null
  category?: string | null
  status?: string | null
  batch_reviewed_at?: string | null
}

/**
 * Client-facing predicate: "is this intake a pending individual batch-review
 * obligation?" — used to decide whether to render the attestation card. It does
 * NOT apply the enforcement cutover: the grandfather boundary is enforced at the
 * server layer (`getPendingBatchReviews` / `getBatchReviewHealth` add a `.gte`
 * on `ai_approved_at`), so a cockpit only ever receives post-cutover intakes
 * when it is given an `onBatchReviewResolved` callback. Keeping the cutover out
 * of the render predicate avoids hiding a legitimate card if `ai_approved_at`
 * wasn't hydrated into the client intake shape.
 */
export function isBatchReviewEligible(intake: BatchReviewCandidate): boolean {
  if (intake.ai_approved !== true) return false
  if (intake.category !== "medical_certificate") return false
  if (typeof intake.status !== "string") return false
  if (!(BATCH_REVIEW_ELIGIBLE_STATUSES as readonly string[]).includes(intake.status)) return false
  return !intake.batch_reviewed_at
}

/** True once the cert was auto-approved at/after the enforcement cutover. */
export function isAfterBatchReviewEnforcementStart(aiApprovedAt: string | null | undefined): boolean {
  if (!aiApprovedAt) return false
  const approvedMs = Date.parse(aiApprovedAt)
  if (!Number.isFinite(approvedMs)) return false
  return approvedMs >= BATCH_REVIEW_ENFORCEMENT_START_MS
}

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
