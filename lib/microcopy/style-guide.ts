/**
 * InstantMed Microcopy Style Guide
 * ================================
 *
 * Brand Voice: Calm. Competent. Human.
 * A little dry humor. Zero cringe.
 * 
 * Think: smart doctor who's seen it all and still bothers to explain things properly.
 *
 * DO:
 * - Use contractions (you're, we'll, don't)
 * - Be conversational and human
 * - Short sentences, plain English
 * - One idea per line
 * - Slightly informal is fine
 * - Reassuring > enthusiastic
 * - Offer a next step in error messages
 * - Errors should feel noticed by a human, not a system
 *
 * DON'T:
 * - Blame the user for errors
 * - Use corporate jargon (leverage, optimize, utilize)
 * - Say "asynchronous", "automated", or "AI-generated"
 * - Be overly enthusiastic ("Awesome!", "You're all set!")
 * - Use 🚀🔥✨ or startup mascot energy
 * - Sound like a hospital pamphlet or fintech ad
 *
 * Emojis: One max, sparingly, only for empty/loading states.
 * Never for medical, legal, or diagnostic content.
 */

// ============================================
// BUTTON TEXT (keep these boring)
// ============================================
export const BUTTONS = {
  // Primary actions
  submit: "Submit for review",
  continue: "Continue",
  confirm: "Confirm",
  pay: "Pay and submit",
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
  viewRequest: "View request",
  viewRequests: "View requests",
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
  generic: "Just a moment...",
  almostThere: "Nearly there...",
  justASec: "One sec.",
  hangTight: "Hang tight.",
  stillGoing: "Still working on it...",

  // Specific actions
  signingIn: "Signing you in...",
  creatingAccount: "Setting up your account...",
  savingDetails: "Saving...",
  processing: "Processing...",
  submitting: "Submitting...",

  // Payment
  paymentProcessing: "Processing payment... don't refresh.",
  paymentVerifying: "Verifying with your bank...",

  // Doctor/review
  findingDoctor: "Finding a doctor...",
  doctorReviewing: "A doctor is looking at this now.",
  generatingDocument: "Generating your document...",

  // Data
  loadingRequests: "Fetching your requests...",
  loadingProfile: "Loading your details...",
  checkingStatus: "Checking status...",
} as const

// ============================================
// ERROR MESSAGES
// ============================================
// These should feel like a human noticed something — not a compiler.
export const ERRORS = {
  // Generic
  generic: "Something went wrong on our end. Give it another go?",
  genericRetry: "That didn't save properly. Try again?",

  // Network
  network: "Looks like you're offline. Check your connection and try again.",
  timeout: "This is taking longer than usual. Try again?",

  // Authentication
  authFailed: "Couldn't sign you in. Double-check your details?",
  emailExists: "That email already has an account. Want to sign in instead?",
  invalidCredentials: "Email or password doesn't match. Mind checking?",
  passwordTooShort: "Password needs to be at least 6 characters.",
  invalidEmail: "That doesn't look quite right. Mind checking the email?",

  // Medicare
  medicareInvalid: "Medicare number doesn't look right — should be 10 digits.",
  medicareIncomplete: (remaining: number) => `${remaining} more digit${remaining === 1 ? "" : "s"} to go.`,
  medicareStartDigit: "Medicare numbers start with 2, 3, 4, 5 or 6.",
  irnInvalid: "IRN should be 1-9. It's the little number next to your name.",
  expiryInvalid: "Check the expiry on your card — might've lapsed.",

  // Payment
  paymentFailed: "Payment didn't go through. Try a different card?",
  paymentDeclined: "Card was declined. Got another one handy?",
  paymentCancelled: "No worries — your details are saved. Come back whenever.",

  // Forms
  required: "This one's required. Mind filling it in?",
  tooShort: (min: number) => `Needs at least ${min} characters.`,
  tooLong: (max: number) => `Keep it under ${max} characters — we're not writing a novel.`,
  invalidPhone: "That phone number doesn't look quite right.",
  invalidDate: "Check the date format — DD/MM/YYYY.",

  // Permissions
  notAuthorized: "You don't have access to this. Need to sign in?",
  sessionExpired: "You've been signed out. Happens sometimes. Sign in again?",

  // Not found
  notFound: "We couldn't find that. It might've moved.",
  requestNotFound: "This request doesn't exist, or it's not yours.",

  // Rate limiting
  tooManyRequests: "Easy there. Try again in a minute.",
  tooManyAttempts: "Too many tries. Take a breather and try again.",
} as const

