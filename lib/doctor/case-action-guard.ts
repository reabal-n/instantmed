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
