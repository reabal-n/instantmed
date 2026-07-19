/**
 * Service-Scoped Draft Storage
 * 
 * Manages per-service draft persistence with isolation guarantees.
 * Each service type has its own storage key to prevent cross-service interference.
 */

import { normalizeFlowInstanceId } from '@/lib/analytics/flow-instance'

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
  flowInstanceId?: string
  currentStepId: UnifiedStepId
  furthestVisitedStepId?: UnifiedStepId | null
  stepsNeedingRevalidation?: UnifiedStepId[]
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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

    draft.answers = isPlainRecord(draft.answers) ? draft.answers : {}
    draft.flowInstanceId = normalizeFlowInstanceId(draft.flowInstanceId) ?? undefined
    
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
 *
 * Also fire-and-forget mirrors the draft to the server (debounced) so the
 * intake can be resumed on another device and so the recovery cron can
 * find stale drafts by email. Server failures are silent - localStorage
 * remains the source of truth for the active session.
 */
export function saveDraft(service: CanonicalServiceType, data: Omit<DraftData, 'serviceType' | 'lastSavedAt'>): void {
  if (!isStorageAvailable()) return

  try {
    const key = getStorageKey(service)
    const draft: DraftData = {
      ...data,
      answers: isPlainRecord(data.answers) ? data.answers : {},
      serviceType: service,
      lastSavedAt: new Date().toISOString(),
    }
    localStorage.setItem(key, JSON.stringify(draft))
  } catch {
    // Silently fail if localStorage unavailable
  }

  // Fire-and-forget server mirror. Lazy-loaded so server-only contexts that
  // never reach this branch don't pull the fetch wrapper into their bundles.
  if (typeof window !== 'undefined') {
    void import('./server-draft').then(({ saveServerDraftDebounced }) => {
      saveServerDraftDebounced({
        serviceType: service,
        flowInstanceId: normalizeFlowInstanceId(data.flowInstanceId) ?? undefined,
        currentStepId: data.currentStepId,
        answers: isPlainRecord(data.answers) ? data.answers : {},
        identity: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          dob: data.dob,
        },
      })
    }).catch(() => {
      // Module load failure - localStorage save still succeeded.
    })
  }
}

/**
 * Clear draft for a specific service type.
 * Only clears the draft for the specified service. Also deletes the server
 * mirror (fire-and-forget) so the recovery cron does not email a user whose
 * intake has actually been completed or explicitly abandoned.
 */
export function clearDraft(service: CanonicalServiceType): void {
  if (!isStorageAvailable()) return

  try {
    const key = getStorageKey(service)
    localStorage.removeItem(key)
  } catch {
    // Silently fail
  }

  if (typeof window !== 'undefined') {
    void import('./server-draft').then(({ deleteServerDraft }) => {
      void deleteServerDraft(service)
    }).catch(() => {
      // ignore - row will eventually expire server-side anyway
    })
  }
}

/**
 * Clear the local draft for a service AFTER the server has confirmed payment.
 *
 * Without this, a paid intake's draft survived in localStorage parked at the
 * pay step: returning to /request restored straight to Pay, and past the
 * 10-minute checkout idempotency bucket a "did it go through?" second payment
 * created a second intake + second charge for the same answers.
 *
 * Clears the service-scoped key AND the legacy envelope key — but the legacy
 * key only when it actually holds THIS service's draft, so paying for a
 * med-cert never wipes an unrelated in-progress consult draft.
 */
export function clearDraftAfterPayment(serviceCategory: string | null | undefined): void {
  // Accept BOTH vocabularies: client service types ('med-cert') and the DB
  // `intakes.category` values ('medical_certificate') the payment surfaces
  // actually have in hand.
  const DB_CATEGORY_TO_CANONICAL: Record<string, CanonicalServiceType> = {
    medical_certificate: 'med-cert',
    med_certs: 'med-cert',
    prescription: 'prescription',
    repeat_rx: 'prescription',
    consult: 'consult',
  }
  const canonical =
    DB_CATEGORY_TO_CANONICAL[(serviceCategory ?? '').toLowerCase()] ??
    canonicalizeServiceType(serviceCategory ?? null)
  if (!canonical) return

  clearDraft(canonical)

  if (!isStorageAvailable()) return
  try {
    const legacyRaw = localStorage.getItem(LEGACY_KEY)
    if (!legacyRaw) return
    const legacy = JSON.parse(legacyRaw) as { state?: { serviceType?: string | null } }
    if (canonicalizeServiceType(legacy?.state?.serviceType ?? null) === canonical) {
      localStorage.removeItem(LEGACY_KEY)
    }
  } catch {
    // Silently fail — the 24h expiry remains the backstop.
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
      flowInstanceId: normalizeFlowInstanceId(legacyState.flowInstanceId) ?? undefined,
      currentStepId: legacyState.currentStepId || 'review',
      furthestVisitedStepId: legacyState.furthestVisitedStepId ?? legacyState.currentStepId ?? 'review',
      stepsNeedingRevalidation: Array.isArray(legacyState.stepsNeedingRevalidation)
        ? legacyState.stepsNeedingRevalidation
        : [],
      answers: isPlainRecord(legacyState.answers) ? legacyState.answers : {},
      lastSavedAt: legacyState.lastSavedAt,
      firstName: legacyState.firstName,
      lastName: legacyState.lastName,
      email: legacyState.email,
      phone: legacyState.phone,
      dob: legacyState.dob,
      safetyConfirmed: legacyState.safetyConfirmed,
      safetyTimestamp: legacyState.safetyTimestamp,
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
