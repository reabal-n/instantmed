import { ABN, COMPANY_ADDRESS,COMPANY_NAME, CONTACT_EMAIL, CONTACT_PHONE, PRICING_DISPLAY } from "@/lib/constants"

// Homepage Marketing Data
// All content centralized for easy updates

export const siteConfig = {
  name: "InstantMed",
  tagline: "Online doctor consultations, reviewed by real GPs.",
  operatingHours: {
    medCerts: "24/7",
    rxConsults: "8am – 10pm AEST",
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
  "A doctor, without the waiting room.",
  "Skip the waiting room, not the doctor.",
  "AHPRA-registered doctors. Reviewed, not automated.",
  "Fill in a form. A doctor reviews it. Done.",
  "Real GP review, without leaving the couch.",
]

export const trustSignals = [
  {
    icon: "Clock",
    text: "Most reviewed within 1–2 hours",
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
    description: "Get a valid certificate for work, uni, or carer's leave, without leaving bed",
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
    title: "Repeat Medication",
    shortTitle: "Medication",
    benefitQuestion: "Need your regular medication?",
    description: "Get your regular medication sorted without the hassle",
    icon: "Pill",
    color: "cyan",
    priceFrom: 29.95,
    href: "/request?service=prescription",
    popular: false,
    cta: "Renew medication",
    benefits: [
      "Works with any chemist",
      "Repeats included where appropriate",
      "Sent to your phone via SMS"
    ],
    testimonial: {
      quote: "Script on my phone in 30 minutes. Took it to the chemist that afternoon.",
      author: "David, Melbourne"
    },
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
    testimonial: {
      quote: "Spoke to a doctor within the hour. Got a referral sorted without leaving work.",
      author: "Tom, Adelaide"
    },
  },
  {
    id: "ed",
    slug: "erectile-dysfunction",
    title: "ED Treatment",
    shortTitle: "ED",
    benefitQuestion: "Need discreet ED treatment?",
    description: "Prescription ED treatment reviewed by an Australian doctor. No call, no waiting room.",
    icon: "Lightning",
    color: "blue",
    priceFrom: 49.95,
    href: "/erectile-dysfunction",
    popular: false,
    cta: "Start assessment",
    benefits: [
      "No call needed - doctor reviews your form",
      "Discreet packaging, sent to any pharmacy",
      "Only pay if doctor approves",
    ],
    testimonial: {
      quote: "Discreet and straightforward. No awkward conversation, just results.",
      author: "James, Brisbane"
    },
  },
  {
    id: "hair-loss",
    slug: "hair-loss",
    title: "Hair Loss Treatment",
    shortTitle: "Hair Loss",
    benefitQuestion: "Noticed your hairline changing?",
    description: "Doctor-led assessment for hair loss treatment. Discreet, no call required.",
    icon: "Sparkles",
    color: "violet",
    priceFrom: 49.95,
    href: "/hair-loss",
    popular: false,
    cta: "Start assessment",
    benefits: [
      "Evidence-based treatments",
      "No waiting room, no call needed",
      "eScript sent straight to your phone",
    ],
    testimonial: {
      quote: "Wish I'd done this sooner. Easy process and the treatment is working.",
      author: "Mark, Perth"
    },
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
    priceFrom: 59.95,
    href: "/womens-health",
    popular: false,
    comingSoon: true,
    cta: "Notify me",
    benefits: [
      "Contraception and hormonal health",
      "Doctor-reviewed, no call needed",
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
    priceFrom: 89.95,
    href: "/weight-loss",
    popular: false,
    comingSoon: true,
    cta: "Notify me",
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
    description: "Feeling too sick to visit a GP? Get a valid, employer-accepted certificate from an AHPRA-registered doctor, without leaving bed.",
    priceFrom: 19.95,
    href: "/request?service=med-cert",
    features: ["Sick leave", "Carer's leave", "Uni extensions", "Same-day delivery"],
  },
  {
    title: "Repeat Medication",
    description: "Running low on your regular medication? A doctor reviews your request and sends to your phone. Any pharmacy, Australia-wide.",
    priceFrom: 29.95,
    href: "/request?service=prescription",
    features: ["Contraception", "Blood pressure", "Skin treatments", "Sent to your phone"],
  },
  {
    title: "ED Treatment",
    description: "Discreet doctor-led assessment for ED. Our doctors review your form and issue treatment if appropriate. No call required, no waiting room.",
    priceFrom: 49.95,
    href: "/erectile-dysfunction",
    features: ["No call needed", "Discreet packaging", "Any Australian pharmacy", "Doctor-reviewed"],
  },
  {
    title: "Hair Loss Treatment",
    description: "Doctor-led hair loss assessment and treatment plan. Evidence-based options, reviewed by an Australian doctor, sent straight to your phone.",
    priceFrom: 49.95,
    href: "/hair-loss",
    features: ["Oral and topical options", "Doctor-reviewed", "eScript delivered", "No call required"],
  },
  {
    title: "Women's Health",
    description: "Contraception, UTIs, and hormonal health. Reviewed by an Australian doctor, no waiting room required.",
    priceFrom: 59.95,
    href: "/womens-health",
    comingSoon: true,
    features: ["Contraception", "UTI treatment", "Hormonal health", "Doctor-reviewed"],
  },
  {
    title: "Weight Loss",
    description: "Doctor-led weight loss assessment with evidence-based treatment options. Ongoing support available.",
    priceFrom: 89.95,
    href: "/weight-loss",
    comingSoon: true,
    features: ["Evidence-based plans", "Doctor-reviewed", "Ongoing support", "No call required"],
  },
]

export const faqItems = [
  {
    question: "How is this different from seeing a doctor in person?",
    answer: "Every request is reviewed by a real Australian doctor, registered with AHPRA and actively practicing. No AI, no chatbot. Telehealth has been legal and regulated in Australia for years. The difference? No waiting rooms, no appointments, no phone tag.",
  },
  {
    question: "What if the doctor says no?",
    answer: "Full refund, no questions. We'd rather be upfront than take your money for something we can't help with.",
  },
  {
    question: "How fast is it really?",
    answer: "Medical certificates are typically issued in under 20 minutes, available 24/7. Prescriptions and consultations are reviewed within 1–2 hours during operating hours. You'll get email updates as things progress, so you're not left wondering.",
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
    question: "What services does InstantMed offer?",
    answer: "Medical certificates for sick leave, carer's leave, and uni extensions. Repeat prescriptions for your regular medication. Discreet doctor-reviewed treatment for ED and hair loss. No call required. All requests reviewed by an AHPRA-registered Australian doctor.",
  },
  {
    question: "Is there a subscription or ongoing fees?",
    answer: "No subscriptions, no membership fees, no hidden charges. You pay a flat fee per request. If your request is declined, you get a full refund. That's it.",
  },
  {
    question: "Does Medicare cover InstantMed?",
    answer: "Not currently. InstantMed is a private telehealth service, so there's no Medicare rebate. The upside: no Medicare card required for medical certificates, no bulk-billing lottery, and no 45-minute wait for a 6-minute appointment.",
  },
  {
    question: "How do prescriptions work?",
    answer: "A doctor reviews your request and, if clinically appropriate, sends an electronic prescription (eScript) directly to your phone via SMS. Take it to any pharmacy in Australia. No paper scripts, no waiting for a callback.",
  },
  {
    question: "Are you available on weekends and after hours?",
    answer: "Yes. We're open 8am to 10pm AEST, seven days a week, including weekends and public holidays. Because getting sick doesn't wait for Monday.",
  },
  {
    question: "Who are the doctors?",
    answer: "Every request is reviewed by an AHPRA-registered Australian GP, qualified, experienced, and actively practising. We don't use overseas doctors, nurse practitioners, or AI to make clinical decisions. A real doctor reviews every single request.",
  },
  {
    question: "Does my employer see my diagnosis?",
    answer: "No. Your medical certificate states the dates you're unfit for work, not why. Your employer doesn't see your diagnosis, your symptoms, or anything you told the doctor. Your health information is encrypted and stays between you and your treating doctor.",
  },
]

export const footerLinks = {
  services: [
    { label: "Medical Certificates", href: "/medical-certificate" },
    { label: "Repeat Prescriptions", href: "/prescriptions" },
    { label: "General Consult", href: "/consult" },
    { label: "ED Treatment", href: "/erectile-dysfunction" },
    { label: "Hair Loss Treatment", href: "/hair-loss" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Pricing", href: "/pricing" },
    { label: "Reviews", href: "/reviews" },
    { label: "Health Guides", href: "/blog" },
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
