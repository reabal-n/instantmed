import { beforeEach, describe, expect, it, vi } from "vitest"

import { refreshPatientParchmentPrescriptionsAction } from "@/app/actions/manual-patient"

const mocks = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), from: vi.fn() }))
vi.mock("@/lib/auth/helpers", () => ({ requireRoleOrNull: mocks.auth }))
vi.mock("@/lib/doctor/patient-access", () => ({ doctorCanAccessPatient: mocks.access }))
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: () => ({ from: mocks.from }) }))
vi.mock("@/lib/rate-limit/redis", () => ({ checkServerActionRateLimit: async () => ({ success: true }) }))
vi.mock("@/lib/feature-flags", () => ({ getFeatureFlags: async () => ({ parchment_embedded_prescribing: true }) }))

beforeEach(() => { vi.clearAllMocks(); mocks.access.mockResolvedValue(false) })
describe("prescription refresh access", () => {
  it("rejects an unrelated doctor before patient data or provider work", async () => {
    mocks.auth.mockResolvedValue({ profile: { id: "doctor", role: "doctor" } })
    const result = await refreshPatientParchmentPrescriptionsAction("11111111-1111-4111-8111-111111111111")
    expect(result).toEqual({ success: false, error: "Prescription refresh requires clinical patient access." })
    expect(mocks.from).not.toHaveBeenCalled()
  })
  it("rejects an unauthenticated request", async () => {
    mocks.auth.mockResolvedValue(null)
    expect(await refreshPatientParchmentPrescriptionsAction("11111111-1111-4111-8111-111111111111")).toEqual({ success: false, error: "Unauthorized" })
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
