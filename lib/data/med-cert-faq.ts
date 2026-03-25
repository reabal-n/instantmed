/**
 * Single source of truth for medical certificate FAQ data.
 * Used by both the landing page accordion and the structured data schema.
 */
export const MED_CERT_FAQ = [
  {
    question: "Will my employer accept this?",
    answer:
      "Yes. Our certificates are issued by AHPRA-registered doctors and are legally valid for all employers. Same as what you\u2019d get from a clinic.",
  },
  {
    question: "Can I use this for uni or TAFE?",
    answer:
      'Absolutely. We issue certificates for university, TAFE, and other educational institutions. Just select "study" when you start your request.',
  },
  {
    question: "What happens after I submit?",
    answer:
      "Most requests are reviewed within 30\u201360 minutes during business hours (8am\u201310pm AEST). If the doctor needs more information, they\u2019ll message you through our secure platform. In rare cases, a quick phone call may be needed.",
  },
  {
    question: "Can I get a certificate backdated?",
    answer:
      "Certificates can cover absences up to 48 hours ago if clinically appropriate. Just indicate the dates you were unwell when completing the form.",
  },
  {
    question: "What if the doctor can\u2019t help?",
    answer:
      "If your request isn\u2019t suitable for online assessment \u2014 for example, a workplace injury claim or something requiring physical examination \u2014 we\u2019ll refund your payment and explain why.",
  },
  {
    question: "How do I receive my certificate?",
    answer:
      "Once approved, your certificate is available as a secure PDF in your dashboard. You\u2019ll get an email notification the moment it\u2019s ready.",
  },
  {
    question: "Is this suitable for WorkCover or legal matters?",
    answer:
      "No. Workplace injury claims (WorkCover) or certificates for legal proceedings require an in-person assessment. This service covers standard sick leave, carer\u2019s leave, and study absences.",
  },
] as const
