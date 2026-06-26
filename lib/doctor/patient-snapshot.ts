import { buildStaffPatientHref } from "@/lib/dashboard/routes"
import { calculateAge, formatShortDateSafe } from "@/lib/format"
import { getAddressReviewSummary, getAddressStatusDisplay } from "@/lib/request/address-metadata"
import { requiresPrescribingIdentityForRequest } from "@/lib/request/prescribing-identity"
import { validateMedicareExpiry, validateMedicareNumber } from "@/lib/validation/medicare"
import { normalizeValidIhiNumber } from "@/lib/validation/prescribing-identifier"
import type { AustralianState } from "@/types/db"

export interface PatientSnapshotInput {
  id: string
  full_name: string
  date_of_birth?: string | null
  sex?: "M" | "F" | "N" | "I" | string | null
  medicare_number?: string | null
  medicare_irn?: number | string | null
  medicare_expiry?: string | null
  ihi_number?: string | null
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

export interface PatientSnapshotAddressField extends PatientSnapshotField {
  verificationLabel?: string
  verificationTone?: "success" | "warning" | "outline"
  verified?: boolean
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
  address: PatientSnapshotAddressField
  profileHref: string
  missingCriticalFields: string[]
  completenessLabel: string
  completenessTone: "complete" | "partial" | "missing"
}

export interface PatientSnapshotOptions {
  now?: Date
  answers?: Record<string, unknown> | null
  requireMedicare?: boolean
  requirePhone?: boolean
  requireAddress?: boolean
  requireStructuredAddress?: boolean
  requireSex?: boolean
  validateMedicare?: boolean
  requireMedicareDetails?: boolean
}

export interface PatientSnapshotCaseContext {
  answers?: Record<string, unknown> | null
  category?: string | null
  serviceType?: string | null
  subtype?: string | null
}

export function requiresPrescribingIdentityForCase({
  category,
  serviceType,
  subtype,
}: PatientSnapshotCaseContext): boolean {
  return requiresPrescribingIdentityForRequest({ category, serviceType, subtype })
}

export function getPatientSnapshotOptionsForCase(
  context: PatientSnapshotCaseContext,
): PatientSnapshotOptions {
  const normalizedServiceType = context.serviceType ?? ""
  const normalizedCategory = context.category ?? ""
  const isMedCert =
    normalizedServiceType === "med_certs" ||
    normalizedCategory === "medical_certificate" ||
    normalizedCategory === "med_certs"
  const isConsult =
    normalizedServiceType === "consult" ||
    normalizedServiceType === "consults" ||
    normalizedCategory === "consult"
  const requiresPrescribingIdentity = requiresPrescribingIdentityForCase(context)
  const requiresClinicalContact = requiresPrescribingIdentity || isConsult

  return {
    answers: context.answers,
    requireMedicare: isMedCert ? false : requiresClinicalContact,
    requirePhone: !isMedCert,
    requireAddress: requiresPrescribingIdentity,
    requireStructuredAddress: requiresPrescribingIdentity,
    requireSex: requiresPrescribingIdentity,
    requireMedicareDetails: requiresPrescribingIdentity,
    validateMedicare: !isMedCert && requiresClinicalContact,
  }
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
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value)
    }
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed) return trimmed
    }
  }
  return null
}

function answerOrProfile(
  answers: Record<string, unknown> | null | undefined,
  answerKeys: string[],
  profileValue: string | number | null | undefined,
): string | null {
  return presentAnswer(answers, answerKeys) ?? presentScalar(profileValue)
}

const ADDRESS_LINE1_ANSWER_KEYS = ["address_line1", "addressLine1", "address_line_1", "street_address"]
const ADDRESS_LINE2_ANSWER_KEYS = ["address_line2", "addressLine2", "address_line_2"]
const ADDRESS_SUBURB_ANSWER_KEYS = ["suburb"]
const ADDRESS_STATE_ANSWER_KEYS = ["state"]
const ADDRESS_POSTCODE_ANSWER_KEYS = ["postcode"]
const ADDRESS_ANSWER_KEY_GROUPS = [
  ADDRESS_LINE1_ANSWER_KEYS,
  ADDRESS_LINE2_ANSWER_KEYS,
  ADDRESS_SUBURB_ANSWER_KEYS,
  ADDRESS_STATE_ANSWER_KEYS,
  ADDRESS_POSTCODE_ANSWER_KEYS,
]

