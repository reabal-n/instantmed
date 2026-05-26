import { describe, expect, it, vi } from "vitest"

import { claimIntakeForManualCertApproval } from "@/lib/clinical/manual-cert-claim"

function createUpdateChain() {
  const chain = {
    update: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
  }

  chain.update.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.in.mockResolvedValue({ error: null })

  return chain
}

describe("claimIntakeForManualCertApproval", () => {
  it("force-takes over the System auto-approval claim and parks auto-approval in needs_doctor", async () => {
    const updateChain = createUpdateChain()
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{
          success: false,
          current_claimant: "System (Auto-Approve)",
          error_message: "Already claimed by System (Auto-Approve) ( minutes remaining)",
        }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{
          success: true,
          current_claimant: "System (Auto-Approve)",
          error_message: null,
        }],
        error: null,
      })

    const result = await claimIntakeForManualCertApproval({
      supabase: {
        rpc,
        from: vi.fn().mockReturnValue(updateChain),
      },
      intakeId: "intake-1",
      doctorId: "doctor-1",
    })

    expect(result).toEqual({ success: true, forcedAutoApprovalTakeover: true })
    expect(rpc).toHaveBeenNthCalledWith(1, "claim_intake_for_review", {
      p_intake_id: "intake-1",
      p_doctor_id: "doctor-1",
      p_force: false,
    })
    expect(rpc).toHaveBeenNthCalledWith(2, "claim_intake_for_review", {
      p_intake_id: "intake-1",
      p_doctor_id: "doctor-1",
      p_force: true,
    })
    expect(updateChain.update).toHaveBeenCalledWith({
      auto_approval_state: "needs_doctor",
      auto_approval_state_reason: "manual_doctor_override",
      auto_approval_state_updated_at: expect.any(String),
    })
    expect(updateChain.eq).toHaveBeenCalledWith("id", "intake-1")
    expect(updateChain.eq).toHaveBeenCalledWith("claimed_by", "doctor-1")
    expect(updateChain.in).toHaveBeenCalledWith("auto_approval_state", [
      "awaiting_drafts",
      "pending",
      "failed_retrying",
      "attempting",
    ])
  })

  it("does not force-take-over another doctor's active claim", async () => {
    const updateChain = createUpdateChain()
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        success: false,
        current_claimant: "Dr Smith",
        error_message: "Already claimed by Dr Smith (4 minutes remaining)",
      }],
      error: null,
    })

    const result = await claimIntakeForManualCertApproval({
      supabase: {
        rpc,
        from: vi.fn().mockReturnValue(updateChain),
      },
      intakeId: "intake-1",
      doctorId: "doctor-1",
    })

    expect(result).toEqual({
      success: false,
      error: "Already claimed by Dr Smith (4 minutes remaining)",
      currentClaimant: "Dr Smith",
    })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(updateChain.update).not.toHaveBeenCalled()
  })
})
