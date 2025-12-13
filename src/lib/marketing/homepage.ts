// Homepage Marketing Data
// All content centralized for easy updates

export const siteConfig = {
  name: "InstantMed",
  tagline: "Australian online doctor",
  operatingHours: {
    weekdays: "7am – 10pm AEST",
    weekends: "8am – 8pm AEST",
    publicHolidays: "9am – 5pm AEST",
  },
  contact: {
    email: "support@instantmed.com.au",
    phone: "1800 000 000", // Placeholder
  },
  legal: {
    abn: "00 000 000 000", // Placeholder
    clinicName: "InstantMed Telehealth Pty Ltd",
    clinicAddress: "Level 10, 123 Collins Street, Melbourne VIC 3000", // Placeholder
  },
}

export const heroRotatingTexts = [
  "medical certificate",
  "script renewal",
  "referral letter",
  "treatment plan",
]

export const trustSignals = [
  {
    icon: "Shield",
    text: "AHPRA-registered",
    description: "All doctors are verified Australian practitioners",
  },
  {
    icon: "Lock",
    text: "Secure & private",
    description: "Bank-level encryption for your data",
  },
  {
    icon: "DollarSign",
    text: "Transparent pricing",
    description: "No hidden fees, ever",
  },
  {
    icon: "Clock",
    text: "Fast turnaround",
    description: "Most requests reviewed in under an hour",
  },
]

export const serviceCategories = [
  {
    id: "med-cert",
    slug: "medical-certificate",
    title: "Medical Certificates",
    shortTitle: "Med Certs",
    description: "Sick leave, carer's leave, or fitness-to-work certificates",
    icon: "FileText",
    color: "emerald",
    priceFrom: 24.95,
  },
  {
    id: "weight",
    slug: "weight-management",
    title: "Weight Management",
    shortTitle: "Weight",
    description: "Clinician-guided weight loss programs and support",
    icon: "Scale",
    color: "violet",
    priceFrom: 49.95,
  },
  {
    id: "mens-health",
    slug: "mens-health",
    title: "Men's Health",
    shortTitle: "Men's",
    description: "Discreet consultations for common men's health concerns",
    icon: "User",
    color: "blue",
    priceFrom: 39.95,
  },
  {
    id: "scripts",
    slug: "prescription",
    title: "Common Scripts",
    shortTitle: "Scripts",
    description: "Repeat prescriptions for ongoing medications",
    icon: "Pill",
    color: "amber",
    priceFrom: 19.95,
  },
]

export const proofMetrics = [
  {
    label: "Typical turnaround",
    value: "< 1 hour",
    icon: "Zap",
  },
  {
    label: "Secure messaging",
    value: "Async chat",
    icon: "MessageSquare",
  },
  {
    label: "Eligibility",
    value: "Clear rules",
    icon: "CheckCircle",
  },
  {
    label: "Pricing",
    value: "Transparent",
    icon: "CreditCard",
  },
]

export const howItWorks = [
  {
    step: 1,
    title: "Choose a service",
    description: "Select what you need and answer a few quick health questions. Takes about 2 minutes.",
    icon: "ClipboardList",
  },
  {
    step: 2,
    title: "Doctor reviews",
    description: "An AHPRA-registered GP reviews your request. They may message you for more info or suggest a quick call.",
    icon: "Stethoscope",
  },
  {
    step: 3,
    title: "Get your document",
    description: "If approved, your certificate, script, or referral is sent securely to your email or pharmacy.",
    icon: "FileCheck",
  },
]

export const featuredServices = [
  {
    title: "Medical Certificates",
    description: "For work, uni, or Centrelink. Same-day certificates for genuine illness.",
    priceFrom: 24.95,
    href: "/start?service=medical-certificate",
    features: ["Sick leave", "Carer's leave", "Fitness to work"],
  },
  {
    title: "Prescription Renewals",
    description: "Continue your regular medication without the GP wait.",
    priceFrom: 19.95,
    href: "/start?service=prescription",
    features: ["Contraception", "Blood pressure", "Cholesterol"],
  },
  {
    title: "Specialist Referrals",
    description: "Get referred to the specialist you need, faster.",
    priceFrom: 34.95,
    href: "/start?service=referral",
    features: ["All specialties", "Mental health plans", "Imaging requests"],
  },
  {
    title: "Weight Management",
    description: "Clinician-supervised programs tailored to your goals.",
    priceFrom: 49.95,
    href: "/start?service=weight-management",
    features: ["Initial assessment", "Ongoing support", "Medication if suitable"],
  },
]

