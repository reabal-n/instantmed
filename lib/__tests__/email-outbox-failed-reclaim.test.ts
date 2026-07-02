import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Pins the failed-row reclaim behavior in createPendingOutbox.
 *
 * For the cron-owned email types the dispatcher cannot reconstruct
 * (abandoned_checkout, abandoned_checkout_followup, partial_intake_recovery,
 * review_request), the owning cron's next sendEmail is the ONLY retry path —
 * a failed outbox row must be reclaimed for retry, never phantom-deduped as
 * "already sent" (which permanently drops the email; 2026-07-02 audit).
 */

interface FakeRow {
  id: string
  status: string
  metadata: Record<string, unknown> | null
}

const state: {
  existingRow: FakeRow | null
  reclaimSucceeds: boolean
  updatePayload: Record<string, unknown> | null
  updateFilters: Array<{ column: string; value: unknown }>
  insertCalled: boolean
} = {
  existingRow: null,
  reclaimSucceeds: true,
  updatePayload: null,
  updateFilters: [],
  insertCalled: false,
}

function buildSelectChain() {
  const chain = {
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    in: vi.fn(() => chain),
    is: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: state.existingRow, error: null })),
  }
  return chain
}

function buildUpdateChain(payload: Record<string, unknown>) {
  state.updatePayload = payload
  const chain = {
    eq: vi.fn((column: string, value: unknown) => {
      state.updateFilters.push({ column, value })
      return chain
    }),
    select: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({
      data: state.reclaimSucceeds && state.existingRow ? { id: state.existingRow.id } : null,
      error: null,
    })),
  }
  return chain
}

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: vi.fn(() => buildSelectChain()),
      update: vi.fn((payload: Record<string, unknown>) => buildUpdateChain(payload)),
      insert: vi.fn(() => {
        state.insertCalled = true
        const chain = {
          select: vi.fn(() => chain),
          single: vi.fn(async () => ({ data: { id: "new-row" }, error: null })),
        }
        return chain
      }),
    }),
  }),
}))

vi.mock("@/lib/observability/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { createPendingOutbox } from "@/lib/email/send/outbox"

const RECOVERY_ENTRY = {
  email_type: "partial_intake_recovery" as const,
  to_email: "patient@example.com",
  to_name: "Patient",
  subject: "Finish your request",
  provider: "resend",
  intake_id: "intake-1",
  metadata: {},
}

describe("createPendingOutbox failed-row reclaim", () => {
  beforeEach(() => {
    state.existingRow = null
    state.reclaimSucceeds = true
    state.updatePayload = null
    state.updateFilters = []
    state.insertCalled = false
  })

  it("reclaims a failed idempotent row instead of phantom-deduping the retry", async () => {
    state.existingRow = { id: "row-1", status: "failed", metadata: { reclaim_count: 1 } }

    const result = await createPendingOutbox(RECOVERY_ENTRY)

    expect(result).toEqual({ id: "row-1", duplicate: false })
    expect(state.updatePayload).toMatchObject({ status: "pending" })
    expect((state.updatePayload?.metadata as Record<string, unknown>).reclaim_count).toBe(2)
    // Atomic reclaim: the update must re-assert status=failed so a concurrent
    // sender cannot be stomped.
    expect(state.updateFilters).toEqual(
      expect.arrayContaining([{ column: "status", value: "failed" }]),
    )
    expect(state.insertCalled).toBe(false)
  })

  it("still dedupes rows that are not failed", async () => {
    state.existingRow = { id: "row-2", status: "sent", metadata: null }

    const result = await createPendingOutbox(RECOVERY_ENTRY)

    expect(result).toEqual({ id: "row-2", duplicate: true })
    expect(state.updatePayload).toBeNull()
  })

  it("treats a failed row as terminal-duplicate once the reclaim cap is reached", async () => {
    state.existingRow = { id: "row-3", status: "failed", metadata: { reclaim_count: 5 } }

    const result = await createPendingOutbox(RECOVERY_ENTRY)

    expect(result).toEqual({ id: "row-3", duplicate: true })
    expect(state.updatePayload).toBeNull()
  })

  it("falls back to duplicate when the reclaim loses a concurrent race", async () => {
    state.existingRow = { id: "row-4", status: "failed", metadata: {} }
    state.reclaimSucceeds = false

    const result = await createPendingOutbox(RECOVERY_ENTRY)

    expect(result).toEqual({ id: "row-4", duplicate: true })
  })
})
