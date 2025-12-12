// ============================================
// CONSENT MODULE TYPES
// ============================================

import type { ConsentType } from '@/types/database'

export interface ConsentDefinition {
  type: ConsentType
  title: string
  summary: string
  fullText: string
  version: string
  required: boolean
  serviceTypes?: string[] // If empty, applies to all services
}

export interface ConsentCheckboxState {
  type: ConsentType
  checked: boolean
  timestamp?: string
}

export interface ConsentSubmission {
  type: ConsentType
  version: string
  textHash: string
  grantedAt: string
  clientIp?: string
  clientUserAgent?: string
}

export interface ConsentValidationResult {
  isValid: boolean
  missingConsents: ConsentType[]
  errors: string[]
}

export interface ConsentBundleProps {
  serviceType: string
  intakeId: string
  onComplete: (consents: ConsentSubmission[]) => void
  onError: (error: string) => void
}
