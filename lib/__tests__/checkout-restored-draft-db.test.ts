import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ retrieve: vi.fn(), expire: vi.fn() }))
vi.mock("@/lib/stripe/client", () => ({ stripe: { checkout: { sessions: { retrieve: mocks.retrieve, expire: mocks.expire } } } }))
vi.mock("@/lib/analytics/posthog-server", () => ({ trackIntakeFunnelStep: vi.fn() }))
import { findConvertedPartialIntakeForCheckout } from "@/lib/request/server-draft-conversion"
import { type CreateIntakeRowInput,createIntakeWithAnswers } from "@/lib/stripe/checkout/persistence"

const fixtureUrl = process.env.CHECKOUT_FIXTURE_URL
if (fixtureUrl && !/^http:\/\/127\.0\.0\.1:\d+$/.test(fixtureUrl)) throw new Error("Checkout DB fixtures require a disposable loopback endpoint")
const { createClient } = await vi.importActual<typeof import("@supabase/supabase-js")>("@supabase/supabase-js")
const db = createClient(fixtureUrl || "http://127.0.0.1:1", "fixture-only", {
  auth: { persistSession: false },
  global: { fetch: (url, options) => {
    const headers = new Headers(options?.headers)
    headers.delete("authorization")
    return fetch(String(url).replace("/rest/v1", ""), { ...options, headers })
  } },
})
const flow = "41414141-4141-4141-8141-414141414141"
const intakeId = "42424242-4242-4242-8242-424242424242"
const args = {
  input: { category: "medical_certificate", subtype: "work", type: "med-cert", answers: {}, idempotencyKey: "new-submission-key", flowInstanceId: flow },
  patientId: "fixture-owner", serviceId: "fixture-service", serviceSlug: "med-cert-sick", isPriority: false,
  amountCents: 2495, priceId: "fixture-price", attribution: {}, baseUrl: "http://localhost:3060",
} as CreateIntakeRowInput
const original = { id: intakeId, guest_email: "fixture@example.test", patient_id: "fixture-owner", category: "medical_certificate", subtype: "work", status: "cancelled", payment_status: "unpaid", payment_id: "cs_fixture", checkout_error: null, flow_instance_id: flow, idempotency_key: "old-submission-key" }

