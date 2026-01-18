// Homepage Marketing Data
// All content centralized for easy updates

export const siteConfig = {
  name: "InstantMed",
  tagline: "Telehealth for medical certificates and repeat prescriptions",
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
    abn: "52 426 403 844",
    clinicName: "InstantMed Telehealth Pty Ltd",
    clinicAddress: "Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010",
    ahpraStatement: "All consulting doctors hold current AHPRA registration",
  },
}

export const heroRotatingTexts = [
  "medical certificate",
  "doctor consultation",
  "sick note",
  "repeat request",
]

export const trustSignals = [
  {
    icon: "Clock",
    text: "Under 30 min review",
    description: "Fast response times",
  },
  {
    icon: "Clock",
    text: "7 days a week",
    description: "Available every day",
  },
  {
    icon: "Shield",
    text: "AHPRA registered drs",
    description: "Real Australian GPs review every request",
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
    benefitQuestion: "Need proof you're unwell?",
    description: "Work, study, or carer's certificates",
    icon: "FileText",
    color: "emerald",
    priceFrom: 19.95,
    href: "/start?service=med-cert",
    popular: true,
    cta: "Request certificate",
    benefits: [
      "Valid for all employers",
      "Same-day delivery",
      "Backdating if appropriate"
    ],
    testimonial: {
      quote: "Got my cert in 20 mins",
      author: "Sarah, Sydney"
    },
  },
  {
    id: "scripts",
    slug: "prescription",
    title: "Repeat Scripts",
    shortTitle: "Scripts",
    benefitQuestion: "Need your regular medication?",
    description: "Repeat requests for treatments you already take",
    icon: "Pill",
    color: "cyan",
    priceFrom: 29.95,
    href: "/start?service=repeat-script",
    popular: false,
    cta: "Renew prescription",
    benefits: [
      "Works with any chemist",
      "Repeat scripts included",
      "eToken sent via SMS"
    ],
  },
  {
    id: "consult",
    slug: "consult",
    title: "General Consult",
    shortTitle: "Consult",
    benefitQuestion: "Have a health concern?",
    description: "Clinical assessment for health concerns or new treatment requests",
    icon: "Stethoscope",
    color: "violet",
    priceFrom: 49.95,
    href: "/start?service=consult",
    popular: false,
    cta: "Book a consult",
    benefits: [
      "Assessment of common medical concerns",
      "Treatment advice and management plans",
      "New prescriptions if clinically appropriate",
    ],
  },
]

export const proofMetrics = [
  {
    label: "Typical turnaround",
    value: "~1 hour",
    icon: "Zap",
  },
  {
    label: "Doctor reviewed",
    value: "Every request",
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
    description: "Short, secure form. Takes about 2 minutes.",
    icon: "ClipboardList",
    emoji: "📝",
  },
  {
    step: 2,
    title: "A doctor reviews it",
    description: "A fully registered Australian GP personally reviews your request.",
    icon: "Stethoscope",
    emoji: "🩺",
  },
  {
    step: 3,
    title: "Done",
    description: "Your certificate is emailed, or your script is sent straight to your phone.",
    icon: "FileCheck",
    emoji: "✅",
  },
]

export const featuredServices = [
  {
    title: "Medical Certificates",
    description: "For when you're unwell and need proof for work or uni. Employers accept these — we've issued thousands.",
    priceFrom: 24.95,
    href: "/start?service=med-cert",
    features: ["Sick leave", "Carer's leave", "Uni extensions", "Same-day delivery"],
  },
  {
    title: "Prescriptions",
    description: "For treatments you already take. Reviewed by a doctor, eScript sent to your phone.",
    priceFrom: 19.95,
    href: "/start?service=repeat-script",
    features: ["Contraception", "Blood pressure", "Skin treatments", "eScript to your phone"],
  },
]

export const pricingTiers = [
  {
    name: "Prescription",
    price: 19.95,
    description: "Need your regular treatments?",
    features: [
      "eScript sent to your phone",
      "Repeats included when suitable",
      "Works with any chemist",
      "eScript or paper",
    ],
    cta: "Renew prescription",
    href: "/start?service=repeat-script",
    popular: false,
    icon: "Pill",
    color: "from-cyan-500 to-blue-500",
  },
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
    cta: "Request certificate",
    href: "/start?service=med-cert",
    popular: true,
    icon: "FileText",
    color: "from-indigo-500 to-violet-500",
  },
  {
    name: "General Consult",
    price: 44.95,
    description: "Complex health concerns?",
    features: [
      "New treatment options available",
      "Dose adjustments",
      "Detailed review",
      "Pathology requests if needed",
    ],
    cta: "Book a consult",
    href: "/start?service=consult",
    popular: false,
    icon: "Stethoscope",
    color: "from-violet-500 to-purple-500",
  },
]

export const faqItems = [
  {
    question: "How is this different from seeing a GP?",
    answer: "Every request is reviewed by a real Australian doctor — registered with AHPRA and actively practicing. This isn't AI or a chatbot. It's telehealth, which has been legal and regulated in Australia for years. The main difference is convenience: no waiting rooms, no appointments, healthcare delivered via regulated telehealth.",
  },
  {
    question: "Will my employer accept an online medical certificate?",
    answer: "Yes. Our certificates are legally valid and accepted by all Australian employers, unis, and government bodies. Telehealth certificates are legally equivalent to those issued in-person.",
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
    question: "What treatments can you provide?",
    answer: "Most common ones — contraception, blood pressure treatments, cholesterol management, skin treatments, and more. We can't do anything controlled (like strong painkillers) or treatments that need a physical exam first.",
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
    { label: "Our Doctors", href: "/our-doctors" },
    { label: "Clinical Governance", href: "/clinical-governance" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Pricing", href: "/pricing" },
    { label: "FAQs", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Refund Policy", href: "/refunds" },
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
