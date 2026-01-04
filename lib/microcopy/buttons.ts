/**
 * Button and Action Copy
 * 
 * Philosophy:
 * - Boring and clear
 * - Verb-first
 * - No cleverness
 * - Clarity wins
 */

export const BUTTON_COPY = {
  // Primary actions
  continue: "Continue",
  submit: "Submit for review",
  save: "Save",
  update: "Update",
  delete: "Delete",
  cancel: "Cancel",
  close: "Close",
  
  // Navigation
  back: "Back",
  next: "Next",
  goHome: "Go to home",
  viewAll: "View all",
  
  // Auth actions
  signIn: "Sign in",
  signOut: "Sign out",
  signUp: "Create account",
  resetPassword: "Reset password",
  
  // Document actions
  download: "Download",
  print: "Print",
  share: "Share",
  upload: "Upload",
  
  // Request actions
  newRequest: "New request",
  reviewDetails: "Review details",
  editDetails: "Edit details",
  submitRequest: "Submit request",
  tryAgain: "Try again",
  
  // Doctor actions
  approve: "Approve",
  reject: "Reject",
  assignToMe: "Assign to me",
  addNote: "Add note",
  
  // Certificate/Prescription actions
  issueCertificate: "Issue certificate",
  issuePrescription: "Issue prescription",
  renewPrescription: "Request renewal",
  
  // Payment actions
  addPaymentMethod: "Add payment method",
  updatePaymentMethod: "Update payment method",
  removePaymentMethod: "Remove",
  payNow: "Pay now",
  
  // Settings
  updateProfile: "Update profile",
  changePassword: "Change password",
  manageNotifications: "Manage notifications",
  
  // Confirmation
  confirm: "Confirm",
  yes: "Yes",
  no: "No",
  understand: "I understand",
  
} as const

/**
 * Button copy with context (e.g., "Pay $49.95")
 */
export function getButtonCopyWithAmount(amount: number): string {
  return `Pay $${amount.toFixed(2)}`
}

export function getButtonCopyWithCount(action: string, count: number): string {
  return `${action} ${count} ${count === 1 ? 'item' : 'items'}`
}
