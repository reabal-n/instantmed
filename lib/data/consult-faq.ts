import type { FAQItem } from "@/types/faq"

/**
 * Single source of truth for general consult FAQ data.
 * Used by both the landing page accordion and the structured data schema.
 */
export const CONSULT_FAQ: readonly FAQItem[] = [
  {
    question: "Will the doctor call me?",
    answer:
      "For most general consults, yes. The doctor will review your questionnaire first, then call to discuss your symptoms. Keep your phone nearby after submitting.",
  },
  {
    question: "Can I get a prescription from a consult?",
    answer:
      "Yes. If the doctor determines medication is clinically appropriate, they'll send an eScript to your phone. You can collect it at any pharmacy.",
  },
  {
    question: "What about referrals and pathology?",
    answer:
      "The doctor can provide referral letters and pathology requests if they believe further investigation is needed. These are included in your consultation fee.",
  },
  {
    question: "How is this different from a GP visit?",
    answer:
      "You get the same quality of care from an AHPRA-registered GP, just without the waiting room. The main limitation is the doctor can't physically examine you, so some conditions may still need an in-person visit.",
  },
  {
    question: "What if my issue needs in-person care?",
    answer:
      "If the doctor determines your concern requires a physical examination, they'll let you know and recommend seeing a GP in person. You'll receive a full refund.",
  },
  {
    question: "What can I consult about?",
    answer:
      "Most non-urgent health concerns including skin conditions, minor infections, cold/flu symptoms, allergies, mental health check-ins, and requests for new medications or treatment advice.",
  },
  {
    question: "How long does the consultation take?",
    answer:
      "Most consults are completed within 2 hours of submission. The doctor may call for 5-15 minutes depending on the complexity of your concern.",
  },
]
