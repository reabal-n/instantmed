// Homepage Marketing Data
// All content centralized for easy updates

export const siteConfig = {
  name: "InstantMed",
  tagline: "Med certs & scripts — done in an hour",
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
  "prescription",
  "sick note",
  "script renewal",
]

export const trustSignals = [
  {
    icon: "Clock",
    text: "Usually done in an hour",
    description: "No waiting days for an appointment",
  },
  {
    icon: "Shield",
    text: "Actual doctors, not AI",
    description: "Real Australian GPs review every request",
  },
  {
    icon: "DollarSign",
    text: "Pay only if approved",
    description: "Full refund if we can't help",
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
    description: "Sick leave, carer's leave, or fitness-to-work certificates",
    icon: "FileText",
    color: "emerald",
    priceFrom: 24.95,
  },
  {
    id: "scripts",
    slug: "prescription",
    title: "Prescriptions",
    shortTitle: "Scripts",
    description: "Repeat prescriptions for ongoing medications",
    icon: "Pill",
    color: "cyan",
    priceFrom: 19.95,
  },
]

export const proofMetrics = [
  {
    label: "Typical turnaround",
    value: "~1 hour",
    icon: "Zap",
  },
  {
    label: "No video calls",
    value: "Async only",
    icon: "MessageSquare",
  },
  {
    label: "Clear eligibility",
    value: "Know upfront",
    icon: "CheckCircle",
  },
  {
    label: "Flat pricing",
    value: "No surprises",
    icon: "CreditCard",
  },
]

export const howItWorks = [
  {
    step: 1,
    title: "Answer a few questions",
    description: "Quick form, no account needed. Takes about 2 minutes.",
    icon: "ClipboardList",
    emoji: "📝",
  },
  {
    step: 2,
    title: "A doctor reviews it",
    description: "A real GP looks at your request. If they need anything, they'll message you.",
    icon: "Stethoscope",
    emoji: "🩺",
  },
  {
    step: 3,
    title: "Done",
    description: "Certificate in your inbox. Script sent to your pharmacy. That's it.",
    icon: "FileCheck",
    emoji: "✅",
  },
]

export const featuredServices = [
  {
    title: "Medical Certificates",
    description: "For when you're unwell and need proof for work or uni. Employers accept these — we've issued thousands.",
    priceFrom: 24.95,
    href: "/start?service=medical-certificate",
    features: ["Sick leave", "Carer's leave", "Uni extensions", "Same-day delivery"],
  },
  {
    title: "Prescriptions",
    description: "For your regular medications — the ones you already take. Skip the 3-week GP wait.",
    priceFrom: 19.95,
    href: "/start?service=prescription",
    features: ["Contraception", "Blood pressure", "Skin treatments", "Sent to your pharmacy"],
  },
]

export const pricingTiers = [
  {
    name: "Medical Certificate",
    price: 24.95,
    description: "Sick? Need proof for work?",
    features: [
      "Reviewed in about an hour",
      "Valid for all employers",
      "Emailed as a PDF",
      "Backdating if appropriate",
    ],
    cta: "Get a certificate",
    href: "/start?service=medical-certificate",
    popular: true,
  },
  {
    name: "Prescription",
    price: 19.95,
    description: "Need your regular meds?",
    features: [
      "Sent direct to your pharmacy",
      "Repeats included when suitable",
      "Works with any chemist",
      "eScript or paper",
    ],
    cta: "Get a script",
    href: "/start?service=prescription",
    popular: false,
  },
]

export const faqItems = [
  {
    question: "Is this actually legit?",
    answer: "Yes. Every request is reviewed by a real Australian doctor — registered with AHPRA and actively practicing. This isn't AI or a chatbot. It's telehealth, which has been legal and regulated in Australia for years.",
  },
  {
    question: "Will my employer accept an online medical certificate?",
    answer: "Yes. Our certificates are legally valid and accepted by all Australian employers, unis, and government bodies. They're identical to what you'd get from an in-person GP visit.",
  },
  {
    question: "What if the doctor says no?",
    answer: "If a doctor can't approve your request for clinical reasons, you get a full refund. We won't charge you for something we can't help with.",
  },
  {
    question: "How fast is it really?",
    answer: "Most requests are done within an hour. Sometimes it's 20 minutes, sometimes 90 — depends on how busy we are. You'll get email updates so you're not left wondering.",
  },
  {
    question: "Is my information private?",
    answer: "Completely. Your health info is encrypted and only seen by the treating doctor. We don't share anything with employers, insurers, or anyone else. Ever.",
  },
  {
    question: "What medications can you prescribe?",
    answer: "Most common ones — contraception, blood pressure meds, cholesterol, skin treatments, and more. We can't do anything controlled (like strong painkillers) or medications that need a physical exam first.",
  },
  {
    question: "Do I need to create an account?",
    answer: "No. You can go through the whole process as a guest. We'll just need an email to send your documents to.",
  },
  {
    question: "What if I have questions during the process?",
    answer: "The doctor might message you if they need more info. You can reply right there. If something's unclear on your end, our support team is around to help.",
  },
]

export const footerLinks = {
  services: [
    { label: "Medical Certificates", href: "/medical-certificate" },
    { label: "Prescriptions", href: "/prescriptions" },
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
