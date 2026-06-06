export interface AuthorityAssetSource {
  id: string
  title: string
  publisher: string
  url: string
  accessed: string
}

export interface AuthorityAssetVisual {
  id: string
  title: string
  assetPath: string
  alt: string
  caption: string
  prompt: string
}

export type AuthorityAssetCategory =
  | "certificate-evidence"
  | "prescription-safety"
  | "telehealth-access"
  | "privacy-governance"

export interface AuthorityAssetSection {
  id: string
  title: string
  claim: string
  body: string[]
  sourceIds: string[]
}

export interface AuthorityAsset {
  slug: string
  category: AuthorityAssetCategory
  title: string
  metadataTitle: string
  description: string
  eyebrow: string
  summary: string
  lastReviewed: string
  readingTime: string
  sections: AuthorityAssetSection[]
  sources: AuthorityAssetSource[]
  visuals?: AuthorityAssetVisual[]
  clinicalLimits: string[]
  relatedLinks: Array<{ title: string; href: string }>
}

export interface AuthorityAssetSummary {
  slug: string
  category: AuthorityAssetCategory
  title: string
  description: string
  eyebrow: string
  lastReviewed: string
  readingTime: string
  visual?: AuthorityAssetVisual
}

export interface AuthorityAssetGroup {
  id: AuthorityAssetCategory
  title: string
  description: string
  assets: AuthorityAssetSummary[]
}

const REVIEWED_ON = "6 June 2026"
const ACCESSED_ON = "6 June 2026"

const source = (
  id: string,
  title: string,
  publisher: string,
  url: string,
): AuthorityAssetSource => ({
  id,
  title,
  publisher,
  url,
  accessed: ACCESSED_ON,
})

const medicalBoardTelehealth = source(
  "medical-board-telehealth",
  "Guidelines: Telehealth consultations with patients",
  "Medical Board of Australia",
  "https://www.ahpra.gov.au/documents/default.aspx?chksum=k1ukXhPKYF7iT1Q20wSyqg%3D%3D&dbid=AP&record=WD23%2F32933",
)

const ahpraAdvertising = source(
  "ahpra-advertising",
  "Guidelines for advertising a regulated health service",
  "Australian Health Practitioner Regulation Agency",
  "https://www.ahpra.gov.au/Resources/Advertising-hub/Advertising-guidelines-and-other-guidance/Advertising-guidelines.aspx",
)

const fairWorkEvidence = source(
  "fair-work-evidence",
  "Notice and medical certificates",
  "Fair Work Ombudsman",
  "https://www.fairwork.gov.au/leave/sick-and-carers-leave/paid-sick-and-carers-leave/notice-and-medical-certificates",
)

const healthElectronicPrescribing = source(
  "health-electronic-prescribing",
  "Electronic prescribing",
  "Australian Government Department of Health, Disability and Ageing",
  "https://www.health.gov.au/our-work/electronic-prescribing",
)

const digitalHealthPrescriptions = source(
  "digital-health-prescriptions",
  "Electronic prescriptions",
  "Australian Digital Health Agency",
  "https://www.digitalhealth.gov.au/get-started-with-digital-health/electronic-prescriptions",
)

const tgaPublicAdvertising = source(
  "tga-public-advertising",
  "What can and cannot be advertised to the general public",
  "Therapeutic Goods Administration",
  "https://www.tga.gov.au/products/regulations-all-products/advertising/advertising-basics/what-can-and-cannot-be-advertised-general-public",
)

const absPatientExperiences = source(
  "abs-patient-experiences",
  "Patient Experiences, 2024-25 financial year",
  "Australian Bureau of Statistics",
  "https://www.abs.gov.au/statistics/health/health-services/patient-experiences/2024-25",
)

const productivityCommissionPrimaryCare = source(
  "pc-primary-care",
  "Report on Government Services 2026: Primary and community health",
  "Productivity Commission",
  "https://www.pc.gov.au/ongoing/report-on-government-services/health/primary-and-community-health",
)

const healthTelehealth = source(
  "health-telehealth",
  "Telehealth",
  "Australian Government Department of Health, Disability and Ageing",
  "https://www.health.gov.au/topics/health-technologies-and-digital-health/about/telehealth",
)

const ahpraRaiseConcern = source(
  "ahpra-raise-concern",
  "How to raise a concern about a health practitioner",
  "Australian Health Practitioner Regulation Agency",
  "https://www.ahpra.gov.au/Notifications/Concerned-about-a-health-practitioner.aspx",
)

const ahpraMandatoryReporting = source(
  "ahpra-mandatory-reporting",
  "Making a mandatory notification",
  "Australian Health Practitioner Regulation Agency",
  "https://www.ahpra.gov.au/Notifications/Mandatory-reporting.aspx",
)

const oaicOrganisationComplaint = source(
  "oaic-organisation-complaint",
  "Complain to an organisation or agency",
  "Office of the Australian Information Commissioner",
  "https://www.oaic.gov.au/privacy/privacy-complaints/complain-to-an-organisation-or-agency",
)

const nswHcccComplaint = source(
  "nsw-hccc-complaint",
  "Make a complaint online",
  "NSW Health Care Complaints Commission",
  "https://www.hccc.nsw.gov.au/understanding-complaints/make-a-complaint-online",
)

const healthdirectTripleZero = source(
  "healthdirect-triple-zero",
  "Calling triple zero (000)",
  "Healthdirect Australia",
  "https://www.healthdirect.gov.au/calling-triple-zero",
)

const ahpraPractitionerRegister = source(
  "ahpra-practitioner-register",
  "Registers of practitioners",
  "Australian Health Practitioner Regulation Agency",
  "https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx",
)

const ahpraPublicRegisterTips = source(
  "ahpra-public-register-tips",
  "Tips for using the public register",
  "Australian Health Practitioner Regulation Agency",
  "https://www.ahpra.gov.au/registration/registers-of-practitioners/tips-for-using-the-public-register.aspx",
)

const oaicHealthPrivacyGuide = source(
  "oaic-health-privacy-guide",
  "Guide to health privacy",
  "Office of the Australian Information Commissioner",
  "https://www.oaic.gov.au/privacy/guidance-and-advice/guide-to-health-privacy/",
)

const oaicAustralianPrivacyPrinciples = source(
  "oaic-australian-privacy-principles",
  "Australian Privacy Principles",
  "Office of the Australian Information Commissioner",
  "https://www.oaic.gov.au/privacy/australian-privacy-principles",
)

const safetyQualityCharter = source(
  "safety-quality-charter",
  "Understanding your healthcare rights",
  "Australian Commission on Safety and Quality in Health Care",
  "https://www.safetyandquality.gov.au/consumers/understanding-your-rights",
)

const mbsTelehealthArrangements = source(
  "mbs-telehealth-arrangements",
  "MBS Telehealth Services from January 2022",
  "MBS Online",
  "https://www.mbsonline.gov.au/internet/mbsonline/publishing.nsf/Content/Factsheet-Telehealth-Arrangements-Jan22",
)

const healthMedicareCovers = source(
  "health-medicare-covers",
  "What Medicare covers",
  "Australian Government Department of Health, Disability and Ageing",
  "https://www.health.gov.au/topics/medicare/about/what-medicare-covers",
)

const healthBulkBillingFactSheet = source(
  "health-bulk-billing-fact-sheet",
  "Medicare's got the bill: Bulk Billing for all Australians fact sheet",
  "Australian Government Department of Health, Disability and Ageing",
  "https://www.health.gov.au/bulkbilling/resources/publications/medicares-got-the-bill-bulk-billing-for-all-australians-fact-sheet?language=en",
)

const aihwRuralRemoteHealth = source(
  "aihw-rural-remote-health",
  "Rural and remote health",
  "Australian Institute of Health and Welfare",
  "https://www.aihw.gov.au/reports/rural-remote-australians/rural-and-remote-health",
)

const visual = (
  slug: string,
  id: string,
  title: string,
  alt: string,
  caption: string,
  prompt: string,
): AuthorityAssetVisual => ({
  id,
  title,
  assetPath: `/images/resources/${slug}/${id}.webp`,
  alt,
  caption,
  prompt,
})

