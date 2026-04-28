/**
 * Single source of truth for medical certificate FAQ data.
 * Used by both the landing page accordion and the structured data schema.
 */
export const MED_CERT_FAQ = [
  {
    question: "How much does it cost?",
    answer:
      "$19.95 for a 1-day certificate, $29.95 for 2 days, and $39.95 for 3 days. One flat fee, no hidden costs, no Medicare card needed. If we can't help, you get a full refund.",
  },
  {
    question: "Will my employer accept this?",
    answer:
      "Our certificates are issued by AHPRA-registered doctors and include standard workplace evidence details. Employer policies may vary.",
  },
  {
    question: "Can I use this for uni or TAFE?",
    answer:
      'Absolutely. We issue certificates for university, TAFE, and other educational institutions. Just select "study" when you start your request.',
  },
  {
    question: "What happens after I submit?",
    answer:
      "Medical certificates are available 24/7 and typically reviewed within 30 minutes. If the doctor needs more information, they\u2019ll message you through our secure platform. In rare cases, a quick phone call may be needed.",
  },
  {
    question: "Can I get a certificate backdated?",
    answer:
      "Certificates can cover absences up to 48 hours ago if clinically appropriate. Just indicate the dates you were unwell when completing the form.",
  },
  {
    question: "What if the doctor can\u2019t help?",
    answer:
      "If your request isn\u2019t suitable for online assessment - for example, a workplace injury claim or something requiring physical examination - we\u2019ll refund your payment and explain why.",
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
  {
    question: "How long is a medical certificate valid?",
    answer:
      "A medical certificate is valid for the specific dates listed on it. Most of our certificates cover 1\u20133 days. For longer absences, the doctor may recommend an in-person GP visit for ongoing assessment.",
  },
  {
    question: "Can I get a medical certificate for a mental health day?",
    answer:
      "Yes. Mental health is a valid reason for a medical certificate under Australian employment law. The certificate will state you were unfit for duties - it won\u2019t disclose your specific condition to your employer.",
  },
  {
    question: "Do I need a Medicare card?",
    answer:
      "No. InstantMed is a private service with flat-fee pricing. You don\u2019t need a Medicare card, a referral, or an existing GP relationship. International students and visitors can use the service too.",
  },
  {
    question: "Is a telehealth medical certificate legal?",
    answer:
      "Yes. The Fair Work Act refers to evidence from registered health practitioners and does not require an in-person consultation. Employer and institution policies may vary.",
  },
  {
    question: "What if I need more than 3 days off?",
    answer:
      "We can issue certificates for up to 3 days in most cases. For longer absences, we may recommend an in-person GP assessment to ensure you get the right ongoing care. If we can\u2019t help, you won\u2019t be charged.",
  },
  {
    question: "Can my employer reject this certificate?",
    answer:
      "Employers can assess certificates under their workplace evidence policy. Our certificates include AHPRA doctor details, dates of unfitness, and verification details to support that review.",
  },
  {
    question: "How is my information protected?",
    answer:
      "All data is encrypted in transit and at rest using AES-256 encryption. We comply with the Australian Privacy Principles (APPs) and never share your health information with employers or third parties. See our privacy policy for details.",
  },
] as const
