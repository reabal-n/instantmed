import { validateAustralianAddress } from "@/lib/validation/australian-address"
import { validateAustralianPhone } from "@/lib/validation/australian-phone"
import { validateMedicareExpiry, validateMedicareNumber } from "@/lib/validation/medicare"
import { normalizeValidIhiNumber } from "@/lib/validation/prescribing-identifier"
import type { AustralianState, Profile } from "@/types/db"

export interface PrescribingIdentityFormValues {
  dateOfBirth: string
  sex: string
  phone: string
  medicareNumber: string
  medicareIrn: string
  medicareExpiry: string
  ihiNumber?: string
  addressLine1: string
  suburb: string
  state: string
  postcode: string
}

export type PrescribingIdentityFieldErrors = Partial<Record<keyof PrescribingIdentityFormValues, string>>

export type PrescribingIdentityProfileUpdates = Partial<
  Pick<
    Profile,
    | "date_of_birth"
    | "sex"
    | "phone"
    | "medicare_number"
    | "medicare_irn"
    | "medicare_expiry"
    | "ihi_number"
    | "address_line1"
    | "suburb"
    | "state"
    | "postcode"
  >
>

export interface PrescribingIdentityUpdateResult {
  valid: boolean
  updates: PrescribingIdentityProfileUpdates
  fieldErrors: PrescribingIdentityFieldErrors
}

const AUSTRALIAN_STATES = new Set<AustralianState>(["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"])
const SEX_VALUES = new Set<Profile["sex"]>(["M", "F", "N", "I"])

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function presentAnswer(
  answers: Record<string, unknown> | null | undefined,
  keys: string[],
): string {
  if (!answers) return ""
  for (const key of keys) {
    const value = answers[key]
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
    const trimmed = asTrimmedString(value)
    if (trimmed) return trimmed
  }
  return ""
}

function presentPatientValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  return String(value).trim()
}

const ADDRESS_LINE1_ANSWER_KEYS = ["address_line1", "addressLine1", "address_line_1", "street_address"]
const ADDRESS_SUBURB_ANSWER_KEYS = ["suburb"]
const ADDRESS_STATE_ANSWER_KEYS = ["state"]
const ADDRESS_POSTCODE_ANSWER_KEYS = ["postcode"]
const ADDRESS_ANSWER_KEY_GROUPS = [
  ADDRESS_LINE1_ANSWER_KEYS,
  ADDRESS_SUBURB_ANSWER_KEYS,
  ADDRESS_STATE_ANSWER_KEYS,
  ADDRESS_POSTCODE_ANSWER_KEYS,
]

function hasAddressAnswer(answers: Record<string, unknown> | null | undefined): boolean {
  return ADDRESS_ANSWER_KEY_GROUPS.some((keys) => Boolean(presentAnswer(answers, keys)))
}

function normalizeSex(value: string): Profile["sex"] | null {
  const normalized = value.trim().toUpperCase()
  if (normalized === "MALE") return "M"
  if (normalized === "FEMALE") return "F"
  if (normalized === "INTERSEX" || normalized === "INDETERMINATE") return "I"
  if (
    normalized === "NOT_STATED" ||
    normalized === "NOT STATED" ||
    normalized === "PREFER_NOT_TO_SAY" ||
    normalized === "PREFER NOT TO SAY"
  ) {
    return "N"
  }
  return SEX_VALUES.has(normalized as Profile["sex"]) ? normalized as Profile["sex"] : null
}

