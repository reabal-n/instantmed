import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  AUTO_APPROVAL_GOVERNANCE,
  AUTO_APPROVAL_ROLLOUT_POLICY,
  getEffectiveAutoApprovalSettings,
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

  it("keeps the initial rollout narrow even when stored settings are maximally permissive", () => {
    expect(AUTO_APPROVAL_ROLLOUT_POLICY).toMatchObject({
      minimumDelayMinutes: 15,
      maxApprovalsPerFiveMinutes: 3,
      maxApprovalsPerDay: 10,
      maxDurationDays: 1,
      requireNoSoftFlags: true,
    })

    expect(getEffectiveAutoApprovalSettings({
      auto_approve_delay_minutes: 0,
      auto_approve_rate_limit_5min: 100,
      auto_approve_daily_cap: 500,
      auto_approve_max_duration_days: 3,
    })).toEqual({
      delayMinutes: 15,
      rateLimitFiveMinutes: 3,
      dailyCap: 10,
      maxDurationDays: 1,
      requireNoSoftFlags: true,
    })
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

  it("records the effective code-owned policy with each eligibility decision", () => {
    const source = readFileSync(
      join(root, "lib/clinical/auto-approval-pipeline.ts"),
      "utf8",
    )

    expect(source).toContain("rollout_policy")
    expect(source).toContain("require_no_soft_flags: effectiveSettings.requireNoSoftFlags")
    expect(source).toContain("max_duration_days: effectiveSettings.maxDurationDays")
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
