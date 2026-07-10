import { describe, expect, it } from "vitest"

import { buildCompleteAccountPostSignInHref } from "@/lib/auth/complete-account-handoff"

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
})
