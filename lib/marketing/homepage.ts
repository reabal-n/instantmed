import { PRICING_DISPLAY } from "@/lib/constants"

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
  `Medical certificate from ${PRICING_DISPLAY.MED_CERT} — sorted in under an hour.`,
  "Too sick to visit a GP? Get your cert from bed.",
  "Skip the waiting room. Real doctors, real certificates.",
  `Prescriptions renewed from ${PRICING_DISPLAY.REPEAT_SCRIPT}. Any pharmacy.`,
  "Save $40–70 vs a GP. AHPRA doctors. Done.",
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
      "eToken sent via SMS"
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
    color: "violet",
    priceFrom: 49.95,
    href: "/request?service=consult",
    popular: false,
    cta: "Book a consult",
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
    value: "Pay after review",
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
    description: "A real Australian doctor looks at your request and makes the call.",
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

export const pricingTiers = [
  {
    name: "Prescription",
    price: 29.95,
    description: "Running low on your regular meds?",
    features: [
      "eScript sent to your phone",
      "Repeats included when suitable",
      "Works with any chemist",
      "eScript or paper",
    ],
    cta: "Renew prescription",
    href: "/request?service=prescription",
    popular: false,
    icon: "Pill",
    color: "from-cyan-500 to-blue-500",
  },
  {
    name: "Medical Certificate",
    price: 19.95,
    description: "Too sick to see a GP? Get your cert from bed.",
    features: [
      "AHPRA-registered doctor reviews it",
      "Accepted by all Australian employers",
      "Delivered to your inbox as a PDF",
      "Backdating if clinically appropriate",
    ],
    cta: "Get your certificate",
    href: "/request?service=med-cert",
    popular: true,
    icon: "FileText",
    color: "from-indigo-500 to-violet-500",
  },
  {
    name: "General Consult",
    price: 49.95,
    description: "Something on your mind?",
    features: [
      "Talk through what's going on",
      "Get advice on next steps",
      "Prescriptions if it makes sense",
      "Pathology requests if needed",
    ],
    cta: "Book a consult",
    href: "/request?service=consult",
    popular: false,
    icon: "Stethoscope",
    color: "from-violet-500 to-purple-500",
  },
]

export const faqItems = [
  {
    question: "How is this different from seeing a doctor in person?",
    answer: "Every request is reviewed by a real Australian doctor — registered with AHPRA and actively practicing. No AI, no chatbot. Telehealth has been legal and regulated in Australia for years. The difference? No waiting rooms, no appointments, no phone tag.",
  },
  {
    question: "Will my employer accept an online medical certificate?",
    answer: "Yes. Our certificates are legally valid and accepted by all Australian employers, unis, and government bodies. Telehealth certificates are legally equivalent to those issued in-person.",
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
    answer: "Completely. Your health info is encrypted and only seen by the treating doctor. We don't share anything with employers, insurers, or anyone else. Ever. 🔒",
  },
  {
    question: "What treatments can you provide?",
    answer: "Most common ones — contraception, blood pressure treatments, cholesterol management, skin treatments, and more. We can't do anything controlled (like strong painkillers) or treatments that need a physical exam first.",
  },
  {
    question: "Do I need to create an account?",
    answer: "Nope. You can go through the whole process as a guest. We just need an email to send your documents to.",
  },
  {
    question: "What if I have questions during the process?",
    answer: "The doctor might message you if they need more info. You can reply right there. If something's unclear on your end, our support team is around to help. We're real people, not a call centre.",
  },
  {
    question: "Can I get a backdated medical certificate?",
    answer: "Yes, if it's clinically appropriate. Certificates can cover absences up to 48 hours ago. Just let the doctor know when your symptoms started and they'll make the call.",
  },
  {
    question: "How much does it cost compared to a GP?",
    answer: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}, prescriptions from ${PRICING_DISPLAY.REPEAT_SCRIPT}, and consults from ${PRICING_DISPLAY.CONSULT}. A typical GP visit costs $60–120 before Medicare, plus the travel and time spent in the waiting room. Medicare rebates don't apply here, but you'll likely still save money — and definitely save time.`,
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept Visa, Mastercard, American Express, Apple Pay, and Google Pay. Payments are processed securely through Stripe. You're only charged after a doctor reviews your request.",
  },
  {
    question: "Can I use this for my kids?",
    answer: "Currently our service is designed for adults (18+). For children, we recommend visiting your GP or calling Healthdirect on 1800 022 222.",
  },
]

export const footerLinks = {
  services: [
    { label: "Medical Certificates", href: "/request?service=med-cert" },
    { label: "Prescriptions", href: "/request?service=prescription" },
    { label: "Consultations", href: "/request?service=consult" },
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
