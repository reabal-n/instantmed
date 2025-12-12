import type { 
  Rule, 
  RuleCondition, 
  RuleEvaluationContext, 
  RuleMatch, 
  TriageEvaluationResult 
} from './types'
import type { RiskTier, TriageResult } from '@/types/database'
import { getRulesForService } from './rules-config'

// ============================================
// RULES ENGINE EVALUATOR
// ============================================

/**
 * Get nested value from object using dot notation path
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

/**
 * Evaluate a single condition against the context
 */
function evaluateCondition(
  condition: RuleCondition,
  context: RuleEvaluationContext
): boolean {
  // Build a flat context object for field lookup
  const flatContext: Record<string, unknown> = {
    ...context.answers,
    eligibilityAnswers: context.eligibilityAnswers,
    answers: context.answers,
    patientProfile: context.patientProfile,
    intakeData: context.intakeData,
  }

  const fieldValue = getNestedValue(flatContext, condition.field)
  const { operator, value, valueMax } = condition

  switch (operator) {
    case 'equals':
      return fieldValue === value

    case 'not_equals':
      return fieldValue !== value

    case 'gt':
      return typeof fieldValue === 'number' && fieldValue > (value as number)

    case 'gte':
      return typeof fieldValue === 'number' && fieldValue >= (value as number)

    case 'lt':
      return typeof fieldValue === 'number' && fieldValue < (value as number)

    case 'lte':
      return typeof fieldValue === 'number' && fieldValue <= (value as number)

    case 'between':
      return (
        typeof fieldValue === 'number' &&
        fieldValue >= (value as number) &&
        fieldValue <= (valueMax as number)
      )

    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(value)
      }
      if (typeof fieldValue === 'string') {
        return fieldValue.includes(value as string)
      }
      return false

    case 'not_contains':
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(value)
      }
      if (typeof fieldValue === 'string') {
        return !fieldValue.includes(value as string)
      }
      return true

    case 'in':
      return Array.isArray(value) && value.includes(fieldValue)

    case 'not_in':
      return Array.isArray(value) && !value.includes(fieldValue)

    case 'exists':
      return fieldValue !== undefined && fieldValue !== null

    case 'not_exists':
      return fieldValue === undefined || fieldValue === null

    case 'regex':
      if (typeof fieldValue === 'string' && typeof value === 'string') {
        const regex = new RegExp(value)
        return regex.test(fieldValue)
      }
      return false

    default:
      return false
  }
}

/**
 * Evaluate a rule against the context
 */
function evaluateRule(
  rule: Rule,
  context: RuleEvaluationContext
): RuleMatch | null {
  const matchedConditions: string[] = []

  // All conditions must match
  for (const condition of rule.conditions) {
    if (evaluateCondition(condition, context)) {
      matchedConditions.push(condition.field)
    } else {
      // If any condition fails, rule doesn't match
      return null
    }
  }

  return {
    rule,
    matchedConditions,
  }
}

/**
 * Calculate risk tier based on risk score
 */
function calculateRiskTier(score: number): RiskTier {
  if (score >= 80) return 'critical'
  if (score >= 50) return 'high'
  if (score >= 25) return 'moderate'
  return 'low'
}

/**
 * Determine final triage result from matched rules
 */
function determineTriageResult(matchedRules: RuleMatch[]): TriageResult {
  // Check for hard stops first (decline)
  if (matchedRules.some((m) => m.rule.isHardStop && m.rule.action === 'decline')) {
    return 'decline'
  }

  // Check for requires live consult
  if (matchedRules.some((m) => m.rule.action === 'requires_live_consult')) {
    return 'requires_live_consult'
  }

  // Check for request more info
  if (matchedRules.some((m) => m.rule.action === 'request_more_info' && !m.rule.isSoftFlag)) {
    return 'request_more_info'
  }

  // Default to allow
  return 'allow'
}

/**
 * Main evaluation function - evaluates all rules against context
 */
