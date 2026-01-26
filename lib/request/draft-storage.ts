/**
 * Service-Scoped Draft Storage
 * 
 * Manages per-service draft persistence with isolation guarantees.
 * Each service type has its own storage key to prevent cross-service interference.
 */

import type { UnifiedServiceType, UnifiedStepId } from './step-registry'

// Canonical service types (all aliases resolve to these)
export type CanonicalServiceType = 'med-cert' | 'prescription' | 'consult'

// Storage key prefix
const DRAFT_KEY_PREFIX = 'instantmed-draft-'
const LEGACY_KEY = 'instantmed-request-draft'
const DRAFT_EXPIRY_HOURS = 24

/**
 * Draft data structure
 */
export interface DraftData {
  serviceType: CanonicalServiceType
  currentStepId: UnifiedStepId
  answers: Record<string, unknown>
  lastSavedAt: string
  // Identity fields
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  dob?: string
  // Safety
  safetyConfirmed?: boolean
  safetyTimestamp?: string | null
  // Chat linkage
  chatSessionId?: string | null
}

/**
 * Normalize any service type or alias to its canonical form.
 * 
 * This ensures consistent storage keys regardless of how the user arrived.
 */
export function canonicalizeServiceType(
  service: UnifiedServiceType | string | null | undefined
): CanonicalServiceType | null {
  if (!service) return null
  
  const normalized = service.toLowerCase()
  
  // Med-cert aliases
  if (['med-cert', 'medcert', 'medical-certificate'].includes(normalized)) {
    return 'med-cert'
  }
  
  // Prescription aliases (all map to single canonical type)
  if (['prescription', 'repeat-script', 'repeat-rx', 'repeat-prescription'].includes(normalized)) {
    return 'prescription'
  }
  
  // Consult aliases
  if (['consult', 'consultation', 'general-consult'].includes(normalized)) {
    return 'consult'
  }
  
  return null
}

/**
 * Get the storage key for a service type
 */
function getStorageKey(service: CanonicalServiceType): string {
  return `${DRAFT_KEY_PREFIX}${service}`
}

/**
 * Check if a draft is expired
 */
function isExpired(lastSavedAt: string): boolean {
  const savedTime = new Date(lastSavedAt).getTime()
  const now = Date.now()
  const hoursSinceSave = (now - savedTime) / (1000 * 60 * 60)
  return hoursSinceSave >= DRAFT_EXPIRY_HOURS
}

/**
 * Check if localStorage is available
 */
function isStorageAvailable(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null
  } catch {
    return false
  }
}

/**
 * Get draft for a specific service type.
 * Returns null if no draft exists or if expired.
 */
export function getDraft(service: CanonicalServiceType): DraftData | null {
  if (!isStorageAvailable()) return null
  
  try {
    const key = getStorageKey(service)
    const stored = localStorage.getItem(key)
    if (!stored) return null
    
    const draft = JSON.parse(stored) as DraftData
    
    // Validate structure
    if (!draft.serviceType || !draft.lastSavedAt) {
      return null
    }
    
    // Check expiry
    if (isExpired(draft.lastSavedAt)) {
      // Lazy cleanup - remove expired draft
      localStorage.removeItem(key)
      return null
    }
    
    return draft
  } catch {
    return null
  }
}

/**
 * Save draft for a specific service type.
 * Only modifies the draft for the specified service.
 */
export function saveDraft(service: CanonicalServiceType, data: Omit<DraftData, 'serviceType' | 'lastSavedAt'>): void {
  if (!isStorageAvailable()) return
  
  try {
    const key = getStorageKey(service)
    const draft: DraftData = {
      ...data,
      serviceType: service,
      lastSavedAt: new Date().toISOString(),
    }
    localStorage.setItem(key, JSON.stringify(draft))
  } catch {
    // Silently fail if localStorage unavailable
  }
}

/**
 * Clear draft for a specific service type.
 * Only clears the draft for the specified service.
 */
export function clearDraft(service: CanonicalServiceType): void {
  if (!isStorageAvailable()) return
  
  try {
    const key = getStorageKey(service)
    localStorage.removeItem(key)
  } catch {
    // Silently fail
  }
}

/**
 * Get all valid (non-expired) drafts across all services.
 * Returns array sorted by lastSavedAt descending (most recent first).
 */
export function getAllDrafts(): DraftData[] {
  if (!isStorageAvailable()) return []
  
  const services: CanonicalServiceType[] = ['med-cert', 'prescription', 'consult']
  const drafts: DraftData[] = []
  
  for (const service of services) {
    const draft = getDraft(service)
    if (draft) {
      drafts.push(draft)
    }
  }
  
  // Sort by most recent first
  return drafts.sort((a, b) => 
    new Date(b.lastSavedAt).getTime() - new Date(a.lastSavedAt).getTime()
  )
}

/**
 * Migrate legacy draft to service-scoped storage.
 * 
 * Strategy: copy → validate → write → delete legacy
 * Only deletes legacy key after confirmed successful write.
 */
export function migrateLegacyDraft(): DraftData | null {
  if (!isStorageAvailable()) return null
  
  try {
    const legacyStored = localStorage.getItem(LEGACY_KEY)
    if (!legacyStored) return null
    
    // Parse legacy format (Zustand persist format)
    const parsed = JSON.parse(legacyStored) as { state?: Partial<DraftData> }
    const legacyState = parsed.state
    
    if (!legacyState?.serviceType || !legacyState?.lastSavedAt) {
      // Invalid legacy draft - clear it
      localStorage.removeItem(LEGACY_KEY)
      return null
    }
    
    // Check expiry
    if (isExpired(legacyState.lastSavedAt)) {
      localStorage.removeItem(LEGACY_KEY)
      return null
    }
    
    // Canonicalize the service type
    const canonical = canonicalizeServiceType(legacyState.serviceType)
    if (!canonical) {
      localStorage.removeItem(LEGACY_KEY)
      return null
    }
    
    // Build draft data
    const draft: DraftData = {
      serviceType: canonical,
      currentStepId: legacyState.currentStepId || 'safety',
      answers: legacyState.answers || {},
      lastSavedAt: legacyState.lastSavedAt,
      firstName: legacyState.firstName,
      lastName: legacyState.lastName,
      email: legacyState.email,
      phone: legacyState.phone,
      dob: legacyState.dob,
      safetyConfirmed: legacyState.safetyConfirmed,
      safetyTimestamp: legacyState.safetyTimestamp,
      chatSessionId: legacyState.chatSessionId,
    }
    
    // Write to new key
    const newKey = getStorageKey(canonical)
    localStorage.setItem(newKey, JSON.stringify(draft))
    
    // Verify write succeeded
    const verification = localStorage.getItem(newKey)
    if (!verification) {
      // Write failed - do not delete legacy
      return null
    }
    
    // Confirmed successful - delete legacy
    localStorage.removeItem(LEGACY_KEY)
    
    return draft
  } catch {
    // On any error, leave legacy intact
    return null
  }
}

/**
 * Check if legacy draft exists (for dual-write period)
 */
export function hasLegacyDraft(): boolean {
  if (!isStorageAvailable()) return false
  
  try {
    return localStorage.getItem(LEGACY_KEY) !== null
  } catch {
    return false
  }
}
