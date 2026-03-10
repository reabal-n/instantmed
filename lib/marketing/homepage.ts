import { PRICING_DISPLAY, CONTACT_EMAIL, CONTACT_PHONE, ABN, COMPANY_NAME, COMPANY_ADDRESS } from "@/lib/constants"

// Homepage Marketing Data
// All content centralized for easy updates

export const siteConfig = {
  name: "InstantMed",
  tagline: "Online doctor consultations, reviewed by real GPs.",
  operatingHours: {
    weekdays: "8am – 10pm AEST",
    weekends: "8am – 10pm AEST",
    publicHolidays: "8am – 10pm AEST",
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
  `Medical certificate from ${PRICING_DISPLAY.MED_CERT} — most sorted in under an hour.`,
  "Too sick to visit a GP? Get your cert from bed.",
  "AHPRA-registered doctors. Employer-accepted certificates.",
  `Prescriptions renewed from ${PRICING_DISPLAY.REPEAT_SCRIPT}. Any pharmacy, Australia-wide.`,
  "Save $40–70 compared to a GP visit. Same doctor review.",
]

export const trustSignals = [
  {
    icon: "Clock",
    text: "Reviewed in under an hour",
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
    description: "Get a valid certificate for work, uni, or carer's leave — without leaving bed",
    icon: "FileText",
    color: "emerald",
    priceFrom: 19.95,
    href: "/request?service=med-cert",
    popular: true,
    cta: "Get your certificate",
    benefits: [
      "Accepted by all Australian employers",
      "Delivered to your inbox same-day",
      "AHPRA-registered doctor on every cert",
    ],
    testimonial: {
      quote: "Got my cert in 20 mins. Employer accepted it no questions asked.",
      author: "Sarah, Sydney"
    },
  },
  {
    id: "scripts",
    slug: "prescription",
    title: "Repeat Scripts",
    shortTitle: "Scripts",
    benefitQuestion: "Need your regular medication?",
    description: "Get your regular meds sorted without the hassle",
    icon: "Pill",
    color: "cyan",
    priceFrom: 29.95,
    href: "/request?service=prescription",
    popular: false,
    cta: "Renew prescription",
    benefits: [
      "Works with any chemist",
      "Repeat scripts included",
      "eScript sent via SMS"
    ],
  },
  {
    id: "consult",
    slug: "consult",
    title: "General Consult",
    shortTitle: "Consult",
    benefitQuestion: "Have a health concern?",
    description: "Talk to a doctor about something new or ongoing",
    icon: "Stethoscope",
    color: "blue",
    priceFrom: 49.95,
    href: "/request?service=consult",
    popular: false,
    cta: "Start a consult",
    benefits: [
      "Chat about something bothering you",
      "Get advice on next steps",
      "Prescriptions if it makes sense",
    ],
  },
]

export const proofMetrics = [
  {
    label: "Typical turnaround",
    value: "Under 1 hour",
    icon: "Zap",
    emoji: "\u26A1",
  },
  {
    label: "Every request",
    value: "Real GP reviewed",
    icon: "MessageSquare",
    emoji: "\uD83E\uDE7A",
  },
  {
    label: "No account needed",
    value: "Start in 2 mins",
    icon: "CheckCircle",
    emoji: "\u2705",
  },
  {
    label: "Flat pricing",
    value: "Full refund if declined",
    icon: "CreditCard",
    emoji: "\uD83D\uDCB3",
  },
]

export const howItWorks = [
  {
    step: 1,
    title: "Answer a few questions",
    description: "Tell us what's going on. Takes about 2 minutes.",
    icon: "ClipboardList",
    emoji: "📝",
  },
  {
    step: 2,
    title: "A doctor reviews it",
    description: "A real Australian doctor reviews your request and makes a clinical decision.",
    icon: "Stethoscope",
    emoji: "🩺",
  },
  {
    step: 3,
    title: "Done",
    description: "Certificate to your inbox, eScript to your phone. That's it.",
    icon: "FileCheck",
    emoji: "✅",
  },
]

export const featuredServices = [
  {
    title: "Medical Certificates",
    description: "Feeling too sick to visit a GP? Get a valid, employer-accepted certificate from an AHPRA-registered doctor — without leaving bed.",
    priceFrom: 19.95,
    href: "/request?service=med-cert",
    features: ["Sick leave", "Carer's leave", "Uni extensions", "Same-day delivery"],
  },
  {
    title: "Prescriptions",
    description: "Running low on your regular medication? A doctor reviews your request and sends an eScript to your phone. Any pharmacy, Australia-wide.",
    priceFrom: 29.95,
    href: "/request?service=prescription",
    features: ["Contraception", "Blood pressure", "Skin treatments", "eScript to your phone"],
  },
]

export const faqItems = [
  {
    question: "How is this different from seeing a doctor in person?",
    answer: "Every request is reviewed by a real Australian doctor — registered with AHPRA and actively practicing. No AI, no chatbot. Telehealth has been legal and regulated in Australia for years. The difference? No waiting rooms, no appointments, no phone tag.",
  },
  {
    question: "What if the doctor says no?",
    answer: "Full refund, no questions. We'd rather be upfront than take your money for something we can't help with.",
  },
  {
    question: "How fast is it really?",
    answer: "Most requests are sorted within an hour. Sometimes 20 minutes, sometimes 90 — depends on how busy we are. You'll get email updates so you're not left wondering.",
  },
  {
    question: "Is my information private?",
    answer: "Completely. Your health info is encrypted and only seen by the treating doctor. We don't share anything with employers, insurers, or anyone else. Ever.",
  },
  {
    question: "How much does it cost compared to a GP?",
    answer: `Medical certificates start from $${PRICING_DISPLAY.MED_CERT}, prescriptions from $${PRICING_DISPLAY.REPEAT_SCRIPT}, and consults from $${PRICING_DISPLAY.CONSULT}. A typical GP visit costs $60–120 before Medicare, plus the travel and wait. No Medicare rebate, but you'll likely still save — and definitely save time.`,
  },
]

export const footerLinks = {
  services: [
    { label: "Medical Certificates", href: "/request?service=med-cert" },
    { label: "Prescriptions", href: "/request?service=prescription" },
    { label: "General Consult", href: "/request?service=consult" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Our Doctors", href: "/our-doctors" },
    { label: "Reviews", href: "/reviews" },
    { label: "Clinical Governance", href: "/clinical-governance" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Pricing", href: "/pricing" },
    { label: "FAQs", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Refund Policy", href: "/refund-policy" },
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
  refundNote: "If we can't help you, you'll receive a full refund — no questions asked.",
}
