import type { ParsedAddress } from "./client"

const ADDRESSFINDER_PREFIX = "af:"

export interface AddressFinderCompletion {
  full_address?: string
  id?: string
  canonical_address_id?: string
}

export interface AddressFinderAutocompleteResponse {
  completions?: AddressFinderCompletion[]
  success?: boolean
}

export interface AddressFinderSuggestion {
  description: string
  place_id: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

export interface AddressFinderMetadataResponse {
  id?: string
  full_address?: string
  address_line_1?: string | null
  address_line_2?: string | null
  address_line_combined?: string | null
  locality_name?: string | null
  state_territory?: string | null
  postcode?: string | null
  latitude?: string | number | null
  longitude?: string | number | null
  success?: boolean
}

export function formatAddressFinderPlaceId(id: string): string {
  return `${ADDRESSFINDER_PREFIX}${id}`
}

export function isAddressFinderPlaceId(placeId: string): boolean {
  return placeId.startsWith(ADDRESSFINDER_PREFIX)
}

export function parseAddressFinderPlaceId(placeId: string): string {
  return isAddressFinderPlaceId(placeId)
    ? placeId.slice(ADDRESSFINDER_PREFIX.length)
    : placeId
}

function splitFullAddress(fullAddress: string): {
  mainText: string
  secondaryText: string
} {
  const parts = fullAddress.split(",").map((part) => part.trim()).filter(Boolean)
  if (parts.length <= 1) {
    return { mainText: fullAddress, secondaryText: "" }
  }

  return {
    mainText: parts.slice(0, -1).join(", "),
    secondaryText: parts[parts.length - 1],
  }
}

function parseCoordinate(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined
  const coordinate = typeof value === "number" ? value : Number.parseFloat(value)
  return Number.isFinite(coordinate) ? coordinate : undefined
}

export function mapAddressFinderAutocompleteResponse(
  data: AddressFinderAutocompleteResponse,
): AddressFinderSuggestion[] {
  return (data.completions ?? [])
    .map((completion) => {
      const id = completion.id || completion.canonical_address_id
      const fullAddress = completion.full_address?.trim()
      if (!id || !fullAddress) return null

      const { mainText, secondaryText } = splitFullAddress(fullAddress)
      return {
        description: fullAddress,
        place_id: formatAddressFinderPlaceId(id),
        structured_formatting: {
          main_text: mainText,
          secondary_text: secondaryText,
        },
      }
    })
    .filter((suggestion): suggestion is AddressFinderSuggestion => suggestion !== null)
}

export function mapAddressFinderMetadataToParsedAddress(
  data: AddressFinderMetadataResponse,
): ParsedAddress | null {
  const fullAddress = data.full_address?.trim()
  const addressLine1 = data.address_line_combined?.trim()
    || [data.address_line_1, data.address_line_2]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(", ")
  const suburb = data.locality_name?.trim()
  const state = data.state_territory?.trim()
  const postcode = data.postcode?.trim()

  if (!fullAddress || !addressLine1 || !suburb || !state || !postcode) {
    return null
  }

  const lat = parseCoordinate(data.latitude)
  const lng = parseCoordinate(data.longitude)

  return {
    addressLine1,
    addressLine2: null,
    suburb,
    state,
    postcode,
    fullAddress,
    placeId: data.id ? formatAddressFinderPlaceId(data.id) : undefined,
    coordinates: lat !== undefined && lng !== undefined
      ? { lat, lng }
      : undefined,
  }
}
