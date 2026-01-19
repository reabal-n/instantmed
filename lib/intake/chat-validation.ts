/**
 * Chat Intake Validation
 * 
 * Server-side validation for AI-collected intake data.
 * CRITICAL: Never trust AI output. Revalidate everything.
 */

import { isControlledSubstance } from '@/lib/clinical/intake-validation'

// =============================================================================
// TYPES
// =============================================================================

export interface IntakePayload {
  ready?: boolean
  status?: 'in_progress' | 'ready_for_review' | 'requires_form' | 'safety_exit'
  service_type: 'med_cert' | 'repeat_rx' | 'consult' | 'medical_certificate' | 'repeat_prescription' | 'new_prescription' | 'general_consult' | null
  collected: Record<string, unknown>
  safety_flags?: string[]
  flags?: Array<{ severity: string; category: string; message: string; field: string }>
  exclusions?: string[]
  requiresFormTransition?: boolean
  turnCount?: number
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  safetyBlocks: SafetyBlock[]
  sanitizedData: Record<string, unknown> | null
}

export interface SafetyBlock {
  type: 'emergency' | 'crisis' | 'controlled_substance' | 'requires_consult'
  message: string
  action: 'terminate' | 'redirect' | 'warn'
}

// =============================================================================
// REQUIRED FIELDS BY SERVICE TYPE
// =============================================================================

const REQUIRED_FIELDS: Record<string, string[]> = {
  med_cert: ['certType', 'duration', 'dateFrom', 'symptoms'],
  repeat_rx: ['medication', 'medicationDuration', 'controlLevel', 'lastReview'],
  new_rx: ['category', 'description'],
  consult: ['concern', 'urgency', 'consultType'],
}

const OPTIONAL_FIELDS: Record<string, string[]> = {
  med_cert: ['carerName', 'carerRelation', 'otherSymptom', 'notes', 'severity', 'onset'],
  repeat_rx: ['pbsCode', 'recentChanges', 'notes', 'strength', 'sideEffects'],
  new_rx: ['previousTreatment', 'previousMeds', 'allergies', 'allergyDetails', 'currentMeds', 'currentMedDetails', 'hasPreference', 'preference', 'duration'],
  consult: ['notes', 'category', 'symptoms'],
}

// =============================================================================
// VALIDATION RULES
// =============================================================================

const CERT_TYPES = ['work', 'uni', 'carer']
const DURATIONS = ['1', '2', '3', '4+', 'today', '2days', '3days', '4-7days', 'custom']
const DATE_OPTIONS = ['today', 'tomorrow', 'custom']
const SYMPTOM_OPTIONS = ['cold_flu', 'gastro', 'migraine', 'fatigue', 'period_pain', 'mental_health', 'other', 'cold', 'fever', 'respiratory', 'mental', 'period']
const MEDICATION_DURATIONS = ['under_3m', '3_12m', 'over_1y', '<3m', '3-12m', '>1y']
const CONTROL_LEVELS = ['well', 'partial', 'poor']
const LAST_REVIEW_OPTIONS = ['under_6m', '6_12m', 'over_1y']
const URGENCY_OPTIONS = ['urgent', 'soon', 'routine']
const CONSULT_TYPES = ['video', 'phone', 'async']
const CARER_RELATIONS = ['child', 'parent', 'partner', 'other_family', 'sibling', 'grandparent', 'other']

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate intake payload from AI
 * CRITICAL: This is the last line of defense before submission
 */
