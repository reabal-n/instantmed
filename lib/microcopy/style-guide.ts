/**
 * InstantMed Microcopy Style Guide
 * ================================
 *
 * Brand Voice: Relatable, professional, witty, informal, irreverent, friendly
 *
 * DO:
 * - Use contractions (you're, we'll, don't)
 * - Be conversational and human
 * - Add subtle wit where appropriate
 * - Offer a next step in error messages
 * - Celebrate wins with enthusiasm
 * - Use Aussie slang sparingly (crook, sorted, no worries)
 *
 * DON'T:
 * - Blame the user for errors
 * - Use corporate jargon (leverage, optimize, utilize)
 * - Say "asynchronous", "automated", or "AI-generated"
 * - Be overly formal or stiff
 * - Use ALL CAPS except for very short emphasis
 */

// ============================================
// BUTTON TEXT
// ============================================
export const BUTTONS = {
  // Primary actions
  submit: "Send it through",
  continue: "Next",
  confirm: "Looks good",
  pay: "Pay & submit",
  payAmount: (amount: string) => `Pay ${amount}`,
  signIn: "Sign in",
  signUp: "Create account",
  signOut: "Sign out",
  getStarted: "Get started",

  // Secondary actions
  back: "Back",
  cancel: "Cancel",
  skip: "Skip for now",
  edit: "Edit",
  save: "Save",
  tryAgain: "Try again",
  learnMore: "Learn more",
  viewAll: "View all",

  // Contextual
  viewRequest: "View my request",
  viewRequests: "View my requests",
  newRequest: "New request",
  downloadPdf: "Download PDF",
  copyLink: "Copy link",
  requestCall: "Request a call",
} as const

// ============================================
// LOADING STATES
// ============================================
export const LOADING = {
  // Generic
  generic: "Hang tight...",
  almostThere: "Almost there...",
  justASec: "Just a sec...",

  // Specific actions
  signingIn: "Signing you in...",
  creatingAccount: "Setting up your account...",
  savingDetails: "Saving your details...",
  processing: "Processing...",
  submitting: "Sending it through...",

  // Payment
  paymentProcessing: "Securely doing the money thing...",
  paymentVerifying: "Verifying payment...",

  // Doctor/review
  findingDoctor: "Finding a doctor...",
  doctorReviewing: "A real human doctor is looking at this right now",
  generatingDocument: "Generating your document...",

  // Data
  loadingRequests: "Loading your requests...",
  loadingProfile: "Fetching your details...",
  checkingStatus: "Checking status...",
} as const

// ============================================
// ERROR MESSAGES
// ============================================
export const ERRORS = {
  // Generic
  generic: "Whoops, something went wrong on our end. Try again?",
  genericRetry: "That didn't work. Mind trying again?",

  // Network
  network: "Looks like you're offline. Check your connection and try again.",
  timeout: "This is taking longer than usual. Try again?",

  // Authentication
  authFailed: "Couldn't sign you in. Double-check your details?",
  emailExists: "That email's already got an account — want to sign in instead?",
  invalidCredentials: "Email or password doesn't match. Try again?",
  passwordTooShort: "Password needs to be at least 6 characters",
  invalidEmail: "That email doesn't look right — mind checking it?",

  // Medicare
  medicareInvalid: "Medicare number doesn't look right — should be 10 digits, check your card",
  medicareIncomplete: (remaining: number) => `${remaining} more digit${remaining === 1 ? "" : "s"} to go`,
  medicareStartDigit: "Medicare numbers start with 2, 3, 4, 5 or 6",
  irnInvalid: "IRN should be 1-9 (it's next to your name on the card)",
  expiryInvalid: "Check the expiry date on your card",

  // Payment
  paymentFailed: "Payment didn't go through. Try a different card?",
  paymentDeclined: "Your card was declined. Got another one handy?",
  paymentCancelled: "No worries — your answers are saved. Complete payment when you're ready.",

  // Forms
  required: "This one's required",
  tooShort: (min: number) => `Needs to be at least ${min} characters`,
  tooLong: (max: number) => `Keep it under ${max} characters`,
  invalidPhone: "That phone number doesn't look right",
  invalidDate: "Check the date format",

  // Permissions
  notAuthorized: "You don't have access to this. Need to sign in?",
  sessionExpired: "Your session expired. Sign in again?",

  // Not found
  notFound: "We couldn't find what you're looking for",
  requestNotFound: "This request doesn't exist or you don't have access to it",

  // Rate limiting
  tooManyRequests: "Slow down a bit! Try again in a minute.",
  tooManyAttempts: "Too many attempts. Take a breather and try again later.",
} as const