export const AUTHORITY_ASSET_SLUGS = [
  "telehealth-safety-checklist",
  "medical-certificate-employer-policy",
  "secure-online-prescription-requests",
  "gp-wait-times-telehealth-access",
  "complaints-clinical-governance",
  "online-medical-certificate-verification",
  "telehealth-privacy-health-data-checklist",
  "when-telehealth-is-not-appropriate",
  "medicare-bulk-billing-private-telehealth",
  "rural-remote-telehealth-access",
  "repeat-prescription-safety-checklist",
] as const

export type AuthorityAssetSlug = (typeof AUTHORITY_ASSET_SLUGS)[number]

const AUTHORITY_ASSET_GROUPS: Array<Omit<AuthorityAssetGroup, "assets">> = [
  {
    id: "certificate-evidence",
    title: "Certificate evidence",
    description:
      "Workplace evidence, employer policy, and online certificate verification resources.",
  },
  {
    id: "prescription-safety",
    title: "Prescription safety",
    description:
      "Medicine-neutral explainers for secure online prescription requests and repeat prescription review.",
  },
  {
    id: "telehealth-access",
    title: "Telehealth access",
    description:
      "Source-backed explainers on telehealth suitability, access pressure, Medicare, and regional care.",
  },
  {
    id: "privacy-governance",
    title: "Privacy and governance",
    description:
      "Plain-English health data, complaints, privacy escalation, and clinical governance references.",
  },
]

