/**
 * @deprecated - This module has been replaced by lib/google-places/client.ts
 * Kept for backward compatibility of type imports.
 * All new code should import from '@/lib/google-places/client'
 */

export {
  searchAddresses,
  getPlaceDetails as getAddressMetadata,
  generateSessionToken,
  type PlaceSuggestion as AddressFinderSuggestion,
  type ParsedAddress,
} from "@/lib/google-places/client"
