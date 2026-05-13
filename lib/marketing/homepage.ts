import { ABN, COMPANY_ADDRESS,COMPANY_NAME, CONTACT_EMAIL, CONTACT_PHONE, PRICING_DISPLAY } from "@/lib/constants"

// Homepage Marketing Data
// All content centralized for easy updates

export const siteConfig = {
  name: "InstantMed",
  tagline: "Online doctor consultations, reviewed by real GPs.",
  operatingHours: {
    medCerts: "24/7",
    rxConsults: "Submit 24/7",
    weekdays: "Submit 24/7",
    weekends: "Submit 24/7",
    publicHolidays: "Submit 24/7",
  },
  contact: {
    email: CONTACT_EMAIL,
    phone: CONTACT_PHONE,
  },
  legal: {
    abn: ABN,
    clinicName: COMPANY_NAME,
    clinicAddress: COMPANY_ADDRESS,
    ahpraStatement: "All consulting doctors hold current AHPRA registration",
  },
}

export const heroRotatingTexts = [
  "A doctor, without the waiting room.",
  "Skip the waiting room, not the doctor.",
  "AHPRA-registered doctors. Reviewed, not automated.",
  "Fill in a form. A doctor reviews it. Done.",
  "Real GP review, without leaving the couch.",
]

export const trustSignals = [
  {
    icon: "Clock",
    text: "Certs in ~20 min, scripts in 1–2 hrs",
    description: "Most requests sorted same day",
  },
  {
    icon: "Clock",
    text: "7 days a week",
    description: "Available every day",
  },
  {
    icon: "Shield",
    text: "AHPRA registered drs",
    description: "Real Australian doctors review every request",
  },
  {
    icon: "Lock",
    text: "Private and secure",
    description: "Your info stays between you and the doctor",
  },
]

export const serviceCategories = [
  {
    id: "med-cert",
    slug: "medical-certificate",
    title: "Medical Certificates",
    shortTitle: "Med Certs",
    benefitQuestion: "Too sick to see a doctor in person?",
    description: "Get a certificate for work, study, or carer's leave, without leaving bed",
    icon: "FileText",
    color: "emerald",
    priceFrom: 19.95,
    href: "/request?service=med-cert",
    popular: true,
    cta: "Get your certificate",
    benefits: [
      "Issued if clinically appropriate",
      "Delivered to your inbox same-day",
      "AHPRA-registered doctor on every cert",
    ],
  },
  {
    id: "scripts",
    slug: "prescription",
    title: "Repeat Medication",
    shortTitle: "Medication",
    benefitQuestion: "Need your regular medication?",
    description: "Get your regular medication sorted without the hassle",
    icon: "Pill",
    color: "cyan",
    priceFrom: 29.95,
    href: "/request?service=repeat-script",
    popular: false,
    cta: "Renew medication",
    benefits: [
      "Works with any chemist",
      "Repeats included where appropriate",
      "Sent to your phone via SMS"
    ],
  },
  {
    id: "consult",
    slug: "consult",
    title: "General Consult",
    shortTitle: "Consult",
    benefitQuestion: "Need to talk to a doctor?",
    description: "A full clinical assessment with an AHPRA-registered GP. No appointment, no waiting room.",
    icon: "Stethoscope",
    color: "sky",
    priceFrom: 49.95,
    href: "/consult",
    popular: false,
    cta: "Start your consult",
    benefits: [
      "Full clinical assessment by a real GP",
      "Medication and referrals if needed",
      "Full refund if we can't help",
    ],
  },
  {
    id: "ed",
    slug: "erectile-dysfunction",
    title: "ED Assessment",
    shortTitle: "ED",
    benefitQuestion: "Need a discreet ED assessment?",
    description: "Private ED assessment reviewed by an Australian doctor. No booked appointment or waiting room.",
    icon: "Lightning",
    color: "blue",
    priceFrom: 49.95,
    href: "/erectile-dysfunction",
    popular: false,
    cta: "Start assessment",
    benefits: [
      "Form-first doctor review",
      "eScript sent if approved",
      "Prescription only if appropriate",
    ],
  },
  {
    id: "hair-loss",
    slug: "hair-loss",
    title: "Hair Loss Assessment",
    shortTitle: "Hair Loss",
    benefitQuestion: "Noticed your hairline changing?",
    description: "Doctor-led assessment for hair loss concerns. Private form-first review.",
    icon: "Sparkles",
    color: "amber", // was "violet" — fixed per DESIGN.md §1 prohibition + audit C1/C2
    priceFrom: 49.95,
    href: "/hair-loss",
    popular: false,
    cta: "Start assessment",
    benefits: [
      "Doctor-assessed options",
      "No waiting room",
      "eScript sent straight to your phone",
    ],
  },
  {
    id: "womens-health",
    slug: "womens-health",
    title: "Women's Health",
    shortTitle: "Women's Health",
    benefitQuestion: "Need support with women's health?",
    description: "Contraception, UTIs, and more, reviewed by an Australian doctor. No waiting room.",
    icon: "Heart",
    color: "pink",
    href: "/womens-health",
    popular: false,
    comingSoon: true,
    cta: "Coming soon",
    benefits: [
      "Contraception and hormonal health",
      "Doctor-reviewed form",
      "eScript sent to your phone",
    ],
  },
  {
    id: "weight-loss",
    slug: "weight-loss",
    title: "Weight Loss",
    shortTitle: "Weight Loss",
    benefitQuestion: "Looking for medical weight management?",
    description: "Doctor-led weight loss assessment with evidence-based treatment options.",
    icon: "Flame",
    color: "rose",
    href: "/weight-loss",
    popular: false,
    comingSoon: true,
    cta: "Coming soon",
    benefits: [
      "Evidence-based treatment plans",
      "Doctor-reviewed assessment",
      "Ongoing support available",
    ],
  },
]

