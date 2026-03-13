/**
 * Medical certificate intent landing page config
 * SEO/acquisition pages for specific search intents — all route to /request?service=med-cert
 */

export const MED_CERT_INTENT_SLUGS = [
  "work",
  "study",
  "carer",
  "sick-leave",
  "university",
  "school",
  "return-to-work",
] as const

export type MedCertIntentSlug = (typeof MED_CERT_INTENT_SLUGS)[number]

export interface MedCertIntentConfig {
  slug: MedCertIntentSlug
  h1: string
  heroSubheadline: string
  /** Use-case specific explainer section */
  explainerTitle: string
  explainerSubtitle: string
  explainerParagraphs: string[]
  /** Recognition/validity section — who accepts this */
  recognitionTitle: string
  recognitionSubtitle: string
  recognitionBadges: Array<{ label: string; sub: string }>
  /** CTA banner copy */
  ctaTitle: string
  ctaSubtitle: string
  ctaButtonText: string
  /** SEO metadata */
  metadata: {
    title: string
    description: string
    keywords: string[]
  }
  /** FAQ items for schema and accordion */
  faqs: Array<{ question: string; answer: string }>
}

export const medCertIntentConfigs: Record<MedCertIntentSlug, MedCertIntentConfig> = {
  work: {
    slug: "work",
    h1: "Medical certificate for work.",
    heroSubheadline:
      "Your employer asked for a sick note. A real Australian doctor reviews your request — no appointments, no waiting rooms. Most sorted in under an hour. From $19.95.",
    explainerTitle: "When you might need one",
    explainerSubtitle: "Work certificates cover most short-term absences. Here's what to know.",
    explainerParagraphs: [
      "If you've called in sick, your employer may ask for documentation. Our certificates are issued by AHPRA-registered doctors and meet Fair Work Act requirements — the same as what you'd get from a clinic.",
      "You fill in a quick form describing your situation. A doctor reviews it and decides whether a certificate is appropriate. If approved, it lands in your inbox as a PDF. No phone call required in most cases.",
    ],
    recognitionTitle: "Fair Work compliant",
    recognitionSubtitle:
      "Certificates meet Fair Work Act requirements and are legally equivalent to those issued by in-person GPs. Some employers may have their own documentation requirements — check with yours.",
    recognitionBadges: [
      { label: "Fair Work compliant", sub: "Legally valid" },
      { label: "Large & small businesses", sub: "Commonly accepted" },
      { label: "Full-time & casual", sub: "All employment types" },
    ],
    ctaTitle: "Ready when you are",
    ctaSubtitle:
      "Two minutes to complete the form. Real doctor review. Certificate to your inbox.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: "Medical Certificate for Work | Sick Note Online $19.95",
      description:
        "Medical certificate for work absence. AHPRA-registered doctors review your request — most sorted in under an hour. From $19.95. Fair Work compliant.",
      keywords: [
        "medical certificate for work",
        "sick certificate work",
        "sick note online",
        "work medical certificate australia",
        "sick leave certificate",
      ],
    },
    faqs: [
      {
        question: "When do employers require a medical certificate?",
        answer:
          "Many employers ask for a certificate when you've taken sick leave, especially for absences of more than a day or two. Their policy will specify when documentation is needed.",
      },
      {
        question: "Will my employer accept an online medical certificate?",
        answer:
          "Our certificates are issued by AHPRA-registered Australian doctors and include the usual details: doctor's name, provider number, dates of illness, and signature. They meet Fair Work Act requirements. Some employers may have their own policies — check with yours.",
      },
      {
        question: "How quickly will I receive it?",
        answer:
          "Most requests are reviewed within 30–60 minutes during operating hours (8am–10pm AEST, 7 days). You'll get an email when the doctor starts reviewing.",
      },
      {
        question: "Can I get a certificate for a day I've already missed?",
        answer:
          "Yes. We can issue certificates for absences up to 48 hours ago if clinically appropriate. Just indicate the dates you were unwell when completing the questionnaire.",
      },
      {
        question: "How long can a certificate cover?",
        answer:
          "Most work certificates cover 1–3 days for acute illness. The doctor determines the appropriate duration based on your symptoms. Longer periods may require a new request.",
      },
    ],
  },

  study: {
    slug: "study",
    h1: "Medical certificate for study.",
    heroSubheadline:
      "Extensions, deferred exams, or special consideration. A doctor reviews your request — typically sorted in under an hour. From $19.95.",
    explainerTitle: "When students need documentation",
    explainerSubtitle: "Universities and TAFEs often require medical evidence for special consideration.",
    explainerParagraphs: [
      "If illness or caring responsibilities have affected your studies, you may need a medical certificate to support an application for extensions, deferred exams, or special consideration. Our certificates are issued by AHPRA-registered doctors and include the details most institutions need.",
      "Policies vary by institution — some specify exactly what they require. Check yours before applying. You fill in a quick form, a doctor reviews it, and if appropriate, your certificate lands in your inbox.",
    ],
    recognitionTitle: "Commonly accepted by education providers",
    recognitionSubtitle:
      "Certificates are commonly accepted for special consideration, extensions, and deferred assessments. Institutional policies vary — check yours before applying.",
    recognitionBadges: [
      { label: "Universities", sub: "Go8, ATN, IRU & more" },
      { label: "TAFE & RTOs", sub: "Vocational education" },
      { label: "Private providers", sub: "Check policy first" },
    ],
    ctaTitle: "Get the documentation you need",
    ctaSubtitle:
      "Quick form, real doctor review. Certificate to your inbox — usually within the hour.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: "Medical Certificate for Study | Uni & TAFE $19.95",
      description:
        "Medical certificate for special consideration, extensions, or deferred exams. AHPRA-registered doctors review your request. From $19.95. Commonly accepted by Australian universities and TAFEs.",
      keywords: [
        "medical certificate for study",
        "uni medical certificate",
        "special consideration certificate",
        "deferred exam medical certificate",
        "tafe medical certificate",
      ],
    },
    faqs: [
      {
        question: "Will my university or TAFE accept this?",
        answer:
          "Our certificates are issued by AHPRA-registered doctors and are commonly accepted by Australian universities and TAFEs for special consideration, extensions, and deferred exams. Policies vary — check your institution's requirements before applying.",
      },
      {
        question: "Can I use this for an assignment extension?",
        answer:
          "Often yes. Universities typically accept medical certificates as evidence for extension requests. Your institution's policy will specify what they need and any deadlines.",
      },
      {
        question: "What if I need it for a deferred exam?",
        answer:
          "Yes. Many students use our certificates to support deferred exam applications. Include the exam date and relevant context when completing the form. Submit well before your institution's deadline.",
      },
    ],
  },

  carer: {
    slug: "carer",
    h1: "Carer medical certificate.",
    heroSubheadline:
      "Time off to look after a sick family member. A doctor reviews your request — no appointments, typically sorted in under an hour. From $19.95.",
    explainerTitle: "When carers need documentation",
    explainerSubtitle: "Carer's leave certificates support absences when you're looking after someone who needs you.",
    explainerParagraphs: [
      "If you've needed time off to care for a sick family member or dependant, your employer may require documentation. Carer's leave certificates are issued by AHPRA-registered doctors and meet Fair Work Act requirements.",
      "You describe the situation in a quick form. A doctor reviews it and decides whether a certificate is appropriate. Same process as sick leave — just select carer's leave when you start.",
    ],
    recognitionTitle: "Valid for carer's leave",
    recognitionSubtitle:
      "Certificates meet Fair Work Act requirements for carer's leave. Commonly accepted by Australian employers — some may have their own documentation requirements.",
    recognitionBadges: [
      { label: "Fair Work compliant", sub: "Carer's leave" },
      { label: "Family & dependants", sub: "Sick child, elderly parent" },
      { label: "Full-time & casual", sub: "All employment types" },
    ],
    ctaTitle: "Documentation when you need it",
    ctaSubtitle:
      "Two minutes to complete the form. Doctor review. Certificate to your inbox.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: "Carer Medical Certificate | Carer's Leave $19.95",
      description:
        "Medical certificate for carer's leave. Document absences when caring for a sick family member. AHPRA-registered doctors review your request. From $19.95.",
      keywords: [
        "carer medical certificate",
        "carers leave certificate",
        "medical certificate for caring",
        "carer leave sick note",
      ],
    },
    faqs: [
      {
        question: "What is a carer's leave certificate?",
        answer:
          "A medical certificate that documents your need to care for a sick family member or dependant. Employers may require this to approve carer's leave under the Fair Work Act.",
      },
      {
        question: "Who can I get a certificate for?",
        answer:
          "Typically for caring for a sick child, spouse, parent, or other dependant. You'll describe the situation when completing the form — the doctor assesses whether a certificate is appropriate.",
      },
      {
        question: "Will my employer accept it?",
        answer:
          "Our carer's leave certificates are issued by AHPRA-registered doctors and meet Fair Work Act requirements. They're commonly accepted by Australian employers. Some may have their own requirements — check with yours.",
      },
    ],
  },

  "sick-leave": {
    slug: "sick-leave",
    h1: "Sick leave certificate online.",
    heroSubheadline:
      "Too sick to visit a GP? Get a valid certificate from bed. A doctor reviews your request — most sorted in under an hour. From $19.95.",
    explainerTitle: "Sick leave without the waiting room",
    explainerSubtitle: "When you need documentation for time off, but leaving the house isn't an option.",
    explainerParagraphs: [
      "Sometimes the last thing you want to do when you're unwell is drag yourself to a clinic. Our certificates are issued by AHPRA-registered doctors after you complete a quick form — no appointments, no waiting rooms.",
      "You describe your symptoms and how long you need off. A doctor reviews it and makes a clinical decision. If approved, your certificate lands in your inbox as a PDF.",
    ],
    recognitionTitle: "Fair Work compliant",
    recognitionSubtitle:
      "Certificates meet Fair Work Act requirements and are legally equivalent to those from in-person GPs. Some employers may have their own documentation requirements.",
    recognitionBadges: [
      { label: "Fair Work compliant", sub: "Legally valid" },
      { label: "1–3 days", sub: "Acute illness" },
      { label: "Backdating", sub: "If clinically appropriate" },
    ],
    ctaTitle: "From your couch to your inbox",
    ctaSubtitle:
      "Two minutes on your phone. Real doctor review. Certificate delivered — no clinic visit required.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: "Sick Leave Certificate Online | $19.95 Under 1 Hour",
      description:
        "Get a sick leave certificate online. AHPRA-registered doctors review your request — most sorted in under an hour. From $19.95. No appointments, no waiting rooms.",
      keywords: [
        "sick leave certificate online",
        "sick note online australia",
        "online sick certificate",
        "sick leave medical certificate",
      ],
    },
    faqs: [
      {
        question: "How quickly can I get a sick leave certificate?",
        answer:
          "Most requests are reviewed within 30–60 minutes during operating hours (8am–10pm AEST, 7 days). You'll get an email when the doctor starts reviewing.",
      },
      {
        question: "Do I need to see a doctor in person?",
        answer:
          "No. Telehealth medical certificates are legally equivalent to in-person consultations in Australia. Our doctors are AHPRA-registered and make the same clinical assessment.",
      },
      {
        question: "What if I was sick yesterday?",
        answer:
          "We can often issue certificates for absences up to 48 hours ago if clinically appropriate. Be upfront about when your symptoms started.",
      },
    ],
  },

  university: {
    slug: "university",
    h1: "Medical certificate for university.",
    heroSubheadline:
      "Special consideration, extensions, or deferred exams. A doctor reviews your request — typically under an hour. From $19.95.",
    explainerTitle: "When uni requires medical evidence",
    explainerSubtitle: "Universities often need a medical certificate to support special consideration applications.",
    explainerParagraphs: [
      "If illness has affected your ability to complete assignments or sit exams, your university may require a medical certificate. Our certificates are issued by AHPRA-registered doctors and include the standard details: doctor's name, provider number, dates, and attestation of unfitness.",
      "Policies vary by institution — some specify exactly what they need. Check yours before applying. You fill in a quick form, a doctor reviews it, and if appropriate, your certificate lands in your inbox.",
    ],
    recognitionTitle: "Commonly accepted by universities",
    recognitionSubtitle:
      "Commonly accepted for special consideration, extensions, and deferred exams. Institutional policies vary — check yours before applying.",
    recognitionBadges: [
      { label: "Go8 universities", sub: "Group of Eight" },
      { label: "ATN & IRU", sub: "University networks" },
      { label: "Private unis", sub: "Check policy" },
    ],
    ctaTitle: "Get the documentation your uni needs",
    ctaSubtitle:
      "Quick form, real doctor review. Certificate to your inbox — usually within the hour.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: "Medical Certificate for University | Special Consideration $19.95",
      description:
        "Medical certificate for university special consideration, extensions, or deferred exams. AHPRA-registered doctors review your request. From $19.95. Commonly accepted by Australian universities.",
      keywords: [
        "medical certificate for university",
        "uni special consideration certificate",
        "deferred exam medical certificate",
        "university medical certificate australia",
      ],
    },
    faqs: [
      {
        question: "Do universities accept online certificates?",
        answer:
          "Our certificates are issued by AHPRA-registered doctors and are commonly accepted by Australian universities for special consideration. Policies vary — check your institution's requirements before applying.",
      },
      {
        question: "Can I use this for an assignment extension?",
        answer:
          "Often yes. Universities typically accept medical certificates as evidence for extension requests. Your institution's policy will specify what they need and any deadlines.",
      },
      {
        question: "What if I need it for a deferred exam?",
        answer:
          "Yes. Many students use our certificates to support deferred exam applications. Include the exam date and relevant context when completing the form. Submit well before your institution's deadline.",
      },
      {
        question: "How quickly can I get it?",
        answer:
          "Most requests are reviewed within 30–60 minutes during operating hours. Plan ahead for deadlines — we can't guarantee same-day delivery during peak periods.",
      },
    ],
  },

  school: {
    slug: "school",
    h1: "Medical certificate for school.",
    heroSubheadline:
      "Documentation for your child's school absence. A doctor reviews your request — typically sorted in under an hour. From $19.95.",
    explainerTitle: "When schools require medical evidence",
    explainerSubtitle: "Some schools ask for a medical certificate to excuse a child's absence.",
    explainerParagraphs: [
      "If your child has been unwell and missed school, the school may request a medical certificate. Our certificates are issued by AHPRA-registered doctors and document the period of unfitness.",
      "You complete a form describing your child's illness. A doctor reviews it — for children, we may need a brief call to confirm details. The certificate is then sent to your inbox. Some schools have their own documentation requirements — check yours.",
    ],
    recognitionTitle: "Commonly accepted by schools",
    recognitionSubtitle:
      "Certificates are commonly accepted by Australian schools. School attendance policies vary — some may require additional documentation. Check yours before submitting.",
    recognitionBadges: [
      { label: "Primary & secondary", sub: "Public & private" },
      { label: "AHPRA doctors", sub: "Legally valid" },
      { label: "Parent completes form", sub: "On behalf of child" },
    ],
    ctaTitle: "Documentation for school absences",
    ctaSubtitle:
      "Quick form, doctor review. Certificate to your inbox — usually within the hour.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: "Medical Certificate for School | Child Absence $19.95",
      description:
        "Medical certificate for school absence. Document your child's illness for the school. AHPRA-registered doctors review your request. From $19.95.",
      keywords: [
        "medical certificate for school",
        "school absence certificate",
        "child sick certificate",
        "school medical certificate australia",
      ],
    },
    faqs: [
      {
        question: "Can I get a certificate for my child's school absence?",
        answer:
          "Yes. You complete the form on behalf of your child. A doctor reviews it — we may need a brief call to confirm details for paediatric cases. The certificate is sent to your email.",
      },
      {
        question: "Will the school accept it?",
        answer:
          "Our certificates are issued by AHPRA-registered doctors and are commonly accepted by Australian schools. School policies vary — some may have specific requirements. Check your school's attendance policy before submitting.",
      },
      {
        question: "Do I need to be the child's parent?",
        answer:
          "Yes. The person requesting the certificate should be the parent or guardian. You'll provide your details and describe your child's illness.",
      },
    ],
  },

  "return-to-work": {
    slug: "return-to-work",
    h1: "Return to work certificate.",
    heroSubheadline:
      "Your employer asked for clearance before you return. A doctor reviews your request — typically sorted in under an hour. From $19.95.",
    explainerTitle: "When employers ask for clearance",
    explainerSubtitle: "Some employers require a certificate before you return after sick leave.",
    explainerParagraphs: [
      "If your employer has asked for a return-to-work certificate, we can help. Our doctors assess your recovery based on the information you provide and may issue a certificate if clinically appropriate.",
      "This is a clinical assessment — the doctor considers your symptoms, recovery, and any ongoing limitations. For safety-critical roles (e.g. driving, heavy machinery, operating equipment), we may recommend an in-person assessment. The doctor will advise. Employer policies vary — some may require additional documentation.",
    ],
    recognitionTitle: "Doctor's assessment of recovery",
    recognitionSubtitle:
      "Certificates document that a doctor has assessed your recovery. This is not occupational fitness-for-duty certification. Employer policies vary — check yours.",
    recognitionBadges: [
      { label: "Office & general work", sub: "Desk-based roles" },
      { label: "AHPRA doctors", sub: "Clinical assessment" },
      { label: "Employer policies vary", sub: "Check requirements" },
    ],
    ctaTitle: "Clearance when you need it",
    ctaSubtitle:
      "Quick form, doctor assessment. Certificate to your inbox — usually within the hour.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: "Return to Work Certificate | Doctor Assessment $19.95",
      description:
        "Return to work certificate from AHPRA-registered doctors. Doctor assesses your recovery and may issue a certificate if appropriate. From $19.95. Employer policies vary.",
      keywords: [
        "return to work certificate",
        "fitness to return certificate",
        "back to work certificate",
        "return to work medical certificate australia",
      ],
    },
    faqs: [
      {
        question: "What is a return to work certificate?",
        answer:
          "A certificate from a doctor documenting their assessment of your recovery from illness. Some employers require this before you return to work. It reflects the doctor's clinical assessment based on the information you provide.",
      },
      {
        question: "When might an employer require a return to work certificate?",
        answer:
          "Some employers ask for a certificate after extended sick leave, or as part of their return-to-work policy. Their policy will specify when documentation is needed.",
      },
      {
        question: "Can you provide certificates for safety-critical roles?",
        answer:
          "We can provide return-to-work certificates for most roles based on your self-reported recovery. For safety-critical roles (e.g. driving, heavy machinery), we may recommend an in-person assessment. The doctor will advise based on your situation.",
      },
      {
        question: "Will my employer accept it?",
        answer:
          "Our certificates are issued by AHPRA-registered doctors. Employer policies vary — some accept telehealth certificates, others may have specific requirements or require in-person assessment for certain roles. Check with your employer.",
      },
    ],
  },
}

export function isMedCertIntentSlug(slug: string): slug is MedCertIntentSlug {
  return MED_CERT_INTENT_SLUGS.includes(slug as MedCertIntentSlug)
}
