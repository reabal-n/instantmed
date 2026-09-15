import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn(), read: vi.fn(), hash: vi.fn(), decrypt: vi.fn() }))
vi.mock("@/lib/auth/helpers", () => ({ requireRoleOrNull: mocks.auth }))
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: mocks.client }))
vi.mock("@/lib/data/intake-answer-hash", () => ({ computeIntakeHash: mocks.hash }))
vi.mock("@/lib/security/phi-field-wrappers", () => ({ readDocumentDraftEditedContent: mocks.decrypt }))

import { getAIDraftsForIntake } from "@/app/actions/drafts/draft-retrieval"
import { checkDraftStaleness } from "@/app/actions/drafts/draft-validation"

beforeEach(() => {
  vi.clearAllMocks()
  const builder = {
    select: vi.fn(() => builder), eq: vi.fn(() => builder),
    order: vi.fn(async () => { mocks.read(); return { data: [{ id: "synthetic-draft", edited_content: "synthetic note" }], error: null } }),
    single: vi.fn(async () => { mocks.read(); return { data: { intake_id: "synthetic-intake", input_hash: "old", created_at: new Date().toISOString() }, error: null } }),
  }
  mocks.client.mockReturnValue({ from: vi.fn(() => builder) })
  mocks.decrypt.mockResolvedValue("synthetic note")
  mocks.hash.mockResolvedValue("new")
})

describe.each([
  ["retrieval", () => getAIDraftsForIntake("synthetic-intake")],
  ["staleness", () => checkDraftStaleness("synthetic-draft")],
] as const)("draft %s action access", (_name, action) => {
  it.each(["anonymous", "patient A", "patient B", "support"])("denies %s before privileged reads", async () => {
    mocks.auth.mockResolvedValue(null)
    await action()
    expect(mocks.auth).toHaveBeenCalledWith(["doctor", "admin"])
    expect(mocks.client).not.toHaveBeenCalled()
    expect(mocks.read).not.toHaveBeenCalled()
    expect(mocks.hash).not.toHaveBeenCalled()
    expect(mocks.decrypt).not.toHaveBeenCalled()
  })
  // SECURITY table policies and doctors_view_document_drafts permit queue-wide
  // clinician reads. Mutation assignment/capability rules are tested separately.
  it.each(["doctor", "admin"])("preserves %s clinical read access without requiring a claim", async role => {
    mocks.auth.mockResolvedValue({ profile: { id: "synthetic-reader", role } })
    const result = await action()
    expect(mocks.read).toHaveBeenCalled()
    expect(result).toEqual(_name === "retrieval"
      ? [{ id: "synthetic-draft", edited_content: "synthetic note" }]
      : { isStale: true, reason: "Patient answers have been updated since draft was generated" })
  })
})
