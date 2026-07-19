import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  updateDeliveryStatus: vi.fn(() => Promise.resolve()),
  posthogCapture: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/monitoring/delivery-tracking", () => ({
  updateDeliveryStatus: mocks.updateDeliveryStatus,
}))

vi.mock("@/lib/analytics/posthog-server", () => ({
  capturePersonlessPostHogEvent: mocks.posthogCapture,
}))

type ResendEventType = "email.delivered" | "email.bounced" | "email.complained"

type QueryState = {
  action?: "select" | "update"
  columns?: string
  filters: Record<string, unknown>
  payload?: Record<string, unknown>
  table: string
}

const OUTBOX_ID = "email-log-1"
const PATIENT_ID = "patient-1"
const PROVIDER_ID = "re_test_medcert_1"
const PATIENT_EMAIL = "patient@example.test"

function createResendRequest(type: ResendEventType, overrides: Record<string, unknown> = {}) {
  const payload = {
    type,
    created_at: "2026-05-11T00:00:00.000Z",
    data: {
      email_id: PROVIDER_ID,
      from: "InstantMed <support@instantmed.com.au>",
      to: [PATIENT_EMAIL],
      subject: "Your medical certificate",
      created_at: "2026-05-11T00:00:00.000Z",
      ...overrides,
    },
  }

  return new NextRequest("https://instantmed.test/api/webhooks/resend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })
}

function createSupabaseMock(options: { initialBounced?: boolean } = {}) {
  const updates: QueryState[] = []
  const upserts: QueryState[] = []

  const resolveSelect = (state: QueryState) => {
    if (state.table === "email_outbox" && state.columns === "metadata, patient_id") {
      return {
        data: {
          metadata: { source: "send-email" },
          patient_id: PATIENT_ID,
        },
        error: null,
      }
    }

    if (state.table === "email_outbox" && state.columns?.includes("certificate_id")) {
      return {
        data: {
          id: OUTBOX_ID,
          status: "sent",
          delivery_status: null,
          certificate_id: null,
          email_type: "med_cert_patient",
        },
        error: null,
      }
    }

    if (state.table === "email_outbox" && state.columns === "metadata") {
      return {
        data: { metadata: { source: "send-email" } },
        error: null,
      }
    }

    if (state.table === "profiles" && state.columns === "id, email_delivery_failures") {
      return {
        data: { id: PATIENT_ID, email_delivery_failures: 0 },
        error: null,
      }
    }

    if (state.table === "profiles" && state.columns === "id, email_bounced") {
      return {
        data: options.initialBounced ? { id: PATIENT_ID, email_bounced: true } : null,
        error: null,
      }
    }

    if (state.table === "profiles" && state.columns === "id") {
      return { data: { id: PATIENT_ID }, error: null }
    }

    return { data: null, error: null }
  }

  const resolveMutation = (state: QueryState) => {
    updates.push({ ...state, filters: { ...state.filters } })
    return Promise.resolve({ data: null, error: null })
  }

  const from = vi.fn((table: string) => {
    const state: QueryState = { table, filters: {} }
    const query = {
      select: vi.fn((columns: string) => {
        state.action = "select"
        state.columns = columns
        return query
      }),
      update: vi.fn((payload: Record<string, unknown>) => {
        state.action = "update"
        state.payload = payload
        return query
      }),
      upsert: vi.fn((payload: Record<string, unknown>) => {
        state.payload = payload
        upserts.push({ ...state, action: "update", filters: { ...state.filters } })
        return Promise.resolve({ data: null, error: null })
      }),
      eq: vi.fn((column: string, value: unknown) => {
        state.filters[column] = value
        return query
      }),
      maybeSingle: vi.fn(() => Promise.resolve(resolveSelect(state))),
      single: vi.fn(() => Promise.resolve(resolveSelect(state))),
      then: vi.fn((resolve: (value: { data: null; error: null }) => void) => {
        resolveMutation(state).then(resolve)
      }),
    }

    return query
  })

  return {
    client: { from },
    updates,
    upserts,
  }
}

describe("Resend webhook contract", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it("marks delivered med-cert email rows and clears a prior bounce flag", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock({ initialBounced: true })
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest("email.delivered"))

    await expect(response.json()).resolves.toMatchObject({ received: true, matched: true, updated: true })

    expect(supabase.updates).toContainEqual(expect.objectContaining({
      table: "profiles",
      payload: expect.objectContaining({
        email_bounced: false,
        email_bounce_reason: null,
        email_delivery_failures: 0,
      }),
    }))
    expect(supabase.updates).toContainEqual(expect.objectContaining({
      table: "email_outbox",
      payload: expect.objectContaining({
        delivery_status: "delivered",
        status: "sent",
        metadata: expect.objectContaining({
          processed_events: [`${PROVIDER_ID}:email.delivered`],
        }),
      }),
    }))
    expect(mocks.updateDeliveryStatus).toHaveBeenCalledWith(PROVIDER_ID, "delivered")
    expect(mocks.posthogCapture).toHaveBeenCalledWith(expect.objectContaining({
      event: "email_delivered",
      requestId: PROVIDER_ID,
    }))
  })

  it("marks hard bounces as failed and records suppression metadata", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest("email.bounced", {
      bounce: { message: "Mailbox unavailable", type: "hard" },
    }))

    await expect(response.json()).resolves.toMatchObject({ received: true, matched: true, updated: true })

    expect(supabase.updates).toContainEqual(expect.objectContaining({
      table: "profiles",
      payload: expect.objectContaining({
        email_bounced: true,
        email_bounce_reason: "hard: Mailbox unavailable",
        email_delivery_failures: 1,
      }),
    }))
    expect(supabase.updates).toContainEqual(expect.objectContaining({
      table: "email_outbox",
      payload: expect.objectContaining({
        delivery_status: "bounced",
        status: "failed",
        error_message: "Mailbox unavailable",
        metadata: expect.objectContaining({
          bounce_type: "hard",
          processed_events: [`${PROVIDER_ID}:email.bounced`],
        }),
      }),
    }))
    expect(mocks.updateDeliveryStatus).toHaveBeenCalledWith(PROVIDER_ID, "bounced", { bounceType: "hard" })
  })

  it("marks complaints as failed so they stay visible in the ops issue feed", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest("email.complained"))

    await expect(response.json()).resolves.toMatchObject({ received: true, matched: true, updated: true })

    expect(supabase.updates).toContainEqual(expect.objectContaining({
      table: "profiles",
      payload: expect.objectContaining({
        email_bounced: true,
        email_bounce_reason: "complaint: Spam complaint",
      }),
    }))
    expect(supabase.upserts).toContainEqual(expect.objectContaining({
      table: "email_preferences",
      payload: expect.objectContaining({
        profile_id: PATIENT_ID,
        marketing_emails: false,
        abandoned_checkout_emails: false,
        unsubscribe_reason: "spam_complaint",
      }),
    }))
    expect(supabase.updates).toContainEqual(expect.objectContaining({
      table: "email_outbox",
      payload: expect.objectContaining({
        delivery_status: "complained",
        status: "failed",
        metadata: expect.objectContaining({
          processed_events: [`${PROVIDER_ID}:email.complained`],
        }),
      }),
    }))
    expect(mocks.updateDeliveryStatus).toHaveBeenCalledWith(
      PROVIDER_ID,
      "failed",
      { errorMessage: "Complaint received" },
    )
  })
})
