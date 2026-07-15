import { ABN, COMPANY_ADDRESS, COMPANY_NAME, CONTACT_EMAIL, CONTACT_PHONE, PRICING_DISPLAY } from "@/lib/constants"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { GUARANTEE } from "@/lib/marketing/voice"
import {
  type CanonicalServiceId,
  getService,
  getServiceMarketingHref,
  getServiceRequestHref,
  type ServiceDef,
} from "@/lib/services/service-catalog"

// Homepage Marketing Data
// All content centralized for easy updates

const AVAILABILITY_24_7 = getApprovedClaim("availability_24_7")
const CLINICAL_ACCESS_SCOPE = getApprovedClaim("clinical_access_scope")
const CLINICAL_DECISION_MODEL = getApprovedClaim("clinical_decision_model")
const CLINICAL_REVIEW_SEQUENCE = getApprovedClaim("clinical_review_sequence")

export const siteConfig = {
  name: "InstantMed",
  tagline: "Focused online requests with doctor-owned clinical pathways.",
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
  "AHPRA-registered doctors. Human clinical accountability.",
  "Fill in a form. The clinical pathway takes it from there.",
  "Doctor-owned care, without leaving the couch.",
]

export const trustSignals = [
  {
    icon: "Clock",
    text: "Submit requests 24/7",
    description: AVAILABILITY_24_7,
  },
  {
    icon: "Clock",
    text: "Review operates 24/7",
    description: "Timing varies by complexity, follow-up, and queue volume",
  },
  {
    icon: "Shield",
    text: "AHPRA registered drs",
    description: CLINICAL_DECISION_MODEL,
  },
  {
    icon: "Lock",
    text: "Private and secure",
    description: CLINICAL_ACCESS_SCOPE,
  },
]

const HOMEPAGE_SERVICE_ORDER: CanonicalServiceId[] = [
  "med-cert",
  "repeat-rx",
  "ed",
  "hair-loss",
  "womens-health",
  "weight-loss",
]

const HOMEPAGE_SERVICE_TITLES: Record<CanonicalServiceId, string> = {
  "med-cert": "Medical Certificates",
  "repeat-rx": "Repeat Medication",
  ed: "ED Assessment",
  "hair-loss": "Hair Loss Assessment",
  "womens-health": "Women's Health",
  "weight-loss": "Weight Loss",
}

function getHomepageServiceHref(service: ServiceDef): string {
  if (service.id === "med-cert" || service.id === "repeat-rx") {
    return getServiceRequestHref(service)
  }

  return getServiceMarketingHref(service)
}

export const proofMetrics = [
  {
    label: "Review timing",
    value: "Fast doctor review",
    icon: "Zap",
  },
  {
    label: "Clinical ownership",
    value: "Doctor-owned pathways",
    icon: "MessageSquare",
  },
  {
    label: "No account needed",
    value: "Start in about 3 mins",
    icon: "CheckCircle",
  },
  {
    label: "Flat pricing",
    value: GUARANTEE,
    icon: "CreditCard",
  },
]

export const howItWorks = [
  {
    step: 1,
    title: "Answer a few questions",
    description: "Tell us what's going on. Takes about 3 minutes.",
    icon: "ClipboardList",
  },
  {
    step: 2,
    title: "Your request follows its clinical pathway",
    description: CLINICAL_REVIEW_SEQUENCE,
    icon: "Stethoscope",
  },
  {
    step: 3,
    title: "Done",
    description: "Certificate to your inbox, medication to your phone. That's it.",
    icon: "FileCheck",
  },
]

type FeaturedServiceCopy = {
  description: string
  features: string[]
}