export const pricingTiers = [
  {
    name: "Medical Certificate",
    price: 24.95,
    description: "For work, uni, or official purposes",
    features: [
      "Same-day processing",
      "Valid for employers & institutions",
      "Secure PDF delivery",
      "Doctor's details included",
    ],
    cta: "Get certificate",
    href: "/start?service=medical-certificate",
    popular: false,
  },
  {
    name: "Prescription Renewal",
    price: 19.95,
    description: "Continue your regular medication",
    features: [
      "Sent to your pharmacy",
      "Repeats included where appropriate",
      "E-script or paper script",
      "Medication review",
    ],
    cta: "Get script",
    href: "/start?service=prescription",
    popular: true,
  },
  {
    name: "Specialist Referral",
    price: 34.95,
    description: "For specialists, scans, or tests",
    features: [
      "All specialties covered",
      "Includes clinical summary",
      "Valid nationally",
      "Priority processing available",
    ],
    cta: "Get referral",
    href: "/start?service=referral",
    popular: false,
  },
]

export const faqItems = [
  {
    question: "How quickly will I receive my document?",
    answer: "Most requests are reviewed within 60 minutes during our operating hours (7am–10pm AEST weekdays, 8am–8pm weekends). Complex cases may take longer. We'll keep you updated via email.",
  },
  {
    question: "Who reviews my request?",
    answer: "All requests are reviewed by Australian doctors registered with AHPRA (the Australian Health Practitioner Regulation Agency). Our doctors are experienced GPs who specialise in telehealth consultations.",
  },
  {
    question: "What if I'm not eligible or my request is declined?",
    answer: "If a doctor determines that your request isn't clinically appropriate for an online consultation, we'll let you know and suggest alternatives. In most cases, you'll receive a full refund minus a small admin fee to cover processing costs.",
  },
  {
    question: "Can I get a repeat prescription?",
    answer: "Yes, we can provide repeat prescriptions for many ongoing medications. You'll need to answer a few questions about your current treatment and health status. Some medications (e.g., Schedule 8 drugs) cannot be prescribed online.",
  },
  {
    question: "Is my information secure?",
    answer: "Absolutely. We use bank-level encryption (AES-256) and comply with Australian privacy laws. Your health information is stored securely and only accessible to the treating doctor and essential support staff.",
  },
  {
    question: "What if the doctor needs more information?",
    answer: "The doctor may send you a secure message requesting clarification or additional details. In some cases, they may suggest a brief phone or video call (at no extra charge) to ensure safe and appropriate care.",
  },
  {
    question: "Where is this service available?",
    answer: "InstantMed is available to patients located anywhere in Australia. Prescriptions can be sent to any Australian pharmacy, and certificates are valid nationwide.",
  },
  {
    question: "What's your refund policy?",
    answer: "If your request cannot be fulfilled for clinical reasons, you'll receive a full or partial refund depending on how far the consultation progressed. If you're unhappy with the service, contact us within 7 days and we'll work to resolve it.",
  },
]

export const footerLinks = {
  services: [
    { label: "Medical Certificates", href: "/services/medical-certificate" },
    { label: "Prescriptions", href: "/services/prescription" },
    { label: "Referrals", href: "/services/referral" },
    { label: "Weight Management", href: "/services/weight-management" },
    { label: "Men's Health", href: "/services/mens-health" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Pricing", href: "/pricing" },
    { label: "FAQs", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Refund Policy", href: "/refunds" },
    { label: "Clinician Information", href: "/clinicians" },
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
  refundNote: "If we can't help you, you won't be charged the consultation fee. A small admin fee may apply to cover processing costs.",
}
