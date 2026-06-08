import { describe, expect, it } from "vitest"

import { getMedCertExtraDayOffer } from "@/lib/request/display-helpers"

describe("getMedCertExtraDayOffer", () => {
  it("offers a 2nd day (+$10) when a med-cert is on the 1-day floor tier", () => {
    expect(getMedCertExtraDayOffer("med-cert", { duration: "1" })).toEqual({
      nextDuration: "2",
      nextDays: 2,
      nextPrice: 29.95,
      delta: 10,
    })
  })

  it("does not offer when already on 2 days (avoids over-nudging)", () => {
    expect(getMedCertExtraDayOffer("med-cert", { duration: "2" })).toBeNull()
  })

  it("does not offer at the 3-day cap", () => {
    expect(getMedCertExtraDayOffer("med-cert", { duration: "3" })).toBeNull()
  })

  it("does not offer for non-med-cert services", () => {
    expect(getMedCertExtraDayOffer("consult", { duration: "1" })).toBeNull()
    expect(getMedCertExtraDayOffer("repeat-script", { duration: "1" })).toBeNull()
  })

  it("does not offer when duration is missing", () => {
    expect(getMedCertExtraDayOffer("med-cert", {})).toBeNull()
  })
})