export function evaluateTriage(
  context: RuleEvaluationContext
): TriageEvaluationResult {
  // Get applicable rules
  const applicableRules = getRulesForService(context.serviceSlug, context.serviceType)

  // Evaluate all rules
  const matchedRules: RuleMatch[] = []
  const hardStops: Rule[] = []
  const softFlags: Rule[] = []
  const patientMessages: string[] = []
  const adminMessages: string[] = []
  const riskReasons: string[] = []
  const riskFlags: string[] = []
  let riskScore = 0
  let maxRiskTierOverride: RiskTier | undefined

  for (const rule of applicableRules) {
    const match = evaluateRule(rule, context)
    
    if (match) {
      matchedRules.push(match)
      
      // Track risk score
      riskScore += rule.riskScoreAdd
      
      // Track risk tier override
      if (rule.riskTierOverride) {
        const tierPriority: Record<RiskTier, number> = {
          low: 0,
          moderate: 1,
          high: 2,
          critical: 3,
        }
        if (
          !maxRiskTierOverride ||
          tierPriority[rule.riskTierOverride] > tierPriority[maxRiskTierOverride]
        ) {
          maxRiskTierOverride = rule.riskTierOverride
        }
      }

      // Categorize rule
      if (rule.isHardStop) {
        hardStops.push(rule)
        riskFlags.push(`HARD_STOP: ${rule.id}`)
      }
      if (rule.isSoftFlag) {
        softFlags.push(rule)
        riskFlags.push(`SOFT_FLAG: ${rule.id}`)
      }

      // Collect messages
      if (rule.patientMessage && rule.action !== 'allow') {
        patientMessages.push(rule.patientMessage)
      }
      adminMessages.push(rule.adminMessage)
      riskReasons.push(rule.name)
    }
  }

  // Cap risk score at 100
  riskScore = Math.min(100, riskScore)

  // Determine final risk tier
  const calculatedTier = calculateRiskTier(riskScore)
  const riskTier = maxRiskTierOverride || calculatedTier

  // Determine triage result
  const result = determineTriageResult(matchedRules)

  // Determine blocking states
  const canSubmit = result !== 'decline'
  const canApprove = 
    result === 'allow' || 
    (result === 'request_more_info' && softFlags.length === matchedRules.filter(m => m.rule.action === 'request_more_info').length)
  const requiresLiveConsult = result === 'requires_live_consult'
  const liveConsultReason = requiresLiveConsult
    ? matchedRules.find((m) => m.rule.action === 'requires_live_consult')?.rule.adminMessage
    : undefined

  return {
    result,
    riskScore,
    riskTier,
    riskReasons,
    riskFlags,
    matchedRules,
    hardStops,
    softFlags,
    patientMessages,
    adminMessages,
    canSubmit,
    canApprove,
    requiresLiveConsult,
    liveConsultReason,
  }
}

/**
 * Quick check if intake can be submitted (for UI blocking)
 */
export function canSubmitIntake(context: RuleEvaluationContext): {
  canSubmit: boolean
  blockingMessages: string[]
} {
  const result = evaluateTriage(context)
  return {
    canSubmit: result.canSubmit,
    blockingMessages: result.patientMessages,
  }
}

/**
 * Quick check if intake can be approved by admin
 */
export function canApproveIntake(
  context: RuleEvaluationContext,
  adminCanApproveHighRisk: boolean
): {
  canApprove: boolean
  reasons: string[]
} {
  const result = evaluateTriage(context)

  if (result.requiresLiveConsult) {
    return {
      canApprove: false,
      reasons: ['Requires live consultation'],
    }
  }

  if (result.riskTier === 'high' && !adminCanApproveHighRisk) {
    return {
      canApprove: false,
      reasons: ['High-risk intake requires senior admin approval'],
    }
  }

  if (result.riskTier === 'critical') {
    return {
      canApprove: false,
      reasons: ['Critical risk intake cannot be approved through async channel'],
    }
  }

  return {
    canApprove: result.canApprove,
    reasons: result.adminMessages,
  }
}
