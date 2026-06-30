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
  relatedLinks?: Array<{
    href: string
    label: string
    description: string
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
      `Need routine evidence for a short work absence? Complete a secure form so a doctor can assess whether a work certificate is appropriate. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "Work absence evidence",
    explainerSubtitle: "For short work absences where online doctor review is clinically suitable.",
    explainerParagraphs: [
      "If illness or injury stops you attending work, your employer may ask for evidence for the absence period. This page is for routine short absences where a doctor can make a safe decision from your history without examining you in person.",
      "You answer a structured health form covering your symptoms, when they started, the work dates affected, how your duties or commute are affected, and safety answers that help the doctor decide whether online review is appropriate.",
      "An approved certificate includes standard absence evidence. It is not employer policy advice, a return-to-work clearance, a fit-for-duty assessment, a workplace adjustment letter, workers compensation evidence, or a document requiring capacity or restriction wording.",
    ],
    detailSections: [
      {
        title: "When online review fits",
        body:
          "Online review is best suited to short work absences where the request is for routine evidence and symptoms are clear from your history.",
        items: [
          "A short illness or minor injury affecting attendance, concentration, physical duties, customer-facing work, commuting, or usual work duties",
          "Symptoms that are stable or improving, with no red flags suggesting urgent or in-person care is needed",
          "No employer-specific form, workplace adjustment, work-from-home approval, capacity wording, or return-to-work clearance required",
        ],
      },
      {
        title: "What the doctor checks",
        body:
          "The doctor checks whether your symptoms, timing, requested dates, role context, and safety answers support routine absence evidence.",
        items: [
          "When symptoms started, which work dates were affected, and whether symptoms are improving, unchanged, or worsening",
          "How the illness or injury affects attendance, concentration, physical duties, customer-facing duties, driving, machinery, or commuting",
          "Whether chest pain, breathing difficulty, fainting, neurological symptoms, severe pain, significant injury, or worsening illness point to in-person care",
        ],
      },
      {
        title: "What the certificate includes",
        body:
          "A routine work certificate focuses on the absence period. It does not usually need to list your diagnosis or private symptom detail.",
        items: [
          "Your name, the doctor's details, the review date, and the medically appropriate absence period",
          "A standard statement that you were unable to attend work duties for the stated period",
          "Verification details your employer can use to confirm the certificate came from InstantMed",
        ],
      },
      {
        title: "When a standard certificate is not enough",
        body:
          "Some work-related requests need your regular GP, an occupational-health provider, an employer pathway, or in-person assessment.",
        items: [
          "Return-to-work clearance, fit-for-duty, capacity, restrictions, safe-driving, machinery, site medical, or safety-critical role documents",
          "Workers compensation, insurance, legal, court, workplace investigation, or employer forms that need specific diagnosis or capacity detail",
          "Longer or repeated absences, severe symptoms, significant injury, or any situation where the doctor needs an examination before giving evidence",
        ],
      },
    ],
    recognitionTitle: "Workplace evidence",
    recognitionSubtitle:
      "Work certificates include standard doctor and absence details. Employer policies and workplace requirements may vary.",
    recognitionBadges: [
      { label: "Routine evidence", sub: "Absence period" },
      { label: "Doctor-reviewed", sub: "Clinical decision" },
      { label: "Employer policy", sub: "May vary" },
    ],
    relatedLinks: [
      {
        href: "/medical-certificate/work-from-home",
        label: "Asked to work from home instead?",
        description:
          "Use the work-from-home guidance when the question is modified duties, remote work, or employer permission rather than simple absence evidence.",
      },
      {
        href: "/medical-certificate/employer-acceptance",
        label: "Want workplace evidence guidance?",
        description:
          "Read the employer evidence guide for conservative guidance on online certificates, verification, and policy caveats.",
      },
    ],
    ctaTitle: "Request work absence evidence",
    ctaSubtitle:
      "For short work absences where routine certificate evidence is clinically appropriate.",
    ctaButtonText: "Start certificate request",
    metadata: {
      title: `Medical Certificate for Work | Sick Note Online ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Request a medical certificate for a short work absence. AHPRA-registered doctors review symptoms, requested dates, and safety answers. From ${PRICING_DISPLAY.MED_CERT}. Employer policies vary.`,
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
          "Many employers ask for evidence when you take sick or personal leave. The exact trigger depends on your workplace policy, so check whether they need a standard certificate or a specific employer form.",
      },
      {
        question: "Will my employer accept an online medical certificate?",
        answer:
          "A doctor-issued certificate can support workplace evidence requirements, but employer policies and individual circumstances may vary. Check your workplace policy if you need a specific form, extra wording, or clearance document.",
      },
      {
        question: "What happens after I submit the form?",
        answer:
          "A doctor reviews the information you provide and decides whether routine certificate evidence is clinically appropriate. The outcome may be approval, a request for more information, or redirection to in-person care.",
      },
      {
        question: "Can I get a certificate for a day I've already missed?",
        answer:
          "Enter the exact date or dates you need reviewed. Retrospective certificates depend on the clinical information available and may not be appropriate in every case.",
      },
      {
        question: "How long can a certificate cover?",
        answer:
          "InstantMed's medical certificate pathway is for short absences and is capped at 3 days. The doctor decides the appropriate absence period based on your history. Longer or repeated absences may need your regular GP or treating practitioner.",
      },
      {
        question: "Can the certificate say I can return to work or work from home?",
        answer:
          "No. A routine work certificate documents an absence period when clinically appropriate. Return-to-work clearance, fit-for-duty, workplace restrictions, and work-from-home approvals usually need your employer's pathway, occupational health, or your regular GP.",
      },
    ],
  },

  study: {
    slug: "study",
    h1: "Medical certificate for study.",
    heroSubheadline:
      `Missed class, labs, online attendance, or ordinary study duties because you were unwell? Complete a secure form so a doctor can assess whether routine study evidence is appropriate. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "Study absence evidence",
    explainerSubtitle: "For short study absences where online doctor review is clinically suitable.",
    explainerParagraphs: [
      "If illness has stopped you attending class, placement, tutorials, labs, or ordinary study duties, your education provider may ask for medical evidence. This page is for routine study absence documentation where a doctor can make a safe decision from your history without examining you in person.",
      "You answer a structured health form covering your symptoms, when they started, the study dates affected, and whether anything about your course or placement changes the risk. A doctor reviews those answers before deciding whether a certificate can be issued.",
      "An approved certificate includes the standard doctor-issued details used for routine absence evidence. It is not an automatic document and it is not a substitute for provider-specific forms. Check your institution's policy before applying, especially if deadlines or assessment rules are involved.",
    ],
    detailSections: [
      {
        title: "When online review fits",
        body:
          "Online review is best suited to short, low-risk study absences where the clinical story is clear and the requested dates match the illness described.",
        items: [
          "Short absence from class, tutorials, labs, online attendance, or ordinary study duties",
          "Common acute illness such as cold, flu, gastro, migraine, period pain, anxiety, or stress-related symptoms",
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
        title: "When a standard certificate is not enough",
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
      { label: "Study absence", sub: "Policy dependent" },
      { label: "TAFE & RTOs", sub: "Check provider rules" },
      { label: "Standard certificate", sub: "No provider forms" },
    ],
    relatedLinks: [
      {
        href: "/medical-certificate/university",
        label: "University certificate guidance",
        description: "Use this if your absence is tied to university lectures, tutorials, labs, or campus policy.",
      },
    ],
    ctaTitle: "Request study absence evidence",
    ctaSubtitle:
      "For short illness-related absences where your provider accepts a standard medical certificate.",
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
      `Need leave to care for a sick child, family member, or household member? A doctor reviews the care need and dates before deciding whether a carer's leave certificate is appropriate. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "Carer's leave evidence",
    explainerSubtitle: "For short carer's leave absences where online doctor review is clinically suitable.",
    explainerParagraphs: [
      "If you need time away from work to care for a sick family member or household member, your employer may ask for evidence. A carer's leave certificate is different from a personal sick certificate: it documents the caring need, not your own illness.",
      "You answer a structured form explaining who needs care, what happened, the dates you need covered, and why your support is needed. A doctor reviews those answers before deciding whether a carer's leave certificate can be issued.",
      "An approved certificate should say enough to support the leave reason without disclosing more private information about the person you are caring for than is needed. Employer policies still decide how the document is assessed.",
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
        title: "When a standard certificate is not enough",
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
      { label: "Caring need", sub: "Short absence" },
      { label: "Privacy aware", sub: "Minimal clinical detail" },
      { label: "Employer policy", sub: "May require more" },
    ],
    relatedLinks: [
      {
        href: "/medical-certificate/school",
        label: "School absence certificate",
        description: "Use this if the school needs evidence for the child's own illness-related absence.",
      },
    ],
    ctaTitle: "Request carer's leave evidence",
    ctaSubtitle:
      "For short caring-related absences where routine evidence is clinically appropriate.",
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
      `For short illness-related absences from lectures, tutorials, labs, or ordinary study duties. A doctor checks the illness details against your university dates and course context. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "University absence evidence",
    explainerSubtitle: "For routine university absence evidence where online doctor review is clinically suitable.",
    explainerParagraphs: [
      "If illness has affected your attendance, tutorials, labs, placement preparation, or ordinary study duties, your university may ask for medical evidence. This page is for routine university absence documentation, not provider-specific forms or detailed academic reports.",
      "You answer a structured health form covering your symptoms, when they started, the university dates affected, and whether your course or placement creates extra safety requirements. A doctor reviews those answers before deciding whether a certificate can be issued.",
      "An approved certificate includes standard doctor-issued details for routine absence evidence. University policies vary by faculty, campus, course, and deadline. Check the policy before applying, especially if the request relates to an assessment process or placement.",
    ],
    detailSections: [
      {
        title: "When online review fits",
        body:
          "Online review is best suited to short, low-risk university absences where the clinical story is clear and the requested dates match the illness described.",
        items: [
          "Short absence from lectures, tutorials, labs, online attendance, or ordinary study duties",
          "Common acute illness such as cold, flu, gastro, migraine, period pain, anxiety, or stress-related symptoms",
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
        title: "When a standard certificate is not enough",
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
      { label: "University policy", sub: "Faculty dependent" },
      { label: "Assessment dates", sub: "Check deadlines" },
      { label: "Standard certificate", sub: "No placement clearance" },
    ],
    relatedLinks: [
      {
        href: "/medical-certificate/study",
        label: "General study certificate",
        description: "Use this for TAFE, RTO, college, or other non-university study absence evidence.",
      },
    ],
    ctaTitle: "Request university absence evidence",
    ctaSubtitle:
      "For routine illness-related absence evidence where your university accepts a standard certificate.",
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
      `When a child misses school because of illness, a parent or guardian can request routine absence evidence online. The doctor reviews the history and may ask follow-up questions. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "School absence evidence",
    explainerSubtitle: "For school-aged children with short illness-related absences.",
    explainerParagraphs: [
      "If your child has been unwell and missed school, the school may ask for medical evidence. This page is for routine school absence documentation where a doctor can make a safe decision from the history you provide as the parent or guardian.",
      "You complete a structured form describing your child's symptoms, when they started, the school dates missed, and any safety concerns. For children, the doctor may ask follow-up questions or request a brief call before deciding whether a certificate can be issued.",
      "An approved certificate includes standard doctor-issued details for the school absence period. School attendance policies vary. Some schools, childcare services, or programs may need different wording, an in-person assessment, or a return-to-school clearance rather than a routine absence certificate.",
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
        title: "When a standard certificate is not enough",
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
      { label: "School absence", sub: "Policy dependent" },
      { label: "Parent or guardian", sub: "Completes form" },
      { label: "No clearance", sub: "Absence evidence only" },
    ],
    relatedLinks: [
      {
        href: "/medical-certificate/carer",
        label: "Carer's leave certificate",
        description: "Use this if your employer needs evidence because you took leave to care for the child.",
      },
    ],
    ctaTitle: "Request school absence evidence",
    ctaSubtitle:
      "For short child illness absences where online review is clinically suitable.",
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
      `Anxiety, panic symptoms, stress, or overwhelm can make work or study unsafe or unrealistic for a short period. Complete a secure form so a doctor can assess whether routine absence evidence is appropriate. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "Anxiety-related absence and routine evidence",
    explainerSubtitle: "For short absences where symptoms are clear and online review is clinically suitable.",
    explainerParagraphs: [
      "Anxiety and panic symptoms can affect concentration, sleep, commuting, customer-facing work, physical duties, study, and ordinary daily functioning. A routine online certificate may document a short absence where the history is clear and no urgent or ongoing care document is needed.",
      "You answer a structured health form covering what symptoms you are experiencing, when they started, how they affect attendance or duties, which dates you need reviewed, and safety answers that help the doctor decide whether online review is appropriate.",
      "An approved certificate includes standard absence evidence. It is not a mental health care plan, treatment plan, medication review, fitness-for-duty assessment, return-to-work clearance, workplace adjustment letter, or policy advice for an employer or institution.",
    ],
    detailSections: [
      {
        title: "When online review fits",
        body:
          "Online review is best suited to short anxiety-related absences where the request is for routine evidence and there are no immediate safety concerns.",
        items: [
          "Anxiety, panic symptoms, acute stress, poor sleep, or overwhelm affecting work, study, commuting, concentration, or usual duties",
          "Symptoms that are understandable from the history you provide and do not need urgent same-day mental health assessment",
          "No request for workplace adjustments, capacity wording, return-to-work clearance, special consideration forms, or long-term care planning",
        ],
      },
      {
        title: "What the doctor checks",
        body:
          "The doctor checks whether your symptoms, timing, requested dates, functional impact, and safety answers support routine certificate evidence.",
        items: [
          "What symptoms are present, when they started, whether they are improving, unchanged, or escalating, and what triggered the absence",
          "How symptoms affect attendance, concentration, decision-making, commuting, customer-facing duties, physical duties, or study participation",
          "Whether self-harm thoughts, feeling unsafe, severe panic symptoms, confusion, substance-related risk, or chest pain point to urgent or in-person care",
        ],
      },
      {
        title: "What the certificate includes",
        body:
          "A routine anxiety certificate focuses on the absence period. It does not usually need to list a diagnosis or private symptom detail.",
        items: [
          "Your name, the doctor's details, the review date, and the medically appropriate absence period",
          "A standard statement that you were unable to attend work, study, or usual duties for the stated period",
          "Verification details your employer or institution can use to confirm the certificate came from InstantMed",
        ],
      },
      {
        title: "When a standard certificate is not enough",
        body:
          "Some anxiety-related requests need your regular GP, psychologist, psychiatrist, employer pathway, university form, or urgent support service.",
        items: [
          "Self-harm thoughts, feeling unsafe, crisis symptoms, severe deterioration, psychosis, mania, confusion, fainting, chest pain, or symptoms that feel medically unsafe",
          "Mental health care plans, therapy referrals, medication changes, Centrelink forms, insurance reports, workers compensation, capacity assessments, or legal documents",
          "Return-to-work clearance, workplace adjustment letters, special consideration, exam deferral, or long-term absence documents with detailed functional capacity wording",
        ],
      },
    ],
    recognitionTitle: "Workplace evidence",
    recognitionSubtitle:
      "Anxiety certificates include standard doctor and absence details. Employer, school, and university policies may vary.",
    recognitionBadges: [
      { label: "Routine evidence", sub: "Absence period" },
      { label: "Safety first", sub: "Care boundaries" },
      { label: "Policy caveats", sub: "May vary" },
    ],
    relatedLinks: [
      {
        href: "/mental-health-online",
        label: "Need broader mental health guidance?",
        description:
          "Read the mental health online guide for crisis boundaries, GP pathways, privacy, and when a short certificate is not the right document.",
      },
      {
        href: "/medical-certificate/sick-leave",
        label: "Need a general sick-leave certificate?",
        description:
          "Use the sick-leave pathway when you need routine evidence for a short absence and the specific symptom is less important than the absence period.",
      },
    ],
    ctaTitle: "Request anxiety absence evidence",
    ctaSubtitle:
      "For short anxiety-related absences where routine certificate evidence is clinically appropriate.",
    ctaButtonText: "Start certificate request",
    metadata: {
      title: `Medical Certificate for Anxiety | Mental Health Sick Note ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Request a medical certificate for anxiety-related absence. AHPRA-registered doctors review symptoms, requested dates, and safety answers. From ${PRICING_DISPLAY.MED_CERT}. Employer policies vary.`,
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
          "A doctor can review a request for short anxiety-related absence. If your symptoms, timing, requested dates, and safety answers support routine absence evidence, a certificate may be issued.",
      },
      {
        question: "Will my employer accept a certificate for anxiety?",
        answer:
          "A doctor-issued certificate can support workplace evidence requirements, but employer policies and individual circumstances may vary. Check your workplace policy if you need a specific form or extra wording.",
      },
      {
        question: "Does the certificate list anxiety as the diagnosis?",
        answer:
          "A routine certificate focuses on the absence period and does not usually need to list private symptom or diagnosis detail. The doctor decides what detail is clinically appropriate for the certificate.",
      },
      {
        question: "Can I get a certificate for stress or burnout?",
        answer:
          "Stress, burnout, and anxiety-related symptoms can be reviewed for short absence evidence. Describe the symptoms, timing, and effect on work or study in the form so the doctor can decide whether a routine certificate is appropriate.",
      },
      {
        question: "When is online review not enough for anxiety?",
        answer:
          "Seek urgent or in-person support if you feel unsafe, have thoughts of self-harm, severe deterioration, confusion, psychosis, mania, fainting, chest pain, or symptoms that feel medically unsafe. A short certificate is also not a mental health care plan, medication review, workplace adjustment letter, or long-term capacity report.",
      },
    ],
  },

  flu: {
    slug: "flu",
    h1: "Medical certificate for the flu.",
    heroSubheadline:
      `Flu can mean fever, chills, body aches, cough, fatigue, and a genuine need to stay away from work or study. Complete a secure form so a doctor can assess whether routine sick-leave evidence is appropriate. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "Flu, flu-like illness, and work absence",
    explainerSubtitle: "For short absences where symptoms are clear and online review is clinically suitable.",
    explainerParagraphs: [
      "Flu and flu-like illness can come on suddenly with fever, chills, body aches, sore throat, cough, headache, and fatigue. A routine online certificate may document a short absence where the history is clear and no in-person care is needed.",
      "You answer a structured health form covering when symptoms started, which symptoms you have, how they affect work, study or commuting, the dates you need reviewed, any test results, and safety answers that help the doctor decide whether online review is appropriate.",
      "An approved certificate includes standard absence evidence. It is not a clearance to return while infectious, a fit-for-duty assessment, test-result proof, travel clearance, or advice about your employer's isolation policy.",
    ],
    detailSections: [
      {
        title: "When online review fits",
        body:
          "Online review is best suited to short flu or flu-like absences where symptoms are clear, manageable at home, and the request is for routine evidence.",
        items: [
          "Fever, chills, aches, cough, sore throat, headache, or fatigue affecting work, study, commuting, or usual duties",
          "Symptoms that are stable or improving, with no severe breathing symptoms or major deterioration",
          "No employer clearance, public-health form, travel document, or formal test-result evidence required",
        ],
      },
      {
        title: "What the doctor checks",
        body:
          "The doctor checks whether your symptom pattern, timing, requested dates, and safety answers support routine absence evidence.",
        items: [
          "When symptoms started, whether fever is present, and whether symptoms are improving, unchanged, or worsening",
          "How the illness affects attendance, concentration, physical duties, study, commuting, or caring responsibilities",
          "Whether breathlessness, chest pain, confusion, dehydration, pregnancy, immune suppression, or severe worsening symptoms point to in-person care",
        ],
      },
      {
        title: "What the certificate includes",
        body:
          "A routine flu certificate focuses on the absence period. It does not need to list private symptom detail unless the doctor decides it is clinically relevant.",
        items: [
          "Your name, the doctor's details, the review date, and the medically appropriate absence period",
          "A statement that you were unfit for work, study, or usual duties for the stated period",
          "Verification details your employer or institution can use to confirm the certificate came from InstantMed",
        ],
      },
      {
        title: "When a standard certificate is not enough",
        body:
          "Some flu-related requests need in-person assessment, a test provider, a public-health source, or an employer-specific pathway.",
        items: [
          "Severe breathlessness, chest pain, confusion, fainting, dehydration, pregnancy concerns, immune suppression, or worsening illness",
          "Return-to-work clearance, fitness-for-duty, travel clearance, isolation-release letters, vaccination records, or test-result proof",
          "Workers compensation, insurance, legal, court, or employer forms that require specific capacity or diagnosis detail",
        ],
      },
    ],
    recognitionTitle: "Workplace evidence",
    recognitionSubtitle:
      "Flu certificates include standard doctor and absence details. Employer and institution policies may vary.",
    recognitionBadges: [
      { label: "Routine evidence", sub: "Absence period" },
      { label: "Red flags", sub: "In-person boundary" },
      { label: "Employer policy", sub: "May vary" },
    ],
    relatedLinks: [
      {
        href: "/medical-certificate/carer",
        label: "Need evidence for caring for someone else?",
        description:
          "Use the carer's certificate pathway when your absence is because you are caring for a child, dependant, or family member with flu-like illness.",
      },
    ],
    ctaTitle: "Request flu absence evidence",
    ctaSubtitle:
      "For short flu or flu-like absences where routine certificate evidence is clinically appropriate.",
    ctaButtonText: "Start certificate request",
    metadata: {
      title: `Medical Certificate for Flu | Sick Note Online ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Request a medical certificate for flu or flu-like illness. AHPRA-registered doctors review symptoms, requested dates, and safety answers. From ${PRICING_DISPLAY.MED_CERT}. Employer policies vary.`,
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
          "Online review may be suitable for a short flu or flu-like absence if your symptoms, requested dates, and safety answers support routine certificate evidence. The doctor decides whether a certificate is clinically appropriate.",
      },
      {
        question: "Do I need a confirmed influenza test?",
        answer:
          "Not always. Routine sick-leave evidence can often be based on symptoms and the doctor's review rather than a formal influenza test. If your employer, school, university, travel provider, or public-health direction requires test-result proof, check that requirement separately.",
      },
      {
        question: "How many days will my flu certificate cover?",
        answer:
          "The doctor decides the period after reviewing your answers. Routine online certificates are best suited to short absences; persistent, worsening, or high-risk symptoms may need in-person care or your regular GP.",
      },
      {
        question: "Can the doctor review an absence that started before today?",
        answer:
          "Enter the exact symptom start date and the dates you need reviewed. Retrospective certificates depend on the clinical information available and may not be appropriate.",
      },
      {
        question: "What symptoms need urgent or in-person care?",
        answer:
          "Seek urgent or in-person care for difficulty breathing, chest pain, confusion, fainting, severe dehydration, inability to keep fluids down, pregnancy concerns, immune suppression, severe worsening symptoms, or symptoms that feel unsafe to manage at home.",
      },
      {
        question: "What if I am caring for someone else with flu symptoms?",
        answer:
          "If your absence is because you are caring for a child, dependant, or family member with flu-like illness, a carer's leave certificate may be the better pathway.",
      },
    ],
  },

  "work-from-home": {
    slug: "work-from-home",
    h1: "Medical certificate for work-from-home related absence.",
    heroSubheadline:
      `This is for routine sick-leave evidence when illness affects attending your usual workplace. It does not direct your employer to approve remote work. From ${PRICING_DISPLAY.MED_CERT}.`,
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
    relatedLinks: [
      {
        href: "/medical-certificate/sick-leave",
        label: "Sick leave certificate",
        description: "Use this if you need ordinary absence evidence rather than work-from-home context.",
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
      `Migraine can affect screens, driving, concentration, and safety-critical work. A doctor checks your usual pattern, red flags, and absence dates. From ${PRICING_DISPLAY.MED_CERT}.`,
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
      { label: "Pattern checked", sub: "Usual vs unusual" },
      { label: "Red flags", sub: "Urgent care boundary" },
      { label: "No fitness report", sub: "Absence evidence only" },
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
    relatedLinks: [
      {
        href: "/medical-certificate/sick-leave",
        label: "Sick leave certificate",
        description: "Use this if you need general workplace absence evidence for a short illness.",
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
      `Vomiting or diarrhoea can make commuting, food handling, care work, and office work unsafe. A doctor checks hydration, red flags, work duties, and dates. From ${PRICING_DISPLAY.MED_CERT}.`,
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
        title: "When a standard certificate is not enough",
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
      { label: "Hydration checked", sub: "Fluids and red flags" },
      { label: "Duties matter", sub: "Food, care, driving" },
      { label: "No clearance", sub: "Absence evidence only" },
    ],
    relatedLinks: [
      {
        href: "/medical-certificate/sick-leave",
        label: "Sick leave certificate",
        description: "Use this if you need general workplace absence evidence rather than gastro-specific guidance.",
      },
    ],
    ctaTitle: "Request gastro absence evidence",
    ctaSubtitle:
      "For short gastro illness where routine certificate evidence is clinically appropriate.",
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
      `Back pain can affect sitting, standing, lifting, driving, commuting, and desk work. Complete a secure form so a doctor can assess whether routine sick-leave evidence is appropriate. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "Back pain and work absence",
    explainerSubtitle: "For short back-pain absences where online doctor review is clinically suitable.",
    explainerParagraphs: [
      "Back pain can come from a muscle strain, a flare of an existing condition, spasm, sciatica-like symptoms, or a minor non-work injury. A routine online certificate may document a short absence where the clinical history is clear and no physical examination is needed.",
      "You answer a structured health form covering when the pain started, where it is, how it affects walking, sitting, standing, lifting or driving, the dates you need covered, and any warning signs that would make online review unsafe.",
      "An approved certificate includes standard workplace evidence details. It is not a WorkCover certificate, return-to-work clearance, capacity assessment, ergonomic report, work-from-home approval, lifting restriction, fitness-to-drive document, or long-term back-pain management plan.",
    ],
    detailSections: [
      {
        title: "When online review fits",
        body:
          "Online review is best suited to short back-pain absences where the story is clear, the symptoms are stable or improving, and no physical examination is needed.",
        items: [
          "A short absence because back pain affects usual work duties, commuting, sitting, standing, lifting, or driving",
          "Muscle strain, spasm, or a flare of a known back-pain pattern without neurological warning signs",
          "No workplace injury claim, compensation paperwork, capacity report, or modified-duty wording required",
        ],
      },
      {
        title: "What the doctor checks",
        body:
          "The doctor checks whether the pain pattern, work impact, requested dates, and safety answers support routine absence evidence.",
        items: [
          "When the pain started, where it is, whether it travels down the leg, and whether it is improving or worsening",
          "How pain affects walking, sitting, standing, lifting, driving, sleeping, and usual work duties",
          "Whether weakness, numbness, bladder or bowel changes, fever, trauma, or severe pain points to urgent or in-person care",
        ],
      },
      {
        title: "What the certificate includes",
        body:
          "A routine back-pain certificate focuses on absence from usual duties, not private diagnosis detail or workplace restrictions.",
        items: [
          "Your name, the doctor's details, the review date, and the medically appropriate absence period",
          "A statement that you were medically unfit for work or usual duties for the stated period",
          "Verification details your employer can use to confirm the certificate came from InstantMed",
        ],
      },
      {
        title: "When a standard certificate is not enough",
        body:
          "Some back-pain situations need a different document, physical examination, or employer-directed pathway.",
        items: [
          "Workplace injury, WorkCover, workers compensation, insurance, legal, or long-term capacity documentation",
          "Return-to-work clearance, fitness-for-duty, lifting restrictions, modified duties, ergonomic reports, or work-from-home approval",
          "New weakness, numbness, saddle numbness, bladder or bowel change, fever, major trauma, cancer history, infection risk, or severe worsening pain",
        ],
      },
    ],
    recognitionTitle: "Workplace evidence",
    recognitionSubtitle:
      "Back-pain certificates include standard doctor and absence details. Employer policies may vary, especially for injury, capacity, or modified-duty requests.",
    recognitionBadges: [
      { label: "Routine evidence", sub: "Absence period" },
      { label: "Red flags", sub: "Urgent care boundary" },
      { label: "No capacity report", sub: "Sick-leave only" },
    ],
    ctaTitle: "Request back-pain absence evidence",
    ctaSubtitle:
      "For short back-pain absences where routine certificate evidence is clinically appropriate.",
    ctaButtonText: "Start certificate request",
    metadata: {
      title: `Medical Certificate for Back Pain | Sick Note Online ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Request a medical certificate for back pain absence. AHPRA-registered doctors review symptoms, work impact, and red flags. From ${PRICING_DISPLAY.MED_CERT}. Employer policies vary.`,
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
          "Online review may be suitable for a short back-pain absence if your symptoms, work impact, requested dates, and safety answers support routine certificate evidence. The doctor decides whether a certificate is clinically appropriate.",
      },
      {
        question: "What if my back pain is from a workplace injury?",
        answer:
          "Do not use this pathway for workplace injury, WorkCover, workers compensation, or insurance paperwork. Those requests often need a physical examination, employer forms, or an occupational-health pathway.",
      },
      {
        question: "How many days will the certificate cover?",
        answer:
          "The doctor decides the period after reviewing your answers. Routine online certificates are best suited to short absences; ongoing, recurrent, or worsening back pain may need your regular GP, physiotherapist, or specialist.",
      },
      {
        question: "Can it say I should work from home or avoid lifting?",
        answer:
          "No. A routine medical certificate documents absence or unfitness for usual duties for a period. It does not approve work from home, modified duties, lifting restrictions, ergonomic changes, or capacity limits.",
      },
      {
        question: "What symptoms need urgent or in-person care?",
        answer:
          "Seek urgent or in-person care for new leg weakness, numbness around the groin or saddle area, loss of bladder or bowel control, fever, major trauma, severe worsening pain, cancer history, infection risk, or pain with significant unwellness.",
      },
      {
        question: "Will the certificate include my diagnosis?",
        answer:
          "Usually no. Routine workplace evidence normally focuses on whether you were medically unfit for usual duties for the relevant period. Diagnosis and detailed symptom information are usually not needed.",
      },
    ],
  },

  covid: {
    slug: "covid",
    h1: "Medical certificate for COVID-19.",
    heroSubheadline:
      `COVID-19 can mean fever, cough, sore throat, fatigue, body aches, and a need to stay away from work or study. Complete a secure form so a doctor can assess whether routine sick-leave evidence is appropriate. From ${PRICING_DISPLAY.MED_CERT}.`,
    explainerTitle: "COVID-19 and absence evidence",
    explainerSubtitle: "For short COVID-related absences where online review is clinically suitable.",
    explainerParagraphs: [
      "COVID-19 can still disrupt work, study, commuting, and usual duties. A routine online certificate may document a short absence where the clinical history is clear, symptoms are manageable at home, and no in-person assessment is needed.",
      "You answer a structured health form covering when symptoms started, any RAT or PCR result, which symptoms you have, the dates you need reviewed, how the illness affects attendance, and safety answers that help the doctor decide whether online review is appropriate.",
      "An approved certificate includes standard absence evidence. It is not a public-health isolation order, proof of infection, negative-test certificate, return-to-work clearance, travel clearance, or advice about your employer's COVID policy.",
    ],
    detailSections: [
      {
        title: "When online review fits",
        body:
          "Online review is best suited to short COVID-related absences where the request is for routine evidence and symptoms are not severe.",
        items: [
          "A positive RAT or PCR result, or COVID-like symptoms affecting work, study, commuting, or usual duties",
          "Fever, cough, sore throat, fatigue, headache, body aches, congestion, or loss of taste or smell that can be managed at home",
          "No employer clearance, travel document, public-health form, or formal test-result proof required",
        ],
      },
      {
        title: "What the doctor checks",
        body:
          "The doctor checks whether your symptom pattern, timing, test information, requested dates, and safety answers support routine certificate evidence.",
        items: [
          "When symptoms started, when you tested if relevant, and whether symptoms are improving, unchanged, or worsening",
          "How the illness affects attendance, concentration, physical duties, study, commuting, or caring responsibilities",
          "Whether breathlessness, chest pain, confusion, fainting, dehydration, pregnancy, immune suppression, or severe worsening symptoms point to in-person care",
        ],
      },
      {
        title: "What the certificate includes",
        body:
          "A routine COVID certificate focuses on the absence period. It does not need to include private symptom or test detail unless the doctor decides that detail is clinically relevant.",
        items: [
          "Your name, the doctor's details, the review date, and the medically appropriate absence period",
          "A statement that you were unfit for work, study, or usual duties for the stated period",
          "Verification details your employer or institution can use to confirm the certificate came from InstantMed",
        ],
      },
      {
        title: "When a standard certificate is not enough",
        body:
          "Some COVID-related requests need a test provider, public-health source, in-person assessment, or employer-specific pathway.",
        items: [
          "Severe breathlessness, chest pain, confusion, fainting, dehydration, pregnancy concerns, immune suppression, or worsening illness",
          "Return-to-work clearance, fitness-for-duty, travel clearance, isolation-release letters, vaccination records, negative-test certificates, or test-result proof",
          "Workers compensation, insurance, legal, court, or employer forms that require specific capacity, diagnosis, or exposure detail",
        ],
      },
    ],
    recognitionTitle: "Workplace evidence",
    recognitionSubtitle:
      "COVID certificates include standard doctor and absence details. Employer, school, university, and public-health requirements may vary.",
    recognitionBadges: [
      { label: "Routine evidence", sub: "Absence period" },
      { label: "Red flags", sub: "In-person boundary" },
      { label: "Employer policy", sub: "May vary" },
    ],
    relatedLinks: [
      {
        href: "/medical-certificate/carer",
        label: "Need evidence because you are caring for someone?",
        description:
          "Use the carer's certificate pathway when your absence is because you are caring for a child, dependant, or family member with COVID-19.",
      },
    ],
    ctaTitle: "Request COVID absence evidence",
    ctaSubtitle:
      "For short COVID-related absences where routine certificate evidence is clinically appropriate.",
    ctaButtonText: "Start certificate request",
    metadata: {
      title: `Medical Certificate for COVID-19 | Sick Note Online ${PRICING_DISPLAY.MED_CERT}`,
      description:
        `Request a medical certificate for COVID-19 absence. AHPRA-registered doctors review symptoms, test information, requested dates, and safety answers. From ${PRICING_DISPLAY.MED_CERT}. Employer policies vary.`,
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
          "Online review may be suitable for a short COVID-related absence if your symptoms, test information, requested dates, and safety answers support routine certificate evidence. The doctor decides whether a certificate is clinically appropriate.",
      },
      {
        question: "Do I need a positive RAT or PCR result?",
        answer:
          "Not always. Routine sick-leave evidence can often be based on symptoms, timing, and the doctor's review. If your employer, school, university, travel provider, or public-health direction requires formal test-result proof, check that requirement separately.",
      },
      {
        question: "Can it confirm I am safe to return to work or travel?",
        answer:
          "No. A routine medical certificate documents an absence period when clinically appropriate. It does not provide return-to-work clearance, travel clearance, isolation-release advice, a negative-test certificate, or fitness-for-duty assessment.",
      },
      {
        question: "Can the doctor review an absence that started before today?",
        answer:
          "Enter the exact symptom start date, test date if relevant, and the dates you need reviewed. Retrospective certificates depend on the clinical information available and may not be appropriate.",
      },
      {
        question: "What symptoms need urgent or in-person care?",
        answer:
          "Seek urgent or in-person care for difficulty breathing, chest pain, confusion, fainting, severe dehydration, inability to keep fluids down, pregnancy concerns, immune suppression, severe worsening symptoms, or symptoms that feel unsafe to manage at home.",
      },
      {
        question: "Can I get a certificate for caring for someone with COVID?",
        answer:
          "If your absence is because you are caring for a child, dependant, or family member with COVID-19, a carer's leave certificate may be the better pathway.",
      },
    ],
  },
}

export function isMedCertIntentSlug(slug: string): slug is MedCertIntentSlug {
  return MED_CERT_INTENT_SLUGS.includes(slug as MedCertIntentSlug)
}
