import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireRoleOrNull: vi.fn(),
  hasAdminAccess: vi.fn(),
  getPatientDirectoryPage: vi.fn(),
  checkServerActionRateLimit: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  requireRoleOrNull: mocks.requireRoleOrNull,
}))

vi.mock("@/lib/auth/staff-capabilities", () => ({
  hasAdminAccess: mocks.hasAdminAccess,
}))

vi.mock("@/lib/data/patient-directory", () => ({
  getPatientDirectoryPage: mocks.getPatientDirectoryPage,
  parsePatientDirectorySearch: (value: string) => value
    .replace(/[,%()_*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80),
}))

vi.mock("@/lib/rate-limit/redis", () => ({
  checkServerActionRateLimit: mocks.checkServerActionRateLimit,
}))

import { searchPatientDirectoryAction } from "@/app/doctor/patients/search-actions"

const emptyDirectory = {
  patients: [],
  total: 0,
  collapsedCount: 0,
  degradedSources: [],
}

describe("searchPatientDirectoryAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireRoleOrNull.mockResolvedValue({
      profile: { id: "doctor-current", role: "doctor" },
    })
    mocks.hasAdminAccess.mockReturnValue(false)
    mocks.checkServerActionRateLimit.mockResolvedValue({ success: true })
    mocks.getPatientDirectoryPage.mockResolvedValue(emptyDirectory)
  })

  it("fails closed before querying when no doctor or admin session exists", async () => {
    mocks.requireRoleOrNull.mockResolvedValue(null)

    const result = await searchPatientDirectoryAction({ query: "Patient Smith" })

    expect(result).toEqual({ success: false, error: "Unauthorized" })
    expect(mocks.requireRoleOrNull).toHaveBeenCalledWith(["doctor", "admin"])
    expect(mocks.getPatientDirectoryPage).not.toHaveBeenCalled()
  })

  it("keeps ordinary doctors inside their touched-patient scope", async () => {
    const result = await searchPatientDirectoryAction({
      query: "  José (Smith),  ",
      page: 2,
      pageSize: 25,
      sort: "name",
    })

    expect(result).toEqual({
      success: true,
      data: { ...emptyDirectory, page: 2, pageSize: 25 },
    })
    expect(mocks.checkServerActionRateLimit).toHaveBeenCalledWith(
      "staff:patient-search:doctor-current",
      "standard",
    )
    expect(mocks.getPatientDirectoryPage).toHaveBeenCalledWith({
      doctorId: "doctor-current",
      page: 2,
      pageSize: 25,
      search: "José Smith",
      sort: "name",
    })
  })

  it("allows the authenticated admin owner to search the full directory", async () => {
    mocks.hasAdminAccess.mockReturnValue(true)

    await searchPatientDirectoryAction({ query: "Ada" })

    expect(mocks.getPatientDirectoryPage).toHaveBeenCalledWith(expect.objectContaining({
      doctorId: undefined,
    }))
  })

  it("fails closed at the per-staff search rate limit", async () => {
    mocks.checkServerActionRateLimit.mockResolvedValue({
      success: false,
      error: "Too many requests. Please wait a moment before trying again.",
    })

    const result = await searchPatientDirectoryAction({ query: "Patient Smith" })

    expect(result).toEqual({
      success: false,
      error: "Too many requests. Please wait a moment before trying again.",
    })
    expect(mocks.getPatientDirectoryPage).not.toHaveBeenCalled()
  })

  it("returns a generic failure without echoing a provider filter or query", async () => {
    mocks.getPatientDirectoryPage.mockRejectedValue(
      new Error("failed to parse logic tree (full_name.ilike.*Patient Smith*)"),
    )

    const result = await searchPatientDirectoryAction({ query: "Patient Smith" })

    expect(result).toEqual({
      success: false,
      error: "The patient-directory lookup could not be completed.",
    })
    expect(JSON.stringify(result)).not.toContain("Patient Smith")
  })
})
