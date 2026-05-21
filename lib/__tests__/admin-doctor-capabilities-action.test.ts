import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireRoleOrNull: vi.fn(),
  createServiceRoleClient: vi.fn(),
  logAuditEvent: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  requireRoleOrNull: mocks.requireRoleOrNull,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mocks.logAuditEvent,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

import {
  type DoctorCapabilities,
  updateDoctorCapabilitiesAction,
} from "@/app/actions/admin-doctor-capabilities"

const DOCTOR_ID = "11111111-1111-4111-8111-111111111111"
const ADMIN_PROFILE_ID = "22222222-2222-4222-8222-222222222222"

const FULL_GRANT: DoctorCapabilities = {
  can_review_med_certs: true,
  can_review_repeat_rx: true,
  can_review_consults: true,
  can_review_ed: true,
  can_review_hair_loss: true,
  can_prescribe_s4: true,
  can_prescribe_s8: true,
}

const DEFAULT_NO_S8: DoctorCapabilities = {
  can_review_med_certs: true,
  can_review_repeat_rx: true,
  can_review_consults: true,
  can_review_ed: true,
  can_review_hair_loss: true,
  can_prescribe_s4: true,
  can_prescribe_s8: false,
}

type StubFromOptions = {
  selectData?: Partial<DoctorCapabilities> | null
  selectError?: { message: string } | null
  updateError?: { message: string } | null
}

function stubSupabase(opts: StubFromOptions) {
  const updateCalls: Record<string, unknown>[] = []
  const eqUpdateCalls: Array<[string, unknown]> = []

  const fromMock = vi.fn((_table: string) => {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: opts.selectData ?? null,
            error: opts.selectError ?? null,
          })),
        })),
      })),
      update: vi.fn((payload: Record<string, unknown>) => {
        updateCalls.push(payload)
        return {
          eq: vi.fn(async (col: string, val: unknown) => {
            eqUpdateCalls.push([col, val])
            return { error: opts.updateError ?? null }
          }),
        }
      }),
    }
  })

  mocks.createServiceRoleClient.mockReturnValue({ from: fromMock })
  return { fromMock, updateCalls, eqUpdateCalls }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireRoleOrNull.mockResolvedValue({
    user: { id: "auth-user", email: "admin@instantmed.com.au" },
    profile: { id: ADMIN_PROFILE_ID, role: "admin" },
  })
})

describe("updateDoctorCapabilitiesAction", () => {
  it("returns Unauthorized when the caller is not admin", async () => {
    mocks.requireRoleOrNull.mockResolvedValueOnce(null)

    const { fromMock } = stubSupabase({ selectData: DEFAULT_NO_S8 })
    const result = await updateDoctorCapabilitiesAction(DOCTOR_ID, FULL_GRANT)

    expect(result).toEqual({ success: false, error: "Unauthorized" })
    expect(fromMock).not.toHaveBeenCalled()
    expect(mocks.logAuditEvent).not.toHaveBeenCalled()
  })

  it("returns Doctor not found when the read fails", async () => {
    stubSupabase({ selectError: { message: "no row" } })

    const result = await updateDoctorCapabilitiesAction(DOCTOR_ID, FULL_GRANT)

    expect(result).toEqual({ success: false, error: "Doctor not found" })
    expect(mocks.logAuditEvent).not.toHaveBeenCalled()
  })

  it("no-ops cleanly when capabilities are unchanged", async () => {
    const { updateCalls } = stubSupabase({ selectData: { ...DEFAULT_NO_S8 } })

    const result = await updateDoctorCapabilitiesAction(DOCTOR_ID, DEFAULT_NO_S8)

    expect(result).toEqual({ success: true })
    expect(updateCalls).toHaveLength(0)
    expect(mocks.logAuditEvent).not.toHaveBeenCalled()
    // No revalidate when nothing changed
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it("updates only the diff fields and writes them to profiles", async () => {
    const before: DoctorCapabilities = { ...DEFAULT_NO_S8, can_review_hair_loss: false }
    const next: DoctorCapabilities = { ...DEFAULT_NO_S8, can_review_hair_loss: true, can_prescribe_s8: true }
    const { updateCalls, eqUpdateCalls } = stubSupabase({ selectData: before })

    const result = await updateDoctorCapabilitiesAction(DOCTOR_ID, next)

    expect(result).toEqual({ success: true })
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0]).toEqual({
      can_review_hair_loss: true,
      can_prescribe_s8: true,
    })
    expect(eqUpdateCalls[0]).toEqual(["id", DOCTOR_ID])
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/doctors")
  })

  it("logs an audit event with the full before/after diff and admin actor", async () => {
    const before: DoctorCapabilities = { ...DEFAULT_NO_S8 }
    const next: DoctorCapabilities = { ...DEFAULT_NO_S8, can_prescribe_s8: true, can_review_ed: false }
    stubSupabase({ selectData: before })

    await updateDoctorCapabilitiesAction(DOCTOR_ID, next)

    expect(mocks.logAuditEvent).toHaveBeenCalledTimes(1)
    const payload = mocks.logAuditEvent.mock.calls[0][0] as {
      action: string
      actorId: string
      actorType: string
      metadata: { target_doctor_id: string; changes: Array<{ field: string; from: boolean; to: boolean }> }
    }
    expect(payload.action).toBe("doctor_capabilities_updated")
    expect(payload.actorId).toBe(ADMIN_PROFILE_ID)
    expect(payload.actorType).toBe("admin")
    expect(payload.metadata.target_doctor_id).toBe(DOCTOR_ID)
    expect(payload.metadata.changes).toContainEqual({
      field: "can_prescribe_s8",
      from: false,
      to: true,
    })
    expect(payload.metadata.changes).toContainEqual({
      field: "can_review_ed",
      from: true,
      to: false,
    })
  })

  it("returns the Supabase error when the update fails and skips audit log", async () => {
    stubSupabase({
      selectData: { ...DEFAULT_NO_S8 },
      updateError: { message: "duplicate key" },
    })

    const result = await updateDoctorCapabilitiesAction(DOCTOR_ID, FULL_GRANT)

    expect(result).toEqual({ success: false, error: "duplicate key" })
    expect(mocks.logAuditEvent).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })
})
