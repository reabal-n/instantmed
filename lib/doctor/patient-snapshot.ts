import { calculateAge, formatShortDateSafe } from "@/lib/format"
import { validateMedicareExpiry, validateMedicareNumber } from "@/lib/validation/medicare"
import type { AustralianState } from "@/types/db"

export interface PatientSnapshotInput {
  id: string
  full_name: string
  date_of_birth?: string | null
  sex?: "M" | "F" | "N" | "I" | string | null
  medicare_number?: string | null
  medicare_irn?: number | string | null
  medicare_expiry?: string | null
  phone?: string | null
  email?: string | null
  address_line1?: string | null
  address_line2?: string | null
  suburb?: string | null
  state?: AustralianState | string | null
  postcode?: string | null
}

export interface PatientSnapshotField {
  label: string
  present: boolean
  value?: string
  complete?: boolean
  valid?: boolean
  error?: string
  detailsLabel?: string
}

export interface PatientSnapshot {
  id: string
  name: string
  age: number | null
  dobLabel: string
  ageDobLabel: string
  sex: PatientSnapshotField
  medicare: PatientSnapshotField
  phone: PatientSnapshotField
  email: PatientSnapshotField
  address: PatientSnapshotField
  profileHref: string
  missingCriticalFields: string[]
  completenessLabel: string
  completenessTone: "complete" | "partial" | "missing"
}

export interface PatientSnapshotOptions {
  now?: Date
  answers?: Record<string, unknown> | null
  requireStructuredAddress?: boolean
  requireSex?: boolean
  validateMedicare?: boolean
  requireMedicareDetails?: boolean
}

export interface DuplicatePatientGroup {
  reason: "email" | "phone" | "name_dob"
  key: string
  patientIds: string[]
}

export type CollapsedPatientProfile<T extends PatientSnapshotInput> = T & {
  duplicate_profile_ids?: string[]
}

export interface CollapsedPatientProfilesResult<T extends PatientSnapshotInput> {
  patients: Array<CollapsedPatientProfile<T>>
  collapsedCount: number
}

export interface DuplicatePatientProfilesSummary {
  rawProfileCount: number
  uniqueProfileCount: number
  duplicateProfileCount: number
  duplicateGroupCount: number
}

function present(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function presentScalar(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null
  return present(String(value))
}

function presentAnswer(
  answers: Record<string, unknown> | null | undefined,
  keys: string[],
): string | null {
  if (!answers) return null
  for (const key of keys) {
    const value = answers[key]
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed) return trimmed
    }
  }
  return null
}

function normalize(value: string | null | undefined): string {
  return present(value)?.toLowerCase().replace(/\s+/g, " ") ?? ""
}

function normalizePhone(value: string | null | undefined): string {
  let digits = present(value)?.replace(/\D/g, "") ?? ""
  if (digits.startsWith("0061")) {
    digits = digits.slice(2)
  }
  if (digits.startsWith("61") && digits.length === 11) {
    return `0${digits.slice(2)}`
  }
  return digits
}

function resolveSexLabel(value: string | null): string | null {
  const normalized = value?.trim().toUpperCase()
  switch (normalized) {
    case "M":
    case "MALE":
      return "Male"
    case "F":
    case "FEMALE":
      return "Female"
    case "I":
    case "INTERSEX":
    case "INDETERMINATE":
      return "Intersex / Indeterminate"
    case "N":
    case "NOT_STATED":
    case "NOT STATED":
    case "PREFER_NOT_TO_SAY":
    case "PREFER NOT TO SAY":
      return "Not stated"
    default:
      return null
  }
}

function normalizeSexValue(value: string | null): string | null {
  const normalized = value?.trim().toUpperCase()
  if (!normalized) return null
  if (normalized === "MALE") return "M"
  if (normalized === "FEMALE") return "F"
  if (normalized === "INTERSEX" || normalized === "INDETERMINATE") return "I"
  if (normalized === "NOT_STATED" || normalized === "NOT STATED" || normalized === "PREFER_NOT_TO_SAY" || normalized === "PREFER NOT TO SAY") return "N"
  return ["M", "F", "N", "I"].includes(normalized) ? normalized : null
}