export const proofMetrics = [
  {
    label: "Typical turnaround",
    value: "Under 1 hour",
    icon: "Zap",
  },
  {
    label: "Every request",
    value: "Real GP reviewed",
    icon: "MessageSquare",
  },
  {
    label: "No account needed",
    value: "Start in 2 mins",
    icon: "CheckCircle",
  },
  {
    label: "Flat pricing",
    value: "Full refund if declined",
    icon: "CreditCard",
  },
]

export const howItWorks = [
  {
    step: 1,
    title: "Answer a few questions",
    description: "Tell us what's going on. Takes about 2 minutes.",
    icon: "ClipboardList",
  },
  {
    step: 2,
    title: "A doctor reviews it",
    description: "A real Australian doctor reviews your request and makes a clinical decision.",
    icon: "Stethoscope",
  },
  {
    step: 3,
    title: "Done",
    description: "Certificate to your inbox, medication to your phone. That's it.",
    icon: "FileCheck",
  },
]

export const featuredServices = [
  {
    title: "Medical Certificates",
    description: "Feeling too sick to visit a GP? Get a valid, employer-ready certificate from an AHPRA-registered doctor, without leaving bed.",
    priceFrom: 19.95,
    href: "/request?service=med-cert",
    features: ["Sick leave", "Carer's leave", "Uni extensions", "Same-day delivery"],
  },
  {
    title: "Repeat Medication",
    description: "Running low on your regular medication? A doctor reviews your request and sends to your phone. Any pharmacy, Australia-wide.",
    priceFrom: 29.95,
    href: "/request?service=repeat-script",
    features: ["Contraception", "Blood pressure", "Skin treatments", "Sent to your phone"],
  },
  {
    title: "ED Assessment",
    description: "Discreet doctor-led assessment for ED. A doctor reviews your form and prescribes only if clinically appropriate. No waiting room.",
    priceFrom: 49.95,
    href: "/erectile-dysfunction",
    features: ["Form-first review", "Private assessment", "Any Australian pharmacy", "Doctor-reviewed"],
  },
  {
    title: "Hair Loss Assessment",
    description: "Doctor-led hair loss assessment. Private form-first review, with next steps decided after clinical assessment.",
    priceFrom: 49.95,
    href: "/hair-loss",
    features: ["Doctor-assessed options", "Doctor-reviewed", "eScript if approved", "No waiting room"],
  },
  {
    title: "Women's Health",
    description: "Contraception, UTIs, and hormonal health. Reviewed by an Australian doctor, no waiting room required.",
    href: "/womens-health",
    comingSoon: true,
    features: ["Contraception", "UTI treatment", "Hormonal health", "Doctor-reviewed"],
  },
  {
    title: "Weight Loss",
    description: "Doctor-led weight loss assessment with evidence-based treatment options. Ongoing support available.",
    href: "/weight-loss",
    comingSoon: true,
    features: ["Manual review", "Doctor-reviewed", "Safety screening", "No waiting room"],
  },
]

