import { describe, expect, it } from "vitest"

import {
  buildAddressAuditMetadata,
  getAddressReviewSummary,
  getAddressStatusDisplay,
} from "@/lib/request/address-metadata"
import { transformAnswersForUnifiedCheckout } from "@/lib/request/unified-checkout"

describe("address metadata", () => {
  const verifiedAnswers = {
    addressLine1: "Unit 2, 21 Kent Road",
    suburb: "DAPTO",
    state: "NSW",
    postcode: "2530",
    addressVerified: true,
    addressProviderPlaceId: "af:address-id",
  }

  it("persists verified provider metadata in the checkout answer payload", () => {
    const transformed = transformAnswersForUnifiedCheckout("repeat-script", verifiedAnswers)

    expect(transformed).toMatchObject({
      address_line1: "Unit 2, 21 Kent Road",
      address_verified: true,
      address_provider_place_id: "af:address-id",
      address_provider: "addressfinder",
    })
  })

  it("derives manual metadata when the patient enters an address without provider verification", () => {
    expect(buildAddressAuditMetadata({
      addressLine1: "12 Manual Street",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
      addressVerified: false,
    })).toEqual({
      address_verified: false,
      address_provider: "manual",
    })
  })

  it("renders a provider-neutral status display (no Google/Addressfinder leak)", () => {
    expect(getAddressStatusDisplay(true)).toBe("Verified address")
    expect(getAddressStatusDisplay(false)).toBe("Manually entered")
  })

  it("formats a compact verified row for review", () => {
    expect(getAddressReviewSummary(verifiedAnswers)).toEqual({
      line: "Unit 2, 21 Kent Road",
      locality: "DAPTO NSW 2530",
      compact: "Unit 2, 21 Kent Road, DAPTO NSW 2530",
      isVerified: true,
      statusLabel: "Verified",
      providerLabel: "Addressfinder",
    })
  })
})
