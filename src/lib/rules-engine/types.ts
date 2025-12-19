// ============================================
// RULES ENGINE TYPES
// ============================================

import type { RiskTier, TriageResult } from '@/types/database'

export interface RuleCondition {
  field: string // Path to field in answers (e.g., 'bmi', 'medical_conditions', 'answers.symptom_severity')
  operator: 
    | 'equals'
    | 'not_equals'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'between'
    | 'contains'
    | 'not_contains'
    | 'in'
    | 'not_in'
    | 'exists'
    | 'not_exists'
    | 'regex'
  value: unknown
  valueMax?: unknown // For 'between' operator
}

export interface Rule {
  id: string
  name: string
  description?: string
  
  // Rule targeting
  serviceTypes?: string[] // Apply to specific services
  serviceSlug?: string // Apply to specific service
  
  // Conditions (all must match for rule to trigger)
  conditions: RuleCondition[]
  
  // Rule type
  isHardStop: boolean // If true, blocks submission entirely
  isSoftFlag: boolean // If true, just adds to risk factors
  
  // Actions when rule triggers
  action: TriageResult
  
  // Risk contribution
  riskScoreAdd: number // Points to add to risk score (0-100)
  riskTierOverride?: RiskTier // Force a specific risk tier
  
  // Messaging
  patientMessage: string // Shown to patient if action is not 'allow'
  adminMessage: string // Shown in admin dashboard
  
  // Categorization
  category: 'medical' | 'regulatory' | 'operational' | 'safety'
  priority: number // Higher = evaluated first
  
  // Active status
  isActive: boolean
}

export interface RuleEvaluationContext {
  serviceSlug: string
  serviceType: string
  answers: Record<string, unknown>
  eligibilityAnswers: Record<string, unknown>
  patientProfile?: {
    dateOfBirth?: string
    state?: string
  }
  intakeData?: {
    bmi?: number
    absenceDays?: number
  }
}

export interface RuleMatch {
  rule: Rule
  matchedConditions: string[]
}

export interface TriageEvaluationResult {
  // Final decision
  result: TriageResult
  
  // Risk assessment
  riskScore: number
  riskTier: RiskTier
  riskReasons: string[]
  riskFlags: string[]
  
  // Matched rules
  matchedRules: RuleMatch[]
  hardStops: Rule[]
  softFlags: Rule[]
  
  // Patient-facing
  patientMessages: string[]
  
  // Admin-facing
  adminMessages: string[]
  
  // Blocking
  canSubmit: boolean
  canApprove: boolean
  requiresLiveConsult: boolean
  liveConsultReason?: string
}
