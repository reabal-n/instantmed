/**
 * Attestation Module Tests
 *
 * Tests for the legal attestation system used to deter fraud.
 * Covers: validateAttestation, createAttestationData, ATTESTATION_TEXTS constants.
 * Does NOT test saveAttestation (requires Supabase).
 */

import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  ATTESTATION_TEXTS,
  type AttestationData,
  createAttestationData,
  validateAttestation,
} from "@/lib/security/attestation"

describe("attestation module", () => {
  // ──────────────────────────────────────────────────────────────────────────
  // ATTESTATION_TEXTS constants
  // ──────────────────────────────────────────────────────────────────────────
  describe("ATTESTATION_TEXTS", () => {
    it("has all four attestation types defined", () => {
      expect(ATTESTATION_TEXTS.MEDICAL_CERTIFICATE).toBeDefined()
      expect(ATTESTATION_TEXTS.REPEAT_PRESCRIPTION).toBeDefined()
      expect(ATTESTATION_TEXTS.GENERAL_CONSULT).toBeDefined()
      expect(ATTESTATION_TEXTS.ACCURACY_ATTESTATION).toBeDefined()
    })

    it("each attestation text has substantial content", () => {
      for (const [_key, text] of Object.entries(ATTESTATION_TEXTS)) {
        expect(text.length).toBeGreaterThan(50)
        expect(typeof text).toBe("string")
        // Ensure texts are non-trivial
        expect(text.trim()).not.toBe("")
      }
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // validateAttestation
  // ──────────────────────────────────────────────────────────────────────────
  describe("validateAttestation", () => {
    function makeValid(overrides?: Partial<AttestationData>): AttestationData {
      return {
        text: ATTESTATION_TEXTS.MEDICAL_CERTIFICATE,
        typedName: "Jane Smith",
        timestamp: new Date().toISOString(),
        ipAddress: "203.0.113.42",
        userAgent: "Mozilla/5.0",
        ...overrides,
      }
    }

    it("returns valid for a correct attestation", () => {
      const result = validateAttestation(
        makeValid(),
        "Jane Smith",
        "MEDICAL_CERTIFICATE"
      )

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("matches names case-insensitively", () => {
      const attestation = makeValid({ typedName: "JANE SMITH" })

      const result = validateAttestation(
        attestation,
        "jane smith",
        "MEDICAL_CERTIFICATE"
      )

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("trims whitespace from names before comparison", () => {
      const attestation = makeValid({ typedName: "  Jane Smith  " })

      const result = validateAttestation(
        attestation,
        "Jane Smith",
        "MEDICAL_CERTIFICATE"
      )

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("rejects when typed name does not match expected name", () => {
      const attestation = makeValid({ typedName: "John Doe" })

      const result = validateAttestation(
        attestation,
        "Jane Smith",
        "MEDICAL_CERTIFICATE"
      )

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        "Typed name does not match your registered name"
      )
    })

    it("rejects when attestation text does not match expected type", () => {
      const attestation = makeValid({ text: "Some random text" })

      const result = validateAttestation(
        attestation,
        "Jane Smith",
        "MEDICAL_CERTIFICATE"
      )

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        "Attestation text mismatch - please try again"
      )
    })

    it("rejects when timestamp is older than 10 minutes", () => {
      const expired = new Date(Date.now() - 11 * 60 * 1000).toISOString()
      const attestation = makeValid({ timestamp: expired })

      const result = validateAttestation(
        attestation,
        "Jane Smith",
        "MEDICAL_CERTIFICATE"
      )

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        "Attestation has expired - please confirm again"
      )
    })

    it("accepts a timestamp within the 10-minute window", () => {
      const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const attestation = makeValid({ timestamp: recent })

      const result = validateAttestation(
        attestation,
        "Jane Smith",
        "MEDICAL_CERTIFICATE"
      )

      expect(result.valid).toBe(true)
    })

    it("rejects when typed name is empty (whitespace only)", () => {
      const attestation = makeValid({ typedName: "   " })

      const result = validateAttestation(
        attestation,
        "Jane Smith",
        "MEDICAL_CERTIFICATE"
      )

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(
        "You must type your full name to confirm"
      )
    })

    it("rejects when IP address is empty", () => {
      const attestation = makeValid({ ipAddress: "" })

      const result = validateAttestation(
        attestation,
        "Jane Smith",
        "MEDICAL_CERTIFICATE"
      )

      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Unable to verify request origin")
    })

    it("collects multiple errors when several validations fail", () => {
      const attestation = makeValid({
        typedName: "Wrong Name",
        text: "Wrong text",
        timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        ipAddress: "",
      })

      const result = validateAttestation(
        attestation,
        "Jane Smith",
        "MEDICAL_CERTIFICATE"
      )

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(4)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // createAttestationData
  // ──────────────────────────────────────────────────────────────────────────
  describe("createAttestationData", () => {
    it("returns correct structure with all fields", () => {
      const data = createAttestationData(
        "Jane Smith",
        "MEDICAL_CERTIFICATE",
        "203.0.113.42",
        "Mozilla/5.0"
      )

      expect(data.typedName).toBe("Jane Smith")
      expect(data.text).toBe(ATTESTATION_TEXTS.MEDICAL_CERTIFICATE)
      expect(data.ipAddress).toBe("203.0.113.42")
      expect(data.userAgent).toBe("Mozilla/5.0")
    })

    it("generates a valid ISO timestamp", () => {
      const before = new Date().toISOString()
      const data = createAttestationData(
        "Jane Smith",
        "GENERAL_CONSULT",
        "10.0.0.1"
      )
      const after = new Date().toISOString()

      // Timestamp should be parseable and within the before/after window
      expect(() => new Date(data.timestamp)).not.toThrow()
      expect(data.timestamp >= before).toBe(true)
      expect(data.timestamp <= after).toBe(true)
    })

    it("maps the correct attestation text for each type", () => {
      const types = [
        "MEDICAL_CERTIFICATE",
        "REPEAT_PRESCRIPTION",
        "GENERAL_CONSULT",
        "ACCURACY_ATTESTATION",
      ] as const

      for (const type of types) {
        const data = createAttestationData("Test User", type, "127.0.0.1")
        expect(data.text).toBe(ATTESTATION_TEXTS[type])
      }
    })

    it("allows userAgent to be undefined", () => {
      const data = createAttestationData(
        "Jane Smith",
        "MEDICAL_CERTIFICATE",
        "203.0.113.42"
      )

      expect(data.userAgent).toBeUndefined()
    })
  })
})
