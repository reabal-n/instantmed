export const ANXIETY_REDUCERS = {
  // Security reassurance
  security: {
    short: "Your info is safe with us",
    medium: "Encrypted. Private. Not going anywhere.",
    long: "Bank-level encryption. Stored in Australia. We don't share your data with anyone. Ever.",
  },

  // Time expectations
  timing: {
    review: "Most requests done within 1-2 hours",
    businessHours: "Faster during 8am-10pm AEST",
    worst: "Worst case, 24 hours",
    approval: "If approved, document lands in your inbox",
  },

  // Process clarity
  process: {
    whatHappens: "A real GP reviews every request — not a bot, not an algorithm",
    moreInfo: "If they need more info, they'll reach out",
    decline: "If we can't help, full refund. No awkward conversations.",
  },

  // Medicare validation
  medicare: {
    format: "10 digits, no spaces. It's on the front of your card.",
    irnHint: "The little number next to your name (1-9)",
    why: "Needed for Medicare compliance. Boring but necessary.",
  },

  // Celebration moments
  celebration: {
    submitted: "Request submitted. A doctor will take a look shortly.",
    approved: "All sorted — your request has been approved.",
    documentReady: "Your document is ready. Check your email or download below.",
  },

  // Error messages that help
  errors: {
    medicare: "Medicare number should be 10 digits — grab your card",
    email: "That doesn't look like an email address",
    password: "Password needs at least 8 characters",
    network: "Connection dropped — your progress is saved, try again",
    generic: "Something went sideways. Don't worry, your data is safe.",
  },

  // Trust builders
  trust: {
    doctors: "Reviewed by AHPRA-registered Australian GPs",
    refund: "Full refund if we can't help. No questions.",
    privacy: "We never share your data",
    support: "Real humans if you need help",
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
