import {
  buildPrescribingIdentityProfileUpdates,
  type PrescribingIdentityFieldErrors,
  type PrescribingIdentityFormValues,
  type PrescribingIdentityProfileUpdates,
} from "@/lib/doctor/prescribing-identity-update"

export interface DoctorPatientCreateInput extends PrescribingIdentityFormValues {
  fullName: string
  email: string
}

export type DoctorPatientCreateFieldErrors = PrescribingIdentityFieldErrors & {
  fullName?: string
  email?: string
}

export interface ValidDoctorPatientCreateInput {
  fullName: string
  firstName: string
  lastName: string
  email: string
  profileUpdates: PrescribingIdentityProfileUpdates
}

export interface DoctorPatientCreateValidationResult {
  valid: boolean
  fieldErrors: DoctorPatientCreateFieldErrors
  value?: ValidDoctorPatientCreateInput
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function splitPatientName(fullName: string): { firstName: string; lastName: string } | null {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return null

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  }
}

export function validateDoctorPatientCreateInput(
  input: DoctorPatientCreateInput,
): DoctorPatientCreateValidationResult {
  const fieldErrors: DoctorPatientCreateFieldErrors = {}

  const fullName = input.fullName.trim().replace(/\s+/g, " ")
  const name = splitPatientName(fullName)
  if (!name) {
    fieldErrors.fullName = "Enter the patient's first and last name."
  }

  const email = normalizeEmail(input.email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Enter a valid patient email address."
  }

  const prescribingResult = buildPrescribingIdentityProfileUpdates(input)
  Object.assign(fieldErrors, prescribingResult.fieldErrors)

  if (!name || !prescribingResult.valid || Object.keys(fieldErrors).length > 0) {
    return {
      valid: false,
      fieldErrors,
    }
  }

  return {
    valid: true,
    fieldErrors: {},
    value: {
      fullName,
      firstName: name.firstName,
      lastName: name.lastName,
      email,
      profileUpdates: prescribingResult.updates,
    },
  }
}
