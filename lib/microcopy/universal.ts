/**
 * Universal Microcopy Dictionary
 * Tone: professional, witty, relatable, friendly, slightly irreverent, reassuring
 * Never: "asynchronous", "automated", "no doctor involved"
 */
import { isControlledSubstance } from "@/lib/clinical/intake-validation"
import { PRICING_DISPLAY } from "@/lib/constants"

export { isControlledSubstance }

export const COPY = {
  // Global messaging
  global: {
    turnaround: "Doctor reviewed after you submit",
    turnaroundLong: "Requests accepted any time; review follows when available",
    doctorReview: "A doctor reviews every request",
    noPhone: "Most requests sorted without a call",
    mayContact: "A doctor may message you if they need more info",
    // SLA messaging for intake status - configurable for seasonal adjustments
    slaReviewTime: "1–2 hours",
    slaBusinessHours: "Requests accepted 24/7",
    slaPendingMessage: "Requests are accepted any time. Doctor review follows when available.",
    slaInReviewMessage: "A doctor is reviewing your request. We'll notify you when it is complete.",
    price: {
      medcert: PRICING_DISPLAY.FROM_MED_CERT,
      medcertOneDay: PRICING_DISPLAY.MED_CERT,
      medcertTwoDay: PRICING_DISPLAY.MED_CERT_2DAY,
      prescription: PRICING_DISPLAY.REPEAT_SCRIPT,
    },
  },

  // Service selection
  services: {
    heading: "What do you need?",
    subtitle: "Pick one. We'll handle the paperwork.",
    options: {
      medcert: {
        label: "Medical certificate",
        description: "For when you're genuinely unwell.",
        icon: "FileText",
      },
      prescription: {
        label: "Prescription",
        description: "For treatments you already take.",
        icon: "Pill",
      },
    },
  },

  // Medical certificate flow
  medcert: {
    heading: "Medical certificate",
    types: {
      work: { label: "Work", emoji: "💼" },
      uni: { label: "Uni/School", emoji: "📚" },
      carer: { label: "Carer's leave", emoji: "❤️" },
    },
    duration: {
      heading: "How long do you need?",
      options: ["Today only", "2 days", "3 days", "4-7 days", "Custom"],
    },
    symptoms: {
      heading: "What's going on?",
      headingCarer: "What are they dealing with?",
      subtitle: "Tap all that apply",
      options: [
        { id: "cold", label: "Cold/Flu", emoji: "🤧" },
        { id: "gastro", label: "Gastro", emoji: "🤢" },
        { id: "migraine", label: "Migraine", emoji: "🤕" },
        { id: "fever", label: "Fever", emoji: "🌡️" },
        { id: "fatigue", label: "Fatigue", emoji: "😴" },
        { id: "period", label: "Period pain", emoji: "😖" },
        { id: "respiratory", label: "Respiratory", emoji: "😷" },
        { id: "other", label: "Other", emoji: "✏️" },
      ],
    },
    carer: {
      nameLabel: "Who are you caring for?",
      namePlaceholder: "Their full name",
      relationLabel: "Relationship",
      relations: ["Parent", "Child", "Partner", "Sibling", "Grandparent", "Other"],
    },
  },

  // Prescription flow
  prescription: {
    heading: "Prescription",
    types: {
      repeat: { label: "Repeat", description: "Something you already take" },
      new: { label: "New", description: "First time on this medication" },
    },
    medication: {
      heading: "What medication?",
      placeholder: "e.g. Ventolin, Microgynon, Lexapro",
      controlled: "This medication requires a phone or video consultation",
    },
    condition: {
      heading: "What's it for?",
      options: [
        { id: "mental", label: "Mental health" },
        { id: "skin", label: "Skin" },
        { id: "infection", label: "Infection" },
        { id: "contraception", label: "Contraception" },
        { id: "respiratory", label: "Asthma/Respiratory" },
        { id: "heart", label: "Heart/BP" },
        { id: "diabetes", label: "Diabetes" },
        { id: "other", label: "Other" },
      ],
    },
    duration: {
      heading: "How long have you taken this?",
      options: [
        { id: "new", label: "New" },
        { id: "<3m", label: "< 3 months" },
        { id: "3-12m", label: "3–12 months" },
        { id: ">1y", label: "> 1 year" },
      ],
    },
    control: {
      heading: "How well controlled?",
      options: [
        { id: "well", label: "Well controlled" },
        { id: "partial", label: "Partially" },
        { id: "poor", label: "Poorly" },
      ],
    },
    sideEffects: {
      heading: "Side effects?",
      options: [
        { id: "none", label: "None" },
        { id: "mild", label: "Mild" },
        { id: "significant", label: "Significant" },
      ],
    },
  },

  // Safety check (universal, shortened)
  safety: {
    heading: "Quick safety check",
    subtitle: "Just making sure this is right for you",
    questions: {
      pregnant: "Pregnant or possibly pregnant?",
      allergies: "Any medication allergies?",
      reactions: "Any bad reactions before?",
      urgent: "Anything urgent we should know about?",
    },
    labels: { yes: "Yes", no: "No" },
    knockout: {
      heading: "You should see someone in person",
      body: "Based on your answers, it's best to see a doctor face-to-face. Safety first.",
      cta: "Find urgent care",
    },
  },

  // Medicare
  medicare: {
    heading: "Medicare details",
    subtitle: "Needed to process your request",
    number: {
      label: "Card number",
      placeholder: "0000 00000 0",
      help: "10 digits on the front of your card",
    },
    irn: {
      label: "IRN",
      help: "The number next to your name (1–9)",
    },
    expiry: {
      label: "Expiry",
      placeholder: "MM/YY",
    },
    errors: {
      invalid: "Check your Medicare number",
      incomplete: (n: number) => `${n} more digit${n === 1 ? "" : "s"}`,
      startDigit: "Must start with 2–6",
    },
    skip: "I don't have Medicare",
  },

  // Account
  account: {
    headingNew: "Almost there",
    headingExisting: "Welcome back",
    subtitle: "We need an account to send you the goods",
    google: "Continue with Google",
    divider: "or use email",
    name: { label: "Full name", placeholder: "As on your Medicare card" },
    email: { label: "Email", placeholder: "you@example.com" },
    password: { label: "Password", placeholder: "6+ characters" },
    terms: {
      prefix: "I agree to the",
      terms: "Terms",
      and: "&",
      privacy: "Privacy Policy",
    },
    ctaNew: "Create account",
    ctaExisting: "Sign in",
    switchNew: "New here? Create account",
    switchExisting: "Already have an account? Sign in",
    forgot: "Forgot password?",
  },

  // Review
  review: {
    heading: "Review & pay",
    subtitle: "Have a quick look. Make sure it's right.",
    edit: "Edit",
    sections: {
      type: "Request type",
      details: "Details",
      medicare: "Medicare",
    },
    disclaimer:
      "A real doctor will review this. They might message you if they need more. Requests are accepted any time.",
  },

  // Payment
  payment: {
    cta: "Pay & submit",
    processing: "Processing...",
    secure: "Secure payment via Stripe",
  },

  // Navigation
  nav: {
    back: "Back",
    next: "Continue",
  },

  // Notes (optional)
  notes: {
    heading: "Anything else?",
    subtitle: "Optional. Helps the doctor understand your situation.",
    placeholder: "Add any extra details here...",
  },

  // Errors
  errors: {
    generic: "Something went wrong. Please try again.",
    auth: "Couldn't sign you in. Check your details.",
    payment: "Payment failed. Please try again.",
    network: "Connection issue. Check your internet.",
  },

  // Success states
  success: {
    heading: "Request submitted",
    subtitle: "A doctor will review this shortly.",

    turnaround: "Requests accepted any time; review follows when available",
    cta: "View my requests",
  },
} as const
