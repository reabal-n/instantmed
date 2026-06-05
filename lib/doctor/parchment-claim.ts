export interface ParchmentClaimState {
  claimed_by?: string | null
  reviewing_doctor_id?: string | null
  reviewed_by?: string | null
}

export interface ParchmentPrescribingEligibilityState {
  status?: string | null
  payment_status?: string | null
  category?: string | null
  subtype?: string | null
  serviceType?: string | null
}

export interface ParchmentPrescribingEligibility {
  eligible: boolean
  error?: string
}

export const PARCHMENT_PRESCRIBING_CONSULT_SUBTYPES = ["ed", "hair_loss"] as const
const PRESCRIBING_CONSULT_SUBTYPES = new Set<string>(PARCHMENT_PRESCRIBING_CONSULT_SUBTYPES)
const PRESCRIBING_SERVICE_TYPES = new Set(["common_scripts", "repeat_rx", "prescription", "repeat-script"])
export const PARCHMENT_PATIENT_SYNC_STATUSES = ["paid", "in_review", "pending_info", "approved", "awaiting_script"] as const
export const PARCHMENT_PRESCRIBING_STATUSES = ["paid", "in_review", "awaiting_script"] as const
export const PARCHMENT_SCRIPT_COMPLETION_STATUSES = ["awaiting_script"] as const
const ACTIVE_PATIENT_SYNC_STATUSES = new Set<string>(PARCHMENT_PATIENT_SYNC_STATUSES)
const ACTIVE_PRESCRIBING_STATUSES = new Set<string>(PARCHMENT_PRESCRIBING_STATUSES)
const ACTIVE_SCRIPT_COMPLETION_STATUSES = new Set<string>(PARCHMENT_SCRIPT_COMPLETION_STATUSES)

function isParchmentPrescribingCase(intake: ParchmentPrescribingEligibilityState): boolean {
  const isPrescribingConsult =
    intake.category === "consult" && PRESCRIBING_CONSULT_SUBTYPES.has(intake.subtype ?? "")
  const isPrescribingService =
    intake.category === "prescription" || PRESCRIBING_SERVICE_TYPES.has(intake.serviceType ?? "")

  return isPrescribingConsult || isPrescribingService
}

export function isParchmentClaimSatisfied(
  intake: ParchmentClaimState,
  doctorId: string,
): boolean {
  return (
    intake.claimed_by === doctorId ||
    intake.reviewing_doctor_id === doctorId ||
    intake.reviewed_by === doctorId
  )
}

export function getParchmentPrescriberCandidateIds(
  intake: ParchmentClaimState,
): string[] {
  return [
    intake.claimed_by,
    intake.reviewing_doctor_id,
    intake.reviewed_by,
  ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
}

export function getParchmentPrescribingEligibility(
  intake: ParchmentPrescribingEligibilityState,
): ParchmentPrescribingEligibility {
  if (intake.payment_status !== "paid") {
    return {
      eligible: false,
      error: "Parchment can only be opened for paid prescribing cases.",
    }
  }

  if (!ACTIVE_PRESCRIBING_STATUSES.has(intake.status ?? "")) {
    return {
      eligible: false,
      error: "Parchment can only be opened for active prescribing cases under doctor review.",
    }
  }

  if (!isParchmentPrescribingCase(intake)) {
    return {
      eligible: false,
      error: "Parchment is only available for prescribing cases.",
    }
  }

  return { eligible: true }
}

export function getParchmentScriptCompletionEligibility(
  intake: ParchmentPrescribingEligibilityState,
): ParchmentPrescribingEligibility {
  if (
    intake.payment_status !== "paid" ||
    !ACTIVE_SCRIPT_COMPLETION_STATUSES.has(intake.status ?? "") ||
    !isParchmentPrescribingCase(intake)
  ) {
    return {
      eligible: false,
      error: "Scripts can only be approved after Parchment prescribing for active paid prescribing requests.",
    }
  }

  return { eligible: true }
}

export function getParchmentPatientSyncEligibility(
  intake: ParchmentPrescribingEligibilityState,
): ParchmentPrescribingEligibility {
  if (
    intake.payment_status !== "paid" ||
    !ACTIVE_PATIENT_SYNC_STATUSES.has(intake.status ?? "") ||
    !isParchmentPrescribingCase(intake)
  ) {
    return {
      eligible: false,
      error: "Parchment sync is only available for active paid prescribing requests.",
    }
  }

  return { eligible: true }
}