export function validateIntakePayload(payload: IntakePayload): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const safetyBlocks: SafetyBlock[] = []
  
  // Check basic structure
  if (!payload || typeof payload !== 'object') {
    return {
      valid: false,
      errors: ['Invalid payload structure'],
      warnings: [],
      safetyBlocks: [],
      sanitizedData: null,
    }
  }
  
  const { ready, service_type, collected } = payload
  
  // Normalize service type (support both old and new formats)
  const SERVICE_TYPE_MAP: Record<string, string> = {
    'medical_certificate': 'med_cert',
    'repeat_prescription': 'repeat_rx',
    'new_prescription': 'new_rx',
    'general_consult': 'consult',
    'med_cert': 'med_cert',
    'repeat_rx': 'repeat_rx',
    'new_rx': 'new_rx',
    'consult': 'consult',
  }
  
  const normalizedServiceType = service_type ? SERVICE_TYPE_MAP[service_type] : null
  
  // Validate service type
  if (!normalizedServiceType || !['med_cert', 'repeat_rx', 'new_rx', 'consult'].includes(normalizedServiceType)) {
    errors.push('Invalid or missing service type')
    return {
      valid: false,
      errors,
      warnings,
      safetyBlocks,
      sanitizedData: null,
    }
  }
  
  // Check ready flag (but don't trust it)
  if (!ready) {
    warnings.push('AI indicated intake not ready')
  }
  
  // Validate collected data exists
  if (!collected || typeof collected !== 'object') {
    errors.push('Missing collected data')
    return {
      valid: false,
      errors,
      warnings,
      safetyBlocks,
      sanitizedData: null,
    }
  }
  
  // Normalize collected field names (map new schema to old)
  const normalizedCollected = normalizeCollectedFields(collected)
  
  // Check required fields
  const requiredFields = REQUIRED_FIELDS[normalizedServiceType] || []
  for (const field of requiredFields) {
    if (!normalizedCollected[field] || (typeof normalizedCollected[field] === 'string' && !(normalizedCollected[field] as string).trim())) {
      errors.push(`Missing required field: ${field}`)
    }
  }
  
  // Type-specific validation
  if (normalizedServiceType === 'med_cert') {
    validateMedCertFields(normalizedCollected, errors, warnings, safetyBlocks)
  } else if (normalizedServiceType === 'repeat_rx') {
    validateRepeatRxFields(normalizedCollected, errors, warnings, safetyBlocks)
  } else if (normalizedServiceType === 'new_rx') {
    validateNewRxFields(normalizedCollected, errors, warnings, safetyBlocks)
  } else if (normalizedServiceType === 'consult') {
    validateConsultFields(normalizedCollected, errors, warnings)
  }
  
  // Sanitize data
  const sanitizedData = sanitizeCollectedData(normalizedServiceType, normalizedCollected)
  
  return {
    valid: errors.length === 0 && safetyBlocks.filter(b => b.action === 'terminate').length === 0,
    errors,
    warnings,
    safetyBlocks,
    sanitizedData: errors.length === 0 ? sanitizedData : null,
  }
}

/**
 * Normalize field names from new schema to validation schema
 */
function normalizeCollectedFields(collected: Record<string, unknown>): Record<string, unknown> {
  const fieldMap: Record<string, string> = {
    // Medical certificate field mappings
    'purpose': 'certType',
    'startDate': 'dateFrom',
    'endDate': 'dateTo',
    'durationDays': 'duration',
    'primarySymptoms': 'symptoms',
    'symptomOnset': 'onset',
    'symptomSeverity': 'severity',
    'carerDetails': 'carer',
    'additionalNotes': 'notes',
    
    // Repeat prescription field mappings
    'medicationName': 'medication',
    'medicationStrength': 'strength',
    'treatmentDuration': 'medicationDuration',
    'conditionControl': 'controlLevel',
    'lastReviewDate': 'lastReview',
    'sideEffects': 'sideEffects',
    'recentChanges': 'recentChanges',
    'changeDetails': 'changeNotes',
    
    // Consult field mappings
    'concernSummary': 'concern',
    'concernCategory': 'category',
    'consultType': 'consultType',
    'urgency': 'urgency',
    
    // New prescription field mappings  
    'conditionCategory': 'category',
    'conditionDescription': 'description',
    'conditionDuration': 'duration',
    'triedBefore': 'previousTreatment',
    'previousMedications': 'previousMeds',
    'hasAllergies': 'allergies',
    'allergyList': 'allergyDetails',
    'takingOtherMeds': 'currentMeds',
    'currentMedications': 'currentMedDetails',
    'hasMedicationPreference': 'hasPreference',
    'preferredMedication': 'preference',
  }
  
  const normalized: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(collected)) {
    // Use mapped field name if exists, otherwise keep original
    const normalizedKey = fieldMap[key] || key
    normalized[normalizedKey] = value
    
    // Also keep original key for backwards compatibility
    if (fieldMap[key]) {
      normalized[key] = value
    }
  }
  
  // Handle nested objects (e.g., carerDetails -> carerName, carerRelation)
  if (collected.carerDetails && typeof collected.carerDetails === 'object') {
    const carer = collected.carerDetails as Record<string, unknown>
    normalized['carerName'] = carer.personName || carer.name
    normalized['carerRelation'] = carer.relationship || carer.relation
  }
  
  // Handle medication object
  if (collected.medication && typeof collected.medication === 'object') {
    const med = collected.medication as Record<string, unknown>
    normalized['medication'] = med.name || med.medication
    normalized['strength'] = med.strength
    normalized['pbsCode'] = med.pbsCode
  }
  
  return normalized
}