function hasAddressAnswer(answers: Record<string, unknown> | null | undefined): boolean {
  return ADDRESS_ANSWER_KEY_GROUPS.some((keys) => presentAnswer(answers, keys) !== null)
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

function hasValidMedicare(value: string | null | undefined): boolean {
  const medicare = present(value)
  return medicare ? validateMedicareNumber(medicare).valid : false
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
  const useAnswerAddress = hasAddressAnswer(answers)
  const line1 = useAnswerAddress
    ? presentAnswer(answers, ADDRESS_LINE1_ANSWER_KEYS)
    : presentScalar(patient.address_line1)
  const line2 = useAnswerAddress
    ? presentAnswer(answers, ADDRESS_LINE2_ANSWER_KEYS)
    : presentScalar(patient.address_line2)
  const suburb = useAnswerAddress
    ? presentAnswer(answers, ADDRESS_SUBURB_ANSWER_KEYS)
    : presentScalar(patient.suburb)
  const state = useAnswerAddress
    ? presentAnswer(answers, ADDRESS_STATE_ANSWER_KEYS)
    : presentScalar(patient.state)
  const postcode = useAnswerAddress
    ? presentAnswer(answers, ADDRESS_POSTCODE_ANSWER_KEYS)
    : presentScalar(patient.postcode)
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
  const dateOfBirth = answerOrProfile(options?.answers, ["date_of_birth", "dateOfBirth", "dob"], patient.date_of_birth)
  const age = options?.now && dateOfBirth
    ? calculateAgeAt(dateOfBirth, options.now)
    : calculateAge(dateOfBirth)
  const dobLabel = formatShortDateSafe(dateOfBirth) ?? "Not provided"
  const ageDobLabel = dateOfBirth
    ? `${age != null ? `${age}y` : "Age unknown"} / ${dobLabel}`
    : "Not provided"
  const medicare = answerOrProfile(options?.answers, ["medicare_number", "medicareNumber"], patient.medicare_number)
  const medicareIrn = answerOrProfile(options?.answers, ["medicare_irn", "medicareIrn"], patient.medicare_irn)
  const medicareExpiry = normalizeMedicareExpiry(
    answerOrProfile(options?.answers, ["medicare_expiry", "medicareExpiry"], patient.medicare_expiry),
  )
  const ihi = answerOrProfile(options?.answers, ["ihi_number", "ihiNumber"], patient.ihi_number)
  const validIhi = normalizeValidIhiNumber(ihi)
  const shouldValidateMedicare = Boolean(medicare && (options?.validateMedicare || options?.requireMedicareDetails))
  const medicareValidation = shouldValidateMedicare && medicare
    ? validateMedicareNumber(medicare)
    : null
  const medicareExpiryValidation = medicareExpiry && options?.requireMedicareDetails
    ? validateMedicareExpiry(medicareExpiry)
    : null
  const medicareIsCritical = Boolean(
    medicare && (!shouldValidateMedicare || medicareValidation?.valid),
  )
  const medicareIrnIsCritical = !options?.requireMedicareDetails || Boolean(medicareIrn && /^[1-9]$/.test(medicareIrn))
  const prescribingIdentifierIsCritical = Boolean(
    options?.requireMedicareDetails
      ? validIhi || medicareIsCritical
      : medicareIsCritical,
  )
  const medicareDetails = [
    medicareIrn ? `IRN ${medicareIrn}` : options?.requireMedicareDetails ? "IRN missing" : null,
    medicareExpiry ? `Exp ${formatShortDateSafe(medicareExpiry) ?? medicareExpiry}` : null,
  ].filter(Boolean).join(" / ")
  const useIhiAsPrimaryIdentifier = Boolean(validIhi && !medicareIsCritical)
  const identifierLabel = useIhiAsPrimaryIdentifier
    ? `IHI ${validIhi}`
    : medicare ?? (validIhi ? `IHI ${validIhi}` : "Not provided")
  const identifierValue = useIhiAsPrimaryIdentifier
    ? validIhi ?? undefined
    : medicare ?? validIhi ?? undefined
  const identifierDetailsLabel = useIhiAsPrimaryIdentifier
    ? "IHI"
    : medicareDetails || (validIhi ? "IHI" : undefined)
  const sexValue = normalizeSexValue(
    answerOrProfile(options?.answers, ["sex", "gender"], patient.sex),
  )
  const sexLabel = resolveSexLabel(sexValue)
  const phone = answerOrProfile(options?.answers, ["phone", "mobile", "mobilePhone"], patient.phone)
  const email = answerOrProfile(options?.answers, ["email"], patient.email)
  const address = resolveAddressComponents(patient, options?.answers)
  const addressReviewSummary = options?.answers
    ? getAddressReviewSummary(options.answers)
    : null
  const addressIsCritical = options?.requireStructuredAddress ? address.complete : Boolean(address.label)

  const requireMedicare = options?.requireMedicare ?? true
  const requirePhone = options?.requirePhone ?? true
  const requireAddress = options?.requireAddress ?? true
  const missingIdentifierLabel = options?.requireMedicareDetails ? "Medicare or IHI" : "Medicare"
  const invalidIdentifierLabel = options?.requireMedicareDetails ? "Valid Medicare number or IHI" : "Valid Medicare number"

  const missingCriticalFields = [
    dateOfBirth ? null : "DOB",
    options?.requireSex && !sexValue ? "Sex" : null,
    requireMedicare ? (prescribingIdentifierIsCritical ? null : medicare ? invalidIdentifierLabel : missingIdentifierLabel) : null,
    options?.requireMedicareDetails && !validIhi && medicare && medicareValidation?.valid && !medicareIrnIsCritical ? "Medicare IRN" : null,
    options?.requireMedicareDetails && !validIhi && medicare && medicareExpiry && !medicareExpiryValidation?.valid ? "Valid Medicare expiry" : null,
    requirePhone ? (phone ? null : "Phone") : null,
    requireAddress && options?.requireStructuredAddress && !address.line1 ? "Address street" : null,
    requireAddress && options?.requireStructuredAddress && !address.suburb ? "Address suburb" : null,
    requireAddress && options?.requireStructuredAddress && !address.state ? "Address state" : null,
    requireAddress && options?.requireStructuredAddress && !address.postcode ? "Address postcode" : null,
    requireAddress && !options?.requireStructuredAddress ? (addressIsCritical ? null : "Address") : null,
  ].filter(Boolean) as string[]

  const missingAddressComponent = missingCriticalFields.some((field) => field.startsWith("Address "))
  const missingGroupCount = missingCriticalFields.filter((field) => !field.startsWith("Address ")).length
    + (missingAddressComponent ? 1 : 0)
  const completenessTone = missingCriticalFields.length === 0
    ? "complete"
    : missingGroupCount >= 3
      ? "missing"
      : "partial"

  return {
    id: patient.id,
    name: present(patient.full_name) ?? "Unnamed patient",
    age,
    dobLabel,
    ageDobLabel,
    sex: {
      label: sexLabel ?? "Not provided",
      present: Boolean(sexValue),
      value: sexValue ?? undefined,
    },
    medicare: {
      label: identifierLabel,
      present: Boolean(medicare || validIhi),
      value: identifierValue,
      valid: useIhiAsPrimaryIdentifier ? true : medicareValidation?.valid ?? (validIhi ? true : undefined),
      error: medicareValidation?.valid === false && !validIhi ? medicareValidation.error : undefined,
      detailsLabel: identifierDetailsLabel,
    },
    phone: {
      label: phone ?? "Not provided",
      present: Boolean(phone),
    },
    email: {
      label: email ?? "Not provided",
      present: Boolean(email),
    },
    address: {
      label: address.label ?? "Not provided",
      present: Boolean(address.label),
      value: address.label ?? undefined,
      complete: address.complete,
      verificationLabel: addressReviewSummary
        ? getAddressStatusDisplay(addressReviewSummary.isVerified)
        : address.label
          ? "Profile address"
          : undefined,
      verificationTone: addressReviewSummary
        ? addressReviewSummary.isVerified
          ? "success"
          : "warning"
        : address.label
          ? "outline"
          : undefined,
      verified: addressReviewSummary?.isVerified,
    },
    profileHref: buildStaffPatientHref(patient.id),
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
    hasValidMedicare(patient.medicare_number) ? 4 : 0,
    normalizeValidIhiNumber(patient.ihi_number) ? 4 : 0,
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
