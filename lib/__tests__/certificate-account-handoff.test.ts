import { describe, expect, it } from "vitest"

import {
  buildCompleteAccountPostSignInHref,
  buildVerifiedCompleteAccountHref,
} from "@/lib/auth/complete-account-handoff"

describe("certificate account handoff", () => {
  it("keeps the intake id for guest linking and returns directly to the certificate request", () => {
    expect(buildCompleteAccountPostSignInHref({
      intakeId: "2c7f07df-1b4b-49fe-ae55-984a24c3d5cc",
      certificateAccess: true,
    })).toBe(
      "/auth/post-signin?intake_id=2c7f07df-1b4b-49fe-ae55-984a24c3d5cc&redirect=%2Fpatient%2Fintakes%2F2c7f07df-1b4b-49fe-ae55-984a24c3d5cc",
    )
  })

  it("preserves the existing payment-completion handoff", () => {
    expect(buildCompleteAccountPostSignInHref({
      intakeId: "2c7f07df-1b4b-49fe-ae55-984a24c3d5cc",
      certificateAccess: false,
    })).toBe(
      "/auth/post-signin?intake_id=2c7f07df-1b4b-49fe-ae55-984a24c3d5cc",
    )
  })

  it("builds account-completion links with exact current Session proof", () => {
    expect(buildVerifiedCompleteAccountHref({
      appUrl: "https://instantmed.com.au/",
      intakeId: "intake/id",
      sessionId: "cs_test&current",
    })).toBe(
      "https://instantmed.com.au/auth/complete-account?intake_id=intake%2Fid&session_id=cs_test%26current",
    )
  })
})
