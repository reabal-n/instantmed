/**
 * Human Error Messages
 * 
 * Philosophy:
 * - No blame
 * - No panic
 * - No error codes
 * - No uppercase shouting
 * - Sounds like a human noticed something
 */

export const ERROR_MESSAGES = {
  // Form validation
  invalidEmail: "That doesn't look quite right. Mind checking it once more?",
  requiredField: "Looks like something was skipped — can you fill this in?",
  passwordTooShort: "That password's a bit short. Try at least 8 characters.",
  passwordMismatch: "Those passwords don't match. Give it another go.",
  invalidPhone: "That number doesn't look right. Check and try again.",
  invalidDate: "That date doesn't work. Check the format.",
  invalidMedicare: "That Medicare number doesn't check out. Mind double-checking?",
  
  // File uploads
  fileUploadFailed: "That file didn't upload. Try again, or pick a different one.",
  fileTooLarge: "That file's too large. Try something under 10MB.",
  fileTypeNotSupported: "That file type isn't supported. Try a PDF, JPG, or PNG.",
  fileCorrupt: "That file seems damaged. Try a different one.",
  
  // Network/API
  genericError: "That didn't work. Give it another go.",
  saveFailed: "That didn't save properly. Try again.",
  loadFailed: "Couldn't load that. Try refreshing.",
  connectionError: "Network's playing up. Check your connection and try again.",
  timeoutError: "That took too long. Try again.",
  
  // Authentication
  sessionExpired: "You've been signed out — happens sometimes. Please log in again.",
  invalidCredentials: "Those details don't match. Double-check and try again.",
  accountLocked: "Too many attempts. Give it a few minutes, then try again.",
  emailNotVerified: "Check your email first — there's a link there to verify your account.",
  
  // Payment
  paymentFailed: "Payment didn't go through. Check your details and try again.",
  cardDeclined: "Card was declined. Try a different payment method.",
  insufficientFunds: "Card was declined. Try a different card.",
  cardExpired: "That card's expired. Try a different one.",
  
  // Medical/Clinical
  ineligibleService: "We can't help with that through this service. Call your GP or 000 if urgent.",
  prescriptionNotAllowed: "We can't prescribe that medication through telehealth.",
  s8Medication: "No Schedule 8 medications. Requests for these will be declined.",
  
  // General
  notFound: "Couldn't find that.",
  accessDenied: "You don't have access to that.",
  rateLimited: "Too many requests. Slow down a bit.",
  
} as const

/**
 * Helper to get error message with optional context
 */
export function getErrorMessage(
  key: keyof typeof ERROR_MESSAGES, 
  context?: string
): string {
  const message = ERROR_MESSAGES[key]
  return context ? `${message} ${context}` : message
}
