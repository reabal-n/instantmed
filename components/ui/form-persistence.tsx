'use client'

import { useEffect, useCallback, useRef } from 'react'
import { logger } from '@/lib/logger'

const DEBOUNCE_MS = 500

/**
 * Hook to persist form data to localStorage
 */
export function useFormPersistence<T extends Record<string, unknown>>(
  key: string,
  data: T,
  setData: (data: T) => void
) {
  const initialized = useRef(false)

  // Load on mount
  useEffect(() => {
    if (initialized.current) return

    try {
      const saved = localStorage.getItem(`form_${key}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Check if data is less than 24 hours old
        if (parsed._timestamp && Date.now() - parsed._timestamp < 24 * 60 * 60 * 1000) {
          const { _timestamp, ...formData } = parsed
          setData(formData as T)
        } else {
          localStorage.removeItem(`form_${key}`)
        }
      }
    } catch (e) {
      logger.warn('Failed to load form data:', { error: e })
    }

    initialized.current = true
  }, [key, setData])

  // Save on change (debounced)
  useEffect(() => {
    if (!initialized.current) return

    const timer = setTimeout(() => {
      try {
        const toSave = { ...data, _timestamp: Date.now() }
        localStorage.setItem(`form_${key}`, JSON.stringify(toSave))
      } catch (e) {
        logger.warn('Failed to save form data:', { error: e })
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [key, data])

  // Clear saved data
  const clearSaved = useCallback(() => {
    localStorage.removeItem(`form_${key}`)
  }, [key])

  return { clearSaved }
}

/**
 * Hook to show "unsaved changes" warning
 */
export function useUnsavedChanges(hasChanges: boolean) {
  useEffect(() => {
    if (!hasChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])
}

/**
 * Auto-save indicator component
 */
export function AutoSaveIndicator({
  status,
}: {
  status: 'idle' | 'saving' | 'saved' | 'error'
}) {
  if (status === 'idle') return null

  return (
    <div className="text-xs text-muted-foreground flex items-center gap-1">
      {status === 'saving' && (
        <>
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Saving...
        </>
      )}
      {status === 'saved' && (
        <>
          <div className="w-2 h-2 rounded-full bg-green-500" />
          Saved
        </>
      )}
      {status === 'error' && (
        <>
          <div className="w-2 h-2 rounded-full bg-red-500" />
          Failed to save
        </>
      )}
    </div>
  )
}
