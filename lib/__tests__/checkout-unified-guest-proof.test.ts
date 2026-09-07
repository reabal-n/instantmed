import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), db: vi.fn(), create: vi.fn(), guest: vi.fn(), retry: vi.fn(),
  retrieve: vi.fn(), expire: vi.fn(), resume: vi.fn(),
}))
vi.mock("@/lib/auth/helpers", () => ({ getAuthenticatedUserWithProfile: mocks.auth }))
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: mocks.db }))
vi.mock("@/lib/stripe/checkout", () => ({ createIntakeAndCheckoutAction: mocks.create, retryPaymentForIntakeAction: mocks.retry }))
vi.mock("@/lib/stripe/guest-checkout", () => ({ createGuestCheckoutAction: mocks.guest }))
vi.mock("@/lib/stripe/client", () => ({ stripe: { checkout: { sessions: { retrieve: mocks.retrieve, expire: mocks.expire } } } }))
vi.mock("@/lib/email/recovery-links", () => ({ buildSignedCheckoutResumeUrl: mocks.resume }))

// The unified action, conversion helper and terminal reconciler are all real.
import { createCheckoutFromUnifiedFlow } from "@/app/actions/unified-checkout"

const flow = "41414141-4141-4141-8141-414141414141"
const bearer = "42424242-4242-4242-8242-424242424242"
const intakeId = "43434343-4343-4343-8343-434343434343"
const input = () => ({
  serviceType: "med-cert" as const, flowInstanceId: flow, serverDraftSessionId: bearer,
  answers: { certType: "work", duration: "1", startDate: new Date().toISOString().slice(0, 10), symptomDetails: "Fever and sore throat since yesterday.", symptomDuration: "1 day", agreedToTerms: true, confirmedAccuracy: true },
  identity: { email: "fixture@example.test", fullName: "Fixture Patient", dateOfBirth: "1985-04-01" },
})
type Proof = "valid" | "missing_captured_email" | "missing_intake_flow" | "missing_patient" | "missing_intake_email" | "foreign_intake_email"

function database(status: string, proof: Proof, converted = true) {
  const draft = {
    converted_to_intake_id: converted ? intakeId : null,
    email: proof === "missing_captured_email" ? null : "fixture@example.test",
    flow_instance_id: flow, service_type: "med-cert", growth_experience_version: null,
  }
  const intake = {
    id: intakeId, patient_id: proof === "missing_patient" ? null : "owner", category: "medical_certificate", subtype: "work",
    status, payment_status: status, payment_id: "cs_original", checkout_error: null,
    guest_email: proof === "missing_intake_email" ? null : proof === "foreign_intake_email" ? "foreign@example.test" : "fixture@example.test",
    flow_instance_id: proof === "missing_intake_flow" ? null : flow, growth_experience_version: null,
  }
  return {
    from: vi.fn((table: string) => {
      const filters: Array<[string, unknown]> = []
      let updating = false
      const row = table === "intakes" ? intake : { ...draft, session_id: bearer }
      const matches = () => filters.every(([key, value]) => (row as Record<string, unknown>)[key] === value)
      const query = {
        eq: (key: string, value: unknown) => { filters.push([key, value]); return query },
        is: (key: string, value: unknown) => { filters.push([key, value]); return query },
        update: () => { updating = true; return query },
        select: () => updating ? Promise.resolve({ data: matches() ? [{ id: intakeId }] : [], error: null }) : query,
        maybeSingle: async () => ({ data: matches() ? row : null, error: null }),
      }
      return query
    }),
    rpc: vi.fn((_name: string, args: Record<string, unknown>) => ({
      maybeSingle: async () => ({
        data: args.p_session_id === bearer && args.p_flow_instance_id === flow && args.p_service_type === "med-cert" ? draft : null,
        error: null,
      }),
    })),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue(null)
  mocks.retrieve.mockResolvedValue({ id: "cs_original", metadata: { intake_id: intakeId }, status: "expired", payment_status: "unpaid", payment_intent: null })
  mocks.resume.mockReturnValue("/resume/fixture-signed")
  mocks.guest.mockResolvedValue({ success: true, intakeId: "new-intake", checkoutUrl: "https://checkout.stripe.test/pay/new" })
})

describe.each([false, true])("unified actual guest proof: authenticated=%s", (authenticated) => {
  it.each(["paid", "expired"].flatMap(status => (["valid", "missing_captured_email", "missing_intake_flow"] as const).map(proof => ({ status, proof }))))("derives strict guest recovery from server authentication: %j", async ({ status, proof }) => {
    if (authenticated) mocks.auth.mockResolvedValue({ user: { email: "fixture@example.test" }, profile: { id: "owner" } })
    const db = database(status, proof)
    mocks.db.mockReturnValue(db)
    // An extra client field must never choose the internal proof mode in
    // either direction: guests cannot opt out, and auth legacy stays scoped.
    const request = { ...input(), requireGuestProof: authenticated }
    const result = await createCheckoutFromUnifiedFlow(request)
    if (!authenticated && proof !== "valid") {
      expect(result).toMatchObject({ success: false, failureCode: "auth_or_session" })
      expect(JSON.stringify(result)).not.toMatch(/43434343|cs_original|resume|checkoutUrl|savedRequestUrl|requiresFreshRequest/)
      expect(mocks.retrieve).not.toHaveBeenCalled()
      expect(mocks.resume).not.toHaveBeenCalled()
    } else {
      expect(result).toMatchObject(status === "paid" ? { success: true, intakeId } : { success: false, requiresFreshRequest: true })
    }
    expect(db.rpc).toHaveBeenCalledWith("claim_partial_intake_draft_for_checkout", { p_session_id: bearer, p_flow_instance_id: flow, p_service_type: "med-cert" })
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.guest).not.toHaveBeenCalled()
    expect(mocks.retry).not.toHaveBeenCalled()
    expect(mocks.expire).not.toHaveBeenCalled()
  })
})

it.each(["paid", "expired"].flatMap(status => (["missing_patient", "missing_intake_email", "foreign_intake_email"] as const).map(proof => ({ status, proof }))))("requires the actual converted intake owner and email when no guest profile is known upstream: %j", async ({ status, proof }) => {
  mocks.db.mockReturnValue(database(status, proof))
  const result = await createCheckoutFromUnifiedFlow(input())
  expect(result).toMatchObject({ success: false, failureCode: "auth_or_session" })
  expect(JSON.stringify(result)).not.toMatch(/43434343|cs_original|foreign@example|checkoutUrl|savedRequestUrl|requiresFreshRequest/)
  expect(mocks.resume).not.toHaveBeenCalled()
  expect(mocks.retrieve).not.toHaveBeenCalled()
  expect(mocks.expire).not.toHaveBeenCalled()
  expect(mocks.guest).not.toHaveBeenCalled()
})

it("continues an unconverted first checkout while captured email is still missing", async () => {
  const db = database("pending_payment", "missing_captured_email", false)
  mocks.db.mockReturnValue(db)
  await expect(createCheckoutFromUnifiedFlow(input())).resolves.toMatchObject({ success: true, intakeId: "new-intake" })
  expect(mocks.guest).toHaveBeenCalledWith(expect.objectContaining({
    flowInstanceId: flow, serverDraftSessionId: bearer, guestEmail: "fixture@example.test",
  }))
  expect(mocks.guest).toHaveBeenCalledTimes(1)
  expect(db.from).not.toHaveBeenCalledWith("intakes")
  expect(mocks.resume).not.toHaveBeenCalled()
  expect(mocks.retrieve).not.toHaveBeenCalled()
  expect(mocks.expire).not.toHaveBeenCalled()
})
