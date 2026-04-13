import { beforeEach,describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}))
vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  }),
}))
vi.mock("@/lib/posthog-server", () => ({
  getPostHogClient: () => ({ capture: vi.fn(), shutdown: vi.fn() }),
}))
vi.mock("@/lib/notifications/telegram", () => ({
  sendTelegramAlert: vi.fn().mockResolvedValue(undefined),
  escapeMarkdownValue: (v: string) => v,
}))

const INTAKE_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

// Helper: mock supabase chain that returns configurable update results
function mockSupabase(updateResult: { data: unknown[]; error: null } | { data: null; error: { message: string; code: string } }) {
  const chain: Record<string, unknown> = {}
  const methods = ["update", "eq", "is", "in", "lt", "select", "single"]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  // Terminal: select after update returns rows
  chain.select = vi.fn().mockReturnValue({
    ...chain,
    then: (resolve: (v: unknown) => unknown) => resolve(updateResult),
  })
  return { from: vi.fn().mockReturnValue(chain), chain }
}

describe("auto-approval-state transitions", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("claimForProcessing transitions pending → attempting and sets claimed_by to SYSTEM_AUTO_APPROVE_ID", async () => {
    const { from, chain } = mockSupabase({ data: [{ id: INTAKE_ID }], error: null })
    const { claimForProcessing } = await import("@/lib/clinical/auto-approval-state")
    const { SYSTEM_AUTO_APPROVE_ID } = await import("@/lib/constants")
    const result = await claimForProcessing({ from } as never, INTAKE_ID)

    expect(result).toBe(true)
    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    // State machine must write claimed_by so atomicApproveCertificate's claim-ownership
    // guard passes without a separate claim_intake_for_review RPC call.
    expect(updateArg.auto_approval_state).toBe("attempting")
    expect(updateArg.claimed_by).toBe(SYSTEM_AUTO_APPROVE_ID)
    expect(chain.in).toHaveBeenCalled() // in("auto_approval_state", ["pending", "failed_retrying"])
  })

  it("claimForProcessing returns false when CAS fails (0 rows)", async () => {
    const { from } = mockSupabase({ data: [], error: null })
    const { claimForProcessing } = await import("@/lib/clinical/auto-approval-state")
    const result = await claimForProcessing({ from } as never, INTAKE_ID)

    expect(result).toBe(false)
  })

  it("markApproved transitions attempting → approved and sets ai_approved", async () => {
    const { from, chain } = mockSupabase({ data: [{ id: INTAKE_ID }], error: null })
    const { markApproved } = await import("@/lib/clinical/auto-approval-state")
    const result = await markApproved({ from } as never, INTAKE_ID)

    expect(result).toBe(true)
    // Should set ai_approved = true alongside state
    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateArg.auto_approval_state).toBe("approved")
    expect(updateArg.ai_approved).toBe(true)
    expect(updateArg.ai_approved_at).toBeTruthy()
  })

  it("markNeedsDoctor transitions attempting → needs_doctor with reason", async () => {
    const { from, chain } = mockSupabase({ data: [{ id: INTAKE_ID }], error: null })
    const { markNeedsDoctor } = await import("@/lib/clinical/auto-approval-state")
    const result = await markNeedsDoctor({ from } as never, INTAKE_ID, "emergency: chest pain")

    expect(result).toBe(true)
    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateArg.auto_approval_state).toBe("needs_doctor")
    expect(updateArg.auto_approval_state_reason).toBe("emergency: chest pain")
  })

  it("markFailedRetrying transitions attempting → failed_retrying and increments attempts", async () => {
    const { from, chain } = mockSupabase({ data: [{ id: INTAKE_ID }], error: null })
    const { markFailedRetrying } = await import("@/lib/clinical/auto-approval-state")
    const result = await markFailedRetrying({ from } as never, INTAKE_ID, "no_doctor_available")

    expect(result).toBe(true)
    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateArg.auto_approval_state).toBe("failed_retrying")
  })

  it("markDraftsReady transitions awaiting_drafts → pending", async () => {
    const { from, chain } = mockSupabase({ data: [{ id: INTAKE_ID }], error: null })
    const { markDraftsReady } = await import("@/lib/clinical/auto-approval-state")
    const result = await markDraftsReady({ from } as never, INTAKE_ID)

    expect(result).toBe(true)
    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateArg.auto_approval_state).toBe("pending")
  })

  it("handles DB errors gracefully and reports to Sentry", async () => {
    const { from } = mockSupabase({ data: null, error: { message: "connection lost", code: "08006" } })
    const Sentry = await import("@sentry/nextjs")
    const { claimForProcessing } = await import("@/lib/clinical/auto-approval-state")
    const result = await claimForProcessing({ from } as never, INTAKE_ID)

    expect(result).toBe(false)
    expect(Sentry.captureMessage).toHaveBeenCalled()
  })

  it("recoverStale transitions attempting → failed_retrying with timeout_recovery reason", async () => {
    const { from, chain } = mockSupabase({ data: [{ id: INTAKE_ID }], error: null })
    const { recoverStale } = await import("@/lib/clinical/auto-approval-state")
    const result = await recoverStale({ from } as never, INTAKE_ID)

    expect(result).toBe(true)
    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateArg.auto_approval_state).toBe("failed_retrying")
    expect(updateArg.auto_approval_state_reason).toBe("timeout_recovery")
  })

  it("markIneligible routes deterministic failures to needs_doctor", async () => {
    const { from, chain } = mockSupabase({ data: [{ id: INTAKE_ID }], error: null })
    const { markIneligible } = await import("@/lib/clinical/auto-approval-state")
    const result = await markIneligible({ from } as never, INTAKE_ID, "emergency: chest pain", ["emergency:chest_pain"], 0)

    expect(result).toBe(true)
    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateArg.auto_approval_state).toBe("needs_doctor")
  })

  it("markIneligible routes transient failures under max to failed_retrying", async () => {
    const { from, chain } = mockSupabase({ data: [{ id: INTAKE_ID }], error: null })
    const { markIneligible } = await import("@/lib/clinical/auto-approval-state")
    const result = await markIneligible({ from } as never, INTAKE_ID, "rate_limited", ["rate_limited"], 3)

    expect(result).toBe(true)
    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateArg.auto_approval_state).toBe("failed_retrying")
  })

  it("markIneligible routes max-retry transient failures to needs_doctor", async () => {
    const { from, chain } = mockSupabase({ data: [{ id: INTAKE_ID }], error: null })
    const { markIneligible } = await import("@/lib/clinical/auto-approval-state")
    const result = await markIneligible({ from } as never, INTAKE_ID, "rate_limited", ["rate_limited"], 10)

    expect(result).toBe(true)
    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateArg.auto_approval_state).toBe("needs_doctor")
    expect(updateArg.auto_approval_state_reason).toContain("max_retries_exhausted")
  })
})
