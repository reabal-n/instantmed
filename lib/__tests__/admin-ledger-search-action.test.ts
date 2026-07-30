import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireRoleOrNull: vi.fn(),
  getAllIntakesForAdmin: vi.fn(),
  buildCaseRowAttribution: vi.fn(),
  checkServerActionRateLimit: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  requireRoleOrNull: mocks.requireRoleOrNull,
}))

vi.mock("@/lib/data/intakes", () => ({
  getAllIntakesForAdmin: mocks.getAllIntakesForAdmin,
}))

vi.mock("@/lib/operator/cases/case-attribution", () => ({
  buildCaseRowAttribution: mocks.buildCaseRowAttribution,
}))

vi.mock("@/lib/rate-limit/redis", () => ({
  checkServerActionRateLimit: mocks.checkServerActionRateLimit,
}))

import { searchAdminLedgerAction } from "@/app/admin/intakes/search-actions"

const emptyLedger = {
  data: [],
  total: 0,
  page: 1,
  pageSize: 50,
  degraded: false,
  patientSearchUnavailable: false,
  patientSearchSaturated: false,
}

describe("searchAdminLedgerAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireRoleOrNull.mockResolvedValue({
      profile: { id: "admin-current", role: "admin" },
    })
    mocks.checkServerActionRateLimit.mockResolvedValue({ success: true })
    mocks.getAllIntakesForAdmin.mockResolvedValue(emptyLedger)
    mocks.buildCaseRowAttribution.mockReturnValue({ label: "Direct" })
  })

  it("fails closed before querying when no admin or support session exists", async () => {
    mocks.requireRoleOrNull.mockResolvedValue(null)

    const result = await searchAdminLedgerAction({ query: "IM-ONE" })

    expect(result).toEqual({ success: false, error: "Unauthorized" })
    expect(mocks.requireRoleOrNull).toHaveBeenCalledWith(["admin", "support"])
    expect(mocks.getAllIntakesForAdmin).not.toHaveBeenCalled()
  })

  it("derives the admin projection and validates all view filters server-side", async () => {
    await searchAdminLedgerAction({
      query: "  José (Smith),  ",
      page: 2,
      pageSize: 25,
      service: "repeat_rx",
      status: "awaiting_script",
      workLane: "clinical",
      chips: ["priority", "bogus", "priority"],
    })

    expect(mocks.checkServerActionRateLimit).toHaveBeenCalledWith(
      "staff:ledger-search:admin-current",
      "standard",
    )
    expect(mocks.getAllIntakesForAdmin).toHaveBeenCalledWith({
      viewerRole: "admin",
      page: 2,
      pageSize: 25,
      q: "José Smith",
      service: "repeat_rx",
      status: "awaiting_script",
      workLane: "clinical",
      chips: ["priority"],
    })
  })

  it("re-derives support masking and never computes admin attribution", async () => {
    const row = { id: "intake-1" }
    mocks.requireRoleOrNull.mockResolvedValue({
      profile: { id: "support-current", role: "support" },
    })
    mocks.getAllIntakesForAdmin.mockResolvedValue({ ...emptyLedger, data: [row] })

    const result = await searchAdminLedgerAction({ query: "IM-ONE" })

    expect(mocks.getAllIntakesForAdmin).toHaveBeenCalledWith(expect.objectContaining({
      viewerRole: "support",
    }))
    expect(mocks.buildCaseRowAttribution).not.toHaveBeenCalled()
    expect(result).toEqual({
      success: true,
      data: { ...emptyLedger, data: [{ ...row, attribution: null }] },
    })
  })

  it("fails closed at the per-staff search rate limit", async () => {
    mocks.checkServerActionRateLimit.mockResolvedValue({
      success: false,
      error: "Too many requests. Please wait a moment before trying again.",
    })

    const result = await searchAdminLedgerAction({ query: "IM-ONE" })

    expect(result).toEqual({
      success: false,
      error: "Too many requests. Please wait a moment before trying again.",
    })
    expect(mocks.getAllIntakesForAdmin).not.toHaveBeenCalled()
  })

  it("returns a generic failure without echoing a provider filter or query", async () => {
    mocks.getAllIntakesForAdmin.mockRejectedValue(
      new Error("failed to parse logic tree (full_name.ilike.*Patient Smith*)"),
    )

    const result = await searchAdminLedgerAction({ query: "Patient Smith" })

    expect(result).toEqual({
      success: false,
      error: "The request-ledger lookup could not be completed.",
    })
    expect(JSON.stringify(result)).not.toContain("Patient Smith")
  })
})
