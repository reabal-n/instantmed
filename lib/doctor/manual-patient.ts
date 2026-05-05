import {
  buildPrescribingIdentityProfileUpdates,
  type PrescribingIdentityFieldErrors,
  type PrescribingIdentityFormValues,
  type PrescribingIdentityProfileUpdates,
} from "@/lib/doctor/prescribing-identity-update"
import type { Profile } from "@/types/db"

export interface ManualPatientFormValues extends PrescribingIdentityFormValues {
  fullName: string
  email: string
}

export type ManualPatientFieldErrors = PrescribingIdentityFieldErrors & Partial<
  Record<"fullName" | "email", string>
>

export type ManualPatientProfileCreate = PrescribingIdentityProfileUpdates & {
  auth_user_id: null
  role: "patient"
  full_name: string
  first_name: string | null
  last_name: string | null
  email: string
  email_verified: false
  onboarding_completed: true
}

export interface ManualPatientProfileCreateResult {
  valid: boolean
  profile: ManualPatientProfileCreate | null
  fieldErrors: ManualPatientFieldErrors
}

export interface ManualPatientDuplicateLookup {
  normalizedEmail: string
  normalizedPhone: string
  normalizedNameDob: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeFullName(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

function splitName(fullName: string): { firstName: string | null; lastName: string | null } {
  const parts = fullName.split(" ").filter(Boolean)
  return {
    firstName: parts[0] ?? null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  }
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function normalizePhoneForLookup(value: string): string {
  let digits = value.trim().replace(/\D/g, "")
  if (digits.startsWith("0061")) {
    digits = digits.slice(2)
  }
  if (digits.startsWith("61") && digits.length === 11) {
    digits = `0${digits.slice(2)}`
  }
  return digits
}

export function buildManualPatientDuplicateLookup(
  input: ManualPatientFormValues,
): ManualPatientDuplicateLookup {
  const fullName = normalizeFullName(input.fullName)
  return {
    normalizedEmail: normalizeEmail(input.email),
    normalizedPhone: normalizePhoneForLookup(input.phone),
    normalizedNameDob: `${fullName.toLowerCase()}|${input.dateOfBirth.trim()}`,
  }
}

export function buildManualPatientProfileCreate(
  input: ManualPatientFormValues,
): ManualPatientProfileCreateResult {
  const fieldErrors: ManualPatientFieldErrors = {}
  const fullName = normalizeFullName(input.fullName)
  const email = normalizeEmail(input.email)

  if (!fullName) {
    fieldErrors.fullName = "Enter the patient's legal name."
  }

  if (!EMAIL_RE.test(email)) {
    fieldErrors.email = "Enter a valid email address."
  }

  const prescribing = buildPrescribingIdentityProfileUpdates(input)
  Object.assign(fieldErrors, prescribing.fieldErrors)

  if (Object.keys(fieldErrors).length > 0 || !prescribing.valid) {
    return {
      valid: false,
      profile: null,
      fieldErrors,
    }
  }

  const { firstName, lastName } = splitName(fullName)

  return {
    valid: true,
    fieldErrors: {},
    profile: {
      auth_user_id: null,
      role: "patient",
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      email,
      email_verified: false,
      onboarding_completed: true,
      ...(prescribing.updates as Pick<
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
      >),
    },
  }
}
