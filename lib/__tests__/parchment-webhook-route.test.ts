import { beforeEach, describe, expect, it, vi } from "vitest"

import { POST } from "@/app/api/webhooks/parchment/route"

const mocks = vi.hoisted(() => ({
  captureMessage: vi.fn(),
  getIntakeWithDetails: vi.fn(),
  logWebhookFailure: vi.fn(),
  logExternalPrescribingIndicated: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  state: {
    candidateRows: [] as Array<Record<string, unknown>>,
    patientProfileFound: true,
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
    delete process.env.PARCHMENT_ORGANIZATION_ID
    delete process.env.PARCHMENT_PARTNER_ID
    mocks.verifyWebhookSignature.mockReturnValue({ valid: true })
    mocks.updateScriptSent.mockResolvedValue(true)
    mocks.getIntakeWithDetails.mockResolvedValue(null)
    mocks.state.patientProfileFound = true
    mocks.state.prescriberRows = [{ id: PRESCRIBER_PROFILE_ID }]
    mocks.state.candidateRows = [
      {
        claimed_by: PRESCRIBER_PROFILE_ID,
        created_at: "2026-05-01T00:00:00.000Z",
        id: INTAKE_ID,
        reviewed_by: null,
        reviewing_doctor_id: null,
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
  })

  it("alerts operators when a valid Parchment script event cannot be matched to an intake", async () => {
    mocks.state.candidateRows = []

    const response = await POST(makeWebhookRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ received: true, warning: "No awaiting_script intake found" })
    expect(mocks.updateScriptSent).not.toHaveBeenCalled()
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      "Parchment webhook could not match prescription.created to an intake",
      expect.objectContaining({
        level: "warning",
        tags: expect.objectContaining({
          source: "parchment-webhook",
          unmatched_reason: "no_awaiting_script_intake",
        }),
      }),
    )
    expect(mocks.logWebhookFailure).toHaveBeenCalledWith(
      "evt_route_1",
      "parchment:prescription.created",
      null,
      "no_awaiting_script_intake",
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
    )
  })
})
