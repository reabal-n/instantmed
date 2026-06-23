import { JsonLdScript } from "./json-ld-script"

interface MedicalConditionSchemaProps {
  name: string
  description: string
  url: string
  symptoms?: string[]
  possibleTreatments?: string[]
  /** Rich medication data for Drug schema entities */
  medications?: Array<{
    genericName: string
    brandNames: string[]
    drugClass: string
    typicalDose: string
    prescriptionRequired: boolean
  }>
  /** Clinical guideline source */
  guidelineSource?: string
  /** Reviewed date in YYYY-MM format */
  reviewedDate?: string
  baseUrl?: string
}

export function MedicalConditionSchema({
  name,
  description,
  url,
  symptoms,
  possibleTreatments,
  medications,
  guidelineSource,
  reviewedDate,
  baseUrl = "https://instantmed.com.au",
}: MedicalConditionSchemaProps) {
  const drugEntities = medications?.map((med) => ({
    "@type": "Drug",
    // `name` (Thing.name) is required for a valid Drug entity — without it,
    // structured-data validators flag "missing field name". Use the generic
    // (non-proprietary) name as the canonical label.
    name: med.genericName,
    nonProprietaryName: med.genericName,
    proprietaryName: med.brandNames[0] || med.genericName,
    drugClass: { "@type": "DrugClass", name: med.drugClass },
    dosageForm: "Oral",
    doseSchedule: {
      "@type": "DoseSchedule",
      doseValue: med.typicalDose,
    },
    isProprietary: false,
    isAvailableGenerically: true,
    prescriptionStatus: med.prescriptionRequired
      ? "https://schema.org/PrescriptionOnly"
      : "https://schema.org/OTC",
    ...(guidelineSource && {
      guideline: {
        "@type": "MedicalGuideline",
        guidelineSubject: { "@type": "MedicalCondition", name },
        evidenceOrigin: guidelineSource,
      },
    }),
  }))

  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalCondition",
    name,
    description,
    url: `${baseUrl}${url}`,
    ...(symptoms?.length && {
      signOrSymptom: symptoms.map((s) => ({
        "@type": "MedicalSignOrSymptom",
        name: s,
      })),
    }),
    ...(drugEntities?.length
      ? {
          possibleTreatment: drugEntities,
        }
      : possibleTreatments?.length
        ? {
            possibleTreatment: possibleTreatments.map((t) => ({
              "@type": "MedicalTherapy",
              name: t,
            })),
          }
        : {}),
    // NOTE: `lastReviewed` is only valid on MedicalWebPage (schema.org), NOT on
    // MedicalCondition — the schema.org validator flags it UNKNOWN_FIELD on the
    // condition root. It lives on mainEntityOfPage.MedicalWebPage below, which is
    // the correct (and only valid) home. Do not re-add it here.
    mainEntityOfPage: {
      "@type": "MedicalWebPage",
      "@id": `${baseUrl}${url}`,
      reviewedBy: {
        "@type": "MedicalOrganization",
        "@id": `${baseUrl}/#organization`,
        name: "InstantMed",
      },
      ...(reviewedDate && { lastReviewed: reviewedDate }),
      ...(guidelineSource && {
        citation: {
          "@type": "CreativeWork",
          name: guidelineSource,
        },
      }),
    },
  }

  return <JsonLdScript id={`condition-schema-${name.toLowerCase().replace(/\s+/g, "-")}`} data={schema} />
}
