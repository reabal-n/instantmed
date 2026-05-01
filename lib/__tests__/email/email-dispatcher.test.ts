/**
 * Unit tests for lib/email/email-dispatcher.ts
 *
 * Tests the core email dispatch loop: backoff eligibility, daily limits,
 * claim/send/fail/skip flows, unsupported types, missing fields, retry
 * exhaustion alerts, and stats queries.
 *
 * All external deps (Supabase, outbox, send-email, warmup) are mocked.
 * Backoff and eligibility are tested via processEmailDispatch behavior
 * (the internal functions are not exported).
 */

import * as Sentry from "@sentry/nextjs"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  mockSupabaseFrom,
  resetAllMocks,
} from "../setup"

// ---------------------------------------------------------------------------
// Mocks -- must be registered BEFORE importing the module under test
// ---------------------------------------------------------------------------

const mockCheckDailySendLimit = vi.fn()
const mockIncrementDailySendCount = vi.fn()
vi.mock("@/lib/email/warmup", () => ({
  checkDailySendLimit: (...args: unknown[]) => mockCheckDailySendLimit(...args),
  incrementDailySendCount: (...args: unknown[]) => mockIncrementDailySendCount(...args),
}))

const mockClaimOutboxRow = vi.fn()
vi.mock("@/lib/email/send/outbox", () => ({
  claimOutboxRow: (...args: unknown[]) => mockClaimOutboxRow(...args),
}))

const mockSendFromOutboxRow = vi.fn()
vi.mock("@/lib/email/send-email", () => ({
  sendFromOutboxRow: (...args: unknown[]) => mockSendFromOutboxRow(...args),
}))

// Import after mocks
import {
  getEmailDispatcherStats,
  MAX_BATCH_SIZE,
  MAX_RETRIES,
  processEmailDispatch,
} from "@/lib/email/email-dispatcher"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal outbox candidate row for the SELECT query result. */
function makeCandidate(overrides: Record<string, unknown> = {}) {
  return {
    id: overrides.id ?? "outbox-1",
    email_type: overrides.email_type ?? "med_cert_patient",
    to_email: overrides.to_email ?? "patient@example.com",
    to_name: overrides.to_name ?? "Test Patient",
    subject: overrides.subject ?? "Your medical certificate",
    status: overrides.status ?? "pending",
    provider: overrides.provider ?? "resend",
    provider_message_id: overrides.provider_message_id ?? null,
    error_message: overrides.error_message ?? null,
    retry_count: overrides.retry_count ?? 0,
    intake_id: overrides.intake_id ?? "intake-1",
    patient_id: overrides.patient_id ?? "patient-1",
    certificate_id: overrides.certificate_id ?? "cert-1",
    metadata: overrides.metadata ?? {},
    created_at: overrides.created_at ?? "2026-04-13T00:00:00Z",
    sent_at: overrides.sent_at ?? null,
    last_attempt_at: overrides.last_attempt_at ?? null,
    ...overrides,
  }
}

/**
 * Wire up the chainable Supabase mock so the dispatcher's SELECT query
 * resolves with the given candidate rows (or an error).
 */
function mockOutboxSelect(
  candidates: ReturnType<typeof makeCandidate>[],
  error: { message: string } | null = null,
) {
  // The dispatcher calls:
  //   supabase.from("email_outbox").select(...).in(...).lt(...).order(...).limit(...)
  // The shared setup.ts mock makes all chain methods return the chain, and
  // terminal methods (single/maybeSingle) return mockSupabaseSingle's value.
  // But the SELECT query here does NOT call .single() -- it expects an array.
  // We need the .limit() call to resolve with { data, error }.

  const limitMock = vi.fn().mockResolvedValue({ data: candidates, error })
  const orderMock = vi.fn(() => ({ limit: limitMock }))
  const ltMock = vi.fn(() => ({ order: orderMock }))
  const inMock = vi.fn(() => ({ lt: ltMock }))
  const selectMock = vi.fn(() => ({ in: inMock }))

  // permanentlyFailOutboxRow also calls from("email_outbox").update(...)
  // so we need a mock that supports both select (the fetch query) and update.
  const updateChain: Record<string, unknown> = {}
  updateChain.eq = vi.fn(() => updateChain)
  updateChain.lt = vi.fn(() => updateChain)
  updateChain.select = vi.fn().mockResolvedValue({ data: [], error: null })
  updateChain.update = vi.fn(() => updateChain)

  mockSupabaseFrom.mockImplementation(() => ({
    select: selectMock,
    update: updateChain.update,
  }))

  return { selectMock, inMock, ltMock, orderMock, limitMock }
}

