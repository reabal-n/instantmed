/**
 * Google Places API Client for Australian Address Autocomplete
 * Calls our own API routes (/api/places/*) which proxy to Google,
 * avoiding CORS issues with the Google REST API from the browser.
 */

export interface PlaceSuggestion {
  /** Human-readable address string */
  description: string
  /** Google Place ID for detail lookup */
  place_id: string
  /** Main text (street address) */
  main_text: string
  /** Secondary text (suburb, state) */
  secondary_text: string
}

export interface ParsedAddress {
  addressLine1: string
  addressLine2: string | null
  suburb: string
  state: string
  postcode: string
  fullAddress: string
  placeId?: string
  coordinates?: {
    lat: number
    lng: number
  }
}

/**
 * Search for Australian addresses as the user types.
 * Calls /api/places/autocomplete which proxies to Google Places.
 */
export async function searchAddresses(
  query: string,
  options?: { maxResults?: number; sessionToken?: string }
): Promise<PlaceSuggestion[]> {
  if (!query || query.length < 3) {
    return []
  }

  const params = new URLSearchParams({ input: query })

  if (options?.sessionToken) {
    params.append("sessiontoken", options.sessionToken)
  }

  try {
    const response = await fetch(`/api/places/autocomplete?${params}`)

    if (!response.ok) {
      return []
    }

    const data = await response.json()

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      if (process.env.NODE_ENV === "development") {
        console.warn("[GooglePlaces] API error:", data.status, data.error_message)
      }
      return []
    }

    return (data.predictions || []).slice(0, options?.maxResults ?? 8).map(
      (p: {
        description: string
        place_id: string
        structured_formatting: { main_text: string; secondary_text: string }
      }) => ({
        description: p.description,
        place_id: p.place_id,
        main_text: p.structured_formatting?.main_text || p.description,
        secondary_text: p.structured_formatting?.secondary_text || "",
      })
    )
  } catch {
    return []
  }
}

/**
 * Get full address details after user selects a suggestion.
 * Calls /api/places/details which proxies to Google Place Details.
 */
export async function getPlaceDetails(
  placeId: string,
  sessionToken?: string
): Promise<ParsedAddress | null> {
  if (!placeId) {
    return null
  }

  const params = new URLSearchParams({ place_id: placeId })

  if (sessionToken) {
    params.append("sessiontoken", sessionToken)
  }

  try {
    const response = await fetch(`/api/places/details?${params}`)

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    if (data.status !== "OK" || !data.result) {
      return null
    }

    return parseGooglePlaceResult(data.result)
  } catch {
    return null
  }
}

/**
 * Parse Google Place details into our standardized address format
 */
function parseGooglePlaceResult(result: {
  address_components?: Array<{
    long_name: string
    short_name: string
    types: string[]
  }>
  formatted_address?: string
  geometry?: {
    location: { lat: number; lng: number }
  }
  place_id?: string
}): ParsedAddress {
  const components = result.address_components || []

  const get = (type: string, useShort = false): string => {
    const comp = components.find((c) => c.types.includes(type))
    return comp ? (useShort ? comp.short_name : comp.long_name) : ""
  }

  const streetNumber = get("street_number")
  const streetName = get("route")
  const subpremise = get("subpremise") // unit/apt number
  const suburb =
    get("locality") ||
    get("sublocality_level_1") ||
    get("administrative_area_level_2")
  const state = get("administrative_area_level_1", true) // Short: NSW, VIC, etc.
  const postcode = get("postal_code")

  // Build address line 1
  let addressLine1 = ""
  if (subpremise) {
    addressLine1 = `${subpremise}/${streetNumber} ${streetName}`.trim()
  } else {
    addressLine1 = `${streetNumber} ${streetName}`.trim()
  }

  return {
    addressLine1,
    addressLine2: null,
    suburb,
    state,
    postcode,
    fullAddress: result.formatted_address || addressLine1,
    placeId: result.place_id,
    coordinates: result.geometry?.location
      ? {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        }
      : undefined,
  }
}

/**
 * Generate a session token for Google Places billing optimization.
 * A session groups autocomplete + detail requests into one billing event.
 */
export function generateSessionToken(): string {
  return crypto.randomUUID()
}
