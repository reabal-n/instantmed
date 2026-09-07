import type { SupabaseClient } from "@supabase/supabase-js"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ retrieve: vi.fn(), expire: vi.fn(), log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))
vi.mock("@/lib/stripe/client", () => ({ stripe: { checkout: { sessions: { retrieve: mocks.retrieve, expire: mocks.expire } } } }))
vi.mock("@/lib/observability/logger", () => ({ createLogger: () => mocks.log }))
import { reconcileTerminalDraftCheckout, type RestoredCheckoutIntake } from "@/lib/stripe/checkout/restored-draft-recovery"

const initial: RestoredCheckoutIntake & { patient_id: string } = {
  id: "intake-owned", patient_id: "patient-owned", status: "cancelled", payment_status: "unpaid",
  payment_id: "cs_owned", checkout_error: "cancelled_by_patient",
}
const terminal = { id: "cs_owned", metadata: { intake_id: "intake-owned" }, status: "expired", payment_status: "unpaid", payment_intent: null }

function fixture(overrides: Partial<typeof initial> = {}, databaseError: { code: string; message: string } | null = null) {
  const row = { ...initial, ...overrides }
  const original = { ...row }
  const writes: Record<string, unknown>[] = []
  const filters: Record<string, unknown> = {}
  const query = {
    eq: (key: string, value: unknown) => { filters[key] = value; return query },
    is: (key: string, value: unknown) => { filters[key] = value; return query },
    select: async () => ({
      data: Object.entries(filters).every(([key, value]) => row[key as keyof typeof row] === value) ? [{ id: row.id }] : [],
      error: databaseError,
    }),
  }
  const supabase = { from: () => ({ update: (payload: Record<string, unknown>) => { writes.push(payload); return query } }) } as unknown as SupabaseClient
  const run = () => reconcileTerminalDraftCheckout({ supabase, intake: original, patientId: "patient-owned", existingUrl: "/patient/intakes/intake-owned" })
  return { row, run, writes, filters }
}

