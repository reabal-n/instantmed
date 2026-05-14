/**
 * Commercial Intent Pages
 *
 * This is the curated top-25 organic acquisition set. These are not blog posts
 * or average guides: each page has a first-screen answer, price, compliant CTA,
 * local visual, source references, and internal links.
 */

import { PRICING_DISPLAY } from "@/lib/constants"
import { commercialSeoVisuals } from "@/lib/seo/commercial-visuals"

import type { ContentBlock, FAQ, RelatedLink, SEOPage } from "./registry"

export type CommercialIntentCluster =
  | "medical-certificate"
  | "repeat-prescription"
  | "location"
  | "comparison"

export interface CommercialIntentSource {
  label: string
  href: string
}

export interface CommercialIntentMeta {
  priority: number
  cluster: CommercialIntentCluster
  price: string
  answer: string
  visual: {
    src: string
    alt: string
    caption: string
  }
  sources: CommercialIntentSource[]
  internalLinks: Array<{
    label: string
    href: string
  }>
}

export interface IntentPage extends Omit<SEOPage, "type"> {
  type: "intent"
  intent: {
    searchQuery: string
    alternateQueries: string[]
    userNeed: string
    urgency: "immediate" | "same-day" | "flexible"
    serviceType: "medical-certificate" | "prescription" | "consult" | "multiple"
  }
  conversion: {
    primaryCTA: string
    ctaUrl: string
    secondaryCTA?: string
    secondaryCTAUrl?: string
  }
  commercial: CommercialIntentMeta
}

type IntentInput = {
  priority: number
  cluster: CommercialIntentCluster
  slug: string
  title: string
  description: string
  h1: string
  answer: string
  intro: string
  price: string
  visual: CommercialIntentMeta["visual"]
  searchQuery: string
  alternateQueries: string[]
  userNeed: string
  urgency: IntentPage["intent"]["urgency"]
  serviceType: IntentPage["intent"]["serviceType"]
  keywords: string[]
  blocks: ContentBlock[]
  faqs: FAQ[]
  related: RelatedLink[]
  internalLinks: CommercialIntentMeta["internalLinks"]
  sources: CommercialIntentSource[]
  primaryCTA: string
  ctaUrl: string
  secondaryCTA?: string
  secondaryCTAUrl?: string
}

const LAST_MODIFIED = new Date("2026-05-08")

const SOURCES = {
  fairWorkSickLeave: {
    label: "Fair Work Ombudsman: Sick and carer's leave",
    href: "https://www.fairwork.gov.au/leave/sick-and-carers-leave",
  },
  medicalBoardTelehealth: {
    label: "Medical Board of Australia: Telehealth consultations",
    href: "https://www.medicalboard.gov.au/Codes-Guidelines-Policies/Telehealth-consultations-with-patients.aspx",
  },
  ahpraRegister: {
    label: "Ahpra: Public register of practitioners",
    href: "https://www.ahpra.gov.au/registration/registers-of-practitioners/tips-for-using-the-public-register.aspx",
  },
  tgaHealthServiceAds: {
    label: "TGA: Advertising a health service",
    href: "https://www.tga.gov.au/resources/guidance/advertising-health-service",
  },
  electronicPrescriptions: {
    label: "Australian Digital Health Agency: Electronic prescriptions",
    href: "https://www.digitalhealth.gov.au/initiatives-and-programs/electronic-prescriptions",
  },
} satisfies Record<string, CommercialIntentSource>

const medCertSources = [
  SOURCES.fairWorkSickLeave,
  SOURCES.medicalBoardTelehealth,
  SOURCES.ahpraRegister,
]

const repeatScriptSources = [
  SOURCES.medicalBoardTelehealth,
  SOURCES.electronicPrescriptions,
  SOURCES.tgaHealthServiceAds,
]

const comparisonSources = [
  SOURCES.fairWorkSickLeave,
  SOURCES.medicalBoardTelehealth,
  SOURCES.tgaHealthServiceAds,
]

const VISUALS = {
  medCert: {
    src: commercialSeoVisuals["same-day-certificate-review"].assetPath,
    alt: "Educational diagram of the same-day medical certificate review pathway",
    caption: "Certificate pathway: symptoms and dates, scope check, doctor review, secure PDF if approved.",
  },
  medCertAlt: {
    src: commercialSeoVisuals["work-certificate-evidence"].assetPath,
    alt: "Educational diagram of work medical certificate evidence requirements",
    caption: "Work evidence map: absence period, doctor details, privacy boundary, employer policy variation.",
  },
  prescription: {
    src: commercialSeoVisuals["repeat-prescription-review-pathway"].assetPath,
    alt: "Educational diagram of the repeat prescription review pathway",
    caption: "Repeat request pathway: existing medicine details, safety checks, doctor decision, eScript if suitable.",
  },
  prescriptionAlt: {
    src: commercialSeoVisuals["after-hours-repeat-request-pathway"].assetPath,
    alt: "Educational diagram of after-hours repeat prescription review",
    caption: "After-hours pathway: submit online, triage missed-dose risk, doctor review, safe next step.",
  },
  consult: {
    src: commercialSeoVisuals["telehealth-certificate-comparison"].assetPath,
    alt: "Educational comparison of telehealth certificate, GP visit, and urgent care pathways",
    caption: "Care pathway comparison: telehealth for simple short absences, GP or urgent care when safer.",
  },
} satisfies Record<string, CommercialIntentMeta["visual"]>

