import type { AustralianState, Profile } from "@/types/db"

const AUSTRALIAN_STATES: AustralianState[] = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"]
const SEX_VALUES: NonNullable<Profile["sex"]>[] = ["M", "F", "N", "I"]

export type PrescribingProfileUpdates = Partial<Pick<
  Profile,
  "medicare_number" | "medicare_irn" | "medicare_expiry" | "address_line1" | "suburb" | "state" | "postcode" | "sex"
>>

export type CheckoutIdentityProfileUpdates = Partial<Pick<
  Profile,
  "full_name" | "date_of_birth" | "phone"
>>

export interface CheckoutIdentityInput {
  fullName?: string
  dateOfBirth?: string
  phone?: string
}

function firstStringAnswer(
  answers: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = answers[key]
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed) return trimmed
    }
  }
  return null
}

function firstScalarAnswer(
  answers: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = answers[key]
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed) return trimmed
    }
  }
  return null
}

function normalizeDigits(value: string | null): string | null {
  const digits = value?.replace(/\D/g, "") ?? ""
  return digits || null
}

function normalizeIrn(value: string | null): number | null {
  const digits = normalizeDigits(value)
  if (!digits || !/^[1-9]$/.test(digits)) return null
  return Number.parseInt(digits, 10)
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

function normalizeState(value: string | null): AustralianState | null {
  const upper = value?.toUpperCase()
  return AUSTRALIAN_STATES.includes(upper as AustralianState)
    ? upper as AustralianState
    : null
}

function normalizeSex(value: string | null): NonNullable<Profile["sex"]> | null {
  const upper = value?.toUpperCase()
  return SEX_VALUES.includes(upper as NonNullable<Profile["sex"]>)
    ? upper as NonNullable<Profile["sex"]>
    : null
}

export function buildPrescribingProfileUpdates(
  answers: Record<string, unknown>,
): PrescribingProfileUpdates {
  const updates: PrescribingProfileUpdates = {}
  const medicare = normalizeDigits(firstStringAnswer(answers, ["medicare_number", "medicareNumber"]))
  const medicareIrn = normalizeIrn(firstScalarAnswer(answers, ["medicare_irn", "medicareIrn"]))
  const medicareExpiry = normalizeMedicareExpiry(firstScalarAnswer(answers, ["medicare_expiry", "medicareExpiry"]))
  const addressLine1 = firstStringAnswer(answers, ["address_line1", "addressLine1", "address_line_1", "street_address"])
  const suburb = firstStringAnswer(answers, ["suburb"])
  const state = normalizeState(firstStringAnswer(answers, ["state"]))
  const postcode = firstStringAnswer(answers, ["postcode"])
  const sex = normalizeSex(firstStringAnswer(answers, ["sex", "gender"]))

  if (medicare) updates.medicare_number = medicare
  if (medicareIrn) updates.medicare_irn = medicareIrn
  if (medicareExpiry) updates.medicare_expiry = medicareExpiry
  if (addressLine1) updates.address_line1 = addressLine1
  if (suburb) updates.suburb = suburb
  if (state) updates.state = state
  if (postcode) updates.postcode = postcode
  if (sex) updates.sex = sex

  return updates
}

export function buildCheckoutIdentityProfileUpdates(
  profile: Pick<Profile, "full_name" | "date_of_birth" | "phone">,
  identity: CheckoutIdentityInput,
): CheckoutIdentityProfileUpdates {
  const updates: CheckoutIdentityProfileUpdates = {}
  const fullName = identity.fullName?.trim()
  const dateOfBirth = identity.dateOfBirth?.trim()
  const phone = identity.phone?.trim()

  if (fullName && !profile.full_name?.trim()) updates.full_name = fullName
  if (dateOfBirth && !profile.date_of_birth) updates.date_of_birth = dateOfBirth
  if (phone && !profile.phone?.trim()) updates.phone = phone

  return updates
}
