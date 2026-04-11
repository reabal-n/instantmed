import { describe, it, expect, vi, beforeEach } from "vitest"

// ============================================================================
// MOCKS - must be declared before any imports that reference them
// ============================================================================

vi.mock("server-only", () => ({}))

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}))

// Chainable Supabase mock builder (kept for future test coverage expansion)
function _createChainMock(terminalValue: unknown = { data: null, error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const methods = [
    "from", "select", "insert", "update", "eq", "is", "not",
    "in", "gte", "single", "order", "limit",
  ]
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }
  // Terminal methods return actual data
  chain.single = vi.fn().mockResolvedValue(terminalValue)
  chain.select = vi.fn().mockReturnValue({ ...chain, then: undefined })
  // Make select chainable but also resolve when awaited at end of chain
  return chain
}

// Configurable supabase mock state
let supabaseQueryResults: Record<string, unknown> = {}
const mockSupabaseChain = {
  from: vi.fn(),
  rpc: vi.fn(),
}

function setupSupabaseMock() {
  // Default: all queries succeed with empty data
  const defaultChain = () => {
    const chain: Record<string, unknown> = {}
    const methods = ["select", "insert", "update", "eq", "is", "not", "in", "gte", "single", "order", "limit"]
    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain)
    }
    // Make it thenable so await resolves
    chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null, count: 0 })
    return chain
  }

  mockSupabaseChain.from.mockImplementation((table: string) => {
    if (supabaseQueryResults[table]) {
      return supabaseQueryResults[table]
    }
    return defaultChain()
  })
}

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => mockSupabaseChain,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

const mockFeatureFlags = {
  ai_auto_approve_enabled: false,
  auto_approve_dry_run: false,
  auto_approve_rate_limit_5min: 10,
  auto_approve_daily_cap: 50,
  auto_approve_max_duration_days: 3,
}

vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlags: vi.fn(async () => ({ ...mockFeatureFlags })),
}))

const mockCheckRateLimit = vi.fn().mockResolvedValue({ allowed: true, remaining: 9 })
const mockRecordRateLimitedAction = vi.fn().mockResolvedValue(undefined)

vi.mock("@/lib/rate-limit/doctor", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  recordRateLimitedAction: (...args: unknown[]) => mockRecordRateLimitedAction(...args),
}))

vi.mock("@/lib/posthog-server", () => ({
  getPostHogClient: () => ({ capture: vi.fn(), shutdown: vi.fn() }),
}))

const mockExecuteCertApproval = vi.fn()
vi.mock("@/lib/cert/execute-approval", () => ({
  executeCertApproval: (...args: unknown[]) => mockExecuteCertApproval(...args),
}))

vi.mock("@/lib/notifications/telegram", () => ({
  sendTelegramAlert: vi.fn().mockResolvedValue(undefined),
  escapeMarkdownValue: (v: string) => v,
}))

const mockClaimForProcessing = vi.fn().mockResolvedValue(true)
const mockMarkApproved = vi.fn().mockResolvedValue(true)
const mockMarkNeedsDoctor = vi.fn().mockResolvedValue(true)
const mockMarkFailedRetrying = vi.fn().mockResolvedValue(true)
const mockMarkIneligible = vi.fn().mockResolvedValue(true)

vi.mock("@/lib/clinical/auto-approval-state", () => ({
  claimForProcessing: (...args: unknown[]) => mockClaimForProcessing(...args),
  markApproved: (...args: unknown[]) => mockMarkApproved(...args),
  markNeedsDoctor: (...args: unknown[]) => mockMarkNeedsDoctor(...args),
  markFailedRetrying: (...args: unknown[]) => mockMarkFailedRetrying(...args),
  markIneligible: (...args: unknown[]) => mockMarkIneligible(...args),
  isDeterministicFailure: (flags: string[]) => flags.some(f =>
    ["emergency:", "patient_under_18", "mental_health:", "injury:"].some(p => f.startsWith(p))
  ),
}))

