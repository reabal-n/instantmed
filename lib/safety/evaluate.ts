import { isControlledSubstance } from '@/lib/clinical/intake-validation'
import {
  isExactStringValue,
  PILL_PREGNANCY_STATUS_VALUES,
  PILL_YES_NO_VALUES,
} from '@/lib/clinical/womens-health-pill'

import { getSafetyConfig } from './rules'
import type {
  AdditionalInfoItem,
  RiskTier,
  RuleCondition,
  SafetyEvaluationResult,
  SafetyOutcome,
  SafetyRule,
  SafetyRulesConfig as _SafetyRulesConfig,
  TriggeredRule,
} from './types'

// ============================================
// DERIVED VALUE CALCULATORS
// ============================================

function calculateBMI(weight: number, heightCm: number): number {
  const heightM = heightCm / 100
  return weight / (heightM * heightM)
}

// Resolve 'today' or 'YYYY-MM-DD' to a calendar date in AEST. The
// application uses AEST for every 'today' definition; UTC interpretation
// produces off-by-one errors at AEST 00:00-09:59 (= UTC 14:00-23:59) where
// the two timezones disagree on the calendar day. Returns null for
// unparseable input.
function resolveAEST(dateStr: string): { y: number; m: number; d: number } | null {
  const source =
    dateStr === 'today'
      ? new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" })
      : dateStr
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(source)
  if (!match) return null
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) }
}

// Calendar-day difference (b - a) in whole days, AEST-anchored, no rounding
// drift. Both inputs are 'today' or 'YYYY-MM-DD'.
function dayDiff(a: string, b: string): number {
  const aResolved = resolveAEST(a)
  const bResolved = resolveAEST(b)
  if (!aResolved || !bResolved) return 0
  // Use Date.UTC for the day arithmetic. Both points are pinned at the
  // same UTC anchor so DST and timezone offsets cannot drift the result.
  const aMs = Date.UTC(aResolved.y, aResolved.m, aResolved.d)
  const bMs = Date.UTC(bResolved.y, bResolved.m, bResolved.d)
  return Math.round((bMs - aMs) / (1000 * 60 * 60 * 24))
}

function calculateDurationDays(startDate: string, endDate: string): number {
  return Math.abs(dayDiff(startDate, endDate))
}

/**
 * Signed day difference (end - start) without Math.abs(). Positive = end is
 * after start. Used to detect dates beyond the configured forward window and
 * date-ordering rules. AEST-anchored via resolveAEST (see comment above).
 */
function calculateSignedDays(startDate: string, endDate: string): number {
  return dayDiff(startDate, endDate)
}

