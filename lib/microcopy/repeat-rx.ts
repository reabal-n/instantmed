/**
 * Repeat Prescription Microcopy
 * Production-grade copy consistent with InstantMed tone:
 * Professional, fast, subtly witty, not cringe
 */

export const REPEAT_RX_COPY = {
  // Page titles
  titles: {
    main: "Repeat Prescription",
    subtitle: "Same medication, same dose, less hassle.",
    intake: "Let's get you sorted",
  },

  // Auth entry
  auth: {
    heading: "Let's get started",
    subtitle: "Sign in for faster checkout, or continue as a guest.",
    signInButton: "Sign in",
    guestButton: "Continue as guest",
    signInBenefits: [
      "Your details are prefilled",
      "Track your request status",
      "Access your prescription history",
    ],
    returningUser: "Welcome back",
    prefillNote: "We've filled in your details from last time.",
  },

  // Emergency disclaimer
  emergency: {
    title: "This is not an emergency service",
    body: "If you're experiencing a medical emergency, chest pain, difficulty breathing, or thoughts of self-harm, please call 000 immediately.",
    checkbox: "I confirm this is not a medical emergency",
    callout: "Need urgent help? Call 000",
  },

  // Steps
  steps: {
    medication: {
      title: "What medication do you need?",
      subtitle: "Search for your medication by name",
      placeholder: "e.g., Atorvastatin 20mg tablet",
      strengthConfirm: "Can you confirm the strength and form?",
      strengthHint: "Check your last prescription or medication packaging",
    },
    history: {
      title: "Tell us about your prescription history",
      subtitle: "This helps us ensure this service is right for you",
      lastPrescribed: "When was this last prescribed?",
      lastPrescribedOptions: {
        less_3_months: "Less than 3 months ago",
        "3_6_months": "3-6 months ago",
        "6_12_months": "6-12 months ago",
        over_12_months: "Over 12 months ago",
      },
      stability: "How long have you been stable on this medication?",
      stabilityOptions: {
        less_3_months: "Less than 3 months",
        "3_6_months": "3-6 months",
        "6_months_plus": "6 months or more",
      },
      stabilityNote: "'Stable' means same dose, well-controlled symptoms, no significant side effects",
      prescriber: "Who originally prescribed this medication?",
      prescriberPlaceholder: "e.g., Dr Smith, My local GP",
      indication: "What condition is this medication for?",
      indicationPlaceholder: "e.g., High blood pressure, Type 2 diabetes",
      currentDose: "What's your current dose?",
      currentDosePlaceholder: "e.g., 10mg once daily",
      doseChanged: "Has your dose changed in the last 3 months?",
    },
    safety: {
      title: "Quick safety check",
      subtitle: "A few questions to make sure this is safe for you",
      sideEffects: "Have you experienced any side effects?",
      sideEffectsOptions: {
        none: "None",
        mild: "Mild (not a concern)",
        significant: "Significant (bothering me)",
      },
      sideEffectsDetails: "What side effects are you experiencing?",
      sideEffectsPlaceholder: "Describe your side effects...",
      pregnancy: "Are you pregnant or breastfeeding?",
      allergies: "Do you have any medication allergies?",
      allergyDetails: "What are you allergic to?",
      allergyPlaceholder: "e.g., Penicillin, Sulfa drugs",
    },
    medical_history: {
      title: "Medical history",
      subtitle: "Select any that apply to you",
      flags: {
        heartDisease: "Heart disease or previous heart attack",
        kidneyDisease: "Kidney disease",
        liverDisease: "Liver disease",
        diabetes: "Diabetes",
        mentalHealthCondition: "Mental health condition",
        otherSignificant: "Other significant condition",
      },
      otherDetails: "Please describe",
      otherPlaceholder: "e.g., Thyroid condition, Epilepsy",
      otherMeds: "What other medications are you currently taking?",
      otherMedsPlaceholder: "e.g., Metformin 500mg, Lisinopril 10mg",
      otherMedsHint: "Include all prescription medications, supplements, and over-the-counter medicines",
    },
    attestation: {
      title: "One last thing",
      subtitle: "Repeat prescriptions are for stable, ongoing medications only",
      gpAttestation: "I confirm I will see my regular GP within 1-3 months for ongoing care",
      gpNote: "This is a requirement for telehealth repeat prescriptions in Australia",
      termsAccept: "I've read and accept the",
      termsLink: "Terms of Service",
      privacyLink: "Privacy Policy",
    },
    review: {
      title: "Review your request",
      subtitle: "Check everything looks right",
      edit: "Edit",
      medication: "Medication",
      history: "Prescription history",
      safety: "Safety screening",
      attestations: "Confirmations",
    },
  },

  // Eligibility outcomes
  eligibility: {
    checking: "Checking eligibility...",
    approved: {
      title: "Good news!",
      subtitle: "You're eligible for a repeat prescription",
      next: "Proceed to payment",
    },
    declined: {
      title: "We can't process this as a repeat",
      subtitle: "But we can still help you another way",
      consultOption: "Book a General Consult instead",
      consultNote: "A quick video consult with a GP who can assess your needs",
    },
    requiresConsult: {
      title: "We need to chat first",
      subtitle: "Based on your answers, a brief consult is recommended",
      reason: "This ensures we can prescribe safely for you",
      bookConsult: "Book a brief consult",
      consultPrice: "$24.95",
    },
    redFlags: {
      title: "We noticed a few things",
      subtitle: "Our doctor will review these with you",
    },
  },

  // Payment
  payment: {
    title: "Complete your request",
    subtitle: "You'll only be charged if your prescription is approved",
    price: "$19.95",
    includes: [
      "GP review within 2 hours (8am-10pm AEST)",
      "E-script sent to your phone",
      "Valid at any Australian pharmacy",
      "Full refund if declined",
    ],
    disclaimer: "Reviewed by AHPRA-registered Australian GPs",
    processing: "Processing...",
    button: "Pay & submit request",
  },

  // Confirmation
  confirmation: {
    title: "Request submitted",
    subtitle: "We're on it. You'll hear from us soon.",
    timeline: [
      { label: "Submitted", status: "complete" },
      { label: "Under review", status: "current" },
      { label: "Decision", status: "pending" },
      { label: "E-script sent", status: "pending" },
    ],
    whatNext: "What happens next?",
    steps: [
      "An Australian GP will review your request",
      "If approved, your e-script will be sent via SMS",
      "Take your e-script to any pharmacy in Australia",
    ],
    eta: "Usually within 2 hours (8am-10pm AEST)",
    trackStatus: "Track your request",
  },

  // Errors
  errors: {
    generic: "Something went wrong. Please try again.",
    network: "Connection issue. Check your internet and try again.",
    validation: "Please check your answers and try again.",
    medicationNotFound: "We couldn't find that medication. Try a different search.",
  },

  // Navigation
  nav: {
    back: "Back",
    continue: "Continue",
    skip: "Skip",
    submit: "Submit",
  },

  // Trust indicators
  trust: {
    ahpra: "AHPRA Doctors",
    encrypted: "256-bit encrypted",
    private: "Your data stays private",
    refund: "Full refund if declined",
  },
}

export type RepeatRxCopyKey = keyof typeof REPEAT_RX_COPY
