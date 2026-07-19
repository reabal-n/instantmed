import "server-only"

import { createClient } from "@supabase/supabase-js"

import { checkAndSanitize } from "@/lib/ai/prompt-safety"
import { collectRepeatMedicationEntries, formatRepeatMedication } from "@/lib/clinical/repeat-medications"
import { env } from "@/lib/config/env"
import { type DraftCategory,getDraftCategory, normalizeServiceType } from "@/lib/constants/service-types"
import { createLogger } from "@/lib/observability/logger"
import type { ServiceType } from "@/types/db"

export const log = createLogger("generate-drafts")

// Type helper for AI SDK usage (varies by version)
export interface AIUsage {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

export function getUsage(usage: unknown): AIUsage {
  if (!usage || typeof usage !== 'object') return {}
  const u = usage as Record<string, unknown>
  return {
    promptTokens: typeof u.promptTokens === 'number' ? u.promptTokens : undefined,
    completionTokens: typeof u.completionTokens === 'number' ? u.completionTokens : undefined,
  }
}

// Service client for server-side operations
export function getServiceClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey)
}

export interface GenerateDraftsResult {
  success: boolean
  skipped?: boolean
  serviceType?: ServiceType
  draftCategory?: DraftCategory
  clinicalNote?: { status: "ready" | "failed"; error?: string }
  medCert?: { status: "ready" | "failed"; error?: string }
  repeatRx?: { status: "ready" | "failed"; error?: string }
  consult?: { status: "ready" | "failed"; error?: string }
  error?: string
}

/**
 * Sanitize a single user-provided value for AI prompt inclusion
 */
export function sanitizeAnswerValue(value: unknown, intakeId: string): string {
  if (value === null || value === undefined) return ""
  const strValue = String(value)
  const result = checkAndSanitize(strValue, { endpoint: "generate-drafts", userId: intakeId })
  if (result.blocked) {
    log.warn("Prompt injection blocked in intake answer", { intakeId })
    return "[content filtered]"
  }
  return result.output
}

/**
 * Format intake data for AI context (service-type aware)
 */
