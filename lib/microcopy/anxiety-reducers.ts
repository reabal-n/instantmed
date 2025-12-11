export const ANXIETY_REDUCERS = {
  // Security reassurance
  security: {
    short: "Your information is secure",
    medium: "Your data is encrypted and never shared",
    long: "We use bank-level encryption. Your information is stored securely in Australia and never shared with third parties.",
  },

  // Time expectations
  timing: {
    review: "Most requests reviewed within 1-2 hours",
    businessHours: "Faster during 8am-10pm AEST",
    worst: "Always within 24 hours",
    approval: "If approved, you'll receive your document via email",
  },

  // Process clarity
  process: {
    whatHappens: "A real GP will review your request and make a clinical decision",
    moreInfo: "The doctor may contact you if they need more information",
    decline: "If we can't help, you'll get a full refund — no questions asked",
  },

  // Medicare validation
  medicare: {
    format: "10 digits, no spaces — check your Medicare card",
    irnHint: "The number next to your name (1-9)",
    why: "Required for Medicare compliance and prescriptions",
  },

  // Celebration moments
  celebration: {
    submitted: "You're all done! A doctor will review this shortly.",
    approved: "Great news — your request has been approved!",
    documentReady: "Your document is ready to download",
  },

  // Error messages that help
  errors: {
    medicare: "Medicare number should be 10 digits — check your card",
    email: "Please enter a valid email address",
    password: "Password must be at least 8 characters",
    network: "Connection issue — your progress is saved, try again",
    generic: "Something went wrong. Don't worry, your data is safe.",
  },

  // Trust builders
  trust: {
    doctors: "Reviewed by AHPRA-registered Australian GPs",
    refund: "Full refund if we can't help",
    privacy: "We never share your data",
    support: "Real humans available if you need help",
  },
}

// Helper to get copy by key path
export function getCopy(path: string): string {
  const keys = path.split(".")
  let result: unknown = ANXIETY_REDUCERS
  for (const key of keys) {
    if (result && typeof result === "object" && key in result) {
      result = (result as Record<string, unknown>)[key]
    } else {
      return path // Return path as fallback
    }
  }
  return typeof result === "string" ? result : path
}
