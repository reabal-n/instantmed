import {
  buildPrescribingIdentityProfileUpdates,
  type PrescribingIdentityFieldErrors,
  type PrescribingIdentityFormValues,
  type PrescribingIdentityProfileUpdates,
} from "@/lib/doctor/prescribing-identity-update"

export interface DoctorPatientCreateInput extends PrescribingIdentityFormValues {
  firstName: string
  lastName: string
  email: string
}

export type DoctorPatientCreateFieldErrors = PrescribingIdentityFieldErrors & {
  firstName?: string
  lastName?: string
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

export function validateDoctorPatientCreateInput(
  input: DoctorPatientCreateInput,
): DoctorPatientCreateValidationResult {
  const fieldErrors: DoctorPatientCreateFieldErrors = {}

  const firstName = input.firstName.trim().replace(/\s+/g, " ")
  const lastName = input.lastName.trim().replace(/\s+/g, " ")
  if (!firstName) {
    fieldErrors.firstName = "Enter the patient's first name."
  }
  if (!lastName) {
    fieldErrors.lastName = "Enter the patient's last name."
  }
  const fullName = [firstName, lastName].filter(Boolean).join(" ")

  const email = normalizeEmail(input.email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Enter a valid patient email address."
  }

  const prescribingResult = buildPrescribingIdentityProfileUpdates(input)
  Object.assign(fieldErrors, prescribingResult.fieldErrors)

  if (Object.keys(fieldErrors).length > 0 || !prescribingResult.valid) {
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
      firstName,
      lastName,
      email,
      profileUpdates: prescribingResult.updates,
    },
  }
}
