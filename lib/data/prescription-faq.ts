import { getApprovedClaim } from "@/lib/marketing/approved-claims"

/**
 * Single source of truth for prescription FAQ data.
 * Used by both the landing page accordion and the structured data schema.
 */
const PRESCRIPTION_FAQ = [
  {
    question: "What can the doctor review?",
    answer:
      "The doctor can review common repeat medicine requests for stable, ongoing care. We do not handle controlled, dependence-forming, emergency, or complex monitoring requests through this pathway.",
  },
  {
    question: "Is the eScript accepted at any pharmacy?",
    answer:
      "Yes. eScripts are the national standard in Australia. Take your phone to any pharmacy and they'll scan it directly. No paper needed.",
  },
  {
    question: "Do I need a previous prescription?",
    answer:
      "Yes. This pathway is for medications you've already been prescribed. If you need a new medicine, see your regular GP unless your request matches one of our active specialty pathways.",
  },
  {
    question: "Why do you need my Medicare details?",
    answer:
      "Prescribing has stricter identity requirements than a medical certificate. Your Medicare details, date of birth, and contact details let the doctor confirm exactly who they are prescribing for, and let the eScript be issued correctly so an Australian pharmacy can dispense it. Medical certificates do not require Medicare, but every prescription request does.",
  },
  {
    question: "Will my PBS subsidies still apply?",
    answer:
      "Yes. If your medication is listed on the PBS, you'll pay the subsidised price at the pharmacy as usual. Our consultation fee is separate from your medication cost.",
  },
  {
    question: "What if the doctor can't prescribe my medication?",
    answer:
      "If your request isn't suitable for online prescribing, such as when monitoring or in-person care is needed, we'll explain why and refund your payment in full.",
  },
  {
    question: "How do I receive the eScript?",
    answer:
      "Once the doctor approves your request, an eScript token is sent via SMS to your phone number. You can present it at any pharmacy to collect your medication.",
  },
  {
    question: "How long does the review take?",
    answer:
      `${getApprovedClaim("availability_24_7")} If the doctor needs more information or a brief call before deciding, you will be contacted on the details in your request.`,
  },
  {
    question: "Can I get repeats?",
    answer:
      "Yes. Where clinically appropriate, the doctor will include repeats on your prescription. The number of repeats depends on the medication and your situation.",
  },
] as const

/**
 * The landing page and its FAQPage schema render the full set (2026-08-25,
 * free-channel plan item 2): answer-density is the mechanism behind the
 * ChatGPT-cited med-cert page, and these are the recurring service-level
 * questions. The accordion keeps the compressed look via a small initialCount.
 */
export const PRESCRIPTION_LANDING_FAQ = PRESCRIPTION_FAQ