function normalizeMedicareExpiry(value: string | null): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  const isoMonth = trimmed.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/)
  if (isoMonth) {
    const month = Number.parseInt(isoMonth[2], 10)
    return month >= 1 && month <= 12 ? `${isoMonth[1]}-${isoMonth[2]}-01` : null
  }

  const short = trimmed.match(/^(\d{1,2})\/(\d{2}|\d{4})$/)
  if (short) {
    const month = Number.parseInt(short[1], 10)
    const rawYear = short[2]
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
    return month >= 1 && month <= 12 ? `${year}-${String(month).padStart(2, "0")}-01` : null
  }

  return null
}

function resolveAddressComponents(
  patient: PatientSnapshotInput,
  answers: Record<string, unknown> | null | undefined,
): {
  line1: string | null
  line2: string | null
  suburb: string | null
  state: string | null
  postcode: string | null
  label: string | null
  complete: boolean
} {
  const line1 = present(patient.address_line1)
    ?? presentAnswer(answers, ["address_line1", "addressLine1", "address_line_1", "street_address"])
  const line2 = present(patient.address_line2)
    ?? presentAnswer(answers, ["address_line2", "addressLine2", "address_line_2"])
  const suburb = present(patient.suburb) ?? presentAnswer(answers, ["suburb"])
  const state = present(patient.state) ?? presentAnswer(answers, ["state"])
  const postcode = present(patient.postcode) ?? presentAnswer(answers, ["postcode"])
  const parts = [line1, line2, suburb, state, postcode].filter(Boolean)

  return {
    line1,
    line2,
    suburb,
    state,
    postcode,
    label: parts.length > 0 ? parts.join(", ") : null,
    complete: Boolean(line1 && suburb && state && postcode),
  }
}

export function buildPatientSnapshot(
  patient: PatientSnapshotInput,
  options?: PatientSnapshotOptions,
): PatientSnapshot {
  const age = options?.now && patient.date_of_birth
    ? calculateAgeAt(patient.date_of_birth, options.now)
    : calculateAge(patient.date_of_birth)
  const dobLabel = formatShortDateSafe(patient.date_of_birth) ?? "DOB not collected"
  const ageDobLabel = patient.date_of_birth
    ? `${age != null ? `${age}y` : "Age unknown"} / ${dobLabel}`
    : "DOB not collected"
  const medicare = present(patient.medicare_number)
    ?? presentAnswer(options?.answers, ["medicare_number", "medicareNumber"])
  const medicareIrn = presentScalar(patient.medicare_irn)
    ?? presentAnswer(options?.answers, ["medicare_irn", "medicareIrn"])
  const medicareExpiry = normalizeMedicareExpiry(
    present(patient.medicare_expiry) ?? presentAnswer(options?.answers, ["medicare_expiry", "medicareExpiry"]),
  )
  const medicareValidation = medicare && options?.validateMedicare
    ? validateMedicareNumber(medicare)
    : null
  const medicareExpiryValidation = medicareExpiry && options?.requireMedicareDetails
    ? validateMedicareExpiry(medicareExpiry)
    : null
  const medicareIsCritical = Boolean(
    medicare && (!options?.validateMedicare || medicareValidation?.valid),
  )
  const medicareIrnIsCritical = !options?.requireMedicareDetails || Boolean(medicareIrn && /^[1-9]$/.test(medicareIrn))
  const medicareExpiryIsCritical = !options?.requireMedicareDetails || Boolean(medicareExpiry && medicareExpiryValidation?.valid)
  const medicareDetails = [
    medicareIrn ? `IRN ${medicareIrn}` : options?.requireMedicareDetails ? "IRN missing" : null,
    medicareExpiry ? `Exp ${formatShortDateSafe(medicareExpiry) ?? medicareExpiry}` : options?.requireMedicareDetails ? "Expiry missing" : null,
  ].filter(Boolean).join(" / ")
  const sexValue = normalizeSexValue(
    present(patient.sex) ?? presentAnswer(options?.answers, ["sex", "gender"]),
  )
  const sexLabel = resolveSexLabel(sexValue)
  const phone = present(patient.phone)
  const email = present(patient.email)
  const address = resolveAddressComponents(patient, options?.answers)
  const addressIsCritical = options?.requireStructuredAddress ? address.complete : Boolean(address.label)

  const missingCriticalFields = [
    patient.date_of_birth ? null : "DOB",
    options?.requireSex && !sexValue ? "Sex" : null,
    medicareIsCritical ? null : medicare ? "Valid Medicare" : "Medicare",
    options?.requireMedicareDetails && medicare && !medicareIrnIsCritical ? "Medicare IRN" : null,
    options?.requireMedicareDetails && medicare && !medicareExpiry ? "Medicare expiry" : null,
    options?.requireMedicareDetails && medicare && medicareExpiry && !medicareExpiryIsCritical ? "Valid Medicare expiry" : null,
    phone ? null : "Phone",
    addressIsCritical ? null : "Address",
  ].filter(Boolean) as string[]

  const completenessTone = missingCriticalFields.length === 0
    ? "complete"
    : missingCriticalFields.length >= 3
      ? "missing"
      : "partial"

  return {
    id: patient.id,
    name: present(patient.full_name) ?? "Unnamed patient",
    age,
    dobLabel,
    ageDobLabel,
    sex: {
      label: sexLabel ?? "Sex not collected",
      present: Boolean(sexValue),
      value: sexValue ?? undefined,
    },
    medicare: {
      label: medicare ?? "Medicare not collected",
      present: Boolean(medicare),
      value: medicare ?? undefined,
      valid: medicareValidation?.valid,
      error: medicareValidation?.valid === false ? medicareValidation.error : undefined,
      detailsLabel: medicareDetails || undefined,
    },
    phone: {
      label: phone ?? "Phone not collected",
      present: Boolean(phone),
    },
    email: {
      label: email ?? "Email not collected",
      present: Boolean(email),
    },
    address: {
      label: address.label ?? "Address not collected",
      present: Boolean(address.label),
      value: address.label ?? undefined,
      complete: address.complete,
    },
    profileHref: `/doctor/patients/${patient.id}`,
    missingCriticalFields,
    completenessLabel: missingCriticalFields.length > 0
      ? `Missing ${missingCriticalFields.join(", ")}`
      : "Patient details complete",
    completenessTone,
  }
}