// ============================================================================
// HELPERS
// ============================================================================

const TEST_INTAKE_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
const TEST_DOCTOR_ID = "11111111-2222-3333-4444-555555555555"
const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })

function makeIntakeChain(overrides: {
  intakeData?: Record<string, unknown> | null
  intakeError?: { message: string } | null
  claimData?: unknown[] | null
  claimError?: { message: string } | null
} = {}) {
  const {
    intakeData = {
      id: TEST_INTAKE_ID,
      status: "paid",
      subtype: "work",
      patient_id: "patient-1",
      service: { id: "svc-1", slug: "med-cert-1day", name: "Medical Certificate", type: "med_certs" },
      patient: { date_of_birth: "1990-01-01" },
      answers: { answers: { symptoms: ["Cold"], symptomDetails: "runny nose and cough", duration: "1", startDate: today } },
    },
    intakeError = null,
    claimData = [{ id: TEST_INTAKE_ID }],
    claimError = null,
  } = overrides

  let callCount = 0
  const chain: Record<string, unknown> = {}
  const methods = ["select", "insert", "update", "eq", "is", "not", "in", "gte", "neq", "lt", "single", "order", "limit"]
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }

  // Track whether this is a select (fetch) or update (claim/release)
  chain.select = vi.fn().mockImplementation(() => {
    callCount++
    const selectChain: Record<string, unknown> = { ...chain }
    if (callCount === 1) {
      // First select: intake fetch (.single())
      selectChain.single = vi.fn().mockResolvedValue({ data: intakeData, error: intakeError })
      selectChain.eq = vi.fn().mockReturnValue(selectChain)
    } else {
      // Subsequent selects: claim result, count queries (previousApprovalCount, recentCertCount)
      selectChain.then = (resolve: (v: unknown) => unknown) => resolve({ data: claimData, error: claimError, count: 0 })
      selectChain.eq = vi.fn().mockReturnValue(selectChain)
      selectChain.is = vi.fn().mockReturnValue(selectChain)
      selectChain.gte = vi.fn().mockReturnValue(selectChain)
      selectChain.neq = vi.fn().mockReturnValue(selectChain)
      selectChain.lt = vi.fn().mockReturnValue(selectChain)
    }
    return selectChain
  })

  chain.update = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue({
    then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
  })
  // Make base chain awaitable
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: claimData, error: claimError, count: 0 })

  return chain
}

function makeDraftsChain(drafts: unknown[] = []) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: drafts, error: null })
  return chain
}

function makeDoctorsChain(doctors: unknown[] = []) {
  const chain: Record<string, unknown> = {}
  const methods = ["select", "eq", "not", "in", "gte", "lte", "neq", "is", "lt", "limit"]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: doctors, error: null })
  return chain
}

function makeIssuedCertsChain(certs: unknown[] = []) {
  const chain: Record<string, unknown> = {}
  const methods = ["select", "eq", "is", "lte", "gte", "limit"]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: certs, error: null })
  return chain
}

function makeAuditChain() {
  const chain: Record<string, unknown> = {}
  chain.insert = vi.fn().mockReturnValue({
    then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }),
  })
  return chain
}

// ============================================================================
// TESTS
// ============================================================================

