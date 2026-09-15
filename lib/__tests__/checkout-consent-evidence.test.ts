import { readFileSync } from "node:fs"

import { beforeEach, describe, expect, it, vi } from "vitest"

import { TELEHEALTH_CONSENT_VERSION, TERMS_VERSION } from "@/lib/constants"
import { transformAnswersForUnifiedCheckout } from "@/lib/request/unified-checkout"
import { ensureCheckoutConsentEvidence, hasDurableCheckoutConsent } from "@/lib/stripe/checkout/consent-evidence"
const mocks = vi.hoisted(() => ({ answers: vi.fn(), profile: vi.fn() }))
vi.mock("@/lib/data/profiles", () => ({ getProfileById: mocks.profile }))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/data/intake-answers", () => ({ getIntakeAnswersForPaymentSafety: mocks.answers }))
const answers = { terms_agreed: true, accuracy_confirmed: true, telehealth_consent_given: true, telehealth_consent_version: TELEHEALTH_CONSENT_VERSION }
const receipt = { revision: "revision-1", receipt_id: "receipt-1", received_at: "2026-09-15T00:00:00Z" }
describe("durable checkout consent", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.answers.mockResolvedValue(answers); mocks.profile.mockResolvedValue({ full_name: "Fixture", date_of_birth: "1990-01-01", phone: null }) })
  const client = (...results: unknown[]) => ({ rpc: vi.fn().mockImplementation(async () => results.shift()) })
  it("keeps immutable SQL disclosure and Terms metadata aligned with the shared contract", () => {
    const sql = readFileSync("supabase/migrations/20260915131638_checkout_consent_receipts.sql", "utf8")
    expect(sql).toContain(`p_version <> '${TELEHEALTH_CONSENT_VERSION}'`)
    expect(sql).toContain(`'termsVersion','${TERMS_VERSION}'`)
  })
  it.each([null, { error: { code: "failure" }, data: null }, { error: null, data: null }])("fails closed on unavailable receipt %s", async result => {
    const db = client(result)
    expect(await hasDurableCheckoutConsent(db as never, "intake")).toBe(false)
  })
  it("reads unchanged durable evidence without writing or fabricating historical consent", async () => {
    const db = client({ data: receipt, error: null })
    expect(await hasDurableCheckoutConsent(db as never, "intake")).toBe(true)
    expect(db.rpc).toHaveBeenCalledOnce()
    expect(db.rpc.mock.calls[0][0]).toBe("get_checkout_consent_state")
  })
  it("rejects invalid explicit consent before storage", async () => {
    const db = client()
    expect((await ensureCheckoutConsentEvidence(db as never, { intakeId: "intake", patientId: "patient", answers: { ...answers, telehealth_consent_given: false } })).ok).toBe(false)
    expect(db.rpc).not.toHaveBeenCalled()
  })
  it("rejects a submission that differs from persisted answers", async () => {
    const db = client({ data: { revision: "revision-1" }, error: null })
    mocks.answers.mockResolvedValue({ ...answers, symptom: "changed" })
    expect((await ensureCheckoutConsentEvidence(db as never, { intakeId: "intake", patientId: "patient", answers })).ok).toBe(false)
    expect(db.rpc).toHaveBeenCalledOnce()
  })
  it("records fresh explicit current consent for unchanged historic answers without rewriting history", async () => {
    const db = client({ data: { revision: "revision-1" }, error: null }, { data: receipt, error: null })
    mocks.answers.mockResolvedValue({ ...answers, telehealth_consent_version: "old", telehealth_consent_given: false })
    expect((await ensureCheckoutConsentEvidence(db as never, { intakeId: "intake", patientId: "patient", answers })).ok).toBe(true)
  })
  it("matches real transformed med-cert JSON and equivalent guest/auth phone and name", async () => {
    const transformed = transformAnswersForUnifiedCheckout("med-cert", { ...answers, symptomDetails: "Synthetic cold" })
    const db = client({ data: { revision: "revision-1" }, error: null }, { data: receipt, error: null })
    mocks.answers.mockResolvedValue(JSON.parse(JSON.stringify(transformed)))
    mocks.profile.mockResolvedValue({ full_name: "  Test Patient ", date_of_birth: "1990-01-01", phone: "+61400000000" })
    expect((await ensureCheckoutConsentEvidence(db as never, { intakeId: "intake", patientId: "patient", answers: transformed,
      identity: { fullName: "test   patient", dateOfBirth: "1990-01-01", phone: "0400 000 000" } })).ok).toBe(true)
  })
  it("normalizes optional undefined properties exactly as persisted JSON", async () => {
    const db = client({ data: { revision: "revision-1" }, error: null }, { data: receipt, error: null })
    expect((await ensureCheckoutConsentEvidence(db as never, { intakeId: "intake", patientId: "patient", answers: { ...answers, optional: undefined } })).ok).toBe(true)
  })
  it("rejects identity changed before revision capture rather than attesting the changed profile", async () => {
    const db = client({ data: { revision: "revision-1" }, error: null })
    expect((await ensureCheckoutConsentEvidence(db as never, { intakeId: "intake", patientId: "patient", answers, identity: { fullName: "Different" } })).ok).toBe(false)
    expect(db.rpc).toHaveBeenCalledOnce()
  })
  it("requires the atomic writer's receipt and passes the observed revision", async () => {
    const db = client({ data: { revision: "revision-1" }, error: null }, { data: receipt, error: null })
    expect((await ensureCheckoutConsentEvidence(db as never, { intakeId: "intake", patientId: "patient", answers })).ok).toBe(true)
    expect(db.rpc.mock.calls[1]).toEqual(["record_checkout_consent", { p_intake_id: "intake", p_patient_id: "patient", p_revision: "revision-1", p_version: TELEHEALTH_CONSENT_VERSION }])
  })
  it("rejects a concurrent revision change or partial audit write", async () => {
    const db = client({ data: { revision: "revision-1" }, error: null }, { data: null, error: { code: "revision_changed" } })
    expect((await ensureCheckoutConsentEvidence(db as never, { intakeId: "intake", patientId: "patient", answers })).ok).toBe(false)
  })
})
