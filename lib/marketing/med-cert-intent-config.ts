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
  "centrelink",
  "jury-duty",
  // Condition-based pages
  "anxiety",
  "flu",
  "work-from-home",
  "migraine",
  "gastro",
  "back-pain",
  "covid",
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
      "Your employer asked for a sick note. A real Australian doctor reviews your request. No appointments, no waiting rooms. Most sorted in under an hour. From $19.95.",
    explainerTitle: "When you might need one",
    explainerSubtitle: "Work certificates cover most short-term absences. Here's what to know.",
    explainerParagraphs: [
      "If you've called in sick, your employer may ask for documentation. Our certificates are issued by AHPRA-registered doctors and meet Fair Work Act requirements, the same as what you'd get from a clinic.",
      "You fill in a quick form describing your situation. A doctor reviews it and decides whether a certificate is appropriate. If approved, it lands in your inbox as a PDF. No phone call required in most cases.",
    ],
    recognitionTitle: "Fair Work compliant",
    recognitionSubtitle:
      "Certificates meet Fair Work Act requirements and are legally equivalent to those issued by in-person GPs. Some employers may have their own documentation requirements. Check with yours.",
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
        "Medical certificate for work absence. AHPRA-registered doctors review your request, most sorted in under an hour. From $19.95. Fair Work compliant.",
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
          "Our certificates are issued by AHPRA-registered Australian doctors and include the usual details: doctor's name, provider number, dates of illness, and signature. They meet Fair Work Act requirements. Some employers may have their own policies. Check with yours.",
      },
      {
        question: "How quickly will I receive it?",
        answer:
          "Medical certificates are reviewed within 30 minutes, available 24/7. You'll get an email when the doctor starts reviewing.",
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
      "Extensions, deferred exams, or special consideration. A doctor reviews your request, typically sorted in under an hour. From $19.95.",
    explainerTitle: "When students need documentation",
    explainerSubtitle: "Universities and TAFEs often require medical evidence for special consideration.",
    explainerParagraphs: [
      "If illness or caring responsibilities have affected your studies, you may need a medical certificate to support an application for extensions, deferred exams, or special consideration. Our certificates are issued by AHPRA-registered doctors and include the details most institutions need.",
      "Policies vary by institution; some specify exactly what they require. Check yours before applying. You fill in a quick form, a doctor reviews it, and if appropriate, your certificate lands in your inbox.",
    ],
    recognitionTitle: "Commonly accepted by education providers",
    recognitionSubtitle:
      "Certificates are commonly accepted for special consideration, extensions, and deferred assessments. Institutional policies vary. Check yours before applying.",
    recognitionBadges: [
      { label: "Universities", sub: "Go8, ATN, IRU & more" },
      { label: "TAFE & RTOs", sub: "Vocational education" },
      { label: "Private providers", sub: "Check policy first" },
    ],
    ctaTitle: "Get the documentation you need",
    ctaSubtitle:
      "Quick form, real doctor review. Certificate to your inbox, usually within the hour.",
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
          "Our certificates are issued by AHPRA-registered doctors and are commonly accepted by Australian universities and TAFEs for special consideration, extensions, and deferred exams. Policies vary. Check your institution's requirements before applying.",
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
      "Time off to look after a sick family member. A doctor reviews your request, no appointments, typically sorted in under an hour. From $19.95.",
    explainerTitle: "When carers need documentation",
    explainerSubtitle: "Carer's leave certificates support absences when you're looking after someone who needs you.",
    explainerParagraphs: [
      "If you've needed time off to care for a sick family member or dependant, your employer may require documentation. Carer's leave certificates are issued by AHPRA-registered doctors and meet Fair Work Act requirements.",
      "You describe the situation in a quick form. A doctor reviews it and decides whether a certificate is appropriate. Same process as sick leave, just select carer's leave when you start.",
    ],
    recognitionTitle: "Valid for carer's leave",
    recognitionSubtitle:
      "Certificates meet Fair Work Act requirements for carer's leave. Commonly accepted by Australian employers. Some may have their own documentation requirements.",
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
          "Typically for caring for a sick child, spouse, parent, or other dependant. You'll describe the situation when completing the form. The doctor assesses whether a certificate is appropriate.",
      },
      {
        question: "Will my employer accept it?",
        answer:
          "Our carer's leave certificates are issued by AHPRA-registered doctors and meet Fair Work Act requirements. They're commonly accepted by Australian employers. Some may have their own requirements. Check with yours.",
      },
    ],
  },

  "sick-leave": {
    slug: "sick-leave",
    h1: "Sick leave certificate online.",
    heroSubheadline:
      "Too sick to visit a GP? Get a valid certificate from bed. A doctor reviews your request, most sorted in under an hour. From $19.95.",
    explainerTitle: "Sick leave without the waiting room",
    explainerSubtitle: "When you need documentation for time off, but leaving the house isn't an option.",
    explainerParagraphs: [
      "Sometimes the last thing you want to do when you're unwell is drag yourself to a clinic. Our certificates are issued by AHPRA-registered doctors after you complete a quick form. No appointments, no waiting rooms.",
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
      "Two minutes on your phone. Real doctor review. Certificate delivered. No clinic visit required.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: "Sick Leave Certificate Online | $19.95 Under 1 Hour",
      description:
        "Get a sick leave certificate online. AHPRA-registered doctors review your request, most sorted in under an hour. From $19.95. No appointments, no waiting rooms.",
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
          "Medical certificates are reviewed within 30 minutes, available 24/7. You'll get an email when the doctor starts reviewing.",
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
      "Special consideration, extensions, or deferred exams. A doctor reviews your request, typically under an hour. From $19.95.",
    explainerTitle: "When uni requires medical evidence",
    explainerSubtitle: "Universities often need a medical certificate to support special consideration applications.",
    explainerParagraphs: [
      "If illness has affected your ability to complete assignments or sit exams, your university may require a medical certificate. Our certificates are issued by AHPRA-registered doctors and include the standard details: doctor's name, provider number, dates, and attestation of unfitness.",
      "Policies vary by institution; some specify exactly what they need. Check yours before applying. You fill in a quick form, a doctor reviews it, and if appropriate, your certificate lands in your inbox.",
    ],
    recognitionTitle: "Commonly accepted by universities",
    recognitionSubtitle:
      "Commonly accepted for special consideration, extensions, and deferred exams. Institutional policies vary. Check yours before applying.",
    recognitionBadges: [
      { label: "Go8 universities", sub: "Group of Eight" },
      { label: "ATN & IRU", sub: "University networks" },
      { label: "Private unis", sub: "Check policy" },
    ],
    ctaTitle: "Get the documentation your uni needs",
    ctaSubtitle:
      "Quick form, real doctor review. Certificate to your inbox, usually within the hour.",
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
          "Our certificates are issued by AHPRA-registered doctors and are commonly accepted by Australian universities for special consideration. Policies vary. Check your institution's requirements before applying.",
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
          "Most requests are reviewed within 30–60 minutes during operating hours. Plan ahead for deadlines. We can't guarantee same-day delivery during peak periods.",
      },
    ],
  },

  school: {
    slug: "school",
    h1: "Medical certificate for school.",
    heroSubheadline:
      "Documentation for your child's school absence. A doctor reviews your request, typically sorted in under an hour. From $19.95.",
    explainerTitle: "When schools require medical evidence",
    explainerSubtitle: "Some schools ask for a medical certificate to excuse a child's absence.",
    explainerParagraphs: [
      "If your child has been unwell and missed school, the school may request a medical certificate. Our certificates are issued by AHPRA-registered doctors and document the period of unfitness.",
      "You complete a form describing your child's illness. A doctor reviews it. For children, we may need a brief call to confirm details. The certificate is then sent to your inbox. Some schools have their own documentation requirements, so check yours.",
    ],
    recognitionTitle: "Commonly accepted by schools",
    recognitionSubtitle:
      "Certificates are commonly accepted by Australian schools. School attendance policies vary; some may require additional documentation. Check yours before submitting.",
    recognitionBadges: [
      { label: "Primary & secondary", sub: "Public & private" },
      { label: "AHPRA doctors", sub: "Legally valid" },
      { label: "Parent completes form", sub: "On behalf of child" },
    ],
    ctaTitle: "Documentation for school absences",
    ctaSubtitle:
      "Quick form, doctor review. Certificate to your inbox, usually within the hour.",
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
          "Yes. You complete the form on behalf of your child. A doctor reviews it. We may need a brief call to confirm details for paediatric cases. The certificate is sent to your email.",
      },
      {
        question: "Will the school accept it?",
        answer:
          "Our certificates are issued by AHPRA-registered doctors and are commonly accepted by Australian schools. School policies vary; some may have specific requirements. Check your school's attendance policy before submitting.",
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
      "Your employer asked for clearance before you return. A doctor reviews your request, typically sorted in under an hour. From $19.95.",
    explainerTitle: "When employers ask for clearance",
    explainerSubtitle: "Some employers require a certificate before you return after sick leave.",
    explainerParagraphs: [
      "If your employer has asked for a return-to-work certificate, we can help. Our doctors assess your recovery based on the information you provide and may issue a certificate if clinically appropriate.",
      "This is a clinical assessment. The doctor considers your symptoms, recovery, and any ongoing limitations. For safety-critical roles (e.g. driving, heavy machinery, operating equipment), we may recommend an in-person assessment. The doctor will advise. Employer policies vary; some may require additional documentation.",
    ],
    recognitionTitle: "Doctor's assessment of recovery",
    recognitionSubtitle:
      "Certificates document that a doctor has assessed your recovery. This is not occupational fitness-for-duty certification. Employer policies vary. Check yours.",
    recognitionBadges: [
      { label: "Office & general work", sub: "Desk-based roles" },
      { label: "AHPRA doctors", sub: "Clinical assessment" },
      { label: "Employer policies vary", sub: "Check requirements" },
    ],
    ctaTitle: "Clearance when you need it",
    ctaSubtitle:
      "Quick form, doctor assessment. Certificate to your inbox, usually within the hour.",
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
          "Our certificates are issued by AHPRA-registered doctors. Employer policies vary; some accept telehealth certificates, others may have specific requirements or require in-person assessment for certain roles. Check with your employer.",
      },
    ],
  },

  centrelink: {
    slug: "centrelink",
    h1: "Medical certificate for Centrelink.",
    heroSubheadline:
      "Centrelink requires medical evidence for certain claims. A doctor reviews your request, typically sorted in under an hour. From $19.95.",
    explainerTitle: "When Centrelink needs medical evidence",
    explainerSubtitle: "Centrelink may require a medical certificate for sickness allowance, disability support, or other claims.",
    explainerParagraphs: [
      "If you're applying for Centrelink payments that require medical evidence (such as Sickness Allowance, Disability Support Pension, or exemptions from mutual obligations), you may need a medical certificate. Our certificates are issued by AHPRA-registered doctors and include the standard details Centrelink expects.",
      "Check Centrelink's requirements for your specific claim. Some claims need a different form (e.g. SU684). We can issue a standard medical certificate that documents your unfitness for work or study. For Centrelink-specific forms, you may need to see a GP in person.",
    ],
    recognitionTitle: "Commonly used for Centrelink claims",
    recognitionSubtitle:
      "Standard medical certificates are accepted for many Centrelink purposes. For claims requiring specific Centrelink forms (e.g. SU684), check with Centrelink or your GP.",
    recognitionBadges: [
      { label: "Sickness Allowance", sub: "Medical evidence" },
      { label: "Mutual obligation exemptions", sub: "When unfit" },
      { label: "AHPRA doctors", sub: "Legally valid" },
    ],
    ctaTitle: "Documentation when you need it",
    ctaSubtitle:
      "Quick form, doctor review. Certificate to your inbox, usually within the hour.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: "Medical Certificate for Centrelink | Sickness Allowance $19.95",
      description:
        "Medical certificate for Centrelink claims. AHPRA-registered doctors review your request. From $19.95. Commonly used for Sickness Allowance and mutual obligation exemptions.",
      keywords: [
        "medical certificate for centrelink",
        "centrelink medical certificate",
        "sickness allowance medical certificate",
        "centrelink sick certificate australia",
      ],
    },
    faqs: [
      {
        question: "Will Centrelink accept an online medical certificate?",
        answer:
          "Our certificates are issued by AHPRA-registered doctors and are commonly accepted for Centrelink purposes. Some claims require specific Centrelink forms (e.g. SU684). Check Centrelink's requirements for your claim.",
      },
      {
        question: "What if Centrelink needs a specific form?",
        answer:
          "Some Centrelink claims require their own forms (e.g. SU684 for medical evidence). We can issue a standard medical certificate; for Centrelink-specific forms, you may need to see a GP in person.",
      },
      {
        question: "How quickly can I get it?",
        answer:
          "Most requests are reviewed within 30–60 minutes during operating hours. Plan ahead for Centrelink deadlines. Submit your claim as soon as you have the certificate.",
      },
    ],
  },

  "jury-duty": {
    slug: "jury-duty",
    h1: "Medical certificate for jury duty exemption.",
    heroSubheadline:
      "Unable to serve on jury duty? A doctor reviews your request, typically sorted in under an hour. From $19.95.",
    explainerTitle: "When you need to be excused from jury duty",
    explainerSubtitle: "If you're unable to serve due to illness or other medical reasons, you may need a medical certificate.",
    explainerParagraphs: [
      "If you've been summoned for jury duty but are unable to serve due to illness, caring responsibilities, or medical reasons, you may need to provide a medical certificate. Our certificates are issued by AHPRA-registered doctors and document your unfitness to serve.",
      "Each court has its own process. Check your jury summons for instructions. You typically need to submit your exemption request and supporting documentation before the summons date. We can issue a certificate that documents your situation.",
    ],
    recognitionTitle: "Commonly accepted by courts",
    recognitionSubtitle:
      "Certificates meet the requirements of most Australian courts for jury duty exemption. Court processes vary. Check your summons for instructions.",
    recognitionBadges: [
      { label: "State & federal courts", sub: "NSW, VIC, QLD & more" },
      { label: "AHPRA doctors", sub: "Legally valid" },
      { label: "Illness or caring", sub: "Medical exemption" },
    ],
    ctaTitle: "Documentation for jury duty exemption",
    ctaSubtitle:
      "Quick form, doctor review. Certificate to your inbox, usually within the hour.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: "Medical Certificate for Jury Duty Exemption | $19.95",
      description:
        "Medical certificate for jury duty exemption. AHPRA-registered doctors review your request. From $19.95. Commonly accepted by Australian courts.",
      keywords: [
        "medical certificate jury duty",
        "jury duty exemption medical certificate",
        "excused from jury duty medical certificate",
        "jury duty sick certificate australia",
      ],
    },
    faqs: [
      {
        question: "Will the court accept an online medical certificate?",
        answer:
          "Our certificates are issued by AHPRA-registered doctors and are commonly accepted by Australian courts for jury duty exemption. Court processes vary. Check your jury summons for instructions.",
      },
      {
        question: "When do I need to submit the certificate?",
        answer:
          "Check your jury summons. It will specify the deadline and process for exemption requests. Submit your certificate and exemption request before the summons date.",
      },
      {
        question: "What if I need to care for someone else?",
        answer:
          "Carer's leave certificates can also support jury duty exemption when you need to care for a sick family member. Select carer's leave when completing the form.",
      },
    ],
  },

  anxiety: {
    slug: "anxiety",
    h1: "Medical certificate for anxiety.",
    heroSubheadline:
      "Anxiety is a legitimate medical condition. A doctor reviews your request. No judgement, no waiting rooms. Most sorted in under an hour. From $19.95.",
    explainerTitle: "Anxiety is a valid reason to take time off",
    explainerSubtitle: "Mental health conditions, including anxiety, are covered under sick leave laws in Australia.",
    explainerParagraphs: [
      "Anxiety, panic disorder, and stress-related conditions are legitimate medical reasons to take time off work or study. Our AHPRA-registered doctors assess your situation the same way they would any other health condition, with clinical judgement, not assumptions.",
      "You describe your symptoms in a quick form. A doctor reviews it and makes a clinical decision. If approved, your certificate lands in your inbox as a PDF. No phone call required in most cases.",
    ],
    recognitionTitle: "Fair Work compliant",
    recognitionSubtitle:
      "Medical certificates for anxiety and mental health conditions meet Fair Work Act requirements. They are legally equivalent to certificates issued by in-person GPs.",
    recognitionBadges: [
      { label: "Mental health recognised", sub: "Same as physical illness" },
      { label: "Fair Work compliant", sub: "Legally valid" },
      { label: "No judgement", sub: "Confidential assessment" },
    ],
    ctaTitle: "Your mental health matters",
    ctaSubtitle:
      "A two-minute form, real doctor review. Certificate to your inbox. No appointment needed.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: "Medical Certificate for Anxiety | Mental Health Days $19.95",
      description:
        "Get a medical certificate for anxiety or mental health days. AHPRA-registered doctors review your request. Fair Work compliant. From $19.95. No waiting rooms.",
      keywords: [
        "medical certificate for anxiety",
        "anxiety medical certificate",
        "mental health day certificate",
        "medical certificate mental health australia",
        "anxiety sick certificate",
      ],
    },
    faqs: [
      {
        question: "Can you get a medical certificate for anxiety?",
        answer:
          "Yes. Anxiety and other mental health conditions are recognised medical conditions under Australian law. Our AHPRA-registered doctors assess requests for anxiety the same as any other illness. If clinically appropriate, they'll issue a certificate.",
      },
      {
        question: "Will my employer accept a mental health certificate?",
        answer:
          "Yes. Medical certificates for mental health conditions, including anxiety, are legally valid under the Fair Work Act. Employers cannot discriminate between physical and mental health sick leave.",
      },
      {
        question: "Do I need to disclose my mental health condition?",
        answer:
          "Employers can ask for a medical certificate, but they can't require you to disclose your specific diagnosis. Our certificates state that you were assessed by a doctor and were unfit for work, without specifying the condition.",
      },
      {
        question: "Can I get a certificate for stress or burnout?",
        answer:
          "Yes. Stress, burnout, and anxiety-related conditions are all assessed by our doctors. You describe your symptoms in the form. The doctor makes the clinical determination.",
      },
    ],
  },

  flu: {
    slug: "flu",
    h1: "Medical certificate for the flu.",
    heroSubheadline:
      "Fever, aches, can't get out of bed? Get your sick note from home. A doctor reviews your request, most sorted in under an hour. From $19.95.",
    explainerTitle: "Get your certificate without leaving the house",
    explainerSubtitle: "Influenza and flu-like illness are among the most common reasons for work absence.",
    explainerParagraphs: [
      "When you have the flu, the last thing you want to do is drive to a clinic. Our AHPRA-registered doctors review your symptoms and issue a certificate if clinically appropriate, all online, while you stay in bed.",
      "Flu certificates typically cover 1–5 days depending on symptom severity. You describe your symptoms and how long you've been unwell. The doctor determines the appropriate duration.",
    ],
    recognitionTitle: "Fair Work compliant",
    recognitionSubtitle:
      "Flu certificates meet Fair Work Act requirements and are accepted by all Australian employers. Identical to what you'd receive from an in-person GP.",
    recognitionBadges: [
      { label: "All employers", sub: "Legally valid" },
      { label: "Fair Work compliant", sub: "Same as in-person cert" },
      { label: "Stay home", sub: "No clinic visit needed" },
    ],
    ctaTitle: "Rest up. We'll handle the paperwork.",
    ctaSubtitle:
      "Two minutes on your phone. Doctor review. Certificate to your inbox.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: "Medical Certificate for Flu | Sick Note Online $19.95",
      description:
        "Get a medical certificate for flu or influenza. AHPRA-registered doctors review your request online. Stay home, no clinic visit needed. From $19.95.",
      keywords: [
        "medical certificate for flu",
        "flu sick certificate",
        "influenza medical certificate australia",
        "sick note flu online",
        "medical certificate fever",
      ],
    },
    faqs: [
      {
        question: "Can I get a medical certificate for flu without seeing a doctor in person?",
        answer:
          "Yes. Telehealth medical certificates are legally equivalent to in-person consultations. Our AHPRA-registered doctors assess your flu symptoms via a quick questionnaire and issue a certificate if appropriate.",
      },
      {
        question: "How many days will my flu certificate cover?",
        answer:
          "Most flu certificates cover 2–5 days depending on symptom severity. The doctor determines the appropriate duration based on your self-reported symptoms and recovery timeline.",
      },
      {
        question: "Can I get a certificate if I was sick yesterday?",
        answer:
          "Yes. We can often issue certificates for absences up to 48 hours ago if clinically appropriate. Be accurate about when your symptoms started.",
      },
      {
        question: "What's the difference between flu and a cold?",
        answer:
          "Flu typically comes on suddenly with fever, body aches, and fatigue. A cold is usually milder with a runny nose as the main symptom. Both can qualify for a medical certificate. Describe your symptoms accurately in the form.",
      },
    ],
  },

  "work-from-home": {
    slug: "work-from-home",
    h1: "Medical certificate for working from home.",
    heroSubheadline:
      "Your employer wants documentation before approving remote work. A doctor reviews your request, typically sorted in under an hour. From $19.95.",
    explainerTitle: "When employers need medical justification for WFH",
    explainerSubtitle: "Some employers require a medical certificate before approving temporary work from home arrangements due to illness.",
    explainerParagraphs: [
      "If you're unwell but able to work from home, some employers require a medical certificate before approving a temporary WFH arrangement. Our AHPRA-registered doctors can document that you were assessed as fit to work remotely but unfit to attend the workplace.",
      "This covers scenarios like mild illness (contagious but functional), post-op recovery, mobility issues, or other conditions where being in the office isn't appropriate. The certificate documents the situation. The doctor determines clinical appropriateness.",
    ],
    recognitionTitle: "Workplace documentation",
    recognitionSubtitle:
      "Certificates document your assessed fitness for remote work. Employer WFH policies vary. Check yours before applying.",
    recognitionBadges: [
      { label: "Contagious illness", sub: "Fit for WFH, not office" },
      { label: "Recovery periods", sub: "Post-illness or procedure" },
      { label: "AHPRA doctors", sub: "Legally valid" },
    ],
    ctaTitle: "Documentation for working remotely",
    ctaSubtitle:
      "Quick form, doctor assessment. Certificate to your inbox, usually within the hour.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: "Medical Certificate Work From Home | WFH Documentation $19.95",
      description:
        "Get a medical certificate for working from home. AHPRA-registered doctors document your fitness for remote work. From $19.95. Employer WFH policies vary.",
      keywords: [
        "medical certificate work from home",
        "wfh medical certificate australia",
        "sick certificate remote work",
        "work from home sick note",
        "medical certificate for wfh",
      ],
    },
    faqs: [
      {
        question: "Can I get a certificate saying I should work from home?",
        answer:
          "Yes. Our doctors can document that you were assessed as fit for remote work but unfit to attend the workplace. For example, if you're contagious but able to function, or recovering from an illness. The doctor makes the clinical determination.",
      },
      {
        question: "Will my employer accept this?",
        answer:
          "Our certificates are issued by AHPRA-registered doctors. Employer WFH policies vary; some accept telehealth documentation, others may have specific requirements. Check your employer's policy before submitting.",
      },
      {
        question: "What conditions qualify for a WFH certificate?",
        answer:
          "Common scenarios include contagious illness (e.g. flu, gastro, COVID), recovery from a minor procedure, mobility issues, or other conditions where attending the workplace isn't medically appropriate. The doctor assesses your situation individually.",
      },
      {
        question: "Is this different from a sick leave certificate?",
        answer:
          "Yes. A sick leave certificate documents unfitness for work entirely. A WFH certificate documents fitness for remote work but unfitness for in-person attendance. Both are available through InstantMed.",
      },
    ],
  },

  migraine: {
    slug: "migraine",
    h1: "Medical certificate for migraine.",
    heroSubheadline:
      "Migraines can be debilitating. Get your sick note from home, no bright screens required. A doctor reviews your request. From $19.95.",
    explainerTitle: "When a migraine stops you from working",
    explainerSubtitle: "Migraine is a recognised medical condition that can make it impossible to work safely.",
    explainerParagraphs: [
      "Migraines aren't just headaches. They can involve nausea, vomiting, light and sound sensitivity, and visual disturbances, making it unsafe and impossible to work. Our AHPRA-registered doctors understand this and assess migraine requests accordingly.",
      "You describe your symptoms in a quick form. A doctor reviews it and issues a certificate if clinically appropriate. Keep screen time minimal. The form takes about two minutes.",
    ],
    recognitionTitle: "Fair Work compliant",
    recognitionSubtitle:
      "Medical certificates for migraines meet Fair Work Act requirements. Employers cannot distinguish between migraine and other medical conditions.",
    recognitionBadges: [
      { label: "Recognised condition", sub: "Neurological illness" },
      { label: "Fair Work compliant", sub: "Legally valid" },
      { label: "Minimal screen time", sub: "Quick form" },
    ],
    ctaTitle: "Sort your certificate before the next one hits",
    ctaSubtitle:
      "Two minutes. Real doctor review. Certificate to your inbox.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: "Medical Certificate for Migraine | Sick Note Online $19.95",
      description:
        "Get a medical certificate for a migraine. AHPRA-registered doctors review your request online. Fair Work compliant. From $19.95.",
      keywords: [
        "medical certificate for migraine",
        "migraine sick certificate",
        "medical certificate headache australia",
        "sick note migraine online",
        "migraine work certificate",
      ],
    },
    faqs: [
      {
        question: "Can I get a medical certificate for a migraine?",
        answer:
          "Yes. Migraine is a recognised neurological condition. Our AHPRA-registered doctors assess migraine requests and issue a certificate if the symptoms are consistent and clinical assessment supports it.",
      },
      {
        question: "How long will the certificate cover?",
        answer:
          "Most migraine certificates cover 1–2 days. If you have a history of complex or prolonged migraines, describe this in the form. The doctor will assess the appropriate duration.",
      },
      {
        question: "Do I need to have a diagnosis of migraine?",
        answer:
          "Not necessarily. If you've experienced symptoms consistent with migraine (severe headache, nausea, light sensitivity), describe them accurately. The doctor makes the clinical determination.",
      },
    ],
  },

  gastro: {
    slug: "gastro",
    h1: "Medical certificate for gastro.",
    heroSubheadline:
      "Gastro is one of the most common reasons Australians need a sick note. Get yours from home, no waiting rooms. From $19.95.",
    explainerTitle: "Gastro and stomach illness",
    explainerSubtitle: "Gastroenteritis (gastro) is highly contagious. Staying away from work is the responsible call.",
    explainerParagraphs: [
      "Gastroenteritis causes vomiting, diarrhoea, cramps, and fatigue. You can't safely go to work, and you shouldn't. It spreads easily. Our AHPRA-registered doctors assess gastro requests and can issue a certificate from the information you provide.",
      "You describe your symptoms in a quick form. The doctor determines the appropriate certificate duration based on your symptoms and how long you've been unwell.",
    ],
    recognitionTitle: "Fair Work compliant",
    recognitionSubtitle:
      "Gastro certificates meet Fair Work Act requirements. Commonly accepted by all Australian employers.",
    recognitionBadges: [
      { label: "All employers", sub: "Legally valid" },
      { label: "Highly contagious", sub: "Medical reason to stay home" },
      { label: "1–3 days typical", sub: "Doctor determines duration" },
    ],
    ctaTitle: "Stay home. Get the paperwork sorted.",
    ctaSubtitle:
      "Two-minute form. Real doctor review. Certificate to your inbox.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: "Medical Certificate for Gastro | Sick Note Online $19.95",
      description:
        "Get a medical certificate for gastro or gastroenteritis. AHPRA-registered doctors review your request online. Stay home, no clinic visit needed. From $19.95.",
      keywords: [
        "medical certificate for gastro",
        "gastroenteritis sick certificate",
        "gastro sick note australia",
        "stomach bug medical certificate",
        "medical certificate gastro online",
      ],
    },
    faqs: [
      {
        question: "Can I get a medical certificate for gastro without going to a clinic?",
        answer:
          "Yes. Gastro symptoms are well-defined: vomiting, diarrhoea, cramps, nausea. Our doctors assess your self-reported symptoms and issue a certificate if clinically appropriate. No need to visit a clinic while infectious.",
      },
      {
        question: "How many days will a gastro certificate cover?",
        answer:
          "Most gastro certificates cover 1–3 days. Gastroenteritis typically resolves within 2–3 days. If you're still unwell after that period, you may need to submit a new request.",
      },
      {
        question: "Do I need to get tested for the specific bug?",
        answer:
          "No. Testing isn't required for a standard medical certificate. You describe your symptoms and how long you've been unwell. The doctor makes the clinical determination.",
      },
    ],
  },

  "back-pain": {
    slug: "back-pain",
    h1: "Medical certificate for back pain.",
    heroSubheadline:
      "Back pain can make it impossible to sit, stand, or drive. Get your certificate without the commute. From $19.95.",
    explainerTitle: "When back pain stops you working",
    explainerSubtitle: "Acute and chronic back pain are among the leading causes of workplace absence in Australia.",
    explainerParagraphs: [
      "Back pain can range from acute muscle strain to severe disc issues that make movement, sitting, or standing unbearable. Our AHPRA-registered doctors assess your situation and can issue a certificate if you're genuinely unable to perform your work duties.",
      "Describe your symptoms, how they started, and how they're affecting your ability to work. The doctor makes the clinical determination. For ongoing back conditions, you may need periodic certificates. Each request is assessed individually.",
    ],
    recognitionTitle: "Fair Work compliant",
    recognitionSubtitle:
      "Certificates for back pain meet Fair Work Act requirements. Legally equivalent to certificates issued by in-person GPs.",
    recognitionBadges: [
      { label: "Acute & chronic", sub: "All back conditions" },
      { label: "Fair Work compliant", sub: "Legally valid" },
      { label: "No commute required", sub: "Stay home to rest" },
    ],
    ctaTitle: "Documentation while you rest",
    ctaSubtitle:
      "Quick form. Doctor review. Certificate to your inbox. No driving required.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: "Medical Certificate for Back Pain | Sick Note Online $19.95",
      description:
        "Get a medical certificate for back pain. AHPRA-registered doctors review your request online. No commute required. From $19.95. Fair Work compliant.",
      keywords: [
        "medical certificate for back pain",
        "back pain sick certificate",
        "back injury medical certificate australia",
        "sick note back pain online",
        "back pain work certificate",
      ],
    },
    faqs: [
      {
        question: "Can I get a medical certificate for back pain online?",
        answer:
          "Yes. Our AHPRA-registered doctors assess back pain based on your self-reported symptoms and limitations. If your pain prevents you from performing your work duties, a certificate may be issued.",
      },
      {
        question: "What if my back pain is from a workplace injury?",
        answer:
          "If your back pain is related to a workplace injury, you may need to pursue a WorkCover claim, which typically requires an in-person assessment. Our certificates are suitable for general sick leave, not WorkCover documentation.",
      },
      {
        question: "How many days will the certificate cover?",
        answer:
          "Typically 1–3 days for acute back pain. For ongoing or chronic conditions, the doctor will assess an appropriate duration. You may need to submit additional requests for extended absences.",
      },
      {
        question: "Can I get a WFH certificate instead of sick leave for back pain?",
        answer:
          "Yes. If you're able to work from a computer but can't sit in an office chair or commute, we can issue documentation supporting a temporary work from home arrangement. Select 'work from home' when completing the form.",
      },
    ],
  },

  covid: {
    slug: "covid",
    h1: "Medical certificate for COVID-19.",
    heroSubheadline:
      "Tested positive? Get your isolation certificate without leaving home. A doctor reviews your request. From $19.95.",
    explainerTitle: "COVID certificates and isolation documentation",
    explainerSubtitle: "Many employers still require documentation for COVID-related absences.",
    explainerParagraphs: [
      "While mandatory isolation periods are no longer legally required in most of Australia, many employers still ask for documentation when staff test positive for COVID-19. Our AHPRA-registered doctors can issue a medical certificate documenting your illness and the period of unfitness.",
      "You describe your test result, symptoms, and how long you've been unwell. The doctor reviews and issues a certificate if appropriate. No need to visit a clinic while infectious.",
    ],
    recognitionTitle: "Employer accepted",
    recognitionSubtitle:
      "COVID certificates are issued by AHPRA-registered doctors and accepted by Australian employers. Mandatory isolation rules vary by state. Check your state health authority for current requirements.",
    recognitionBadges: [
      { label: "All employers", sub: "Legally valid" },
      { label: "Stay isolated", sub: "No clinic visit needed" },
      { label: "RAT or PCR positive", sub: "Accepted" },
    ],
    ctaTitle: "Isolate safely. Get your paperwork sorted.",
    ctaSubtitle:
      "Two-minute form. Doctor review. Certificate to your inbox.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: "Medical Certificate for COVID-19 | Isolation Certificate $19.95",
      description:
        "Get a medical certificate for COVID-19. AHPRA-registered doctors review your request. Stay isolated, no clinic visit needed. From $19.95.",
      keywords: [
        "medical certificate for covid",
        "covid sick certificate australia",
        "covid isolation certificate",
        "covid positive medical certificate",
        "covid sick note online",
      ],
    },
    faqs: [
      {
        question: "Can I get a medical certificate for COVID without seeing a doctor?",
        answer:
          "Yes. Our AHPRA-registered doctors review your self-reported test result and symptoms and issue a certificate if appropriate. Telehealth certificates are legally equivalent to in-person ones.",
      },
      {
        question: "Does Australia still require COVID isolation?",
        answer:
          "Mandatory isolation rules vary by state and have changed significantly. As of 2026, most states no longer mandate isolation. However, employers may still require documentation. Check your state health authority for current guidance.",
      },
      {
        question: "What do I need to provide?",
        answer:
          "Your positive RAT or PCR result, when you tested positive, your current symptoms, and how long you expect to be unwell. The doctor makes the clinical determination.",
      },
      {
        question: "Can I get a certificate for a family member with COVID?",
        answer:
          "Yes. If you're caring for a family member with COVID, a carer's leave certificate may be appropriate. Select 'carer' when completing the form.",
      },
    ],
  },
}

export function isMedCertIntentSlug(slug: string): slug is MedCertIntentSlug {
  return MED_CERT_INTENT_SLUGS.includes(slug as MedCertIntentSlug)
}