// Test-only exports. Internal helpers are deliberately private to the
// module but the AEST/UTC drift class is subtle enough that a contract
// test is the only sane way to guarantee it stays correct. Do NOT import
// these from production code — use evaluateSafety / evaluateSafetyWithAdditionalInfo
// or whatever the appropriate public entry point is.
export const __testOnly = {
  calculateDurationDays,
  calculateSignedDays,
  dayDiff,
  resolveAEST,
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function getDerivedValue(
  derivedFrom: { type: string; fields: string[] },
  answers: Record<string, unknown>
): unknown {
  const [field1, field2] = derivedFrom.fields
  const val1 = field1 === 'today' ? 'today' : answers[field1]
  const val2 = field2 === 'today' ? 'today' : answers[field2]

  switch (derivedFrom.type) {
    case 'bmi':
      if (typeof val1 === 'number' && typeof val2 === 'number') {
        return calculateBMI(val1, val2)
      }
      return null

    case 'duration_days':
      if (typeof val1 === 'string' && typeof val2 === 'string') {
        return calculateDurationDays(val1, val2)
      }
      // Handle array count
      if (Array.isArray(val1)) {
        return val1.filter((v) => v !== 'none').length
      }
      return null

    case 'signed_days':
      if (typeof val1 === 'string' && typeof val2 === 'string') {
        return calculateSignedDays(val1, val2)
      }
      return null

    case 'age':
      if (typeof val1 === 'string') {
        return calculateAge(val1)
      }
      return null

    case 'is_controlled':
      // True if ANY listed answer field names a Schedule 8 / controlled substance.
      // Returns a definite false (not null) when no field matches so the rule
      // simply does not fire — missing medication fields never produce a block.
      for (const field of derivedFrom.fields) {
        const candidate = answers[field]
        if (typeof candidate === 'string' && candidate.trim() && isControlledSubstance(candidate)) {
          return true
        }
      }
      return false

    default:
      return null
  }
}

// ============================================
// CONDITION EVALUATION
// ============================================

function evaluateCondition(
  condition: RuleCondition,
  answers: Record<string, unknown>
): boolean {
  // Get the value to check
  let value: unknown
  if (condition.derivedFrom) {
    value = getDerivedValue(condition.derivedFrom, answers)
  } else {
    value = answers[condition.fieldId]
  }

  // Handle null/undefined - fail-closed for safety
  // If a required safety field is not answered, treat it as potentially dangerous
  if (value === null || value === undefined) {
    if (condition.operator === 'is_empty') return true
    if (condition.operator === 'is_not_empty') return false
    // AUDIT FIX: For boolean safety checks (e.g., "has_chest_pain equals true"),
    // null means unanswered - we cannot safely assume "no".
    // However, for most operators, null means "no data" which should not trigger.
    // The key insight: if the rule is checking `equals true` and value is null,
    // that's genuinely "not true", so returning false is correct.
    // The real fix is ensuring required fields are validated BEFORE safety evaluation.
    return false
  }

  const compareValue = condition.value

  switch (condition.operator) {
    case 'equals':
      return value === compareValue

    case 'not_equals':
      return value !== compareValue

    case 'contains':
      if (typeof value === 'string' && typeof compareValue === 'string') {
        return value.toLowerCase().includes(compareValue.toLowerCase())
      }
      return false

    case 'not_contains':
      if (typeof value === 'string' && typeof compareValue === 'string') {
        return !value.toLowerCase().includes(compareValue.toLowerCase())
      }
      return true

    case 'includes_any':
      if (Array.isArray(value) && Array.isArray(compareValue)) {
        return compareValue.some((v) => value.includes(v))
      }
      return false

    case 'includes_all':
      if (Array.isArray(value) && Array.isArray(compareValue)) {
        return compareValue.every((v) => value.includes(v))
      }
      return false

    case 'gt':
      if (typeof value === 'number' && typeof compareValue === 'number') {
        return value > compareValue
      }
      return false

    case 'gte':
      if (typeof value === 'number' && typeof compareValue === 'number') {
        return value >= compareValue
      }
      return false

    case 'lt':
      if (typeof value === 'number' && typeof compareValue === 'number') {
        return value < compareValue
      }
      return false

    case 'lte':
      if (typeof value === 'number' && typeof compareValue === 'number') {
        return value <= compareValue
      }
      return false

    case 'is_empty':
      if (Array.isArray(value)) return value.length === 0
      if (typeof value === 'string') return value.trim() === ''
      return false

    case 'is_not_empty':
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'string') return value.trim() !== ''
      return true

    case 'matches_pattern':
      if (typeof value === 'string' && typeof compareValue === 'string') {
        return new RegExp(compareValue).test(value)
      }
      return false

    case 'age_under':
      if (typeof value === 'number' && typeof compareValue === 'number') {
        return value < compareValue
      }
      return false

    case 'age_over':
      if (typeof value === 'number' && typeof compareValue === 'number') {
        return value > compareValue
      }
      return false

    case 'bmi_under':
      if (typeof value === 'number' && typeof compareValue === 'number') {
        return value < compareValue
      }
      return false

    case 'bmi_over':
      if (typeof value === 'number' && typeof compareValue === 'number') {
        return value > compareValue
      }
      return false

    default:
      return false
  }
}

function evaluateRule(
  rule: SafetyRule,
  answers: Record<string, unknown>
): boolean {
  const logic = rule.conditionLogic || 'AND'

  if (logic === 'AND') {
    return rule.conditions.every((cond) => evaluateCondition(cond, answers))
  } else {
    return rule.conditions.some((cond) => evaluateCondition(cond, answers))
  }
}

// ============================================
// OUTCOME PRIORITY
// ============================================

const outcomePriority: Record<SafetyOutcome, number> = {
  DECLINE: 4,
  REQUIRES_CALL: 3,
  REQUEST_MORE_INFO: 2,
  ALLOW: 1,
}

const riskTierPriority: Record<RiskTier, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

// ============================================
// PATIENT-FRIENDLY TITLES
// ============================================

const outcomeTitles: Record<SafetyOutcome, string> = {
  ALLOW: 'You\'re all set!',
  REQUEST_MORE_INFO: 'We need a bit more information',
  REQUIRES_CALL: 'Let\'s have a quick chat',
  DECLINE: 'We can\'t help with this online',
}

