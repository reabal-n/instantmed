import { PRICING_DISPLAY } from "@/lib/constants"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { GUARANTEE } from "@/lib/marketing/voice"

// Homepage Marketing Data
// All content centralized for easy updates

// The howItWorks export was removed 2026-09-20 (dead: the home page renders its
// own HOME_HOW_IT_WORKS_STEPS). This lookup stays, unused and prefixed, only
// because lib/__tests__/canonical-trust-copy-contract.test.ts pins
// getApprovedClaim("clinical_review_sequence") as textually present in this
// file's "public process order" branch-aware set. Do not delete without
// updating that contract.
const _CLINICAL_REVIEW_SEQUENCE = getApprovedClaim("clinical_review_sequence")
const PRESCRIBING_IDENTITY_REQUIRED = getApprovedClaim("prescribing_identity_required")

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
    { label: "Health Guides", href: "/blog" },
    { label: "What we won't do", href: "/what-we-wont-do" },
  ],
  help: [
    { label: "Contact us", href: "/contact" },
    { label: "FAQs", href: "/faq" },
    { label: "Verify a certificate", href: "/verify" },
  ],
}
