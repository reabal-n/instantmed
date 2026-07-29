import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireRoleOrNull: vi.fn(),
  hasAdminAccess: vi.fn(),
  getDoctorQueue: vi.fn(),
  checkServerActionRateLimit: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  requireRoleOrNull: mocks.requireRoleOrNull,
}))

vi.mock("@/lib/auth/staff-capabilities", () => ({
  hasAdminAccess: mocks.hasAdminAccess,
}))

vi.mock("@/lib/data/intakes", () => ({
  getDoctorQueue: mocks.getDoctorQueue,
}))

vi.mock("@/lib/rate-limit/redis", () => ({
  checkServerActionRateLimit: mocks.checkServerActionRateLimit,
}))

import { searchDoctorQueueAction } from "@/app/doctor/queue/search-actions"

const queueResult = {
  data: [],
  total: 0,
  page: 1,
  pageSize: 50,
  degraded: false,
  statusCounts: { all: 0, review: 0, pending_info: 0, scripts: 0 },
  globalStatusCounts: { all: 0, review: 0, pending_info: 0, scripts: 0 },
  searchMatchCount: 0,
  searchState: "ready" as const,
  oldestWaitingEnteredAt: null,
  oldestWaitingIntakeId: null,
}

describe("searchDoctorQueueAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireRoleOrNull.mockResolvedValue({
      profile: { id: "doctor-current", role: "doctor" },
    })
    mocks.hasAdminAccess.mockReturnValue(false)
    mocks.checkServerActionRateLimit.mockResolvedValue({ success: true })
    mocks.getDoctorQueue.mockResolvedValue(queueResult)
  })

  afterEach(() => vi.unstubAllEnvs())

  it("fails closed when no doctor or admin session is present", async () => {
    mocks.requireRoleOrNull.mockResolvedValue(null)

    const result = await searchDoctorQueueAction({
      query: "Patient Smith",
      statusFilter: "all",
    })

    expect(result).toEqual({ success: false, error: "Unauthorized" })
    expect(mocks.requireRoleOrNull).toHaveBeenCalledWith(["doctor", "admin"])
    expect(mocks.getDoctorQueue).not.toHaveBeenCalled()
  })

  it("rejects a malformed runtime payload before any patient lookup", async () => {
    const result = await searchDoctorQueueAction(null as never)

    expect(result).toEqual({
      success: false,
      error: "Enter a patient name, email, or request reference.",
    })
    expect(mocks.getDoctorQueue).not.toHaveBeenCalled()
  })

  it("derives doctor scope server-side and normalizes the query before lookup", async () => {
    const result = await searchDoctorQueueAction({
      query: "  José (Smith),  ",
      statusFilter: "review",
      page: 2,
      pageSize: 25,
      allowSeeded: true,
      onlySeeded: true,
    })

    expect(result).toEqual({ success: true, data: queueResult })
    expect(mocks.checkServerActionRateLimit).toHaveBeenCalledWith(
      "doctor:queue-search:doctor-current",
      "standard",
    )
    expect(mocks.getDoctorQueue).toHaveBeenCalledWith({
      page: 2,
      pageSize: 25,
      doctorId: "doctor-current",
      allowSeeded: false,
      onlySeeded: false,
      statusFilter: "review",
      q: "José Smith",
    })
  })

  it("re-gates seeded data to an admin in local Playwright mode", async () => {
    vi.stubEnv("PLAYWRIGHT", "1")
    mocks.hasAdminAccess.mockReturnValue(true)

    await searchDoctorQueueAction({
      query: "E2E Test Patient",
      statusFilter: "all",
      allowSeeded: true,
      onlySeeded: true,
    })

    expect(mocks.getDoctorQueue).toHaveBeenCalledWith(expect.objectContaining({
      doctorId: "doctor-current",
      allowSeeded: true,
      onlySeeded: true,
    }))
  })

  it("fails closed at the per-clinician search rate limit", async () => {
    mocks.checkServerActionRateLimit.mockResolvedValue({
      success: false,
      error: "Too many requests. Please wait a moment before trying again.",
    })

    const result = await searchDoctorQueueAction({
      query: "Patient Smith",
      statusFilter: "all",
    })

    expect(result).toEqual({
      success: false,
      error: "Too many requests. Please wait a moment before trying again.",
    })
    expect(mocks.getDoctorQueue).not.toHaveBeenCalled()
  })

  it("returns generic failures without echoing a provider error or patient query", async () => {
    mocks.getDoctorQueue.mockRejectedValue(
      new Error("failed to parse logic tree (full_name.ilike.*Patient Smith*)"),
    )

    const result = await searchDoctorQueueAction({
      query: "Patient Smith",
      statusFilter: "all",
    })

    expect(result).toEqual({
      success: false,
      error: "The active-request lookup could not be completed.",
    })
    expect(JSON.stringify(result)).not.toContain("Patient Smith")
  })
})