export const AUTHORITY_ASSETS: AuthorityAsset[] = [
  {
    slug: "telehealth-safety-checklist",
    category: "telehealth-access",
    title: "Australian telehealth safety checklist",
    metadataTitle: "Australian Telehealth Safety Checklist | InstantMed",
    description:
      "A source-backed checklist for assessing whether an Australian telehealth service is safe, accountable, privacy-aware, and clinically bounded.",
    eyebrow: "Telehealth safety",
    summary:
      "Use this checklist to assess the structure around an online consultation: practitioner identity, clinical suitability, privacy, prescribing boundaries, and escalation when remote care is not enough.",
    lastReviewed: REVIEWED_ON,
    readingTime: "6 min",
    sections: [
      {
        id: "doctor-identity",
        title: "Check the treating doctor's identity",
        claim:
          "A safe telehealth consultation should identify the practitioner and make registration checks possible.",
        body: [
          "The Medical Board guidance says doctors should tell patients who they are, their role, and their principal place of practice, particularly for new patients.",
          "For a patient, employer, or journalist checking a service, the practical question is simple: can the treating doctor's registration be verified through the public AHPRA register if needed?",
        ],
        sourceIds: ["medical-board-telehealth"],
      },
      {
        id: "patient-identity",
        title: "Confirm the patient, not just the request",
        claim:
          "Telehealth safety depends on confirming the patient's identity and the consultation context.",
        body: [
          "Medical Board guidance expects doctors to confirm, to the best of their ability, the identity of the patient and any other people present at each consultation.",
          "For form-first care, identity checks should sit alongside the clinical history, not after the clinical decision has already been made.",
        ],
        sourceIds: ["medical-board-telehealth"],
      },
      {
        id: "clinical-fit",
        title: "Decide whether remote care is clinically suitable",
        claim:
          "Telehealth is suitable only when the doctor can make a safe decision without an in-person examination.",
        body: [
          "The Medical Board guidance expects doctors to keep assessing whether telehealth remains appropriate and to arrange in-person care if necessary.",
          "A credible service should be comfortable declining or redirecting a request when symptoms, uncertainty, or risk make remote review the wrong pathway.",
        ],
        sourceIds: ["medical-board-telehealth"],
      },
      {
        id: "privacy-records",
        title: "Protect privacy and keep usable records",
        claim:
          "Telehealth should protect informed consent, confidentiality, privacy, and the clinical record.",
        body: [
          "Medical Board guidance puts consent, privacy, confidentiality, culturally safe care, and record keeping inside the telehealth standard.",
          "A source-backed telehealth service should explain what information is collected, who can access it, and what happens if the patient needs follow-up documentation.",
        ],
        sourceIds: ["medical-board-telehealth"],
      },
      {
        id: "prescribing-boundaries",
        title: "Separate clinical assessment from medicine promotion",
        claim:
          "Public telehealth content should not turn prescribing into product advertising.",
        body: [
          "The TGA says some therapeutic goods, including prescription-only medicines and unapproved goods, cannot be advertised to the public.",
          "The safe public framing is assessment-first: a doctor reviews the information, decides whether remote care is appropriate, and uses a compliant prescribing pathway only where clinically appropriate.",
        ],
        sourceIds: ["tga-public-advertising", "medical-board-telehealth"],
      },
      {
        id: "emergency-boundary",
        title: "Keep emergencies out of routine telehealth",
        claim:
          "Emergency symptoms need emergency care rather than a routine online request.",
        body: [
          "Healthdirect advises people in Australia to call triple zero immediately for a medical emergency.",
          "A telehealth service should make this boundary visible before patients mistake a routine online pathway for urgent assessment.",
        ],
        sourceIds: ["healthdirect-triple-zero"],
      },
    ],
    sources: [
      medicalBoardTelehealth,
      tgaPublicAdvertising,
      healthdirectTripleZero,
    ],
    clinicalLimits: [
      "This checklist is general information and is not medical advice.",
      "Telehealth can be inappropriate when symptoms need examination, urgent assessment, tests, or ongoing in-person care.",
      "A doctor may approve, decline, ask for more information, or recommend another pathway.",
    ],
    relatedLinks: [
      { title: "Trust and safety", href: "/trust" },
      { title: "Clinical governance", href: "/clinical-governance" },
      { title: "How doctors decide", href: "/how-we-decide" },
    ],
  },
  {
    slug: "medical-certificate-employer-policy",
    category: "certificate-evidence",
    title: "Medical certificate employer policy explainer",
    metadataTitle: "Medical Certificate Employer Policy Explainer | InstantMed",
    description:
      "A careful, source-backed explainer on Australian workplace evidence rules, employer policy variation, and how online medical certificates should be assessed.",
    eyebrow: "Workplace evidence",
    summary:
      "Australian employers can ask for evidence for sick or carer's leave, but workplace policies, awards, and agreements can vary. This explainer keeps the legal and clinical claims narrow.",
    lastReviewed: REVIEWED_ON,
    readingTime: "7 min",
    sections: [
      {
        id: "employers-can-ask",
        title: "Employers can ask for evidence",
        claim:
          "Australian employers can ask for evidence when an employee takes sick or carer's leave.",
        body: [
          "Fair Work guidance says employers can ask employees for evidence showing that leave was taken because of illness, injury, or caring responsibilities.",
          "The same guidance says evidence can be requested for as little as one day or less off work.",
        ],
        sourceIds: ["fair-work-evidence"],
      },
      {
        id: "policy-variation",
        title: "Policies and agreements can vary",
        claim:
          "Workplace policies, awards, and registered agreements can affect the evidence process.",
        body: [
          "Fair Work guidance notes that an award or registered agreement can specify when evidence must be given and what type of evidence is required.",
          "That is why online certificate pages should not say that one document is accepted everywhere; the safer wording is that employer and institution policies may vary.",
        ],
        sourceIds: ["fair-work-evidence"],
      },
      {
        id: "reasonable-evidence",
        title: "Evidence should be reasonable",
        claim:
          "The type of evidence requested by an employer should be reasonable in the circumstances.",
        body: [
          "Fair Work guidance uses the reasonableness of the evidence request as the practical standard.",
          "For online certificates, the useful details are the treating doctor's identity, registration details, dates, issue date, and a way for the document to be checked if a workplace queries it.",
        ],
        sourceIds: ["fair-work-evidence"],
      },
      {
        id: "telehealth-context",
        title: "Telehealth can be a healthcare consultation",
        claim:
          "Medical Board guidance recognises telehealth as a way to provide clinical assessment when appropriate.",
        body: [
          "The Medical Board defines telehealth consultations as consultations using technology as an alternative to in-person consultations.",
          "That does not mean every certificate request is appropriate online. It means the doctor must still decide whether the available information supports a safe decision.",
        ],
        sourceIds: ["medical-board-telehealth"],
      },
      {
        id: "certificate-limits",
        title: "A certificate is evidence, not an employment decision",
        claim:
          "A medical certificate supports workplace review but does not make the employer's policy decision.",
        body: [
          "The doctor's role is to assess clinical suitability and issue a certificate only where clinically appropriate.",
          "The employer's role is to apply the relevant workplace policy, award, agreement, or HR process to the evidence provided.",
        ],
        sourceIds: ["fair-work-evidence", "medical-board-telehealth"],
      },
    ],
    sources: [
      fairWorkEvidence,
      medicalBoardTelehealth,
    ],
    clinicalLimits: [
      "This explainer is general information and is not legal advice.",
      "Certificates are issued only where clinically appropriate after doctor review.",
      "Employer, institution, award, agreement, and HR policy requirements may vary.",
      "Return-to-work clearance, workers compensation, fitness-for-duty, and other high-stakes documents may need a different pathway.",
    ],
    relatedLinks: [
      { title: "Medical certificates", href: "/medical-certificate" },
      { title: "Employer evidence page", href: "/medical-certificate/employer-acceptance" },
      { title: "Certificate verification", href: "/verify" },
    ],
  },
  {
    slug: "secure-online-prescription-requests",
    category: "prescription-safety",
    title: "Secure online prescription request explainer",
    metadataTitle: "Secure Online Prescription Requests | InstantMed",
    description:
      "A neutral explainer on secure online prescription requests in Australia, eScript tokens, privacy, clinical review, and public advertising boundaries.",
    eyebrow: "Prescription safety",
    summary:
      "An online prescription request should be treated as a clinical review pathway, not a shopping cart. This page explains the safe sequence without naming or promoting specific medicines.",
    lastReviewed: REVIEWED_ON,
    readingTime: "7 min",
    sections: [
      {
        id: "request-not-order",
        title: "A request is not an order",
        claim:
          "A secure online prescription pathway starts with doctor assessment rather than automatic supply.",
        body: [
          "Medical Board guidance expects doctors to apply the usual standards of care, assess whether telehealth remains appropriate, and comply with prescribing requirements across relevant jurisdictions.",
          "For patients, the useful distinction is that submitting a form starts a clinical review. It does not guarantee that a prescription will be written.",
        ],
        sourceIds: ["medical-board-telehealth"],
      },
      {
        id: "electronic-token",
        title: "Electronic prescriptions use a token model",
        claim:
          "Australian electronic prescriptions can be sent as a unique token by SMS or email.",
        body: [
          "Australian Government information explains that electronic prescribing lets prescribers use legally conformant software to send a patient a token by SMS or email.",
          "The Australian Digital Health Agency describes the token as a QR barcode that a pharmacy scans to unlock the electronic prescription from a secure delivery service.",
        ],
        sourceIds: ["health-electronic-prescribing", "digital-health-prescriptions"],
      },
      {
        id: "security-framework",
        title: "The technical framework matters",
        claim:
          "Electronic prescribing software should follow privacy, security, PBS, and state or territory requirements.",
        body: [
          "The Australian Government says the electronic prescribing framework covers privacy and security standards, PBS rules, and state or territory laws.",
          "That is why a safe online request pathway needs identity details, accurate patient information, and compliant clinical software rather than an informal email exchange.",
        ],
        sourceIds: ["health-electronic-prescribing"],
      },
      {
        id: "public-language",
        title: "Public pages should stay medicine-neutral",
        claim:
          "Public prescription content should explain the review process without promoting specific medicines.",
        body: [
          "The TGA says prescription-only medicines and some other therapeutic goods cannot be advertised to the general public.",
          "A compliant explainer can describe secure requests, doctor review, eScript delivery, and safety limits without using product-led acquisition language.",
        ],
        sourceIds: ["tga-public-advertising", "ahpra-advertising"],
      },
      {
        id: "doctor-contact",
        title: "The doctor may need more information",
        claim:
          "A remote prescription request may need follow-up, redirection, or in-person care.",
        body: [
          "Medical Board guidance expects doctors to arrange follow-up where clinically indicated and to arrange in-person review if necessary.",
          "This means a safe request pathway should allow the doctor to ask for more information, decline the request, or recommend the patient's regular GP or another suitable service.",
        ],
        sourceIds: ["medical-board-telehealth"],
      },
    ],
    sources: [
      medicalBoardTelehealth,
      healthElectronicPrescribing,
      digitalHealthPrescriptions,
      tgaPublicAdvertising,
      ahpraAdvertising,
    ],
    clinicalLimits: [
      "This explainer is general information and is not medicine advice.",
      "Prescription requests are reviewed by a doctor and may be approved, declined, redirected, or held for more information.",
      "Some medicines, symptoms, monitoring needs, and safety risks require in-person care or the patient's regular GP.",
      "Public information should not be used to choose or request a specific prescription medicine.",
    ],
    relatedLinks: [
      { title: "Prescriptions", href: "/prescriptions" },
      { title: "How doctors decide", href: "/how-we-decide" },
      { title: "Clinical governance", href: "/clinical-governance" },
    ],
  },
  {
    slug: "gp-wait-times-telehealth-access",
    category: "telehealth-access",
    title: "GP wait-time and telehealth access brief",
    metadataTitle: "GP Wait-Time and Telehealth Access Brief | InstantMed",
    description:
      "A public-source brief on Australian GP access pressure, waiting-time signals, telehealth use, and where telehealth fits without overstating its limits.",
    eyebrow: "Access brief",
    summary:
      "This brief uses public Australian sources only. It shows where GP access pressure remains visible, how telehealth is used, and why online care is an access layer rather than a replacement for in-person medicine.",
    lastReviewed: REVIEWED_ON,
    readingTime: "8 min",
    sections: [
      {
        id: "delayed-gp-care",
        title: "Access pressure remains visible",
        claim:
          "More than one in four Australians reported delaying or not seeing a GP when needed in 2024-25.",
        body: [
          "The ABS Patient Experiences release reported that 26.6% of people delayed or did not see a GP when needed in 2024-25.",
          "The same release reported that people in outer regional or remote areas were more likely to delay or not use GPs when needed than people in major cities.",
        ],
        sourceIds: ["abs-patient-experiences"],
      },
      {
        id: "waiting-time",
        title: "Waiting time is part of the access problem",
        claim:
          "A significant share of Australians reported GP waiting times longer than they felt acceptable.",
        body: [
          "The ABS reported that 26.0% of people waited longer than they felt acceptable for a GP appointment in 2024-25.",
          "For urgent GP care, the ABS reported that 47.0% of people who saw a GP for urgent medical care waited 24 hours or more.",
        ],
        sourceIds: ["abs-patient-experiences"],
      },
      {
        id: "telehealth-use",
        title: "Telehealth is a mainstream access layer",
        claim:
          "Telehealth remains a common way Australians access health services, even below its pandemic peak.",
        body: [
          "The ABS reported that 22.5% of people had at least one telehealth consultation for their own health in the last 12 months in 2024-25.",
          "The ABS also reported that 18.5% of people had a telehealth consultation with a GP in that period.",
        ],
        sourceIds: ["abs-patient-experiences"],
      },
      {
        id: "service-volume",
        title: "Medicare data also shows telehealth activity",
        claim:
          "The Productivity Commission reported one telehealth GP-type service per person nationally in 2024-25.",
        body: [
          "The Report on Government Services 2026 reported 6.4 GP-type services per person nationally in 2024-25.",
          "The same report reported 1.0 telehealth GP-type service per person nationally in 2024-25.",
        ],
        sourceIds: ["pc-primary-care"],
      },
      {
        id: "fit-not-replacement",
        title: "Telehealth should be matched to clinical fit",
        claim:
          "Telehealth improves access only when it is used for problems that can be safely assessed remotely.",
        body: [
          "The Australian Government notes that expanded telehealth services became an ongoing part of Medicare from 1 January 2022.",
          "Medical Board guidance still expects doctors to decide whether telehealth is clinically appropriate and to arrange in-person care where necessary.",
        ],
        sourceIds: ["health-telehealth", "medical-board-telehealth"],
      },
    ],
    sources: [
      absPatientExperiences,
      productivityCommissionPrimaryCare,
      healthTelehealth,
      medicalBoardTelehealth,
    ],
    clinicalLimits: [
      "This brief is general public-source analysis and is not clinical advice.",
      "Telehealth is not a substitute for emergency care, physical examination, tests, imaging, or ongoing complex care when those are needed.",
      "Access statistics describe populations and cannot predict an individual patient's suitability for online review.",
    ],
    relatedLinks: [
      { title: "Telehealth Australia", href: "/telehealth-australia" },
      { title: "Online doctor Australia", href: "/online-doctor-australia" },
      { title: "Trust and safety", href: "/trust" },
    ],
  },
  {
    slug: "complaints-clinical-governance",
    category: "privacy-governance",
    title: "Plain-English complaints and clinical governance page",
    metadataTitle: "Complaints and Clinical Governance in Plain English | InstantMed",
    description:
      "A plain-English authority page on complaint handling, clinical accountability, practitioner escalation, privacy escalation, and documented governance.",
    eyebrow: "Governance plain English",
    summary:
      "Patients should be able to see how a telehealth service handles complaints and who is accountable for clinical decisions. This page explains the public escalation map and the governance standards we apply.",
    lastReviewed: REVIEWED_ON,
    readingTime: "7 min",
    sections: [
      {
        id: "complaint-path",
        title: "A complaint path should be easy to find",
        claim:
          "A safe health service should tell patients how to raise a complaint in plain language.",
        body: [
          "The NSW Health Care Complaints Commission says complaints must be made in writing and can be lodged through its online portal, by email, by post, or by form.",
          "For a telehealth service, the internal complaint path should be just as clear: who to contact, what to include, when the complaint is acknowledged, and what happens next.",
        ],
        sourceIds: ["nsw-hccc-complaint"],
      },
      {
        id: "clinical-accountability",
        title: "Clinical decisions need accountable clinicians",
        claim:
          "Clinical governance means a registered clinician remains accountable for clinical decisions.",
        body: [
          "Ahpra explains that it can look into safety concerns about registered health practitioners and some people claiming to be health practitioners.",
          "In plain English, the governance question is whether a patient can identify the clinical decision pathway and escalate concerns about care quality if needed.",
        ],
        sourceIds: ["ahpra-raise-concern"],
      },
      {
        id: "mandatory-notifications",
        title: "Serious safety concerns have external pathways",
        claim:
          "Some practitioner concerns may need external notification rather than only internal service handling.",
        body: [
          "Ahpra's mandatory reporting guidance describes limited circumstances involving impairment, intoxication while practising, significant departure from accepted professional standards, or sexual misconduct.",
          "Patients do not need to classify every concern perfectly before asking for help. A plain-English complaints page should point to the relevant external regulator when the concern is about safety or professional conduct.",
        ],
        sourceIds: ["ahpra-mandatory-reporting", "ahpra-raise-concern"],
      },
      {
        id: "privacy-path",
        title: "Privacy complaints have a separate escalation route",
        claim:
          "A privacy complaint should first go to the organisation and may then be escalated to the OAIC.",
        body: [
          "The OAIC says a person may contact the OAIC if they do not receive a response from an organisation within a reasonable time or the complaint is not resolved.",
          "Telehealth services handle health information, so privacy complaint instructions should be separate from general service complaints and clinical complaints.",
        ],
        sourceIds: ["oaic-organisation-complaint"],
      },
      {
        id: "records-and-learning",
        title: "Complaint records should improve the service",
        claim:
          "Complaints should feed a documented quality improvement process rather than disappear into support inboxes.",
        body: [
          "Clinical governance is stronger when complaints are logged, triaged, investigated, and reviewed for patterns.",
          "For patients, the important signal is that raising a concern does not change clinical entitlement. It gives the service information it must handle fairly and use for improvement.",
        ],
        sourceIds: ["ahpra-raise-concern", "oaic-organisation-complaint"],
      },
    ],
    sources: [
      ahpraRaiseConcern,
      ahpraMandatoryReporting,
      oaicOrganisationComplaint,
      nswHcccComplaint,
    ],
    clinicalLimits: [
      "This page is general information and is not legal or regulatory advice.",
      "Complaint escalation routes vary by state, territory, concern type, and whether the concern is clinical, service-related, privacy-related, or about practitioner conduct.",
      "Urgent health concerns should use urgent or emergency care rather than a complaint form.",
    ],
    relatedLinks: [
      { title: "Complaints", href: "/complaints" },
      { title: "Clinical governance", href: "/clinical-governance" },
      { title: "Privacy policy", href: "/privacy" },
    ],
  },
  {
    slug: "online-medical-certificate-verification",
    category: "certificate-evidence",
    title: "Online medical certificate verification guide for employers",
    metadataTitle: "Online Medical Certificate Verification Guide | InstantMed",
    description:
      "A source-backed guide for employers and HR teams checking an online medical certificate without overstating acceptance, workplace policy, or clinical certainty.",
    eyebrow: "Certificate verification",
    summary:
      "This guide explains what an employer can reasonably check on an online medical certificate, how AHPRA registration fits, where Fair Work evidence rules stop, and why workplace policies can still vary.",
    lastReviewed: REVIEWED_ON,
    readingTime: "9 min",
    visuals: [
      visual(
        "online-medical-certificate-verification",
        "certificate-verification-map",
        "Certificate verification map",
        "Evidence checklist diagram for reviewing an online medical certificate in Australia",
        "A premium employer-facing explainer showing the difference between clinical evidence, practitioner registration, workplace policy, and privacy-safe verification questions.",
        "GPT image 2 premium Australian healthcare infographic for an employer evidence checklist. Create a 4:3 editorial diagram with four clear lanes: document details, AHPRA registration check, workplace policy review, and privacy boundary. Use calm navy, eucalyptus, coral, and warm white. Include concise readable labels, no official logos, no fake certificate number, no patient name, no QR code, no price, no guarantee language, and no service CTA.",
      ),
    ],
    sections: [
      {
        id: "certificate-is-evidence",
        title: "Treat the certificate as evidence",
        claim:
          "A medical certificate is evidence for a workplace process, not the employer's final policy decision.",
        body: [
          "Fair Work guidance says employers can ask employees for evidence when they take sick or carer's leave, including for one day or less.",
          "The practical verification task is to assess whether the document contains enough reasonable evidence for the applicable workplace process, then apply the relevant policy, award, agreement, or HR rule.",
        ],
        sourceIds: ["fair-work-evidence"],
      },
      {
        id: "policy-varies",
        title: "Confirm the workplace rule",
        claim:
          "Employer policies, awards, agreements, institutions, and HR systems can set different evidence requirements.",
        body: [
          "Fair Work guidance notes that an award or registered agreement may specify when evidence is required and what evidence must be given.",
          "That is why an online certificate should not be described as universally accepted. A careful employer review starts with the policy that applies to the worker and absence type.",
        ],
        sourceIds: ["fair-work-evidence"],
      },
      {
        id: "doctor-registration",
        title: "Check registration through public channels",
        claim:
          "If the treating doctor details are unclear, the AHPRA public register is the right place to check registration.",
        body: [
          "AHPRA keeps a national public register of registered health practitioners in Australia, including medical practitioners.",
          "For employers, the safe check is whether the practitioner's registration can be found publicly. It is not to ask for private diagnosis details unless a separate lawful basis exists.",
        ],
        sourceIds: ["ahpra-practitioner-register", "ahpra-public-register-tips"],
      },
      {
        id: "telehealth-context",
        title: "Recognise telehealth as a clinical channel",
        claim:
          "Telehealth can be a legitimate consultation method when the doctor decides it is clinically appropriate.",
        body: [
          "Medical Board guidance treats telehealth as a way of providing consultations using technology when clinically suitable.",
          "The verification question is not whether the consultation happened online. It is whether a registered doctor made an accountable clinical decision within a suitable scope.",
        ],
        sourceIds: ["medical-board-telehealth"],
      },
      {
        id: "document-details",
        title: "Look for document integrity signals",
        claim:
          "A useful certificate should include enough non-sensitive details to support verification without exposing diagnosis.",
        body: [
          "Typical non-sensitive checks include patient name, certificate date, incapacity or attendance date range, treating doctor details, practice or service contact details, and any verification channel.",
          "The document should not need to disclose a diagnosis for routine sick leave evidence unless a specific lawful process or workplace requirement applies.",
        ],
        sourceIds: ["fair-work-evidence", "oaic-health-privacy-guide"],
      },
      {
        id: "privacy-boundary",
        title: "Keep diagnosis and health details private",
        claim:
          "Verification should minimise health information exposure because health information is sensitive personal information.",
        body: [
          "OAIC health privacy guidance treats health information as sensitive and explains that collection should be handled carefully.",
          "An employer can usually check the authenticity and evidence details of a certificate without seeking the worker's diagnosis or unrelated clinical history.",
        ],
        sourceIds: ["oaic-health-privacy-guide", "oaic-australian-privacy-principles"],
      },
      {
        id: "if-unclear",
        title: "Escalate unclear documents proportionately",
        claim:
          "If a certificate cannot be verified, the next step should be a proportionate document or policy query.",
        body: [
          "A proportionate pathway is to ask the employee for clarification, contact the issuing service through the stated verification channel, or apply the workplace evidence process.",
          "A query should focus on authenticity and dates first. It should not become a broad request for medical history unless the workplace has a lawful and relevant basis.",
        ],
        sourceIds: ["fair-work-evidence", "oaic-health-privacy-guide"],
      },
    ],
    sources: [
      fairWorkEvidence,
      ahpraPractitionerRegister,
      ahpraPublicRegisterTips,
      medicalBoardTelehealth,
      oaicHealthPrivacyGuide,
      oaicAustralianPrivacyPrinciples,
    ],
    clinicalLimits: [
      "This guide is general information for evidence review and is not legal advice.",
      "Employer, institution, award, agreement, and HR policy requirements may vary.",
      "A certificate is issued only where a doctor decides it is clinically appropriate.",
      "Fitness-for-duty, workers compensation, return-to-work clearance, and high-stakes certificates may need a different process.",
    ],
    relatedLinks: [
      { title: "Medical certificates", href: "/medical-certificate" },
      { title: "Employer evidence page", href: "/medical-certificate/employer-acceptance" },
      { title: "Certificate verification", href: "/verify" },
    ],
  },
  {
    slug: "telehealth-privacy-health-data-checklist",
    category: "privacy-governance",
    title: "Telehealth privacy and health data checklist",
    metadataTitle: "Telehealth Privacy and Health Data Checklist | InstantMed",
    description:
      "A practical Australian checklist for reviewing how a telehealth service collects, protects, discloses, and lets patients access or correct health information.",
    eyebrow: "Health data privacy",
    summary:
      "Health information needs a higher standard than ordinary contact data. This checklist gives patients, journalists, and partners a plain-English way to assess telehealth privacy claims.",
    lastReviewed: REVIEWED_ON,
    readingTime: "10 min",
    visuals: [
      visual(
        "telehealth-privacy-health-data-checklist",
        "health-data-privacy-checklist",
        "Health data privacy checklist",
        "Privacy checklist diagram for telehealth health data collection and storage",
        "A premium privacy explainer showing how collection notices, access controls, disclosure limits, correction rights, and complaint pathways fit together in Australian telehealth.",
        "GPT image 2 premium Australian healthcare privacy infographic for telehealth health data. Create a 4:3 checklist and flow diagram with readable labels: collect only what is needed, explain why, protect access, limit disclosure, allow access and correction, provide complaint path. Use refined clinical editorial styling, secure data layers, warm light, navy, coral, eucalyptus, and soft neutrals. No official logos, no patient identifiers, no screenshots, no lock-only metaphor, no price, no service CTA, no guarantee language.",
      ),
    ],
    sections: [
      {
        id: "health-information-sensitive",
        title: "Start with sensitivity",
        claim:
          "Health information is sensitive personal information and should be handled with stronger safeguards.",
        body: [
          "OAIC health privacy guidance is written specifically for health service providers and explains obligations for handling health information.",
          "In a telehealth context, the practical consequence is that intake answers, identity details, certificates, prescriptions, notes, and complaints should not be treated like ordinary marketing data.",
        ],
        sourceIds: ["oaic-health-privacy-guide"],
      },
      {
        id: "collection-notice",
        title: "Explain collection before collection",
        claim:
          "A telehealth service should make clear what health information it collects and why it needs it.",
        body: [
          "The Australian Privacy Principles cover collection, use, disclosure, governance, access, correction, quality, and security of personal information.",
          "Patients should be able to see why a clinical form asks for symptoms, identity, contact, Medicare, medication, or safety information before they submit it.",
        ],
        sourceIds: ["oaic-australian-privacy-principles", "oaic-health-privacy-guide"],
      },
      {
        id: "minimum-necessary",
        title: "Collect for the clinical purpose",
        claim:
          "A privacy-aware clinical form should collect information that is relevant to the requested assessment.",
        body: [
          "OAIC guidance frames collection around what is necessary for the organisation's functions or activities and around patient notification.",
          "For telehealth, that means a certificate request, repeat prescription request, and specialty assessment should not all ask for the same broad medical history unless each question is clinically relevant.",
        ],
        sourceIds: ["oaic-health-privacy-guide", "oaic-australian-privacy-principles"],
      },
      {
        id: "confidential-access",
        title: "Restrict access by role and need",
        claim:
          "Clinical information should be accessed by people who need it for care, safety, support, or governance.",
        body: [
          "The Medical Board telehealth guidance places privacy, confidentiality, consent, and record keeping inside the expected standard of care.",
          "A strong telehealth operation separates doctor review from non-clinical support tasks, so staff can resolve operational issues without unnecessary exposure to clinical detail.",
        ],
        sourceIds: ["medical-board-telehealth", "oaic-health-privacy-guide"],
      },
      {
        id: "disclosure-limits",
        title: "Separate necessary disclosure from convenience",
        claim:
          "Health information disclosure should be limited to the purpose patients were told about or a lawful exception.",
        body: [
          "The Australian Privacy Principles include standards for use and disclosure of personal information.",
          "In practical terms, a telehealth service should explain when information may go to a doctor, secure prescribing system, pharmacy pathway, payment processor, regulator, or complaint body.",
        ],
        sourceIds: ["oaic-australian-privacy-principles", "oaic-health-privacy-guide"],
      },
      {
        id: "records-quality",
        title: "Keep records accurate and useful",
        claim:
          "Clinical records should be accurate enough to support safe care, audit, follow-up, and correction rights.",
        body: [
          "The Australian Privacy Principles include obligations around quality, access, and correction of personal information.",
          "A patient should have a practical way to ask about their information, update incorrect details, and understand how long records are retained under the service's privacy policy.",
        ],
        sourceIds: ["oaic-australian-privacy-principles", "oaic-health-privacy-guide"],
      },
      {
        id: "complaint-route",
        title: "Make privacy complaints visible",
        claim:
          "A telehealth privacy page should show how a patient can raise a privacy concern and where escalation may go.",
        body: [
          "OAIC guidance on complaints says a person should generally complain to the organisation first and may escalate to the OAIC if the issue is not resolved.",
          "A privacy checklist is incomplete if it describes security controls but hides the complaint pathway.",
        ],
        sourceIds: ["oaic-organisation-complaint", "oaic-australian-privacy-principles"],
      },
    ],
    sources: [
      oaicHealthPrivacyGuide,
      oaicAustralianPrivacyPrinciples,
      oaicOrganisationComplaint,
      medicalBoardTelehealth,
    ],
    clinicalLimits: [
      "This checklist is general information and is not privacy law advice.",
      "Privacy obligations can vary with the organisation, service model, jurisdiction, and information type.",
      "Security controls reduce risk but cannot remove every operational or technical risk.",
      "Urgent clinical concerns should use urgent care pathways rather than a privacy inbox.",
    ],
    relatedLinks: [
      { title: "Privacy policy", href: "/privacy" },
      { title: "Trust and safety", href: "/trust" },
      { title: "Complaints", href: "/complaints" },
    ],
  },
  {
    slug: "when-telehealth-is-not-appropriate",
    category: "telehealth-access",
    title: "When telehealth is not appropriate",
    metadataTitle: "When Telehealth Is Not Appropriate | InstantMed",
    description:
      "A source-backed safety guide explaining when Australian telehealth should redirect to emergency care, in-person examination, testing, or ongoing GP care.",
    eyebrow: "Telehealth limits",
    summary:
      "Good telehealth is not only about speed. It is also about knowing when remote review is the wrong pathway. This guide sets out the safety boundaries in plain language.",
    lastReviewed: REVIEWED_ON,
    readingTime: "9 min",
    visuals: [
      visual(
        "when-telehealth-is-not-appropriate",
        "telehealth-suitability-boundary-map",
        "Telehealth suitability boundary map",
        "Telehealth pathway map showing when online care, in-person care, or emergency care is more appropriate",
        "A premium boundary map showing emergency symptoms, physical examination needs, tests, monitoring, and continuity requirements as separate decision paths.",
        "GPT image 2 premium Australian telehealth suitability diagram. Create a 4:3 decision map with readable labels: online review may fit, doctor may need more information, in-person exam needed, tests or imaging needed, emergency care. Use calm clinical editorial design, directional arrows, amber caution zones, navy and eucalyptus, no frightening scene, no official logos, no patient face, no service CTA, no diagnosis guarantee, no prescription language, no price.",
      ),
    ],
    sections: [
      {
        id: "emergency-care",
        title: "Emergencies are not routine telehealth",
        claim:
          "Emergency symptoms should be managed through emergency care rather than a routine online request.",
        body: [
          "Healthdirect advises people in Australia to call triple zero immediately for a medical emergency.",
          "A telehealth pathway should make this visible before the patient begins the wrong type of request. Online forms are not a substitute for urgent assessment when symptoms are severe or time-critical.",
        ],
        sourceIds: ["healthdirect-triple-zero"],
      },
      {
        id: "physical-exam",
        title: "Some problems need examination",
        claim:
          "Telehealth is unsuitable when a safe decision depends on physical examination that cannot be done remotely.",
        body: [
          "The Australian Government describes telehealth as remote consultation where the health professional has determined a physical examination is not needed and the person cannot see them in person.",
          "If the doctor needs to examine the patient, assess vital signs, inspect an injury, or clarify a physical finding, in-person care may be the safer path.",
        ],
        sourceIds: ["health-telehealth", "medical-board-telehealth"],
      },
      {
        id: "tests-imaging",
        title: "Tests can change the pathway",
        claim:
          "A remote review may need to pause or redirect when blood tests, imaging, or other investigations are clinically important.",
        body: [
          "Medical Board guidance expects doctors to keep assessing whether telehealth remains appropriate and to arrange in-person care when necessary.",
          "This is especially important where the question cannot be answered from history alone or where missing a result would make the decision unsafe.",
        ],
        sourceIds: ["medical-board-telehealth"],
      },
      {
        id: "ongoing-complex-care",
        title: "Ongoing complex care needs continuity",
        claim:
          "Telehealth can support access but should not fragment complex or long-term care.",
        body: [
          "The Australian Government describes telehealth as a way to consult remotely for diagnosis, treatment, and prevention when clinically appropriate.",
          "For complex conditions, repeated symptoms, unclear deterioration, or management plans requiring close monitoring, the patient's regular GP or specialist may be more appropriate than a one-off online request.",
        ],
        sourceIds: ["health-telehealth", "medical-board-telehealth"],
      },
      {
        id: "high-stakes-documents",
        title: "Some documents need a different pathway",
        claim:
          "High-stakes documents may require in-person assessment, longer history, occupational context, or a specific legal process.",
        body: [
          "Telehealth guidance still holds doctors to the usual professional standards when issuing documents or making clinical decisions remotely.",
          "Return-to-work clearance, workers compensation, fitness-for-duty, capacity, disability, school-specific, or legal documents may need a different assessment pathway from a short routine certificate.",
        ],
        sourceIds: ["medical-board-telehealth", "fair-work-evidence"],
      },
      {
        id: "rights-and-communication",
        title: "Patients should be told why redirect happens",
        claim:
          "A safe service should explain redirection in a way patients can understand and act on.",
        body: [
          "The Australian Charter of Healthcare Rights describes rights patients can expect when receiving health care in Australia.",
          "In telehealth, a useful redirection message explains the clinical reason, the safer next care pathway, and whether the patient should use urgent care, their regular GP, a local clinic, or emergency services.",
        ],
        sourceIds: ["safety-quality-charter", "medical-board-telehealth"],
      },
      {
        id: "doctor-discretion",
        title: "The doctor can decline or ask for more information",
        claim:
          "Appropriate telehealth requires clinician discretion rather than automatic approval.",
        body: [
          "Medical Board guidance expects doctors to decide whether telehealth is appropriate for the patient's circumstances.",
          "That means a safe online request can end with approval, decline, more information, or redirection. The safer system is the one that makes all of those outcomes possible.",
        ],
        sourceIds: ["medical-board-telehealth"],
      },
    ],
    sources: [
      healthdirectTripleZero,
      healthTelehealth,
      medicalBoardTelehealth,
      safetyQualityCharter,
      fairWorkEvidence,
    ],
    clinicalLimits: [
      "This guide is general information and is not medical advice.",
      "Call 000 immediately for emergency symptoms or serious deterioration.",
      "A doctor may decide telehealth is inappropriate even if a symptom seems routine to the patient.",
      "Local urgent care, a regular GP, or a specialist may be more appropriate depending on the clinical facts.",
    ],
    relatedLinks: [
      { title: "Trust and safety", href: "/trust" },
      { title: "How doctors decide", href: "/how-we-decide" },
      { title: "Telehealth Australia", href: "/telehealth-australia" },
    ],
  },
  {
    slug: "medicare-bulk-billing-private-telehealth",
    category: "telehealth-access",
    title: "Medicare, bulk billing, and private telehealth explainer",
    metadataTitle: "Medicare, Bulk Billing and Private Telehealth | InstantMed",
    description:
      "A plain-English Australian explainer on Medicare telehealth, MBS arrangements, bulk billing, private billing, gap payments, and what patients should check before paying.",
    eyebrow: "Telehealth billing",
    summary:
      "Telehealth billing can be confusing because Medicare eligibility, bulk billing, private fees, and gap payments are different things. This explainer separates them without implying every online service is Medicare funded.",
    lastReviewed: REVIEWED_ON,
    readingTime: "10 min",
    visuals: [
      visual(
        "medicare-bulk-billing-private-telehealth",
        "telehealth-payment-pathways",
        "Telehealth payment pathways",
        "Telehealth billing diagram comparing Medicare, bulk billing, private fees, and gap payments",
        "A premium payment-pathway explainer separating Medicare eligibility, MBS items, bulk billing, private billing, upfront payment, and possible rebates.",
        "GPT image 2 premium Australian healthcare payment pathway infographic. Create a 4:3 explainer with readable labels: Medicare eligibility, MBS item, bulk billing, private fee, possible rebate, out-of-pocket cost. Use polished editorial diagrams, calm navy, coral, eucalyptus, warm white, and restrained financial icons. No official government logos, no Medicare card image, no claim that any service is free, no price, no service CTA, no guarantee language, no patient identifiers.",
      ),
    ],
    sections: [
      {
        id: "medicare-telehealth",
        title: "Medicare telehealth is a funding arrangement",
        claim:
          "Medicare telehealth refers to eligible services billed through MBS arrangements, not every online consultation.",
        body: [
          "The Australian Government says expanded telehealth services became an ongoing part of Medicare from 1 January 2022.",
          "MBS Online explains that ongoing arrangements support patient access to telehealth services for a range of out-of-hospital consultations that can also be provided in person.",
        ],
        sourceIds: ["health-telehealth", "mbs-telehealth-arrangements"],
      },
      {
        id: "clinical-appropriateness",
        title: "Telehealth still needs clinical fit",
        claim:
          "Medicare availability does not remove the need for the health professional to decide telehealth is clinically appropriate.",
        body: [
          "The Department of Health describes telehealth as a remote consultation when the health professional has determined a physical examination is not needed.",
          "The Medical Board also expects doctors to keep assessing whether telehealth is appropriate and to arrange in-person care when necessary.",
        ],
        sourceIds: ["health-telehealth", "medical-board-telehealth"],
      },
      {
        id: "bulk-billing-meaning",
        title: "Bulk billing means the provider accepts the Medicare benefit",
        claim:
          "If a provider bulk bills an eligible service, the patient should not pay an out-of-pocket amount for that service.",
        body: [
          "Department of Health bulk billing material explains that Medicare pays the doctor directly when a service is bulk billed.",
          "The same public material tells patients to check whether the doctor or clinic bulk bills and whether there will be out-of-pocket costs.",
        ],
        sourceIds: ["health-bulk-billing-fact-sheet", "health-medicare-covers"],
      },
      {
        id: "not-all-bulk-billed",
        title: "Not all telehealth is bulk billed",
        claim:
          "A telehealth consultation can be private-billed even when telehealth exists within Medicare arrangements.",
        body: [
          "The Department of Health explains that Medicare subsidises many health services, but not all health practitioners bulk bill.",
          "Patients should separate three questions: is the patient Medicare eligible, is the service eligible for an MBS item, and does the provider choose to bulk bill that service.",
        ],
        sourceIds: ["health-medicare-covers", "mbs-telehealth-arrangements"],
      },
      {
        id: "private-fees",
        title: "Private telehealth may involve upfront payment",
        claim:
          "A privately billed telehealth service may charge a fee and may or may not involve a Medicare benefit.",
        body: [
          "Where a provider does not bulk bill, patients may pay upfront and may be able to claim a Medicare benefit if an eligible MBS service applies.",
          "Patients should check the fee, whether any Medicare rebate applies, whether a gap remains, and whether the service is outside Medicare entirely.",
        ],
        sourceIds: ["health-medicare-covers", "mbs-telehealth-arrangements"],
      },
      {
        id: "what-to-check",
        title: "Check the billing facts before submitting",
        claim:
          "Patients should check eligibility, fee, rebate, gap, cancellation, and refund rules before paying for telehealth.",
        body: [
          "A clear telehealth billing page should say whether the service is bulk billed, privately billed, rebate-supported, or not Medicare-funded.",
          "It should also make clear that billing status does not guarantee the clinical outcome. A doctor still decides whether the request is clinically appropriate.",
        ],
        sourceIds: ["health-bulk-billing-fact-sheet", "medical-board-telehealth"],
      },
      {
        id: "documentation",
        title: "Keep receipts and outcome records",
        claim:
          "Billing records and clinical outcome records serve different purposes and should both be easy to locate.",
        body: [
          "A payment receipt helps with financial records. A clinical outcome record explains what the doctor decided or delivered.",
          "For telehealth, patients should be able to find both without confusing payment completion with clinical approval.",
        ],
        sourceIds: ["health-medicare-covers", "medical-board-telehealth"],
      },
    ],
    sources: [
      healthTelehealth,
      mbsTelehealthArrangements,
      healthMedicareCovers,
      healthBulkBillingFactSheet,
      medicalBoardTelehealth,
    ],
    clinicalLimits: [
      "This explainer is general information and is not Medicare billing advice.",
      "Medicare, MBS, rebate, bulk billing, and private fee rules can change and can vary by provider and service.",
      "InstantMed pages should not be read as claiming that a service is bulk billed unless the relevant page says so clearly.",
      "Billing completion does not guarantee clinical approval or a particular outcome.",
    ],
    relatedLinks: [
      { title: "Prescriptions", href: "/prescriptions" },
      { title: "Medical certificates", href: "/medical-certificate" },
      { title: "Trust and safety", href: "/trust" },
    ],
  },
  {
    slug: "rural-remote-telehealth-access",
    category: "telehealth-access",
    title: "Rural and remote telehealth access brief",
    metadataTitle: "Rural and Remote Telehealth Access Brief | InstantMed",
    description:
      "A public-source brief on rural and remote healthcare access barriers, telehealth's role, and the safety limits that still require local or urgent care.",
    eyebrow: "Regional access",
    summary:
      "Rural and remote telehealth should be discussed as an access layer, not a cure-all. This brief uses public Australian data and guidance to explain where it helps and where it must hand over.",
    lastReviewed: REVIEWED_ON,
    readingTime: "10 min",
    visuals: [
      visual(
        "rural-remote-telehealth-access",
        "regional-telehealth-access-map",
        "Regional telehealth access map",
        "Regional telehealth map diagram showing distance, workforce access, online review, and in-person care limits",
        "A premium regional access explainer showing distance to services, delayed GP access, telehealth review, escalation, and continuity with local care.",
        "GPT image 2 premium Australian regional telehealth access map. Create a 4:3 editorial infographic with readable labels: distance to care, delayed appointment, telehealth access layer, local GP continuity, urgent care handover. Use an abstract Australia-inspired regional map without state borders, official maps, real town names, or fake place names. Generic labels only: major city, regional town, remote community, local clinic, urgent handover. Avoid outcome claims. Use warm daylight, navy, eucalyptus, coral, and amber caution markers. No official logos, no patient identifiers, no price, no service CTA, no guarantee language, no emergency drama.",
      ),
    ],
    sections: [
      {
        id: "population-access",
        title: "Many Australians live outside major cities",
        claim:
          "Rural and remote access is a national health issue, not a niche edge case.",
        body: [
          "AIHW reported that around 7 million people, or 27% of Australia's population, live in rural and remote areas.",
          "That population includes diverse communities and locations, so telehealth policy and service design should avoid one-size-fits-all assumptions.",
        ],
        sourceIds: ["aihw-rural-remote-health"],
      },
      {
        id: "poorer-access",
        title: "Access barriers are documented",
        claim:
          "Australians in rural and remote areas generally have poorer access to health care than people in metropolitan areas.",
        body: [
          "AIHW describes barriers such as distance, drive time, limited infrastructure, fewer specialist services, and costs linked to travel or relocation.",
          "These access barriers can delay preventive and primary care and can increase reliance on hospital care when earlier community care is harder to reach.",
        ],
        sourceIds: ["aihw-rural-remote-health"],
      },
      {
        id: "gp-delay",
        title: "Patient experience data shows delays",
        claim:
          "Public patient experience data shows Australians can delay or miss GP care when they need it.",
        body: [
          "ABS Patient Experiences data reported that 26.6% of people delayed or did not see a GP when needed in 2024-25.",
          "The same release found people in outer regional or remote areas were more likely to delay or not use GP services when needed than people in major cities.",
        ],
        sourceIds: ["abs-patient-experiences"],
      },
      {
        id: "telehealth-role",
        title: "Telehealth can reduce some access friction",
        claim:
          "Telehealth can improve access when the clinical question can be safely assessed remotely.",
        body: [
          "The Australian Government says telehealth allows patients to consult a healthcare provider by phone or video call.",
          "AIHW notes that telehealth can improve access to timely health care services for rural and remote Australians who may otherwise need to travel long distances.",
        ],
        sourceIds: ["health-telehealth", "aihw-rural-remote-health"],
      },
      {
        id: "clinical-limits",
        title: "Access does not remove clinical limits",
        claim:
          "A regional patient may still need in-person examination, tests, imaging, urgent care, or local continuity.",
        body: [
          "Medical Board guidance expects doctors to decide whether telehealth is appropriate and to arrange in-person care when needed.",
          "Telehealth should not be framed as a replacement for local primary care, emergency services, pathology, imaging, or specialist review where those are clinically required.",
        ],
        sourceIds: ["medical-board-telehealth", "healthdirect-triple-zero"],
      },
      {
        id: "continuity",
        title: "Continuity matters in remote care",
        claim:
          "Telehealth is strongest when it complements local and ongoing care rather than fragments it.",
        body: [
          "Rural and remote access challenges make continuity especially important because follow-up may involve travel, limited appointment supply, or local service constraints.",
          "A safe online pathway should tell patients when to involve their regular GP, local clinic, Aboriginal Community Controlled Health Organisation, urgent care service, or specialist.",
        ],
        sourceIds: ["aihw-rural-remote-health", "medical-board-telehealth"],
      },
      {
        id: "equity-language",
        title: "Use careful equity language",
        claim:
          "Rural and remote telehealth content should avoid implying that convenience solves structural access barriers.",
        body: [
          "AIHW reports poorer access, workforce variation, and data gaps across rural and remote communities.",
          "A credible brief should recognise distance, workforce, infrastructure, culture, local service availability, and digital access rather than presenting online care as a universal fix.",
        ],
        sourceIds: ["aihw-rural-remote-health"],
      },
    ],
    sources: [
      aihwRuralRemoteHealth,
      absPatientExperiences,
      healthTelehealth,
      medicalBoardTelehealth,
      healthdirectTripleZero,
    ],
    clinicalLimits: [
      "This brief is general public-source analysis and is not medical advice.",
      "Telehealth cannot replace emergency services, in-person examination, tests, imaging, or local continuity when those are needed.",
      "Rural and remote access needs vary by community, service availability, connectivity, culture, and clinical urgency.",
      "Call 000 for emergencies.",
    ],
    relatedLinks: [
      { title: "Telehealth Australia", href: "/telehealth-australia" },
      { title: "Online doctor Australia", href: "/online-doctor-australia" },
      { title: "Trust and safety", href: "/trust" },
    ],
  },
  {
    slug: "repeat-prescription-safety-checklist",
    category: "prescription-safety",
    title: "Repeat prescription safety checklist",
    metadataTitle: "Repeat Prescription Safety Checklist | InstantMed",
    description:
      "A neutral Australian checklist for repeat prescription requests covering identity, current medicine details, monitoring, side effects, eScript tokens, and when online review is not enough.",
    eyebrow: "Repeat prescription safety",
    summary:
      "A repeat prescription request should never be treated as automatic supply. This checklist explains the safety information a doctor may need before deciding whether a remote request is appropriate.",
    lastReviewed: REVIEWED_ON,
    readingTime: "10 min",
    visuals: [
      visual(
        "repeat-prescription-safety-checklist",
        "repeat-prescription-review-pathway",
        "Repeat prescription review pathway",
        "Prescription review pathway checklist for repeat prescription safety in telehealth",
        "A premium review-pathway explainer showing identity, existing medicine details, safety changes, monitoring needs, doctor decision, and secure eScript token delivery.",
        "GPT image 2 premium Australian repeat prescription safety checklist. Create a 4:3 pathway infographic with readable labels: request submitted, identity checked, current medicine details, safety changes, monitoring needs, doctor decision, secure eScript token. Use refined clinical editorial style, calm navy, eucalyptus, coral, amber caution accents. No drug names, no medicine packaging, no pharmacy logo, no official logo, no patient identifiers, no price, no service CTA, no automatic approval wording.",
      ),
    ],
    sections: [
      {
        id: "request-not-order",
        title: "Request, not order",
        claim:
          "A repeat prescription form starts a clinical review and should not be described as automatic supply.",
        body: [
          "Medical Board telehealth guidance expects doctors to apply professional standards and decide whether telehealth is appropriate.",
          "A patient may be asking for something they have used before, but the doctor still needs enough information to decide whether continuing it remotely is safe.",
        ],
        sourceIds: ["medical-board-telehealth"],
      },
      {
        id: "identity-details",
        title: "Confirm identity and delivery details",
        claim:
          "Safe eScript delivery depends on accurate identity, contact, and patient details.",
        body: [
          "Australian Government electronic prescribing information explains that electronic prescriptions can be sent as a token by SMS or email.",
          "Incorrect identity, date of birth, phone, email, Medicare, or address details can create safety, privacy, and delivery problems before the prescription ever reaches a pharmacy.",
        ],
        sourceIds: ["health-electronic-prescribing", "digital-health-prescriptions"],
      },
      {
        id: "current-medicine-details",
        title: "Record the current medicine context",
        claim:
          "A doctor needs current medicine details and the reason it was prescribed before considering repeat supply.",
        body: [
          "A safe request asks about the medicine name, strength, dose, how often it is taken, the original indication, and who normally prescribes it.",
          "This checklist deliberately avoids public medicine promotion. The point is to capture context for doctor review, not to encourage patients to seek a particular medicine.",
        ],
        sourceIds: ["medical-board-telehealth", "tga-public-advertising"],
      },
      {
        id: "safety-changes",
        title: "Ask what has changed",
        claim:
          "Side effects, new symptoms, pregnancy status, allergies, interactions, and health changes can alter repeat prescription safety.",
        body: [
          "Medical Board guidance expects doctors to arrange in-person review or follow-up when clinically indicated.",
          "A repeat request should ask what has changed since the previous prescription because the safest answer may be more information, a different review pathway, or local care.",
        ],
        sourceIds: ["medical-board-telehealth"],
      },
      {
        id: "monitoring",
        title: "Do not bypass monitoring",
        claim:
          "Some repeat medicines need blood pressure checks, blood tests, imaging, specialist review, or regular GP monitoring.",
        body: [
          "Telehealth is appropriate only where a safe decision can be made remotely.",
          "If the medicine or condition needs monitoring that is overdue or unavailable, the doctor may need to redirect the patient to their usual GP, pathology, local clinic, or specialist.",
        ],
        sourceIds: ["medical-board-telehealth", "health-telehealth"],
      },
      {
        id: "secure-escript",
        title: "Use secure eScript delivery if approved",
        claim:
          "If a doctor approves a repeat prescription, Australian eScript tokens support secure digital delivery.",
        body: [
          "The Australian Digital Health Agency explains that an electronic prescription token is a QR barcode used by the pharmacy to unlock the electronic prescription from a secure delivery service.",
          "Australian Government information also says electronic prescribing software must meet privacy, security, PBS, and state or territory requirements.",
        ],
        sourceIds: ["digital-health-prescriptions", "health-electronic-prescribing"],
      },
      {
        id: "urgent-or-missed-dose",
        title: "Handle urgent or missed-dose risk separately",
        claim:
          "Urgent symptoms, severe deterioration, or missed-dose risk may need immediate advice rather than a routine request queue.",
        body: [
          "Healthdirect advises calling triple zero for a medical emergency.",
          "If a patient has severe symptoms, concerning withdrawal effects, confusion about dosing, or a time-critical medicine problem, routine telehealth may be too slow or too narrow.",
        ],
        sourceIds: ["healthdirect-triple-zero", "medical-board-telehealth"],
      },
    ],
    sources: [
      medicalBoardTelehealth,
      healthElectronicPrescribing,
      digitalHealthPrescriptions,
      tgaPublicAdvertising,
      healthTelehealth,
      healthdirectTripleZero,
    ],
    clinicalLimits: [
      "This checklist is general information and is not medicine advice.",
      "Submitting a repeat prescription request does not guarantee approval or supply.",
      "Some medicines, monitoring needs, symptoms, and safety risks require in-person care or the patient's regular GP.",
      "Call 000 for emergencies or severe symptoms.",
    ],
    relatedLinks: [
      { title: "Prescriptions", href: "/prescriptions" },
      { title: "How doctors decide", href: "/how-we-decide" },
      { title: "Clinical governance", href: "/clinical-governance" },
    ],
  },
]

export function getAuthorityAsset(slug: string): AuthorityAsset {
  const asset = AUTHORITY_ASSETS.find((item) => item.slug === slug)

  if (!asset) {
    throw new Error(`Unknown authority asset: ${slug}`)
  }

  return asset
}

export function getAuthorityAssetSummaries(): AuthorityAssetSummary[] {
  return AUTHORITY_ASSETS.map((asset) => ({
    slug: asset.slug,
    category: asset.category,
    title: asset.title,
    description: asset.description,
    eyebrow: asset.eyebrow,
    lastReviewed: asset.lastReviewed,
    readingTime: asset.readingTime,
    visual: asset.visuals?.[0],
  }))
}

export function getAuthorityAssetGroups(): AuthorityAssetGroup[] {
  const summaries = getAuthorityAssetSummaries()

  return AUTHORITY_ASSET_GROUPS.map((group) => ({
    ...group,
    assets: summaries.filter((asset) => asset.category === group.id),
  })).filter((group) => group.assets.length > 0)
}
