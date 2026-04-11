/**
 * Repeat Prescription - Microcopy
 *
 * All patient-facing strings for the repeat-rx intake flow.
 * Edit here to update copy without touching components.
 */

export const REPEAT_RX_COPY = {
  titles: {
    main: "Repeat Prescription",
    subtitle: "Get your regular medication renewed by an Australian doctor, without the wait.",
  },

  auth: {
    heading: "Welcome back",
    subtitle: "Sign in to pre-fill your details and track your request.",
    signInButton: "Sign in to continue",
    guestButton: "Continue as guest",
    signInBenefits: [
      "Pre-filled details from your last request",
      "Track your prescription status in real time",
      "Access past prescriptions and documents",
    ],
  },

  trust: {
    ahpra: "AHPRA doctors",
    encrypted: "Encrypted",
    private: "100% private",
  },

  steps: {
    medication: {
      title: "Which medication do you need?",
      subtitle: "Search by name or brand. A doctor will confirm the exact details.",
    },
    history: {
      title: "Prescription history",
      subtitle: "Tell us about your experience with this medication.",
    },
    medical_history: {
      title: "Medical history",
      subtitle: "Help us check for allergies and interactions.",
    },
    attestation: {
      title: "Confirm and submit",
      subtitle: "Please review and confirm the following before we send your request to a doctor.",
    },
  },
} as const