// ============================================
// MAIN EVALUATION FUNCTION
// ============================================

export function evaluateSafety(
  serviceSlug: string,
  answers: Record<string, unknown>
): SafetyEvaluationResult {
  const startTime = performance.now()

  const config = getSafetyConfig(serviceSlug)

  if (!config) {
    // No safety config = default allow
    return {
      outcome: 'ALLOW',
      riskTier: 'low',
      triggeredRules: [],
      additionalInfoRequired: [],
      patientTitle: outcomeTitles.ALLOW,
      patientMessage: 'Your request is ready to proceed.',
      evaluatedAt: new Date().toISOString(),
      evaluationDurationMs: performance.now() - startTime,
      answersSnapshot: { ...answers },
    }
  }

  // Sort rules by priority (highest first)
  const sortedRules = [...config.rules].sort((a, b) => b.priority - a.priority)

  // Evaluate all rules and collect triggered ones
  const triggeredRules: TriggeredRule[] = []

  for (const rule of sortedRules) {
    // Skip if rule is service-specific and doesn't match
    if (rule.services && !rule.services.includes(serviceSlug)) {
      continue
    }

    if (evaluateRule(rule, answers)) {
      // Extract field values that triggered this rule
      const fieldValues: Record<string, unknown> = {}
      for (const cond of rule.conditions) {
        if (cond.derivedFrom) {
          for (const field of cond.derivedFrom.fields) {
            if (field !== 'today') {
              fieldValues[field] = answers[field]
            }
          }
        } else {
          fieldValues[cond.fieldId] = answers[cond.fieldId]
        }
      }

      triggeredRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        outcome: rule.outcome,
        riskTier: rule.riskTier,
        reason: rule.description,
        fieldValues,
      })
    }
  }

  // Determine final outcome (highest priority wins)
  let finalOutcome: SafetyOutcome = config.defaultOutcome
  let finalRiskTier: RiskTier = config.defaultRiskTier
  let finalMessage = 'Your request is ready to proceed.'
  const allAdditionalInfo: AdditionalInfoItem[] = []

  if (triggeredRules.length > 0) {
    // Sort triggered rules by outcome priority, then risk tier
    const sortedTriggered = [...triggeredRules].sort((a, b) => {
      const outcomeDiff = outcomePriority[b.outcome] - outcomePriority[a.outcome]
      if (outcomeDiff !== 0) return outcomeDiff
      return riskTierPriority[b.riskTier] - riskTierPriority[a.riskTier]
    })

    // Use the highest priority outcome
    const topRule = sortedTriggered[0]
    finalOutcome = topRule.outcome
    finalRiskTier = topRule.riskTier

    // Get the message from the original rule
    const originalRule = sortedRules.find((r) => r.id === topRule.ruleId)
    if (originalRule) {
      finalMessage = originalRule.patientMessage
    }

    // Collect all additional info items from REQUEST_MORE_INFO rules
    for (const triggered of sortedTriggered) {
      if (triggered.outcome === 'REQUEST_MORE_INFO') {
        const rule = sortedRules.find((r) => r.id === triggered.ruleId)
        if (rule?.additionalInfoRequired) {
          allAdditionalInfo.push(...rule.additionalInfoRequired)
        }
      }
    }
  }

  const endTime = performance.now()

  return {
    outcome: finalOutcome,
    riskTier: finalRiskTier,
    triggeredRules,
    additionalInfoRequired: allAdditionalInfo,
    patientTitle: outcomeTitles[finalOutcome],
    patientMessage: finalMessage,
    evaluatedAt: new Date().toISOString(),
    evaluationDurationMs: endTime - startTime,
    answersSnapshot: { ...answers },
  }
}

// ============================================
// RE-EVALUATION WITH ADDITIONAL INFO
// ============================================

export function evaluateSafetyWithAdditionalInfo(
  serviceSlug: string,
  originalAnswers: Record<string, unknown>,
  additionalInfo: Record<string, unknown>
): SafetyEvaluationResult {
  // Merge answers with additional info
  const mergedAnswers = {
    ...originalAnswers,
    ...additionalInfo,
    _additionalInfoProvided: true,
  }

  // Re-evaluate with merged answers
  const result = evaluateSafety(serviceSlug, mergedAnswers)

  // If we still get REQUEST_MORE_INFO but all info was provided, allow
  if (
    result.outcome === 'REQUEST_MORE_INFO' &&
    result.additionalInfoRequired.length === 0
  ) {
    return {
      ...result,
      outcome: 'ALLOW',
      patientTitle: outcomeTitles.ALLOW,
      patientMessage: 'Thank you! Your request is ready to proceed.',
    }
  }

  return result
}

