import { describe, it, expect } from "vitest"
import { createHash } from "crypto"

function hashConsentContent(content: string): string {
  return createHash("sha256").update(content).digest("hex")
}

describe("Consent Versioning", () => {
  it("should generate consistent SHA-256 hashes", () => {
    const content = "I agree to the terms and conditions"
    const hash1 = hashConsentContent(content)
    const hash2 = hashConsentContent(content)
    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64)
  })

  it("should generate different hashes for different content", () => {
    const hash1 = hashConsentContent("Version 1 terms")
    const hash2 = hashConsentContent("Version 2 terms")
    expect(hash1).not.toBe(hash2)
  })

  it("should handle empty content", () => {
    const hash = hashConsentContent("")
    expect(hash).toHaveLength(64)
  })

  it("should handle unicode content", () => {
    const hash = hashConsentContent("同意条款 🏥")
    expect(hash).toHaveLength(64)
  })
})
