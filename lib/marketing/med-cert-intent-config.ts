/**
 * Medical certificate intent landing page config
 * SEO/acquisition pages for specific search intents - all route to /request?service=med-cert
 */

import { PRICING_DISPLAY } from "@/lib/constants"
import type { CertCategory } from "@/lib/marketing/med-cert-selector"

export const MED_CERT_INTENT_SLUGS = [
  "work",
  "study",
  "carer",
  "sick-leave",
  "university",
  "school",
  "return-to-work",
  "centrelink",
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

/**
 * Maps each intent landing page to the wizard certificate type so its CTA can
 * pre-fill step 1 (the cert-step) instead of dropping the user on a cold
 * 3-decision pick. Education intents -> study, care intents -> carer, and all
 * work/personal-illness intents -> work (the patient's own absence). The user
 * can still change the type in the wizard; this only removes the blank-start
 * friction that drives the -43% cert->symptoms drop.
 */
export const MED_CERT_SLUG_CERT_TYPE: Record<MedCertIntentSlug, CertCategory> = {
  work: "work",
  study: "study",
  carer: "carer",
  "sick-leave": "work",
  university: "study",
  school: "study",
  "return-to-work": "work",
  centrelink: "work",
  anxiety: "work",
  flu: "work",
  "work-from-home": "work",
  migraine: "work",
  gastro: "work",
  "back-pain": "work",
  covid: "work",
}

export interface MedCertIntentConfig {
  slug: MedCertIntentSlug
  h1: string
  heroSubheadline: string
  /** Use-case specific explainer section */
  explainerTitle: string
  explainerSubtitle: string
  explainerParagraphs: string[]
  detailSections?: Array<{
    title: string
    body: string
    items?: string[]
  }>
  /** Recognition/validity section - who accepts this */
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
      `Your employer asked for a sick note. A real Australian doctor reviews your request. No appointments, no waiting rooms. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "When you might need one",
    explainerSubtitle: "Work certificates cover most short-term absences. Here's what to know.",
    explainerParagraphs: [
      "If you've called in sick, your employer may ask for documentation. Our certificates are issued by AHPRA-registered doctors and include standard workplace evidence details.",
      "You fill in a quick form describing your situation. A doctor reviews it and decides whether a certificate is appropriate. If approved, it lands in your inbox as a PDF. No phone call required in most cases.",
    ],
    recognitionTitle: "Workplace evidence",
    recognitionSubtitle:
      "Certificates include standard workplace evidence details. Some employers may have their own documentation requirements. Check with yours.",
    recognitionBadges: [
      { label: "Workplace evidence", sub: "Doctor-issued" },
      { label: "Large & small businesses", sub: "Commonly used" },
      { label: "Full-time & casual", sub: "All employment types" },
    ],
    ctaTitle: "Ready when you are",
    ctaSubtitle:
      "Two minutes to complete the form. A doctor reviews it. Certificate to your inbox.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: `Medical Certificate for Work | Sick Note Online ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Medical certificate for work absence. AHPRA-registered doctors review your request. From ${PRICING_DISPLAY.MED_CERT}. Employer policies may vary.`,
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
          "Our certificates are issued by AHPRA-registered Australian doctors and include the usual details: doctor's name, provider number, dates of illness, and signature. Some employers may have their own policies. Check with yours.",
      },
      {
        question: "How quickly will I receive it?",
        answer:
          "Medical certificate requests are available 24/7. You'll get an email when the doctor starts reviewing.",
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
      `Study absence documentation for short illness. An AHPRA-registered doctor reviews your answers and decides whether a certificate is clinically appropriate. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "When students need documentation",
    explainerSubtitle: "For short study absences where online doctor review is clinically suitable.",
    explainerParagraphs: [
      "If illness has stopped you attending class, placement, tutorials, labs, or ordinary study duties, your education provider may ask for medical evidence. This page is for routine study absence documentation where a doctor can make a safe decision from your history without examining you in person.",
      "You answer a structured health form covering your symptoms, when they started, the study dates affected, and whether anything about your course or placement changes the risk. A doctor reviews those answers before deciding whether a certificate can be issued.",
      "If approved, your certificate is emailed as a PDF with standard doctor-issued details. It is not an automatic document and it is not a substitute for provider-specific forms. Check your institution's policy before applying, especially if deadlines or assessment rules are involved.",
    ],
    detailSections: [
      {
        title: "When online review fits",
        body:
          "Online review is best suited to short, low-risk study absences where the clinical story is clear and the requested dates match the illness described.",
        items: [
          "Short absence from class, tutorials, labs, online attendance, or ordinary study duties",
          "Common acute illness such as cold, flu, gastro, migraine, period pain, or a mental health day",
          "No placement clearance, fitness-to-attend decision, or provider-specific form required",
        ],
      },
      {
        title: "What the doctor checks",
        body:
          "The doctor checks whether the symptoms, timing, affected study dates, and safety answers support routine study absence evidence.",
        items: [
          "When symptoms started and whether they affected attendance or study capacity",
          "Whether the requested dates are clinically reasonable for the condition described",
          "Whether red-flag symptoms, placement duties, or course requirements point to in-person care",
        ],
      },
      {
        title: "What the certificate includes",
        body:
          "A routine study certificate focuses on whether you were medically unfit for study or usual duties for a period. It usually does not need diagnosis details.",
        items: [
          "Your name, review date, recommended absence dates, and doctor details",
          "A statement about unfitness for study, attendance, or usual duties for the relevant period",
          "Verification details so the document can be checked if required",
        ],
      },
      {
        title: "When it may not be enough",
        body:
          "Some education processes need more than a standard medical certificate. We keep those boundaries clear before a certificate is issued.",
        items: [
          "Provider forms, detailed academic reports, placement clearance, or fitness-to-attend wording",
          "Long absences, repeated absences, disability support, or ongoing course adjustments",
          "Severe symptoms, injury, or any situation where the doctor needs to examine you",
        ],
      },
    ],
    recognitionTitle: "Evidence for education providers",
    recognitionSubtitle:
      "Education providers set their own evidence rules. Check your course, campus, or provider policy before applying.",
    recognitionBadges: [
      { label: "Universities", sub: "Go8, ATN, IRU & more" },
      { label: "TAFE & RTOs", sub: "Vocational education" },
      { label: "Private providers", sub: "Check policy first" },
    ],
    ctaTitle: "Get the documentation you need",
    ctaSubtitle:
      "Quick form. Real doctor review. Certificate to your inbox if approved.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: `Medical Certificate for Study | Uni & TAFE ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Request a medical certificate for study absence. AHPRA-registered doctors review your answers. From ${PRICING_DISPLAY.MED_CERT}. Education provider policies vary.`,
      keywords: [
        "medical certificate for study",
        "uni medical certificate",
        "study medical certificate",
        "student absence medical certificate",
        "tafe medical certificate",
        "medical certificate for class absence",
        "medical certificate for study absence",
      ],
    },
    faqs: [
      {
        question: "Can I submit this to my university, TAFE, or college?",
        answer:
          "You can submit it where your provider allows routine medical certificates as evidence. InstantMed certificates are issued by AHPRA-registered doctors and include standard doctor, date, and absence details. Provider policies and deadlines vary.",
      },
      {
        question: "Can I use this as study documentation?",
        answer:
          "Yes, where your provider accepts a standard medical certificate for study absence documentation. It can support short illness-related absence from usual study duties, but it does not replace provider-specific forms or detailed reports.",
      },
      {
        question: "What if my institution has extra requirements?",
        answer:
          "Check the policy before submitting. Some providers require their own form, extra wording, a treating practitioner report, or an in-person assessment. Those requests may be outside InstantMed's online certificate scope.",
      },
      {
        question: "What study dates can the certificate cover?",
        answer:
          "The doctor decides what dates are clinically appropriate based on your symptoms and history. Most routine online study certificates cover short absences. Longer or repeated absences may need your regular GP or another care pathway.",
      },
      {
        question: "Will the certificate include my diagnosis?",
        answer:
          "Usually no. Routine study absence evidence normally focuses on whether you were medically unfit for study or usual duties for the relevant period. Private clinical details are usually not needed.",
      },
      {
        question: "When should I not use this pathway?",
        answer:
          "Do not use a standard study certificate for emergencies, placement clearance, fitness-to-attend decisions, disability support reports, insurance claims, legal processes, or symptoms that need urgent or in-person care.",
      },
    ],
  },

  carer: {
    slug: "carer",
    h1: "Carer medical certificate.",
    heroSubheadline:
      `Time off to look after a sick family member or dependant. An AHPRA-registered doctor reviews your answers and decides whether a certificate is clinically appropriate. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "When carers need documentation",
    explainerSubtitle: "For short carer's leave absences where online doctor review is clinically suitable.",
    explainerParagraphs: [
      "If you need time away from work to care for a sick family member or household member, your employer may ask for evidence. A carer's leave certificate is different from a personal sick certificate: it documents the caring need, not your own illness.",
      "You answer a structured form explaining who needs care, what happened, the dates you need covered, and why your support is needed. A doctor reviews those answers before deciding whether a carer's leave certificate can be issued.",
      "If approved, your certificate is emailed as a PDF with standard workplace evidence details. It should say enough to support the leave reason without disclosing more private information about the person you are caring for than is needed.",
    ],
    detailSections: [
      {
        title: "When online review fits",
        body:
          "Online review is best suited to short carer's leave absences where the caring need is clear and the doctor does not need to examine the person you are caring for.",
        items: [
          "Caring for a sick child, partner, parent, grandparent, sibling, or household member",
          "Short absence because the person needed care, support, supervision, transport, or recovery help",
          "No legal, Centrelink, insurance, custody, NDIS, or long-term carer report required",
        ],
      },
      {
        title: "What the doctor checks",
        body:
          "The doctor checks whether the relationship, symptoms or event, timing, care need, and requested dates support routine carer's leave evidence.",
        items: [
          "Who needed care and your relationship to them",
          "What symptoms, illness, injury, or unexpected event created the caring need",
          "Whether the situation suggests urgent care, in-person review, or a different document",
        ],
      },
      {
        title: "What the certificate includes",
        body:
          "A routine carer's leave certificate focuses on the caring need and absence period. It usually does not need detailed diagnosis information.",
        items: [
          "Your name, review date, recommended absence dates, and doctor details",
          "A statement that you needed to provide care or support for the relevant period",
          "Verification details so the document can be checked if required",
        ],
      },
      {
        title: "When it may not be enough",
        body:
          "Some carer-related requests need a treating practitioner, agency form, legal document, or in-person assessment rather than a routine certificate.",
        items: [
          "Centrelink, NDIS, custody, court, insurance, school clearance, or formal carer-status reports",
          "Long-term caring arrangements, repeated absences, or complex family circumstances",
          "Severe symptoms, injury, or a child or dependant who needs urgent or in-person care",
        ],
      },
    ],
    recognitionTitle: "Carer's leave evidence",
    recognitionSubtitle:
      "Certificates include standard workplace evidence details for carer's leave. Workplaces assess evidence under their own leave policy.",
    recognitionBadges: [
      { label: "Workplace evidence", sub: "Carer's leave" },
      { label: "Family & dependants", sub: "Sick child, elderly parent" },
      { label: "Full-time & casual", sub: "All employment types" },
    ],
    ctaTitle: "Documentation when you need it",
    ctaSubtitle:
      "Short form. Doctor review. Certificate to your inbox if approved.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: `Carer Medical Certificate | Carer's Leave ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Request a carer's leave medical certificate online. AHPRA-registered doctors review your answers. From ${PRICING_DISPLAY.MED_CERT}. Employer policies vary.`,
      keywords: [
        "carer medical certificate",
        "carers leave certificate",
        "medical certificate for caring",
        "carer leave sick note",
        "carer's leave medical certificate",
        "medical certificate for sick family member",
      ],
    },
    faqs: [
      {
        question: "What is a carer's leave certificate?",
        answer:
          "A medical certificate that documents your need to care for or support a sick family member, household member, or dependant for a period of time. It is different from a certificate for your own sick leave.",
      },
      {
        question: "Who can I get a certificate for?",
        answer:
          "Typically for caring for a sick child, partner, parent, grandparent, sibling, other immediate family member, or household member. You describe the situation in the form and the doctor assesses whether a certificate is appropriate.",
      },
      {
        question: "Can I submit this to my employer?",
        answer:
          "You can submit it where your workplace allows routine medical certificates as carer's leave evidence. InstantMed certificates are issued by AHPRA-registered doctors and include standard workplace evidence details. Employer policies vary.",
      },
      {
        question: "Will it include the other person's diagnosis?",
        answer:
          "Usually no. A routine carer's leave certificate should document the caring need and absence dates without over-disclosing private clinical details about the person you are caring for.",
      },
      {
        question: "Can this cover both school absence and carer's leave?",
        answer:
          "Sometimes one certificate can support both, but schools and employers apply their own policies. If you need both purposes covered, explain that in the form so the doctor can decide what wording is clinically appropriate.",
      },
      {
        question: "When should I not use this pathway?",
        answer:
          "Do not use a routine carer's leave certificate for Centrelink, NDIS, custody, court, insurance, school clearance, formal carer-status reports, or a situation where the person needs urgent or in-person care.",
      },
    ],
  },

  "sick-leave": {
    slug: "sick-leave",
    h1: "Sick leave certificate online.",
    heroSubheadline:
      `Too sick to visit a GP? Request routine sick leave evidence from bed. An AHPRA-registered doctor reviews your answers and decides whether a certificate is clinically appropriate. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "Sick leave without the waiting room",
    explainerSubtitle: "For short absences where online doctor review is clinically suitable.",
    explainerParagraphs: [
      "Sometimes the last thing you want to do when you are unwell is travel to a clinic and sit in a waiting room. This page is for routine sick leave evidence: short-term illness or injury where a doctor can make a safe decision from your history without a physical examination.",
      "You answer a structured health form covering your symptoms, when they started, the dates you need covered, whether work duties are affected, and any red flags that would make online care unsuitable. A doctor reviews those answers before deciding whether a certificate can be issued.",
      "If approved, your certificate is emailed as a PDF with the usual workplace evidence details. If the doctor needs more context, they can message you through the secure platform. If online review is not suitable, the request is declined and you are directed toward the right care pathway.",
    ],
    detailSections: [
      {
        title: "When online review fits",
        body:
          "Online review is best suited to short, low-risk absences where the clinical story is clear and a physical examination is not needed.",
        items: [
          "Common acute illness such as cold, flu, gastro, migraine, period pain, or a short mental health day",
          "A 1-3 day absence where your symptoms and requested dates match",
          "No workplace injury, compensation claim, or fitness-for-duty wording required",
        ],
      },
      {
        title: "What the doctor checks",
        body:
          "The certificate decision is not automatic. The doctor checks whether the symptoms, timing, requested dates, and safety answers support routine sick leave evidence.",
        items: [
          "When symptoms started and whether they are improving, stable, or getting worse",
          "Whether the absence period is clinically reasonable for the condition described",
          "Whether red-flag symptoms mean you should seek urgent or in-person care",
        ],
      },
      {
        title: "What the certificate includes",
        body:
          "A standard sick leave certificate focuses on work capacity, not private medical detail. Diagnosis is usually not needed for routine absence evidence.",
        items: [
          "Your name, review date, recommended absence dates, and doctor details",
          "A statement that you were unfit for usual work duties for the relevant period",
          "Verification details so the document can be checked if required",
        ],
      },
      {
        title: "When it may not be enough",
        body:
          "Some situations need a different document or an in-person assessment. We keep those boundaries clear before a certificate is issued.",
        items: [
          "Workplace injury, WorkCover, insurance, or compensation paperwork",
          "Return-to-work clearance, capacity, restrictions, or safety-critical duties",
          "Severe symptoms, extended absence, or a condition that needs examination",
        ],
      },
    ],
    recognitionTitle: "Workplace evidence",
    recognitionSubtitle:
      "Certificates include standard workplace evidence details. Employers assess evidence under their own leave policy, so check any specific wording requirements before applying.",
    recognitionBadges: [
      { label: "Workplace evidence", sub: "Doctor-issued" },
      { label: "1-3 days", sub: "Acute illness" },
      { label: "Backdating", sub: "If clinically appropriate" },
    ],
    ctaTitle: "From your couch to your inbox",
    ctaSubtitle:
      "Two minutes on your phone. A doctor reviews your answers and sends the certificate if it is clinically appropriate.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: `Sick Leave Certificate Online | Doctor Review ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Request a sick leave certificate online for short illness. AHPRA-registered doctors review your answers. From ${PRICING_DISPLAY.MED_CERT}. Employer policies may vary.`,
      keywords: [
        "sick leave certificate online",
        "sick note online australia",
        "online sick certificate",
        "sick leave medical certificate",
        "doctor certificate for sick leave",
        "sick certificate online australia",
      ],
    },
    faqs: [
      {
        question: "How quickly can I get a sick leave certificate?",
        answer:
          "Medical certificate requests are available 24/7. You will get an email when the doctor starts reviewing. Timing depends on clinical review and whether the doctor needs more information.",
      },
      {
        question: "Do I need to see a doctor in person?",
        answer:
          "Not always. Online review can be appropriate for short, low-risk illness where the doctor can make a safe decision from your history. If symptoms suggest you need an examination, urgent care, or a different document, the doctor can decline or redirect you.",
      },
      {
        question: "What if I was sick yesterday?",
        answer:
          "The doctor can consider recent past dates if they are clinically supported by your answers. Be upfront about when symptoms started, what changed, and which days you could not work.",
      },
      {
        question: "Can a sick leave certificate cover more than one day?",
        answer:
          "Yes, where clinically appropriate. Most routine online sick leave certificates cover short absences of 1-3 days. Longer or repeated absences may need an in-person GP, a treating practitioner, or a different document.",
      },
      {
        question: "Will my diagnosis be shown to my employer?",
        answer:
          "Usually no. Routine sick leave evidence normally focuses on whether you were unfit for work for a period of time. It does not usually need to disclose private diagnosis or symptom details.",
      },
      {
        question: "Will my employer accept an online sick leave certificate?",
        answer:
          "InstantMed certificates are issued by AHPRA-registered Australian doctors and include standard workplace evidence details. Employers may still apply their own leave policy, so check any specific requirements before applying.",
      },
      {
        question: "When should I not use this pathway?",
        answer:
          "Do not use a routine sick leave certificate for medical emergencies, workplace injuries, WorkCover or insurance claims, return-to-work clearance, capacity restrictions, or severe symptoms that need urgent or in-person care.",
      },
    ],
  },

  university: {
    slug: "university",
    h1: "Medical certificate for university.",
    heroSubheadline:
      `University absence documentation for short illness. An AHPRA-registered doctor reviews your answers and decides whether a certificate is clinically appropriate. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "When uni requires medical evidence",
    explainerSubtitle: "For routine university absence evidence where online doctor review is clinically suitable.",
    explainerParagraphs: [
      "If illness has affected your attendance, tutorials, labs, placement preparation, or ordinary study duties, your university may ask for medical evidence. This page is for routine university absence documentation, not provider-specific forms or detailed academic reports.",
      "You answer a structured health form covering your symptoms, when they started, the university dates affected, and whether your course or placement creates extra safety requirements. A doctor reviews those answers before deciding whether a certificate can be issued.",
      "If approved, your certificate is emailed as a PDF with standard doctor-issued details. University policies vary by faculty, campus, course, and deadline. Check the policy before applying, especially if the request relates to an assessment process or placement.",
    ],
    detailSections: [
      {
        title: "When online review fits",
        body:
          "Online review is best suited to short, low-risk university absences where the clinical story is clear and the requested dates match the illness described.",
        items: [
          "Short absence from lectures, tutorials, labs, online attendance, or ordinary study duties",
          "Common acute illness such as cold, flu, gastro, migraine, period pain, or a mental health day",
          "No placement clearance, fitness-to-attend wording, or university-specific form required",
        ],
      },
      {
        title: "What the doctor checks",
        body:
          "The doctor checks whether the symptoms, timing, affected university dates, and safety answers support routine absence evidence.",
        items: [
          "When symptoms started and whether they affected attendance or study capacity",
          "Whether the requested dates are clinically reasonable for the condition described",
          "Whether red-flag symptoms, placement duties, or course requirements point to in-person care",
        ],
      },
      {
        title: "What the certificate includes",
        body:
          "A routine university certificate focuses on whether you were medically unfit for study or usual duties for a period. It usually does not need diagnosis details.",
        items: [
          "Your name, review date, recommended absence dates, and doctor details",
          "A statement about unfitness for study, attendance, or usual duties for the relevant period",
          "Verification details so the document can be checked if required",
        ],
      },
      {
        title: "When it may not be enough",
        body:
          "Some university processes need more than a standard certificate. We keep those boundaries clear before a certificate is issued.",
        items: [
          "University forms, detailed academic reports, placement clearance, or fitness-to-attend wording",
          "Long absences, repeated absences, disability support, or ongoing course adjustments",
          "Severe symptoms, injury, or any situation where the doctor needs to examine you",
        ],
      },
    ],
    recognitionTitle: "Evidence for universities",
    recognitionSubtitle:
      "University policies vary by institution, faculty, and course. Check your evidence requirements before applying.",
    recognitionBadges: [
      { label: "Universities", sub: "Check policy" },
      { label: "TAFE & RTOs", sub: "Use study page" },
      { label: "Private providers", sub: "Policy dependent" },
    ],
    ctaTitle: "Get the documentation your uni needs",
    ctaSubtitle:
      "Quick form. Real doctor review. Certificate to your inbox if approved.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: `Medical Certificate for University | Student Absence ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Request a medical certificate for university absence. AHPRA-registered doctors review your answers. From ${PRICING_DISPLAY.MED_CERT}. University policies vary.`,
      keywords: [
        "medical certificate for university",
        "uni medical certificate",
        "student absence medical certificate",
        "university medical certificate australia",
        "medical certificate for uni absence",
        "university absence certificate",
      ],
    },
    faqs: [
      {
        question: "Can I submit this to my university?",
        answer:
          "You can submit it where your university allows routine medical certificates as absence evidence. InstantMed certificates are issued by AHPRA-registered doctors and include standard doctor, date, and absence details. University policies and deadlines vary.",
      },
      {
        question: "Can I use this as university absence documentation?",
        answer:
          "Yes, where your university accepts a standard medical certificate for absence documentation. It can support short illness-related absence from usual study duties, but it does not replace university-specific forms or detailed reports.",
      },
      {
        question: "What if my university needs extra documentation?",
        answer:
          "Check your university's policy before submitting. Some requests require a university form, extra wording, a treating practitioner report, or an in-person assessment. Those may be outside InstantMed's online certificate scope.",
      },
      {
        question: "What if my request is tied to a deadline?",
        answer:
          "Check the deadline and evidence rules before applying. Doctor review timing depends on clinical review and whether more information is needed, so do not rely on this pathway for an urgent university cutoff.",
      },
      {
        question: "Will the certificate include my diagnosis?",
        answer:
          "Usually no. Routine university absence evidence normally focuses on whether you were medically unfit for study or usual duties for the relevant period. Private clinical details are usually not needed.",
      },
      {
        question: "When should I not use this pathway?",
        answer:
          "Do not use a standard university certificate for emergencies, placement clearance, fitness-to-attend decisions, disability support reports, insurance claims, legal processes, or symptoms that need urgent or in-person care.",
      },
    ],
  },

  school: {
    slug: "school",
    h1: "Medical certificate for school.",
    heroSubheadline:
      `Documentation for your child's school absence. An AHPRA-registered doctor reviews your answers and decides whether a certificate is clinically appropriate. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "When schools require medical evidence",
    explainerSubtitle: "For school-aged children with short illness-related absences.",
    explainerParagraphs: [
      "If your child has been unwell and missed school, the school may ask for medical evidence. This page is for routine school absence documentation where a doctor can make a safe decision from the history you provide as the parent or guardian.",
      "You complete a structured form describing your child's symptoms, when they started, the school dates missed, and any safety concerns. For children, the doctor may ask follow-up questions or request a brief call before deciding whether a certificate can be issued.",
      "If approved, the certificate is emailed as a PDF with standard doctor-issued details. School attendance policies vary. Some schools, childcare services, or programs may need different wording, an in-person assessment, or a return-to-school clearance rather than a routine absence certificate.",
    ],
    detailSections: [
      {
        title: "When online review fits",
        body:
          "Online review is best suited to school-aged children with short, clearly described illness where the doctor does not need to examine the child in person.",
        items: [
          "Short absence from primary or secondary school due to common acute illness",
          "Symptoms are mild or improving, and the requested dates match the illness history",
          "A parent or guardian can provide enough detail about symptoms, timing, and care so far",
        ],
      },
      {
        title: "What the doctor checks",
        body:
          "The doctor checks whether the child's symptoms, timing, age, absence dates, and safety answers support routine school absence documentation.",
        items: [
          "When symptoms started, whether they are improving, and whether the child is drinking and passing urine",
          "Whether fever, pain, breathing, rash, dehydration, injury, or drowsiness needs urgent or in-person care",
          "Whether the request is for absence evidence only, not clearance to return after a contagious illness",
        ],
      },
      {
        title: "What the certificate includes",
        body:
          "A routine school certificate focuses on the child's inability to attend school for a period. It usually does not need diagnosis details.",
        items: [
          "Child's name, review date, recommended absence dates, and doctor details",
          "A statement about unfitness for school or usual activities for the relevant period",
          "Verification details so the school can check the document if required",
        ],
      },
      {
        title: "When it may not be enough",
        body:
          "Some child health and school situations need a different pathway. The doctor will not issue a routine certificate if online review is not safe.",
        items: [
          "Return-to-school clearance, childcare clearance, infectious-disease exclusion decisions, or program-specific forms",
          "Children who are very young, worsening, dehydrated, unusually drowsy, short of breath, or in severe pain",
          "Long absences, repeated absences, injury, complex conditions, or any situation needing examination",
        ],
      },
    ],
    recognitionTitle: "School documentation",
    recognitionSubtitle:
      "School attendance policies vary. Check whether your school needs a routine absence certificate, a clearance document, or its own form.",
    recognitionBadges: [
      { label: "Primary & secondary", sub: "Public & private" },
      { label: "AHPRA doctors", sub: "Doctor-issued" },
      { label: "Parent completes form", sub: "On behalf of child" },
    ],
    ctaTitle: "Documentation for school absences",
    ctaSubtitle:
      "Parent-completed form. Doctor review. Certificate to your inbox if approved.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: `Medical Certificate for School | Child Absence ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Request a medical certificate for school absence. AHPRA-registered doctors review parent or guardian answers. From ${PRICING_DISPLAY.MED_CERT}. School policies vary.`,
      keywords: [
        "medical certificate for school",
        "school absence certificate",
        "child sick certificate",
        "school medical certificate australia",
        "child school absence certificate",
        "doctor certificate for school absence",
      ],
    },
    faqs: [
      {
        question: "Can I get a certificate for my child's school absence?",
        answer:
          "Yes, where online review is clinically appropriate. A parent or guardian completes the form on behalf of the child. The doctor reviews the answers and may ask follow-up questions or request a brief call for child-safety reasons.",
      },
      {
        question: "Can I submit it to the school?",
        answer:
          "You can submit it where your school allows routine medical certificates as absence evidence. InstantMed certificates are issued by AHPRA-registered doctors and include standard doctor, date, and absence details. School policies vary.",
      },
      {
        question: "Do I need to be the child's parent?",
        answer:
          "The person requesting the certificate should be the parent or guardian. You provide your details, your child's details, and a clear description of the illness and school dates missed.",
      },
      {
        question: "Does this clear my child to return to school?",
        answer:
          "No. A routine school absence certificate documents illness-related absence. It is not a return-to-school clearance, childcare clearance, or infectious-disease exclusion decision.",
      },
      {
        question: "Will the certificate include my child's diagnosis?",
        answer:
          "Usually no. Routine school absence evidence normally focuses on whether the child was medically unfit for school for the relevant period. Diagnosis details are usually not needed.",
      },
      {
        question: "When should I not use this pathway?",
        answer:
          "Do not use online review for a child who is very unwell, dehydrated, unusually drowsy, short of breath, in severe pain, injured, or worsening. Seek urgent or in-person care instead.",
      },
    ],
  },

  "return-to-work": {
    slug: "return-to-work",
    h1: "Return-to-work clearances need the right pathway.",
    heroSubheadline:
      "InstantMed's short certificate pathway is for routine sick leave. Return-to-work, site medical, and fitness-for-duty clearances need in-person or employer-directed assessment.",
    explainerTitle: "When employers ask for clearance",
    explainerSubtitle: "Some employer requests are not simple sick-leave certificates.",
    explainerParagraphs: [
      "If your employer has asked for clearance before you return, check whether they need a site medical, capacity statement, fit-for-duty clearance, or return-to-work form. Those requests usually need in-person or occupational-health assessment.",
      "InstantMed can help with routine short sick-leave evidence only when online review is clinically appropriate. It does not issue fitness-for-duty, safety-critical, or return-to-work clearance documents.",
    ],
    recognitionTitle: "Not a clearance pathway",
    recognitionSubtitle:
      "Routine sick certificates document an absence period. They do not certify capacity, restrictions, or safe return to a role.",
    recognitionBadges: [
      { label: "Office & general work", sub: "Desk-based roles" },
      { label: "AHPRA doctors", sub: "Clinical assessment" },
      { label: "Employer policies vary", sub: "Check requirements" },
    ],
    ctaTitle: "Need routine sick-leave evidence instead?",
    ctaSubtitle:
      "Use the main certificate pathway only for simple sick, study, or carer's leave.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: `Return to Work Certificate | Doctor Assessment ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Return to work certificate from AHPRA-registered doctors. Doctor assesses your recovery and may issue a certificate if appropriate. From ${PRICING_DISPLAY.MED_CERT}. Employer policies vary.`,
      keywords: [
        "return to work medical evidence",
        "fitness for duty medical pathway",
        "site medical assessment",
        "return to work clearance requirements",
      ],
    },
    faqs: [
      {
        question: "What is a return-to-work clearance?",
        answer:
          "It is a document requested by some employers before a worker returns after illness or injury. It may involve capacity, restrictions, safety-critical duties, or occupational-health requirements, which are different from a simple sick-leave certificate.",
      },
      {
        question: "When might an employer require a return to work certificate?",
        answer:
          "Some employers ask for a certificate after extended sick leave, or as part of their return-to-work policy. Their policy will specify when documentation is needed.",
      },
      {
        question: "Can you provide certificates for safety-critical roles?",
        answer:
          "No. Safety-critical roles, driving, heavy machinery, site medicals, and fit-for-duty requests need the employer's own pathway or in-person assessment.",
      },
      {
        question: "Will my employer accept it?",
        answer:
          "Our certificates are issued by AHPRA-registered doctors. Employer policies vary; some assess telehealth certificates under their own policies, others may have specific requirements or require in-person assessment for certain roles. Check with your employer.",
      },
    ],
  },

  centrelink: {
    slug: "centrelink",
    h1: "Centrelink medical evidence usually needs specific forms.",
    heroSubheadline:
      "InstantMed's short certificate pathway is for routine sick leave, not Services Australia forms or functional-capacity reports.",
    explainerTitle: "When Centrelink needs medical evidence",
    explainerSubtitle: "Services Australia requirements vary by payment type and circumstance.",
    explainerParagraphs: [
      "If Services Australia has asked for medical evidence, check the requested form or document type before booking. JobSeeker, DSP, Carer Payment, and participation matters often need specific forms, functional-capacity detail, or a treating-practitioner report.",
      "InstantMed can help with routine short sick-leave evidence only. It does not complete Centrelink-specific forms or government-program capacity reports through the short certificate pathway.",
    ],
    recognitionTitle: "Use the right evidence pathway",
    recognitionSubtitle:
      "Specific Services Australia forms should go through your regular GP or treating practitioner.",
    recognitionBadges: [
      { label: "Services Australia", sub: "Specific forms may apply" },
      { label: "Capacity reports", sub: "Treating-practitioner pathway" },
      { label: "AHPRA doctors", sub: "Doctor-issued" },
    ],
    ctaTitle: "Need routine sick-leave evidence instead?",
    ctaSubtitle:
      "Quick form, doctor review. Certificate to your inbox if approved.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: "Centrelink Medical Evidence | Check Requirements First",
      description:
        "Centrelink and Services Australia medical evidence often needs specific forms or functional-capacity details. InstantMed's short certificate pathway is for routine sick leave only.",
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
          "Do not assume so. Services Australia may require specific forms, functional-capacity details, or a report from your regular treating practitioner.",
      },
      {
        question: "What if Centrelink needs a specific form?",
        answer:
          "Some Centrelink claims require their own forms. Use your regular GP or treating practitioner for Centrelink-specific forms and capacity reports.",
      },
      {
        question: "How quickly can I get it?",
        answer:
          "Plan ahead for Centrelink deadlines. If a specific form is requested, book with your regular GP or treating practitioner rather than using the short sick-certificate pathway.",
      },
    ],
  },
  anxiety: {
    slug: "anxiety",
    h1: "Medical certificate for anxiety.",
    heroSubheadline:
      `Anxiety is a legitimate medical condition. A doctor reviews your request. No judgement, no waiting rooms. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "Anxiety is a valid reason to take time off",
    explainerSubtitle: "Mental health conditions, including anxiety, are covered under sick leave laws in Australia.",
    explainerParagraphs: [
      "Anxiety, panic disorder, and stress-related conditions are legitimate medical reasons to take time off work or study. Our AHPRA-registered doctors assess your situation the same way they would any other health condition, with clinical judgement, not assumptions.",
      "You describe your symptoms in a quick form. A doctor reviews it and makes a clinical decision. If approved, your certificate lands in your inbox as a PDF. No phone call required in most cases.",
    ],
    recognitionTitle: "Workplace evidence",
    recognitionSubtitle:
      "Medical certificates for anxiety and mental health conditions include standard workplace evidence details. Employer policies may vary.",
    recognitionBadges: [
      { label: "Mental health recognised", sub: "Same as physical illness" },
      { label: "Workplace evidence", sub: "Policy dependent" },
      { label: "No judgement", sub: "Confidential assessment" },
    ],
    ctaTitle: "Your mental health matters",
    ctaSubtitle:
      "A two-minute form, real doctor review. Certificate to your inbox. No appointment needed.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: `Medical Certificate for Anxiety | Mental Health Days ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Get a medical certificate for anxiety or mental health days. AHPRA-registered doctors review your request. From ${PRICING_DISPLAY.MED_CERT}. No waiting rooms.`,
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
          "Medical certificates for mental health conditions, including anxiety, can support workplace evidence requirements. Employer policies and circumstances may vary.",
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
      `Fever, aches, can't get out of bed? Request your sick note from home. A doctor reviews your request. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "Get your certificate without leaving the house",
    explainerSubtitle: "Influenza and flu-like illness are among the most common reasons for work absence.",
    explainerParagraphs: [
      "When you have the flu, the last thing you want to do is drive to a clinic. Our AHPRA-registered doctors review your symptoms and issue a certificate if clinically appropriate, all online, while you stay in bed.",
      "Flu certificates typically cover 1–5 days depending on symptom severity. You describe your symptoms and how long you've been unwell. The doctor determines the appropriate duration.",
    ],
    recognitionTitle: "Workplace evidence",
    recognitionSubtitle:
      "Flu certificates include standard doctor and absence details. Employer policies may vary.",
    recognitionBadges: [
      { label: "Workplace evidence", sub: "Policy dependent" },
      { label: "Workplace evidence", sub: "Policy dependent" },
      { label: "Stay home", sub: "No clinic visit needed" },
    ],
    ctaTitle: "Rest up. We'll handle the paperwork.",
    ctaSubtitle:
      "Two minutes on your phone. Doctor review. Certificate to your inbox.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: `Medical Certificate for Flu | Sick Note Online ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Get a medical certificate for flu or influenza. AHPRA-registered doctors review your request online. Stay home, no clinic visit needed. From ${PRICING_DISPLAY.MED_CERT}.`,
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
          "Our AHPRA-registered doctors assess your flu symptoms via a quick questionnaire and issue a certificate if clinically appropriate. Employer policies may vary.",
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
    h1: "Medical certificate for work-from-home related absence.",
    heroSubheadline:
      `If illness affects attendance at your usual workplace, an AHPRA-registered doctor can assess whether routine sick-leave evidence is clinically appropriate. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "Work-from-home requests and medical evidence",
    explainerSubtitle: "For short illness-related absences where your employer asks for medical evidence. It does not approve remote work.",
    explainerParagraphs: [
      "Some employers ask for medical evidence when illness affects attending the workplace, commuting, or performing usual onsite duties. A routine certificate can document a period of medical unfitness when clinically appropriate, but your employer decides how that evidence applies to sick leave, remote work, or flexible-work policies.",
      "You answer a structured health form covering your symptoms, when they started, the dates you need covered, and how the illness affects attendance or usual duties. The doctor reviews whether routine sick-leave evidence is appropriate, or whether the request needs an in-person, occupational-health, or employer-specific assessment instead.",
      "If approved, your certificate is emailed as a PDF with standard workplace evidence details. It does not direct your employer to approve work from home, certify fitness for remote work, set workplace restrictions, or complete an ergonomic, WorkCover, disability-support, or flexible-work report.",
    ],
    recognitionTitle: "Workplace documentation",
    recognitionSubtitle:
      "Certificates document a routine absence period. Employer WFH policies vary and may require different evidence.",
    recognitionBadges: [
      { label: "Routine evidence", sub: "Absence period" },
      { label: "Employer policy", sub: "Varies by workplace" },
      { label: "No capacity report", sub: "Standard certificate only" },
    ],
    detailSections: [
      {
        title: "When online review fits",
        body:
          "Online review is best suited to short illness-related absences where your employer needs routine evidence, not a detailed capacity or workplace-adjustment report.",
        items: [
          "A short illness affecting your ability to attend the workplace, commute, or perform usual duties",
          "Symptoms that can be assessed safely online without a physical examination",
          "No employer-specific WFH form, fitness-for-duty assessment, workplace injury claim, or long-term restrictions required",
        ],
      },
      {
        title: "What the doctor checks",
        body:
          "The doctor checks whether your symptoms, timing, work impact, and requested dates support routine absence evidence.",
        items: [
          "When symptoms started, whether they are improving, and whether any red flags require in-person care",
          "Whether the issue is routine sick leave evidence rather than a request to certify remote-work capacity",
          "Whether the requested date range is proportionate to the clinical information provided",
        ],
      },
      {
        title: "What the certificate includes",
        body:
          "If approved, the certificate includes the standard details employers usually need for sick-leave evidence.",
        items: [
          "Your name, the doctor's details, the review date, and the medically appropriate absence period",
          "A statement about medical unfitness for work or usual duties for the stated period",
          "Verification details your employer can use to confirm the certificate came from InstantMed",
        ],
      },
      {
        title: "When a standard certificate is not enough",
        body:
          "Some work-from-home requests need a different document or an in-person assessment.",
        items: [
          "Formal flexible-work, disability accommodation, ergonomic, occupational-health, or employer-specific WFH forms",
          "Fitness-for-duty, return-to-work, safety-critical, driving, or workplace-restriction certificates",
          "WorkCover, workers compensation, insurance, legal, or long-term capacity documentation",
        ],
      },
    ],
    ctaTitle: "Request routine absence evidence",
    ctaSubtitle:
      "Complete the health form so a doctor can assess whether a standard certificate is appropriate.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: `Medical Certificate Work From Home | WFH Evidence ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Request routine medical evidence for a work-from-home related absence. AHPRA-registered doctors review your answers. From ${PRICING_DISPLAY.MED_CERT}. Employer policies vary.`,
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
          "Not as a direction to your employer. InstantMed can only provide routine sick-leave evidence if the doctor decides it is clinically appropriate. Your employer decides whether that evidence supports sick leave, work from home, or another workplace arrangement.",
      },
      {
        question: "Will my employer accept this?",
        answer:
          "Our certificates are issued by AHPRA-registered doctors, but employer WFH policies vary. Some workplaces assess telehealth certificates under their ordinary evidence policy; others require their own forms, occupational-health review, or manager approval.",
      },
      {
        question: "What conditions qualify for a WFH certificate?",
        answer:
          "The doctor assesses the clinical situation rather than a fixed list. Short illnesses such as respiratory infection, gastro, migraine, pain flare, or recovery symptoms may support routine absence evidence if the online assessment is clinically appropriate.",
      },
      {
        question: "Can it say I am fit to work remotely?",
        answer:
          "No. A routine medical certificate documents unfitness for work or usual duties for a period. It does not certify fitness for remote work, modified duties, workplace restrictions, or capacity.",
      },
      {
        question: "What if my employer needs a special WFH or accommodation form?",
        answer:
          "Use your regular GP, treating specialist, occupational-health provider, or the pathway specified by your employer. Those forms often need functional capacity detail, workplace context, or an examination that is outside a short online certificate pathway.",
      },
      {
        question: "When should I not use this pathway?",
        answer:
          "Do not use this pathway for a workplace injury, WorkCover claim, return-to-work clearance, long-term restrictions, safety-critical duties, legal or insurance reports, or symptoms that need urgent or in-person care.",
      },
    ],
  },

  migraine: {
    slug: "migraine",
    h1: "Medical certificate for migraine.",
    heroSubheadline:
      `Migraine symptoms can make work unsafe or impractical. An AHPRA-registered doctor reviews your answers and decides whether a certificate is clinically appropriate. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "Migraine and work absence",
    explainerSubtitle: "For short migraine-related absences where online doctor review is clinically suitable.",
    explainerParagraphs: [
      "Migraine can involve severe headache, nausea, vomiting, light or sound sensitivity, visual symptoms, dizziness, and cognitive fog. Those symptoms can affect driving, screen use, concentration, safety-critical work, and ordinary work capacity.",
      "You answer a structured health form covering when symptoms started, whether this is your usual migraine pattern, the dates you need covered, what makes work unsafe or impractical, and any red flags that would make online review inappropriate.",
      "If approved, your certificate is emailed as a PDF with standard workplace evidence details. A routine migraine certificate documents absence. It is not a migraine management plan, a fitness-for-duty certificate, or a substitute for urgent assessment when headache symptoms are new, severe, unusual, or associated with neurological warning signs.",
    ],
    recognitionTitle: "Workplace evidence",
    recognitionSubtitle:
      "Medical certificates for migraines include standard workplace evidence details. Employer policies may vary.",
    recognitionBadges: [
      { label: "Clinical review", sub: "Pattern and red flags" },
      { label: "Workplace evidence", sub: "Policy dependent" },
      { label: "Short absences", sub: "Doctor assessed" },
    ],
    detailSections: [
      {
        title: "When online review fits",
        body:
          "Online review is best suited to short migraine-related absences where the symptoms are consistent with your usual pattern and no physical examination is needed.",
        items: [
          "Known or recurrent migraine symptoms affecting your ability to work, study, commute, or use screens safely",
          "A short absence where symptoms are improving, self-care is manageable, and the requested dates are clear",
          "No sudden worst-ever headache, neurological deficit, head injury, fever, neck stiffness, or pregnancy concern",
        ],
      },
      {
        title: "What the doctor checks",
        body:
          "The doctor checks whether your symptoms, timing, work impact, usual migraine history, and requested dates support routine absence evidence.",
        items: [
          "When the headache began, how severe it is, and whether it matches previous migraine episodes",
          "Associated symptoms such as aura, visual disturbance, nausea, vomiting, light sensitivity, or cognitive fog",
          "Whether the story suggests a red flag headache that needs urgent or in-person assessment instead",
        ],
      },
      {
        title: "What the certificate includes",
        body:
          "If approved, the certificate includes the standard information employers usually need for sick-leave evidence without publishing unnecessary clinical detail.",
        items: [
          "Your name, the doctor's details, the review date, and the period assessed as medically appropriate",
          "A statement that you were medically unfit for work or study for the stated period",
          "Verification details your employer or institution can use to check the document came from InstantMed",
        ],
      },
      {
        title: "When a standard certificate is not enough",
        body:
          "Some migraine or headache situations need more than a routine online absence certificate.",
        items: [
          "First, worst, sudden, unusual, or progressively worsening headache",
          "Weakness, numbness, confusion, fainting, speech trouble, vision loss, fever, neck stiffness, head injury, or persistent vomiting",
          "Fitness-for-duty, driving, safety-critical work, workplace restriction, insurance, workers compensation, or long-term migraine management documentation",
        ],
      },
    ],
    ctaTitle: "Request migraine absence evidence",
    ctaSubtitle:
      "Complete the health form so a doctor can assess whether routine certificate evidence is appropriate.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: `Medical Certificate for Migraine | Sick Note Online ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Request a medical certificate for migraine absence. AHPRA-registered doctors review your answers online. From ${PRICING_DISPLAY.MED_CERT}. Employer policies vary.`,
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
          "Online review may be suitable for a short migraine-related absence if your symptoms, timing, history, and requested dates support routine certificate evidence. The doctor decides whether a certificate is clinically appropriate.",
      },
      {
        question: "How long will the certificate cover?",
        answer:
          "The doctor decides the period after reviewing your answers. Routine online certificates are best suited to short absences; recurrent, prolonged, or complex migraine patterns may need review by your regular GP or treating specialist.",
      },
      {
        question: "Do I need to have a diagnosis of migraine?",
        answer:
          "Not always. Describe your symptoms accurately, including whether this matches previous episodes or is new for you. New, severe, unusual, or changing headache symptoms may need urgent or in-person assessment rather than a routine online certificate.",
      },
      {
        question: "Will the certificate show my migraine diagnosis?",
        answer:
          "Routine certificates usually state the period you were medically unfit for work or study. They do not need to disclose your diagnosis unless there is a specific clinical or administrative reason.",
      },
      {
        question: "What if I drive or do safety-critical work?",
        answer:
          "Tell the doctor about your duties. A routine medical certificate documents absence only; it does not certify fitness to drive, return to safety-critical duties, or perform modified work.",
      },
      {
        question: "When should I not use this pathway?",
        answer:
          "Do not use this pathway for a sudden worst-ever headache, new neurological symptoms, head injury, fever with neck stiffness, fainting, pregnancy-related concern, severe dehydration, or any symptoms that feel dangerous or unusual for you. Seek urgent care instead.",
      },
    ],
  },

  gastro: {
    slug: "gastro",
    h1: "Medical certificate for gastro.",
    heroSubheadline:
      `Gastro symptoms can make work unsafe or impractical. An AHPRA-registered doctor reviews your answers and decides whether a certificate is clinically appropriate. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "Gastro and stomach illness",
    explainerSubtitle: "For short gastro illness where online doctor review is clinically suitable.",
    explainerParagraphs: [
      "Gastroenteritis can cause vomiting, diarrhoea, cramps, nausea, fever, and fatigue. For many people it is short-lived, but it can affect travel, food handling, care work, concentration, and basic work capacity while symptoms are active.",
      "You answer a structured health form covering when symptoms started, how often you have vomited or had diarrhoea, whether you can keep fluids down, the dates you need covered, and any red flags that would make online review unsafe.",
      "If approved, your certificate is emailed as a PDF with standard workplace evidence details. A routine gastro certificate documents absence. It is not a return-to-food-handling clearance or a substitute for urgent care if dehydration, blood, severe pain, pregnancy concerns, or worsening symptoms are present.",
    ],
    detailSections: [
      {
        title: "When online review fits",
        body:
          "Online review is best suited to short, uncomplicated gastro symptoms where the clinical story is clear and no physical examination is needed.",
        items: [
          "Vomiting, diarrhoea, nausea, cramps, or fatigue affecting work capacity",
          "A short absence where symptoms are mild, improving, and hydration is manageable",
          "No blood, severe abdominal pain, fainting, pregnancy concern, or severe dehydration",
        ],
      },
      {
        title: "What the doctor checks",
        body:
          "The doctor checks whether your symptoms, timing, hydration, work duties, and requested dates support routine absence evidence.",
        items: [
          "When symptoms started, how frequent they are, and whether they are improving",
          "Whether you can keep fluids down and are passing urine normally",
          "Whether food handling, healthcare, childcare, driving, or safety-critical work changes the advice",
        ],
      },
      {
        title: "What the certificate includes",
        body:
          "A routine gastro certificate focuses on work capacity and absence dates. It usually does not need to disclose the exact diagnosis or symptom details.",
        items: [
          "Your name, review date, recommended absence dates, and doctor details",
          "A statement that you were unfit for usual work duties for the relevant period",
          "Verification details so the document can be checked if required",
        ],
      },
      {
        title: "When it may not be enough",
        body:
          "Gastro can create infection-control or safety questions beyond a standard absence certificate.",
        items: [
          "Food-handler return rules, workplace infection-control clearance, or childcare exclusion requirements",
          "Blood in vomit or stool, severe abdominal pain, fainting, confusion, or signs of dehydration",
          "Pregnancy, very young children, older adults, immunocompromise, or symptoms that are worsening",
        ],
      },
    ],
    recognitionTitle: "Workplace evidence",
    recognitionSubtitle:
      "Gastro certificates include standard doctor and absence details. Employer policies may vary.",
    recognitionBadges: [
      { label: "Workplace evidence", sub: "Policy dependent" },
      { label: "Clinical assessment", sub: "Doctor-reviewed" },
      { label: "1-3 days", sub: "If clinically appropriate" },
    ],
    ctaTitle: "Stay home. Get the paperwork sorted.",
    ctaSubtitle:
      "Short form. A doctor reviews your answers. Certificate to your inbox if approved.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: `Medical Certificate for Gastro | Sick Note Online ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Request a medical certificate for gastro or gastroenteritis. AHPRA-registered doctors review your answers online. From ${PRICING_DISPLAY.MED_CERT}. Employer policies vary.`,
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
          "Yes, where online review is clinically appropriate. You describe your symptoms, timing, hydration, work duties, and requested dates. The doctor decides whether a certificate can be issued safely from that information.",
      },
      {
        question: "How many days will a gastro certificate cover?",
        answer:
          "The doctor decides what absence period is clinically appropriate. Many routine gastro certificates cover short absences of 1-3 days, but persistent, worsening, or severe symptoms may need in-person care.",
      },
      {
        question: "Do I need to get tested for the specific bug?",
        answer:
          "Usually no for a routine absence certificate. Testing may be needed if symptoms are severe, prolonged, outbreak-related, work-related, or linked to food-safety rules. The doctor will redirect you if testing or in-person care is needed.",
      },
      {
        question: "Will the certificate say I had gastro?",
        answer:
          "Usually no. Routine workplace evidence normally focuses on whether you were unfit for usual duties for the relevant period. Diagnosis and symptom details are usually not needed.",
      },
      {
        question: "What if I handle food, work in healthcare, or work with children?",
        answer:
          "Tell the doctor in the form. Food handling, healthcare, aged care, and childcare can have stricter infection-control rules. A routine absence certificate is not the same as a return-to-work or food-handling clearance.",
      },
      {
        question: "When should I not use this pathway?",
        answer:
          "Do not use online review for blood in vomit or stool, severe abdominal pain, fainting, confusion, pregnancy concerns, severe dehydration, inability to keep fluids down, or symptoms that are worsening. Seek urgent or in-person care.",
      },
    ],
  },

  "back-pain": {
    slug: "back-pain",
    h1: "Medical certificate for back pain.",
    heroSubheadline:
      `Back pain can make it impossible to sit, stand, or drive. Get your certificate without the commute. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "When back pain stops you working",
    explainerSubtitle: "Acute and chronic back pain are among the leading causes of workplace absence in Australia.",
    explainerParagraphs: [
      "Back pain can range from acute muscle strain to severe disc issues that make movement, sitting, or standing unbearable. Our AHPRA-registered doctors assess your situation and can issue a certificate if you're genuinely unable to perform your work duties.",
      "Describe your symptoms, how they started, and how they're affecting your ability to work. The doctor makes the clinical determination. For ongoing back conditions, you may need periodic certificates. Each request is assessed individually.",
    ],
    recognitionTitle: "Workplace evidence",
    recognitionSubtitle:
      "Certificates for back pain include standard workplace evidence details. Employer policies may vary.",
    recognitionBadges: [
      { label: "Acute & chronic", sub: "All back conditions" },
      { label: "Workplace evidence", sub: "Policy dependent" },
      { label: "No commute required", sub: "Stay home to rest" },
    ],
    ctaTitle: "Documentation while you rest",
    ctaSubtitle:
      "Quick form. Doctor review. Certificate to your inbox. No driving required.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: `Medical Certificate for Back Pain | Sick Note Online ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Get a medical certificate for back pain. AHPRA-registered doctors review your request online. No commute required. From ${PRICING_DISPLAY.MED_CERT}.`,
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
      `Tested positive? Get your isolation certificate without leaving home. A doctor reviews your request. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "COVID certificates and isolation documentation",
    explainerSubtitle: "Many employers still require documentation for COVID-related absences.",
    explainerParagraphs: [
      "While mandatory isolation periods are no longer legally required in most of Australia, many employers still ask for documentation when staff test positive for COVID-19. Our AHPRA-registered doctors can issue a medical certificate documenting your illness and the period of unfitness.",
      "You describe your test result, symptoms, and how long you've been unwell. The doctor reviews and issues a certificate if appropriate. No need to visit a clinic while infectious.",
    ],
    recognitionTitle: "Employer policies vary",
    recognitionSubtitle:
      "COVID certificates are issued by AHPRA-registered doctors and used for workplace documentation. Mandatory isolation rules vary by state. Check your state health authority for current requirements.",
    recognitionBadges: [
      { label: "Workplace evidence", sub: "Policy dependent" },
      { label: "Stay isolated", sub: "No clinic visit needed" },
      { label: "RAT or PCR positive", sub: "Accepted" },
    ],
    ctaTitle: "Isolate safely. Get your paperwork sorted.",
    ctaSubtitle:
      "Two-minute form. Doctor review. Certificate to your inbox.",
    ctaButtonText: "Get your certificate",
    metadata: {
      title: `Medical Certificate for COVID-19 | Isolation Certificate ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Get a medical certificate for COVID-19. AHPRA-registered doctors review your request. Stay isolated, no clinic visit needed. From ${PRICING_DISPLAY.MED_CERT}.`,
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
          "Our AHPRA-registered doctors review your self-reported test result and symptoms and issue a certificate if clinically appropriate. Employer policies may vary.",
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
