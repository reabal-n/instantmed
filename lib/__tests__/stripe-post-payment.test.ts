import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  attemptAutoApproval: vi.fn(),
  generateDraftsForIntake: vi.fn(),
  getFeatureFlags: vi.fn(),
  markDraftsReady: vi.fn(),
}))

vi.mock("@/app/actions/generate-drafts", () => ({
  generateDraftsForIntake: mocks.generateDraftsForIntake,
}))

vi.mock("@/lib/clinical/auto-approval-pipeline", () => ({
  attemptAutoApproval: mocks.attemptAutoApproval,
}))

vi.mock("@/lib/clinical/auto-approval-state", () => ({
  markDraftsReady: mocks.markDraftsReady,
}))

vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlags: mocks.getFeatureFlags,
}))

import { startPostPaymentReviewWork } from "@/lib/stripe/post-payment"

const INTAKE_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

function createSupabaseMock() {
  const updatePayloads: Record<string, unknown>[] = []
  const upsertPayloads: Record<string, unknown>[] = []

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "intakes") {
        return {
          update: vi.fn((payload: Record<string, unknown>) => {
            updatePayloads.push(payload)
            return {
              eq: vi.fn(() => ({
                is: vi.fn(async () => ({ error: null })),
              })),
            }
          }),
        }
      }

      if (table === "ai_draft_retry_queue") {
        return {
          upsert: vi.fn(async (payload: Record<string, unknown>) => {
            upsertPayloads.push(payload)
            return { error: null }
          }),
        }
      }

      throw new Error(`Unexpected table ${table}`)
    }),
  }

  return { supabase, updatePayloads, upsertPayloads }
}

describe("startPostPaymentReviewWork", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.generateDraftsForIntake.mockResolvedValue({ success: true })
    mocks.getFeatureFlags.mockResolvedValue({ auto_approve_delay_minutes: 0 })
    mocks.markDraftsReady.mockResolvedValue(true)
    mocks.attemptAutoApproval.mockResolvedValue({ autoApproved: false, reason: "needs_doctor" })
  })

  it("initializes med-cert review state and schedules draft generation through one shared path", async () => {
    const scheduled: Array<() => Promise<void>> = []
    const { supabase, updatePayloads } = createSupabaseMock()

    await startPostPaymentReviewWork({
      generateDraftsForIntake: mocks.generateDraftsForIntake,
      intakeId: INTAKE_ID,
      schedule: (task) => scheduled.push(task),
      serviceCategory: "medical_certificate",
      serviceSlug: "med-cert-sick",
      supabase: supabase as never,
    })

    expect(updatePayloads[0]).toMatchObject({
      auto_approval_state: "awaiting_drafts",
    })
    expect(scheduled).toHaveLength(1)

    await scheduled[0]()

    expect(mocks.generateDraftsForIntake).toHaveBeenCalledWith(INTAKE_ID)
    expect(mocks.markDraftsReady).toHaveBeenCalledWith(supabase, INTAKE_ID)
    expect(mocks.attemptAutoApproval).toHaveBeenCalledWith(INTAKE_ID)
  })

  it("queues draft retry work when post-payment draft generation fails", async () => {
    const scheduled: Array<() => Promise<void>> = []
    const { supabase, upsertPayloads } = createSupabaseMock()
    mocks.generateDraftsForIntake.mockResolvedValue({ success: false, error: "model offline" })

    await startPostPaymentReviewWork({
      generateDraftsForIntake: mocks.generateDraftsForIntake,
      intakeId: INTAKE_ID,
      schedule: (task) => scheduled.push(task),
      serviceCategory: "consult",
      serviceSlug: "consult",
      supabase: supabase as never,
    })

    await scheduled[0]()

    expect(upsertPayloads[0]).toMatchObject({
      attempts: 1,
      intake_id: INTAKE_ID,
      last_error: "model offline",
    })
  })
})
