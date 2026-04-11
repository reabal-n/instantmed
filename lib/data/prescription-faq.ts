/**
 * Single source of truth for prescription FAQ data.
 * Used by both the landing page accordion and the structured data schema.
 */
export const PRESCRIPTION_FAQ = [
  {
    question: "What medications can you prescribe?",
    answer:
      "We can prescribe most common repeat medications including blood pressure, cholesterol, contraceptives, asthma inhalers, reflux, thyroid, and more. We cannot prescribe Schedule 8 medications (opioids, stimulants) or benzodiazepines.",
  },
  {
    question: "Is the eScript accepted at any pharmacy?",
    answer:
      "Yes. eScripts are the national standard in Australia. Take your phone to any pharmacy and they'll scan it directly. No paper needed.",
  },
  {
    question: "Do I need a previous prescription?",
    answer:
      "This service is for medications you've already been prescribed. If you need a new medication, our general consult service is more appropriate.",
  },
  {
    question: "Will my PBS subsidies still apply?",
    answer:
      "Yes. If your medication is listed on the PBS, you'll pay the subsidised price at the pharmacy as usual. Our consultation fee is separate from your medication cost.",
  },
  {
    question: "What if the doctor can't prescribe my medication?",
    answer:
      "If your medication isn't suitable for online prescribing (e.g. you need blood tests first), we'll explain why and refund your payment in full.",
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
