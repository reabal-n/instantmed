/**
 * Prescription Flow Microcopy Dictionary
 *
 * Tone: neutral, cautious, compliant
 * Avoids: guarantees, instant promises, diagnosis language
 */

export const RX_MICROCOPY = {
  // Global
  turnaround: "Usually same-day review (8am–10pm AEST)",
  doctorReview: "A doctor will review whether this medicine is clinically appropriate",
  mayRequest: "We may request additional information",
  noGuarantee: "Prescriptions are issued at the doctor's discretion",

  // Step: Type
  type: {
    heading: "What do you need?",
    subtitle: "Select one option",
    repeat: {
      label: "Repeat script",
      description: "Continuing existing medication",
    },
    new: {
      label: "New medication",
      description: "Short-term or symptomatic relief",
    },
  },

  // Step: Category (for new prescriptions)
  category: {
    heading: "What type of medication?",
    subtitle: "Select a category",
    options: {
      antibiotics: { label: "Antibiotics", description: "Infection treatment" },
      antivirals: { label: "Antivirals", description: "Cold sore, shingles" },
      ed: { label: "ED medication", description: "Erectile dysfunction" },
      hairloss: { label: "Hair loss", description: "Male pattern baldness" },
      contraceptive: { label: "Contraceptive", description: "Birth control pill" },
      other: { label: "Other", description: "Describe below" },
    },
  },

  // Step: Medication
  medication: {
    heading: "What medication do you need?",
    headingRepeat: "What medication are you taking?",
    subtitle: "Include name and strength if known",
    placeholder: "e.g. Amoxicillin 500mg",
    placeholderRepeat: "e.g. Escitalopram 10mg",
  },

  // Step: Duration (for repeat)
  duration: {
    heading: "How long have you taken this?",
    options: {
      "<3months": "Less than 3 months",
      "3-12months": "3–12 months",
      ">1year": "More than 1 year",
    },
  },

  // Step: Condition
  condition: {
    heading: "What condition is this for?",
    headingNew: "What symptoms are you experiencing?",
    subtitle: "Select one",
    options: {
      mental_health: "Mental health",
      cardiovascular: "Blood pressure / heart",
      diabetes: "Diabetes",
      respiratory: "Asthma / respiratory",
      contraceptive: "Contraception",
      pain: "Pain management",
      infection: "Infection",
      skin: "Skin condition",
      other: "Other",
    },
    otherLabel: "Please describe",
    otherPlaceholder: "Brief description",
  },

  // Step: Control (for repeat)
  control: {
    heading: "How well controlled is your condition?",
    options: {
      well: "Well controlled",
      partial: "Partially controlled",
      poor: "Poorly controlled",
    },
  },

  // Step: Side effects (for repeat)
  sideEffects: {
    heading: "Any side effects?",
    options: {
      none: "None",
      mild: "Mild but tolerable",
      significant: "Significant",
    },
  },

  // Step: Last review
  lastReview: {
    heading: "When did a doctor last review this medication?",
    options: {
      "<3months": "Within 3 months",
      "3-12months": "3–12 months ago",
      ">12months": "Over 12 months ago",
    },
  },

  // Step: Notes
  notes: {
    heading: "Any additional information?",
    subtitle: "Optional — helps the doctor assess your request",
    placeholder: "e.g. previous allergies, recent changes...",
  },

  // Step: Safety
  safety: {
    heading: "Safety check",
    subtitle: "Please answer honestly",
    questions: {
      allergies: "Any known allergies to this medication?",
      pregnant: "Are you pregnant or possibly pregnant?",
      breastfeeding: "Are you currently breastfeeding?",
      otherMeds: "Taking other prescription medications?",
      sideEffects: "Experienced serious side effects before?",
    },
    knockoutTitle: "This service may not be suitable",
    knockoutBody:
      "Based on your answers, we recommend speaking with your regular GP or pharmacist for a more thorough assessment.",
    knockoutCta: "Find a GP near you",
  },

  // Step: Contraindications
  contraindications: {
    heading: "Quick health check",
    subtitle: "To ensure this medication is safe for you",
    questions: {
      liver: "Do you have liver or kidney problems?",
      heart: "Do you have heart conditions?",
      bloodPressure: "Do you have uncontrolled blood pressure?",
    },
  },

  // Emergency redirection
  emergency: {
    heading: "Please seek urgent care",
    body: "Based on your answers, this requires immediate medical attention.",
    call000: "Call 000",
    symptoms: ["Difficulty breathing", "Chest pain", "Severe allergic reaction", "Suicidal thoughts"],
  },

  // Step: Medicare
  medicare: {
    heading: "Your Medicare details",
    subtitle: "Required for PBS prescriptions",
    numberLabel: "Medicare number",
    numberPlaceholder: "0000 00000 0",
    irnLabel: "IRN",
    irnTooltip: "The number next to your name on your card",
    errors: {
      incomplete: (n: number) => `${n} more digit${n === 1 ? "" : "s"}`,
      invalid: "Please check your Medicare number",
    },
  },

  // Step: Signup
  signup: {
    headingNew: "Create an account",
    headingExisting: "Sign in",
    subtitle: "To receive your e-script",
  },

  // Step: Review
  review: {
    heading: "Review your request",
    subtitle: "Please confirm details are correct",
    medication: "Medication",
    condition: "Condition",
    duration: "Taking for",
    control: "Control",
    medicare: "Medicare",
    edit: "Edit",
  },

  // Step: Payment
  payment: {
    heading: "Complete payment",
    price: "$24.95",
    subtitle: "A doctor will review your request",
    includes: ["GP assessment of your request", "E-script sent to your phone (if approved)", "Valid at any pharmacy"],
    disclaimer:
      "A doctor will review whether this medicine is clinically appropriate for you. We may request additional information. Scripts are issued at the doctor's discretion.",
    cta: "Pay & submit",
    processing: "Processing...",
  },

  // Controlled substance warning
  controlled: {
    title: "Some medications can't be prescribed online",
    body: "Schedule 8 drugs (opioids, stimulants) and benzodiazepines require an in-person consultation.",
    affected: ["Oxycodone", "Dexamphetamine", "Diazepam", "Alprazolam", "Codeine (high dose)"],
  },

  // Navigation
  nav: {
    back: "Back",
    continue: "Continue",
  },

  // Errors
  errors: {
    generic: "Something went wrong. Please try again.",
    controlled: "This medication cannot be prescribed through this service.",
  },
} as const

// Controlled substance patterns for knockout
export const CONTROLLED_PATTERNS = [
  /oxycodone/i,
  /oxycontin/i,
  /endone/i,
  /morphine/i,
  /codeine/i,
  /dexamphetamine/i,
  /dexedrine/i,
  /vyvanse/i,
  /lisdexamfetamine/i,
  /methylphenidate/i,
  /ritalin/i,
  /concerta/i,
  /diazepam/i,
  /valium/i,
  /alprazolam/i,
  /xanax/i,
  /temazepam/i,
  /normison/i,
  /clonazepam/i,
  /rivotril/i,
  /lorazepam/i,
  /ativan/i,
  /oxazepam/i,
  /serepax/i,
  /nitrazepam/i,
  /mogadon/i,
  /fentanyl/i,
  /tramadol/i,
]

export function isControlledSubstance(medication: string): boolean {
  return CONTROLLED_PATTERNS.some((pattern) => pattern.test(medication))
}
