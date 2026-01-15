/**
 * AddressFinder API Client for Australian Address Autocomplete
 * Uses GNAF-verified addresses for accurate AU address data
 */

// Types for AddressFinder API responses
export interface AddressFinderSuggestion {
  /** Full formatted address for display */
  full_address: string
  /** Unique identifier for metadata lookup */
  pxid: string
  /** Match score (higher = better match) */
  score?: number
}

export interface AddressFinderAutocompleteResponse {
  completions: AddressFinderSuggestion[]
  paid: boolean
}

export interface AddressFinderMetadata {
  // Core address components
  address_line_1: string
  address_line_2: string | null
  locality_name: string // suburb
  state_territory: string // NSW, VIC, etc.
  postcode: string
  full_address: string
  
  // Additional GNAF data
  gnaf_id?: string
  meshblock?: string
  sa1?: string
  sa2?: string
  longitude?: number
  latitude?: number
  
  // Building/unit details
  building_name?: string
  unit_type?: string
  unit_number?: string
  street_number?: string
  street_name?: string
  street_type?: string
}

export interface AddressFinderMetadataResponse extends AddressFinderMetadata {
  paid: boolean
}

export interface ParsedAddress {
  addressLine1: string
  addressLine2: string | null
  suburb: string
  state: string
  postcode: string
  fullAddress: string
  gnafId?: string
  coordinates?: {
    lat: number
    lng: number
  }
}

const API_BASE = 'https://api.addressfinder.io/api/au/address'

/**
 * Search for Australian addresses as the user types
 */
export async function searchAddresses(
  query: string,
  options?: {
    maxResults?: number
    state?: string
  }
): Promise<AddressFinderSuggestion[]> {
  const apiKey = process.env.NEXT_PUBLIC_ADDRESSFINDER_KEY
  
  if (!apiKey) {
    return []
  }
  
  if (!query || query.length < 3) {
    return []
  }
  
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    format: 'json',
    max: String(options?.maxResults ?? 8),
  })
  
  // Optional state filter
  if (options?.state) {
    params.append('state', options.state)
  }
  
  try {
    const response = await fetch(`${API_BASE}/autocomplete/?${params}`)
    
    if (!response.ok) {
      return []
    }
    
    const data: AddressFinderAutocompleteResponse = await response.json()
    return data.completions || []
  } catch {
    return []
  }
}

/**
 * Get full address metadata after user selects a suggestion
 */
export async function getAddressMetadata(pxid: string): Promise<ParsedAddress | null> {
  const apiKey = process.env.NEXT_PUBLIC_ADDRESSFINDER_KEY
  
  if (!apiKey || !pxid) {
    return null
  }
  
  const params = new URLSearchParams({
    key: apiKey,
    pxid,
    format: 'json',
  })
  
  try {
    const response = await fetch(`${API_BASE}/metadata/?${params}`)
    
    if (!response.ok) {
      return null
    }
    
    const data: AddressFinderMetadataResponse = await response.json()
    
    return parseAddressResponse(data)
  } catch {
    return null
  }
}

/**
 * Parse API response into standardized address format
 */
function parseAddressResponse(data: AddressFinderMetadataResponse): ParsedAddress {
  return {
    addressLine1: data.address_line_1 || '',
    addressLine2: data.address_line_2 || null,
    suburb: data.locality_name || '',
    state: data.state_territory || '',
    postcode: data.postcode || '',
    fullAddress: data.full_address || '',
    gnafId: data.gnaf_id,
    coordinates: data.latitude && data.longitude
      ? { lat: data.latitude, lng: data.longitude }
      : undefined,
  }
}
