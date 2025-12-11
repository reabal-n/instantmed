/**
 * Pathology & Imaging Referral Flow Microcopy Dictionary
 *
 * Tone: calm, neutral, helpful, compliant
 * Avoids: guaranteed outcomes, implying imaging for convenience,
 *         asynchronous telehealth language
 */

export const REFERRAL_COPY = {
  // Global
  turnaround: "Reviewed within 24 hours",
  doctorReview: "A GP will determine whether a referral is clinically appropriate",
  mayRequest: "Some tests may require an in-person assessment",
  disclaimer: "We cannot order advanced imaging without clear clinical indication",

  // Landing
  landing: {
    badge: "Pathology & Imaging",
    heading: "Request a test referral",
    subtitle: "A GP will review your request and issue a referral if clinically appropriate.",
    cta: "Start request",
    price: "$29.99",
    features: [
      "GP reviews your clinical information",
      "Referral issued if appropriate",
      "Valid at any pathology or imaging centre",
    ],
  },

  // Step: Type
  type: {
    heading: "What type of test?",
    subtitle: "Select one",
    blood: {
      label: "Blood tests",
      description: "Pathology collection",
    },
    imaging: {
      label: "Imaging",
      description: "X-ray, ultrasound, CT, MRI",
    },
  },

  // Step: Test selection (Blood)
  bloodTests: {
    heading: "Which blood test do you need?",
    subtitle: "Select the most relevant option",
    options: [
      { id: "full-blood-count", label: "Full blood count" },
      { id: "liver-function", label: "Liver function" },
      { id: "kidney-function", label: "Kidney function" },
      { id: "thyroid", label: "Thyroid function" },
      { id: "iron-studies", label: "Iron studies" },
      { id: "vitamin-d", label: "Vitamin D" },
      { id: "lipids", label: "Cholesterol / Lipids" },
      { id: "diabetes", label: "Diabetes (HbA1c / glucose)" },
      { id: "sti", label: "STI screening" },
      { id: "hormone", label: "Hormone panel" },
      { id: "other", label: "Other" },
    ],
    otherPlaceholder: "Please specify the test",
  },

  // Step: Test selection (Imaging)
  imaging: {
    heading: "What type of imaging?",
    subtitle: "Select one",
    options: [
      { id: "xray", label: "X-ray" },
      { id: "ultrasound", label: "Ultrasound" },
      { id: "ct", label: "CT scan" },
      { id: "mri", label: "MRI" },
    ],
    region: {
      heading: "Which body region?",
      subtitle: "Select the area to be imaged",
      options: [
        { id: "head-neck", label: "Head / Neck" },
        { id: "chest", label: "Chest" },
        { id: "abdomen", label: "Abdomen / Pelvis" },
        { id: "spine", label: "Spine" },
        { id: "shoulder", label: "Shoulder" },
        { id: "elbow-wrist", label: "Elbow / Wrist / Hand" },
        { id: "hip", label: "Hip" },
        { id: "knee", label: "Knee" },
        { id: "ankle-foot", label: "Ankle / Foot" },
        { id: "other", label: "Other" },
      ],
      otherPlaceholder: "Please specify the region",
    },
  },

  // Step: Reason
  reason: {
    heading: "Why do you need this test?",
    subtitle: "Brief clinical justification helps the GP assess your request",
    placeholder: "e.g. Persistent fatigue for 3 weeks, checking iron levels...",
    charCount: (n: number) => `${n}/300`,
  },

  // Step: Safety
  safety: {
    heading: "Safety check",
    subtitle: "To ensure this service is appropriate",
    questions: {
      headInjury: "Have you had a recent head injury with loss of consciousness?",
      severeAbdo: "Do you have severe abdominal pain with fever?",
      chestPain: "Any chest pain or difficulty breathing?",
    },
    no: "No",
    yes: "Yes",
    alert: {
      heading: "Please seek urgent care",
      body: "Based on your answers, we recommend you visit your nearest emergency department or call 000.",
      cta: "Call 000",
    },
    ctAdvice: "CT and MRI requests require clear clinical indication. A GP may contact you for additional information.",
  },

  // Step: Medicare
  medicare: {
    heading: "Your Medicare details",
    subtitle: "Required for Medicare-eligible referrals",
    numberLabel: "Medicare number",
    numberPlaceholder: "0000 00000 0",
    irnLabel: "IRN",
    irnTooltip: "The number next to your name on your card (1–9)",
    dobLabel: "Date of birth",
    valid: "Valid",
    errors: {
      incomplete: (n: number) => `${n} more digit${n === 1 ? "" : "s"} needed`,
      startDigit: "Must start with 2, 3, 4, 5, or 6",
      checksum: "Please check your Medicare number",
    },
  },

  // Step: Signup
  signup: {
    headingNew: "Create an account",
    headingExisting: "Sign in",
    subtitle: "To receive your referral",
    google: "Continue with Google",
    or: "or",
    nameLabel: "Full name",
    emailLabel: "Email",
    passwordLabel: "Password",
    terms: {
      prefix: "I agree to the",
      termsLink: "Terms",
      and: "and",
      privacyLink: "Privacy Policy",
    },
    ctaNew: "Create account",
    ctaExisting: "Sign in",
    switchToExisting: "Have an account?",
    switchToNew: "New here?",
    signIn: "Sign in",
    createAccount: "Create account",
  },

  // Step: Review
  review: {
    heading: "Review your request",
    subtitle: "Confirm details before submitting",
    testType: "Test type",
    specificTest: "Specific test",
    region: "Body region",
    reason: "Clinical reason",
    medicare: "Medicare",
    edit: "Edit",
    none: "Not provided",
  },

  // Step: Payment
  payment: {
    heading: "Complete payment",
    subtitle: "A GP will review and issue a referral if clinically appropriate",
    price: "$29.99",
    includes: ["GP review of your request", "Referral issued if appropriate", "Valid at any collection centre"],
    disclaimer:
      "A GP will assess whether a referral is clinically appropriate. Some tests may require an in-person consultation. Advanced imaging (CT/MRI) requires clear clinical indication.",
    cta: "Pay & submit",
    processing: "Processing...",
  },

  // Navigation
  nav: {
    back: "Back",
    continue: "Continue",
  },

  // Errors
  errors: {
    generic: "Something went wrong. Please try again.",
    signIn: "Unable to sign in. Please check your details.",
    signUp: "Unable to create account.",
    payment: "Payment failed. Please try again.",
  },
} as const

export type ReferralCopyKey = keyof typeof REFERRAL_COPY
