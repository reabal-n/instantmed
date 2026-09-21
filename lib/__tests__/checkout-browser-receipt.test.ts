import { beforeEach, describe, expect, it, vi } from "vitest"

import { signCheckoutResumeToken } from "@/lib/crypto/checkout-resume-token"
import { findBrowserCheckoutReceipt, rememberBrowserCheckout } from "@/lib/stripe/checkout/browser-receipt"

const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), single: vi.fn() }))
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.get, set: mocks.set }) }))

const flow = "41414141-4141-4141-8141-414141414141"
const row = { id: "owned-intake", patient_id: "owner", flow_instance_id: flow,
  guest_email: "fixture@example.test", category: "prescription", subtype: "repeat",
  status: "pending_payment", payment_status: "pending", payment_id: "cs_original",
  checkout_error: null, growth_experience_version: null }
const chain = { select: vi.fn(() => chain), eq: vi.fn(() => chain), maybeSingle: mocks.single }
const db = { from: vi.fn(() => chain) }
const input = { flowInstanceId: flow, email: "fixture@example.test", category: "prescription", subtype: "repeat" }
const run = () => findBrowserCheckoutReceipt(db as never, input)

describe("guest browser checkout receipt", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.get.mockReturnValue({ value: signCheckoutResumeToken(row.id) })
    mocks.single.mockResolvedValue({ data: row, error: null })
  })
  it("recovers the exact saved request without a partial draft", async () => {
    expect(await run()).toMatchObject({ kind: "reusable", intake: { id: row.id, paymentId: "cs_original" } })
    expect(chain.eq).toHaveBeenCalledWith("id", row.id)
    expect(chain.eq).toHaveBeenCalledWith("flow_instance_id", flow)
  })
  it.each([undefined, { value: "tampered" }])("never looks up a request without a valid signed receipt: %s", async value => {
    mocks.get.mockReturnValue(value)
    expect(await run()).toEqual({ kind: "none", reason: "not_found" })
    expect(db.from).not.toHaveBeenCalled()
  })
  it("rejects an expired receipt", async () => {
    vi.spyOn(Date, "now").mockReturnValueOnce(Date.now() - 8 * 86400000)
    mocks.get.mockReturnValue({ value: signCheckoutResumeToken(row.id) })
    expect(await run()).toEqual({ kind: "none", reason: "not_found" })
    expect(db.from).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
  it.each([{ guest_email: "another@example.test" }, { flow_instance_id: "different-flow" }])("does not expose mismatched ownership: %s", async change => {
    mocks.single.mockResolvedValue({ data: { ...row, ...change }, error: null })
    expect(await run()).toEqual({ kind: "blocked", reason: "identity_mismatch" })
  })
  it("returns a service-change recovery rather than applying new answers", async () => {
    mocks.single.mockResolvedValue({ data: { ...row, category: "consult" }, error: null })
    expect(await run()).toMatchObject({ kind: "service_changed", intake: { id: row.id } })
  })
  it("fails closed on a database outage", async () => {
    mocks.single.mockResolvedValue({ data: null, error: { code: "08006" } })
    expect(await run()).toEqual({ kind: "blocked", reason: "query_error" })
  })
  it("stores a bounded HttpOnly signed receipt", async () => {
    await rememberBrowserCheckout(row.id)
    expect(mocks.set).toHaveBeenCalledWith("instantmed_checkout_receipt", expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 604800 }))
  })
  it("does not turn a successful checkout into a failure when cookie storage fails", async () => {
    mocks.set.mockImplementationOnce(() => { throw new Error("cookie unavailable") })
    await expect(rememberBrowserCheckout(row.id)).resolves.toBeUndefined()
  })
})
