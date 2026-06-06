export interface AuthorityAssetSource {
  id: string
  title: string
  publisher: string
  url: string
  accessed: string
}

export interface AuthorityAssetSection {
  id: string
  title: string
  claim: string
  body: string[]
  sourceIds: string[]
}

export interface AuthorityAsset {
  slug: string
  title: string
  metadataTitle: string
  description: string
  eyebrow: string
  summary: string
  lastReviewed: string
  readingTime: string
  sections: AuthorityAssetSection[]
  sources: AuthorityAssetSource[]
  clinicalLimits: string[]
  relatedLinks: Array<{ title: string; href: string }>
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

export const AUTHORITY_ASSET_SLUGS = [
  "telehealth-safety-checklist",
  "medical-certificate-employer-policy",
  "secure-online-prescription-requests",
  "gp-wait-times-telehealth-access",
  "complaints-clinical-governance",
] as const

export type AuthorityAssetSlug = (typeof AUTHORITY_ASSET_SLUGS)[number]

export const AUTHORITY_ASSETS: AuthorityAsset[] = [
  {
    slug: "telehealth-safety-checklist",
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
]

export function getAuthorityAsset(slug: string): AuthorityAsset {
  const asset = AUTHORITY_ASSETS.find((item) => item.slug === slug)

  if (!asset) {
    throw new Error(`Unknown authority asset: ${slug}`)
  }

  return asset
}

export function getAuthorityAssetSummaries() {
  return AUTHORITY_ASSETS.map((asset) => ({
    slug: asset.slug,
    title: asset.title,
    description: asset.description,
    eyebrow: asset.eyebrow,
    lastReviewed: asset.lastReviewed,
    readingTime: asset.readingTime,
  }))
}
