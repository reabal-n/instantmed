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
    repeat_rx: "Repeat Prescription",
    consults: "Consultation",
  }
  return labels[type] || type
}
