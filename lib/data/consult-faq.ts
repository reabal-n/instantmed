import type { FAQItem } from "@/types/faq"

/**
 * Single source of truth for specialty consult FAQ data.
 * Used by both the landing page accordion and the structured data schema.
 */
export const CONSULT_FAQ: readonly FAQItem[] = [
  {
    question: "Will the doctor call me?",
    answer:
      "The doctor reviews your questionnaire first, then calls or messages only when clinically needed. Keep your phone nearby after submitting.",
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
      "You get the same quality of care from an AHPRA-registered doctor, just without the waiting room. The main limitation is the doctor can't physically examine you, so some conditions may still need an in-person visit.",
  },
  {
    question: "What if my issue needs in-person care?",
    answer:
      "If the doctor determines your concern requires a physical examination, they'll let you know and recommend seeing a GP in person. You'll receive a full refund.",
  },
  {
    question: "What can I consult about?",
    answer:
      "InstantMed currently accepts structured ED and hair-loss assessment pathways. Broad new-health-concern consult requests are retired publicly until launch readiness changes.",
  },
  {
    question: "How long does the consultation take?",
    answer:
      "Review timing depends on doctor availability, queue volume, and clinical complexity. The doctor may call or message if important information is missing.",
  },
]
