"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface FormPersistenceOptions<T> {
  /** Unique key for localStorage */
  key: string
  /** Initial form values */
  initialValues: T
  /** Debounce delay in ms (default: 1000) */
  debounceMs?: number
  /** Max age of saved data in ms (default: 24 hours) */
  maxAge?: number
  /** Whether persistence is enabled */
  enabled?: boolean
}

interface SavedFormData<T> {
  data: T
  savedAt: number
  version: number
}

const CURRENT_VERSION = 1

/**
 * Hook for persisting form data to localStorage
 * 
 * Provides offline-first form persistence with:
 * - Automatic save on change (debounced)
 * - Restore from previous session
 * - Expiration handling
 * - Version migration support
 * 
 * Critical for preventing data loss when:
 * - User's session expires
 * - Browser crashes or closes
 * - Network connection drops
 * - User accidentally navigates away
 */
export function useFormPersistence<T extends Record<string, unknown>>({
  key,
  initialValues,
  debounceMs = 1000,
  maxAge = 24 * 60 * 60 * 1000, // 24 hours
  enabled = true,
}: FormPersistenceOptions<T>) {
  const [values, setValues] = useState<T>(initialValues)
  const [hasSavedData, setHasSavedData] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isRestored, setIsRestored] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const storageKey = `form_draft_${key}`

  // Check for existing saved data on mount
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed: SavedFormData<T> = JSON.parse(saved)
        const age = Date.now() - parsed.savedAt

        // Check if data is still valid
        if (age < maxAge && parsed.version === CURRENT_VERSION) {
          setHasSavedData(true)
          setLastSaved(new Date(parsed.savedAt))
        } else {
          // Data expired, remove it
          localStorage.removeItem(storageKey)
        }
      }
    } catch {
      // Corrupted data, remove it
      localStorage.removeItem(storageKey)
    }
  }, [storageKey, maxAge, enabled])

  // Save to localStorage (debounced)
  const saveToStorage = useCallback((data: T) => {
    if (!enabled || typeof window === "undefined") return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const saveData: SavedFormData<T> = {
          data,
          savedAt: Date.now(),
          version: CURRENT_VERSION,
        }
        localStorage.setItem(storageKey, JSON.stringify(saveData))
        setLastSaved(new Date())
        setHasSavedData(true)
      } catch {
        // localStorage full or unavailable - silent fail
        // Could add error callback here if needed
      }
    }, debounceMs)
  }, [storageKey, debounceMs, enabled])

  // Update values and trigger save
  const updateValues = useCallback((newValues: T | ((prev: T) => T)) => {
    setValues(prev => {
      const updated = typeof newValues === "function" 
        ? (newValues as (prev: T) => T)(prev) 
        : newValues
      saveToStorage(updated)
      return updated
    })
  }, [saveToStorage])

  // Restore saved data
  const restore = useCallback(() => {
    if (!enabled || typeof window === "undefined") return false

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed: SavedFormData<T> = JSON.parse(saved)
        setValues(parsed.data)
        setIsRestored(true)
        return true
      }
    } catch {
      // Corrupted data
    }
    return false
  }, [storageKey, enabled])

  // Clear saved data (after successful submission)
  const clear = useCallback(() => {
    if (typeof window === "undefined") return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    try {
      localStorage.removeItem(storageKey)
      setHasSavedData(false)
      setLastSaved(null)
      setIsRestored(false)
    } catch {
      // Silent fail
    }
  }, [storageKey])

  // Reset to initial values
  const reset = useCallback(() => {
    setValues(initialValues)
    clear()
  }, [initialValues, clear])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    /** Current form values */
    values,
    /** Update form values (triggers autosave) */
    setValues: updateValues,
    /** Whether saved data exists from previous session */
    hasSavedData,
    /** When data was last saved */
    lastSaved,
    /** Whether data was restored from storage */
    isRestored,
    /** Restore saved data to form */
    restore,
    /** Clear saved data (call after successful submit) */
    clear,
    /** Reset form to initial values and clear storage */
    reset,
  }
}

/**
 * Helper to get saved form data without the hook
 * Useful for checking if draft exists before mounting form
 */
export function getSavedFormData<T>(key: string): T | null {
  if (typeof window === "undefined") return null

  try {
    const saved = localStorage.getItem(`form_draft_${key}`)
    if (saved) {
      const parsed: SavedFormData<T> = JSON.parse(saved)
      const maxAge = 24 * 60 * 60 * 1000
      const age = Date.now() - parsed.savedAt

      if (age < maxAge && parsed.version === CURRENT_VERSION) {
        return parsed.data
      }
    }
  } catch {
    // Corrupted data
  }
  return null
}

/**
 * Helper to clear all form drafts
 * Useful for logout or account switch
 */
export function clearAllFormDrafts() {
  if (typeof window === "undefined") return

  const keysToRemove: string[] = []
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith("form_draft_")) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key))
}
