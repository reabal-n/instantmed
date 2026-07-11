import { readFileSync } from "node:fs"
import { join } from "node:path"

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireRoleOrNull: vi.fn(),
  createServiceRoleClient: vi.fn(),
  revalidateStaff: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({
  requireRoleOrNull: mocks.requireRoleOrNull,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/dashboard/revalidate-staff", () => ({
  revalidateStaff: mocks.revalidateStaff,
}))

const INTAKE_ID = "11111111-1111-4111-8111-111111111111"
const DOCTOR_ID = "22222222-2222-4222-8222-222222222222"
const REVIEWED_AT = "2026-07-11T06:00:00.000Z"

type HarnessOptions = {
  updateData?: Array<{ id: string; batch_reviewed_at: string }> | null
  updateError?: { message: string } | null
  existingReviewedAt?: string | null
}

function createHarness(options: HarnessOptions = {}) {
  const updatePayloads: Array<Record<string, unknown>> = []
  const constraints: Array<[string, string, unknown?]> = []
  const auditRows: Array<Record<string, unknown>> = []

  const updateChain = {
    eq: vi.fn((column: string, value: unknown) => {
      constraints.push(["eq", column, value])
      return updateChain
    }),
    in: vi.fn((column: string, value: unknown) => {
      constraints.push(["in", column, value])
      return updateChain
    }),
    is: vi.fn((column: string, value: unknown) => {
      constraints.push(["is", column, value])
      return updateChain
    }),
    select: vi.fn(async () => ({
      data: options.updateData ?? [{ id: INTAKE_ID, batch_reviewed_at: REVIEWED_AT }],
      error: options.updateError ?? null,
    })),
  }

  const existingChain = {
    eq: vi.fn(() => existingChain),
    maybeSingle: vi.fn(async () => ({
      data: { batch_reviewed_at: options.existingReviewedAt ?? null },
      error: null,
    })),
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "intakes") {
        return {
          update: vi.fn((payload: Record<string, unknown>) => {
            updatePayloads.push(payload)
            return updateChain
          }),
          select: vi.fn(() => existingChain),
        }
      }
      if (table === "ai_audit_log") {
        return {
          insert: vi.fn(async (row: Record<string, unknown>) => {
            auditRows.push(row)
            return { error: null }
          }),
        }
      }
      throw new Error(`Unexpected table ${table}`)
    }),
  }

  return { supabase, updatePayloads, constraints, auditRows }
}

function doctorProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: DOCTOR_ID,
    role: "doctor",
    can_review_med_certs: true,
    ...overrides,
  }
}

describe("markBatchReviewed", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(REVIEWED_AT))
    mocks.requireRoleOrNull.mockResolvedValue({
      user: { id: "auth-user" },
      profile: doctorProfile(),
    })
  })

  it("rejects callers without doctor access", async () => {
    mocks.requireRoleOrNull.mockResolvedValue(null)
    const { markBatchReviewed } = await import("@/app/actions/batch-review-cert")

    await expect(markBatchReviewed(INTAKE_ID)).resolves.toEqual({
      success: false,
      error: "Unauthorized",
    })
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("rejects doctors without review_med_certs capability", async () => {
    mocks.requireRoleOrNull.mockResolvedValue({
      user: { id: "auth-user" },
      profile: doctorProfile({ can_review_med_certs: false }),
    })
    const { markBatchReviewed } = await import("@/app/actions/batch-review-cert")

    await expect(markBatchReviewed(INTAKE_ID)).resolves.toEqual({
      success: false,
      error: "You are not authorised to review medical certificates",
    })
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("CAS-updates one eligible auto-approved med cert and records the doctor outcome", async () => {
    const harness = createHarness()
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const { markBatchReviewed } = await import("@/app/actions/batch-review-cert")

    await expect(markBatchReviewed(INTAKE_ID)).resolves.toEqual({
      success: true,
      reviewedAt: REVIEWED_AT,
    })
    expect(harness.updatePayloads).toEqual([{
      batch_reviewed_at: REVIEWED_AT,
      batch_reviewed_by: DOCTOR_ID,
    }])
    expect(harness.constraints).toEqual([
      ["eq", "id", INTAKE_ID],
      ["eq", "ai_approved", true],
      ["eq", "category", "medical_certificate"],
      ["in", "status", ["approved"]],
      ["is", "batch_reviewed_at", null],
    ])
    expect(harness.auditRows).toEqual([
      expect.objectContaining({
        intake_id: INTAKE_ID,
        action: "approve",
        actor_id: DOCTOR_ID,
        actor_type: "doctor",
        metadata: {
          review_type: "post_auto_approval_batch_review",
          outcome: "reviewed_no_change",
        },
      }),
    ])
  })

  it("does not report success when the compare-and-set update returns zero rows", async () => {
    const harness = createHarness({ updateData: [] })
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const { markBatchReviewed } = await import("@/app/actions/batch-review-cert")

    await expect(markBatchReviewed(INTAKE_ID)).resolves.toEqual({
      success: false,
      error: "Certificate is not eligible for batch review",
    })
    expect(harness.auditRows).toEqual([])
  })

  it("treats an already-reviewed row as idempotent success", async () => {
    const harness = createHarness({ updateData: [], existingReviewedAt: "2026-07-11T05:30:00.000Z" })
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const { markBatchReviewed } = await import("@/app/actions/batch-review-cert")

    await expect(markBatchReviewed(INTAKE_ID)).resolves.toEqual({
      success: true,
      reviewedAt: "2026-07-11T05:30:00.000Z",
    })
    expect(harness.auditRows).toEqual([])
  })

  it("rejects malformed intake identifiers before querying", async () => {
    const { markBatchReviewed } = await import("@/app/actions/batch-review-cert")

    await expect(markBatchReviewed("not-a-uuid")).resolves.toEqual({
      success: false,
      error: "Invalid intake ID",
    })
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("does not export a bulk acknowledgement action", () => {
    const source = readFileSync(
      join(process.cwd(), "app/actions/batch-review-cert.ts"),
      "utf8",
    )
    expect(source).not.toContain("markAllBatchReviewed")
  })
})
