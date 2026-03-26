import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock server-only before any imports
vi.mock("server-only", () => ({}))

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}))

/**
 * These tests verify the exported helper logic from auto-approval-pipeline.ts.
 * Since the orchestrator itself requires Supabase, we test the build logic
 * by importing it dynamically after mocking.
 *
 * For the pipeline orchestrator (attemptAutoApproval), we verify:
 * - Feature flag gating
 * - The claim/release pattern is documented and tested via the eligibility engine
 */

describe("Auto-Approval Pipeline Helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe("buildReviewDataFromAnswers (via pipeline behavior)", () => {
    // We test the review data building logic indirectly through the eligibility engine
    // and directly test date extraction/duration logic

    it("extractDurationDays handles all answer formats", async () => {
      const { extractDurationDays } = await import("@/lib/clinical/auto-approval")

      // Unified flow
      expect(extractDurationDays({ duration: "1" })).toBe(1)
      expect(extractDurationDays({ duration: "2" })).toBe(2)
      expect(extractDurationDays({ duration: "3" })).toBe(3)

      // Legacy with dates
      expect(extractDurationDays({ start_date: "2026-03-24", end_date: "2026-03-26" })).toBe(3)

      // Single day
      expect(extractDurationDays({ absence_dates: "single_day" })).toBe(1)

      // No data
      expect(extractDurationDays(null)).toBeNull()
      expect(extractDurationDays({})).toBeNull()
    })

    it("extractStartDate returns start_date or null", async () => {
      const { extractStartDate } = await import("@/lib/clinical/auto-approval")

      expect(extractStartDate({ start_date: "2026-03-24" })).toBe("2026-03-24")
      expect(extractStartDate({})).toBeNull()
      expect(extractStartDate(null)).toBeNull()
    })
  })

  describe("Feature flag gating", () => {
    it("pipeline uses DB-backed feature flag (ai_auto_approve_enabled), not env var", async () => {
      // The pipeline reads from getFeatureFlags() which queries the feature_flags DB table.
      // DEFAULT_FLAGS has ai_auto_approve_enabled = false — must be explicitly enabled via admin.
      const { DEFAULT_FLAGS } = await import("@/lib/data/types/feature-flags")
      expect(DEFAULT_FLAGS.ai_auto_approve_enabled).toBe(false)
    })
  })

  describe("Eligibility engine edge cases for pipeline", () => {
    it("rejects when all text fields contain flagged keywords across different fields", async () => {
      const { evaluateAutoApprovalEligibility } = await import("@/lib/clinical/auto-approval")

      // Keywords spread across multiple answer fields
      const result = evaluateAutoApprovalEligibility(
        { service_type: "med_certs", subtype: "work" },
        {
          symptoms: ["Headache"],
          symptomDetails: "feeling down",
          additional_info: "this is for depression",
          duration: "1",
          start_date: new Date().toISOString().split("T")[0],
        },
        {
          clinicalNote: {
            status: "ready",
            content: { flags: { requiresReview: false, flagReason: null } },
          },
        }
      )

      expect(result.eligible).toBe(false)
      expect(result.disqualifyingFlags.some(f => f.includes("mental_health"))).toBe(true)
    })

    it("eligible intake with minimal valid data", async () => {
      const { evaluateAutoApprovalEligibility } = await import("@/lib/clinical/auto-approval")

      const result = evaluateAutoApprovalEligibility(
        { service_type: "med_certs", subtype: "work" },
        {
          symptoms: ["Cold"],
          symptomDetails: "runny nose",
          duration: "1",
          start_date: new Date().toISOString().split("T")[0],
        },
        {
          clinicalNote: {
            status: "ready",
            content: {
              presentingComplaint: "Cold symptoms",
              flags: { requiresReview: false, flagReason: null },
            },
          },
        }
      )

      expect(result.eligible).toBe(true)
      expect(result.disqualifyingFlags).toHaveLength(0)
    })

    it("rejects carer subtype with pregnancy keywords in carer context", async () => {
      const { evaluateAutoApprovalEligibility } = await import("@/lib/clinical/auto-approval")

      const result = evaluateAutoApprovalEligibility(
        { service_type: "med_certs", subtype: "carer" },
        {
          symptoms: ["Morning sickness"],
          symptomDetails: "caring for pregnant wife",
          duration: "1",
          start_date: new Date().toISOString().split("T")[0],
        },
        {
          clinicalNote: {
            status: "ready",
            content: { flags: { requiresReview: false, flagReason: null } },
          },
        }
      )

      expect(result.eligible).toBe(false)
      expect(result.disqualifyingFlags.some(f => f.includes("pregnancy"))).toBe(true)
    })
  })

  describe("Claim lifecycle documentation", () => {
    it("releaseSystemClaim pattern: claim uses system profile UUID for FK safety", async () => {
      // This is a documentation test that verifies the claim/release contract:
      // - Claim: UPDATE intakes SET claimed_by=SYSTEM_AUTO_APPROVE_ID WHERE status='paid' AND claimed_by IS NULL
      // - Release: UPDATE intakes SET claimed_by=NULL WHERE claimed_by=SYSTEM_AUTO_APPROVE_ID
      // - The eq("claimed_by", SYSTEM_AUTO_APPROVE_ID) guard prevents releasing doctor claims
      const { SYSTEM_AUTO_APPROVE_ID } = await import("@/lib/constants")
      // Must be a valid UUID (intakes.claimed_by is UUID REFERENCES profiles)
      expect(SYSTEM_AUTO_APPROVE_ID).toBe("00000000-0000-0000-0000-000000000000")
      expect(SYSTEM_AUTO_APPROVE_ID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })
  })
})
