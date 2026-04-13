/**
 * Symptom checker SEO pages - what could be causing your symptom
 *
 * Data is split into category files under ./symptoms/ for maintainability.
 * This file re-exports everything so existing consumers don't need to change.
 */

export interface SymptomData {
  name: string
  slug: string
  description: string
  possibleCauses: Array<{
    name: string
    likelihood: "common" | "less-common" | "rare"
    description: string
    whenToSuspect: string[]
  }>
  selfCareAdvice: string[]
  whenToSeeDoctor: string[]
  emergencySigns: string[]
  relatedSymptoms: string[]
  faqs: Array<{ q: string; a: string }>
  serviceRecommendation: {
    type: "med-cert" | "consult" | "both"
    text: string
    href: string
  }
  /** Clinical triage perspective - how a GP thinks about this symptom */
  doctorPerspective?: string
  /** When this symptom typically warrants a medical certificate */
  certGuidance?: string
}

// Re-export everything from the split category files
export {
  cardiovascularSymptoms,
  dermatologySymptoms,
  gastrointestinalSymptoms,
  generalSystemicSymptoms,
  painSymptoms,
  respiratorySymptoms,
  sensorySleepSymptoms,
  symptoms,
  urologicalSymptoms,
} from "./symptoms/index"