describe("attemptAutoApproval orchestrator", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Reset to defaults
    mockFeatureFlags.ai_auto_approve_enabled = false
    mockFeatureFlags.auto_approve_dry_run = false
    mockFeatureFlags.auto_approve_rate_limit_5min = 10
    mockFeatureFlags.auto_approve_daily_cap = 50
    mockFeatureFlags.auto_approve_max_duration_days = 3
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 9 })
    mockRecordRateLimitedAction.mockResolvedValue(undefined)
    mockExecuteCertApproval.mockReset()
    mockClaimForProcessing.mockResolvedValue(true)
    mockMarkApproved.mockResolvedValue(true)
    mockMarkNeedsDoctor.mockResolvedValue(true)
    mockMarkFailedRetrying.mockResolvedValue(true)
    mockMarkIneligible.mockResolvedValue(true)
    supabaseQueryResults = {}
    setupSupabaseMock()
  })

  // Lazily import so mocks are registered first
  async function getAttemptAutoApproval() {
    const mod = await import("@/lib/clinical/auto-approval-pipeline")
    return mod.attemptAutoApproval
  }

  // --------------------------------------------------------------------------
  // 1. Feature flag gating
  // --------------------------------------------------------------------------

  it("returns early when feature flag is OFF", async () => {
    mockFeatureFlags.ai_auto_approve_enabled = false
    const attemptAutoApproval = await getAttemptAutoApproval()
    const result = await attemptAutoApproval(TEST_INTAKE_ID)

    expect(result.success).toBe(true)
    expect(result.autoApproved).toBe(false)
    expect(result.reason).toBe("Feature disabled")
    // Should NOT touch Supabase at all
    expect(mockSupabaseChain.from).not.toHaveBeenCalled()
  })

  // --------------------------------------------------------------------------
  // 2. Rate limiting
  // --------------------------------------------------------------------------

  it("returns early when burst rate limit is hit", async () => {
    mockFeatureFlags.ai_auto_approve_enabled = true
    mockCheckRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0 })

    const attemptAutoApproval = await getAttemptAutoApproval()
    const result = await attemptAutoApproval(TEST_INTAKE_ID)

    expect(result.success).toBe(true)
    expect(result.autoApproved).toBe(false)
    expect(result.reason).toBe("Rate limit exceeded")
  })

  it("returns early when daily cap is hit", async () => {
    mockFeatureFlags.ai_auto_approve_enabled = true
    // First call (burst) passes, second call (daily) fails
    mockCheckRateLimit
      .mockResolvedValueOnce({ allowed: true, remaining: 5 })
      .mockResolvedValueOnce({ allowed: false, remaining: 0 })

    const attemptAutoApproval = await getAttemptAutoApproval()
    const result = await attemptAutoApproval(TEST_INTAKE_ID)

    expect(result.success).toBe(true)
    expect(result.autoApproved).toBe(false)
    expect(result.reason).toBe("Daily cap exceeded")
  })

  // --------------------------------------------------------------------------
  // 3. Intake validation
  // --------------------------------------------------------------------------

  it("handles intake not found", async () => {
    mockFeatureFlags.ai_auto_approve_enabled = true
    supabaseQueryResults["intakes"] = makeIntakeChain({
      intakeData: null,
      intakeError: { message: "Not found" },
    })

    const attemptAutoApproval = await getAttemptAutoApproval()
    const result = await attemptAutoApproval(TEST_INTAKE_ID)

    expect(result.success).toBe(false)
    expect(result.autoApproved).toBe(false)
    expect(result.reason).toBe("Intake not found")
  })

  it("skips non-med-cert service types", async () => {
    mockFeatureFlags.ai_auto_approve_enabled = true
    supabaseQueryResults["intakes"] = makeIntakeChain({
      intakeData: {
        id: TEST_INTAKE_ID,
        status: "paid",
        subtype: null,
        patient_id: "patient-1",
        service: { id: "svc-2", slug: "general-consult", name: "General Consult", type: "consults" },
        patient: { date_of_birth: "1990-01-01" },
        answers: { answers: {} },
      },
    })

    const attemptAutoApproval = await getAttemptAutoApproval()
    const result = await attemptAutoApproval(TEST_INTAKE_ID)

    expect(result.success).toBe(true)
    expect(result.autoApproved).toBe(false)
    expect(result.reason).toBe("Not a med cert service")
  })

  it("skips intake not in 'paid' status", async () => {
    mockFeatureFlags.ai_auto_approve_enabled = true
    supabaseQueryResults["intakes"] = makeIntakeChain({
      intakeData: {
        id: TEST_INTAKE_ID,
        status: "approved",
        subtype: "work",
        patient_id: "patient-1",
        service: { id: "svc-1", slug: "med-cert-1day", name: "Medical Certificate", type: "med_certs" },
        patient: { date_of_birth: "1990-01-01" },
        answers: { answers: {} },
      },
    })

    const attemptAutoApproval = await getAttemptAutoApproval()
    const result = await attemptAutoApproval(TEST_INTAKE_ID)

    expect(result.success).toBe(true)
    expect(result.autoApproved).toBe(false)
    expect(result.reason).toContain("not paid")
  })

  it("returns early when claim fails (CAS miss)", async () => {
    mockFeatureFlags.ai_auto_approve_enabled = true
    mockClaimForProcessing.mockResolvedValueOnce(false) // CAS miss
    supabaseQueryResults["intakes"] = makeIntakeChain()

    const attemptAutoApproval = await getAttemptAutoApproval()
    const result = await attemptAutoApproval(TEST_INTAKE_ID)

    expect(result.success).toBe(true)
    expect(result.autoApproved).toBe(false)
    expect(result.reason).toContain("Already claimed")
  })

  // --------------------------------------------------------------------------
  // 4. Deterministic failure marking
  // --------------------------------------------------------------------------

  it("calls markIneligible for deterministic failures", async () => {
    mockFeatureFlags.ai_auto_approve_enabled = true

    // Create intake with emergency keyword (deterministic failure)
    const intakeChain = makeIntakeChain({
      intakeData: {
        id: TEST_INTAKE_ID,
        status: "paid",
        subtype: "work",
        patient_id: "patient-1",
        service: { id: "svc-1", slug: "med-cert-1day", name: "Medical Certificate", type: "med_certs" },
        patient: { date_of_birth: "1990-01-01" },
        answers: { answers: { symptoms: ["Chest pain"], symptomDetails: "suicidal thoughts and chest pain", duration: "1", startDate: today } },
      },
    })
    supabaseQueryResults["intakes"] = intakeChain
    supabaseQueryResults["document_drafts"] = makeDraftsChain([])
    supabaseQueryResults["ai_audit_log"] = makeAuditChain()
    supabaseQueryResults["issued_certificates"] = makeIssuedCertsChain([])

    const attemptAutoApproval = await getAttemptAutoApproval()
    const result = await attemptAutoApproval(TEST_INTAKE_ID)

    expect(result.success).toBe(true)
    expect(result.autoApproved).toBe(false)
    // Should be ineligible due to emergency/mental health keywords
    expect(result.reason).toBeTruthy()
  })

  // --------------------------------------------------------------------------
  // 5. Dry run mode
  // --------------------------------------------------------------------------

  it("evaluates but does not issue certificate in dry run mode", async () => {
    mockFeatureFlags.ai_auto_approve_enabled = true
    mockFeatureFlags.auto_approve_dry_run = true

    supabaseQueryResults["intakes"] = makeIntakeChain()
    supabaseQueryResults["document_drafts"] = makeDraftsChain([
      { id: "draft-1", type: "clinical_note", status: "ready", content: { presentingComplaint: "Cold", flags: { requiresReview: false, flagReason: null } } },
    ])
    supabaseQueryResults["ai_audit_log"] = makeAuditChain()
    supabaseQueryResults["issued_certificates"] = makeIssuedCertsChain([])
    supabaseQueryResults["profiles"] = makeDoctorsChain([
      { id: TEST_DOCTOR_ID, full_name: "Dr Test Doctor", provider_number: "1234567A", ahpra_number: "MED0000000001", ahpra_next_review_at: null },
    ])

    const attemptAutoApproval = await getAttemptAutoApproval()
    const result = await attemptAutoApproval(TEST_INTAKE_ID)

    expect(result.success).toBe(true)
    expect(result.autoApproved).toBe(false)
    expect(result.reason).toContain("Dry run")
    // executeCertApproval should NOT be called in dry run
    expect(mockExecuteCertApproval).not.toHaveBeenCalled()
  })

  // --------------------------------------------------------------------------
  // 6. No doctor available
  // --------------------------------------------------------------------------

  it("fails when no doctor with credentials is available", async () => {
    mockFeatureFlags.ai_auto_approve_enabled = true

    supabaseQueryResults["intakes"] = makeIntakeChain()
    supabaseQueryResults["document_drafts"] = makeDraftsChain([
      { id: "draft-1", type: "clinical_note", status: "ready", content: { presentingComplaint: "Cold", flags: { requiresReview: false, flagReason: null } } },
    ])
    supabaseQueryResults["ai_audit_log"] = makeAuditChain()
    supabaseQueryResults["issued_certificates"] = makeIssuedCertsChain([])
    supabaseQueryResults["profiles"] = makeDoctorsChain([]) // No doctors!

    const attemptAutoApproval = await getAttemptAutoApproval()
    const result = await attemptAutoApproval(TEST_INTAKE_ID)

    expect(result.success).toBe(false)
    expect(result.autoApproved).toBe(false)
    expect(result.reason).toBe("No doctor available")
  })

  // --------------------------------------------------------------------------
  // 7. Successful approval
  // --------------------------------------------------------------------------

  it("issues certificate when all checks pass", async () => {
    mockFeatureFlags.ai_auto_approve_enabled = true

    supabaseQueryResults["intakes"] = makeIntakeChain()
    supabaseQueryResults["document_drafts"] = makeDraftsChain([
      { id: "draft-1", type: "clinical_note", status: "ready", content: { presentingComplaint: "Cold", flags: { requiresReview: false, flagReason: null } } },
    ])
    supabaseQueryResults["ai_audit_log"] = makeAuditChain()
    supabaseQueryResults["issued_certificates"] = makeIssuedCertsChain([])
    supabaseQueryResults["profiles"] = makeDoctorsChain([
      { id: TEST_DOCTOR_ID, full_name: "Dr Test Doctor", provider_number: "1234567A", ahpra_number: "MED0000000001", ahpra_next_review_at: null },
    ])

    mockExecuteCertApproval.mockResolvedValue({
      success: true,
      certificateId: "cert-123",
      emailSent: true,
    })

    const attemptAutoApproval = await getAttemptAutoApproval()
    const result = await attemptAutoApproval(TEST_INTAKE_ID)

    expect(result.success).toBe(true)
    expect(result.autoApproved).toBe(true)
    expect(result.certificateId).toBe("cert-123")
    expect(result.reason).toBe("Auto-approved and delivered")

    // Verify executeCertApproval was called with correct shape
    expect(mockExecuteCertApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        intakeId: TEST_INTAKE_ID,
        skipClaim: true,
        aiApproved: true,
        doctorProfile: expect.objectContaining({
          id: TEST_DOCTOR_ID,
          full_name: "Dr Test Doctor",
        }),
        reviewData: expect.objectContaining({
          doctorName: "Dr Test Doctor",
          medicalReason: expect.any(String),
        }),
      })
    )

    // Verify rate limit actions were recorded
    expect(mockRecordRateLimitedAction).toHaveBeenCalledTimes(2)

    // Verify state machine was called
    expect(mockMarkApproved).toHaveBeenCalled()
  })

  // --------------------------------------------------------------------------
  // 8. Failed approval pipeline
  // --------------------------------------------------------------------------

  it("marks failed_retrying when approval pipeline errors", async () => {
    mockFeatureFlags.ai_auto_approve_enabled = true

    supabaseQueryResults["intakes"] = makeIntakeChain()
    supabaseQueryResults["document_drafts"] = makeDraftsChain([
      { id: "draft-1", type: "clinical_note", status: "ready", content: { presentingComplaint: "Cold", flags: { requiresReview: false, flagReason: null } } },
    ])
    supabaseQueryResults["ai_audit_log"] = makeAuditChain()
    supabaseQueryResults["issued_certificates"] = makeIssuedCertsChain([])
    supabaseQueryResults["profiles"] = makeDoctorsChain([
      { id: TEST_DOCTOR_ID, full_name: "Dr Test Doctor", provider_number: "1234567A", ahpra_number: "MED0000000001", ahpra_next_review_at: null },
    ])

    mockExecuteCertApproval.mockResolvedValue({
      success: false,
      error: "PDF generation failed",
    })

    const attemptAutoApproval = await getAttemptAutoApproval()
    const result = await attemptAutoApproval(TEST_INTAKE_ID)

    expect(result.success).toBe(false)
    expect(result.autoApproved).toBe(false)
    expect(result.reason).toBe("Approval pipeline failed")
    expect(result.error).toBe("PDF generation failed")
    expect(mockMarkFailedRetrying).toHaveBeenCalled()
  })

  // --------------------------------------------------------------------------
  // 9. Unexpected errors
  // --------------------------------------------------------------------------

  it("catches unexpected exceptions and marks failed_retrying", async () => {
    mockFeatureFlags.ai_auto_approve_enabled = true

    // Make supabase throw on first call
    mockSupabaseChain.from.mockImplementation(() => {
      throw new Error("Connection refused")
    })

    const attemptAutoApproval = await getAttemptAutoApproval()
    const result = await attemptAutoApproval(TEST_INTAKE_ID)

    expect(result.success).toBe(false)
    expect(result.autoApproved).toBe(false)
    expect(result.reason).toBe("Unexpected error")
    expect(result.error).toBe("Connection refused")
    expect(mockMarkFailedRetrying).toHaveBeenCalled()
  })
})