function validateMedCertFields(
  collected: Record<string, unknown>,
  errors: string[],
  warnings: string[],
  safetyBlocks: SafetyBlock[]
): void {
  const { certType, duration, dateFrom, symptoms, carerName, carerRelation } = collected
  
  // Validate cert type
  if (certType && !CERT_TYPES.includes(certType as string)) {
    errors.push(`Invalid certificate type: ${certType}`)
  }
  
  // Validate duration
  if (duration && !DURATIONS.includes(String(duration))) {
    errors.push(`Invalid duration: ${duration}`)
  }
  
  // Check for long certificate
  if (duration === '4+' || duration === '4-7days') {
    safetyBlocks.push({
      type: 'requires_consult',
      message: 'Certificates over 3 days may require additional clinical review',
      action: 'warn',
    })
  }
  
  // Validate date
  if (dateFrom && typeof dateFrom === 'string') {
    if (!DATE_OPTIONS.includes(dateFrom) && !isValidDateString(dateFrom)) {
      errors.push(`Invalid date: ${dateFrom}`)
    }
    
    // Check for backdated certificate (>7 days ago)
    if (isBackdated(dateFrom, 7)) {
      warnings.push('Certificate start date is more than 7 days ago')
    }
  }
  
  // Validate symptoms
  if (symptoms) {
    const symptomArray = Array.isArray(symptoms) ? symptoms : [symptoms]
    for (const symptom of symptomArray) {
      if (!SYMPTOM_OPTIONS.includes(symptom as string)) {
        warnings.push(`Unknown symptom: ${symptom}`)
      }
    }
  }
  
  // Carer validation
  if (certType === 'carer') {
    if (!carerName || typeof carerName !== 'string' || !carerName.trim()) {
      errors.push('Carer name is required for carer certificates')
    }
    if (!carerRelation || !CARER_RELATIONS.includes(carerRelation as string)) {
      errors.push('Carer relationship is required')
    }
  }
}

function validateRepeatRxFields(
  collected: Record<string, unknown>,
  errors: string[],
  warnings: string[],
  safetyBlocks: SafetyBlock[]
): void {
  const { medication, medicationDuration, controlLevel, lastReview } = collected
  
  // Check for controlled substances
  if (medication && typeof medication === 'string') {
    if (isControlledSubstance(medication)) {
      safetyBlocks.push({
        type: 'controlled_substance',
        message: `${medication} is a controlled substance and cannot be prescribed online`,
        action: 'terminate',
      })
    }
    
    // Sanitize medication name length
    if (medication.length > 200) {
      errors.push('Medication name too long')
    }
  }
  
  // Validate duration
  if (medicationDuration && !MEDICATION_DURATIONS.includes(medicationDuration as string)) {
    errors.push(`Invalid medication duration: ${medicationDuration}`)
  }
  
  // Short duration warning
  if (medicationDuration === 'under_3m' || medicationDuration === '<3m') {
    safetyBlocks.push({
      type: 'requires_consult',
      message: 'Medications taken for less than 3 months typically need in-person review',
      action: 'warn',
    })
  }
  
  // Validate control level
  if (controlLevel && !CONTROL_LEVELS.includes(controlLevel as string)) {
    errors.push(`Invalid control level: ${controlLevel}`)
  }
  
  // Poor control warning
  if (controlLevel === 'poor') {
    warnings.push('Patient reports poor symptom control')
  }
  
  // Validate last review
  if (lastReview && !LAST_REVIEW_OPTIONS.includes(lastReview as string)) {
    errors.push(`Invalid last review option: ${lastReview}`)
  }
  
  // Long time since review
  if (lastReview === 'over_1y') {
    safetyBlocks.push({
      type: 'requires_consult',
      message: 'Over 1 year since last doctor review - consult recommended',
      action: 'warn',
    })
  }
}

