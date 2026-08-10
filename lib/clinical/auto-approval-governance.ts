/**
 * Code-owned governance gate for medical-certificate protocol issuance.
 *
 * The database feature flag remains an operational kill switch, but it cannot
 * authorise issuance by itself. Re-enabling protocol issuance requires a
 * reviewed code change after Medical Director and legal reconciliation.
 */
export const AUTO_APPROVAL_GOVERNANCE = {
  approved: false,
  status: "paused_pending_medical_director_legal_review",
  pausedSince: "2026-08-09",
  reviewRequired: "Medical Director and legal reconciliation",
} as const

export function isAutoApprovalGovernanceApproved(): boolean {
  return AUTO_APPROVAL_GOVERNANCE.approved
}
