type AddressProvider = "addressfinder" | "google" | "manual" | "unknown"

export interface AddressReviewSummary {
  line: string
  locality: string
  compact: string
  isVerified: boolean
  statusLabel: "Verified" | "Manual"
  providerLabel: "Addressfinder" | "Google" | "Manual" | "Unknown"
}

function getString(answers: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = answers[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

function getBoolean(answers: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = answers[key]
    if (typeof value === "boolean") return value
  }
  return undefined
}

function normalizeAddressFragment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function deriveAddressProvider(placeId: string | undefined): AddressProvider | undefined {
  if (!placeId) return undefined
  if (placeId.startsWith("af:")) return "addressfinder"
  if (placeId.startsWith("google:")) return "google"
  return "google"
}

export function getAddressProviderLabel(provider: AddressProvider | undefined): AddressReviewSummary["providerLabel"] {
  if (provider === "addressfinder") return "Addressfinder"
  if (provider === "google") return "Google"
  if (provider === "manual") return "Manual"
  return "Unknown"
}

/**
 * Provider-neutral status for patient/doctor surfaces. Patients and doctors do
 * not care which search provider matched — only whether the address was
 * verified against one or typed by hand. Keeps "Google"/"Addressfinder" out of
 * user-visible copy.
 */
export function getAddressStatusDisplay(isVerified: boolean): string {
  return isVerified ? "Verified address" : "Manually entered"
}

export function buildAddressAuditMetadata(answers: Record<string, unknown>): Record<string, unknown> {
  const addressLine1 = getString(answers, ["address_line1", "addressLine1", "address_line_1", "street_address"])
  const isVerified = getBoolean(answers, ["address_verified", "addressVerified"])
  const providerPlaceId = getString(answers, [
    "address_provider_place_id",
    "addressProviderPlaceId",
    "providerPlaceId",
    "pxid",
  ])
  const provider = deriveAddressProvider(providerPlaceId) || (addressLine1 ? "manual" : undefined)
  const metadata: Record<string, unknown> = {}

  if (typeof isVerified === "boolean") {
    metadata.address_verified = isVerified
  } else if (providerPlaceId) {
    metadata.address_verified = true
  } else if (addressLine1) {
    metadata.address_verified = false
  }

  if (providerPlaceId) {
    metadata.address_provider_place_id = providerPlaceId
  }

  if (provider) {
    metadata.address_provider = provider
  }

  return metadata
}

export function getAddressReviewSummary(answers: Record<string, unknown>): AddressReviewSummary | null {
  const line = getString(answers, ["address_line1", "addressLine1", "address_line_1", "street_address"])
  if (!line) return null

  const suburb = getString(answers, ["suburb"])
  const state = getString(answers, ["state"])
  const postcode = getString(answers, ["postcode"])
  const providerPlaceId = getString(answers, [
    "address_provider_place_id",
    "addressProviderPlaceId",
    "providerPlaceId",
    "pxid",
  ])
  const explicitVerified = getBoolean(answers, ["address_verified", "addressVerified"])
  const provider = deriveAddressProvider(providerPlaceId) || "manual"
  const isVerified = explicitVerified === true && provider !== "manual"
  const locality = [suburb, state, postcode].filter(Boolean).join(" ")
  const normalizedLocality = normalizeAddressFragment(locality)
  const lineAlreadyIncludesLocality = Boolean(
    normalizedLocality && normalizeAddressFragment(line).endsWith(normalizedLocality),
  )
  const compact = lineAlreadyIncludesLocality
    ? line
    : [line, locality].filter(Boolean).join(", ")

  return {
    line,
    locality,
    compact,
    isVerified,
    statusLabel: isVerified ? "Verified" : "Manual",
    providerLabel: getAddressProviderLabel(provider),
  }
}