// ============================================
// SUCCESS MESSAGES
// ============================================
export const SUCCESS = {
  // Generic
  saved: "Saved.",
  updated: "Updated.",
  done: "Done.",

  // Requests
  requestSubmitted: {
    title: "Request submitted",
    subtitle: "A doctor will review this shortly.",
    body: "We'll email you when your document is ready — usually within an hour (8am–10pm AEST).",
  },

  // Account
  accountCreated: "Account created.",
  signedIn: "Signed in.",
  passwordReset: "Check your email for a reset link.",
  passwordChanged: "Password updated.",
  profileUpdated: "Profile saved.",

  // Payment
  paymentSuccess: "Payment received 👍",

  // Copy
  linkCopied: "Copied.",

  // Document
  documentReady: {
    title: "Your document is ready",
    subtitle: "Download it below or check your email.",
  },
} as const

// ============================================
// EMPTY STATES
// ============================================
export const EMPTY = {
  noRequests: {
    title: "No requests yet",
    subtitle: "Feeling healthy? Good for you.",
    cta: "Start a request",
  },
  noDocuments: {
    title: "No documents yet",
    subtitle: "Once a request is approved, your docs will live here.",
  },
  noNotifications: {
    title: "All quiet",
    subtitle: "Nothing new. We'll ping you when there is.",
  },
  noResults: {
    title: "Nothing found",
    subtitle: "Try a different search?",
  },
  noMedications: {
    title: "No matches",
    subtitle: "Try the brand name or generic. Or just type what's on the box.",
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
    helper: "At least 6 characters. Make it memorable.",
  },
  name: {
    label: "Full name",
    placeholder: "As it appears on your Medicare card",
    helper: "Must match your Medicare card — they're picky about that",
  },
  phone: {
    label: "Phone",
    placeholder: "04XX XXX XXX",
    helper: "In case the doctor needs to call. We won't spam you.",
  },
  dob: {
    label: "Date of birth",
    placeholder: "DD/MM/YYYY",
  },

  // Request-specific
  notes: {
    label: "Anything else?",
    placeholder: "Optional — anything that might help...",
    helper: "More detail = faster review",
  },
  symptoms: {
    label: "What's going on?",
    helper: "Tap all that apply",
  },
  medication: {
    label: "Which medication?",
    placeholder: "Start typing...",
    helper: "Brand name or generic — whatever's on the box",
  },
} as const

// ============================================
// TOOLTIPS & HELPERS
// ============================================
export const TOOLTIPS = {
  medicare: "We need this to verify your identity. Encrypted, secure, never shared.",
  irn: "The small number (1-9) next to your name. Usually overlooked.",
  priority: "Jump the queue — doctor reviews within 15 minutes.",
  securePayment: "Payments go through Stripe. We never see your card details.",
  doctorReview: "Every request reviewed by an AHPRA-registered Australian GP. The real deal.",
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
  turnaround: "Usually under an hour",
  turnaroundLong: "Most requests done within 1 hour (8am-10pm AEST)",
  hours: "8am — 10pm AEST, 7 days",
  afterHours: "After hours? We'll get to it first thing.",
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
  requestReceived: "Got your request",
  paymentConfirmed: "Payment confirmed — on it",
  inReview: "A doctor is on it",
  approved: "Your request is approved",
  documentReady: "Your document is ready",
  needsInfo: "Quick question from the doctor",
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
