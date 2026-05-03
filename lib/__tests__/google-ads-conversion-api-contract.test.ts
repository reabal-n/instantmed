import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const source = readFileSync(
  join(process.cwd(), "lib/analytics/google-ads-conversion-api.ts"),
  "utf8",
)

describe("Google Ads conversion upload contract", () => {
  it("uses a supported configurable API version instead of the sunset v18 endpoint", () => {
    expect(source).toContain("DEFAULT_GOOGLE_ADS_API_VERSION")
    expect(source).toContain("GOOGLE_ADS_API_VERSION")
    expect(source).not.toContain("googleads.googleapis.com/v18")
  })

  it("passes quota project and manager-account headers when configured", () => {
    expect(source).toContain('headers["login-customer-id"] = loginCustomerId')
    expect(source).toContain('headers["x-goog-user-project"] = quotaProjectId')
  })
})
