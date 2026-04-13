/**
 * Immutable Dates Module Tests
 *
 * Tests for the immutable date policy that prevents certificate backdating.
 * Covers: isDateChangeAllowed (backdating, forward-dating, out-of-range).
 * Does NOT test requestDateChange or processDateChangeRequest (require Supabase).
 */

import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  IMMUTABLE_DATE_POLICY,
  isDateChangeAllowed,
} from "@/lib/security/immutable-dates"

describe("immutable dates module", () => {
  // ──────────────────────────────────────────────────────────────────────────
  // isDateChangeAllowed
  // ──────────────────────────────────────────────────────────────────────────
  describe("isDateChangeAllowed", () => {
    it("rejects backdating (requested date before original)", () => {
      const original = new Date("2026-03-06T10:00:00Z")
      const requested = new Date("2026-03-05T10:00:00Z")

      const result = isDateChangeAllowed(original, requested)

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain("Backdating is not permitted")
    })

    it("rejects backdating even by one minute", () => {
      const original = new Date("2026-03-06T10:00:00Z")
      const requested = new Date("2026-03-06T09:59:00Z")

      const result = isDateChangeAllowed(original, requested)

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain("Backdating is not permitted")
    })

    it("rejects backdating regardless of admin flag", () => {
      const original = new Date("2026-03-06T10:00:00Z")
      const requested = new Date("2026-03-04T10:00:00Z")

      const result = isDateChangeAllowed(original, requested, true)

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain("Backdating is not permitted")
    })

    it("allows forward-dating within 24 hours", () => {
      const original = new Date("2026-03-06T10:00:00Z")
      const requested = new Date("2026-03-06T20:00:00Z") // +10 hours

      const result = isDateChangeAllowed(original, requested)

      expect(result.allowed).toBe(true)
      expect(result.reason).toContain("within 24 hours is permitted")
    })

    it("allows forward-dating at exactly 24 hours boundary", () => {
      const original = new Date("2026-03-06T10:00:00Z")
      const requested = new Date("2026-03-07T10:00:00Z") // exactly +24h

      const result = isDateChangeAllowed(original, requested)

      expect(result.allowed).toBe(true)
      expect(result.reason).toContain("within 24 hours is permitted")
    })

    it("allows same date (0 hour difference)", () => {
      const original = new Date("2026-03-06T10:00:00Z")
      const requested = new Date("2026-03-06T10:00:00Z")

      const result = isDateChangeAllowed(original, requested)

      expect(result.allowed).toBe(true)
      expect(result.reason).toContain("within 24 hours is permitted")
    })

    it("rejects forward-dating beyond 24 hours", () => {
      const original = new Date("2026-03-06T10:00:00Z")
      const requested = new Date("2026-03-07T10:00:01Z") // just over 24h

      const result = isDateChangeAllowed(original, requested)

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain("require manager approval")
    })

    it("rejects forward-dating by multiple days", () => {
      const original = new Date("2026-03-06T10:00:00Z")
      const requested = new Date("2026-03-10T10:00:00Z") // +4 days

      const result = isDateChangeAllowed(original, requested)

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain("require manager approval")
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // IMMUTABLE_DATE_POLICY
  // ──────────────────────────────────────────────────────────────────────────
  describe("IMMUTABLE_DATE_POLICY", () => {
    it("is a non-empty string", () => {
      expect(typeof IMMUTABLE_DATE_POLICY).toBe("string")
      expect(IMMUTABLE_DATE_POLICY.length).toBeGreaterThan(100)
    })

    it("references key policy points", () => {
      expect(IMMUTABLE_DATE_POLICY).toContain("backdated")
      expect(IMMUTABLE_DATE_POLICY).toContain("24 hours")
      expect(IMMUTABLE_DATE_POLICY).toContain("manager approval")
      expect(IMMUTABLE_DATE_POLICY).toContain("audit")
    })
  })
})