export function formatIntakeContext(
  intake: Record<string, unknown>,
  patient: { full_name: string; date_of_birth: string | null } | null,
  answers: Record<string, unknown>,
  serviceType: ServiceType | null
): string {
  const intakeId = String(intake.id || "unknown")
  const parts: string[] = []

  // Get draft category for service-specific field extraction
  const draftCategory = getDraftCategory(serviceType)

  if (patient) {
    parts.push(`Patient: ${sanitizeAnswerValue(patient.full_name, intakeId)}`)
    if (patient.date_of_birth) {
      parts.push(`DOB: ${patient.date_of_birth}`)
    }
  }

  parts.push(`Request Date: ${new Date().toISOString().split("T")[0]}`)

  // Explicit, human-readable service label. "Service Type: consult" alone is
  // ambiguous — the AI cannot tell ED from hair loss from women's health and was
  // defaulting to a medical-certificate note. Spell out the exact service +
  // subtype so the clinical note reflects the real request.
  const consultSubtypeForLabel = String(
    answers.consultSubtype || answers.consult_subtype || intake.subtype || "",
  ).toLowerCase()
  const serviceLabel =
    draftCategory === "med_cert"
      ? "Medical certificate"
      : draftCategory === "repeat_rx"
        ? "Repeat prescription"
        : consultSubtypeForLabel === "ed"
          ? "Erectile dysfunction (ED) consult"
          : consultSubtypeForLabel === "hair_loss"
            ? "Hair loss consult"
            : consultSubtypeForLabel === "womens_health"
              ? "Women's health consult (UTI / contraceptive pill)"
              : "Doctor consult"
  parts.push(`Service Type: ${serviceLabel}`)

  // Common fields across all service types (support both camelCase and snake_case).
  // The legacy multi-select symptoms array is rarely populated by current intake
  // UIs (the med cert symptoms-step is a textarea); historical intake rows may
  // still have it. Always check the array first, then fall back to the text
  // description writers (`symptomDetails` / `symptom_details` /
  // `symptoms_description`). Phase: AI prompt drift fix, 2026-05-12.
  const legacySymptoms = answers.symptoms ?? answers.symptom_list
  if (legacySymptoms && Array.isArray(legacySymptoms) && legacySymptoms.length > 0) {
    const sanitizedSymptoms = legacySymptoms.map(s => sanitizeAnswerValue(s, intakeId))
    parts.push(`Symptoms: ${sanitizedSymptoms.join(", ")}`)
  } else {
    const textReport = answers.symptoms_description || answers.symptom_details || answers.symptomDetails
    if (typeof textReport === "string" && textReport.trim()) {
      parts.push(`Symptoms: ${sanitizeAnswerValue(textReport, intakeId)}`)
    }
  }

  // `Additional Symptoms` is the old "anything else?" field; current UI does
  // not collect it but historical rows may.
  if (answers.otherSymptomDetails || answers.other_symptom_details) {
    const detail = answers.otherSymptomDetails || answers.other_symptom_details
    parts.push(`Additional Symptoms: ${sanitizeAnswerValue(detail, intakeId)}`)
  }

  if (answers.reason) {
    parts.push(`Reason: ${sanitizeAnswerValue(answers.reason, intakeId)}`)
  }

  // Symptom duration (med certs and consults - supports both camelCase and snake_case)
  const symptomDuration = answers.symptomDuration || answers.symptom_duration
  if (symptomDuration) {
    const label = String(symptomDuration).replace(/_/g, "-")
    parts.push(`Symptom Duration: ${label}`)
  }

  // Service-specific fields (use draftCategory for comparisons)
  if (draftCategory === "med_cert") {
    if (answers.certificateType || answers.certificate_type) {
      parts.push(`Certificate Type: ${sanitizeAnswerValue(answers.certificateType || answers.certificate_type, intakeId)}`)
    }
    if (answers.startDate || answers.start_date) {
      parts.push(`Start Date: ${answers.startDate || answers.start_date}`)
    }
    if (answers.endDate || answers.end_date) {
      parts.push(`End Date: ${answers.endDate || answers.end_date}`)
    }
    if (answers.durationDays || answers.duration_requested) {
      parts.push(`Duration: ${answers.durationDays || answers.duration_requested} day(s)`)
    } else if (answers.duration) {
      parts.push(`Duration: ${sanitizeAnswerValue(answers.duration, intakeId)}`)
    }
    // Legacy fields
    if (answers.specificDateFrom) {
      parts.push(`Start Date: ${answers.specificDateFrom}`)
    }
    if (answers.specificDateTo) {
      parts.push(`End Date: ${answers.specificDateTo}`)
    }
  }

  if (draftCategory === "repeat_rx") {
    const medications = collectRepeatMedicationEntries(answers)
    if (medications.length > 0) {
      parts.push(`Medication(s): ${medications.map(formatRepeatMedication).map(value => sanitizeAnswerValue(value, intakeId)).join("; ")}`)
    } else if (answers.medication || answers.medicationName || answers.medication_name) {
      parts.push(`Medication: ${sanitizeAnswerValue(answers.medication || answers.medicationName || answers.medication_name, intakeId)}`)
    }
    if (medications.length <= 1 && (answers.medicationStrength || answers.medication_strength || answers.strength)) {
      parts.push(`Strength: ${sanitizeAnswerValue(answers.medicationStrength || answers.medication_strength || answers.strength, intakeId)}`)
    }
    if (medications.length <= 1 && (answers.medicationForm || answers.medication_form || answers.form)) {
      parts.push(`Form: ${sanitizeAnswerValue(answers.medicationForm || answers.medication_form || answers.form, intakeId)}`)
    }
    if (answers.currentDose || answers.current_dose || answers.dosage_instructions) {
      parts.push(`Current Dose: ${sanitizeAnswerValue(answers.currentDose || answers.current_dose || answers.dosage_instructions, intakeId)}`)
    }
    if (answers.prescriptionHistory || answers.prescription_history || answers.last_prescribed) {
      parts.push(`Prescription History: ${sanitizeAnswerValue(answers.prescriptionHistory || answers.prescription_history || answers.last_prescribed, intakeId)}`)
    }
    if (answers.treatmentDuration || answers.medicationDuration) {
      parts.push(`Treatment Duration: ${sanitizeAnswerValue(answers.treatmentDuration || answers.medicationDuration, intakeId)}`)
    }
    if (answers.conditionControl || answers.controlLevel) {
      parts.push(`Condition Control: ${sanitizeAnswerValue(answers.conditionControl || answers.controlLevel, intakeId)}`)
    }
    if (answers.lastDoctorVisit || answers.lastReview) {
      parts.push(`Last Doctor Visit: ${sanitizeAnswerValue(answers.lastDoctorVisit || answers.lastReview, intakeId)}`)
    }
    if (answers.sideEffects) {
      parts.push(`Side Effects: ${sanitizeAnswerValue(answers.sideEffects, intakeId)}`)
    }
    if (answers.recentChanges) {
      parts.push(`Recent Changes: ${sanitizeAnswerValue(answers.recentChanges, intakeId)}`)
    }
    if (answers.changeDetails) {
      parts.push(`Change Details: ${sanitizeAnswerValue(answers.changeDetails, intakeId)}`)
    }
  }

  if (draftCategory === "consult") {
    if (answers.primaryConcern || answers.concern || answers.concernSummary) {
      parts.push(`Primary Concern: ${sanitizeAnswerValue(answers.primaryConcern || answers.concern || answers.concernSummary, intakeId)}`)
    }
    if (answers.concernCategory || answers.category) {
      parts.push(`Category: ${sanitizeAnswerValue(answers.concernCategory || answers.category, intakeId)}`)
    }
    if (answers.urgency) {
      parts.push(`Urgency: ${sanitizeAnswerValue(answers.urgency, intakeId)}`)
    }
    if (answers.consultType) {
      parts.push(`Preferred Consult Type: ${sanitizeAnswerValue(answers.consultType, intakeId)}`)
    }
    if (answers.duration || answers.symptomDuration) {
      parts.push(`Duration of Concern: ${sanitizeAnswerValue(answers.duration || answers.symptomDuration, intakeId)}`)
    }

    // Subtype-aware clinical fields. Without these the AI only sees the generic
    // concern/category/urgency lines and drafts a med-cert-shaped note that
    // ignores the real ED / hair-loss / women's-health screener data.
    const consultSubtype = String(
      answers.consultSubtype || answers.consult_subtype || intake.subtype || ""
    ).toLowerCase()

    // Helper: only emit a boolean safety line when the flag is truthy
    // ("yes"/true). Many intake booleans are stored as the string "no".
    const isTrue = (value: unknown): boolean =>
      value === true || (typeof value === "string" && value.trim().toLowerCase() === "yes")

    if (consultSubtype === "ed") {
      if (answers.edGoal) {
        parts.push(`Goal: ${sanitizeAnswerValue(answers.edGoal, intakeId)}`)
      }
      if (answers.edDuration) {
        parts.push(`Duration: ${String(answers.edDuration).replace(/_/g, "-")}`)
      }
      if (answers.edErectionFrequency != null && answers.edErectionFrequency !== "") {
        parts.push(`Erection frequency: ${sanitizeAnswerValue(answers.edErectionFrequency, intakeId)}/5 (1 = almost never, 5 = almost always)`)
      }
      // Pre-2026-07-19 intakes only.
      if (answers.iiefTotal != null && answers.iiefTotal !== "") {
        parts.push(`IIEF-5 score: ${sanitizeAnswerValue(answers.iiefTotal, intakeId)}/25`)
      }
      if (answers.edPreference) {
        parts.push(`Treatment preference: ${String(answers.edPreference).replace(/_/g, "-")}`)
      }
      if (answers.previousEdMeds) {
        parts.push(`Previous ED medication: ${sanitizeAnswerValue(answers.previousEdMeds, intakeId)}`)
      }
      if (answers.edPreviousTreatment) {
        parts.push(`Previous treatment: ${sanitizeAnswerValue(answers.edPreviousTreatment, intakeId)}`)
      }
      if (answers.edPreviousEffectiveness) {
        parts.push(`Previous treatment effectiveness: ${sanitizeAnswerValue(answers.edPreviousEffectiveness, intakeId)}`)
      }
      if (answers.edAdditionalInfo) {
        parts.push(`Patient notes: ${sanitizeAnswerValue(answers.edAdditionalInfo, intakeId)}`)
      }
      if (answers.symptom_severity) {
        parts.push(`Severity: ${sanitizeAnswerValue(answers.symptom_severity, intakeId)}`)
      }
      // Safety screen — only surface flags that are actively reported.
      if (isTrue(answers.edNitrates)) parts.push("Nitrate use: reported (contraindication)")
      if (isTrue(answers.edAlphaBlockers)) parts.push("Alpha-blocker use: reported")
      if (isTrue(answers.edRecentHeartEvent)) parts.push("Recent cardiac event: reported")
      if (isTrue(answers.edSevereHeart)) parts.push("Severe heart condition: reported")
    } else if (consultSubtype === "hair_loss") {
      if (answers.hairGoal) {
        parts.push(`Goal: ${sanitizeAnswerValue(answers.hairGoal, intakeId)}`)
      }
      if (answers.hairPattern) {
        parts.push(`Pattern: ${sanitizeAnswerValue(answers.hairPattern, intakeId)}`)
      }
      if (answers.hairOnset) {
        parts.push(`Onset: ${String(answers.hairOnset).replace(/_/g, "-")}`)
      }
      if (answers.hairFamilyHistory) {
        parts.push(`Family history: ${sanitizeAnswerValue(answers.hairFamilyHistory, intakeId)}`)
      }
      if (answers.hairMedicationPreference) {
        parts.push(`Treatment preference: ${String(answers.hairMedicationPreference).replace(/_/g, "-")}`)
      }
      // Scalp findings — only surface when reported.
      if (isTrue(answers.scalpItching)) parts.push("Scalp itching: reported")
      if (isTrue(answers.scalpDandruff)) parts.push("Dandruff: reported")
      if (isTrue(answers.scalpPsoriasis)) parts.push("Scalp psoriasis: reported")
      if (isTrue(answers.scalpFolliculitis)) parts.push("Folliculitis: reported")
      // Safety screen — only surface flags that are actively reported.
      if (isTrue(answers.hairHeartConditions)) parts.push("Heart condition: reported")
      if (isTrue(answers.hairLowBP)) parts.push("Low blood pressure: reported")
      if (isTrue(answers.hairReproductive)) parts.push("Reproductive/pregnancy consideration: reported")
    } else if (consultSubtype === "womens_health") {
      if (answers.womensHealthOption) {
        parts.push(`Pathway: ${String(answers.womensHealthOption).replace(/_/g, "-")}`)
      }
      const utiSymptoms = answers.utiSymptoms
      if (Array.isArray(utiSymptoms) && utiSymptoms.length > 0) {
        parts.push(`UTI symptoms: ${utiSymptoms.map(s => sanitizeAnswerValue(s, intakeId)).join(", ")}`)
      } else if (typeof utiSymptoms === "string" && utiSymptoms.trim()) {
        parts.push(`UTI symptoms: ${sanitizeAnswerValue(utiSymptoms, intakeId)}`)
      }
      if (isTrue(answers.utiRedFlags)) parts.push("UTI red flags: reported")
      if (isTrue(answers.utiPregnant)) parts.push("Pregnancy: reported")
      // Allergies / conditions / other medications (women's-health-specific keys;
      // the generic hasAllergies/currentMedications block below covers the shared keys).
      if (isTrue(answers.hasAllergies)) {
        const allergyDetail = answers.allergies
        parts.push(`Allergies: ${allergyDetail ? sanitizeAnswerValue(allergyDetail, intakeId) : "Yes (not specified)"}`)
      }
      if (isTrue(answers.hasConditions)) {
        const conditionDetail = answers.conditions
        parts.push(`Conditions: ${conditionDetail ? sanitizeAnswerValue(conditionDetail, intakeId) : "Yes (not specified)"}`)
      }
      if (isTrue(answers.hasOtherMedications)) {
        const medDetail = answers.otherMedications
        parts.push(`Other medications: ${medDetail ? sanitizeAnswerValue(medDetail, intakeId) : "Yes (not specified)"}`)
      }
    }

    if (answers.bmi != null && answers.bmi !== "") {
      parts.push(`BMI: ${sanitizeAnswerValue(answers.bmi, intakeId)}`)
    }
  }

  // Clinical history fields (all service types - useful for Relevant Information section)
  if (answers.hasAllergies === true || answers.has_allergies === true) {
    const allergyDetail = answers.allergyDetails || answers.allergy_details || answers.allergies
    parts.push(`Allergies: ${allergyDetail ? sanitizeAnswerValue(allergyDetail, intakeId) : "Yes (not specified)"}`)
  } else if (answers.hasAllergies === false || answers.has_allergies === false) {
    parts.push("Allergies: Nil known")
  }

  if (answers.currentMedications || answers.current_medications) {
    parts.push(`Current Medications: ${sanitizeAnswerValue(answers.currentMedications || answers.current_medications, intakeId)}`)
  }

  if (answers.medicalConditions || answers.medical_conditions) {
    parts.push(`Medical Conditions: ${sanitizeAnswerValue(answers.medicalConditions || answers.medical_conditions, intakeId)}`)
  }

  if (answers.medicalHistory || answers.medical_history) {
    parts.push(`Medical History: ${sanitizeAnswerValue(answers.medicalHistory || answers.medical_history, intakeId)}`)
  }

  // Carer information (med certs)
  if (answers.carerPersonName || answers.carer_person_name) {
    parts.push(`Caring for: ${sanitizeAnswerValue(answers.carerPersonName || answers.carer_person_name, intakeId)}`)
  }
  if (answers.carerRelationship || answers.carer_relationship) {
    parts.push(`Relationship: ${sanitizeAnswerValue(answers.carerRelationship || answers.carer_relationship, intakeId)}`)
  }

  // Additional notes (all service types)
  if (answers.additionalNotes || answers.notes) {
    parts.push(`Additional Notes: ${sanitizeAnswerValue(answers.additionalNotes || answers.notes, intakeId)}`)
  }

  return parts.join("\n")
}

// Re-export for convenience
export { type DraftCategory,getDraftCategory, normalizeServiceType }
