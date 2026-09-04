import { afterEach, describe, expect, it } from "vitest"

import { verifyCheckoutResumeToken } from "@/lib/crypto/checkout-resume-token"
import {
  signRecoveryEmailEngagementToken,
  verifyRecoveryEmailEngagementToken,
} from "@/lib/crypto/recovery-email-engagement-token"

const ORIGINAL_SECRET = process.env.INTERNAL_API_SECRET

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.INTERNAL_API_SECRET
  else process.env.INTERNAL_API_SECRET = ORIGINAL_SECRET
})

describe("recovery email engagement token", () => {
  it("proves one intake without granting guest checkout-resume capability", () => {
    process.env.INTERNAL_API_SECRET = "test-internal-secret"

    const token = signRecoveryEmailEngagementToken("intake-1")

    expect(verifyRecoveryEmailEngagementToken(token)).toEqual({ intakeId: "intake-1" })
    expect(verifyCheckoutResumeToken(token)).toBeNull()
    expect(verifyRecoveryEmailEngagementToken(`${token}tampered`)).toBeNull()
  })
})
