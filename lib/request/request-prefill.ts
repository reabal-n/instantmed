import type { UnifiedServiceType } from "@/lib/request/step-registry"

export interface HealthProfilePrefill {
  allergies?: string[]
  conditions?: string[]
  current_medications?: string[]
}

export interface PrescriptionRenewalPrefill {
  medicationName: string
  medicationStrength?: string | null
  dosageInstructions?: string | null
  issuedDate: string
}

interface RequestPrefill {
  identity: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    dob?: string
  }
  answers: Record<string, unknown>
}

function positiveProfileValues(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean)
}

/** Map only known-positive saved history into the answer keys read by MedicalHistoryStep. */
export function buildHealthProfilePrefillAnswers(
  profile: HealthProfilePrefill | null | undefined,
): Record<string, unknown> {
  if (!profile) return {}

  const answers: Record<string, unknown> = {}
  const allergies = positiveProfileValues(profile.allergies)
  const conditions = positiveProfileValues(profile.conditions)

  if (allergies.length > 0) {
    // The intake deliberately combines all allergies with prior medicine
    // reactions. Saved profile allergies may instead be food/environmental,
    // so retain the useful detail but require the patient to answer the
    // combined yes/no question before it becomes a current-request claim.
    answers.allergies = allergies.join(", ")
  }
  if (conditions.length > 0) {
    answers.hasConditions = true
    answers.conditions = conditions.join(", ")
  }
  // Do not seed current_medications into "other medicines". In a renewal the
  // saved list commonly contains the very medicine being requested, and we
  // must not turn that into an inaccurate patient attestation.
  if (Object.keys(answers).length > 0) {
    answers.healthProfilePrefilled = true
  }

  return answers
}

export function canApplySavedHealthProfilePrefill(options: {
  hydrated: boolean
  hasExplicitRecovery: boolean
  hasMedicalHistoryStep: boolean
  lastSavedAt: string | null
}): boolean {
  return options.hydrated
    && !options.hasExplicitRecovery
    && options.hasMedicalHistoryStep
    && !options.lastSavedAt
}

export function buildFlowProfilePrefill(
  accountProfilePrefill: RequestPrefill,
  savedHealthProfileAnswers: Record<string, unknown>,
  hasMedicalHistoryStep: boolean,
): RequestPrefill {
  return {
    identity: accountProfilePrefill.identity,
    answers: {
      ...accountProfilePrefill.answers,
      ...(hasMedicalHistoryStep ? savedHealthProfileAnswers : {}),
    },
  }
}

function prescriptionHistoryFromIssuedDate(
  issuedDate: string,
  now: Date,
): "within_12_months" | "over_12_months" | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(issuedDate.trim())
  if (!match || !Number.isFinite(now.getTime())) return undefined

  const issuedYear = Number(match[1])
  const issuedMonth = Number(match[2]) - 1
  const issuedDateOfMonth = Number(match[3])
  const issuedDay = Date.UTC(issuedYear, issuedMonth, issuedDateOfMonth)
  const normalizedIssued = new Date(issuedDay)
  if (
    normalizedIssued.getUTCFullYear() !== issuedYear ||
    normalizedIssued.getUTCMonth() !== issuedMonth ||
    normalizedIssued.getUTCDate() !== issuedDateOfMonth
  ) {
    return undefined
  }

  // Issued dates are calendar dates, so compare them with the patient's local
  // calendar day rather than letting a UTC offset move the 12-month boundary.
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const currentDateOfMonth = now.getDate()
  const currentDay = Date.UTC(currentYear, currentMonth, currentDateOfMonth)
  if (issuedDay > currentDay) return undefined

  const calendarCutoff = Date.UTC(
    currentYear - 1,
    currentMonth,
    currentDateOfMonth,
  )
  return issuedDay >= calendarCutoff ? "within_12_months" : "over_12_months"
}

/**
 * Seed factual data from a patient's owned issued prescription. Deliberately
 * excludes indication, side effects, unchanged-regimen attestation, and any
 * approval/readiness answer: the patient must answer those for this request.
 */
export function buildPrescriptionRenewalPrefillAnswers(
  prefill: PrescriptionRenewalPrefill | null | undefined,
  now = new Date(),
): Record<string, unknown> {
  if (!prefill) return {}

  const answers: Record<string, unknown> = {}
  const medicationName = prefill.medicationName.trim()
  const medicationStrength = prefill.medicationStrength?.trim() || undefined
  const dosageInstructions = prefill.dosageInstructions?.trim() || undefined
  const prescriptionHistory = prescriptionHistoryFromIssuedDate(prefill.issuedDate, now)

  if (medicationName) {
    answers.medications = [{
      name: medicationName,
      ...(medicationStrength ? { strength: medicationStrength } : {}),
      pbsCode: "MANUAL",
    }]
    answers.medicationName = medicationName
    if (medicationStrength) answers.medicationStrength = medicationStrength
    answers.pbsCode = "MANUAL"
  }
  if (dosageInstructions) {
    answers.currentDose = dosageInstructions
    answers.dosageInstructions = dosageInstructions
  }
  if (prescriptionHistory) answers.prescriptionHistory = prescriptionHistory
  if (medicationName || dosageInstructions) answers.renewalPrefilled = true

  return answers
}

export function canApplyPrescriptionRenewalPrefill(options: {
  hydrated: boolean
  hasRenewalPrefill: boolean
  hasExplicitRecovery: boolean
  alreadyApplied: boolean
  isAuthenticated: boolean
  initialService: UnifiedServiceType | null
  serviceType: UnifiedServiceType | null
  lastSavedAt: string | null
}): boolean {
  return options.hydrated
    && options.hasRenewalPrefill
    && !options.hasExplicitRecovery
    && !options.alreadyApplied
    && options.isAuthenticated
    && options.initialService === "repeat-script"
    && options.serviceType === "repeat-script"
    && !options.lastSavedAt
}