describe("restored cancelled checkout provider reconciliation", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.retrieve.mockResolvedValue(terminal) })

  it("permits deliberate fresh identity only after terminal provider evidence and exact owner/state CAS", async () => {
    const { run, row, filters, writes } = fixture()
    await expect(run()).resolves.toMatchObject({ success: false, requiresFreshRequest: true, failureCode: "auth_or_session" })
    expect(mocks.retrieve).toHaveBeenCalledWith("cs_owned", { expand: ["payment_intent"] })
    expect(filters).toEqual(initial)
    expect(writes).toEqual([{ updated_at: expect.any(String) }])
    expect(row).toEqual(initial)
  })
  it.each(["unpaid", "pending", "failed", "expired"])("reconciles an expired request with %s DB payment state without reviving it", async (payment_status) => {
    const f = fixture({ status: "expired", payment_status })
    await expect(f.run()).resolves.toMatchObject({ success: false, requiresFreshRequest: true })
    expect(f.filters).toMatchObject({ status: "expired", payment_status })
    expect(f.row.status).toBe("expired")
    expect(f.writes).toEqual([{ updated_at: expect.any(String) }])
  })
  it("marks an unresolved payment as a support recovery that cannot be retried", async () => {
    mocks.retrieve.mockResolvedValue({ ...terminal, payment_intent: { status: "processing" } })
    await expect(fixture().run()).resolves.toMatchObject({ success: false, requiresSupport: true })
  })
  it("reports an unexpected provider exception without its private payload", async () => {
    mocks.retrieve.mockRejectedValue(new Error("private-provider-value cs_owned patient-owned"))
    await fixture().run()
    expect(mocks.log.error).toHaveBeenCalledWith("Checkout provider operation failed", { operation: "restored_session_inspect" })
    expect(JSON.stringify(mocks.log.error.mock.calls)).not.toMatch(/private-provider|cs_owned|patient-owned/)
  })
  it("never logs the original expiration exception or provider identifiers", async () => {
    mocks.retrieve.mockResolvedValue({ ...terminal, status: "open" })
    mocks.expire.mockRejectedValue(new Error("private-provider-value cs_owned patient-owned"))
    await fixture().run()
    expect(mocks.log.error).toHaveBeenCalledWith("Checkout provider operation failed", { operation: "restored_session_expire" })
    expect(JSON.stringify(mocks.log.error.mock.calls)).not.toMatch(/private-provider|cs_owned|patient-owned/)
  })
  it.each(["paid", "refunded", "partially_refunded", "disputed"])("returns existing %s payment without a provider mutation", async (payment_status) => {
    const { run, writes } = fixture({ payment_status })
    await expect(run()).resolves.toMatchObject({ success: true, checkoutUrl: "/patient/intakes/intake-owned" })
    expect(mocks.retrieve).not.toHaveBeenCalled(); expect(mocks.expire).not.toHaveBeenCalled(); expect(writes).toEqual([])
  })
  it.each([
    { status: "complete", payment_status: "paid" },
    { payment_intent: { status: "succeeded", metadata: { intake_id: "intake-owned" } } },
  ])("routes provider-paid proof to the existing request: %j", async (session) => {
    mocks.retrieve.mockResolvedValue({ ...terminal, ...session })
    const { run, writes } = fixture()
    await expect(run()).resolves.toMatchObject({ success: true, intakeId: "intake-owned" })
    expect(writes).toEqual([]); expect(mocks.expire).not.toHaveBeenCalled()
  })
  it.each([
    { status: "complete" },
    { status: "unknown" },
    { payment_status: "no_payment_required" },
    { payment_intent: undefined },
    { payment_intent: "pi_unexpanded" },
    { payment_intent: { status: "processing" } },
    { payment_intent: { status: "requires_capture" } },
    { payment_intent: { status: "requires_payment_method" } },
    { payment_intent: { status: "canceled", metadata: { intake_id: "foreign" } } },
    { metadata: { intake_id: "foreign" } },
    { id: "cs_foreign" },
  ])("blocks uncertain, in-flight, or foreign provider evidence: %j", async (session) => {
    mocks.retrieve.mockResolvedValue({ ...terminal, ...session })
    const { run, writes } = fixture()
    const result = await run()
    expect(result).toMatchObject({ success: false, failureCode: "payment_provider" })
    expect(result.requiresFreshRequest).not.toBe(true)
    expect(writes).toEqual([]); expect(mocks.expire).not.toHaveBeenCalled()
  })
  it("accepts an expired session with its canceled PaymentIntent", async () => {
    mocks.retrieve.mockResolvedValue({ ...terminal, payment_intent: { status: "canceled" } })
    await expect(fixture().run()).resolves.toMatchObject({ requiresFreshRequest: true })
  })
  it("confirms open-session expiration with a separate expanded read-back", async () => {
    const open = { ...terminal, status: "open" }
    mocks.retrieve.mockResolvedValueOnce(open).mockResolvedValueOnce(terminal)
    mocks.expire.mockResolvedValue({ id: "cs_owned", status: "expired" })
    await expect(fixture().run()).resolves.toMatchObject({ requiresFreshRequest: true })
    expect(mocks.expire).toHaveBeenCalledTimes(1)
    expect(mocks.retrieve).toHaveBeenLastCalledWith("cs_owned", { expand: ["payment_intent"] })
  })
  it.each(["open", "complete"])("does not trust expire success when read-back is %s", async (status) => {
    mocks.retrieve.mockResolvedValueOnce({ ...terminal, status: "open" }).mockResolvedValueOnce({ ...terminal, status })
    mocks.expire.mockResolvedValue({ status: "expired" })
    const { run, writes } = fixture()
    expect((await run()).requiresFreshRequest).not.toBe(true)
    expect(writes).toEqual([])
  })
  it("routes payment that wins the expire race to existing recovery", async () => {
    mocks.retrieve.mockResolvedValueOnce({ ...terminal, status: "open" }).mockResolvedValueOnce({ ...terminal, status: "complete", payment_status: "paid" })
    mocks.expire.mockResolvedValue({ status: "expired" })
    await expect(fixture().run()).resolves.toMatchObject({ success: true })
  })
  it("uses paid read-back after an expire rejection without treating the expected race as a provider incident", async () => {
    mocks.retrieve.mockResolvedValueOnce({ ...terminal, status: "open" }).mockResolvedValueOnce({ ...terminal, status: "complete", payment_status: "paid" })
    mocks.expire.mockRejectedValue(new Error("private-provider-race"))
    await expect(fixture().run()).resolves.toMatchObject({ success: true })
    expect(mocks.log.error).not.toHaveBeenCalled()
  })
  it("requires terminal read-back even when the expire response is lost", async () => {
    mocks.retrieve.mockResolvedValueOnce({ ...terminal, status: "open" }).mockResolvedValueOnce(terminal)
    mocks.expire.mockRejectedValue(new Error("private-provider-response-loss"))
    await expect(fixture().run()).resolves.toMatchObject({ success: false, requiresFreshRequest: true })
    expect(mocks.log.error).toHaveBeenCalledWith("Checkout provider operation failed", { operation: "restored_session_expire" })
  })
  it.each([
    { payment_id: "cs_replaced" }, { status: "paid", payment_status: "paid" },
    { checkout_error: "another_lock" }, { patient_id: "foreign" },
  ])("withholds fresh recovery when state changes during provider IO: %j", async (changed) => {
    const f = fixture()
    mocks.retrieve.mockImplementation(async () => { Object.assign(f.row, changed); return terminal })
    expect((await f.run()).requiresFreshRequest).not.toBe(true)
  })
  it.each([null, "unknown"])("blocks a cancelled request with uncertain DB payment state %s", async (payment_status) => {
    await expect(fixture({ payment_status }).run()).resolves.toMatchObject({ success: false })
    expect(mocks.retrieve).not.toHaveBeenCalled()
  })
  it("keeps high-stakes clinical cancellation blocked without a restart CTA", async () => {
    await expect(fixture({ checkout_error: "safety_blocked_high_stakes" }).run()).resolves.toMatchObject({ success: false, failureCode: "clinical_or_input_validation" })
    expect(mocks.retrieve).not.toHaveBeenCalled()
  })
  it.each(["paid", "refunded", "partially_refunded", "disputed"])("never restarts expired requests with a terminal %s cash state", async (payment_status) => {
    await expect(fixture({ status: "expired", payment_status }).run()).resolves.toMatchObject({ success: true })
    expect(mocks.retrieve).not.toHaveBeenCalled(); expect(mocks.expire).not.toHaveBeenCalled()
  })
  it.each(["expired", "failed", "pending", "unpaid"])("keeps expired high-stakes clinical locks closed for %s", async (payment_status) => {
    await expect(fixture({ status: "expired", payment_status, checkout_error: "safety_blocked_high_stakes" }).run()).resolves.toMatchObject({ success: false, requiresSupport: true })
    expect(mocks.retrieve).not.toHaveBeenCalled(); expect(mocks.expire).not.toHaveBeenCalled()
  })
  it.each([null, "unknown", "processing"])("does not inspect or reset expired requests with uncertain %s cash state", async (payment_status) => {
    await expect(fixture({ status: "expired", payment_status }).run()).resolves.toMatchObject({ success: false, requiresSupport: true })
    expect(mocks.retrieve).not.toHaveBeenCalled()
  })
  it("does not expire a session with a future unknown PaymentIntent state", async () => {
    mocks.retrieve.mockResolvedValue({ ...terminal, status: "open", payment_intent: { status: "unknown_future_state" } })
    await expect(fixture().run()).resolves.toMatchObject({ success: false, requiresSupport: true })
    expect(mocks.expire).not.toHaveBeenCalled()
  })
  it("bounds failed invalidation to one attempt and withholds fresh recovery", async () => {
    mocks.retrieve.mockResolvedValue({ ...terminal, status: "open" })
    mocks.expire.mockRejectedValue(new Error("provider unavailable"))
    expect((await fixture().run()).requiresFreshRequest).not.toBe(true)
    expect(mocks.expire).toHaveBeenCalledTimes(1)
    expect(mocks.retrieve).toHaveBeenCalledTimes(2)
  })
  it("blocks missing payment reference and network loss without a fresh-request hint", async () => {
    expect((await fixture({ payment_id: null }).run()).requiresFreshRequest).not.toBe(true)
    mocks.retrieve.mockRejectedValue(new Error("network unavailable"))
    expect((await fixture().run()).requiresFreshRequest).not.toBe(true)
  })
  it("does not leak database payloads or identifiers to diagnostics", async () => {
    const f = fixture({}, { code: "42501", message: "secret clinical sentinel" })
    expect((await f.run()).requiresFreshRequest).not.toBe(true)
    expect(mocks.log.error).toHaveBeenCalledWith("Checkout persistence operation failed", {
      operation: "terminal_recovery_compare_and_set", databaseCode: "42501",
    })
    expect(JSON.stringify(mocks.log.error.mock.calls)).not.toMatch(/sentinel|intake-owned|patient-owned|cs_owned/)
  })
  it("keeps Back/reload/another-tab submissions bound to the old cancelled obligation", async () => {
    const f = fixture()
    const results = await Promise.all([f.run(), f.run(), f.run()])
    expect(results.every(result => !result.success && result.requiresFreshRequest)).toBe(true)
    expect(f.row).toEqual(initial)
    expect(mocks.expire).not.toHaveBeenCalled()
  })
})