function normalizeMedicareExpiry(value: string): string | null {
  const trimmed = value.trim()
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

function normalizeDateOfBirth(value: string): string | null {
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null

  const date = new Date(`${trimmed}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  if (date.toISOString().slice(0, 10) !== trimmed) return null

  const today = new Date()
  const min = new Date(`${today.getUTCFullYear() - 120}-01-01T00:00:00.000Z`)
  if (date > today || date < min) return null

  return trimmed
}

export function resolvePrescribingIdentityFormValues(
  patient: {
    date_of_birth?: string | null
    sex?: string | null
    phone?: string | null
    medicare_number?: string | null
    medicare_irn?: string | number | null
    medicare_expiry?: string | null
    ihi_number?: string | null
    address_line1?: string | null
    suburb?: string | null
    state?: string | null
    postcode?: string | null
  },
  answers?: Record<string, unknown> | null,
): PrescribingIdentityFormValues {
  const useAnswerAddress = hasAddressAnswer(answers)

  return {
    dateOfBirth: presentAnswer(answers, ["date_of_birth", "dateOfBirth", "dob"]) || presentPatientValue(patient.date_of_birth),
    sex: presentAnswer(answers, ["sex", "gender"]) || presentPatientValue(patient.sex),
    phone: presentAnswer(answers, ["phone", "mobile", "mobilePhone"]) || presentPatientValue(patient.phone),
    medicareNumber: presentAnswer(answers, ["medicare_number", "medicareNumber"]) || presentPatientValue(patient.medicare_number),
    medicareIrn: presentAnswer(answers, ["medicare_irn", "medicareIrn"]) || presentPatientValue(patient.medicare_irn),
    medicareExpiry: presentAnswer(answers, ["medicare_expiry", "medicareExpiry"]) || presentPatientValue(patient.medicare_expiry),
    ihiNumber: presentAnswer(answers, ["ihi_number", "ihiNumber"]) || presentPatientValue(patient.ihi_number),
    addressLine1: useAnswerAddress
      ? presentAnswer(answers, ADDRESS_LINE1_ANSWER_KEYS)
      : presentPatientValue(patient.address_line1),
    suburb: useAnswerAddress
      ? presentAnswer(answers, ADDRESS_SUBURB_ANSWER_KEYS)
      : presentPatientValue(patient.suburb),
    state: useAnswerAddress
      ? presentAnswer(answers, ADDRESS_STATE_ANSWER_KEYS)
      : presentPatientValue(patient.state),
    postcode: useAnswerAddress
      ? presentAnswer(answers, ADDRESS_POSTCODE_ANSWER_KEYS)
      : presentPatientValue(patient.postcode),
  }
}

export function buildPrescribingIdentityProfileUpdates(
  input: PrescribingIdentityFormValues,
): PrescribingIdentityUpdateResult {
  const fieldErrors: PrescribingIdentityFieldErrors = {}

  const dateOfBirth = normalizeDateOfBirth(input.dateOfBirth)
  if (!dateOfBirth) {
    fieldErrors.dateOfBirth = "Enter a valid date of birth."
  }

  const sex = normalizeSex(input.sex)
  if (!sex) {
    fieldErrors.sex = "Select sex as recorded for prescribing."
  }

  const phoneResult = validateAustralianPhone(input.phone)
  if (!phoneResult.valid || !phoneResult.e164) {
    fieldErrors.phone = phoneResult.error || "Enter a valid Australian phone number."
  }

  const medicareNumber = input.medicareNumber.replace(/[\s-]/g, "")
  const medicareResult = medicareNumber ? validateMedicareNumber(medicareNumber) : null
  const validMedicare = medicareResult?.valid === true
  const medicareIrn = input.medicareIrn.trim()
  const hasValidMedicareIrn = /^[1-9]$/.test(medicareIrn)
  const ihiNumber = normalizeValidIhiNumber(input.ihiNumber ?? "")
  const rawIhi = (input.ihiNumber ?? "").trim()

  if (!validMedicare && !ihiNumber) {
    if (medicareNumber) {
      fieldErrors.medicareNumber = "Enter a valid Medicare number or provide a valid IHI."
    } else {
      fieldErrors.medicareNumber = "Enter Medicare details or an IHI."
    }
  }
  if (rawIhi && !ihiNumber) {
    fieldErrors.ihiNumber = "Enter a valid 16-digit IHI."
  }

  if (validMedicare && !hasValidMedicareIrn && !ihiNumber) {
    fieldErrors.medicareIrn = "Enter the Medicare IRN as one digit from 1 to 9."
  }

  const hasMedicareExpiry = input.medicareExpiry.trim().length > 0
  const medicareExpiry = hasMedicareExpiry ? normalizeMedicareExpiry(input.medicareExpiry) : null
  if (hasMedicareExpiry) {
    if (!medicareExpiry) {
      fieldErrors.medicareExpiry = "Enter a valid Medicare expiry month."
    }
  }
  if (validMedicare && medicareExpiry) {
    const expiryResult = validateMedicareExpiry(medicareExpiry)
    if (!expiryResult.valid) {
      fieldErrors.medicareExpiry = expiryResult.error || "Enter a current Medicare expiry month."
    }
  }

  const state = input.state.trim().toUpperCase()
  const addressResult = validateAustralianAddress({
    addressLine1: input.addressLine1,
    suburb: input.suburb,
    state,
    postcode: input.postcode,
  })

  if (addressResult.errors.addressLine1) fieldErrors.addressLine1 = addressResult.errors.addressLine1
  if (addressResult.errors.suburb) fieldErrors.suburb = addressResult.errors.suburb
  if (addressResult.errors.state || !AUSTRALIAN_STATES.has(state as AustralianState)) {
    fieldErrors.state = addressResult.errors.state || "Select a valid Australian state."
  }
  if (addressResult.errors.postcode || addressResult.errors.postcodeStateMismatch) {
    fieldErrors.postcode = addressResult.errors.postcode || addressResult.errors.postcodeStateMismatch
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      valid: false,
      updates: {},
      fieldErrors,
    }
  }

  return {
    valid: true,
    fieldErrors: {},
    updates: {
      date_of_birth: dateOfBirth,
      sex,
      phone: phoneResult.e164,
      ...(validMedicare ? {
        medicare_number: medicareNumber,
        medicare_irn: Number.parseInt(medicareIrn, 10),
        ...(medicareExpiry ? { medicare_expiry: medicareExpiry } : {}),
      } : {
        medicare_number: null,
        medicare_irn: null,
        medicare_expiry: null,
      }),
      ...(ihiNumber ? { ihi_number: ihiNumber } : {}),
      address_line1: input.addressLine1.trim(),
      suburb: input.suburb.trim(),
      state: state as AustralianState,
      postcode: input.postcode.trim(),
    },
  }
}
