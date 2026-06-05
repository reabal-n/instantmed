import { beforeEach, describe, expect, it, vi } from "vitest"

import { POST } from "@/app/api/webhooks/parchment/route"

const mocks = vi.hoisted(() => ({
  captureMessage: vi.fn(),
  getIntakeWithDetails: vi.fn(),
  logAuditEvent: vi.fn(),
  logWebhookFailure: vi.fn(),
  logExternalPrescribingIndicated: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  getPatientPrescriptions: vi.fn(),
  state: {
    candidateRows: [] as Array<Record<string, unknown>>,
    patientProfileFound: true,
    prescriptionUpserts: [] as Array<Record<string, unknown>>,
    prescriberRows: [] as Array<{ id: string }>,
  },
  sendEmail: vi.fn(),
  updateScriptSent: vi.fn(),
  verifyWebhookSignature: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: mocks.captureMessage,
}))

vi.mock("@/lib/audit/compliance-audit", () => ({
  logExternalPrescribingIndicated: mocks.logExternalPrescribingIndicated,
}))

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mocks.logAuditEvent,
  logWebhookFailure: mocks.logWebhookFailure,
}))

vi.mock("@/lib/data/intakes", () => ({
  getIntakeWithDetails: mocks.getIntakeWithDetails,
  updateScriptSent: mocks.updateScriptSent,
}))

vi.mock("@/lib/email/components/templates/script-sent", () => ({
  ScriptSentEmail: () => null,
  scriptSentEmailSubject: () => "Your eScript is ready",
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: mocks.sendEmail,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@/lib/parchment/client", () => ({
  getPatientPrescriptions: mocks.getPatientPrescriptions,
  verifyWebhookSignature: mocks.verifyWebhookSignature,
}))

const PATIENT_PROFILE_ID = "11111111-1111-4111-8111-111111111111"
const PRESCRIBER_PROFILE_ID = "22222222-2222-4222-8222-222222222222"
const INTAKE_ID = "33333333-3333-4333-8333-333333333333"
const SCID = "SCID-ROUTE-123"

function createQuery(table: string, operation: "select" | "update") {
  const filters: Record<string, unknown> = {}

  const query = {
    eq(column: string, value: unknown) {
      filters[column] = value
      return query
    },
    in(column: string, value: unknown) {
      filters[column] = value
      if (table === "profiles" && operation === "select") {
        return Promise.resolve({
          data: mocks.state.prescriberRows,
          error: null,
        })
      }
      return query
    },
    is(column: string, value: unknown) {
      filters[column] = value
      return query
    },
    or(value: string) {
      filters.or = value
      return query
    },
    limit() {
      return Promise.resolve({
        data: mocks.state.candidateRows,
        error: null,
      })
    },
    maybeSingle() {
      if (table === "intakes" && operation === "update") {
        return Promise.resolve({ data: { id: INTAKE_ID, parchment_reference: SCID }, error: null })
      }

      return Promise.resolve({ data: null, error: null })
    },
    order() {
      return query
    },
    select() {
      return query
    },
    single() {
      if (table === "profiles" && filters.parchment_patient_id) {
        return Promise.resolve({ data: null, error: { message: "not found" } })
      }

      if (table === "profiles" && filters.id === PATIENT_PROFILE_ID && mocks.state.patientProfileFound) {
        return Promise.resolve({ data: { id: PATIENT_PROFILE_ID }, error: null })
      }

      return Promise.resolve({ data: null, error: { message: "not found" } })
    },
  }

  return query
}

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from(table: string) {
      return {
        select: () => createQuery(table, "select"),
        update: () => createQuery(table, "update"),
        upsert: (payload: Record<string, unknown>) => {
          if (table === "prescriptions") {
            mocks.state.prescriptionUpserts.push(payload)
          }
          return {
            select: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: "prescription-1" }, error: null }),
            }),
          }
        },
      }
    },
  }),
}))

