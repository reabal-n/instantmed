/**
 * Medical Certificate Flow Microcopy Dictionary
 *
 * Tone: calm, neutral, helpful, compliant
 * Avoids: guaranteed outcomes, diagnosis without assessment,
 *         asynchronous telehealth, shortcuts or loopholes
 */

export const MICROCOPY = {
  // Global
  turnaround: "Usually within 1 hour (8am–10pm AEST)",
  doctorReview: "A GP will review your information",
  noPhone: "No phone call needed",
  mayRequest: "We may request further details if needed",

  // Step: Type
  type: {
    heading: "What type of certificate do you need?",
    subtitle: "Select one option",
    work: {
      label: "Work",
      description: "For your employer",
    },
    uni: {
      label: "Study",
      description: "For university or school",
    },
    carer: {
      label: "Carer's leave",
      description: "To care for someone",
    },
  },

  // Step: Duration
  duration: {
    heading: "How long do you need off?",
    subtitle: undefined,
    options: {
      "1": "1 day",
      "2": "2 days",
      "3": "3 days",
      "4-7": "4–7 days",
      "1-2weeks": "1–2 weeks",
      specific: "Other dates",
    },
    dateFrom: "Start date",
    dateTo: "End date",
  },

  // Step: Symptoms
  symptoms: {
    heading: "What symptoms are you experiencing?",
    headingCarer: "What symptoms are they experiencing?",
    subtitle: "Select all that apply",
    carerName: "Name of person you're caring for",
    carerNamePlaceholder: "Their full name",
    relationship: "Your relationship to them",
    otherLabel: "Please describe",
    otherPlaceholder: "Brief description",
  },

  // Step: Notes
  notes: {
    heading: "Any additional information?",
    subtitle: "Optional — helps the GP understand your situation",
    placeholder: "e.g. symptoms started yesterday evening...",
    charCount: (count: number) => `${count}/500`,
  },

  // Step: Safety
  safety: {
    heading: "Safety check",
    subtitle: "To ensure this service is appropriate for you",
    questions: {
      chestPain: "Any chest pain or breathing difficulty?",
      severe: "Are symptoms severe or getting worse?",
      emergency: "Do you feel this may be an emergency?",
    },
    no: "No",
    yes: "Yes",
    alert: {
      heading: "Please seek urgent care",
      body: "Based on your answers, we recommend you contact emergency services or visit your nearest emergency department.",
      cta: "Call 000",
    },
  },

  // Step: Medicare
  medicare: {
    heading: "Your Medicare details",
    subtitle: "Required for your certificate",
    numberLabel: "Medicare card number",
    numberPlaceholder: "0000 00000 0",
    irnLabel: "IRN",
    irnTooltip: "The number next to your name on your Medicare card (1–9)",
    dobLabel: "Date of birth",
    valid: "Valid",
    errors: {
      incomplete: (remaining: number) => `${remaining} more digit${remaining === 1 ? "" : "s"} needed`,
      startDigit: "Must start with 2, 3, 4, 5, or 6",
      checksum: "Please check your Medicare number",
    },
  },

  // Step: Signup
  signup: {
    headingNew: "Create an account",
    headingExisting: "Sign in",
    subtitle: "To receive your certificate",
    google: "Continue with Google",
    or: "or",
    nameLabel: "Full name",
    namePlaceholder: "Your name",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    passwordPlaceholderNew: "Create a password",
    passwordPlaceholderExisting: "Your password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    forgotPassword: "Forgot password?",
    terms: {
      prefix: "I agree to the",
      termsLink: "Terms of Service",
      and: "and",
      privacyLink: "Privacy Policy",
    },
    ctaNew: "Create account",
    ctaExisting: "Sign in",
    switchToExisting: "Already have an account?",
    switchToNew: "New here?",
    signIn: "Sign in",
    createAccount: "Create account",
    confirmEmail: "Please check your email to confirm, then sign in.",
  },

  // Step: Review
  review: {
    heading: "Review your request",
    subtitle: "Please confirm these details are correct",
    certificateType: "Certificate type",
    duration: "Duration",
    symptoms: "Symptoms",
    notes: "Notes",
    medicare: "Medicare",
    edit: "Edit",
    none: "None provided",
  },

  // Step: Payment
  payment: {
    heading: "Complete payment",
    subtitle: "You'll receive your certificate after a GP reviews your request",
    price: "$19.99",
    includes: ["GP review of your information", "Digital certificate (if approved)", "Secure document storage"],
    disclaimer:
      "A GP will review your information and may request further details if needed. Certificates are issued at the GP's discretion based on clinical assessment.",
    cta: "Pay & submit request",
    processing: "Processing...",
  },

  // Navigation
  nav: {
    back: "Back",
    continue: "Continue",
    skip: "Skip",
  },

  // Errors
  errors: {
    generic: "Something went wrong. Please try again.",
    signIn: "Unable to sign in. Please check your details.",
    signUp: "Unable to create account. Please try again.",
    payment: "Payment could not be processed. Please try again.",
    session: "Your session has expired. Please sign in again.",
  },
} as const

export type MicrocopyKey = keyof typeof MICROCOPY
