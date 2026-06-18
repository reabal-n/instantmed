import { PRICING_DISPLAY } from "@/lib/constants"

export const HAIR_LOSS_FAQ = [
  {
    question: "What does the doctor assess?",
    answer:
      "The doctor reviews your hair-loss pattern, timing, photos where needed, medical history, and current medications before deciding what next step is clinically appropriate.",
  },
  {
    question: "How long does hair loss review take?",
    answer:
      "Requests can be submitted any time. A doctor reviews when available, and you'll receive email updates as your request progresses.",
  },
  {
    question: "What if online care is not suitable?",
    answer:
      "The doctor will explain why and may recommend doctor review, pathology, or specialist care. If InstantMed cannot help, your consultation fee is refunded.",
  },
  {
    question: "Do I need a doctor consultation?",
    answer:
      "Yes. The assessment is reviewed by an Australian doctor, who decides what is clinically appropriate based on your pattern, medical history, and suitability.",
  },
  {
    question: "Is the service really discreet?",
    answer:
      "Completely. The assessment starts with a private clinical form. The doctor may call briefly before deciding if a safety detail needs clarification. Your pharmacy receives only the prescription, not your consultation details. Your bank statement shows 'InstantMed' only.",
  },
  {
    question: "Can women use these treatments?",
    answer:
      "Women can submit an assessment, but suitability depends on the cause of hair loss, pregnancy or breastfeeding status, and medical history. Please include relevant details so the doctor can recommend a safe next step.",
  },
  {
    question: "How fast will I hear back?",
    answer:
      "Requests can be submitted any time. A doctor reviews when available, and you'll receive email updates as your request progresses.",
  },
  {
    question: "How much does it cost?",
    answer: `Our flat fee is ${PRICING_DISPLAY.HAIR_LOSS} for the doctor consultation. Pharmacy costs, if relevant, are separate. There are no subscriptions or ongoing fees required.`,
  },
] as const
