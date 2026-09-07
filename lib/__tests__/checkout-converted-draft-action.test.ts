import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ auth: vi.fn(), draft: vi.fn(), reconcile: vi.fn(), create: vi.fn(), guest: vi.fn(), retry: vi.fn() }))
vi.mock("@/lib/auth/helpers", () => ({ getAuthenticatedUserWithProfile: mocks.auth }))
vi.mock("@/lib/request/server-draft-conversion", () => ({ findConvertedPartialIntakeForCheckout: mocks.draft }))
vi.mock("@/lib/stripe/checkout/restored-draft-recovery", () => ({ reconcileTerminalDraftCheckout: mocks.reconcile }))
vi.mock("@/lib/stripe/checkout", () => ({ createIntakeAndCheckoutAction: mocks.create, retryPaymentForIntakeAction: mocks.retry }))
vi.mock("@/lib/stripe/guest-checkout", () => ({ createGuestCheckoutAction: mocks.guest }))
vi.mock("@/lib/email/recovery-links", () => ({ buildSignedCheckoutResumeUrl: () => "/resume/fixture-signed" }))
import { createCheckoutFromUnifiedFlow } from "@/app/actions/unified-checkout"

const input = () => ({
  serviceType: "med-cert" as const, flowInstanceId: "41414141-4141-4141-8141-414141414141", serverDraftSessionId: "42424242-4242-4242-8242-424242424242",
  answers: { certType: "work", duration: "1", startDate: new Date().toISOString().slice(0, 10), symptomDetails: "Fever and sore throat since yesterday.", symptomDuration: "1 day", agreedToTerms: true, confirmedAccuracy: true },
  identity: { email: "fixture@example.test", fullName: "Fixture Patient", dateOfBirth: "1985-04-01" },
})
const intake = { id: "owned-intake", patientId: "owner", category: "medical_certificate", subtype: "work", status: "cancelled", paymentStatus: "unpaid", paymentId: "cs_original", checkoutError: null, guestEmail: "fixture@example.test", growthExperienceVersion: null }