export function findPotentialDuplicatePatients(
  patients: PatientSnapshotInput[],
): DuplicatePatientGroup[] {
  const groups = new Map<string, DuplicatePatientGroup>()

  for (const patient of patients) {
    const candidates: Array<{ reason: DuplicatePatientGroup["reason"]; key: string }> = []
    const phone = normalizePhone(patient.phone)
    const email = normalize(patient.email)
    const nameDob = normalize(patient.full_name) && patient.date_of_birth
      ? `${normalize(patient.full_name)}|${patient.date_of_birth}`
      : ""

    if (phone) candidates.push({ reason: "phone", key: phone })
    if (email) candidates.push({ reason: "email", key: email })
    if (nameDob) candidates.push({ reason: "name_dob", key: nameDob })

    for (const candidate of candidates) {
      const mapKey = `${candidate.reason}:${candidate.key}`
      const group = groups.get(mapKey) ?? {
        reason: candidate.reason,
        key: candidate.key,
        patientIds: [],
      }
      if (!group.patientIds.includes(patient.id)) {
        group.patientIds.push(patient.id)
      }
      groups.set(mapKey, group)
    }
  }

  const priority: Record<DuplicatePatientGroup["reason"], number> = {
    phone: 0,
    email: 1,
    name_dob: 2,
  }

  const uniqueByPatientSet = new Map<string, DuplicatePatientGroup>()

  for (const group of groups.values()) {
    if (group.patientIds.length < 2) continue
    const patientSetKey = [...group.patientIds].sort().join("|")
    const existing = uniqueByPatientSet.get(patientSetKey)
    if (!existing || priority[group.reason] < priority[existing.reason]) {
      uniqueByPatientSet.set(patientSetKey, group)
    }
  }

  return [...uniqueByPatientSet.values()]
    .filter((group) => group.patientIds.length > 1)
    .sort((a, b) => b.patientIds.length - a.patientIds.length)
}

