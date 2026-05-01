const MIN_ADDRESS_SEARCH_LENGTH = 3
const MAX_ADDRESS_SEARCH_LENGTH = 120
const MAX_PLACE_ID_LENGTH = 256

export function normalizeAddressSearchInput(input: string | null): string | null {
  const trimmed = input?.trim() ?? ""
  if (trimmed.length < MIN_ADDRESS_SEARCH_LENGTH) return null
  return trimmed.slice(0, MAX_ADDRESS_SEARCH_LENGTH)
}

export function normalizePlaceId(placeId: string | null): string | null {
  const trimmed = placeId?.trim() ?? ""
  if (!trimmed || trimmed.length > MAX_PLACE_ID_LENGTH) return null
  return trimmed
}
