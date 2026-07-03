import { describe, expect, it } from "vitest"

import { detectRelayEmail, getRelayEmailMessage } from "@/lib/validation/email-relay"

describe("detectRelayEmail", () => {
  it("flags the generated Hide My Email iCloud shape from the 2026-07-02 incident", () => {
    const result = detectRelayEmail("gambols_pixie.6p@icloud.com")
    expect(result.isRelay).toBe(true)
    expect(result.provider).toBe("apple")
  })

  it("flags Sign in with Apple private relay addresses", () => {
    expect(detectRelayEmail("abc123xyz@privaterelay.appleid.com")).toEqual({
      isRelay: true,
      provider: "apple",
    })
  })

  it("flags DuckDuckGo and Firefox Relay domains", () => {
    expect(detectRelayEmail("jane@duck.com").provider).toBe("duck")
    expect(detectRelayEmail("jane@mozmail.com").provider).toBe("firefox")
    expect(detectRelayEmail("jane@relay.firefox.com").provider).toBe("firefox")
  })

  it("does not flag ordinary iCloud addresses", () => {
    expect(detectRelayEmail("jane@icloud.com").isRelay).toBe(false)
    expect(detectRelayEmail("jane.smith@icloud.com").isRelay).toBe(false)
    // underscore but no dot-suffix — not the generated shape
    expect(detectRelayEmail("john_smith@icloud.com").isRelay).toBe(false)
    // dot-suffix longer than 2 chars — not the generated shape
    expect(detectRelayEmail("john_smith.1988@icloud.com").isRelay).toBe(false)
  })

  it("does not flag mainstream providers", () => {
    expect(detectRelayEmail("jane@gmail.com").isRelay).toBe(false)
    expect(detectRelayEmail("jane@hotmail.com").isRelay).toBe(false)
    expect(detectRelayEmail("jane@bigpond.com").isRelay).toBe(false)
  })

  it("normalises case and whitespace", () => {
    expect(detectRelayEmail("  GAMBOLS_PIXIE.6P@ICLOUD.COM  ").isRelay).toBe(true)
    expect(detectRelayEmail("Jane@Duck.com").isRelay).toBe(true)
  })

  it("handles malformed input without flagging", () => {
    expect(detectRelayEmail("").isRelay).toBe(false)
    expect(detectRelayEmail("not-an-email").isRelay).toBe(false)
    expect(detectRelayEmail("@icloud.com").isRelay).toBe(false)
    expect(detectRelayEmail("jane@").isRelay).toBe(false)
  })
})

describe("getRelayEmailMessage", () => {
  it("returns an Apple-specific expectation line for Apple relays", () => {
    const message = getRelayEmailMessage(detectRelayEmail("gambols_pixie.6p@icloud.com"))
    expect(message).toContain("Hide My Email")
    expect(message).toContain("Apple ID")
  })

  it("returns a generic line for other relays", () => {
    const message = getRelayEmailMessage(detectRelayEmail("jane@duck.com"))
    expect(message).toContain("forwarded")
  })

  it("returns null for non-relay addresses", () => {
    expect(getRelayEmailMessage(detectRelayEmail("jane@gmail.com"))).toBeNull()
  })
})
