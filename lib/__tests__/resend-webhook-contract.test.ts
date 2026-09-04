import { createHash } from "node:crypto"

import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  posthogCapture: vi.fn(),
  sentryCaptureException: vi.fn(),
  sentryCaptureMessage: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.sentryCaptureException,
  captureMessage: mocks.sentryCaptureMessage,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/analytics/posthog-server", () => ({
  capturePersonlessPostHogEvent: mocks.posthogCapture,
}))

type ResendEventType =
  | "email.bounced"
  | "email.clicked"
  | "email.complained"
  | "email.delivered"

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
const PATIENT_EMAIL_HASH = createHash("sha256").update(PATIENT_EMAIL).digest("hex")

function createResendRequest(
  type: ResendEventType | string | null,
  overrides: Record<string, unknown> = {},
  eventCreatedAt = "2026-05-11T00:00:00.000Z",
) {
  const payload = {
    type,
    created_at: eventCreatedAt,
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

function createSupabaseMock(options: {
  duplicate?: boolean
  emailType?: string
  emailIsTest?: boolean
  initialBounced?: boolean
  matched?: boolean
  authEmailMatched?: boolean
  authRecipientHash?: string
  authEmailError?: { message: string } | null
  authEmailUpdateError?: { message: string } | null
  authComplaintProfileError?: { message: string } | null
  authComplaintProfileMatched?: boolean
  authComplaintPreferenceError?: { message: string } | null
  rpcData?: unknown
  rpcError?: { message: string } | null
} = {}) {
  const updates: QueryState[] = []
  const upserts: QueryState[] = []
  const selects: QueryState[] = []

  const resolveSelect = (state: QueryState) => {
    if (state.table === "auth_email_events" && state.columns === "id, recipient_hash") {
      return {
        data: options.authEmailMatched
          ? {
              id: "auth-email-event-1",
              recipient_hash: options.authRecipientHash ?? PATIENT_EMAIL_HASH,
            }
          : null,
        error: options.authEmailError ?? null,
      }
    }

    if (state.table === "profiles" && state.columns === "id") {
      return {
        data: options.authComplaintProfileMatched === false ? null : { id: PATIENT_ID },
        error: options.authComplaintProfileError ?? null,
      }
    }

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

    return { data: null, error: null }
  }

  const resolveMutation = (state: QueryState) => {
    updates.push({ ...state, filters: { ...state.filters } })
    return Promise.resolve({
      data: null,
      error: state.table === "auth_email_events"
        ? options.authEmailUpdateError ?? null
        : null,
    })
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
      upsert: vi.fn((
        payload: Record<string, unknown>,
        upsertOptions?: Record<string, unknown>,
      ) => {
        state.payload = payload
        state.filters = { ...state.filters, upsertOptions }
        upserts.push({ ...state, action: "update", filters: { ...state.filters } })
        return Promise.resolve({
          data: null,
          error: state.table === "email_preferences"
            ? options.authComplaintPreferenceError ?? null
            : null,
        })
      }),
      eq: vi.fn((column: string, value: unknown) => {
        state.filters[column] = value
        return query
      }),
      neq: vi.fn((column: string, value: unknown) => {
        state.filters[`${column}:neq`] = value
        return query
      }),
      is: vi.fn((column: string, value: unknown) => {
        state.filters[`${column}:is`] = value
        return query
      }),
      limit: vi.fn(() => query),
      maybeSingle: vi.fn(() => {
        selects.push({ ...state, filters: { ...state.filters } })
        return Promise.resolve(resolveSelect(state))
      }),
      single: vi.fn(() => Promise.resolve(resolveSelect(state))),
      then: vi.fn((resolve: (value: {
        data: null
        error: { message: string } | null
      }) => void) => {
        resolveMutation(state).then(resolve)
      }),
    }

    return query
  })

  const rpcSingle = vi.fn(async () => ({
    data: options.rpcData ?? {
      matched: options.matched ?? true,
      duplicate: options.duplicate ?? false,
      outbox_id: OUTBOX_ID,
      email_type: options.emailType ?? "refill_reminder",
      email_is_test: options.emailIsTest ?? false,
    },
    error: options.rpcError ?? null,
  }))
  const complaintRpc = vi.fn(async () => ({
    data: true,
    error: options.authComplaintPreferenceError ?? null,
  }))
  const rpc = vi.fn((name: string) => name === "record_email_spam_complaint"
    ? complaintRpc()
    : { single: rpcSingle })

  return {
    client: { from, rpc },
    complaintRpc,
    rpc,
    rpcSingle,
    selects,
    updates,
    upserts,
  }
}

