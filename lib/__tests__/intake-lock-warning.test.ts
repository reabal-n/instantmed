import { beforeEach, describe, expect, it, vi } from "vitest"

describe("acquireIntakeLock when System holds auto-approve claim", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doUnmock("@/lib/supabase/service-role")
  })

  it("masks the empty '( minutes remaining)' template when System holds the claim", async () => {
    vi.doMock("@/lib/supabase/service-role", () => ({
      createServiceRoleClient: () => ({
        rpc: vi.fn().mockImplementation((name: string) => {
          if (name === "claim_intake_for_review") {
            return Promise.resolve({
              data: [{
                success: false,
                current_claimant: "System (Auto-Approve)",
                error_message: "Already claimed by System (Auto-Approve) ( minutes remaining)",
              }],
              error: null,
            })
          }
          return Promise.resolve({ data: null, error: null })
        }),
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { status: "paid" }, error: null }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                in: () => ({ error: null }),
              }),
            }),
          }),
        }),
      }),
    }))

    const mod = await import("@/lib/data/intake-lock")
    const result = await mod.acquireIntakeLock("intake-1", "doctor-1", "Dr Test")
    expect(result.acquired).toBe(false)
    expect(result.warning).not.toMatch(/\(\s*minutes remaining\s*\)/)
    expect(result.warning).toMatch(/you can still review/i)
  })

  it("skips terminal statuses before calling the claim RPC", async () => {
    const rpc = vi.fn()
    vi.doMock("@/lib/supabase/service-role", () => ({
      createServiceRoleClient: () => ({
        rpc,
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { status: "approved" }, error: null }),
            }),
          }),
          update: () => ({ eq: () => ({ eq: () => ({ in: () => ({ error: null }) }) }) }),
        }),
      }),
    }))

    const mod = await import("@/lib/data/intake-lock")
    const result = await mod.acquireIntakeLock("intake-2", "doctor-1", "Dr Test")
    expect(result.acquired).toBe(false)
    expect(result.warning).toBeUndefined()
    expect(rpc).not.toHaveBeenCalled()
  })
})
