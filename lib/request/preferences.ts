/**
 * User Preferences Storage
 * 
 * Stores and retrieves user preferences for smart defaults:
 * - Last used service type
 * - Common symptom selections
 * - Preferred certificate type
 * - Previous medication selections
 */

const STORAGE_KEY = 'instantmed-preferences'
const MAX_RECENT_ITEMS = 5

export interface UserPreferences {
  // Service preferences
  lastServiceType?: string
  
  // Certificate preferences
  preferredCertType?: 'work' | 'study' | 'carer'
  commonDurations?: string[]
  
  // Symptom preferences
  recentSymptoms?: string[]
  
  // Medication preferences
  recentMedications?: Array<{
    name: string
    strength?: string
    form?: string
    pbsCode?: string
  }>
  
  // Identity (for quick autofill)
  savedIdentity?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    dob?: string
    addressLine1?: string
    suburb?: string
    state?: string
    postcode?: string
  }
  
  // Consult preferences
  recentConsultCategories?: string[]
  
  // Timestamps
  lastUpdated?: string
}

/**
 * Get stored preferences
 */
export function getPreferences(): UserPreferences {
  if (typeof window === 'undefined') return {}
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return {}
    return JSON.parse(stored) as UserPreferences
  } catch {
    return {}
  }
}

/**
 * Save preferences (merges with existing)
 */
export function savePreferences(updates: Partial<UserPreferences>): void {
  if (typeof window === 'undefined') return
  
  try {
    const existing = getPreferences()
    const merged: UserPreferences = {
      ...existing,
      ...updates,
      lastUpdated: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Add a recent symptom (keeps last N)
 */
export function addRecentSymptom(symptom: string): void {
  const prefs = getPreferences()
  const recent = prefs.recentSymptoms || []
  
  // Remove if already exists, then add to front
  const filtered = recent.filter(s => s !== symptom)
  const updated = [symptom, ...filtered].slice(0, MAX_RECENT_ITEMS)
  
  savePreferences({ recentSymptoms: updated })
}

/**
 * Add a recent medication (keeps last N)
 */
export function addRecentMedication(medication: {
  name: string
  strength?: string
  form?: string
  pbsCode?: string
}): void {
  const prefs = getPreferences()
  const recent = prefs.recentMedications || []
  
  // Remove if already exists (by name), then add to front
  const filtered = recent.filter(m => m.name !== medication.name)
  const updated = [medication, ...filtered].slice(0, MAX_RECENT_ITEMS)
  
  savePreferences({ recentMedications: updated })
}

/**
 * Save identity for autofill
 */
export function saveIdentity(identity: NonNullable<UserPreferences['savedIdentity']>): void {
  savePreferences({ savedIdentity: identity })
}

/**
 * Get saved identity
 */
export function getSavedIdentity(): UserPreferences['savedIdentity'] {
  return getPreferences().savedIdentity
}

/**
 * Clear all preferences
 */
export function clearPreferences(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Get smart defaults for a step based on preferences and context
 */
export function getSmartDefaults(stepId: string, context?: {
  serviceType?: string
  isReturningUser?: boolean
}): Record<string, unknown> {
  const prefs = getPreferences()
  const defaults: Record<string, unknown> = {}
  
  switch (stepId) {
    case 'certificate':
      // Default to last used cert type
      if (prefs.preferredCertType) {
        defaults.certType = prefs.preferredCertType
      }
      // Default duration for work certs is often 1 day
      if (context?.serviceType === 'med-cert') {
        defaults.duration = '1'
      }
      break
      
    case 'symptoms':
      // Suggest recent symptoms
      if (prefs.recentSymptoms && prefs.recentSymptoms.length > 0) {
        defaults.suggestedSymptoms = prefs.recentSymptoms
      }
      break
      
    case 'medication':
      // Suggest recent medications
      if (prefs.recentMedications && prefs.recentMedications.length > 0) {
        defaults.recentMedications = prefs.recentMedications
      }
      break
      
    case 'consult-reason':
      // Suggest recent categories
      if (prefs.recentConsultCategories && prefs.recentConsultCategories.length > 0) {
        defaults.suggestedCategories = prefs.recentConsultCategories
      }
      break
      
    case 'details':
      // Auto-fill from saved identity
      if (prefs.savedIdentity) {
        defaults.savedIdentity = prefs.savedIdentity
      }
      break
  }
  
  return defaults
}

/**
 * Update preferences based on completed step
 */
export function recordStepCompletion(stepId: string, answers: Record<string, unknown>): void {
  switch (stepId) {
    case 'certificate':
      if (answers.certType) {
        savePreferences({ 
          preferredCertType: answers.certType as 'work' | 'study' | 'carer' 
        })
      }
      break
      
    case 'symptoms':
      const symptoms = answers.symptoms as string[] | undefined
      if (symptoms) {
        const prefs = getPreferences()
        const existing = prefs.recentSymptoms || []
        const merged = [...new Set([...symptoms, ...existing])].slice(0, MAX_RECENT_ITEMS * 2)
        savePreferences({ recentSymptoms: merged })
      }
      break
      
    case 'medication':
      if (answers.medicationName) {
        addRecentMedication({
          name: answers.medicationName as string,
          strength: answers.medicationStrength as string | undefined,
          form: answers.medicationForm as string | undefined,
          pbsCode: answers.pbsCode as string | undefined,
        })
      }
      break
      
    case 'consult-reason':
      if (answers.consultCategory) {
        const prefs = getPreferences()
        const recent = prefs.recentConsultCategories || []
        const category = answers.consultCategory as string
        const updated = [category, ...recent.filter(c => c !== category)].slice(0, MAX_RECENT_ITEMS)
        savePreferences({ recentConsultCategories: updated })
      }
      break
  }
}