describe("Resend webhook contract", () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it("keeps delivered-state mirrors inside the atomic receipt boundary", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock({ initialBounced: true })
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest("email.delivered"))

    await expect(response.json()).resolves.toMatchObject({ received: true, matched: true, updated: true })

    expect(supabase.rpc).toHaveBeenCalledWith("record_resend_outbox_event", {
      p_bounce_type: null,
      p_error_message: null,
      p_event_created_at: "2026-05-11T00:00:00.000Z",
      p_event_type: "email.delivered",
      p_provider_detail_type: null,
      p_provider_message_id: PROVIDER_ID,
    })
    expect(supabase.updates).toEqual([])
    expect(mocks.posthogCapture).toHaveBeenCalledWith(expect.objectContaining({
      event: "email_delivered",
      requestId: PROVIDER_ID,
    }))
  })

  it("keeps hard-bounce suppression and delivery mirrors inside the atomic receipt boundary", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest("email.bounced", {
      bounce: { message: "Mailbox unavailable", type: "Permanent" },
    }))

    await expect(response.json()).resolves.toMatchObject({ received: true, matched: true, updated: true })

    expect(supabase.rpc).toHaveBeenCalledWith("record_resend_outbox_event", {
      p_bounce_type: "hard",
      p_error_message: "Mailbox unavailable",
      p_event_created_at: "2026-05-11T00:00:00.000Z",
      p_event_type: "email.bounced",
      p_provider_detail_type: null,
      p_provider_message_id: PROVIDER_ID,
    })
    expect(supabase.updates).toEqual([])
  })

  it.each(["cert_ready", "med_cert_patient", "script_sent"])(
    "preserves critical hard-bounce alerting for %s fulfilment email",
    async (emailType) => {
      vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
      const supabase = createSupabaseMock({ emailType })
      mocks.createServiceRoleClient.mockReturnValue(supabase.client)

      const { POST } = await import("@/app/api/webhooks/resend/route")
      const response = await POST(createResendRequest("email.bounced", {
        bounce: { message: "Mailbox unavailable", type: "Permanent" },
      }))

      expect(response.status).toBe(200)
      expect(mocks.sentryCaptureMessage).toHaveBeenCalledWith(
        "Critical fulfilment email bounced",
        expect.objectContaining({
          level: "error",
          tags: expect.objectContaining({
            bounce_type: "hard",
            email_type: emailType,
            source: "resend-webhook",
          }),
        }),
      )
    },
  )

  it.each([
    ["Transient", "soft"],
    ["Temporary", "soft"],
    ["Undetermined", "soft"],
    ["hard", "hard"],
    ["soft", "soft"],
  ])("normalizes Resend bounce type %s to %s", async (providerType, expectedType) => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest("email.bounced", {
      bounce: { message: "Mailbox unavailable", type: providerType },
    }))

    expect(response.status).toBe(200)
    expect(supabase.rpc).toHaveBeenCalledWith(
      "record_resend_outbox_event",
      expect.objectContaining({ p_bounce_type: expectedType }),
    )
  })

  it("keeps complaint suppression and unsubscribe mirrors inside the atomic receipt boundary", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest("email.complained"))

    await expect(response.json()).resolves.toMatchObject({ received: true, matched: true, updated: true })

    expect(supabase.rpc).toHaveBeenCalledWith("record_resend_outbox_event", {
      p_bounce_type: null,
      p_error_message: null,
      p_event_created_at: "2026-05-11T00:00:00.000Z",
      p_event_type: "email.complained",
      p_provider_detail_type: null,
      p_provider_message_id: PROVIDER_ID,
    })
    expect(supabase.updates).toEqual([])
    expect(supabase.upserts).toEqual([])
  })

  it("records an observed provider click atomically and tags PostHog from trusted outbox metadata", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock({ emailIsTest: true })
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest("email.clicked", {
      click: {
        link: "https://instantmed.test/prescriptions",
        timestamp: "2026-05-11T00:01:00.000Z",
        user_agent: "provider-scanner",
      },
    }))

    await expect(response.json()).resolves.toMatchObject({ received: true, matched: true, updated: true })
    expect(supabase.rpc).toHaveBeenCalledWith("record_resend_outbox_event", {
      p_bounce_type: null,
      p_error_message: null,
      p_event_created_at: "2026-05-11T00:00:00.000Z",
      p_event_type: "email.clicked",
      p_provider_detail_type: null,
      p_provider_message_id: PROVIDER_ID,
    })
    expect(mocks.posthogCapture).toHaveBeenCalledWith({
      event: "email_clicked",
      requestId: PROVIDER_ID,
      properties: {
        email_is_test: true,
        email_type: "refill_reminder",
      },
    })
  })

  it("does not repeat side effects after the atomic receipt reports a duplicate", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock({ duplicate: true })
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest("email.delivered"))

    await expect(response.json()).resolves.toEqual({ received: true, duplicate: true })
    expect(mocks.posthogCapture).not.toHaveBeenCalled()
    expect(supabase.updates).toEqual([])
  })

  it("acknowledges a managed auth email when no outbox row owns the provider id", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock({ matched: false, authEmailMatched: true })
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest("email.delivered"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      received: true,
      matched: true,
      tracked: false,
    })
    expect(supabase.client.from).toHaveBeenCalledWith("auth_email_events")
    expect(supabase.updates).toEqual([])
    expect(mocks.posthogCapture).not.toHaveBeenCalled()
  })

  it.each([
    ["email.failed", { failed: { reason: "reached_daily_quota" } }],
    ["email.suppressed", {
      suppressed: {
        message: "Address is on the account suppression list",
        type: "OnAccountSuppressionList",
      },
    }],
    ["email.bounced", {
      bounce: { message: "Mailbox unavailable", type: "Permanent" },
    }],
  ])(
    "marks a managed auth email failed for terminal provider event %s idempotently",
    async (eventType, payload) => {
      vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
      const supabase = createSupabaseMock({ matched: false, authEmailMatched: true })
      mocks.createServiceRoleClient.mockReturnValue(supabase.client)

      const { POST } = await import("@/app/api/webhooks/resend/route")
      const firstResponse = await POST(createResendRequest(eventType, payload))
      const duplicateResponse = await POST(createResendRequest(eventType, payload))

      expect(firstResponse.status).toBe(200)
      expect(duplicateResponse.status).toBe(200)
      expect(supabase.updates).toHaveLength(2)
      expect(supabase.updates).toEqual([
        expect.objectContaining({
          filters: {
            id: "auth-email-event-1",
            "status:neq": "failed",
          },
          payload: {
            error_message: `Resend ${eventType}`,
            status: "failed",
          },
          table: "auth_email_events",
        }),
        expect.objectContaining({
          filters: {
            id: "auth-email-event-1",
            "status:neq": "failed",
          },
          payload: {
            error_message: `Resend ${eventType}`,
            status: "failed",
          },
          table: "auth_email_events",
        }),
      ])
      expect(mocks.posthogCapture).not.toHaveBeenCalled()
    },
  )

  it("persists a managed auth complaint only for the hash-bound active patient", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock({ matched: false, authEmailMatched: true })
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest("email.complained"))

    expect(response.status).toBe(200)
    expect(supabase.complaintRpc).toHaveBeenCalledWith()
    expect(supabase.rpc).toHaveBeenCalledWith("record_email_spam_complaint", {
      p_event_created_at: "2026-05-11T00:00:00.000Z",
      p_normalized_email: PATIENT_EMAIL,
    })
    // A complaint proves the auth message was delivered. It updates consent,
    // but must not trigger the critical undelivered-auth alert.
    expect(supabase.updates).toEqual([])
  })

  it("rejects a managed auth complaint whose recipient does not match its durable hash", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock({
      matched: false,
      authEmailMatched: true,
      authRecipientHash: createHash("sha256").update("other@example.test").digest("hex"),
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest("email.complained"))

    expect(response.status).toBe(400)
    expect(supabase.updates).toEqual([])
    expect(supabase.complaintRpc).not.toHaveBeenCalled()
  })

  it("retries a managed auth complaint when its sticky preference cannot be stored", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock({
      matched: false,
      authEmailMatched: true,
      authComplaintPreferenceError: { message: "preference write unavailable" },
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest("email.complained"))

    expect(response.status).toBe(500)
    expect(supabase.updates).toEqual([])
  })

  it("fails retryably when a managed auth terminal outcome cannot be recorded", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock({
      matched: false,
      authEmailMatched: true,
      authEmailUpdateError: { message: "auth update unavailable" },
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest("email.failed", {
      failed: { reason: "reached_daily_quota" },
    }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "Database error" })
  })

  it("returns a retryable response while a recent valid callback awaits provider-id finalization", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock({ matched: false })
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest(
      "email.delivered",
      {},
      new Date(Date.now() - 5_000).toISOString(),
    ))

    expect(response.status).toBe(503)
    expect(response.headers.get("retry-after")).toBe("5")
    await expect(response.json()).resolves.toEqual({
      error: "Email lifecycle record not ready",
      retryable: true,
    })
    expect(mocks.posthogCapture).not.toHaveBeenCalled()
  })

  it("acknowledges an old unmanaged callback after the bounded provider-id race window", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock({ matched: false })
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest(
      "email.delivered",
      {},
      new Date(Date.now() - 36 * 60_000).toISOString(),
    ))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      received: true,
      matched: false,
      tracked: false,
    })
    expect(mocks.posthogCapture).not.toHaveBeenCalled()
  })

  it("keeps the provider callback retryable through Resend's 30-minute retry", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock({ matched: false })
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest(
      "email.delivered",
      {},
      new Date(Date.now() - 30 * 60_000).toISOString(),
    ))

    expect(response.status).toBe(503)
    expect(response.headers.get("retry-after")).toBe("5")
  })

  it("fails retryably when the auth email ownership lookup errors", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock({
      matched: false,
      authEmailError: { message: "auth lookup unavailable" },
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest("email.delivered"))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "Database error" })
  })

  it.each([
    {
      eventType: "email.failed",
      payload: { failed: { reason: "reached_daily_quota" } },
      expectedError: "reached_daily_quota",
      expectedDetailType: null,
    },
    {
      eventType: "email.suppressed",
      payload: {
        suppressed: {
          message: "Address is on the account suppression list",
          type: "OnAccountSuppressionList",
        },
      },
      expectedError: "Address is on the account suppression list",
      expectedDetailType: "OnAccountSuppressionList",
    },
  ])(
    "records $eventType as a durable terminal provider outcome",
    async ({ eventType, payload, expectedError, expectedDetailType }) => {
      vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
      const supabase = createSupabaseMock({ emailType: "med_cert_patient" })
      mocks.createServiceRoleClient.mockReturnValue(supabase.client)

      const { POST } = await import("@/app/api/webhooks/resend/route")
      const response = await POST(createResendRequest(eventType, payload))

      expect(response.status).toBe(200)
      expect(supabase.rpc).toHaveBeenCalledWith("record_resend_outbox_event", {
        p_bounce_type: null,
        p_error_message: expectedError,
        p_event_created_at: "2026-05-11T00:00:00.000Z",
        p_event_type: eventType,
        p_provider_detail_type: expectedDetailType,
        p_provider_message_id: PROVIDER_ID,
      })
      expect(mocks.sentryCaptureMessage).toHaveBeenCalledWith(
        "Critical fulfilment email failed",
        expect.objectContaining({
          level: "error",
          tags: expect.objectContaining({
            email_type: "med_cert_patient",
            event_type: eventType,
          }),
        }),
      )
      for (const call of mocks.sentryCaptureMessage.mock.calls) {
        expect(call[1]).not.toMatchObject({
          tags: expect.objectContaining({ provider_reason_type: expect.anything() }),
        })
      }
      expect(mocks.posthogCapture).toHaveBeenCalledWith(expect.objectContaining({
        properties: expect.not.objectContaining({
          provider_reason_type: expect.anything(),
        }),
      }))
    },
  )

  it.each(["email.future_event", "domain.updated"])(
    "acknowledges signed but untracked provider event %s without entering the RPC",
    async (eventType) => {
      vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
      const supabase = createSupabaseMock()
      mocks.createServiceRoleClient.mockReturnValue(supabase.client)

      const { POST } = await import("@/app/api/webhooks/resend/route")
      const response = await POST(createResendRequest(eventType, { email_id: undefined }))

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({ received: true, tracked: false })
      expect(supabase.rpc).not.toHaveBeenCalled()
    },
  )

  it("rejects a malformed event without a string type", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest(null))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "Invalid payload" })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it("rejects a callback whose signed provider event timestamp is invalid", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest("email.delivered", {}, "not-a-timestamp"))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "Invalid payload" })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it("leaves out-of-order delivery reconciliation inside the atomic receipt", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock({
      initialBounced: true,
      rpcData: {
        matched: true,
        duplicate: false,
        outbox_id: OUTBOX_ID,
        email_type: "refill_reminder",
        email_is_test: false,
      },
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest("email.delivered"))

    await expect(response.json()).resolves.toMatchObject({ received: true, matched: true })
    expect(supabase.updates).not.toContainEqual(expect.objectContaining({ table: "profiles" }))
  })

  it("fails closed when the atomic receipt RPC returns a malformed row", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    const supabase = createSupabaseMock({
      rpcData: {
        matched: true,
        duplicate: false,
        outbox_id: null,
        email_type: "refill_reminder",
        email_is_test: false,
      },
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase.client)

    const { POST } = await import("@/app/api/webhooks/resend/route")
    const response = await POST(createResendRequest("email.clicked"))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "Database error" })
    expect(mocks.posthogCapture).not.toHaveBeenCalled()
    expect(supabase.updates).toEqual([])
  })
})
