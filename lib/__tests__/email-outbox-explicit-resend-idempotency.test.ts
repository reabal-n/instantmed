import { describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  insertCalled: false,
  genericLookupCalled: false,
  eqFilters: [] as Array<{ column: string; value: unknown }>,
  explicitExisting: false,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: () => {
        let explicitKeyLookup = false
        const chain = {
          eq: (column: string, value: unknown) => {
            state.eqFilters.push({ column, value })
            if (column === "idempotency_key") explicitKeyLookup = true
            return chain
          },
          gte: () => {
            state.genericLookupCalled = true
            return chain
          },
          in: () => chain,
          is: () => chain,
          limit: () => chain,
          maybeSingle: async () => ({
            data: explicitKeyLookup
              ? state.explicitExisting
                ? { id: "same-explicit-resend", status: "sent", metadata: {} }
                : null
              : { id: "recent-different-resend" },
            error: null,
          }),
        }
        return chain
      },
      insert: () => {
        state.insertCalled = true
        const chain = {
          select: () => chain,
          single: async () => ({ data: { id: "new-explicit-resend" }, error: null }),
        }
        return chain
      },
    }),
  }),
}))

vi.mock("@/lib/observability/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { createPendingOutbox } from "@/lib/email/send/outbox"

describe("explicit certificate resend outbox idempotency", () => {
  it("bypasses generic five-minute dedup for a distinct explicit attempt key", async () => {
    state.insertCalled = false
    state.genericLookupCalled = false
    state.eqFilters = []
    state.explicitExisting = false

    const result = await createPendingOutbox({
      email_type: "med_cert_patient",
      to_email: "patient@example.test",
      subject: "Certificate resent",
      provider: "resend",
      intake_id: "intake-1",
      patient_id: "patient-1",
      certificate_id: "certificate-1",
      metadata: { resend_attempt_id: "attempt-2" },
      idempotency_key: "certificate-resend:attempt-2",
    })

    expect(result).toEqual({ id: "new-explicit-resend", duplicate: false })
    expect(state.genericLookupCalled).toBe(false)
    expect(state.insertCalled).toBe(true)
  })

  it("still dedupes the exact same explicit attempt key", async () => {
    state.insertCalled = false
    state.genericLookupCalled = false
    state.eqFilters = []
    state.explicitExisting = true

    const result = await createPendingOutbox({
      email_type: "med_cert_patient",
      to_email: "patient@example.test",
      subject: "Certificate resent",
      provider: "resend",
      intake_id: "intake-1",
      certificate_id: "certificate-1",
      metadata: { resend_attempt_id: "attempt-2" },
      idempotency_key: "certificate-resend:attempt-2",
    })

    expect(result).toEqual({ id: "same-explicit-resend", duplicate: true })
    expect(state.genericLookupCalled).toBe(false)
    expect(state.insertCalled).toBe(false)
  })

  it("scopes the generic duplicate window to the certificate document version", async () => {
    state.insertCalled = false
    state.genericLookupCalled = false
    state.eqFilters = []
    state.explicitExisting = false

    const result = await createPendingOutbox({
      email_type: "med_cert_patient",
      to_email: "patient@example.test",
      subject: "Updated certificate",
      provider: "resend",
      intake_id: "intake-1",
      certificate_id: "certificate-1",
      metadata: { certificate_storage_version: "corrected-version" },
    })

    expect(result).toEqual({ id: "recent-different-resend", duplicate: true })
    expect(state.eqFilters).toContainEqual({
      column: "metadata->>certificate_storage_version",
      value: "corrected-version",
    })
  })
})
