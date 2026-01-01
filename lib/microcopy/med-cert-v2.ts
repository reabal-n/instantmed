/**
 * Medical Certificate Flow Microcopy Dictionary - REDESIGNED
 *
 * Tone: calm, neutral, supportive, clinically appropriate
 * Language: Non-judgemental, avoids implying entitlement
 * Compliant: No guaranteed outcomes, maintains clinical discretion
 */

export const MED_CERT_COPY = {
  // ============================================================================
  // GLOBAL
  // ============================================================================
  global: {
    turnaround: "Usually reviewed within 1 hour (8am–10pm AEST)",
    doctorReview: "An AHPRA-registered GP will review your request",
    noGuarantee: "Certificates are issued at the doctor's clinical discretion",
    mayRequest: "The doctor may request additional information if needed",
  },

  // ============================================================================
  // EMERGENCY DISCLAIMER (shown ONCE at start)
  // ============================================================================
  emergency: {
    heading: "Before we begin",
    body: "This service is not for medical emergencies. If you're experiencing chest pain, difficulty breathing, thoughts of self-harm, or any other emergency, please call 000 immediately.",
    checkbox: "I confirm this is not a medical emergency",
    callout: {
      title: "Need urgent help?",
      body: "Call 000 for emergencies",
      phone: "000",
    },
  },

  // ============================================================================
  // STEP 1: TYPE + DATES (Combined)
  // ============================================================================
  typeAndDates: {
    heading: "Tell us about your situation",
    subtitle: "We'll use this to prepare your request",
    
    // Certificate type
    typeLabel: "What is this certificate for?",
    types: {
      work: {
        label: "Work",
        description: "For your employer",
        emoji: "💼",
      },
      study: {
        label: "Study",
        description: "For university or school",
        emoji: "📚",
      },
      carer: {
        label: "Carer's leave",
        description: "To care for someone else",
        emoji: "❤️",
      },
    },
    
    // Duration
    durationLabel: "How many days do you need?",
    durationOptions: {
      1: "1 day",
      2: "2 days",
      3: "3 days",
    },
    durationHint: "Most requests are for 1–3 days",
    extendedOption: "I need more than 3 days",
    extendedNote: "Requests for more than 3 days require a brief phone consultation with the doctor to discuss your situation.",
    
    // Start date
    startDateLabel: "Start date",
    startDateHint: "Defaults to today",
    backdatedNote: "Backdated certificates may require additional verification",
  },

  // ============================================================================
  // STEP 2: SYMPTOMS (Combined with carer details)
  // ============================================================================
  symptoms: {
    heading: "What's going on?",
    headingCarer: "What are they experiencing?",
    subtitle: "Select all that apply",
    
    // Symptom chips
    chips: {
      cold_flu: "Cold / flu symptoms",
      gastro: "Gastrointestinal upset",
      headache_migraine: "Headache / migraine",
      fatigue: "Fatigue / exhaustion",
      pain: "Body aches / pain",
      fever: "Fever / chills",
      mental_health: "Mental health day",
      other: "Other",
    },
    
    // Other details
    otherLabel: "Please describe briefly",
    otherPlaceholder: "What are you experiencing?",
    otherHint: "Keep it brief — the doctor will review",
    
    // Carer-specific
    carerSection: {
      heading: "Person you're caring for",
      nameLabel: "Their name",
      namePlaceholder: "Full name",
      relationshipLabel: "Your relationship",
    },
  },

  // ============================================================================
  // STEP 3: REVIEW (Read-only)
  // ============================================================================
  review: {
    heading: "Review your request",
    subtitle: "Please confirm these details are correct",
    
    // Labels
    labels: {
      certificateType: "Certificate type",
      dates: "Dates",
      duration: "Duration",
      symptoms: "Symptoms",
      carerFor: "Caring for",
    },
    
    // Formatting
    durationDays: (n: number) => n === 1 ? "1 day" : `${n} days`,
    dateRange: (from: string, to: string) => `${from} – ${to}`,
    
    // Attestation (required checkbox)
    attestation: {
      label: "I confirm this information is accurate to the best of my knowledge",
      required: true,
    },
    
    // Note
    note: "The doctor may contact you if they need more information",
    editButton: "Edit",
  },

  // ============================================================================
  // STEP 4: PAYMENT
  // ============================================================================
  payment: {
    heading: "Complete your request",
    subtitle: "Pay securely to submit for review",
    
    // Pricing
    price: "$24.95",
    priceExtended: "$34.95", // For >3 days or backdated
    
    // What's included
    includes: [
      "Review by an AHPRA-registered GP",
      "Digital certificate if approved",
      "Secure document storage",
    ],
    
    // Disclaimer
    disclaimer: "Certificates are issued at the doctor's clinical discretion. If your request cannot be approved, you will receive a full refund.",
    
    // CTA
    cta: "Pay & submit request",
    processing: "Processing...",
  },

  // ============================================================================
  // STEP 5: CONFIRMATION
  // ============================================================================
  confirmation: {
    heading: "Request submitted",
    subtitle: "We've received your request",
    
    // Timeline
    timeline: [
      { label: "Submitted", status: "complete" as const },
      { label: "Under review", status: "current" as const },
      { label: "Decision", status: "pending" as const },
      { label: "Certificate sent", status: "pending" as const },
    ],
    
    // What next
    whatNext: {
      heading: "What happens next?",
      steps: [
        "A GP will review your request (usually within 1 hour)",
        "If approved, your certificate will be emailed to you",
        "You can also download it from your account",
      ],
    },
    
    // Escalation message (if call required)
    escalationMessage: {
      heading: "A brief call is needed",
      body: "Because your request is for more than 3 days, we'll need a quick phone call with the doctor. We'll call you shortly.",
    },
    
    // CTA
    trackStatus: "Track your request",
    returnHome: "Return home",
  },

  // ============================================================================
  // ESCALATION MESSAGES
  // ============================================================================
  escalation: {
    extendedDuration: {
      heading: "Extended leave requires a call",
      body: "For certificates longer than 3 days, the doctor needs to speak with you briefly. This helps ensure we can support you properly.",
      cta: "Continue with call",
      alternativeCta: "Request 1-3 days instead",
    },
    backdated: {
      heading: "Backdated certificate",
      body: "You've selected a start date in the past. Backdated certificates may require additional verification.",
      note: "If the start date is more than 3 days ago, a brief call with the doctor is required.",
    },
  },

  // ============================================================================
  // NAVIGATION
  // ============================================================================
  nav: {
    back: "Back",
    continue: "Continue",
    submit: "Submit request",
  },

  // ============================================================================
  // ERRORS
  // ============================================================================
  errors: {
    generic: "Something went wrong. Please try again.",
    validation: "Please check your answers and try again.",
    payment: "Payment could not be processed. Please try again.",
    session: "Your session has expired. Please sign in again.",
  },

  // ============================================================================
  // TRUST INDICATORS
  // ============================================================================
  trust: {
    ahpra: "AHPRA-registered doctors",
    encrypted: "256-bit encrypted",
    private: "Your data stays private",
    refund: "Full refund if not approved",
  },
} as const

export type MedCertCopyKey = keyof typeof MED_CERT_COPY
