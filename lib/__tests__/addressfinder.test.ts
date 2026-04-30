import { describe, expect, it } from "vitest"

import {
  formatAddressFinderPlaceId,
  isAddressFinderPlaceId,
  mapAddressFinderAutocompleteResponse,
  mapAddressFinderMetadataToParsedAddress,
  parseAddressFinderPlaceId,
} from "@/lib/google-places/addressfinder"

describe("Addressfinder helpers", () => {
  it("maps Addressfinder completions into existing autocomplete suggestions", () => {
    const suggestions = mapAddressFinderAutocompleteResponse({
      completions: [
        {
          full_address: "Unit 2, 21 Kent Road, DAPTO NSW 2530",
          id: "c10cf706-2e2e-4fe1-887c-156e6118ab76",
        },
      ],
      success: true,
    })

    expect(suggestions).toEqual([
      {
        description: "Unit 2, 21 Kent Road, DAPTO NSW 2530",
        place_id: "af:c10cf706-2e2e-4fe1-887c-156e6118ab76",
        structured_formatting: {
          main_text: "Unit 2, 21 Kent Road",
          secondary_text: "DAPTO NSW 2530",
        },
      },
    ])
  })

  it("maps Addressfinder metadata into structured prescribing address fields", () => {
    expect(mapAddressFinderMetadataToParsedAddress({
      id: "address-id",
      full_address: "Unit 2, 21 Kent Road, DAPTO NSW 2530",
      address_line_1: "Unit 2",
      address_line_2: "21 Kent Road",
      address_line_combined: "Unit 2, 21 Kent Road",
      locality_name: "DAPTO",
      state_territory: "NSW",
      postcode: "2530",
      latitude: "-34.4929",
      longitude: "150.7932",
      success: true,
    })).toEqual({
      addressLine1: "Unit 2, 21 Kent Road",
      addressLine2: null,
      suburb: "DAPTO",
      state: "NSW",
      postcode: "2530",
      fullAddress: "Unit 2, 21 Kent Road, DAPTO NSW 2530",
      placeId: "af:address-id",
      coordinates: {
        lat: -34.4929,
        lng: 150.7932,
      },
    })
  })

  it("round-trips Addressfinder place ids without colliding with Google place ids", () => {
    const placeId = formatAddressFinderPlaceId("abc-123")

    expect(isAddressFinderPlaceId(placeId)).toBe(true)
    expect(parseAddressFinderPlaceId(placeId)).toBe("abc-123")
    expect(isAddressFinderPlaceId("ChIJN1t_tDeuEmsRUsoyG83frY4")).toBe(false)
  })
})