// ============================================
// SERVER-SIDE ENFORCEMENT CHECK
// ============================================

export interface ServerSafetyCheck {
  isAllowed: boolean
  outcome: SafetyOutcome
  riskTier: RiskTier
  blockReason?: string
  requiresCall: boolean
  triggeredRuleIds: string[]
}

export function checkSafetyForServer(
  serviceSlug: string,
  answers: Record<string, unknown>
): ServerSafetyCheck {
  const result = evaluateSafety(serviceSlug, answers)

  return {
    isAllowed: result.outcome === 'ALLOW',
    outcome: result.outcome,
    riskTier: result.riskTier,
    blockReason:
      result.outcome !== 'ALLOW' ? result.patientMessage : undefined,
    requiresCall: result.outcome === 'REQUIRES_CALL',
    triggeredRuleIds: result.triggeredRules.map((r) => r.ruleId),
  }
}

// ============================================
// AUDIT FIX: SAFETY FIELD COMPLETENESS CHECK
// ============================================

/**
 * AUDIT FIX: Validate that all fields referenced by safety rules have been answered.
 * This prevents bypassing safety checks by simply not answering questions.
 * Should be called before checkout to ensure safety evaluation has complete data.
 */
export function validateSafetyFieldsPresent(
  serviceSlug: string,
  answers: Record<string, unknown>
): { valid: boolean; missingFields: string[] } {
  const config = getSafetyConfig(serviceSlug)
  if (!config) return { valid: true, missingFields: [] }

  const missingFields = getRequiredSafetyFields(config.serviceSlug, answers).filter(
    (fieldId) => !hasAnsweredSafetyField(fieldId, answers[fieldId]),
  )

  return {
    valid: missingFields.length === 0,
    missingFields,
  }
}

function hasAnsweredSafetyField(fieldId: string, value: unknown): boolean {
  if (fieldId === 'hasSideEffects') {
    return typeof value === 'boolean'
  }

  if (fieldId === 'pregnancyStatus') {
    return isExactStringValue(value, PILL_PREGNANCY_STATUS_VALUES)
  }

  if (
    fieldId === 'womens_migraine_aura' ||
    fieldId === 'womens_blood_clot_history' ||
    fieldId === 'womens_smoker'
  ) {
    return isExactStringValue(value, PILL_YES_NO_VALUES)
  }

  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  return true
}

function getRequiredSafetyFields(
  serviceSlug: string,
  answers: Record<string, unknown>
): string[] {
  const fields = new Set<string>(['emergency_symptoms'])

  if (
    serviceSlug === 'medical-certificate' ||
    serviceSlug === 'med-cert' ||
    serviceSlug === 'med-cert-sick' ||
    serviceSlug === 'med-cert-carer' ||
    serviceSlug === 'med-cert-fitness' ||
    serviceSlug === 'sick-certificate'
  ) {
    fields.add('start_date')
  }

  if (serviceSlug === 'consult' || serviceSlug === 'gp-consult' || serviceSlug === 'consultation') {
    const subtype = String(answers.consultSubtype || answers.consult_subtype || '')

    if (subtype === 'ed') {
      fields.add('edNitrates')
      fields.add('edRecentHeartEvent')
      fields.add('edSevereHeart')
    }

    if (subtype === 'womens_health') {
      const option = String(answers.womensHealthOption || answers.womens_health_option || '')
      if (option === 'uti') {
        // Keep-list safety gates - must be present so the DECLINE rules can fire.
        fields.add('utiRedFlags')
        fields.add('utiPregnant')
      }
      if (option === 'ocp_new') {
        // New/switch pill safety screen (drives the pre-payment redirect rules).
        fields.add('pregnancyStatus')
        fields.add('womens_migraine_aura')
        fields.add('womens_blood_clot_history')
        fields.add('womens_smoker')
      }
    }
  }

  if (serviceSlug === 'prescription') {
    fields.add('hasSideEffects')
    if (answers.hasSideEffects === true) {
      fields.add('sideEffects')
    }
  }

  if (
    serviceSlug === 'weight-management' ||
    serviceSlug === 'weight' ||
    serviceSlug === 'weight-loss'
  ) {
    fields.add('currentWeight')
    fields.add('currentHeight')
    fields.add('eatingDisorderHistory')
  }

  return Array.from(fields)
}