const FEATURED_SERVICE_COPY: Record<CanonicalServiceId, FeaturedServiceCopy> = {
  "med-cert": {
    description: "Feeling too sick to visit a GP? Get a valid, employer-ready certificate from an AHPRA-registered doctor, without leaving bed.",
    features: ["Sick leave", "Carer's leave", "Uni extensions", "Same-day delivery"],
  },
  "repeat-rx": {
    description: "Running low on your regular medication? A doctor reviews your request and sends to your phone. Any pharmacy, Australia-wide.",
    features: ["Contraception", "Blood pressure", "Skin treatments", "Sent to your phone"],
  },
  ed: {
    description: "Discreet doctor-led assessment for ED. A doctor reviews your form and prescribes only if clinically appropriate. No waiting room.",
    features: ["Form-first review", "Private assessment", "Any Australian pharmacy", "Doctor-reviewed"],
  },
  "hair-loss": {
    description: "Doctor-led hair loss assessment. Private form-first review, with next steps decided after clinical assessment.",
    features: ["Doctor-assessed options", "Doctor-reviewed", "eScript if approved", "No waiting room"],
  },
  "womens-health": {
    description: "UTI care and contraceptive pill requests. Reviewed by an Australian doctor, no waiting room required.",
    features: ["UTI treatment", "Contraceptive pill", "Safety screening", "Doctor-reviewed"],
  },
  "weight-loss": {
    description: "Doctor-led weight loss assessment with evidence-based treatment options. Ongoing support available.",
    features: ["Manual review", "Doctor-reviewed", "Safety screening", "No waiting room"],
  },
}

export const featuredServices = HOMEPAGE_SERVICE_ORDER.map((id) => {
  const service = getService(id)
  const copy = FEATURED_SERVICE_COPY[id]

  return {
    title: HOMEPAGE_SERVICE_TITLES[id],
    description: copy.description,
    priceFrom: service.comingSoon ? undefined : service.priceFrom,
    href: getHomepageServiceHref(service),
    comingSoon: service.comingSoon,
    features: copy.features,
  }
})

export const faqItems = [
  {
    question: "What if the doctor says no?",
    answer: `${GUARANTEE} We'd rather be upfront than charge for something outside online care scope.`,
  },
  {
    question: "How fast is it really?",
    answer: "Requests can be submitted and reviewed 24/7. Timing varies with clinical complexity, follow-up questions, and queue volume. You'll get email updates as things progress, so you're not left wondering.",
  },
  {
    question: "Is my information private?",
    answer: "Completely. Your health info is encrypted and only seen by the treating doctor. We don't share anything with employers, insurers, or anyone else. Ever.",
  },
  {
    question: "How much does it cost compared to a GP?",
    answer: `Medical certificates start from ${PRICING_DISPLAY.MED_CERT}, repeat medication from ${PRICING_DISPLAY.REPEAT_SCRIPT}, and consults from ${PRICING_DISPLAY.CONSULT}. A typical GP visit costs $60–120 before Medicare, plus the travel and wait. No Medicare rebate, but you'll likely still save, and definitely save time.`,
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
    { label: "ED Assessment", href: "/erectile-dysfunction" },
    { label: "Hair Loss Assessment", href: "/hair-loss" },
    { label: "Women's Health", href: "/womens-health" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "For Business", href: "/business" },
    { label: "Pricing", href: "/pricing" },
    { label: "Health Guides", href: "/blog" },
    { label: "Your Options", href: "/alternatives" },
    { label: "What we won't do", href: "/what-we-wont-do" },
    { label: "Why we're faster", href: "/why-instant" },
    { label: "Contact", href: "/contact" },
  ],
  // Indexed location pages, surfaced in the footer so the homepage + every
  // money page passes crawl demand to them. These were orphaned (no internal
  // links from any indexed surface), which starved them of crawl budget.
  // Keep this list in sync with KEEP_INDEXED_LOCATIONS in lib/seo/index-policy.ts
  // (only link cities we actually want indexed).
  locations: [
    { label: "Sydney", href: "/locations/sydney" },
    { label: "Melbourne", href: "/locations/melbourne" },
    { label: "Brisbane", href: "/locations/brisbane" },
    { label: "Perth", href: "/locations/perth" },
    { label: "Adelaide", href: "/locations/adelaide" },
    { label: "Canberra", href: "/locations/canberra" },
    { label: "Newcastle", href: "/locations/newcastle" },
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
  refundNote: GUARANTEE,
}
