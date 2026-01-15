/**
 * AddressFinder Server-Side Verification
 * 
 * Uses AddressFinder's Address Verification API to validate addresses
 * against GNAF (Geocoded National Address File) on the server.
 * 
 * This provides an additional layer of verification before storing addresses.
 */

export interface VerifiedAddress {
  verified: boolean
  confidence: "high" | "medium" | "low" | "none"
  gnafId?: string
  canonical: {
    addressLine1: string
    addressLine2?: string | null
    suburb: string
    state: string
    postcode: string
    fullAddress: string
  }
  coordinates?: {
    latitude: number
    longitude: number
  }
  warnings?: string[]
}

export interface AddressVerificationResult {
  success: boolean
  verified: boolean
  address?: VerifiedAddress
  error?: string
}

interface AddressFinderVerifyResponse {
  matched: boolean
  success: boolean
  address?: {
    full_address: string
    address_line_1: string
    address_line_2: string | null
    locality_name: string
    state_territory: string
    postcode: string
    gnaf_id?: string
    longitude?: number
    latitude?: number
  }
  canonical?: string
}

/**
 * Verify an address using AddressFinder's Verification API
 * 
 * This should be called server-side before storing addresses to ensure
 * they are valid GNAF-verified Australian addresses.
 */
export async function verifyAddress(address: {
  addressLine1: string
  addressLine2?: string | null
  suburb: string
  state: string
  postcode: string
}): Promise<AddressVerificationResult> {
  const apiKey = process.env.NEXT_PUBLIC_ADDRESSFINDER_KEY
  const apiSecret = process.env.ADDRESSFINDER_SECRET

  if (!apiKey) {
    return {
      success: false,
      verified: false,
      error: "AddressFinder API key not configured",
    }
  }

  // Construct the full address string for verification
  const fullAddress = [
    address.addressLine1,
    address.addressLine2,
    address.suburb,
    address.state,
    address.postcode,
  ]
    .filter(Boolean)
    .join(", ")

  const params = new URLSearchParams({
    key: apiKey,
    q: fullAddress,
    format: "json",
    gnaf: "1", // Request GNAF ID
  })

  // Add secret for server-side calls
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }
  if (apiSecret) {
    headers["Authorization"] = apiSecret
  }

  try {
    const response = await fetch(
      `https://api.addressfinder.io/api/au/address/verification/?${params}`,
      { headers }
    )

    if (!response.ok) {
      return {
        success: false,
        verified: false,
        error: `Address verification failed: ${response.status}`,
      }
    }

    const data: AddressFinderVerifyResponse = await response.json()

    if (!data.matched || !data.address) {
      return {
        success: true,
        verified: false,
        error: "Address could not be verified. Please check and try again.",
      }
    }

    // Determine confidence based on response
    const confidence = determineConfidence(address, data.address)

    return {
      success: true,
      verified: true,
      address: {
        verified: true,
        confidence,
        gnafId: data.address.gnaf_id,
        canonical: {
          addressLine1: data.address.address_line_1,
          addressLine2: data.address.address_line_2,
          suburb: data.address.locality_name,
          state: data.address.state_territory,
          postcode: data.address.postcode,
          fullAddress: data.address.full_address,
        },
        coordinates:
          data.address.latitude && data.address.longitude
            ? {
                latitude: data.address.latitude,
                longitude: data.address.longitude,
              }
            : undefined,
      },
    }
  } catch {
    return {
      success: false,
      verified: false,
      error: "Address verification service unavailable",
    }
  }
}

/**
 * Determine confidence level based on how closely the input matches the verified address
 */
function determineConfidence(
  input: { addressLine1: string; suburb: string; state: string; postcode: string },
  verified: { address_line_1: string; locality_name: string; state_territory: string; postcode: string }
): "high" | "medium" | "low" {
  let score = 0

  // Exact postcode match
  if (input.postcode === verified.postcode) score += 3

  // State match
  if (input.state.toUpperCase() === verified.state_territory.toUpperCase()) score += 2

  // Suburb similarity
  if (input.suburb.toLowerCase() === verified.locality_name.toLowerCase()) {
    score += 3
  } else if (verified.locality_name.toLowerCase().includes(input.suburb.toLowerCase())) {
    score += 1
  }

  // Address line similarity (basic)
  const inputNormalized = input.addressLine1.toLowerCase().replace(/[^a-z0-9]/g, "")
  const verifiedNormalized = verified.address_line_1.toLowerCase().replace(/[^a-z0-9]/g, "")
  if (inputNormalized === verifiedNormalized) {
    score += 3
  } else if (verifiedNormalized.includes(inputNormalized) || inputNormalized.includes(verifiedNormalized)) {
    score += 1
  }

  if (score >= 9) return "high"
  if (score >= 5) return "medium"
  return "low"
}

/**
 * Validate address without full verification (lighter check)
 * Use this for real-time validation before submit
 */
export async function quickValidateAddress(address: {
  addressLine1: string
  suburb: string
  state: string
  postcode: string
}): Promise<{ valid: boolean; suggestion?: string }> {
  // Basic structural validation
  if (!address.addressLine1 || address.addressLine1.length < 5) {
    return { valid: false, suggestion: "Please enter a complete street address" }
  }

  if (!address.suburb || address.suburb.length < 2) {
    return { valid: false, suggestion: "Please enter a valid suburb" }
  }

  if (!/^\d{4}$/.test(address.postcode)) {
    return { valid: false, suggestion: "Please enter a valid 4-digit postcode" }
  }

  // Postcode-state validation (imported from australian-address)
  const { validatePostcodeState } = await import("@/lib/validation/australian-address")
  const postcodeResult = validatePostcodeState(
    address.postcode,
    address.state as "ACT" | "NSW" | "NT" | "QLD" | "SA" | "TAS" | "VIC" | "WA"
  )

  if (!postcodeResult.valid) {
    return { valid: false, suggestion: postcodeResult.error }
  }

  return { valid: true }
}
