/**
 * Formatting and display helpers for intake data.
 */

import type { IntakeStatus } from "@/types/db"

// ============================================
// FORMATTING HELPERS
// ============================================

/**
 * Format service type for display
 */
export function formatServiceType(type: string | null | undefined): string {
  if (!type) return "Request"

  const typeMap: Record<string, string> = {
    weight_loss: "Weight Loss",
    mens_health: "Men's Health",
    womens_health: "Women's Health",
    common_scripts: "Prescription",
    med_certs: "Medical Certificate",
    referrals: "Referral",
    pathology: "Pathology",
  }

  return typeMap[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Format intake status for display
 */
export function formatIntakeStatus(status: IntakeStatus | string | null | undefined): string {
  if (!status) return "Unknown"

  const statusMap: Record<string, string> = {
    draft: "Draft",
    pending_payment: "Awaiting Payment",
    paid: "In Queue",
    in_review: "Under Review",
    pending_info: "Needs Info",
    approved: "Approved",
    declined: "Declined",
    escalated: "Escalated",
    completed: "Completed",
    cancelled: "Cancelled",
    expired: "Expired",
    awaiting_script: "Awaiting Script",
  }

  return statusMap[status] || status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Get status color for UI
 */
export function getIntakeStatusColor(status: IntakeStatus | string | null | undefined): string {
  if (!status) return "default"

  const colorMap: Record<string, string> = {
    draft: "default",
    pending_payment: "warning",
    paid: "primary",
    in_review: "primary",
    pending_info: "warning",
    approved: "success",
    declined: "danger",
    escalated: "warning",
    completed: "success",
    cancelled: "default",
    expired: "danger",
    awaiting_script: "warning",
  }

  return colorMap[status] || "default"
}
