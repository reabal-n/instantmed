import type {
  SafetyRulesConfig,
  SafetyRule,
  RuleCondition,
  SafetyEvaluationResult,
  TriggeredRule,
  SafetyOutcome,
  RiskTier,
  AdditionalInfoItem,
} from './types'
import { getSafetyConfig } from './rules'

// ============================================
// DERIVED VALUE CALCULATORS
// ============================================

function calculateBMI(weight: number, heightCm: number): number {
  const heightM = heightCm / 100
  return weight / (heightM * heightM)
}

function calculateDurationDays(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = endDate === 'today' ? new Date() : new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
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
  const val1 = answers[field1]
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

    case 'age':
      if (typeof val1 === 'string') {
        return calculateAge(val1)
      }
      return null

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

  // Handle null/undefined
  if (value === null || value === undefined) {
    if (condition.operator === 'is_empty') return true
    if (condition.operator === 'is_not_empty') return false
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