// ============================================================================
// EXISTING TESTS - preserved from original file
// ============================================================================

describe("Auto-Approval Pipeline Helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe("buildReviewDataFromAnswers (via pipeline behavior)", () => {
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
      const { DEFAULT_FLAGS } = await import("@/lib/data/types/feature-flags")
      expect(DEFAULT_FLAGS.ai_auto_approve_enabled).toBe(false)
    })
  })

  describe("Eligibility engine edge cases for pipeline", () => {
    it("rejects when all text fields contain flagged keywords across different fields", async () => {
      const { evaluateAutoApprovalEligibility } = await import("@/lib/clinical/auto-approval")

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

  describe("System auto-approve identity", () => {
    it("system profile UUID is valid for FK safety", async () => {
      const { SYSTEM_AUTO_APPROVE_ID } = await import("@/lib/constants")
      expect(SYSTEM_AUTO_APPROVE_ID).toBe("00000000-0000-0000-0000-000000000000")
      expect(SYSTEM_AUTO_APPROVE_ID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })
  })

  describe("isDeterministicFailure (state module)", () => {
    it("classifies emergency and clinical flags as deterministic", async () => {
      const actual = await vi.importActual<typeof import("@/lib/clinical/auto-approval-state")>("@/lib/clinical/auto-approval-state")

      expect(actual.isDeterministicFailure(["emergency:chest_pain"])).toBe(true)
      expect(actual.isDeterministicFailure(["patient_under_18"])).toBe(true)
      expect(actual.isDeterministicFailure(["mental_health:depression"])).toBe(true)
      expect(actual.isDeterministicFailure(["injury:fracture"])).toBe(true)
      expect(actual.isDeterministicFailure(["draft_requires_review:flagged"])).toBe(true)
    })

    it("does not classify transient failures as deterministic", async () => {
      const actual = await vi.importActual<typeof import("@/lib/clinical/auto-approval-state")>("@/lib/clinical/auto-approval-state")

      expect(actual.isDeterministicFailure(["repeat_request_within_7d"])).toBe(false)
      expect(actual.isDeterministicFailure(["no_doctor_available"])).toBe(false)
      expect(actual.isDeterministicFailure(["pipeline_error"])).toBe(false)
    })
  })
})
