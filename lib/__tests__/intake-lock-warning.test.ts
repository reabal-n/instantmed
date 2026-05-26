import { beforeEach, describe, expect, it, vi } from "vitest"

describe("acquireIntakeLock — System auto-approve claimant", () => {
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

  it("passes through real System error messages when the broken-minutes template is absent", async () => {
    // Mock returns a hypothetical future System error that does NOT contain "( minutes remaining)".
    // This proves the mask is gated on the broken template, not just the claimant name.
    vi.doMock("@/lib/supabase/service-role", () => ({
      createServiceRoleClient: () => ({
        rpc: vi.fn().mockResolvedValue({
          data: [{
            success: false,
            current_claimant: "System (Auto-Approve)",
            error_message: "Cannot claim intake in 'declined' status",
          }],
          error: null,
        }),
        from: () => ({ update: () => ({ eq: () => ({ eq: () => ({ in: () => ({ error: null }) }) }) }) }),
      }),
    }))

    // Re-import the module under the new mock.
    const mod = await import("@/lib/data/intake-lock")
    const result = await mod.acquireIntakeLock("intake-2", "doctor-1", "Dr Test")
    expect(result.acquired).toBe(false)
    expect(result.warning).toBe("Cannot claim intake in 'declined' status")
  })
})
