/**
 * Server-Side Address Verification
 *
 * Uses Google Geocoding API to validate Australian addresses.
 * Provides an additional layer of verification before storing addresses.
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

/**
 * Verify an address using Google Geocoding API
 *
 * Called server-side before storing addresses to ensure
 * they are valid Australian addresses.
 */
export async function verifyAddress(address: {
  addressLine1: string
  addressLine2?: string | null
  suburb: string
  state: string
  postcode: string
}): Promise<AddressVerificationResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY

  if (!apiKey) {
    // Gracefully degrade — accept the address as-is without verification
    return {
      success: true,
      verified: false,
      address: {
        verified: false,
        confidence: "none",
        canonical: {
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          suburb: address.suburb,
          state: address.state,
          postcode: address.postcode,
          fullAddress: [
            address.addressLine1,
            address.suburb,
            address.state,
            address.postcode,
          ]
            .filter(Boolean)
            .join(", "),
        },
      },
    }
  }

  // Construct the full address string for geocoding
  const fullAddress = [
    address.addressLine1,
    address.addressLine2,
    address.suburb,
    address.state,
    address.postcode,
    "Australia",
  ]
    .filter(Boolean)
    .join(", ")

  const params = new URLSearchParams({
    address: fullAddress,
    components: "country:AU",
    key: apiKey,
  })

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`
    )

    if (!response.ok) {
      return {
        success: false,
        verified: false,
        error: `Address verification failed: ${response.status}`,
      }
    }

    const data = await response.json()

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      // Can't verify, but don't block — accept as-is
      return {
        success: true,
        verified: false,
        address: {
          verified: false,
          confidence: "none",
          canonical: {
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            suburb: address.suburb,
            state: address.state,
            postcode: address.postcode,
            fullAddress,
          },
        },
      }
    }

    const result = data.results[0]
    const components = result.address_components || []

    const get = (type: string, useShort = false): string => {
      const comp = components.find((c: { types: string[] }) =>
        c.types.includes(type)
      )
      return comp
        ? useShort
          ? comp.short_name
          : comp.long_name
        : ""
    }

    const streetNumber = get("street_number")
    const streetName = get("route")
    const verifiedSuburb = get("locality") || get("sublocality_level_1") || get("administrative_area_level_2")
    const verifiedState = get("administrative_area_level_1", true)
    const verifiedPostcode = get("postal_code")

    const canonicalAddress1 = `${streetNumber} ${streetName}`.trim()

    // Determine confidence
    const confidence = determineConfidence(address, {
      address_line_1: canonicalAddress1,
      locality_name: verifiedSuburb,
      state_territory: verifiedState,
      postcode: verifiedPostcode,
    })

    return {
      success: true,
      verified: true,
      address: {
        verified: true,
        confidence,
        canonical: {
          addressLine1: canonicalAddress1 || address.addressLine1,
          addressLine2: address.addressLine2,
          suburb: verifiedSuburb || address.suburb,
          state: verifiedState || address.state,
          postcode: verifiedPostcode || address.postcode,
          fullAddress: result.formatted_address || fullAddress,
        },
        coordinates:
          result.geometry?.location
            ? {
                latitude: result.geometry.location.lat,
                longitude: result.geometry.location.lng,
              }
            : undefined,
      },
    }
  } catch {
    // Gracefully degrade on error
    return {
      success: true,
      verified: false,
      address: {
        verified: false,
        confidence: "none",
        canonical: {
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          suburb: address.suburb,
          state: address.state,
          postcode: address.postcode,
          fullAddress,
        },
      },
    }
  }
}

/**
 * Determine confidence level based on how closely the input matches the verified address
 */
function determineConfidence(
  input: {
    addressLine1: string
    suburb: string
    state: string
    postcode: string
  },
  verified: {
    address_line_1: string
    locality_name: string
    state_territory: string
    postcode: string
  }
): "high" | "medium" | "low" {
  let score = 0

  if (input.postcode === verified.postcode) score += 3
  if (input.state.toUpperCase() === verified.state_territory.toUpperCase()) score += 2

  if (input.suburb.toLowerCase() === verified.locality_name.toLowerCase()) {
    score += 3
  } else if (verified.locality_name.toLowerCase().includes(input.suburb.toLowerCase())) {
    score += 1
  }

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
 */
export async function quickValidateAddress(address: {
  addressLine1: string
  suburb: string
  state: string
  postcode: string
}): Promise<{ valid: boolean; suggestion?: string }> {
  if (!address.addressLine1 || address.addressLine1.length < 5) {
    return { valid: false, suggestion: "Please enter a complete street address" }
  }

  if (!address.suburb || address.suburb.length < 2) {
    return { valid: false, suggestion: "Please enter a valid suburb" }
  }

  if (!/^\d{4}$/.test(address.postcode)) {
    return { valid: false, suggestion: "Please enter a valid 4-digit postcode" }
  }

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
