// ============================================
// SAFETY & ELIGIBILITY ENGINE TYPES
// ============================================

/**
 * Safety check outcome determines flow routing:
 * - ALLOW: Continue to next step (payment)
 * - REQUEST_MORE_INFO: Show inline task list, stay on current step
 * - REQUIRES_CALL: Block async, show call booking screen
 * - DECLINE: Not eligible, show exit screen with alternatives
 */
export type SafetyOutcome = 'ALLOW' | 'REQUEST_MORE_INFO' | 'REQUIRES_CALL' | 'DECLINE'

/**
 * Risk tier for logging and doctor prioritization
 */
export type RiskTier = 'low' | 'medium' | 'high' | 'critical'

/**
 * Rule evaluation operators
 */
export type RuleOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'includes_any'
  | 'includes_all'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is_empty'
  | 'is_not_empty'
  | 'matches_pattern'
  | 'age_under'
  | 'age_over'
  | 'bmi_under'
  | 'bmi_over'

/**
 * Single condition to evaluate
 */
export interface RuleCondition {
  fieldId: string
  operator: RuleOperator
  value?: unknown
  // For derived values (e.g., calculate BMI from weight/height)
  derivedFrom?: {
    type: 'bmi' | 'age' | 'duration_days'
    fields: string[]
  }
}

/**
 * A safety rule with conditions and outcome
 */
export interface SafetyRule {
  id: string
  name: string
  description: string
  
  // When all conditions match, this outcome is triggered
  conditions: RuleCondition[]
  conditionLogic?: 'AND' | 'OR'
  
  // Outcome when rule triggers
  outcome: SafetyOutcome
  riskTier: RiskTier
  
  // For REQUEST_MORE_INFO - what additional info is needed
  additionalInfoRequired?: AdditionalInfoItem[]
  
  // Human-friendly messages
  patientMessage: string
  doctorNote?: string
  
  // Priority (higher = evaluated first)
  priority: number
  
  // Service-specific
  services?: string[]
}

/**
 * Additional information item for REQUEST_MORE_INFO outcome
 */
export interface AdditionalInfoItem {
  id: string
  label: string
  description?: string
  type: 'text' | 'textarea' | 'file' | 'photo' | 'select'
  options?: Array<{ value: string; label: string }>
  required: boolean
}

/**
 * Result of safety evaluation
 */
export interface SafetyEvaluationResult {
  outcome: SafetyOutcome
  riskTier: RiskTier
  
  // Rules that triggered
  triggeredRules: TriggeredRule[]
  
  // For REQUEST_MORE_INFO
  additionalInfoRequired: AdditionalInfoItem[]
  
  // Messages for UI
  patientTitle: string
  patientMessage: string
  
  // For logging
  evaluatedAt: string
  evaluationDurationMs: number
  answersSnapshot: Record<string, unknown>
}

/**
 * A rule that was triggered during evaluation
 */
export interface TriggeredRule {
  ruleId: string
  ruleName: string
  outcome: SafetyOutcome
  riskTier: RiskTier
  reason: string
  fieldValues: Record<string, unknown>
}

/**
 * Safety rules configuration for a service
 */
export interface SafetyRulesConfig {
  serviceSlug: string
  version: string
  rules: SafetyRule[]
  // Default outcome if no rules trigger
  defaultOutcome: SafetyOutcome
  defaultRiskTier: RiskTier
}

/**
 * Audit log entry for safety evaluation
 */
export interface SafetyAuditLog {
  id: string
  sessionId: string
  draftId: string | null
  serviceSlug: string
  outcome: SafetyOutcome
  riskTier: RiskTier
  triggeredRuleIds: string[]
  answersSnapshot: Record<string, unknown>
  additionalInfoProvided: Record<string, unknown> | null
  evaluatedAt: string
  ipAddress?: string
  userAgent?: string
}