// ============================================
// SUCCESS MESSAGES
// ============================================
export const SUCCESS = {
  // Generic
  saved: "Saved!",
  updated: "Updated!",
  done: "Done!",

  // Requests
  requestSubmitted: {
    title: "You're all done!",
    subtitle: "A doctor will review this shortly.",
    body: "That's it! Go put the kettle on. We'll email you when your document's ready — usually within an hour (8am-10pm AEST).",
  },

  // Account
  accountCreated: "Account created! Welcome to InstantMed.",
  signedIn: "Welcome back!",
  passwordReset: "Check your email for a reset link.",
  passwordChanged: "Password updated!",
  profileUpdated: "Profile saved!",

  // Payment
  paymentSuccess: "Payment received!",

  // Copy
  linkCopied: "Link copied!",

  // Document
  documentReady: {
    title: "Your document is ready!",
    subtitle: "Download it below or check your email.",
  },
} as const

// ============================================
// EMPTY STATES
// ============================================
export const EMPTY = {
  noRequests: {
    title: "No requests yet",
    subtitle: "Feeling healthy? Nice.",
    cta: "Start a request",
  },
  noDocuments: {
    title: "No documents yet",
    subtitle: "Once a request is approved, your documents will appear here.",
  },
  noNotifications: {
    title: "All caught up",
    subtitle: "No new notifications.",
  },
  noResults: {
    title: "No results found",
    subtitle: "Try a different search term?",
  },
  noMedications: {
    title: "No medications found",
    subtitle: "Try searching for the brand name or generic name.",
  },
} as const

// ============================================
// FORM LABELS & HELPERS
// ============================================
export const FORM = {
  // Common fields
  email: {
    label: "Email",
    placeholder: "you@example.com",
    helper: "We'll send your documents here",
  },
  password: {
    label: "Password",
    placeholder: "6+ characters",
    helper: "At least 6 characters",
  },
  name: {
    label: "Full name",
    placeholder: "As it appears on your Medicare card",
    helper: "Must match your Medicare card exactly",
  },
  phone: {
    label: "Phone",
    placeholder: "04XX XXX XXX",
    helper: "In case the doctor needs to reach you",
  },
  dob: {
    label: "Date of birth",
    placeholder: "DD/MM/YYYY",
  },

  // Request-specific
  notes: {
    label: "Anything else?",
    placeholder: "Optional — anything that might help the doctor...",
    helper: "The more detail, the better",
  },
  symptoms: {
    label: "What's going on?",
    helper: "Tap all that apply",
  },
  medication: {
    label: "Which medication?",
    placeholder: "Start typing to search...",
    helper: "Brand name or generic",
  },
} as const

// ============================================
// TOOLTIPS & HELPERS
// ============================================
export const TOOLTIPS = {
  medicare: "We need this to verify your identity. Your details are encrypted and secure.",
  irn: "The small number (1-9) next to your name on your Medicare card.",
  priority: "Skip the queue — a doctor will review your request within 15 minutes.",
  securePayment: "All payments are processed securely via Stripe. We never see your card details.",
  doctorReview: "Every request is reviewed by an AHPRA-registered Australian GP.",
} as const

// ============================================
// STATUS LABELS
// ============================================
export const STATUS = {
  draft: "Draft",
  awaitingPayment: "Awaiting payment",
  paid: "Paid",
  inQueue: "In queue",
  inReview: "Under review",
  needsInfo: "More info needed",
  approved: "Approved",
  declined: "Declined",
  completed: "Completed",
  cancelled: "Cancelled",
} as const

// ============================================
// TIME & TURNAROUND
// ============================================
export const TIME = {
  turnaround: "Usually within 1 hour",
  turnaroundLong: "Most requests completed within 1 hour (8am-10pm AEST)",
  hours: "8am — 10pm AEST, 7 days",
  afterHours: "After hours? Requests reviewed first thing tomorrow.",
  priority: "15-minute priority review",
  estimatedWait: (minutes: number) =>
    minutes < 60
      ? `About ${minutes} min${minutes === 1 ? "" : "s"}`
      : `About ${Math.round(minutes / 60)} hour${Math.round(minutes / 60) === 1 ? "" : "s"}`,
} as const

// ============================================
// EMAIL SUBJECT LINES
// ============================================
export const EMAIL_SUBJECTS = {
  requestReceived: "We've got your request",
  paymentConfirmed: "Payment confirmed — we're on it",
  inReview: "A doctor is reviewing your request",
  approved: "Good news — your request is approved",
  documentReady: "Your document is ready to download",
  needsInfo: "Quick question about your request",
  declined: "About your request",
  reminder: "Your request is waiting",
  welcome: "Welcome to InstantMed",
  passwordReset: "Reset your password",
} as const

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Get a random loading message */
export function getRandomLoadingMessage(): string {
  const messages = [LOADING.generic, LOADING.almostThere, LOADING.justASec]
  return messages[Math.floor(Math.random() * messages.length)]
}

/** Get plural or singular */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural || `${singular}s`
}

/** Format relative time */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? "" : "s"} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
}
