import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), client: vi.fn(), mutation: vi.fn(), audit: vi.fn(), sync: vi.fn(), generate: vi.fn(),
}))
vi.mock("@/lib/auth/helpers", () => ({ requireRoleOrNull: mocks.auth }))
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: mocks.client }))
vi.mock("@/lib/dashboard/revalidate-staff", () => ({ revalidateStaff: vi.fn() }))
vi.mock("@/lib/data/intake-answer-hash", () => ({ computeIntakeHash: vi.fn() }))
vi.mock("@/lib/security/phi-field-wrappers", () => ({ prepareDocumentDraftEditedContentWrite: vi.fn(async () => ({})) }))
vi.mock("@/app/actions/drafts/audit-log", () => ({ logAuditEvent: mocks.audit }))
vi.mock("@/app/actions/drafts/clinical-note-sync", () => ({ syncClinicalNoteToIntake: mocks.sync }))
vi.mock("@/app/actions/generate-drafts", () => ({ generateDraftsForIntake: mocks.generate }))

import { approveDraft, regenerateDrafts, rejectDraft } from "@/app/actions/draft-approval"

const owner = { id: "doctor-1", role: "doctor", can_review_med_certs: true }
const owned = { claimed_by: owner.id, reviewing_doctor_id: null, reviewed_by: null, subtype: "work", service: { type: "med_certs" } }
let intakeResult: { data: unknown; error: unknown }

function client() {
  return { from: vi.fn((table: string) => {
    let columns = ""
    const builder = {
      select: vi.fn((value: string) => { columns = value; return builder }),
      eq: vi.fn(() => builder),
      update: vi.fn((value: unknown) => { mocks.mutation(table, "update", value); return builder }),
      delete: vi.fn(() => { mocks.mutation(table, "delete"); return builder }),
      single: vi.fn(async () => table === "intakes"
        ? columns.includes("assigned_doctor_id")
          ? { data: null, error: { code: "42703" } }
          : intakeResult
        : { data: { id: "draft-1", intake_id: "intake-1", type: "clinical_note", content: {}, approved_at: null, rejected_at: null }, error: null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [{ id: "draft-1", version: 1 }], error: null }).then(resolve),
    }
    return builder
  }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue({ profile: owner })
  intakeResult = { data: owned, error: null }
  mocks.client.mockReturnValue(client())
  mocks.generate.mockResolvedValue({ success: true })
  mocks.sync.mockResolvedValue({ success: true })
})

describe.each([
  ["approve", () => approveDraft("draft-1")],
  ["reject", () => rejectDraft("draft-1", "Needs correction")],
  ["regenerate", () => regenerateDrafts("intake-1")],
] as const)("draft %s authorization", (_name, act) => {
  it.each([
    ["foreign claim", { ...owned, claimed_by: "doctor-2" }, null],
    ["unclaimed", { ...owned, claimed_by: null }, null],
    ["historical reviewer only", { ...owned, claimed_by: null, reviewed_by: owner.id }, null],
    ["lookup failure", null, { code: "42703" }],
    ["missing intake", null, null],
    ["partial data with error", owned, { code: "read_failed" }],
  ])("blocks %s before writes, audit or generation", async (_case, data, error) => {
    intakeResult = { data, error }
    expect((await act()).success).toBe(false)
    expect(mocks.mutation).not.toHaveBeenCalled()
    expect(mocks.audit).not.toHaveBeenCalled()
    expect(mocks.sync).not.toHaveBeenCalled()
    expect(mocks.generate).not.toHaveBeenCalled()
  })
  it("blocks a clinician without the service capability", async () => {
    mocks.auth.mockResolvedValue({ profile: { ...owner, can_review_med_certs: false } })
    expect((await act()).success).toBe(false)
    expect(mocks.mutation).not.toHaveBeenCalled()
  })
  it.each(["claimed_by", "reviewing_doctor_id"])("allows the current %s owner", async field => {
    intakeResult = { data: { ...owned, claimed_by: null, [field]: owner.id }, error: null }
    expect((await act()).success).toBe(true)
  })
  it("preserves admin access to an existing foreign-owned case", async () => {
    mocks.auth.mockResolvedValue({ profile: { ...owner, role: "admin" } })
    intakeResult = { data: { ...owned, claimed_by: "doctor-2" }, error: null }
    expect((await act()).success).toBe(true)
  })
  it("requires authentication before data access", async () => {
    mocks.auth.mockResolvedValue(null)
    expect((await act()).success).toBe(false)
    expect(mocks.client).not.toHaveBeenCalled()
  })
})