export function collapseDuplicatePatientProfiles<T extends PatientSnapshotInput>(
  patients: T[],
): CollapsedPatientProfilesResult<T> {
  const groups = new Map<string, { firstIndex: number; patients: T[] }>()
  const ungrouped: Array<{ firstIndex: number; patient: T }> = []

  patients.forEach((patient, index) => {
    const duplicateKey = strictDuplicateKey(patient)
    if (!duplicateKey) {
      ungrouped.push({ firstIndex: index, patient })
      return
    }

    const group = groups.get(duplicateKey)
    if (group) {
      group.patients.push(patient)
    } else {
      groups.set(duplicateKey, { firstIndex: index, patients: [patient] })
    }
  })

  const rows: Array<{ firstIndex: number; patient: CollapsedPatientProfile<T> }> = ungrouped.map(({ firstIndex, patient }) => ({
    firstIndex,
    patient,
  }))
  let collapsedCount = 0

  for (const group of groups.values()) {
    if (group.patients.length === 1) {
      rows.push({ firstIndex: group.firstIndex, patient: group.patients[0] })
      continue
    }

    const canonical = [...group.patients].sort(compareCanonicalPatient)[0]
    const duplicateIds = group.patients
      .filter((patient) => patient.id !== canonical.id)
      .map((patient) => patient.id)

    collapsedCount += duplicateIds.length
    rows.push({
      firstIndex: group.firstIndex,
      patient: {
        ...canonical,
        duplicate_profile_ids: duplicateIds,
      },
    })
  }

  return {
    patients: rows
      .sort((a, b) => a.firstIndex - b.firstIndex)
      .map((row) => row.patient),
    collapsedCount,
  }
}

export function summarizeDuplicatePatientProfiles(
  patients: PatientSnapshotInput[],
): DuplicatePatientProfilesSummary {
  const collapsed = collapseDuplicatePatientProfiles(patients)
  const duplicateGroups = findPotentialDuplicatePatients(patients)

  return {
    rawProfileCount: patients.length,
    uniqueProfileCount: collapsed.patients.length,
    duplicateProfileCount: collapsed.collapsedCount,
    duplicateGroupCount: duplicateGroups.length,
  }
}

function calculateAgeAt(dob: string, now: Date): number | null {
  const birthDate = new Date(dob)
  if (isNaN(birthDate.getTime())) return null
  let age = now.getFullYear() - birthDate.getFullYear()
  const monthDiff = now.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

function strictDuplicateKey(patient: PatientSnapshotInput): string | null {
  const name = normalize(patient.full_name)
  const dateOfBirth = present(patient.date_of_birth)
  const phone = normalizePhone(patient.phone)
  const email = normalize(patient.email)

  if (name && dateOfBirth) return `name_dob:${name}|${dateOfBirth}`
  if (name && phone) return `phone_name:${name}|${phone}`
  if (name && email) return `email_name:${name}|${email}`
  if (email && dateOfBirth) return `email_dob:${email}|${dateOfBirth}`

  return null
}

function completenessScore(patient: PatientSnapshotInput): number {
  const extended = patient as PatientSnapshotInput & {
    auth_user_id?: string | null
    email_verified?: boolean | null
    onboarding_completed?: boolean | null
    stripe_customer_id?: string | null
  }

  return [
    extended.auth_user_id ? 8 : 0,
    extended.onboarding_completed ? 7 : 0,
    extended.email_verified ? 4 : 0,
    present(patient.date_of_birth) ? 4 : 0,
    present(patient.medicare_number) ? 4 : 0,
    presentScalar(patient.medicare_irn) ? 1 : 0,
    present(patient.medicare_expiry) ? 1 : 0,
    normalizePhone(patient.phone) ? 3 : 0,
    normalize(patient.email) ? 3 : 0,
    resolveAddressComponents(patient, null).label ? 2 : 0,
    extended.stripe_customer_id ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0)
}

function timestamp(value: unknown): number {
  if (typeof value !== "string") return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function compareCanonicalPatient<T extends PatientSnapshotInput>(a: T, b: T): number {
  const scoreDelta = completenessScore(b) - completenessScore(a)
  if (scoreDelta !== 0) return scoreDelta

  const extendedA = a as T & { updated_at?: string | null; created_at?: string | null }
  const extendedB = b as T & { updated_at?: string | null; created_at?: string | null }
  const updatedDelta = timestamp(extendedB.updated_at) - timestamp(extendedA.updated_at)
  if (updatedDelta !== 0) return updatedDelta

  const createdDelta = timestamp(extendedB.created_at) - timestamp(extendedA.created_at)
  if (createdDelta !== 0) return createdDelta

  return a.id.localeCompare(b.id)
}
