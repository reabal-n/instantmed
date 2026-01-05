/**
 * Form Auto-Save Hook
 * 
 * Automatically saves form data to localStorage/sessionStorage
 * with debouncing and conflict resolution
 * 
 * Usage:
 * const { saveForm, loadForm, clearForm } = useFormAutosave('medical-cert-form', {
 *   debounceMs: 2000,
 *   storage: 'session'
 * })
 */

import { useEffect, useCallback, useRef } from 'react'
// Client-side hook - use console for logging (wrapped in dev check)

interface AutosaveOptions {
  debounceMs?: number
  storage?: 'local' | 'session'
  onSave?: (data: any) => void
  onLoad?: (data: any) => void
  onError?: (error: Error) => void
}

export function useFormAutosave<T extends Record<string, any>>(
  formId: string,
  options: AutosaveOptions = {}
) {
  const {
    debounceMs = 2000,
    storage = 'session',
    onSave,
    onLoad,
    onError
  } = options

  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const storageKey = `form_autosave_${formId}`
  const timestampKey = `${storageKey}_timestamp`

  // Get storage interface
  const getStorage = useCallback(() => {
    if (typeof window === 'undefined') return null
    return storage === 'local' ? window.localStorage : window.sessionStorage
  }, [storage])

  /**
   * Save form data with debouncing
   */
  const saveForm = useCallback((data: T) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      try {
        const storageInterface = getStorage()
        if (!storageInterface) return

        const dataToSave = {
          ...data,
          _autosaved: true,
          _timestamp: Date.now()
        }

        storageInterface.setItem(storageKey, JSON.stringify(dataToSave))
        storageInterface.setItem(timestampKey, Date.now().toString())

        onSave?.(data)
        
        // Silent save - no toast notification by default
        // Uncomment if you want visible feedback:
        // toast.success('Draft saved', { description: 'Your progress is saved' })
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Form autosave error', error)
        }
        onError?.(error as Error)
      }
    }, debounceMs)
  }, [formId, debounceMs, storageKey, timestampKey, getStorage, onSave, onError])

  /**
   * Clear saved form data
   */
  const clearForm = useCallback(() => {
    try {
      const storageInterface = getStorage()
      if (!storageInterface) return

      storageInterface.removeItem(storageKey)
      storageInterface.removeItem(timestampKey)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Form clear error', error)
      }
      onError?.(error as Error)
    }
  }, [storageKey, timestampKey, getStorage, onError])

  /**
   * Load saved form data
   */
  const loadForm = useCallback((): T | null => {
    try {
      const storageInterface = getStorage()
      if (!storageInterface) return null

      const savedData = storageInterface.getItem(storageKey)
      if (!savedData) return null

      const parsed = JSON.parse(savedData)
      
      // Check if data is too old (older than 7 days)
      const savedTimestamp = parsed._timestamp || 0
      const daysSinceSave = (Date.now() - savedTimestamp) / (1000 * 60 * 60 * 24)
      
      if (daysSinceSave > 7) {
        // Clear old data
        clearForm()
        return null
      }

      // Remove meta fields
      delete parsed._autosaved
      delete parsed._timestamp

      onLoad?.(parsed)
      return parsed as T
    } catch (error) {
      logger.error('Form load error', { error })
      onError?.(error as Error)
      return null
    }
  }, [storageKey, getStorage, onLoad, onError, clearForm])

  /**
   * Check if autosaved data exists
   */
  const hasAutosavedData = useCallback((): boolean => {
    try {
      const storageInterface = getStorage()
      if (!storageInterface) return false

      const savedData = storageInterface.getItem(storageKey)
      return savedData !== null
    } catch {
      return false
    }
  }, [storageKey, getStorage])

  /**
   * Get timestamp of last save
   */
  const getLastSaveTime = useCallback((): Date | null => {
    try {
      const storageInterface = getStorage()
      if (!storageInterface) return null

      const timestamp = storageInterface.getItem(timestampKey)
      if (!timestamp) return null

      return new Date(parseInt(timestamp))
    } catch {
      return null
    }
  }, [timestampKey, getStorage])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    saveForm,
    loadForm,
    clearForm,
    hasAutosavedData,
    getLastSaveTime
  }
}

/**
 * Hook to prompt user about unsaved changes
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])
}

/**
 * Combined hook for form autosave with React Hook Form
 */
export function useFormAutosaveWithRHF<T extends Record<string, any>>(
  formId: string,
  watch: () => T,
  options: AutosaveOptions = {}
) {
  const { saveForm, loadForm, clearForm, hasAutosavedData } = useFormAutosave<T>(formId, options)

  // Watch form changes and auto-save
  useEffect(() => {
    const subscription = setInterval(() => {
      const formData = watch()
      saveForm(formData)
    }, options.debounceMs || 2000)

    return () => clearInterval(subscription)
  }, [watch, saveForm, options.debounceMs])

  return {
    loadForm,
    clearForm,
    hasAutosavedData
  }
}
