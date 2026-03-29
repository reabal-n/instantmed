"use server"

import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"
import { createLogger } from "@/lib/observability/logger"
import { checkAndSanitize } from "@/lib/ai/prompt-safety"
import { normalizeServiceType, getDraftCategory, type DraftCategory } from "@/lib/constants/service-types"
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
  serviceType: ServiceType
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
  parts.push(`Service Type: ${serviceType}`)

  // Common fields across all service types (support both camelCase and snake_case)
  const symptoms = answers.symptoms ?? answers.symptom_list
  if (symptoms && Array.isArray(symptoms)) {
    const sanitizedSymptoms = symptoms.map(s => sanitizeAnswerValue(s, intakeId))
    parts.push(`Symptoms: ${sanitizedSymptoms.join(", ")}`)
  }

  if (answers.otherSymptomDetails || answers.other_symptom_details || answers.symptom_details) {
    const detail = answers.otherSymptomDetails || answers.other_symptom_details || answers.symptom_details
    parts.push(`Additional Symptoms: ${sanitizeAnswerValue(detail, intakeId)}`)
  }

  if (answers.reason) {
    parts.push(`Reason: ${sanitizeAnswerValue(answers.reason, intakeId)}`)
  }

  // Symptom duration (med certs and consults — supports both camelCase and snake_case)
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
    if (answers.medication || answers.medicationName) {
      parts.push(`Medication: ${sanitizeAnswerValue(answers.medication || answers.medicationName, intakeId)}`)
    }
    if (answers.medicationStrength || answers.strength) {
      parts.push(`Strength: ${sanitizeAnswerValue(answers.medicationStrength || answers.strength, intakeId)}`)
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
  }

  // Clinical history fields (all service types — useful for Relevant Information section)
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
export { normalizeServiceType, getDraftCategory, type DraftCategory }
