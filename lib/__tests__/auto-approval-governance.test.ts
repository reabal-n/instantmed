import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  AUTO_APPROVAL_GOVERNANCE,
  isAutoApprovalGovernanceApproved,
} from "@/lib/clinical/auto-approval-governance"

const root = process.cwd()

describe("medical-certificate auto-approval governance gate", () => {
  it("is fail-closed pending Medical Director and legal review", () => {
    expect(AUTO_APPROVAL_GOVERNANCE).toMatchObject({
      approved: false,
      status: "paused_pending_medical_director_legal_review",
      pausedSince: "2026-08-09",
    })
    expect(isAutoApprovalGovernanceApproved()).toBe(false)
  })

  it("also blocks the retry cron before it generates drafts or attempts issuance", () => {
    const source = readFileSync(
      join(root, "app/api/cron/retry-auto-approval/route.ts"),
      "utf8",
    )

    expect(source).toContain("isAutoApprovalGovernanceApproved")
    expect(source.indexOf("if (!isAutoApprovalGovernanceApproved())")).toBeLessThan(
      source.indexOf("const { generateDraftsForIntake }"),
    )
  })

  it("makes the effective pause explicit and non-enableable in the operator UI", () => {
    const source = readFileSync(
      join(root, "app/admin/features/feature-flag-detail.tsx"),
      "utf8",
    )

    expect(source).toContain("GOVERNANCE PAUSE")
    expect(source).toContain("the database toggle cannot override this code gate")
    expect(source).toContain("governancePaused && !flags.ai_auto_approve_enabled")
  })
})