function validateNewRxFields(
  collected: Record<string, unknown>,
  errors: string[],
  warnings: string[],
  safetyBlocks: SafetyBlock[]
): void {
  const { category, description, allergies, currentMeds, preference } = collected
  
  // Validate category
  const validCategories = ['skin', 'infection', 'respiratory', 'contraception', 'mental_health', 'pain', 'gastro', 'gastrointestinal', 'other']
  if (category && !validCategories.includes(category as string)) {
    warnings.push(`Unknown condition category: ${category}`)
  }
  
  // Mental health requires detailed form
  if (category === 'mental_health') {
    safetyBlocks.push({
      type: 'requires_consult',
      message: 'Mental health prescriptions require comprehensive assessment form',
      action: 'redirect',
    })
  }
  
  // Validate description length
  if (description && typeof description === 'string') {
    if (description.length > 500) {
      errors.push('Condition description too long')
    }
    if (description.length < 10) {
      errors.push('Condition description too short')
    }
  }
  
  // Check for controlled substance in preference
  if (preference && typeof preference === 'string') {
    if (isControlledSubstance(preference)) {
      safetyBlocks.push({
        type: 'controlled_substance',
        message: `${preference} is a controlled substance and cannot be prescribed online`,
        action: 'terminate',
      })
    }
  }
  
  // Log allergy info
  if (allergies === true || allergies === 'yes' || allergies === 'Yes') {
    warnings.push('Patient reports allergies - review required')
  }
  
  // Log polypharmacy risk
  if (currentMeds === true || currentMeds === 'yes' || currentMeds === 'Yes') {
    warnings.push('Patient taking other medications - interaction check required')
  }
}

function validateConsultFields(
  collected: Record<string, unknown>,
  errors: string[],
  warnings: string[]
): void {
  const { concern, urgency, consultType } = collected
  
  // Validate concern length
  if (concern && typeof concern === 'string') {
    if (concern.length > 500) {
      errors.push('Concern description too long')
    }
    if (concern.length < 5) {
      errors.push('Concern description too short')
    }
  }
  
  // Validate urgency
  if (urgency && !URGENCY_OPTIONS.includes(urgency as string)) {
    errors.push(`Invalid urgency: ${urgency}`)
  }
  
  // Validate consult type
  if (consultType && !CONSULT_TYPES.includes(consultType as string)) {
    errors.push(`Invalid consult type: ${consultType}`)
  }
  
  // Urgent consult warning
  if (urgency === 'urgent') {
    warnings.push('Patient marked as urgent - prioritize review')
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function isValidDateString(dateStr: string): boolean {
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

function isBackdated(dateStr: string, days: number): boolean {
  if (dateStr === 'today' || dateStr === 'tomorrow') return false
  
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return false
  
  const now = new Date()
  const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  
  return date < daysAgo
}

function sanitizeCollectedData(
  serviceType: string,
  collected: Record<string, unknown>
): Record<string, unknown> {
  const allowedFields = [
    ...(REQUIRED_FIELDS[serviceType] || []),
    ...(OPTIONAL_FIELDS[serviceType] || []),
  ]
  
  const sanitized: Record<string, unknown> = {}
  
  for (const field of allowedFields) {
    if (collected[field] !== undefined && collected[field] !== null) {
      let value = collected[field]
      
      // Sanitize strings
      if (typeof value === 'string') {
        value = value.trim().slice(0, 500) // Max 500 chars
      }
      
      // Sanitize arrays
      if (Array.isArray(value)) {
        value = value.map(v => typeof v === 'string' ? v.trim().slice(0, 100) : v)
      }
      
      sanitized[field] = value
    }
  }
  
  return sanitized
}

// =============================================================================
// EXPORTS
// =============================================================================

export { REQUIRED_FIELDS, OPTIONAL_FIELDS }
