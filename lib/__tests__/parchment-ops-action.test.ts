import { beforeEach, describe, expect, it, vi } from "vitest"

const AUDIT_ID = "11111111-1111-4111-8111-111111111111"
const PATIENT_ID = "22222222-2222-4222-8222-222222222222"
const STALE_PRESCRIBER_ID = "33333333-3333-4333-8333-333333333333"
const CURRENT_PRESCRIBER_ID = "44444444-4444-4444-8444-444444444444"
const ADMIN_ID = "55555555-5555-4555-8555-555555555555"

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  checkServerActionRateLimit: vi.fn(),
  createServiceRoleClient: vi.fn(),
  logAuditEvent: vi.fn(),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  requireRoleOrNull: vi.fn(),
  revalidateStaff: vi.fn(),
  setTag: vi.fn(),
  setUser: vi.fn(),
  syncParchmentPrescriptionToPms: vi.fn(),
  updateScriptSent: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
  setTag: mocks.setTag,
  setUser: mocks.setUser,
}))

vi.mock("@/lib/auth/helpers", () => ({
  getApiAuth: vi.fn(),
  requireRoleOrNull: mocks.requireRoleOrNull,
}))

vi.mock("@/lib/dashboard/revalidate-staff", () => ({
  revalidateStaff: mocks.revalidateStaff,
}))

vi.mock("@/lib/data/intakes", () => ({
  updateScriptSent: mocks.updateScriptSent,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@/lib/parchment/sync-prescription", () => ({
  syncParchmentPrescriptionToPms: mocks.syncParchmentPrescriptionToPms,
}))

vi.mock("@/lib/rate-limit/redis", () => ({
  checkServerActionRateLimit: mocks.checkServerActionRateLimit,
}))

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mocks.logAuditEvent,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

type QueryFixture = {
  limitData?: unknown
  maybeSingleData?: unknown
  error?: { message: string }
}

