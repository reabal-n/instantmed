/**
 * Status Feedback Messages
 * 
 * Philosophy:
 * - Clear acknowledgement
 * - Human tone
 * - No hype
 * - Emojis allowed sparingly (empty states, waiting, gentle confirmations)
 * - Max one emoji
 */

export const FEEDBACK_MESSAGES = {
  // Success states
  paymentReceived: "Payment received 👍",
  certificateIssued: "Certificate issued",
  prescriptionApproved: "Request approved — e-script sent separately",
  saved: "Saved",
  submitted: "Submitted. A doctor will review this soon.",
  updated: "Updated",
  deleted: "Deleted",
  sent: "Sent",
  
  // Progress/Loading states
  uploading: "Uploading… shouldn't take long ⏳",
  processing: "Just a moment.",
  loading: "Nearly there.",
  saving: "Saving…",
  loadingMore: "Loading more…",
  
  // Empty states
  noDocuments: "No documents here yet 📄",
  noRequests: "No requests yet — let\u2019s change that.",
  noNotifications: "All caught up.",
  noMessages: "No messages yet.",
  noPrescriptions: "No prescriptions yet.",
  noPaymentMethods: "No payment methods saved.",
  noHistory: "Nothing here yet.",
  
  // Waiting/Pending states
  pendingReview: "Waiting for doctor review",
  inQueue: "In the queue",
  processing_payment: "Processing payment…",
  
  // Confirmation prompts (calm, not alarming)
  confirmDelete: "Delete this? This can't be undone.",
  confirmCancel: "Stop and discard changes?",
  confirmLogout: "Sign out?",
  
  // Status updates
  approved: "Approved",
  rejected: "Declined",
  requiresInfo: "More information needed",
  expired: "Expired",
  active: "Active",
  
} as const

/**
 * Helper to get feedback message
 */
export function getFeedbackMessage(key: keyof typeof FEEDBACK_MESSAGES): string {
  return FEEDBACK_MESSAGES[key]
}

/**
 * Loading messages - rotate through for variety
 */
export const LOADING_MESSAGES = [
  "Just a moment.",
  "Nearly there.",
  "Loading…",
  "One sec.",
] as const

export function getRandomLoadingMessage(): string {
  return LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]
}
