import { describe, expect, it } from "vitest"

import { getCrossSell } from "@/components/patient/cross-sell-card"

describe("patient cross-sell logic", () => {
  it("routes medical certificate users to the repeat-script flow when advertising prescription renewal", () => {
    expect(getCrossSell("med_certs")).toMatchObject({
      headline: expect.stringMatching(/prescription renewal/i),
      href: "/request?service=repeat-script",
    })
  })

  it("does not show a cross-sell for unknown service types", () => {
    expect(getCrossSell(undefined)).toBeNull()
  })
})
