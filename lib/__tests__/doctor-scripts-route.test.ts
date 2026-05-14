import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PATCH } from "@/app/api/doctor/scripts/[id]/route"

const mocks = vi.hoisted(() => ({
  applyRateLimit: vi.fn(),
  createServiceRoleClient: vi.fn(),
  logExternalPrescribingIndicated: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  requireApiRole: vi.fn(),
  requireValidCsrf: vi.fn(),
  updateScriptTaskStatus: vi.fn(),
}))

vi.mock("@/lib/audit/compliance-audit", () => ({
  logExternalPrescribingIndicated: mocks.logExternalPrescribingIndicated,
}))

vi.mock("@/lib/auth/helpers", () => ({
  requireApiRole: mocks.requireApiRole,
}))

vi.mock("@/lib/data/script-tasks", () => ({
  updateScriptTaskStatus: mocks.updateScriptTaskStatus,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@/lib/rate-limit/redis", () => ({
  applyRateLimit: mocks.applyRateLimit,
}))

vi.mock("@/lib/security/csrf", () => ({
  requireValidCsrf: mocks.requireValidCsrf,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

const TASK_ID = "11111111-1111-4111-8111-111111111111"
const DOCTOR_ID = "22222222-2222-4222-8222-222222222222"
const OTHER_DOCTOR_ID = "33333333-3333-4333-8333-333333333333"
const INTAKE_ID = "44444444-4444-4444-8444-444444444444"

function makePatchRequest(body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/doctor/scripts/${TASK_ID}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "PATCH",
  })
}

function createSupabaseMock(task: Record<string, unknown> | null) {
  const taskSelect = {
    eq: vi.fn(() => taskSelect),
    single: vi.fn(async () => ({ data: task, error: task ? null : { message: "not found" } })),
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "script_tasks") {
        return {
          select: vi.fn(() => taskSelect),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    }),
  }

  mocks.createServiceRoleClient.mockReturnValue(supabase)
  return supabase
}

describe("PATCH /api/doctor/scripts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.applyRateLimit.mockResolvedValue(null)
    mocks.requireValidCsrf.mockResolvedValue(null)
    mocks.requireApiRole.mockResolvedValue({
      profile: { id: DOCTOR_ID, role: "doctor" },
      userId: "auth-user",
    })
    mocks.updateScriptTaskStatus.mockResolvedValue(true)
    mocks.logExternalPrescribingIndicated.mockResolvedValue(undefined)
  })

  it("blocks doctors from updating another doctor's script task", async () => {
    createSupabaseMock({
      doctor_id: OTHER_DOCTOR_ID,
      id: TASK_ID,
      intake_id: INTAKE_ID,
    })

    const response = await PATCH(makePatchRequest({ status: "sent" }), {
      params: Promise.resolve({ id: TASK_ID }),
    })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({ error: "You can only update your own script tasks" })
    expect(mocks.updateScriptTaskStatus).not.toHaveBeenCalled()
    expect(mocks.logExternalPrescribingIndicated).not.toHaveBeenCalled()
  })

  it("allows admins to update any script task and writes prescribing boundary evidence", async () => {
    mocks.requireApiRole.mockResolvedValue({
      profile: { id: "admin-1", role: "admin" },
      userId: "auth-admin",
    })
    createSupabaseMock({
      doctor_id: OTHER_DOCTOR_ID,
      id: TASK_ID,
      intake_id: INTAKE_ID,
    })

    const response = await PATCH(makePatchRequest({ status: "sent" }), {
      params: Promise.resolve({ id: TASK_ID }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ success: true })
    expect(mocks.updateScriptTaskStatus).toHaveBeenCalledWith(TASK_ID, "sent", undefined)
    expect(mocks.logExternalPrescribingIndicated).toHaveBeenCalledWith(
      INTAKE_ID,
      "repeat_rx",
      "admin-1",
      "parchment",
    )
  })
})
