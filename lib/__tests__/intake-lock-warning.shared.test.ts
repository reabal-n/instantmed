import { describe, expect, it } from "vitest"

import { formatClaimWarning } from "@/lib/data/intake-lock-warning"
import { isReviewLockableStatus } from "@/lib/doctor/intake-lock-status"

describe("formatClaimWarning", () => {
  it("masks the broken System (Auto-Approve) template", () => {
    const warning = formatClaimWarning({
      current_claimant: "System (Auto-Approve)",
      error_message: "Already claimed by System (Auto-Approve) ( minutes remaining)",
    })
    expect(warning).not.toMatch(/\(\s*minutes remaining\s*\)/)
    expect(warning).toMatch(/you can still review/i)
  })

  it("passes through real System error messages when the broken template is absent", () => {
    const warning = formatClaimWarning({
      current_claimant: "System (Auto-Approve)",
      error_message: "Cannot claim intake in 'declined' status",
    })
    expect(warning).toBe("Cannot claim intake in 'declined' status")
  })

  it("passes through doctor-claim error messages verbatim", () => {
    const warning = formatClaimWarning({
      current_claimant: "Dr Smith",
      error_message: "Already claimed by Dr Smith (4 minutes remaining)",
    })
    expect(warning).toBe("Already claimed by Dr Smith (4 minutes remaining)")
  })

  it("falls back to the default copy when error_message is empty", () => {
    expect(formatClaimWarning({})).toBe("This case could not be claimed for review.")
    expect(formatClaimWarning(null)).toBe("This case could not be claimed for review.")
    expect(formatClaimWarning(undefined)).toBe("This case could not be claimed for review.")
  })

  it("respects a custom fallback when provided", () => {
    expect(formatClaimWarning({}, "Custom fallback copy")).toBe("Custom fallback copy")
  })

  it("is case-insensitive on the Auto-Approve claimant marker", () => {
    const warning = formatClaimWarning({
      current_claimant: "system (auto-approve)",
      error_message: "Already claimed by system (auto-approve) ( minutes remaining)",
    })
    expect(warning).toMatch(/you can still review/i)
  })
})

describe("isReviewLockableStatus", () => {
  it("allows live review statuses and skips terminal ledger statuses", () => {
    expect(isReviewLockableStatus("paid")).toBe(true)
    expect(isReviewLockableStatus("in_review")).toBe(true)
    expect(isReviewLockableStatus("pending_info")).toBe(true)
    expect(isReviewLockableStatus("awaiting_script")).toBe(true)
    expect(isReviewLockableStatus("approved")).toBe(false)
    expect(isReviewLockableStatus("completed")).toBe(false)
    expect(isReviewLockableStatus("declined")).toBe(false)
  })
})
