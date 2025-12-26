// ============================================
// DRAFT SYSTEM TYPES
// ============================================

export interface LocalDraft {
  id: string | null              // null until first server save
  sessionId: string
  serviceSlug: string
  serviceName: string
  currentStep: string
  currentGroupIndex: number
  data: Record<string, unknown>
  identityData: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  syncedAt: string | null        // Last successful server sync
  version: number                // For optimistic locking
  progress: number               // 0-100 completion percentage
}

export interface DraftSummary {
  id: string
  sessionId: string
  serviceSlug: string
  serviceName: string
  currentStep: string
  progress: number
  createdAt: string
  updatedAt: string
  lastAccessedAt: string
  isLocal: boolean               // true if only in localStorage
  isSynced: boolean              // true if synced with server
}

export type SyncStatus = 
  | 'idle' 
  | 'pending'      // Has unsaved changes
  | 'saving'       // Currently saving
  | 'saved'        // Successfully saved
  | 'error'        // Failed to save
  | 'conflict'     // Version mismatch

export interface DraftSyncState {
  status: SyncStatus
  lastSyncedAt: string | null
  lastError: string | null
  pendingChanges: boolean
  retryCount: number
  localVersion: number
  serverVersion: number
}

export interface DraftCreateInput {
  sessionId: string
  serviceSlug: string
  serviceName: string
  initialData?: Record<string, unknown>
}

export interface DraftUpdateInput {
  currentStep?: string
  currentGroupIndex?: number
  data?: Record<string, unknown>
  identityData?: Record<string, unknown> | null
  safetyOutcome?: string
  safetyRiskTier?: string
}

export interface DraftClaimResult {
  success: boolean
  merged: boolean
  existingDraftId?: string
  error?: string
}

// Service name mapping
export const SERVICE_NAMES: Record<string, string> = {
  'medical-certificate': 'Medical Certificate',
  'prescription': 'Prescription',
  'weight-management': 'Weight Management',
}

// Step labels for progress display (simplified 3-step model)
export const STEP_LABELS: Record<string, string> = {
  'service': 'Service Selection',
  'questions': 'Health Questions',
  'details': 'Your Details',
  'checkout': 'Payment',
}

// Step order for progress calculation (simplified)
export const STEP_ORDER = ['service', 'questions', 'details', 'checkout']

/**
 * Calculate progress percentage based on current step
 */
export function calculateProgress(currentStep: string): number {
  const index = STEP_ORDER.indexOf(currentStep)
  if (index === -1) return 0
  return Math.round((index / (STEP_ORDER.length - 1)) * 100)
}

/**
 * Get friendly service name
 */
export function getServiceName(slug: string): string {
  return SERVICE_NAMES[slug] || slug
}

/**
 * Get friendly step label
 */
export function getStepLabel(step: string): string {
  return STEP_LABELS[step] || step
}
