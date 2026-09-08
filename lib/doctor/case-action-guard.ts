import { describeServiceCapability, doctorCanReviewService } from "@/lib/auth/staff-capabilities"

export interface DoctorCaseActionState {
  actorId: string
  actorRole: string | null | undefined
  claimed_by?: string | null
  reviewing_doctor_id?: string | null
  reviewed_by?: string | null
}

export function getDoctorCaseActionError(state: DoctorCaseActionState): string | null {
  if (state.actorRole === "admin") return null

  if (state.claimed_by === state.actorId || state.reviewing_doctor_id === state.actorId) {
    return null
  }

  if (state.claimed_by || state.reviewing_doctor_id) {
    return "This case is claimed by another doctor. Refresh the queue before taking action."
  }

  return "Claim this case before taking action."
}

export function canMutateDoctorCase(state: DoctorCaseActionState): boolean {
  return getDoctorCaseActionError(state) === null
}

export interface ClinicalReviewActionAccess {
  allowed: boolean
  canReviewService: boolean
  reason: string | null
}

/** Server-resolved presentation only; every clinical action keeps its guards. */
export function getClinicalReviewActionAccess(
  profile: Parameters<typeof doctorCanReviewService>[0] & { id: string },
  intake: Pick<DoctorCaseActionState, "claimed_by" | "reviewing_doctor_id" | "reviewed_by"> & {
    service?: { type?: string } | null
    subtype?: string | null
  },
): ClinicalReviewActionAccess {
  const serviceType = intake.service?.type
  const canReviewService = doctorCanReviewService(profile, serviceType, intake.subtype)
  const reason = !canReviewService
    ? `You are not authorised to review ${describeServiceCapability(serviceType, intake.subtype)}.`
    : getDoctorCaseActionError({ ...intake, actorId: profile.id, actorRole: profile.role })
  return { allowed: reason === null, reason, canReviewService }
}
