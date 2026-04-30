import { validateAustralianAddress } from "@/lib/validation/australian-address"
import { validateAustralianPhone } from "@/lib/validation/australian-phone"
import { validateMedicareExpiry, validateMedicareNumber } from "@/lib/validation/medicare"
import type { AustralianState, Profile } from "@/types/db"

export interface PrescribingIdentityFormValues {
  dateOfBirth: string
  sex: string
  phone: string
  medicareNumber: string
  medicareIrn: string
  medicareExpiry: string
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
    const trimmed = asTrimmedString(value)
    if (trimmed) return trimmed
  }
  return ""
}

function presentPatientValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  return String(value).trim()
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
    address_line1?: string | null
    suburb?: string | null
    state?: string | null
    postcode?: string | null
  },
  answers?: Record<string, unknown> | null,
): PrescribingIdentityFormValues {
  return {
    dateOfBirth: presentPatientValue(patient.date_of_birth) || presentAnswer(answers, ["date_of_birth", "dateOfBirth", "dob"]),
    sex: presentPatientValue(patient.sex) || presentAnswer(answers, ["sex", "gender"]),
    phone: presentPatientValue(patient.phone) || presentAnswer(answers, ["phone", "mobile", "mobilePhone"]),
    medicareNumber: presentPatientValue(patient.medicare_number) || presentAnswer(answers, ["medicare_number", "medicareNumber"]),
    medicareIrn: presentPatientValue(patient.medicare_irn) || presentAnswer(answers, ["medicare_irn", "medicareIrn"]),
    medicareExpiry: presentPatientValue(patient.medicare_expiry) || presentAnswer(answers, ["medicare_expiry", "medicareExpiry"]),
    addressLine1: presentPatientValue(patient.address_line1) || presentAnswer(answers, ["address_line1", "addressLine1", "address_line_1", "street_address"]),
    suburb: presentPatientValue(patient.suburb) || presentAnswer(answers, ["suburb"]),
    state: presentPatientValue(patient.state) || presentAnswer(answers, ["state"]),
    postcode: presentPatientValue(patient.postcode) || presentAnswer(answers, ["postcode"]),
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
  const medicareResult = validateMedicareNumber(medicareNumber)
  if (!medicareResult.valid) {
    fieldErrors.medicareNumber = medicareResult.error || "Enter a valid Medicare number."
  }

  const medicareIrn = input.medicareIrn.trim()
  if (!/^[1-9]$/.test(medicareIrn)) {
    fieldErrors.medicareIrn = "Enter the Medicare IRN as one digit from 1 to 9."
  }

  const medicareExpiry = normalizeMedicareExpiry(input.medicareExpiry)
  if (!medicareExpiry) {
    fieldErrors.medicareExpiry = "Enter a valid Medicare expiry month."
  } else {
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
      medicare_number: medicareNumber,
      medicare_irn: Number.parseInt(medicareIrn, 10),
      medicare_expiry: medicareExpiry!,
      address_line1: input.addressLine1.trim(),
      suburb: input.suburb.trim(),
      state: state as AustralianState,
      postcode: input.postcode.trim(),
    },
  }
}