describe.skipIf(!fixtureUrl)("restored checkout against disposable PostgreSQL/PostgREST", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    expect((await db.from("partial_intakes").delete().not("session_id", "is", null)).error).toBeNull()
    const deletion = await db.from("intakes").delete().eq("id", intakeId)
    expect(deletion.error).toBeNull()
    expect((await db.from("intakes").insert(original)).error).toBeNull()
    mocks.retrieve.mockResolvedValue({ id: "cs_fixture", metadata: { intake_id: intakeId }, status: "expired", payment_status: "unpaid", payment_intent: null })
  })
  it("validates an exact converted bearer and owner using the canonical claim RPC", async () => {
    const sessionId = "43434343-4343-4343-8343-434343434343"
    expect((await db.from("partial_intakes").insert({ session_id: sessionId, flow_instance_id: flow, service_type: "med-cert", email: "fixture@example.test", converted_to_intake_id: intakeId, expires_at: "2099-01-01T00:00:00Z" })).error).toBeNull()
    const input = { sessionId, flowInstanceId: flow, serviceType: "med-cert" as const, category: "medical_certificate", subtype: "work", email: "fixture@example.test", patientId: "fixture-owner" }
    await expect(findConvertedPartialIntakeForCheckout(db, input)).resolves.toMatchObject({ kind: "reusable", intake: { id: intakeId, patientId: "fixture-owner" } })
    await expect(findConvertedPartialIntakeForCheckout(db, { ...input, patientId: "foreign-owner" })).resolves.toMatchObject({ kind: "blocked" })
    await expect(findConvertedPartialIntakeForCheckout(db, { ...input, flowInstanceId: "44444444-4444-4444-8444-444444444444" })).resolves.toMatchObject({ kind: "blocked", reason: "request_mismatch" })
    await expect(findConvertedPartialIntakeForCheckout(db, { ...input, serviceType: "consult" })).resolves.toMatchObject({ kind: "blocked", reason: "request_mismatch" })
    expect(mocks.retrieve).not.toHaveBeenCalled()
  })
  it("does not confer existing-request access on a manufactured same-flow unconverted bearer", async () => {
    const sessionId = "45454545-4545-4545-8545-454545454545"
    // The draft API permits this shape even after the intake exists. Neither
    // the flow ID nor claimed email can substitute for its missing conversion.
    expect((await db.from("partial_intakes").insert({ session_id: sessionId, flow_instance_id: flow, service_type: "med-cert", email: "fixture@example.test", expires_at: "2099-01-01T00:00:00Z" })).error).toBeNull()
    await expect(findConvertedPartialIntakeForCheckout(db, { sessionId, flowInstanceId: flow, serviceType: "med-cert", category: "medical_certificate", subtype: "work", email: "fixture@example.test", patientId: "fixture-owner" })).resolves.toMatchObject({ kind: "none", reason: "not_converted" })
    expect(mocks.retrieve).not.toHaveBeenCalled()
  })
  it("reproduces the real 23505 flow collision independently of submission key", async () => {
    const collision = await db.from("intakes").insert({ ...original, id: undefined, idempotency_key: "new-submission-key" })
    expect(collision.error?.code).toBe("23505")
    expect(collision.error?.message).toContain("idx_intakes_flow_instance_id")
    expect((await db.from("intakes").select("id").eq("idempotency_key", "new-submission-key")).data).toEqual([])
  })
  it("resolves the actual persistence collision without changing the cancelled obligation", async () => {
    await expect(createIntakeWithAnswers(db, args)).resolves.toMatchObject({ ok: true, data: { kind: "resolved_existing", result: { requiresFreshRequest: true } } })
    expect((await db.from("intakes").select("*").eq("flow_instance_id", flow)).data).toMatchObject([original])
    expect(mocks.expire).not.toHaveBeenCalled()
  })
  it("does not disclose a flow owned by another patient", async () => {
    const result = await createIntakeWithAnswers(db, { ...args, patientId: "different-owner" })
    expect(result).toMatchObject({ ok: false })
    expect(JSON.stringify(result)).not.toContain(intakeId)
    expect(mocks.retrieve).not.toHaveBeenCalled()
  })
  it("preserves one pending request on repeated submissions", async () => {
    await db.from("intakes").update({ status: "pending_payment", payment_status: "pending" }).eq("id", intakeId)
    await db.from("intake_answers").upsert({ intake_id: intakeId, answers: {} })
    for (let retry = 0; retry < 2; retry++) {
      await expect(createIntakeWithAnswers(db, args)).resolves.toMatchObject({ ok: true, data: { kind: "retry_existing", intakeId } })
    }
    expect((await db.from("intakes").select("id").eq("flow_instance_id", flow)).data).toHaveLength(1)
  })
  it("blocks fresh recovery when a payment update wins during provider inspection", async () => {
    mocks.retrieve.mockImplementation(async () => {
      await db.from("intakes").update({ payment_status: "paid" }).eq("id", intakeId)
      return { id: "cs_fixture", metadata: { intake_id: intakeId }, status: "expired", payment_status: "unpaid", payment_intent: null }
    })
    const result = await createIntakeWithAnswers(db, args)
    expect(result).toMatchObject({ ok: true, data: { result: { success: false, failureCode: "payment_provider" } } })
    expect(JSON.stringify(result)).not.toContain("requiresFreshRequest")
  })
  it("keeps concurrent stale tabs on the same cancelled request", async () => {
    const results = await Promise.all([createIntakeWithAnswers(db, args), createIntakeWithAnswers(db, args)])
    expect(results).toMatchObject([{ ok: true, data: { result: { requiresFreshRequest: true } } }, { ok: true, data: { result: { requiresFreshRequest: true } } }])
    expect((await db.from("intakes").select("id").eq("flow_instance_id", flow)).data).toHaveLength(1)
  })
})
