export interface ExistingGuestProfileIdentity {
  email?: string | null
  email_verified?: boolean | null
  full_name?: string | null
  date_of_birth?: string | null
  phone?: string | null
}

export interface GuestCheckoutIdentity {
  guestEmail: string
  guestName?: string | null
  guestDateOfBirth?: string | null
  guestPhone?: string | null
}

function present(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function normalizeGuestEmail(value: string | null | undefined): string {
  return present(value)?.toLowerCase() ?? ""
}

export function normalizeGuestName(value: string | null | undefined): string {
  return present(value)?.toLowerCase().replace(/\s+/g, " ") ?? ""
}

export function normalizeGuestPhone(value: string | null | undefined): string {
  let digits = present(value)?.replace(/\D/g, "") ?? ""
  if (digits.startsWith("0061")) {
    digits = digits.slice(2)
  }
  if (digits.startsWith("61") && digits.length === 11) {
    return `0${digits.slice(2)}`
  }
  return digits
}

export function shouldReuseGuestProfileForCheckout(
  existingProfile: ExistingGuestProfileIdentity,
  input: GuestCheckoutIdentity,
): boolean {
  if (normalizeGuestEmail(existingProfile.email) !== normalizeGuestEmail(input.guestEmail)) {
    return false
  }

  if (existingProfile.email_verified) {
    return true
  }

  const existingPhone = normalizeGuestPhone(existingProfile.phone)
  const inputPhone = normalizeGuestPhone(input.guestPhone)
  const existingName = normalizeGuestName(existingProfile.full_name)
  const inputName = normalizeGuestName(input.guestName)
  const existingDob = present(existingProfile.date_of_birth)
  const inputDob = present(input.guestDateOfBirth)

  const phoneMatches = Boolean(existingPhone && inputPhone && existingPhone === inputPhone)
  const nameMatches = Boolean(existingName && inputName && existingName === inputName)
  const dobMatches = Boolean(existingDob && inputDob && existingDob === inputDob)

  return (phoneMatches && (nameMatches || dobMatches)) || (nameMatches && dobMatches)
}
