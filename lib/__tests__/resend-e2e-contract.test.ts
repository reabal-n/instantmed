import { afterEach, describe, expect, it, vi } from "vitest"

import { sendViaResend } from "@/lib/email/resend"

describe("Resend E2E delivery contract", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("does not call the external Resend API when PLAYWRIGHT=1", async () => {
    vi.stubEnv("PLAYWRIGHT", "1")
    vi.stubEnv("RESEND_API_KEY", "re_test_should_not_be_used")
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const result = await sendViaResend({
      to: "patient@example.com",
      subject: "Refund processed",
      html: "<p>Your refund has been processed.</p>",
    })

    expect(result.success).toBe(true)
    expect(result.skipped).toBe(true)
    expect(result.id).toMatch(/^e2e-/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("keeps the explicit E2E forced-failure hook ahead of the skip path", async () => {
    vi.stubEnv("PLAYWRIGHT", "1")
    vi.stubEnv("E2E_FORCE_EMAIL_FAIL", "true")
    vi.stubEnv("RESEND_API_KEY", "re_test_should_not_be_used")
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const result = await sendViaResend({
      to: "patient@example.com",
      subject: "Forced failure",
      html: "<p>Failure path.</p>",
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("E2E_FORCE_EMAIL_FAIL")
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
