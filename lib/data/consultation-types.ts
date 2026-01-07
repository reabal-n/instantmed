/**
 * Consultation Types and Specialized Question Sets
 * For general consult branching logic
 */

import {
  Heart,
  Scale,
  Brain,
  Droplet,
  Pill,
  User,
  Baby,
  Sparkles,
  Activity,
} from "lucide-react"

export interface ConsultationType {
  id: string
  label: string
  description: string
  icon: typeof Heart
  requiresCall: boolean
  questions: ConsultationQuestion[]
}

export interface ConsultationQuestion {
  id: string
  question: string
  type: "text" | "select" | "multiselect" | "textarea" | "date" | "number"
  required: boolean
  options?: string[]
  placeholder?: string
  helperText?: string
}

export const CONSULTATION_TYPES: ConsultationType[] = [
  {
    id: "mens-health",
    label: "Men's Health",
    description: "ED, hair loss, testosterone",
    icon: Activity,
    requiresCall: false,
    questions: [
      {
        id: "concern",
        question: "What brings you here today?",
        type: "select",
        required: true,
        options: [
          "Erectile dysfunction",
          "Hair loss / balding",
          "Testosterone concerns",
          "Performance anxiety",
          "Other men's health issue",
        ],
      },
      {
        id: "duration",
        question: "How long have you been experiencing this?",
        type: "select",
        required: true,
        options: [
          "Less than 1 month",
          "1-3 months",
          "3-6 months",
          "6-12 months",
          "Over a year",
        ],
      },
      {
        id: "details",
        question: "Please provide more details about your concern",
        type: "textarea",
        required: true,
        placeholder: "Describe your symptoms, concerns, or what you're looking for help with...",
      },
      {
        id: "medical-history",
        question: "Any relevant medical history?",
        type: "textarea",
        required: false,
        placeholder: "Heart conditions, diabetes, medications, etc.",
        helperText: "This helps our doctors provide safe, appropriate treatment",
      },
    ],
  },
  {
    id: "womens-health",
    label: "Women's Health",
    description: "Contraception, UTI, period concerns",
    icon: Heart,
    requiresCall: false,
    questions: [
      {
        id: "concern",
        question: "What do you need help with?",
        type: "select",
        required: true,
        options: [
          "Contraception / birth control",
          "UTI / cystitis",
          "Period problems",
          "Menopause symptoms",
          "PCOS",
          "Emergency contraception",
          "Other women's health issue",
        ],
      },
      {
        id: "urgency",
        question: "How urgent is this concern?",
        type: "select",
        required: true,
        options: [
          "Immediate (today)",
          "This week",
          "Routine / not urgent",
        ],
      },
      {
        id: "details",
        question: "Please tell us more",
        type: "textarea",
        required: true,
        placeholder: "Describe your symptoms or what you need help with...",
      },
    ],
  },
  {
    id: "weight-loss",
    label: "Weight Loss",
    description: "Weight management support",
    icon: Scale,
    requiresCall: true,
    questions: [
      {
        id: "current-weight",
        question: "What is your current weight? (kg)",
        type: "number",
        required: true,
        placeholder: "e.g., 85",
      },
      {
        id: "goal-weight",
        question: "What is your goal weight? (kg)",
        type: "number",
        required: true,
        placeholder: "e.g., 75",
      },
      {
        id: "height",
        question: "What is your height? (cm)",
        type: "number",
        required: true,
        placeholder: "e.g., 175",
      },
      {
        id: "previous-attempts",
        question: "Have you tried losing weight before?",
        type: "select",
        required: true,
        options: [
          "Never tried",
          "Diet and exercise",
          "Weight management treatment",
          "Multiple approaches",
        ],
      },
      {
        id: "medical-conditions",
        question: "Do you have any of these conditions?",
        type: "multiselect",
        required: false,
        options: [
          "Diabetes (Type 1 or 2)",
          "High blood pressure",
          "High cholesterol",
          "Thyroid issues",
          "PCOS",
          "Heart disease",
          "None of these",
        ],
      },
      {
        id: "goals",
        question: "What are your main goals?",
        type: "textarea",
        required: true,
        placeholder: "e.g., Improve health, feel more energetic, fit into old clothes...",
      },
    ],
  },
  {
    id: "mental-health",
    label: "Mental Health",
    description: "Anxiety, depression, stress",
    icon: Brain,
    requiresCall: true,
    questions: [
      {
        id: "concern",
        question: "What brings you here today?",
        type: "select",
        required: true,
        options: [
          "Anxiety",
          "Depression",
          "Stress management",
          "Sleep problems",
          "Medication review",
          "Other mental health concern",
        ],
      },
      {
        id: "severity",
        question: "How much is this affecting your daily life?",
        type: "select",
        required: true,
        options: [
          "Mildly - occasional difficulty",
          "Moderately - regular difficulty",
          "Severely - significant impact",
          "Crisis - unable to function",
        ],
      },
      {
        id: "duration",
        question: "How long have you felt this way?",
        type: "select",
        required: true,
        options: [
          "Less than 2 weeks",
          "2-4 weeks",
          "1-3 months",
          "3-6 months",
          "Over 6 months",
        ],
      },
      {
        id: "current-treatment",
        question: "Are you currently receiving treatment?",
        type: "select",
        required: true,
        options: [
          "No treatment",
          "Medication only",
          "Therapy/counseling only",
          "Both medication and therapy",
        ],
      },
      {
        id: "details",
        question: "Please share more about what you're experiencing",
        type: "textarea",
        required: true,
        placeholder: "Your symptoms, how you're feeling, what you hope to achieve...",
        helperText: "This is confidential and helps us provide appropriate care",
      },
    ],
  },
  {
    id: "skin-conditions",
    label: "Skin Conditions",
    description: "Acne, eczema, rashes",
    icon: Sparkles,
    requiresCall: true,
    questions: [
      {
        id: "condition",
        question: "What skin issue are you experiencing?",
        type: "select",
        required: true,
        options: [
          "Acne",
          "Eczema",
          "Rash / irritation",
          "Psoriasis",
          "Rosacea",
          "Dry skin",
          "Other skin condition",
        ],
      },
      {
        id: "location",
        question: "Where is the skin issue located?",
        type: "multiselect",
        required: true,
        options: [
          "Face",
          "Scalp",
          "Chest/back",
          "Arms",
          "Legs",
          "Hands/feet",
          "Other areas",
        ],
      },
      {
        id: "duration",
        question: "How long have you had this?",
        type: "select",
        required: true,
        options: [
          "Less than 1 week",
          "1-4 weeks",
          "1-3 months",
          "3-6 months",
          "Over 6 months",
          "Chronic / ongoing",
        ],
      },
      {
        id: "previous-treatment",
        question: "Have you tried any treatments?",
        type: "textarea",
        required: false,
        placeholder: "e.g., over-the-counter creams, prescription medications...",
      },
      {
        id: "details",
        question: "Please describe your skin condition",
        type: "textarea",
        required: true,
        placeholder: "Appearance, symptoms (itching, pain, etc.), triggers you've noticed...",
      },
    ],
  },
  {
    id: "sexual-health",
    label: "Sexual Health",
    description: "STI concerns, testing",
    icon: Droplet,
    requiresCall: true,
    questions: [
      {
        id: "concern",
        question: "What brings you here today?",
        type: "select",
        required: true,
        options: [
          "STI testing / screening",
          "STI symptoms or exposure",
          "Contraception advice",
          "Sexual dysfunction",
          "Other sexual health concern",
        ],
      },
      {
        id: "symptoms",
        question: "Are you experiencing any symptoms?",
        type: "multiselect",
        required: false,
        options: [
          "No symptoms",
          "Unusual discharge",
          "Pain or burning",
          "Sores or lesions",
          "Itching",
          "Rash",
          "Other symptoms",
        ],
      },
      {
        id: "exposure",
        question: "Recent exposure or risk?",
        type: "select",
        required: true,
        options: [
          "Routine screening",
          "Possible exposure (last 2 weeks)",
          "Known exposure",
          "Partner diagnosed with STI",
          "Not applicable",
        ],
      },
      {
        id: "details",
        question: "Additional information",
        type: "textarea",
        required: false,
        placeholder: "Any other details you'd like to share...",
        helperText: "All information is confidential",
      },
    ],
  },
  {
    id: "new-prescription",
    label: "New Prescription",
    description: "First-time medication",
    icon: Pill,
    requiresCall: true,
    questions: [
      {
        id: "reason",
        question: "Why do you need this medication?",
        type: "textarea",
        required: true,
        placeholder: "Describe your condition or symptoms...",
      },
      {
        id: "diagnosis",
        question: "Have you been diagnosed with a specific condition?",
        type: "text",
        required: false,
        placeholder: "e.g., Type 2 diabetes, high blood pressure",
      },
      {
        id: "previous-treatment",
        question: "Have you tried other treatments?",
        type: "textarea",
        required: false,
        placeholder: "Other medications, lifestyle changes, etc.",
      },
    ],
  },
  {
    id: "general",
    label: "General Health Issue",
    description: "Other health concerns",
    icon: User,
    requiresCall: true,
    questions: [
      {
        id: "chief-complaint",
        question: "What is your main concern today?",
        type: "text",
        required: true,
        placeholder: "e.g., Persistent cough, back pain, fatigue",
      },
      {
        id: "duration",
        question: "How long have you had this issue?",
        type: "select",
        required: true,
        options: [
          "Less than 1 week",
          "1-2 weeks",
          "2-4 weeks",
          "1-3 months",
          "Over 3 months",
        ],
      },
      {
        id: "severity",
        question: "How severe is it?",
        type: "select",
        required: true,
        options: [
          "Mild - minor inconvenience",
          "Moderate - affects daily activities",
          "Severe - significantly impacts life",
        ],
      },
      {
        id: "details",
        question: "Please describe your symptoms in detail",
        type: "textarea",
        required: true,
        placeholder: "When did it start? What makes it better/worse? Any other symptoms?",
      },
      {
        id: "tried",
        question: "What have you tried so far?",
        type: "textarea",
        required: false,
        placeholder: "Medications, home remedies, etc.",
      },
    ],
  },
]

/**
 * Get consultation type by ID
 */
export function getConsultationType(id: string): ConsultationType | undefined {
  return CONSULTATION_TYPES.find((type) => type.id === id)
}

/**
 * Get questions for a consultation type
 */
export function getQuestionsForType(typeId: string): ConsultationQuestion[] {
  const type = getConsultationType(typeId)
  return type?.questions || []
}
