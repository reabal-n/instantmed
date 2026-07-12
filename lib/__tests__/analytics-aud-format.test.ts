import { describe, expect, it } from "vitest"

import { formatAudDollars } from "@/lib/format/aud"

describe("Google Ads AUD formatting", () => {
  it("renders Google Ads values as dollars rather than cents", () => {
    expect(formatAudDollars(706.44)).toBe("$706.44")
    expect(formatAudDollars(7)).toBe("$7.00")
    expect(formatAudDollars(0)).toBe("$0.00")
  })

  it("keeps unavailable values explicit", () => {
    expect(formatAudDollars(null)).toBe("No data")
    expect(formatAudDollars(undefined)).toBe("No data")
  })
})