export const faqItems = [
  {
    question: "What if the doctor says no?",
    answer: "Full refund if we can't help. We'd rather be upfront than charge for something a doctor can't clinically assist with.",
  },
  {
    question: "How fast is it really?",
    answer: "Medical certificate requests are open 24/7. Prescription and consultation requests can be submitted any time and are reviewed during clinical review hours. You'll get email updates as things progress, so you're not left wondering.",
  },
  {
    question: "Is my information private?",
    answer: "Completely. Your health info is encrypted and only seen by the treating doctor. We don't share anything with employers, insurers, or anyone else. Ever.",
  },
  {
    question: "How much does it cost compared to a GP?",
    answer: `Medical certificates start from $${PRICING_DISPLAY.MED_CERT}, repeat medication from $${PRICING_DISPLAY.REPEAT_SCRIPT}, and consults from $${PRICING_DISPLAY.CONSULT}. A typical GP visit costs $60–120 before Medicare, plus the travel and wait. No Medicare rebate, but you'll likely still save, and definitely save time.`,
  },
  {
    question: "Does Medicare cover InstantMed?",
    answer: "Not currently. InstantMed is a private telehealth service, so there's no Medicare rebate. Medical certificates do not require a Medicare card. Prescriptions and consultations require Medicare details for identity, prescribing records, and pharmacy continuity.",
  },
  {
    question: "How do prescriptions work?",
    answer: "A doctor reviews your request and, if clinically appropriate, sends an electronic prescription (eScript) directly to your phone via SMS. Take it to any pharmacy in Australia. No paper scripts, no waiting for a callback.",
  },
]

export const footerLinks = {
  services: [
    { label: "Medical Certificates", href: "/medical-certificate" },
    { label: "Repeat Prescriptions", href: "/prescriptions" },
    { label: "General Consult", href: "/consult" },
    { label: "ED Assessment", href: "/erectile-dysfunction" },
    { label: "Hair Loss Assessment", href: "/hair-loss" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Pricing", href: "/pricing" },
    { label: "Health Guides", href: "/blog" },
    { label: "Your Options", href: "/alternatives" },
    { label: "What we won't do", href: "/what-we-wont-do" },
    { label: "Why we're faster", href: "/why-instant" },
    { label: "Contact", href: "/contact" },
  ],
}

export const slaPolicy = {
  standardTurnaround: "60 minutes",
  operatingHoursNote: "During operating hours",
  exceptions: [
    "Complex medical histories may require additional review time",
    "Requests requiring a phone/video consultation",
    "High-demand periods (public holidays, flu season)",
  ],
  escalationNote: "If your request needs clarification, a doctor may message you or offer a brief call at no extra charge.",
  refundNote: "If we can't help you, you'll receive a full refund. No questions asked.",
}
