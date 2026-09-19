import { PRICING_DISPLAY } from "@/lib/constants"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { GUARANTEE } from "@/lib/marketing/voice"
import { BRANDED_SEARCH_LINKS } from "@/lib/seo/branded-search-links"

// Homepage Marketing Data
// All content centralized for easy updates

const CLINICAL_REVIEW_SEQUENCE = getApprovedClaim("clinical_review_sequence")
const PRESCRIBING_IDENTITY_REQUIRED = getApprovedClaim("prescribing_identity_required")

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
    answer: `Not currently. InstantMed is a private telehealth service, so there's no Medicare rebate. Medical certificates do not require a Medicare card. ${PRESCRIBING_IDENTITY_REQUIRED}`,
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
    { label: "Weight Management", href: "/weight-loss" },
  ],
  company: [
    { label: "About InstantMed", href: "/about" },
    { label: "For Business", href: "/business" },
    { label: "Health Guides", href: "/blog" },
    { label: "Your Options", href: "/alternatives" },
    { label: "What we won't do", href: "/what-we-wont-do" },
    { label: "Why we're faster", href: "/why-instant" },
  ],
  help: [
    ...BRANDED_SEARCH_LINKS.slice(2),
    { label: "All locations", href: "/locations" },
  ],
}
