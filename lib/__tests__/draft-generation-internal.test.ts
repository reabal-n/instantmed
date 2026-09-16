import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ exists: vi.fn(), remove: vi.fn(), client: vi.fn(), clinical: vi.fn(), medcert: vi.fn(), repeat: vi.fn(), consult: vi.fn(), auth: vi.fn() }))
vi.mock("@/lib/auth/helpers", () => ({ requireRoleOrNull: mocks.auth }))
vi.mock("@/lib/ai/drafts", () => ({ draftsExist: mocks.exists, deleteDrafts: mocks.remove }))
vi.mock("@/app/actions/drafts/shared", () => ({ getServiceClient: mocks.client, formatIntakeContext: () => "synthetic context", log: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }))
vi.mock("@/app/actions/drafts/generate-clinical-note", () => ({ generateClinicalNoteDraft: mocks.clinical }))
vi.mock("@/app/actions/drafts/generate-med-cert", () => ({ generateMedCertDraft: mocks.medcert }))
vi.mock("@/app/actions/drafts/generate-repeat-rx", () => ({ generateRepeatRxDraft: mocks.repeat }))
vi.mock("@/app/actions/drafts/generate-consult", () => ({ generateConsultDraft: mocks.consult }))

import { generateDraftsForIntake } from "@/app/actions/generate-drafts"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.mockRejectedValue(new Error("No browser session in a background worker"))
  mocks.exists.mockResolvedValue(false)
  for (const generate of [mocks.clinical, mocks.medcert, mocks.repeat, mocks.consult]) generate.mockResolvedValue({ status: "ready" })
})

describe("internal background draft generation", () => {
  it("preserves idempotent skip without a browser session or data lookup", async () => {
    mocks.exists.mockResolvedValue(true)
    expect(await generateDraftsForIntake("synthetic-intake")).toEqual({ success: true, skipped: true })
    expect(mocks.auth).not.toHaveBeenCalled()
    expect(mocks.client).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })
  it.each([
    ["med_certs", "med_cert", mocks.medcert],
    ["common_scripts", "repeat_rx", mocks.repeat],
    ["consult", "consult", mocks.consult],
  ] as const)("generates %s drafts from an internal caller without login", async (serviceType, draftCategory, serviceGenerator) => {
    const builder = { select: () => builder, eq: () => builder, single: async () => ({ data: {
      id: "synthetic-intake", service: { type: serviceType, name: "Synthetic service" }, patient: {}, answers: [{ answers: {} }],
    }, error: null }) }
    mocks.client.mockReturnValue({ from: () => builder })
    const result = await generateDraftsForIntake("synthetic-intake")
    expect(result).toMatchObject({ success: true, draftCategory })
    expect(mocks.clinical).toHaveBeenCalled()
    expect(serviceGenerator).toHaveBeenCalled()
    expect(mocks.auth).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })
})
