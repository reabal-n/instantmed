import {
  type FeatureFlags,
  normalizeAutoApproveDelayMinutes,
} from "@/lib/data/types/feature-flags"

/**
 * Code-owned governance gate for medical-certificate protocol issuance.
 *
 * The database feature flag remains an operational kill switch, but it cannot
 * authorise issuance by itself. Protocol issuance is enabled only through a
 * reviewed code decision that records the operator / Medical Director owner.
 */
export const AUTO_APPROVAL_GOVERNANCE = {
  approved: true,
  status: "approved_for_bounded_protocol_issuance",
  approvedAt: "2026-08-12",
  approvedBy: "operator_medical_director",
} as const

/**
 * Active protocol boundary.
 *
 * These are code-owned ceilings, not defaults. A database setting may narrow
 * the lane further, but it cannot widen it without another reviewed code
 * change. This keeps a permissive or stale operator setting from turning a
 * bounded rollout into broad protocol issuance on deploy.
 */
export const AUTO_APPROVAL_ROLLOUT_POLICY = {
  minimumDelayMinutes: 15,
  maxApprovalsPerFiveMinutes: 3,
  maxApprovalsPerDay: 10,
  maxDurationDays: 3,
  requireNoSoftFlags: true,
} as const

type AutoApprovalStoredSettings = Pick<
  FeatureFlags,
  | "auto_approve_delay_minutes"
  | "auto_approve_rate_limit_5min"
  | "auto_approve_daily_cap"
  | "auto_approve_max_duration_days"
>

function positiveInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback
}

export function getEffectiveAutoApprovalSettings(settings: AutoApprovalStoredSettings) {
  return {
    delayMinutes: Math.max(
      AUTO_APPROVAL_ROLLOUT_POLICY.minimumDelayMinutes,
      normalizeAutoApproveDelayMinutes(settings.auto_approve_delay_minutes),
    ),
    rateLimitFiveMinutes: Math.min(
      AUTO_APPROVAL_ROLLOUT_POLICY.maxApprovalsPerFiveMinutes,
      positiveInteger(
        settings.auto_approve_rate_limit_5min,
        AUTO_APPROVAL_ROLLOUT_POLICY.maxApprovalsPerFiveMinutes,
      ),
    ),
    dailyCap: Math.min(
      AUTO_APPROVAL_ROLLOUT_POLICY.maxApprovalsPerDay,
      positiveInteger(
        settings.auto_approve_daily_cap,
        AUTO_APPROVAL_ROLLOUT_POLICY.maxApprovalsPerDay,
      ),
    ),
    maxDurationDays: Math.min(
      AUTO_APPROVAL_ROLLOUT_POLICY.maxDurationDays,
      positiveInteger(
        settings.auto_approve_max_duration_days,
        AUTO_APPROVAL_ROLLOUT_POLICY.maxDurationDays,
      ),
    ),
    requireNoSoftFlags: AUTO_APPROVAL_ROLLOUT_POLICY.requireNoSoftFlags,
  } as const
}

export function isAutoApprovalGovernanceApproved(): boolean {
  return AUTO_APPROVAL_GOVERNANCE.approved
}