describe("unified converted draft checkout", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.auth.mockResolvedValue(null)
    mocks.draft.mockResolvedValue({ kind: "reusable", intake })
    mocks.reconcile.mockResolvedValue({ success: false, failureCode: "payment_provider", error: "Provider unresolved" })
  })
  it.each([false, true])("requires reconciliation rather than a blind restart for authenticated=%s", async (authenticated) => {
    if (authenticated) mocks.auth.mockResolvedValue({ user: { email: "fixture@example.test" }, profile: { id: "owner" } })
    await expect(createCheckoutFromUnifiedFlow(input())).resolves.toMatchObject({ success: false, failureCode: "payment_provider" })
    expect(mocks.reconcile).toHaveBeenCalledWith(expect.objectContaining({ patientId: "owner", intake: expect.objectContaining({ payment_id: "cs_original", status: "cancelled" }) }))
    expect(mocks.draft).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ patientId: authenticated ? "owner" : undefined, requireGuestProof: !authenticated }))
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.guest).not.toHaveBeenCalled()
  })
  it.each([false, true])("reconciles expired webhook state for authenticated=%s", async (authenticated) => {
    if (authenticated) mocks.auth.mockResolvedValue({ user: { email: "fixture@example.test" }, profile: { id: "owner" } })
    mocks.draft.mockResolvedValue({ kind: "reusable", intake: { ...intake, status: "expired", paymentStatus: "expired" } })
    mocks.reconcile.mockResolvedValue({ success: false, requiresFreshRequest: true })
    await expect(createCheckoutFromUnifiedFlow(input())).resolves.toMatchObject({ success: false, requiresFreshRequest: true })
    expect(mocks.reconcile).toHaveBeenCalledWith(expect.objectContaining({ intake: expect.objectContaining({ status: "expired", payment_status: "expired" }) }))
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.guest).not.toHaveBeenCalled()
  })
  it.each([false, true])("offers the verified original request after a service change for authenticated=%s", async (authenticated) => {
    if (authenticated) mocks.auth.mockResolvedValue({ user: { email: "fixture@example.test" }, profile: { id: "owner" } })
    mocks.draft.mockResolvedValue({ kind: "service_changed", intake })
    await expect(createCheckoutFromUnifiedFlow(input())).resolves.toMatchObject({ success: false, savedRequestUrl: expect.any(String) })
    expect(mocks.reconcile).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.guest).not.toHaveBeenCalled()
  })
  it.each([false, true])("does not disclose the original service or destination for a foreign service-change result: %s", async (authenticated) => {
    if (authenticated) mocks.auth.mockResolvedValue({ user: { email: "fixture@example.test" }, profile: { id: "foreign-owner" } })
    mocks.draft.mockResolvedValue({ kind: "service_changed", intake: { ...intake, guestEmail: "foreign@example.test" } })
    const result = await createCheckoutFromUnifiedFlow(input())
    expect(result).toMatchObject({ success: false })
    expect(JSON.stringify(result)).not.toMatch(/owned-intake|cs_original|medical_certificate|foreign@example|savedRequestUrl/)
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.guest).not.toHaveBeenCalled(); expect(mocks.reconcile).not.toHaveBeenCalled()
  })
  it.each(["paid", "refunded", "partially_refunded", "disputed"])("uses existing outcome for %s without restarting", async (paymentStatus) => {
    mocks.draft.mockResolvedValue({ kind: "reusable", intake: { ...intake, paymentStatus } })
    await expect(createCheckoutFromUnifiedFlow(input())).resolves.toMatchObject({ success: true, intakeId: "owned-intake", checkoutUrl: "/resume/fixture-signed" })
    expect(mocks.reconcile).not.toHaveBeenCalled()
  })
  it("does not disclose a foreign request to a signed-in browser", async () => {
    mocks.auth.mockResolvedValue({ user: { email: "fixture@example.test" }, profile: { id: "different-owner" } })
    const result = await createCheckoutFromUnifiedFlow(input())
    expect(result).toMatchObject({ success: false, failureCode: "auth_or_session", requiresSignIn: true })
    expect(JSON.stringify(result)).not.toContain("owned-intake")
    expect(mocks.reconcile).not.toHaveBeenCalled()
  })
  it("does not trust an uncertain guest identity", async () => {
    mocks.draft.mockResolvedValue({ kind: "reusable", intake: { ...intake, guestEmail: null } })
    await expect(createCheckoutFromUnifiedFlow(input())).resolves.toMatchObject({ success: false, failureCode: "auth_or_session" })
    expect(mocks.reconcile).not.toHaveBeenCalled()
  })
  it.each(["identity_mismatch", "request_mismatch"])("provides bounded access recovery for %s without creating or disclosing a request", async (reason) => {
    mocks.draft.mockResolvedValue({ kind: "blocked", reason })
    const result = await createCheckoutFromUnifiedFlow(input())
    expect(result).toMatchObject({ success: false, failureCode: "auth_or_session", ...(reason === "identity_mismatch" ? { requiresSignIn: true } : { requiresSupport: true }) })
    expect(JSON.stringify(result)).not.toMatch(/owned-intake|cs_original|requiresFreshRequest/)
    expect(mocks.reconcile).not.toHaveBeenCalled()
    expect(mocks.guest).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it("revalidates current clinical answers before looking up an old obligation", async () => {
    const request = input()
    request.answers.symptomDetails = ""
    await expect(createCheckoutFromUnifiedFlow(request)).resolves.toMatchObject({ success: false, failureCode: "clinical_or_input_validation" })
    expect(mocks.draft).not.toHaveBeenCalled(); expect(mocks.reconcile).not.toHaveBeenCalled()
  })
})
