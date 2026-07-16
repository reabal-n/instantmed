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
    question: "Can I get repeats?",
    answer:
      "Yes. Where clinically appropriate, the doctor will include repeats on your prescription. The number of repeats depends on the medication and your situation.",
  },
] as const

/** Short decision-support subset for the commercial landing page. */
export const PRESCRIPTION_LANDING_FAQ = [
  PRESCRIPTION_FAQ[1],
  PRESCRIPTION_FAQ[4],
  PRESCRIPTION_FAQ[6],
] as const
