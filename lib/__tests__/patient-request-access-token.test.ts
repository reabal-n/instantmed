import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  signCheckoutResumeToken,
  verifyCheckoutResumeToken,
} from "@/lib/crypto/checkout-resume-token"
import {
  signHeardAboutUsToken,
  verifyHeardAboutUsToken,
} from "@/lib/crypto/heard-about-us-token"
import {
  signPatientRequestAccessToken,
  verifyPatientRequestAccessToken,
} from "@/lib/crypto/patient-request-access-token"

const INTAKE_ID = "11111111-1111-4111-8111-111111111111"

describe("patient request access token", () => {
  beforeEach(() => {
    vi.stubEnv("INTERNAL_API_SECRET", "test-patient-request-access-secret")
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("round-trips a purpose-scoped URL-safe token", () => {
    const token = signPatientRequestAccessToken(INTAKE_ID)

    expect(token).not.toMatch(/[+/=]/)
    expect(verifyPatientRequestAccessToken(token)).toEqual({ intakeId: INTAKE_ID })
  })

  it("rejects a tampered token", () => {
    const token = signPatientRequestAccessToken(INTAKE_ID)
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const tamperedDecoded = decoded.slice(0, -1) + (decoded.endsWith("a") ? "b" : "a")
    const tampered = Buffer.from(tamperedDecoded, "utf8").toString("base64url")

    expect(verifyPatientRequestAccessToken(tampered)).toBeNull()
  })

  it("expires after seven days", () => {
    const now = Date.now()
    vi.spyOn(Date, "now").mockReturnValue(now - (8 * 24 * 60 * 60 * 1000))
    const token = signPatientRequestAccessToken(INTAKE_ID)
    vi.spyOn(Date, "now").mockReturnValue(now)

    expect(verifyPatientRequestAccessToken(token)).toBeNull()
  })

  it("rejects tokens signed with another secret", () => {
    const token = signPatientRequestAccessToken(INTAKE_ID)
    vi.stubEnv("INTERNAL_API_SECRET", "different-secret")

    expect(verifyPatientRequestAccessToken(token)).toBeNull()
  })

  it("rejects malformed input", () => {
    expect(verifyPatientRequestAccessToken("")).toBeNull()
    expect(verifyPatientRequestAccessToken("not-a-token")).toBeNull()
    expect(verifyPatientRequestAccessToken("a".repeat(513))).toBeNull()
    expect(verifyPatientRequestAccessToken("valid-looking_token%2Fignored")).toBeNull()
  })

  it("cannot be replayed across other signed-token purposes", () => {
    const requestToken = signPatientRequestAccessToken(INTAKE_ID)
    const resumeToken = signCheckoutResumeToken(INTAKE_ID)
    const heardToken = signHeardAboutUsToken(INTAKE_ID)

    expect(verifyCheckoutResumeToken(requestToken)).toBeNull()
    expect(verifyHeardAboutUsToken(requestToken)).toBeNull()
    expect(verifyPatientRequestAccessToken(resumeToken)).toBeNull()
    expect(verifyPatientRequestAccessToken(heardToken)).toBeNull()
  })

  it("refuses to mint a capability for a non-UUID intake reference", () => {
    expect(() => signPatientRequestAccessToken("REQ-123")).toThrow(
      "A valid intake id is required",
    )
  })
})
