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
    ...(reviewedDate && {
      lastReviewed: reviewedDate,
    }),
    mainEntityOfPage: {
      "@type": "MedicalWebPage",
      "@id": `${baseUrl}${url}`,
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
