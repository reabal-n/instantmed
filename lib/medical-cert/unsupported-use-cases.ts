import {
  MED_CERT_INTENT_SLUGS,
  type MedCertIntentSlug,
} from "@/lib/marketing/med-cert-intent-config"

export type UnsupportedMedCertSlug = "centrelink" | "return-to-work"

export type UnsupportedMedCertCategory =
  | "government-program-evidence"
  | "fitness-or-capacity-clearance"

export interface UnsupportedMedCertUseCase {
  slug: UnsupportedMedCertSlug
  category: UnsupportedMedCertCategory
  eyebrow: string
  title: string
  summary: string
  whyNot: string
  nextSteps: string[]
  instantMedCanHelpWhen: string
}

export const UNSUPPORTED_MED_CERT_USE_CASES = {
  centrelink: {
    slug: "centrelink",
    category: "government-program-evidence",
    eyebrow: "Wrong evidence pathway",
    title: "Centrelink evidence usually needs more than a sick certificate.",
    summary:
      "Services Australia often asks for specific forms, functional-capacity details, or treating-practitioner reports. A short online sick certificate is usually the wrong document.",
    whyNot:
      "InstantMed's medical certificate pathway is for routine short absences from work, study, or carer's duties. It does not complete Centrelink forms or government-program capacity reports.",
    nextSteps: [
      "Check the exact form or evidence request in your Services Australia account.",
      "Book with your regular GP or treating practitioner if a Centrelink form, DSP evidence, or capacity detail is needed.",
      "Use InstantMed only if you need routine sick-leave evidence for a short absence and no Services Australia form is involved.",
    ],
    instantMedCanHelpWhen:
      "You need a routine sick, study, or carer's leave certificate for a short absence, and no government-program form or capacity report is required.",
  },
  "return-to-work": {
    slug: "return-to-work",
    category: "fitness-or-capacity-clearance",
    eyebrow: "Not a clearance pathway",
    title: "Return-to-work clearances need the employer's pathway.",
    summary:
      "Return-to-work, site medical, capacity, and fit-for-duty requests are not simple sick certificates. They often need an in-person or occupational-health assessment.",
    whyNot:
      "InstantMed documents routine absence periods only. It does not certify capacity, restrictions, safe return, driving, machinery, or safety-critical duties.",
    nextSteps: [
      "Ask your employer whether they need a capacity certificate, site medical, fit-for-duty clearance, or occupational-health form.",
      "Use the employer's nominated clinic, occupational-health provider, or your regular GP for clearance documents.",
      "Use InstantMed only if you need routine sick-leave evidence for the absence period, not clearance to return.",
    ],
    instantMedCanHelpWhen:
      "You need routine sick-leave evidence for a short absence and are not asking for capacity, restrictions, or safe-return wording.",
  },
} as const satisfies Record<UnsupportedMedCertSlug, UnsupportedMedCertUseCase>

export const UNSUPPORTED_MED_CERT_SLUGS = Object.keys(
  UNSUPPORTED_MED_CERT_USE_CASES,
) as UnsupportedMedCertSlug[]

export function isUnsupportedMedCertIntentSlug(slug: string): slug is UnsupportedMedCertSlug {
  return slug in UNSUPPORTED_MED_CERT_USE_CASES
}

export function getUnsupportedMedCertUseCase(slug: string): UnsupportedMedCertUseCase | null {
  if (!isUnsupportedMedCertIntentSlug(slug)) return null
  return UNSUPPORTED_MED_CERT_USE_CASES[slug]
}

export function unsupportedMedCertRedirectPath(slug: string): string | null {
  if (!isUnsupportedMedCertIntentSlug(slug)) return null
  return `/medical-certificate/not-suitable/${slug}`
}

export function getSupportedMedCertIntentSlugs(): MedCertIntentSlug[] {
  return MED_CERT_INTENT_SLUGS.filter((slug) => !isUnsupportedMedCertIntentSlug(slug))
}