function makeWebhookRequest() {
  const payload = {
    data: {
      partner_patient_id: PATIENT_PROFILE_ID,
      patient_id: "parchment-patient-1",
      scid: SCID,
      user_id: "parchment-user-1",
    },
    event_id: "evt_route_1",
    event_type: "prescription.created",
    organization_id: "org-1",
    partner_id: "partner-1",
    timestamp: "2026-05-01T00:00:00.000Z",
  }

  return new Request("https://instantmed.example/api/webhooks/parchment", {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
      "x-webhook-signature": "t=1777610000,v1=test",
    },
    method: "POST",
  })
}

describe("Parchment webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.PARCHMENT_WEBHOOK_SECRET = "webhook-secret"
    delete process.env.PLAYWRIGHT
    delete process.env.NEXT_PUBLIC_PLAYWRIGHT
    delete process.env.PARCHMENT_ORGANIZATION_ID
    delete process.env.PARCHMENT_PARTNER_ID
    mocks.verifyWebhookSignature.mockReturnValue({ valid: true })
    mocks.updateScriptSent.mockResolvedValue(true)
    mocks.getPatientPrescriptions.mockResolvedValue({
      prescriptions: [
        {
          scid: SCID,
          item_name: "Metformin Tablet",
          item_strength: "1 g",
          item_form: "Tablet",
          quantity: "30",
          number_of_repeats_authorised: "2",
          patient_instructions: "Take one tablet daily",
          created_date: "2026-05-04T09:15:00.000Z",
          status: "active",
        },
      ],
    })
    mocks.getIntakeWithDetails.mockResolvedValue(null)
    mocks.state.patientProfileFound = true
    mocks.state.prescriptionUpserts = []
    mocks.state.prescriberRows = [{ id: PRESCRIBER_PROFILE_ID }]
    mocks.state.candidateRows = [
      {
        category: "prescription",
        claimed_by: PRESCRIBER_PROFILE_ID,
        created_at: "2026-05-01T00:00:00.000Z",
        id: INTAKE_ID,
        reviewed_by: null,
        reviewing_doctor_id: null,
        service: { type: "repeat_rx" },
        subtype: null,
      },
    ]
  })

  it("logs external prescribing boundary evidence when Parchment completes a script", async () => {
    const response = await POST(makeWebhookRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ received: true })
    expect(mocks.updateScriptSent).toHaveBeenCalledWith(
      INTAKE_ID,
      true,
      "Webhook event: evt_route_1",
      SCID,
      PRESCRIBER_PROFILE_ID,
    )
    expect(mocks.logExternalPrescribingIndicated).toHaveBeenCalledWith(
      INTAKE_ID,
      "repeat_rx",
      PRESCRIBER_PROFILE_ID,
      SCID,
    )
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin_action",
        actorId: PRESCRIBER_PROFILE_ID,
        actorType: "system",
        intakeId: INTAKE_ID,
        metadata: expect.objectContaining({
          action_type: "parchment_webhook_script_sent",
          event_id: "evt_route_1",
          patient_id: PATIENT_PROFILE_ID,
          prescription_synced: true,
          scid: SCID,
          script_sent: true,
        }),
      }),
    )
  })

  it("keeps the Playwright-only Parchment sync skip quiet after script evidence", async () => {
    process.env.PLAYWRIGHT = "1"

    const response = await POST(makeWebhookRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ received: true, scriptSent: true, syncSkipped: true })
    expect(mocks.updateScriptSent).toHaveBeenCalledWith(
      INTAKE_ID,
      true,
      "Webhook event: evt_route_1",
      SCID,
      PRESCRIBER_PROFILE_ID,
    )
    expect(mocks.getPatientPrescriptions).not.toHaveBeenCalled()
    expect(mocks.logWebhookFailure).not.toHaveBeenCalled()
    expect(mocks.captureMessage).not.toHaveBeenCalled()
    expect(mocks.logger.warn).not.toHaveBeenCalledWith(
      "Webhook marked script sent; prescription PMS sync still pending",
      expect.anything(),
    )
    expect(mocks.logger.info).toHaveBeenCalledWith(
      "Webhook marked script sent; E2E prescription PMS sync skipped",
      { eventId: "evt_route_1" },
    )
  })

  it("alerts operators when a standalone Parchment prescription cannot be synced", async () => {
    mocks.state.candidateRows = []
    mocks.getPatientPrescriptions.mockRejectedValue(new Error("Parchment read failed"))

    const response = await POST(makeWebhookRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      received: true,
      warning: "No active prescribing intake found",
      syncPending: true,
    })
    expect(mocks.updateScriptSent).not.toHaveBeenCalled()
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      "Parchment prescription could not be synced to PMS",
      expect.objectContaining({
        level: "warning",
        tags: expect.objectContaining({
          source: "parchment-webhook",
          unmatched_reason: "prescription_sync_failed",
        }),
      }),
    )
    expect(mocks.logWebhookFailure).toHaveBeenCalledWith(
      "evt_route_1",
      "parchment:prescription.created",
      null,
      "prescription_sync_failed",
      expect.objectContaining({
        patient_id: PATIENT_PROFILE_ID,
        parchment_patient_id: "parchment-patient-1",
        partner_patient_id: PATIENT_PROFILE_ID,
        patient_profile_id: PATIENT_PROFILE_ID,
        prescriber_profile_id: PRESCRIBER_PROFILE_ID,
        prescriber_user_id: "parchment-user-1",
        scid: SCID,
      }),
    )
  })

  it("syncs a standalone Parchment prescription to the PMS when no paid intake exists", async () => {
    mocks.state.candidateRows = []

    const response = await POST(makeWebhookRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ received: true, syncedPrescription: true })
    expect(mocks.updateScriptSent).not.toHaveBeenCalled()
    expect(mocks.logWebhookFailure).not.toHaveBeenCalledWith(
      "evt_route_1",
      "parchment:prescription.created",
      null,
      "no_awaiting_script_intake",
    )
    expect(mocks.state.prescriptionUpserts).toHaveLength(1)
    expect(mocks.state.prescriptionUpserts[0]).toMatchObject({
      patient_id: PATIENT_PROFILE_ID,
      prescriber_id: PRESCRIBER_PROFILE_ID,
      intake_id: null,
      parchment_reference: SCID,
      medication_name: "Metformin Tablet",
      medication_strength: "1 g",
      dosage_instructions: "Take one tablet daily",
      quantity_prescribed: 30,
      repeats_allowed: 2,
      status: "active",
      issued_date: "2026-05-04",
    })
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin_action",
        actorId: PRESCRIBER_PROFILE_ID,
        actorType: "system",
        metadata: expect.objectContaining({
          action_type: "parchment_webhook_prescription_synced",
          patient_id: PATIENT_PROFILE_ID,
          scid: SCID,
          script_sent: false,
        }),
      }),
    )
  })

  it("logs durable ops visibility when matched Parchment script completion fails", async () => {
    mocks.updateScriptSent.mockResolvedValue(false)

    const response = await POST(makeWebhookRequest())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: "Failed to update intake" })
    expect(mocks.logWebhookFailure).toHaveBeenCalledWith(
      "evt_route_1",
      "parchment:prescription.created",
      INTAKE_ID,
      "script_completion_failed",
      expect.objectContaining({
        patient_id: PATIENT_PROFILE_ID,
        parchment_patient_id: "parchment-patient-1",
        partner_patient_id: PATIENT_PROFILE_ID,
        patient_profile_id: PATIENT_PROFILE_ID,
        prescriber_profile_id: PRESCRIBER_PROFILE_ID,
        prescriber_user_id: "parchment-user-1",
        scid: SCID,
      }),
    )
  })
})
