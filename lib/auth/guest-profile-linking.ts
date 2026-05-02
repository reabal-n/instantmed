export interface AuthLinkGuestProfile {
  id: string
  email: string | null
  auth_user_id: string | null
  full_name?: string | null
  has_paid_intake?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

interface GuestProfileAuthLinkUpdateInput {
  profile: Pick<AuthLinkGuestProfile, "auth_user_id" | "email" | "full_name" | "id">
  userId: string
  primaryEmail: string
  userMetadata?: Record<string, unknown> | null
  linkedAt?: string
}

function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ""
}

function timestamp(value: string | null | undefined): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function metadataString(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function isPlaceholderName(name: string | null | undefined, email: string): boolean {
  const trimmed = name?.trim()
  if (!trimmed) return true
  const localPart = normalizeEmail(email).split("@")[0]
  return Boolean(localPart && trimmed.toLowerCase() === localPart)
}

export function selectGuestProfileForAuthLink(
  candidates: AuthLinkGuestProfile[],
  primaryEmail: string,
): AuthLinkGuestProfile | null {
  const normalizedEmail = normalizeEmail(primaryEmail)
  const linkable = candidates.filter((candidate) => (
    normalizeEmail(candidate.email) === normalizedEmail &&
    candidate.auth_user_id === null
  ))

  if (linkable.length === 0) {
    return null
  }

  return [...linkable].sort((a, b) => {
    const paidDelta = Number(Boolean(b.has_paid_intake)) - Number(Boolean(a.has_paid_intake))
    if (paidDelta !== 0) return paidDelta

    const updatedDelta = timestamp(b.updated_at) - timestamp(a.updated_at)
    if (updatedDelta !== 0) return updatedDelta

    const createdDelta = timestamp(b.created_at) - timestamp(a.created_at)
    if (createdDelta !== 0) return createdDelta

    return a.id.localeCompare(b.id)
  })[0]
}

export function buildGuestProfileAuthLinkUpdate({
  profile,
  userId,
  primaryEmail,
  userMetadata,
  linkedAt = new Date().toISOString(),
}: GuestProfileAuthLinkUpdateInput): Record<string, unknown> {
  const fullNameFromAuth = metadataString(userMetadata, "full_name")
    || metadataString(userMetadata, "name")
    || normalizeEmail(primaryEmail).split("@")[0]
  const firstName = metadataString(userMetadata, "first_name")
  const lastName = metadataString(userMetadata, "last_name")
  const avatarUrl = metadataString(userMetadata, "avatar_url")

  return {
    auth_user_id: userId,
    email: normalizeEmail(primaryEmail),
    full_name: isPlaceholderName(profile.full_name, primaryEmail)
      ? fullNameFromAuth
      : profile.full_name,
    first_name: firstName,
    last_name: lastName,
    avatar_url: avatarUrl,
    email_verified: true,
    email_verified_at: linkedAt,
  }
}