/**
 * Wire up Supabase mock for stats queries (3x parallel select with count).
 */
function mockStatsQueries(pending: number, failed: number, exhausted: number) {
  let callCount = 0
  const counts = [pending, failed, exhausted]

  mockSupabaseFrom.mockImplementation(() => {
    const idx = callCount++
    const chain: Record<string, unknown> = {}
    const methods = ["eq", "lt", "gte", "in", "order", "limit"]
    for (const m of methods) {
      chain[m] = vi.fn(() => chain)
    }
    // select() is the entry point -- resolve with count
    chain.select = vi.fn(() => {
      // Return chainable that eventually resolves
      const inner: Record<string, unknown> = {}
      for (const m of methods) {
        inner[m] = vi.fn(() => inner)
      }
      // The chain is consumed via implicit await (Promise.all)
      // We make the chain itself thenable so await resolves it.
      inner.then = (resolve: (v: unknown) => void) => {
        resolve({ count: counts[idx % counts.length], error: null })
      }
      return inner
    })
    return chain
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("email-dispatcher", () => {
  beforeEach(() => {
    resetAllMocks()
    // Default: warmup allows sends
    mockCheckDailySendLimit.mockResolvedValue({ allowed: true, current: 5, limit: 200 })
    mockIncrementDailySendCount.mockResolvedValue(undefined)
  })

  // -----------------------------------------------------------------------
  // Constants
  // -----------------------------------------------------------------------
  describe("constants", () => {
    it("MAX_BATCH_SIZE is 25", () => {
      expect(MAX_BATCH_SIZE).toBe(25)
    })

    it("MAX_RETRIES is 10", () => {
      expect(MAX_RETRIES).toBe(10)
    })
  })

  // -----------------------------------------------------------------------
  // Daily send limit
  // -----------------------------------------------------------------------
  describe("daily send limit", () => {
    it("continues processing transactional email when marketing warmup limit is reached", async () => {
      mockCheckDailySendLimit.mockResolvedValue({ allowed: false, current: 200, limit: 200 })

      const transactional = makeCandidate({ email_type: "med_cert_patient" })
      const marketing = makeCandidate({
        id: "outbox-marketing",
        email_type: "review_request",
        certificate_id: null,
      })
      mockOutboxSelect([transactional, marketing])
      mockClaimOutboxRow.mockResolvedValue({ claimed: true, row: transactional })
      mockSendFromOutboxRow.mockResolvedValue({ success: true })

      const result = await processEmailDispatch()

      expect(result.processed).toBe(1)
      expect(result.sent).toBe(1)
      expect(mockClaimOutboxRow).toHaveBeenCalledWith("outbox-1")
      expect(mockClaimOutboxRow).not.toHaveBeenCalledWith("outbox-marketing")
      expect(mockIncrementDailySendCount).not.toHaveBeenCalled()
    })

    it("reports marketing pause when no transactional emails are eligible", async () => {
      mockCheckDailySendLimit.mockResolvedValue({ allowed: false, current: 200, limit: 200 })

      mockOutboxSelect([
        makeCandidate({
          id: "outbox-marketing",
          email_type: "review_request",
          certificate_id: null,
        }),
      ])

      const result = await processEmailDispatch()

      expect(result.processed).toBe(0)
      expect(result.sent).toBe(0)
      expect(result.message).toContain("Daily marketing email limit reached")
      expect(result.message).toContain("200/200")
      expect(mockClaimOutboxRow).not.toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // Empty queue
  // -----------------------------------------------------------------------
  describe("empty queue", () => {
    it("returns zeros when no candidates", async () => {
      mockOutboxSelect([])

      const result = await processEmailDispatch()

      expect(result.processed).toBe(0)
      expect(result.sent).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.results).toEqual([])
    })

    it("returns zeros when candidates is null", async () => {
      mockOutboxSelect(null as unknown as ReturnType<typeof makeCandidate>[])

      const result = await processEmailDispatch()

      expect(result.processed).toBe(0)
      expect(result.sent).toBe(0)
    })
  })

  // -----------------------------------------------------------------------
  // Backoff eligibility (tested via behavior)
  // -----------------------------------------------------------------------
  describe("backoff eligibility", () => {
    it("processes rows with no last_attempt_at (first attempt)", async () => {
      const candidate = makeCandidate({ last_attempt_at: null, retry_count: 0 })
      mockOutboxSelect([candidate])
      mockClaimOutboxRow.mockResolvedValue({ claimed: true, row: candidate })
      mockSendFromOutboxRow.mockResolvedValue({ success: true })

      const result = await processEmailDispatch()

      expect(result.sent).toBe(1)
    })

    it("processes rows at retry_count=0 with recent last_attempt (0min backoff)", async () => {
      const candidate = makeCandidate({
        last_attempt_at: new Date().toISOString(),
        retry_count: 0,
      })
      mockOutboxSelect([candidate])
      mockClaimOutboxRow.mockResolvedValue({ claimed: true, row: candidate })
      mockSendFromOutboxRow.mockResolvedValue({ success: true })

      const result = await processEmailDispatch()

      // retry_count=0 has 0-minute backoff, so it's always eligible
      expect(result.sent).toBe(1)
    })

    it("skips rows still in backoff period", async () => {
      // retry_count=5 -> 30 minute backoff. Set last_attempt 1 minute ago.
      const oneMinAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString()
      const candidate = makeCandidate({
        last_attempt_at: oneMinAgo,
        retry_count: 5,
      })
      mockOutboxSelect([candidate])

      const result = await processEmailDispatch()

      // All candidates are in backoff -- none eligible
      expect(result.processed).toBe(0)
      expect(result.message).toBe("All pending emails are in backoff")
      expect(result.pending).toBe(1)
    })

    it("processes rows past their backoff period", async () => {
      // retry_count=1 -> 1 minute backoff. Set last_attempt 5 minutes ago.
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const candidate = makeCandidate({
        last_attempt_at: fiveMinAgo,
        retry_count: 1,
      })
      mockOutboxSelect([candidate])
      mockClaimOutboxRow.mockResolvedValue({ claimed: true, row: candidate })
      mockSendFromOutboxRow.mockResolvedValue({ success: true })

      const result = await processEmailDispatch()

      expect(result.sent).toBe(1)
    })

    it("reports all-in-backoff when every candidate is still waiting", async () => {
      // retry_count=6 -> 60 minute backoff. Set last_attempt 10 minutes ago.
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const candidates = [
        makeCandidate({ id: "o1", last_attempt_at: tenMinAgo, retry_count: 6 }),
        makeCandidate({ id: "o2", last_attempt_at: tenMinAgo, retry_count: 7 }),
      ]
      mockOutboxSelect(candidates)

      const result = await processEmailDispatch()

      expect(result.processed).toBe(0)
      expect(result.pending).toBe(2)
      expect(result.message).toBe("All pending emails are in backoff")
    })

    it("excludes rows at or above MAX_RETRIES", async () => {
      // retry_count >= 10 should be filtered by isEligibleForRetry
      const candidate = makeCandidate({ retry_count: 10, last_attempt_at: null })
      mockOutboxSelect([candidate])

      const result = await processEmailDispatch()

      expect(result.processed).toBe(0)
      expect(result.message).toBe("All pending emails are in backoff")
    })
  })

  // -----------------------------------------------------------------------
  // Successful send
  // -----------------------------------------------------------------------
  describe("successful send", () => {
    it("claims, sends, and increments counts", async () => {
      const candidate = makeCandidate()
      mockOutboxSelect([candidate])
      mockClaimOutboxRow.mockResolvedValue({ claimed: true, row: candidate })
      mockSendFromOutboxRow.mockResolvedValue({ success: true })

      const result = await processEmailDispatch()

      expect(result.processed).toBe(1)
      expect(result.sent).toBe(1)
      expect(result.failed).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.results).toHaveLength(1)
      expect(result.results[0]).toEqual({ id: "outbox-1", success: true, error: undefined })

      expect(mockClaimOutboxRow).toHaveBeenCalledWith("outbox-1")
      expect(mockSendFromOutboxRow).toHaveBeenCalledWith(candidate)
      expect(mockIncrementDailySendCount).not.toHaveBeenCalled()
    })

    it("increments warmup count for marketing email sends only", async () => {
      const candidate = makeCandidate({
        email_type: "review_request",
        certificate_id: null,
      })
      mockOutboxSelect([candidate])
      mockClaimOutboxRow.mockResolvedValue({ claimed: true, row: candidate })
      mockSendFromOutboxRow.mockResolvedValue({ success: true })

      const result = await processEmailDispatch()

      expect(result.sent).toBe(1)
      expect(mockIncrementDailySendCount).toHaveBeenCalled()
    })

    it("processes multiple emails in a batch", async () => {
      const c1 = makeCandidate({ id: "o1", certificate_id: "c1" })
      const c2 = makeCandidate({ id: "o2", email_type: "welcome", certificate_id: null })
      mockOutboxSelect([c1, c2])
      mockClaimOutboxRow
        .mockResolvedValueOnce({ claimed: true, row: c1 })
        .mockResolvedValueOnce({ claimed: true, row: c2 })
      mockSendFromOutboxRow.mockResolvedValue({ success: true })

      const result = await processEmailDispatch()

      expect(result.processed).toBe(2)
      expect(result.sent).toBe(2)
    })
  })

  // -----------------------------------------------------------------------
  // Failed send
  // -----------------------------------------------------------------------
  describe("failed send", () => {
    it("increments failed count when send fails", async () => {
      const candidate = makeCandidate({ retry_count: 0 })
      mockOutboxSelect([candidate])
      mockClaimOutboxRow.mockResolvedValue({ claimed: true, row: candidate })
      mockSendFromOutboxRow.mockResolvedValue({ success: false, error: "Resend API error" })

      const result = await processEmailDispatch()

      expect(result.processed).toBe(1)
      expect(result.sent).toBe(0)
      expect(result.failed).toBe(1)
      expect(result.results[0]).toEqual({
        id: "outbox-1",
        success: false,
        error: "Resend API error",
      })
      // Should NOT increment daily send count on failure
      expect(mockIncrementDailySendCount).not.toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // Already claimed (concurrent dispatcher)
  // -----------------------------------------------------------------------
  describe("already claimed", () => {
    it("increments skipped count when row is already claimed", async () => {
      const candidate = makeCandidate()
      mockOutboxSelect([candidate])
      mockClaimOutboxRow.mockResolvedValue({ claimed: false })

      const result = await processEmailDispatch()

      expect(result.processed).toBe(1)
      expect(result.sent).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.skipped).toBe(1)
      expect(result.results[0]).toEqual({
        id: "outbox-1",
        success: false,
        skipped: true,
        error: "Already claimed",
      })
      // Should not attempt to send
      expect(mockSendFromOutboxRow).not.toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------------
  // Unsupported email type
  // -----------------------------------------------------------------------
  describe("unsupported email type", () => {
    it("treats payment_retry and still_reviewing as supported retryable types", async () => {
      const paymentRetry = makeCandidate({
        id: "payment-retry",
        email_type: "payment_retry",
        certificate_id: null,
      })
      const stillReviewing = makeCandidate({
        id: "still-reviewing",
        email_type: "still_reviewing",
        certificate_id: null,
      })
      mockOutboxSelect([paymentRetry, stillReviewing])
      mockClaimOutboxRow
        .mockResolvedValueOnce({ claimed: true, row: paymentRetry })
        .mockResolvedValueOnce({ claimed: true, row: stillReviewing })
      mockSendFromOutboxRow.mockResolvedValue({ success: true })

      const result = await processEmailDispatch()

      expect(result.sent).toBe(2)
      expect(mockSendFromOutboxRow).toHaveBeenCalledWith(paymentRetry)
      expect(mockSendFromOutboxRow).toHaveBeenCalledWith(stillReviewing)
    })

    it("permanently fails rows with unsupported email_type", async () => {
      const candidate = makeCandidate({ email_type: "some_unknown_type" })
      mockOutboxSelect([candidate])
      mockClaimOutboxRow.mockResolvedValue({ claimed: true, row: candidate })

      const result = await processEmailDispatch()

      expect(result.failed).toBe(1)
      expect(result.results[0]).toMatchObject({
        id: "outbox-1",
        success: false,
        error: "Unsupported email_type: some_unknown_type",
      })
      // Should NOT attempt to send
      expect(mockSendFromOutboxRow).not.toHaveBeenCalled()
      // Should fire Sentry warning via permanentlyFailOutboxRow
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining("permanently failed"),
        expect.objectContaining({
          level: "warning",
          tags: expect.objectContaining({ email_type: "some_unknown_type" }),
        }),
      )
    })
  })

  // -----------------------------------------------------------------------
  // Missing certificate_id for med_cert_patient
  // -----------------------------------------------------------------------
  describe("missing certificate_id", () => {
    it("permanently fails med_cert_patient without certificate_id", async () => {
      const candidate = makeCandidate({
        email_type: "med_cert_patient",
        certificate_id: null,
      })
      mockOutboxSelect([candidate])
      mockClaimOutboxRow.mockResolvedValue({ claimed: true, row: candidate })

      const result = await processEmailDispatch()

      expect(result.failed).toBe(1)
      expect(result.results[0]).toMatchObject({
        success: false,
        error: "Missing certificate_id",
      })
      expect(mockSendFromOutboxRow).not.toHaveBeenCalled()
    })

    it("does NOT fail other email types missing certificate_id", async () => {
      const candidate = makeCandidate({
        email_type: "welcome",
        certificate_id: null,
      })
      mockOutboxSelect([candidate])
      mockClaimOutboxRow.mockResolvedValue({ claimed: true, row: candidate })
      mockSendFromOutboxRow.mockResolvedValue({ success: true })

      const result = await processEmailDispatch()

      expect(result.sent).toBe(1)
    })
  })

  // -----------------------------------------------------------------------
  // Retry exhaustion -- Sentry alert
  // -----------------------------------------------------------------------
  describe("retry exhaustion", () => {
    it("fires Sentry warning when failure exhausts all retries", async () => {
      // retry_count=9, so retry_count + 1 = 10 >= MAX_RETRIES
      const candidate = makeCandidate({ retry_count: 9 })
      mockOutboxSelect([candidate])
      mockClaimOutboxRow.mockResolvedValue({ claimed: true, row: candidate })
      mockSendFromOutboxRow.mockResolvedValue({ success: false, error: "Timeout" })

      await processEmailDispatch()

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining(`exhausted all ${MAX_RETRIES} retries`),
        expect.objectContaining({
          level: "warning",
          tags: expect.objectContaining({ subsystem: "email-dispatcher" }),
          extra: expect.objectContaining({ outboxId: "outbox-1", lastError: "Timeout" }),
        }),
      )
    })

    it("does NOT fire Sentry warning when retries remain", async () => {
      const candidate = makeCandidate({ retry_count: 3 })
      mockOutboxSelect([candidate])
      mockClaimOutboxRow.mockResolvedValue({ claimed: true, row: candidate })
      mockSendFromOutboxRow.mockResolvedValue({ success: false, error: "Timeout" })

      await processEmailDispatch()

      // The only Sentry call should not be the exhaustion message
      const calls = vi.mocked(Sentry.captureMessage).mock.calls
      const exhaustionCalls = calls.filter(
        ([msg]) => typeof msg === "string" && msg.includes("exhausted"),
      )
      expect(exhaustionCalls).toHaveLength(0)
    })
  })

  // -----------------------------------------------------------------------
  // Fetch error
  // -----------------------------------------------------------------------
  describe("fetch error", () => {
    it("throws when outbox query fails", async () => {
      mockOutboxSelect([], { message: "connection refused" })

      await expect(processEmailDispatch()).rejects.toThrow("Failed to fetch outbox")
    })
  })

  // -----------------------------------------------------------------------
  // Mixed batch
  // -----------------------------------------------------------------------
  describe("mixed batch", () => {
    it("handles a batch with sent, failed, and skipped rows", async () => {
      const c1 = makeCandidate({ id: "o1" })
      const c2 = makeCandidate({ id: "o2" })
      const c3 = makeCandidate({ id: "o3" })
      mockOutboxSelect([c1, c2, c3])

      mockClaimOutboxRow
        .mockResolvedValueOnce({ claimed: true, row: c1 })  // will send
        .mockResolvedValueOnce({ claimed: false })            // skipped
        .mockResolvedValueOnce({ claimed: true, row: c3 })   // will fail

      mockSendFromOutboxRow
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: "500" })

      const result = await processEmailDispatch()

      expect(result.processed).toBe(3)
      expect(result.sent).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.skipped).toBe(1)
      expect(result.results).toHaveLength(3)
    })
  })

  // -----------------------------------------------------------------------
  // getEmailDispatcherStats
  // -----------------------------------------------------------------------
  describe("getEmailDispatcherStats", () => {
    it("returns correct counts from parallel queries", async () => {
      mockStatsQueries(5, 3, 2)

      const stats = await getEmailDispatcherStats()

      expect(stats.pending).toBe(5)
      expect(stats.failed).toBe(3)
      expect(stats.exhausted).toBe(2)
      expect(stats.total).toBe(10)
    })

    it("returns zeros when counts are null", async () => {
      mockStatsQueries(0, 0, 0)

      const stats = await getEmailDispatcherStats()

      expect(stats.pending).toBe(0)
      expect(stats.failed).toBe(0)
      expect(stats.exhausted).toBe(0)
      expect(stats.total).toBe(0)
    })
  })
})