function createQuery(fixture: QueryFixture) {
  const query = {
    eq: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    limit: vi.fn(async () => ({ data: fixture.limitData ?? null, error: fixture.error ?? null })),
    maybeSingle: vi.fn(async () => ({ data: fixture.maybeSingleData ?? null, error: fixture.error ?? null })),
    select: vi.fn(),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.in.mockReturnValue(query)
  query.is.mockReturnValue(query)
  return query
}

function createSupabase(queries: ReturnType<typeof createQuery>[]) {
  let nextQuery = 0
  return {
    from: vi.fn(() => queries[nextQuery++]!),
  }
}

function webhookFailure() {
  return {
    action: "webhook_failed",
    id: AUDIT_ID,
    intake_id: null,
    metadata: {
      error: "intake_correlation_mismatch",
      eventId: "evt_123",
      eventType: "parchment:prescription.created",
      parchment_patient_id: "parchment-patient",
      patient_profile_id: PATIENT_ID,
      partner_patient_id: PATIENT_ID,
      prescriber_profile_id: STALE_PRESCRIBER_ID,
      prescriber_user_id: "parchment-prescriber",
      scid: "scid-123",
    },
  }
}

describe("retryParchmentWebhookFailureAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireRoleOrNull.mockResolvedValue({
      profile: { id: ADMIN_ID, role: "admin" },
      user: { id: "66666666-6666-4666-8666-666666666666" },
    })
    mocks.checkServerActionRateLimit.mockResolvedValue({ success: true })
    mocks.syncParchmentPrescriptionToPms.mockResolvedValue({
      prescriptionId: "prescription-123",
      success: true,
    })
    mocks.logAuditEvent.mockResolvedValue(undefined)
    mocks.updateScriptSent.mockResolvedValue(true)
  })

  it.each([
    { limitData: [{ id: PATIENT_ID }, { id: ADMIN_ID }] },
    { limitData: [] },
    { error: { message: "Database unavailable" } },
  ])("refuses ambiguous, missing or failed current patient links despite historical metadata: %j", async (patientFixture) => {
    mocks.createServiceRoleClient.mockReturnValue(createSupabase([
      createQuery({ maybeSingleData: webhookFailure() }),
      createQuery(patientFixture),
    ]))
    const { retryParchmentWebhookFailureAction } = await import("@/app/actions/parchment-ops")
    const result = await retryParchmentWebhookFailureAction(AUDIT_ID)
    expect(result.success).toBe(false)
    expect(result.error).toContain("Check the request and Parchment patient links")
    expect(mocks.syncParchmentPrescriptionToPms).not.toHaveBeenCalled()
    expect(mocks.updateScriptSent).not.toHaveBeenCalled()
  })

  it("pins a linked retry to its request, SCID and verified current patient instead of the old partner", async () => {
    const intakeId = "77777777-7777-4777-8777-777777777777"
    const failure = {
      ...webhookFailure(), intake_id: intakeId,
      metadata: { ...webhookFailure().metadata, partner_patient_id: ADMIN_ID, error: "script_completion_failed" },
    }
    const intakeQuery = createQuery({ maybeSingleData: { patient_id: PATIENT_ID, claimed_by: CURRENT_PRESCRIBER_ID } })
    mocks.createServiceRoleClient.mockReturnValue(createSupabase([
      createQuery({ maybeSingleData: failure }), intakeQuery,
      createQuery({ maybeSingleData: { id: CURRENT_PRESCRIBER_ID } }),
    ]))
    const { retryParchmentWebhookFailureAction } = await import("@/app/actions/parchment-ops")
    const result = await retryParchmentWebhookFailureAction(AUDIT_ID)
    expect(result).toMatchObject({ success: true, markedScriptSent: true })
    expect(intakeQuery.eq).toHaveBeenCalledWith("id", intakeId)
    expect(intakeQuery.eq).toHaveBeenCalledWith("parchment_reference", "scid-123")
    expect(intakeQuery.eq).toHaveBeenCalledWith("patient.parchment_patient_id", "parchment-patient")
    expect(mocks.syncParchmentPrescriptionToPms).toHaveBeenCalledWith(expect.objectContaining({
      intakeId, patientProfileId: PATIENT_ID,
    }))
  })

  it("does not sync or complete when the retry's request no longer matches its SCID and patient", async () => {
    mocks.createServiceRoleClient.mockReturnValue(createSupabase([
      createQuery({ maybeSingleData: { ...webhookFailure(), intake_id: AUDIT_ID } }),
      createQuery({ maybeSingleData: null }),
    ]))
    const { retryParchmentWebhookFailureAction } = await import("@/app/actions/parchment-ops")
    expect((await retryParchmentWebhookFailureAction(AUDIT_ID)).success).toBe(false)
    expect(mocks.syncParchmentPrescriptionToPms).not.toHaveBeenCalled()
    expect(mocks.updateScriptSent).not.toHaveBeenCalled()
  })

  it("rejects a linked retry when its current prescriber did not review the request", async () => {
    mocks.createServiceRoleClient.mockReturnValue(createSupabase([
      createQuery({ maybeSingleData: { ...webhookFailure(), intake_id: AUDIT_ID } }),
      createQuery({ maybeSingleData: { patient_id: PATIENT_ID, claimed_by: ADMIN_ID } }),
      createQuery({ maybeSingleData: { id: CURRENT_PRESCRIBER_ID } }),
    ]))
    const { retryParchmentWebhookFailureAction } = await import("@/app/actions/parchment-ops")
    const result = await retryParchmentWebhookFailureAction(AUDIT_ID)
    expect(result.success).toBe(false)
    expect(result.error).toContain("reviewing doctor")
    expect(mocks.syncParchmentPrescriptionToPms).not.toHaveBeenCalled()
    expect(mocks.updateScriptSent).not.toHaveBeenCalled()
  })

  it("rejects stale prescriber metadata and uses the single current Parchment link", async () => {
    const failureQuery = createQuery({ maybeSingleData: webhookFailure() })
    const patientQuery = createQuery({ limitData: [{ id: PATIENT_ID }] })
    const stalePrescriberQuery = createQuery({ maybeSingleData: null })
    const currentPrescriberQuery = createQuery({ limitData: [{ id: CURRENT_PRESCRIBER_ID }] })
    mocks.createServiceRoleClient.mockReturnValue(createSupabase([
      failureQuery,
      patientQuery,
      stalePrescriberQuery,
      currentPrescriberQuery,
    ]))

    const { retryParchmentWebhookFailureAction } = await import("@/app/actions/parchment-ops")
    const result = await retryParchmentWebhookFailureAction(AUDIT_ID)

    expect(result).toEqual({
      markedScriptSent: false,
      prescriptionId: "prescription-123",
      success: true,
    })
    expect(stalePrescriberQuery.eq).toHaveBeenCalledWith("id", STALE_PRESCRIBER_ID)
    expect(stalePrescriberQuery.eq).toHaveBeenCalledWith(
      "parchment_user_id",
      "parchment-prescriber",
    )
    expect(stalePrescriberQuery.in).toHaveBeenCalledWith("role", ["doctor", "admin"])
    expect(mocks.syncParchmentPrescriptionToPms).toHaveBeenCalledWith(expect.objectContaining({
      patientProfileId: PATIENT_ID,
      prescriberProfileId: CURRENT_PRESCRIBER_ID,
    }))
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        failure_audit_id: AUDIT_ID,
        patient_profile_id: PATIENT_ID,
        prescriber_profile_id: CURRENT_PRESCRIBER_ID,
        result: "success",
        scid: "scid-123",
      }),
    }))
  })

  it("fails closed when no current clinical profile owns the Parchment user", async () => {
    const failureQuery = createQuery({ maybeSingleData: webhookFailure() })
    const patientQuery = createQuery({ limitData: [{ id: PATIENT_ID }] })
    const stalePrescriberQuery = createQuery({ maybeSingleData: null })
    const currentPrescriberQuery = createQuery({ limitData: [] })
    mocks.createServiceRoleClient.mockReturnValue(createSupabase([
      failureQuery,
      patientQuery,
      stalePrescriberQuery,
      currentPrescriberQuery,
    ]))

    const { retryParchmentWebhookFailureAction } = await import("@/app/actions/parchment-ops")
    const result = await retryParchmentWebhookFailureAction(AUDIT_ID)

    expect(result).toEqual({
      error: "Could not match the Parchment prescriber to a linked InstantMed doctor.",
      success: false,
    })
    expect(mocks.syncParchmentPrescriptionToPms).not.toHaveBeenCalled()
    expect(mocks.logAuditEvent).not.toHaveBeenCalled()
  })
})
