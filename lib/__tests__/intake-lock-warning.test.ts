import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase/service-role", () => ({
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

import { acquireIntakeLock } from "@/lib/data/intake-lock"

describe("acquireIntakeLock — System auto-approve claimant", () => {
  it("masks the empty '( minutes remaining)' template when System holds the claim", async () => {
    const result = await acquireIntakeLock("intake-1", "doctor-1", "Dr Test")
    expect(result.acquired).toBe(false)
    expect(result.warning).not.toMatch(/\(\s*minutes remaining\s*\)/)
    expect(result.warning).toMatch(/auto-approval/i)
  })
})