const medCertLinks = [
  { label: "Medical certificate service", href: "/medical-certificate" },
  { label: "Start a certificate request", href: "/request?service=med-cert" },
  { label: "How InstantMed works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
]

const repeatScriptLinks = [
  { label: "Prescription service", href: "/prescriptions" },
  { label: "Start a repeat request", href: "/request?service=repeat-script" },
  { label: "How InstantMed works", href: "/how-it-works" },
  { label: "Clinical governance", href: "/clinical-governance" },
]

const comparisonLinks = [
  { label: "Medical certificate service", href: "/medical-certificate" },
  { label: "Prescription service", href: "/prescriptions" },
  { label: "Pricing", href: "/pricing" },
  { label: "Start a request", href: "/request" },
]

function page(input: IntentInput): IntentPage {
  return {
    slug: input.slug,
    type: "intent",
    title: input.title,
    description: input.description,
    h1: input.h1,
    content: {
      intro: input.intro,
      uniqueBlocks: input.blocks,
    },
    metadata: {
      keywords: input.keywords,
      lastModified: LAST_MODIFIED,
    },
    structured: {
      faqs: input.faqs,
    },
    links: {
      related: input.related,
    },
    intent: {
      searchQuery: input.searchQuery,
      alternateQueries: input.alternateQueries,
      userNeed: input.userNeed,
      urgency: input.urgency,
      serviceType: input.serviceType,
    },
    conversion: {
      primaryCTA: input.primaryCTA,
      ctaUrl: input.ctaUrl,
      secondaryCTA: input.secondaryCTA,
      secondaryCTAUrl: input.secondaryCTAUrl,
    },
    commercial: {
      priority: input.priority,
      cluster: input.cluster,
      price: input.price,
      answer: input.answer,
      visual: input.visual,
      sources: input.sources,
      internalLinks: input.internalLinks,
    },
  }
}

function medCertPage(input: Omit<IntentInput, "cluster" | "price" | "sources" | "primaryCTA" | "ctaUrl">): IntentPage {
  return page({
    ...input,
    cluster: "medical-certificate",
    price: PRICING_DISPLAY.FROM_MED_CERT,
    sources: medCertSources,
    primaryCTA: "Start certificate request",
    ctaUrl: "/request?service=med-cert",
  })
}

function cityMedCertPage(input: Omit<IntentInput, "cluster" | "price" | "sources" | "primaryCTA" | "ctaUrl">): IntentPage {
  return page({
    ...input,
    cluster: "location",
    price: PRICING_DISPLAY.FROM_MED_CERT,
    sources: medCertSources,
    primaryCTA: "Start certificate request",
    ctaUrl: "/request?service=med-cert",
  })
}

function repeatScriptPage(input: Omit<IntentInput, "cluster" | "price" | "sources" | "primaryCTA" | "ctaUrl">): IntentPage {
  return page({
    ...input,
    cluster: "repeat-prescription",
    price: PRICING_DISPLAY.FROM_SCRIPT,
    sources: repeatScriptSources,
    primaryCTA: "Start repeat request",
    ctaUrl: "/request?service=repeat-script",
  })
}

function comparisonPage(input: Omit<IntentInput, "cluster" | "sources">): IntentPage {
  return page({
    ...input,
    cluster: "comparison",
    sources: comparisonSources,
  })
}

const medCertRelated: RelatedLink[] = [
  { type: "category", slug: "medical-certificate", title: "Medical certificate service" },
  { type: "intent", slug: "medical-certificate-for-work", title: "Medical certificate for work" },
  { type: "intent", slug: "online-sick-certificate", title: "Online sick certificate" },
]

const repeatScriptRelated: RelatedLink[] = [
  { type: "category", slug: "prescriptions", title: "Prescription service" },
  { type: "intent", slug: "after-hours-repeat-prescription", title: "After-hours repeat prescription" },
  { type: "intent", slug: "weekend-repeat-prescription", title: "Weekend repeat prescription" },
]

export const intentPages: IntentPage[] = [
  medCertPage({
    priority: 1,
    slug: "same-day-medical-certificate",
    title: "Same Day Medical Certificate Online | InstantMed",
    description: `Request a same day medical certificate online from ${PRICING_DISPLAY.MED_CERT}. Doctor reviewed, secure PDF delivery after approval.`,
    h1: "Same day medical certificate online",
    answer: "Yes. You can request a same day medical certificate online for short illness or carer leave. A doctor reviews the information before any certificate is issued.",
    intro: "Start with a short secure form, confirm your absence dates, then a doctor reviews whether a certificate is clinically appropriate.",
    searchQuery: "same day medical certificate",
    alternateQueries: ["medical certificate today", "online medical certificate same day", "urgent medical certificate online"],
    userNeed: "Get short-absence evidence without waiting for a clinic slot",
    urgency: "immediate",
    serviceType: "medical-certificate",
    keywords: ["same day medical certificate", "medical certificate today", "online medical certificate"],
    visual: VISUALS.medCert,
    internalLinks: medCertLinks,
    related: medCertRelated,
    blocks: [
      {
        id: "best-fit",
        title: "Best fit",
        type: "list",
        content: [
          "Short illness or carer leave where telehealth review is appropriate.",
          "One, two, or three day certificate requests.",
          "Workplace or study evidence that needs doctor details and a verification path.",
        ],
      },
      {
        id: "doctor-check",
        title: "What the doctor checks",
        type: "text",
        content: "The doctor reviews your symptoms, onset, requested dates, role or study demands, and whether your situation needs in-person care instead.",
      },
      {
        id: "boundary",
        title: "Clinical boundary",
        type: "callout",
        content: "A certificate is not automatic. If your symptoms suggest an emergency, a physical exam, or a high-stakes certificate type, the request may be declined or redirected.",
      },
    ],
    faqs: [
      { question: "Can I request it today?", answer: "Yes. The form can be started any time and a doctor reviews the request before a certificate is issued." },
      { question: "What does it cost?", answer: `Medical certificates start at ${PRICING_DISPLAY.MED_CERT}. Longer durations and optional priority review are shown before payment.` },
      { question: "Is it suitable for serious symptoms?", answer: "No. Chest pain, trouble breathing, severe pain, or other urgent symptoms need emergency or in-person care." },
    ],
  }),
  medCertPage({
    priority: 2,
    slug: "medical-certificate-for-work",
    title: "Medical Certificate for Work Online | InstantMed",
    description: `Request a doctor reviewed medical certificate for work online from ${PRICING_DISPLAY.MED_CERT}. Clear price, secure PDF after approval.`,
    h1: "Medical certificate for work",
    answer: "You can request a work medical certificate online when you are unwell and need evidence for personal or carer leave. Employer policies can still vary.",
    intro: "This page is for employees who need practical evidence for a short absence without turning a minor illness into a clinic trip.",
    searchQuery: "medical certificate for work",
    alternateQueries: ["work medical certificate online", "doctor certificate for work", "sick leave certificate for work"],
    userNeed: "Provide workplace evidence for a short illness or carer absence",
    urgency: "same-day",
    serviceType: "medical-certificate",
    keywords: ["medical certificate for work", "work medical certificate online", "sick leave certificate"],
    visual: VISUALS.medCertAlt,
    internalLinks: medCertLinks,
    related: medCertRelated,
    blocks: [
      {
        id: "workplace-evidence",
        title: "Workplace evidence",
        type: "text",
        content: "Fair Work says employers can ask for reasonable evidence when an employee takes sick or carer leave. A doctor issued certificate can support that evidence requirement.",
      },
      {
        id: "certificate-includes",
        title: "Certificate details",
        type: "list",
        content: [
          "Your name and certified absence dates.",
          "Doctor and clinic details.",
          "A certificate reference that can be checked online.",
        ],
      },
      {
        id: "privacy",
        title: "Privacy",
        type: "callout",
        content: "The certificate does not need to disclose your diagnosis to your employer. Clinical details stay inside the medical record.",
      },
    ],
    faqs: [
      { question: "Will my employer decide whether it is enough?", answer: "Your employer can assess evidence under workplace policy. InstantMed provides doctor reviewed documentation, not a promise about every workplace rule." },
      { question: "Can I use it for carer leave?", answer: "Yes, if the doctor considers the carer leave request clinically appropriate for the circumstances described." },
      { question: "Can I request multiple days?", answer: "You can request one, two, or three days. The doctor decides what is clinically appropriate." },
    ],
  }),
  medCertPage({
    priority: 3,
    slug: "online-sick-certificate",
    title: "Online Sick Certificate Australia | InstantMed",
    description: `Request an online sick certificate from ${PRICING_DISPLAY.MED_CERT}. Doctor reviewed, Australia only, secure delivery after approval.`,
    h1: "Online sick certificate",
    answer: "An online sick certificate is a medical certificate requested through telehealth. It is still reviewed by a doctor and only issued when clinically appropriate.",
    intro: "Use this option when you are too unwell to attend work or study and need a short certificate pathway that is simple and private.",
    searchQuery: "online sick certificate",
    alternateQueries: ["sick certificate online", "sick note online australia", "online doctor sick certificate"],
    userNeed: "Request illness evidence from home",
    urgency: "same-day",
    serviceType: "medical-certificate",
    keywords: ["online sick certificate", "sick certificate online", "online doctor certificate"],
    visual: VISUALS.medCert,
    internalLinks: medCertLinks,
    related: medCertRelated,
    blocks: [
      {
        id: "how-it-works",
        title: "How it works",
        type: "list",
        content: [
          "Answer symptom and absence questions.",
          "Confirm identity and payment details.",
          "A doctor reviews and issues a secure PDF if approved.",
        ],
      },
      {
        id: "not-a-template",
        title: "Not a template",
        type: "text",
        content: "The certificate is generated only after review. It is not a downloadable blank note or self-declared form.",
      },
      {
        id: "red-flags",
        title: "Red flags",
        type: "callout",
        content: "Use urgent care for severe symptoms, sudden deterioration, dehydration, breathing difficulty, or anything that feels unsafe to manage online.",
      },
    ],
    faqs: [
      { question: "Is this just a form?", answer: "No. The form collects clinical details for doctor review before any certificate is issued." },
      { question: "How much is the first day?", answer: `A one day certificate request starts at ${PRICING_DISPLAY.MED_CERT}.` },
      { question: "Can I submit outside business hours?", answer: "Yes. Medical certificate requests can be started online 24/7." },
    ],
  }),
  medCertPage({
    priority: 4,
    slug: "one-day-medical-certificate",
    title: "One Day Medical Certificate Online | InstantMed",
    description: `Need a one day certificate? Request a doctor reviewed medical certificate online from ${PRICING_DISPLAY.MED_CERT}.`,
    h1: "One day medical certificate online",
    answer: `A one day medical certificate request is the simplest InstantMed certificate option and costs ${PRICING_DISPLAY.MED_CERT}. The doctor still reviews clinical suitability first.`,
    intro: "This is for short, clear absences where you need evidence for a single day away from work or study.",
    searchQuery: "one day medical certificate",
    alternateQueries: ["1 day medical certificate", "single day medical certificate", "medical certificate for one day"],
    userNeed: "Cover a single day of illness or carer leave",
    urgency: "same-day",
    serviceType: "medical-certificate",
    keywords: ["one day medical certificate", "1 day medical certificate", "single day sick certificate"],
    visual: VISUALS.medCertAlt,
    internalLinks: medCertLinks,
    related: medCertRelated,
    blocks: [
      {
        id: "when-to-use",
        title: "When to use it",
        type: "list",
        content: [
          "A short illness that affected one rostered day.",
          "A carer responsibility that prevented attendance.",
          "A minor flare-up where in-person care is not needed.",
        ],
      },
      {
        id: "specific-dates",
        title: "Specific dates matter",
        type: "text",
        content: "Your request asks for the exact date. The doctor decides whether that date is supported by the information provided.",
      },
      {
        id: "not-for-high-stakes",
        title: "Not for high-stakes evidence",
        type: "callout",
        content: "Court, exam, fitness-to-drive, compensation, and similar high-stakes requests need a different pathway and may be declined online.",
      },
    ],
    faqs: [
      { question: "Can I request only one day?", answer: "Yes. One day is the lowest certificate duration option." },
      { question: "Can the doctor decline it?", answer: "Yes. The doctor may decline if the request is not clinically supported." },
      { question: "Is the price shown before payment?", answer: "Yes. The certificate duration and price are shown before checkout." },
    ],
  }),
  medCertPage({
    priority: 5,
    slug: "two-day-medical-certificate",
    title: "Two Day Medical Certificate Online | InstantMed",
    description: `Request a two day medical certificate online from ${PRICING_DISPLAY.MED_CERT_2DAY}. Doctor reviewed before issue.`,
    h1: "Two day medical certificate online",
    answer: `You can request a two day medical certificate online for ${PRICING_DISPLAY.MED_CERT_2DAY}. The doctor reviews whether two days is clinically reasonable.`,
    intro: "This page is for short illnesses that need more than one day of recovery but do not require emergency or in-person care.",
    searchQuery: "two day medical certificate",
    alternateQueries: ["2 day medical certificate", "medical certificate for two days", "two days sick certificate"],
    userNeed: "Request evidence for two days away from work or study",
    urgency: "same-day",
    serviceType: "medical-certificate",
    keywords: ["two day medical certificate", "2 day medical certificate", "medical certificate two days"],
    visual: VISUALS.medCert,
    internalLinks: medCertLinks,
    related: medCertRelated,
    blocks: [
      {
        id: "duration",
        title: "Duration",
        type: "text",
        content: "Two days can be appropriate for short respiratory, stomach, migraine, injury, or carer situations, depending on severity and your duties.",
      },
      {
        id: "doctor-review",
        title: "Doctor review",
        type: "list",
        content: [
          "When symptoms started.",
          "Whether symptoms are improving or worsening.",
          "Whether the requested duration fits the clinical picture.",
        ],
      },
      {
        id: "seek-care",
        title: "Seek care sooner",
        type: "callout",
        content: "If you are getting worse, cannot keep fluids down, have severe pain, or feel unsafe, do not wait for an online certificate review.",
      },
    ],
    faqs: [
      { question: "What does two days cost?", answer: `A two day certificate request is ${PRICING_DISPLAY.MED_CERT_2DAY}.` },
      { question: "Can I request three days instead?", answer: `Yes. The three day option is ${PRICING_DISPLAY.MED_CERT_3DAY} and is also doctor reviewed.` },
      { question: "Can this cover yesterday and today?", answer: "You can provide the relevant dates. The doctor assesses whether retrospective coverage is clinically appropriate." },
    ],
  }),
  medCertPage({
    priority: 6,
    slug: "medical-certificate-for-cold-and-flu",
    title: "Medical Certificate for Cold and Flu | InstantMed",
    description: `Request a medical certificate for cold or flu symptoms online from ${PRICING_DISPLAY.MED_CERT}. Doctor reviewed.`,
    h1: "Medical certificate for cold and flu",
    answer: "Cold and flu symptoms can be suitable for an online medical certificate request when symptoms are mild to moderate and no red flags are present.",
    intro: "Use this page when a respiratory illness has kept you away from work or study and you need a simple doctor reviewed evidence pathway.",
    searchQuery: "medical certificate for cold and flu",
    alternateQueries: ["flu certificate online", "cold medical certificate", "sick certificate flu"],
    userNeed: "Request a certificate for respiratory illness",
    urgency: "same-day",
    serviceType: "medical-certificate",
    keywords: ["medical certificate for flu", "cold certificate online", "flu certificate online"],
    visual: VISUALS.medCertAlt,
    internalLinks: medCertLinks,
    related: medCertRelated,
    blocks: [
      {
        id: "common-details",
        title: "Details requested",
        type: "list",
        content: [
          "Main symptoms such as fever, cough, sore throat, fatigue, or body aches.",
          "When symptoms started and whether they are changing.",
          "Your requested absence dates and work or study demands.",
        ],
      },
      {
        id: "stay-home",
        title: "Why evidence helps",
        type: "text",
        content: "A certificate can help document a genuine short absence while you recover and reduce avoidable spread in workplaces or classrooms.",
      },
      {
        id: "respiratory-red-flags",
        title: "Respiratory red flags",
        type: "callout",
        content: "Trouble breathing, chest pain, confusion, blue lips, severe dehydration, or a very unwell child needs urgent in-person care.",
      },
    ],
    faqs: [
      { question: "Do I need a test result?", answer: "Usually no for a straightforward certificate request, but the doctor may ask follow-up questions if the story is unclear." },
      { question: "Can this cover a shift I missed?", answer: "You can request the relevant date. The doctor decides whether the absence is clinically supported." },
      { question: "What if symptoms last longer?", answer: "Persistent or worsening symptoms should be assessed by a GP or urgent care service." },
    ],
  }),
  medCertPage({
    priority: 7,
    slug: "medical-certificate-for-mental-health-day",
    title: "Medical Certificate for Mental Health Day | InstantMed",
    description: `Request a short medical certificate for mental health-related absence online from ${PRICING_DISPLAY.MED_CERT}. Doctor reviewed.`,
    h1: "Medical certificate for a mental health day",
    answer: "You can request a short certificate for mental health-related absence online, but the doctor may recommend in-person or ongoing care if the situation needs more support.",
    intro: "This pathway is for short-term stress, burnout, anxiety, grief, or similar concerns that have affected your ability to attend work or study.",
    searchQuery: "medical certificate for mental health day",
    alternateQueries: ["stress leave certificate online", "mental health medical certificate online", "burnout certificate online"],
    userNeed: "Document a short mental health-related absence",
    urgency: "same-day",
    serviceType: "medical-certificate",
    keywords: ["mental health medical certificate", "stress leave certificate online", "burnout certificate"],
    visual: VISUALS.consult,
    internalLinks: medCertLinks,
    related: medCertRelated,
    blocks: [
      {
        id: "suitable",
        title: "Suitable situations",
        type: "list",
        content: [
          "Short-term stress or burnout affecting one to three days.",
          "Anxiety or low mood where you are safe and not in crisis.",
          "Grief or acute stress where you need brief time away.",
        ],
      },
      {
        id: "doctor-boundary",
        title: "Doctor boundary",
        type: "text",
        content: "The reviewing doctor may ask for more information or recommend your regular GP, psychologist, or urgent support if the risk profile is higher.",
      },
      {
        id: "crisis",
        title: "Crisis support",
        type: "callout",
        content: "If you might harm yourself or someone else, call 000 or a crisis service now. Do not use an online certificate request as the first step.",
      },
    ],
    faqs: [
      { question: "Will my diagnosis be shown?", answer: "No diagnosis is usually needed on the certificate. Clinical details stay in the health record." },
      { question: "Can I request more than three days?", answer: "InstantMed certificate requests are capped at short durations. Longer or ongoing mental health leave needs continuity of care." },
      { question: "Can a doctor decline?", answer: "Yes. The doctor may decline or redirect if online certificate review is not suitable." },
    ],
  }),
  medCertPage({
    priority: 8,
    slug: "carers-leave-certificate-online",
    title: "Carer's Leave Certificate Online | InstantMed",
    description: `Request a carer's leave certificate online from ${PRICING_DISPLAY.MED_CERT}. Doctor reviewed evidence for short carer absence.`,
    h1: "Carer's leave certificate online",
    answer: "You can request a carer's leave certificate online when you need time away to care for an immediate family or household member and the situation is clinically appropriate.",
    intro: "This pathway is for short carer absences where a doctor can assess the care need remotely.",
    searchQuery: "carers leave certificate online",
    alternateQueries: ["carer certificate online", "medical certificate for carer leave", "carer's leave evidence online"],
    userNeed: "Document a short carer leave absence",
    urgency: "same-day",
    serviceType: "medical-certificate",
    keywords: ["carers leave certificate online", "carer certificate", "medical certificate carer leave"],
    visual: VISUALS.medCert,
    internalLinks: medCertLinks,
    related: medCertRelated,
    blocks: [
      {
        id: "fair-work",
        title: "Fair Work context",
        type: "text",
        content: "Fair Work describes carer's leave as leave to care for an immediate family or household member who is sick, injured, or affected by an unexpected emergency.",
      },
      {
        id: "details",
        title: "Details requested",
        type: "list",
        content: [
          "Who you are caring for in general relationship terms.",
          "What care was needed and when.",
          "Whether the situation required you to miss work or study.",
        ],
      },
      {
        id: "privacy",
        title: "Privacy",
        type: "callout",
        content: "The certificate should not disclose unnecessary private health details about the person you care for.",
      },
    ],
    faqs: [
      { question: "Can this cover a child being unwell?", answer: "Yes, if the situation fits carer leave and the doctor considers online review suitable." },
      { question: "Can this cover an unexpected emergency?", answer: "You can describe the circumstances. The doctor assesses whether a certificate is appropriate." },
      { question: "Does the other person need an account?", answer: "No. The request is made by the patient seeking carer leave evidence." },
    ],
  }),
  medCertPage({
    priority: 9,
    slug: "student-medical-certificate-online",
    title: "Student Medical Certificate Online | InstantMed",
    description: `Request a student medical certificate online from ${PRICING_DISPLAY.MED_CERT}. Doctor reviewed short illness evidence.`,
    h1: "Student medical certificate online",
    answer: "Students can request a short online medical certificate for illness or carer responsibilities, but each school, TAFE, or university can set its own evidence process.",
    intro: "Use this when illness has affected attendance or participation and you need doctor reviewed documentation.",
    searchQuery: "student medical certificate online",
    alternateQueries: ["uni medical certificate online", "student sick certificate online", "school medical certificate online"],
    userNeed: "Request study-related absence evidence",
    urgency: "same-day",
    serviceType: "medical-certificate",
    keywords: ["student medical certificate online", "uni medical certificate", "student sick certificate"],
    visual: VISUALS.medCertAlt,
    internalLinks: medCertLinks,
    related: medCertRelated,
    blocks: [
      {
        id: "student-fit",
        title: "Student fit",
        type: "list",
        content: [
          "Short illness affecting attendance.",
          "Carer responsibilities affecting attendance.",
          "Study days missed because symptoms made participation unrealistic.",
        ],
      },
      {
        id: "policy-check",
        title: "Check your institution",
        type: "text",
        content: "Some institutions have specific forms or deadlines. Check those rules before submitting so you know what evidence format is needed.",
      },
      {
        id: "not-for-complex-claims",
        title: "Boundary",
        type: "callout",
        content: "Complex academic, legal, disability, or long-term support requests usually need continuity of care and are not the right fit for a short online certificate.",
      },
    ],
    faqs: [
      { question: "Can I request a certificate as a student?", answer: "Yes, if you are in Australia and the clinical situation is suitable for telehealth review." },
      { question: "Will it include private medical details?", answer: "No unnecessary diagnosis details are included on the certificate." },
      { question: "What if my institution has its own form?", answer: "Use the institution's process where required. InstantMed issues its own certificate format." },
    ],
  }),
  medCertPage({
    priority: 10,
    slug: "medical-certificate-for-shift-workers",
    title: "Medical Certificate for Shift Workers | InstantMed",
    description: `Shift worker unwell? Request a doctor reviewed medical certificate online from ${PRICING_DISPLAY.MED_CERT}.`,
    h1: "Medical certificate for shift workers",
    answer: "Shift workers can request an online medical certificate when illness affects a rostered shift and attending a clinic during business hours is impractical.",
    intro: "This page is built for nurses, hospitality workers, transport workers, retail staff, security, and anyone whose roster does not match clinic hours.",
    searchQuery: "medical certificate for shift workers",
    alternateQueries: ["sick certificate for shift work", "medical certificate night shift", "online certificate for rostered shift"],
    userNeed: "Document illness around non-standard work hours",
    urgency: "same-day",
    serviceType: "medical-certificate",
    keywords: ["medical certificate shift workers", "sick certificate night shift", "rostered shift medical certificate"],
    visual: VISUALS.medCert,
    internalLinks: medCertLinks,
    related: medCertRelated,
    blocks: [
      {
        id: "shift-context",
        title: "Roster context",
        type: "text",
        content: "The form lets you describe the affected date and why symptoms made the rostered shift unsuitable, even if the shift fell overnight or on a weekend.",
      },
      {
        id: "use-cases",
        title: "Common cases",
        type: "list",
        content: [
          "Night shift missed after acute symptoms started.",
          "Weekend shift affected by illness.",
          "Early start missed because symptoms escalated overnight.",
        ],
      },
      {
        id: "safety",
        title: "Safety roles",
        type: "callout",
        content: "Safety-critical duties may need in-person assessment or employer-specific clearance. A short certificate is not a fitness-for-duty assessment.",
      },
    ],
    faqs: [
      { question: "Can I submit after missing the shift?", answer: "You can provide the relevant dates. The doctor decides whether the timeline is clinically supported." },
      { question: "Does the time of my shift matter?", answer: "Yes. Add shift timing in the notes if it explains why a clinic visit was not practical." },
      { question: "Can this clear me for safety-sensitive work?", answer: "No. Fitness-for-duty clearance is a separate, higher-stakes assessment." },
    ],
  }),
  cityMedCertPage({
    priority: 11,
    slug: "medical-certificate-online-sydney",
    title: "Medical Certificate Online Sydney | InstantMed",
    description: `Sydney medical certificate request online from ${PRICING_DISPLAY.MED_CERT}. Doctor reviewed, Australia only.`,
    h1: "Medical certificate online in Sydney",
    answer: "Sydney patients can request an online medical certificate for short illness or carer leave without travelling to a clinic, if telehealth review is suitable.",
    intro: "Useful for inner-city, suburban, and shift-work patients who need short evidence and do not need urgent in-person care.",
    searchQuery: "medical certificate online sydney",
    alternateQueries: ["sydney online medical certificate", "sick certificate online sydney", "doctor certificate online sydney"],
    userNeed: "Request a certificate in Sydney without clinic travel",
    urgency: "same-day",
    serviceType: "medical-certificate",
    keywords: ["medical certificate online sydney", "sick certificate online sydney", "doctor certificate sydney"],
    visual: VISUALS.medCertAlt,
    internalLinks: medCertLinks,
    related: medCertRelated,
    blocks: [
      { id: "local-fit", title: "Sydney fit", type: "text", content: "Telehealth is useful when a minor illness makes commuting, waiting rooms, or same-day clinic slots unrealistic." },
      { id: "areas", title: "Who uses it", type: "list", content: ["CBD and inner suburbs.", "Western Sydney and commuter corridors.", "Students, shift workers, and carers."] },
      { id: "not-emergency", title: "Urgent care", type: "callout", content: "Use urgent local care or 000 for severe symptoms. InstantMed is for non-emergency requests." },
    ],
    faqs: [
      { question: "Can I use this from anywhere in Sydney?", answer: "Yes, if you are physically in Australia and meet the service criteria." },
      { question: "Do I need Medicare for a certificate?", answer: "Medicare is optional for medical certificates." },
      { question: "Can I request after work?", answer: "Yes. You can start the request online at any time." },
    ],
  }),
  cityMedCertPage({
    priority: 12,
    slug: "medical-certificate-online-melbourne",
    title: "Medical Certificate Online Melbourne | InstantMed",
    description: `Melbourne medical certificate request online from ${PRICING_DISPLAY.MED_CERT}. Doctor reviewed short absence evidence.`,
    h1: "Medical certificate online in Melbourne",
    answer: "Melbourne patients can request a short online medical certificate when a clinic visit is unnecessary or impractical for a minor illness.",
    intro: "The pathway is designed for short absences, clear pricing, and doctor review before certificate issue.",
    searchQuery: "medical certificate online melbourne",
    alternateQueries: ["melbourne online medical certificate", "sick certificate online melbourne", "doctor certificate online melbourne"],
    userNeed: "Request a Melbourne certificate without a waiting room",
    urgency: "same-day",
    serviceType: "medical-certificate",
    keywords: ["medical certificate online melbourne", "sick certificate online melbourne", "doctor certificate melbourne"],
    visual: VISUALS.medCert,
    internalLinks: medCertLinks,
    related: medCertRelated,
    blocks: [
      { id: "local-fit", title: "Melbourne fit", type: "text", content: "Telehealth can be practical when illness, weather, transport, or roster timing makes a clinic visit harder than it needs to be." },
      { id: "doctor-review", title: "Review scope", type: "list", content: ["Short illness or carer leave.", "One to three day certificate requests.", "Online review where symptoms are not urgent."] },
      { id: "policy", title: "Policy check", type: "callout", content: "Your workplace or institution may have its own evidence rules, so check them before relying on any certificate." },
    ],
    faqs: [
      { question: "Is this Melbourne-only?", answer: "No. InstantMed is Australia-wide; this page is for Melbourne search intent." },
      { question: "Can I use it for a public holiday shift?", answer: "You can request the relevant date. Doctor review still applies." },
      { question: "How is it delivered?", answer: "If approved, the certificate is delivered as a secure PDF." },
    ],
  }),
  cityMedCertPage({
    priority: 13,
    slug: "medical-certificate-online-brisbane",
    title: "Medical Certificate Online Brisbane | InstantMed",
    description: `Request a Brisbane medical certificate online from ${PRICING_DISPLAY.MED_CERT}. Doctor reviewed before issue.`,
    h1: "Medical certificate online in Brisbane",
    answer: "Brisbane patients can request an online medical certificate for suitable short absences, with doctor review and clear pricing before payment.",
    intro: "Use this when your symptoms are non-urgent and you need evidence without arranging a same-day clinic visit.",
    searchQuery: "medical certificate online brisbane",
    alternateQueries: ["brisbane online medical certificate", "sick certificate online brisbane", "doctor certificate online brisbane"],
    userNeed: "Request a Brisbane certificate online",
    urgency: "same-day",
    serviceType: "medical-certificate",
    keywords: ["medical certificate online brisbane", "sick certificate online brisbane", "doctor certificate brisbane"],
    visual: VISUALS.medCertAlt,
    internalLinks: medCertLinks,
    related: medCertRelated,
    blocks: [
      { id: "local-fit", title: "Brisbane fit", type: "text", content: "Online certificate review is best suited to clear short absences where you do not need a physical examination." },
      { id: "steps", title: "Steps", type: "list", content: ["Choose certificate duration.", "Complete symptom and date questions.", "Receive a secure PDF if the doctor approves."] },
      { id: "boundary", title: "Boundary", type: "callout", content: "Severe heat illness, breathing problems, chest pain, or rapid deterioration needs urgent care." },
    ],
    faqs: [
      { question: "Can I start on a weekend?", answer: "Yes. Certificate requests can be started online 24/7." },
      { question: "Is the price different in Brisbane?", answer: "No. Pricing is national." },
      { question: "Can this replace a GP visit?", answer: "Only for suitable non-urgent certificate requests. The doctor may redirect you to in-person care." },
    ],
  }),
  cityMedCertPage({
    priority: 14,
    slug: "medical-certificate-online-perth",
    title: "Medical Certificate Online Perth | InstantMed",
    description: `Request a Perth medical certificate online from ${PRICING_DISPLAY.MED_CERT}. Doctor reviewed, secure PDF if approved.`,
    h1: "Medical certificate online in Perth",
    answer: "Perth patients can request a medical certificate online for short illness or carer leave, with doctor review before any certificate is issued.",
    intro: "A practical option for non-urgent short absences where local appointment timing or travel is the main friction.",
    searchQuery: "medical certificate online perth",
    alternateQueries: ["perth online medical certificate", "sick certificate online perth", "doctor certificate online perth"],
    userNeed: "Request a Perth certificate online",
    urgency: "same-day",
    serviceType: "medical-certificate",
    keywords: ["medical certificate online perth", "sick certificate online perth", "doctor certificate perth"],
    visual: VISUALS.medCert,
    internalLinks: medCertLinks,
    related: medCertRelated,
    blocks: [
      { id: "timezone", title: "WA timing", type: "text", content: "Requests can be started any time. Review timing is shown as service information, not as an automatic outcome promise." },
      { id: "best-fit", title: "Best fit", type: "list", content: ["Short illness.", "Carer leave.", "Minor symptoms where in-person care is not needed."] },
      { id: "limits", title: "Limits", type: "callout", content: "InstantMed does not issue high-stakes certificates through this short online pathway." },
    ],
    faqs: [
      { question: "Can I use this in Western Australia?", answer: "Yes, if you are in Australia and meet the service requirements." },
      { question: "Can I request a three day certificate?", answer: `Yes. Three day requests are ${PRICING_DISPLAY.MED_CERT_3DAY} and require doctor approval.` },
      { question: "Can I add notes about my roster?", answer: "Yes. Add relevant roster or workplace context in the request." },
    ],
  }),
  cityMedCertPage({
    priority: 15,
    slug: "medical-certificate-online-adelaide",
    title: "Medical Certificate Online Adelaide | InstantMed",
    description: `Request an Adelaide medical certificate online from ${PRICING_DISPLAY.MED_CERT}. Short absence evidence, doctor reviewed.`,
    h1: "Medical certificate online in Adelaide",
    answer: "Adelaide patients can request a short online medical certificate for suitable illness or carer leave, with a doctor deciding whether to issue it.",
    intro: "The service keeps the request focused: symptoms, dates, price, review, and secure delivery if approved.",
    searchQuery: "medical certificate online adelaide",
    alternateQueries: ["adelaide online medical certificate", "sick certificate online adelaide", "doctor certificate online adelaide"],
    userNeed: "Request an Adelaide certificate online",
    urgency: "same-day",
    serviceType: "medical-certificate",
    keywords: ["medical certificate online adelaide", "sick certificate online adelaide", "doctor certificate adelaide"],
    visual: VISUALS.medCertAlt,
    internalLinks: medCertLinks,
    related: medCertRelated,
    blocks: [
      { id: "simple-path", title: "Simple path", type: "text", content: "The online form captures the key details a doctor needs for a short certificate decision." },
      { id: "common-reasons", title: "Common reasons", type: "list", content: ["Respiratory illness.", "Gastro symptoms.", "Migraine, stress, injury, or carer responsibilities."] },
      { id: "in-person", title: "In-person care", type: "callout", content: "If the doctor cannot safely assess the request online, they may recommend a GP, urgent care, or emergency pathway." },
    ],
    faqs: [
      { question: "Is this available after hours?", answer: "You can submit after hours. Doctor review follows the service operating model." },
      { question: "Can it be used for study?", answer: "It can support short study absence evidence, subject to your institution's process." },
      { question: "Is payment secure?", answer: "Yes. Checkout uses Stripe and shows the amount before payment." },
    ],
  }),
  cityMedCertPage({
    priority: 16,
    slug: "medical-certificate-online-gold-coast",
    title: "Medical Certificate Online Gold Coast | InstantMed",
    description: `Gold Coast medical certificate requests online from ${PRICING_DISPLAY.MED_CERT}. Doctor reviewed before issue.`,
    h1: "Medical certificate online on the Gold Coast",
    answer: "Gold Coast patients can request a short medical certificate online when symptoms are non-urgent and telehealth review is clinically suitable.",
    intro: "A focused pathway for tourism, hospitality, healthcare, retail, and office workers who need evidence without a waiting room.",
    searchQuery: "medical certificate online gold coast",
    alternateQueries: ["gold coast online medical certificate", "sick certificate online gold coast", "doctor certificate online gold coast"],
    userNeed: "Request a Gold Coast certificate online",
    urgency: "same-day",
    serviceType: "medical-certificate",
    keywords: ["medical certificate online gold coast", "sick certificate online gold coast", "doctor certificate gold coast"],
    visual: VISUALS.medCert,
    internalLinks: medCertLinks,
    related: medCertRelated,
    blocks: [
      { id: "local-fit", title: "Local fit", type: "text", content: "Telehealth can reduce friction for short, clear absences across shift-heavy local industries." },
      { id: "certificate-options", title: "Options", type: "list", content: ["One day certificate request.", "Two day certificate request.", "Three day certificate request."] },
      { id: "urgent", title: "Urgent symptoms", type: "callout", content: "Use urgent local care for severe symptoms, serious injury, or rapid deterioration." },
    ],
    faqs: [
      { question: "Is the Gold Coast covered?", answer: "Yes. InstantMed is available to eligible patients in Australia." },
      { question: "Can I request for a weekend shift?", answer: "Yes. Provide the affected date and relevant shift context." },
      { question: "What happens after approval?", answer: "If approved, the certificate is delivered securely as a PDF." },
    ],
  }),
  repeatScriptPage({
    priority: 17,
    slug: "repeat-prescription-online",
    title: "Repeat Prescription Online Australia | InstantMed",
    description: `Request a repeat prescription online from ${PRICING_DISPLAY.REPEAT_SCRIPT}. Doctor reviewed, service-level prescription pathway, no drug-led advertising.`,
    h1: "Repeat prescription online",
    answer: "You can request a repeat prescription online for an existing regular medicine. A doctor reviews suitability and may issue an eScript if approved.",
    intro: "This page is for stable, ongoing medicines where you are requesting a repeat, not a new diagnosis or a medicine selected from an advertisement.",
    searchQuery: "repeat prescription online",
    alternateQueries: ["repeat script online", "renew prescription online", "online prescription renewal australia"],
    userNeed: "Renew an existing regular prescription without a routine clinic visit",
    urgency: "same-day",
    serviceType: "prescription",
    keywords: ["repeat prescription online", "repeat script online", "online prescription renewal"],
    visual: VISUALS.prescription,
    internalLinks: repeatScriptLinks,
    related: repeatScriptRelated,
    blocks: [
      {
        id: "service-level",
        title: "Service-level request",
        type: "text",
        content: "InstantMed collects your current medicine details inside the secure request flow. Public pages stay service-level to avoid promoting prescription-only medicines.",
      },
      {
        id: "doctor-checks",
        title: "Doctor checks",
        type: "list",
        content: [
          "Your current medicine, dose, and how long you have used it.",
          "Recent review or monitoring details where relevant.",
          "Safety concerns, side effects, interactions, and red flags.",
        ],
      },
      {
        id: "not-automatic",
        title: "Not automatic",
        type: "callout",
        content: "A repeat request can be declined if it is unsafe, overdue for review, outside scope, or better handled by your regular GP.",
      },
    ],
    faqs: [
      { question: "Can I enter my medicine name?", answer: "Yes, inside the secure request flow. Public pages do not advertise specific prescription medicine names." },
      { question: "What does it cost?", answer: `Repeat prescription requests start at ${PRICING_DISPLAY.REPEAT_SCRIPT}.` },
      { question: "How is the script sent?", answer: "If approved, the doctor can issue an electronic prescription token by SMS or email." },
    ],
  }),
  repeatScriptPage({
    priority: 18,
    slug: "after-hours-repeat-prescription",
    title: "After-Hours Repeat Prescription Online | InstantMed",
    description: `Running low after hours? Request a repeat prescription online from ${PRICING_DISPLAY.REPEAT_SCRIPT}. Doctor reviewed before any eScript.`,
    h1: "After-hours repeat prescription",
    answer: "You can submit a repeat prescription request after hours. Doctor review follows the service operating hours and prescribing is never automatic.",
    intro: "Use this when your regular GP is closed and you need a safe pathway for an existing regular medicine.",
    searchQuery: "after hours repeat prescription",
    alternateQueries: ["after hours prescription repeat", "repeat script after hours", "online script after hours"],
    userNeed: "Submit a repeat request outside clinic hours",
    urgency: "immediate",
    serviceType: "prescription",
    keywords: ["after hours repeat prescription", "after hours prescription repeat", "repeat script after hours"],
    visual: VISUALS.prescriptionAlt,
    internalLinks: repeatScriptLinks,
    related: repeatScriptRelated,
    blocks: [
      { id: "timing", title: "Timing", type: "text", content: "The form can be submitted at any time. Review timing depends on doctor availability and whether follow-up is needed." },
      { id: "good-fit", title: "Good fit", type: "list", content: ["Existing regular medicine.", "Stable condition.", "Enough details for safe doctor review."] },
      { id: "urgent-medicine-risk", title: "Urgent risk", type: "callout", content: "If missing a medicine dose could be dangerous, contact an urgent care service, pharmacist, or emergency service rather than waiting online." },
    ],
    faqs: [
      { question: "Can I submit at night?", answer: "Yes. You can submit the form after hours and it will be reviewed according to doctor availability." },
      { question: "Is after-hours pricing higher?", answer: "The repeat prescription request price is shown before payment. Optional priority fees are separate where offered." },
      { question: "Can I request a new medicine?", answer: "This page is for repeat requests. New symptoms or new treatment decisions need a broader consultation." },
    ],
  }),
  repeatScriptPage({
    priority: 19,
    slug: "weekend-repeat-prescription",
    title: "Weekend Repeat Prescription Online | InstantMed",
    description: `Need a repeat script on the weekend? Submit online from ${PRICING_DISPLAY.REPEAT_SCRIPT}. Doctor reviewed before approval.`,
    h1: "Weekend repeat prescription online",
    answer: "You can submit a weekend repeat prescription request for an existing regular medicine. A doctor reviews whether an eScript is appropriate.",
    intro: "A practical option when you notice the issue on Saturday or Sunday and your usual clinic is closed.",
    searchQuery: "weekend repeat prescription",
    alternateQueries: ["repeat script weekend", "weekend prescription renewal", "online prescription weekend"],
    userNeed: "Request a regular medicine repeat during the weekend",
    urgency: "same-day",
    serviceType: "prescription",
    keywords: ["weekend repeat prescription", "repeat script weekend", "weekend prescription renewal"],
    visual: VISUALS.prescription,
    internalLinks: repeatScriptLinks,
    related: repeatScriptRelated,
    blocks: [
      { id: "weekend-context", title: "Weekend context", type: "text", content: "Weekend requests are common when pharmacy stock checks, travel, or roster patterns reveal a repeat is needed sooner than expected." },
      { id: "details", title: "Details to prepare", type: "list", content: ["Medicine label or prior prescription details.", "Dose and timing.", "Recent doctor review or monitoring history."] },
      { id: "doctor-call", title: "Follow-up", type: "callout", content: "We ask for the missing detail before a decision if the request needs clarification." },
    ],
    faqs: [
      { question: "Can I use any pharmacy?", answer: "Most Australian pharmacies can dispense electronic prescription tokens. Check with your chosen pharmacy if unsure." },
      { question: "Can I get repeats as well?", answer: "The doctor decides the quantity and repeats based on clinical suitability and prescribing rules." },
      { question: "Can controlled medicines be requested?", answer: "InstantMed does not use this public pathway for high-risk or tightly controlled prescribing." },
    ],
  }),
  repeatScriptPage({
    priority: 20,
    slug: "urgent-repeat-prescription-online",
    title: "Urgent Repeat Prescription Online | InstantMed",
    description: `Request an urgent repeat prescription review online from ${PRICING_DISPLAY.REPEAT_SCRIPT}. Existing regular medicines only, doctor reviewed.`,
    h1: "Urgent repeat prescription online",
    answer: "If you are running low on an existing regular medicine, you can request urgent repeat review online. If missing doses is dangerous, seek urgent local care.",
    intro: "This page separates genuine time pressure from medical emergencies. The request is still reviewed by a doctor before any prescription is issued.",
    searchQuery: "urgent repeat prescription online",
    alternateQueries: ["urgent repeat script online", "emergency repeat prescription online", "need repeat prescription today"],
    userNeed: "Avoid running out of an existing regular medicine",
    urgency: "immediate",
    serviceType: "prescription",
    keywords: ["urgent repeat prescription online", "urgent repeat script online", "repeat prescription today"],
    visual: VISUALS.prescriptionAlt,
    internalLinks: repeatScriptLinks,
    related: repeatScriptRelated,
    blocks: [
      { id: "urgent-not-emergency", title: "Urgent, not emergency", type: "text", content: "Use InstantMed when the request is time-sensitive but safe for telehealth review. Use urgent care when the health risk is immediate." },
      { id: "prepare", title: "Prepare before checkout", type: "list", content: ["Current medicine details.", "Last prescriber or pharmacy details if known.", "Reason you cannot access your usual GP in time."] },
      { id: "safety", title: "Safety first", type: "callout", content: "The doctor may decline and direct you elsewhere if the request cannot be handled safely online." },
    ],
    faqs: [
      { question: "Can priority review help?", answer: "Priority options may be shown in checkout where available, but clinical review still determines the outcome." },
      { question: "Will I definitely get a prescription?", answer: "No. A prescription is issued only if the doctor decides it is safe and appropriate." },
      { question: "Can I use this while travelling in Australia?", answer: "Yes, if you are physically in Australia and can provide enough information for review." },
    ],
  }),
  comparisonPage({
    priority: 21,
    slug: "online-doctor-certificate-australia",
    title: "Online Doctor Certificate Australia | InstantMed",
    description: `Compare online doctor certificate options in Australia. InstantMed starts at ${PRICING_DISPLAY.MED_CERT} with doctor review before issue.`,
    h1: "Online doctor certificate in Australia",
    answer: "An online doctor certificate is a medical certificate issued after telehealth review. It is best for short, non-urgent absences where online assessment is clinically suitable.",
    intro: "This page explains the practical difference between an online certificate request, a clinic appointment, and higher-stakes medical evidence.",
    price: PRICING_DISPLAY.FROM_MED_CERT,
    searchQuery: "online doctor certificate australia",
    alternateQueries: ["doctor certificate online australia", "online medical certificate australia", "telehealth doctor certificate"],
    userNeed: "Understand online doctor certificate options",
    urgency: "flexible",
    serviceType: "medical-certificate",
    keywords: ["online doctor certificate australia", "doctor certificate online", "telehealth certificate australia"],
    visual: VISUALS.consult,
    internalLinks: comparisonLinks,
    related: medCertRelated,
    primaryCTA: "Start certificate request",
    ctaUrl: "/request?service=med-cert",
    blocks: [
      { id: "what-it-is", title: "What it is", type: "text", content: "The doctor reviews your clinical information remotely and decides whether a short certificate is appropriate." },
      { id: "compare", title: "Compare options", type: "list", content: ["Online: fastest for simple short absences.", "Clinic: better for physical exams or complex symptoms.", "Urgent care: appropriate for severe or unsafe symptoms."] },
      { id: "limits", title: "Limits", type: "callout", content: "Online doctor certificates are not suitable for every context and do not replace employer, institution, or legal processes." },
    ],
    faqs: [
      { question: "Is it a real doctor review?", answer: "Yes. An AHPRA-registered doctor reviews the request before issue." },
      { question: "How much does InstantMed cost?", answer: `Medical certificate requests start at ${PRICING_DISPLAY.MED_CERT}.` },
      { question: "Can it be used outside Australia?", answer: "InstantMed is for patients physically located in Australia." },
    ],
  }),
  comparisonPage({
    priority: 22,
    slug: "telehealth-medical-certificate-vs-gp",
    title: "Telehealth Medical Certificate vs GP Visit | InstantMed",
    description: `Telehealth medical certificate or GP visit? Compare fit, cost, and safety. InstantMed starts at ${PRICING_DISPLAY.MED_CERT}.`,
    h1: "Telehealth medical certificate vs GP visit",
    answer: "Use telehealth for simple short certificate requests. Use a GP visit when you need examination, continuity, complex care, or longer-term support.",
    intro: "This comparison helps patients choose the safer and more efficient path, not just the fastest one.",
    price: PRICING_DISPLAY.FROM_MED_CERT,
    searchQuery: "telehealth medical certificate vs gp",
    alternateQueries: ["online medical certificate vs doctor", "telehealth certificate or gp", "medical certificate online or clinic"],
    userNeed: "Choose between telehealth and a clinic appointment",
    urgency: "flexible",
    serviceType: "medical-certificate",
    keywords: ["telehealth medical certificate", "online certificate vs gp", "medical certificate comparison"],
    visual: VISUALS.consult,
    internalLinks: comparisonLinks,
    related: medCertRelated,
    primaryCTA: "Start certificate request",
    ctaUrl: "/request?service=med-cert",
    blocks: [
      { id: "telehealth-fit", title: "Telehealth fit", type: "list", content: ["Short non-urgent illness.", "No physical exam needed.", "Clear absence dates and symptoms."] },
      { id: "gp-fit", title: "GP fit", type: "list", content: ["Worsening symptoms.", "Longer or repeated absence.", "Need for tests, examination, or ongoing care."] },
      { id: "safety", title: "Safety", type: "callout", content: "The Medical Board expects telehealth to meet safe standards and to redirect patients when online care is not appropriate." },
    ],
    faqs: [
      { question: "Is telehealth always enough?", answer: "No. It is suitable only where the doctor can safely assess the request remotely." },
      { question: "Is a GP better for ongoing problems?", answer: "Usually yes. Ongoing or recurrent issues need continuity of care." },
      { question: "Can I start online and be redirected?", answer: "Yes. The doctor may recommend in-person care if needed." },
    ],
  }),
  comparisonPage({
    priority: 23,
    slug: "online-medical-certificate-comparison",
    title: "Online Medical Certificate Comparison | InstantMed",
    description: `Compare online medical certificate services by price, doctor review, privacy, and evidence quality. InstantMed starts at ${PRICING_DISPLAY.MED_CERT}.`,
    h1: "Online medical certificate comparison",
    answer: "The best online certificate service is transparent about price, doctor review, clinical limits, privacy, and what happens if the request is declined.",
    intro: "This page gives patients a practical buying checklist instead of a generic list of providers.",
    price: PRICING_DISPLAY.FROM_MED_CERT,
    searchQuery: "online medical certificate comparison",
    alternateQueries: ["best online medical certificate", "compare medical certificate online", "online doctor certificate comparison"],
    userNeed: "Compare certificate services before paying",
    urgency: "flexible",
    serviceType: "medical-certificate",
    keywords: ["online medical certificate comparison", "compare medical certificate online", "best online medical certificate"],
    visual: VISUALS.medCertAlt,
    internalLinks: comparisonLinks,
    related: medCertRelated,
    primaryCTA: "Start certificate request",
    ctaUrl: "/request?service=med-cert",
    blocks: [
      { id: "checklist", title: "Buying checklist", type: "list", content: ["Clear price before checkout.", "AHPRA-registered doctor review.", "No unsupported employer outcome promises.", "Secure certificate delivery and verification."] },
      { id: "watch-outs", title: "Watch-outs", type: "text", content: "Avoid services that promise certificate outcomes without review, hide prices until late, or blur the line between doctor review and self-declaration." },
      { id: "instantmed-position", title: "InstantMed position", type: "callout", content: "InstantMed optimises for short, clear, doctor reviewed requests and keeps clinical boundaries visible before payment." },
    ],
    faqs: [
      { question: "What should I compare first?", answer: "Price, doctor review, refund/decline handling, privacy, and certificate verification." },
      { question: "Should the cheapest option always win?", answer: "No. A slightly better clinical and privacy process matters more than saving a few dollars." },
      { question: "What is InstantMed's starting price?", answer: `Medical certificate requests start at ${PRICING_DISPLAY.MED_CERT}.` },
    ],
  }),
  comparisonPage({
    priority: 24,
    slug: "instant-scripts-alternative-medical-certificate",
    title: "Instant Scripts Alternative for Medical Certificates | InstantMed",
    description: `Looking for an Instant Scripts alternative for medical certificates? Compare service fit, price, and doctor review. InstantMed starts at ${PRICING_DISPLAY.MED_CERT}.`,
    h1: "Instant Scripts alternative for medical certificates",
    answer: "If you are comparing certificate services, focus on doctor review, clear price, privacy, and evidence format rather than brand familiarity alone.",
    intro: "InstantMed is a focused alternative for short online medical certificate requests and service-level repeat prescription review.",
    price: PRICING_DISPLAY.FROM_MED_CERT,
    searchQuery: "instant scripts alternative medical certificate",
    alternateQueries: ["instant scripts alternative", "instant scripts medical certificate alternative", "alternative to instant scripts certificate"],
    userNeed: "Compare InstantMed against a known telehealth brand",
    urgency: "flexible",
    serviceType: "multiple",
    keywords: ["instant scripts alternative", "medical certificate alternative", "telehealth certificate alternative"],
    visual: VISUALS.consult,
    internalLinks: comparisonLinks,
    related: [
      { type: "intent", slug: "online-medical-certificate-comparison", title: "Online medical certificate comparison" },
      { type: "category", slug: "medical-certificate", title: "Medical certificate service" },
      { type: "category", slug: "prescriptions", title: "Prescription service" },
    ],
    primaryCTA: "View InstantMed services",
    ctaUrl: "/request",
    blocks: [
      { id: "compare-on", title: "Compare on", type: "list", content: ["Service scope.", "Upfront pricing.", "Clinical review model.", "Privacy and certificate verification."] },
      { id: "positioning", title: "InstantMed positioning", type: "text", content: "InstantMed is built around focused, one-off requests with clear pricing and doctor review rather than a broad pharmacy-led marketplace experience." },
      { id: "compliance", title: "Compliance boundary", type: "callout", content: "Prescription pages stay service-level. Specific medicine suitability belongs inside a private clinical request, not public advertising copy." },
    ],
    faqs: [
      { question: "Is this page drug-led?", answer: "No. It compares service pathways and does not advertise prescription-only medicines." },
      { question: "Can I request a certificate here?", answer: "Yes. Start with the certificate service if your need is short absence evidence." },
      { question: "Can I request a repeat prescription too?", answer: "Yes, through the repeat prescription pathway if it is an existing regular medicine and doctor review supports it." },
    ],
  }),
  comparisonPage({
    priority: 25,
    slug: "bulk-billed-telehealth-vs-instantmed",
    title: "Bulk-Billed Telehealth vs InstantMed | Clear Price Comparison",
    description: `Compare bulk-billed telehealth and InstantMed private online requests. Certificates start at ${PRICING_DISPLAY.MED_CERT}; repeat requests start at ${PRICING_DISPLAY.REPEAT_SCRIPT}.`,
    h1: "Bulk-billed telehealth vs InstantMed",
    answer: "Bulk-billed telehealth can be the right choice when available and suitable. InstantMed is a private, fixed-price option for focused one-off requests.",
    intro: "The tradeoff is simple: bulk billing may reduce out-of-pocket cost, while InstantMed optimises for a narrow, clear, paid pathway.",
    price: PRICING_DISPLAY.RANGE,
    searchQuery: "bulk billed telehealth vs instantmed",
    alternateQueries: ["bulk billed telehealth medical certificate", "private telehealth medical certificate", "online doctor price comparison"],
    userNeed: "Choose between no-gap telehealth and private fixed-price service",
    urgency: "flexible",
    serviceType: "multiple",
    keywords: ["bulk billed telehealth vs private", "online doctor price comparison", "telehealth medical certificate price"],
    visual: VISUALS.consult,
    internalLinks: comparisonLinks,
    related: [
      { type: "intent", slug: "same-day-medical-certificate", title: "Same day medical certificate" },
      { type: "intent", slug: "repeat-prescription-online", title: "Repeat prescription online" },
      { type: "category", slug: "pricing", title: "InstantMed pricing" },
    ],
    primaryCTA: "View request options",
    ctaUrl: "/request",
    blocks: [
      { id: "bulk-billed-fit", title: "Bulk-billed fit", type: "list", content: ["You have an available GP or eligible telehealth provider.", "You need continuity of care.", "You can wait for an appointment that suits the provider."] },
      { id: "instantmed-fit", title: "InstantMed fit", type: "list", content: ["You need a focused one-off request.", "You want price shown before payment.", "You are comfortable with private fixed-fee care."] },
      { id: "honest-tradeoff", title: "Honest tradeoff", type: "callout", content: "InstantMed is not the cheapest possible healthcare pathway. It is built for clarity, speed, and narrow-scope requests when that tradeoff is worth it." },
    ],
    faqs: [
      { question: "Is InstantMed bulk billed?", answer: "No. InstantMed is a private fixed-fee service." },
      { question: "When should I choose my regular GP?", answer: "Choose your regular GP for ongoing problems, complex history, medication changes, or anything needing continuity." },
      { question: "Are prices shown upfront?", answer: "Yes. Service prices are shown before payment." },
    ],
  }),
]

export function getIntentPageBySlug(slug: string): IntentPage | undefined {
  return intentPages.find((p) => p.slug === slug)
}

export function getAllIntentSlugs(): string[] {
  return intentPages.map((p) => p.slug)
}

export function getIntentPagesByUrgency(urgency: "immediate" | "same-day" | "flexible"): IntentPage[] {
  return intentPages.filter((p) => p.intent.urgency === urgency)
}
