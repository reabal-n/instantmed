/**
 * Intake formatting utilities
 * Safe to use in both server and client components
 */

export function formatIntakeStatus(status: string): string {
  const labels: Record<string, string> = {
    pending_payment: "Awaiting Payment",
    paid: "In Queue",
    in_review: "Under Review",
    approved: "Approved",
    declined: "Declined",
    completed: "Completed",
    pending_info: "Needs Info",
    awaiting_script: "Awaiting Script",
  }
  return labels[status] || status
}

export function formatServiceType(type: string): string {
  const labels: Record<string, string> = {
    med_certs: "Medical Certificate",
    common_scripts: "Repeat Prescription",
    weight_loss: "Weight Management",
    mens_health: "Men's Health",
    womens_health: "Women's Health",
    referrals: "Specialist Referral",
    pathology: "Pathology Request",
  }
  return labels[type] || type.replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}
