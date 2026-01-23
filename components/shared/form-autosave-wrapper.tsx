"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { AutosaveIndicator, RestoreDraftBanner, useAutosaveStatus } from "@/components/ui/autosave-indicator"
import { cn } from "@/lib/utils"

interface FormAutosaveWrapperProps<T> {
  /** Unique storage key for this form */
  storageKey: string
  /** Current form data to persist */
  formData: T
  /** Callback when draft is restored */
  onRestore: (data: T) => void
  /** Callback when draft is discarded */
  onDiscard?: () => void
  /** Debounce delay in ms (default: 2000) */
  debounceMs?: number
  /** Max age of saved data in hours (default: 24) */
  maxAgeHours?: number
  /** Show the autosave indicator */
  showIndicator?: boolean
  /** Position of indicator */
  indicatorPosition?: "top-right" | "bottom-right" | "inline"
  /** Children */
  children: React.ReactNode
  /** Additional className */
  className?: string
}

interface SavedDraft<T> {
  data: T
  savedAt: number
  version: number
}

const CURRENT_VERSION = 1

/**
 * Form Autosave Wrapper
 * 
 * Wraps any form to provide:
 * - Automatic save to localStorage (debounced)
 * - Restore draft banner on return
 * - Visual save indicator
 * - Offline support
 * 
 * Usage:
 * ```tsx
 * <FormAutosaveWrapper
 *   storageKey="med_cert_form"
 *   formData={formData}
 *   onRestore={(data) => setFormData(data)}
 * >
 *   <YourFormFields />
 * </FormAutosaveWrapper>
 * ```
 */
export function FormAutosaveWrapper<T extends Record<string, unknown>>({
  storageKey,
  formData,
  onRestore,
  onDiscard,
  debounceMs = 2000,
  maxAgeHours = 24,
  showIndicator = true,
  indicatorPosition = "top-right",
  children,
  className,
}: FormAutosaveWrapperProps<T>) {
  const { status, lastSaved, markSaving, markSaved, markError, isOnline } = useAutosaveStatus()
  const [hasDraft, setHasDraft] = useState(false)
  const [draftData, setDraftData] = useState<T | null>(null)
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialMount = useRef(true)
  const fullStorageKey = `form_autosave_${storageKey}`
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000

  // Check for existing draft on mount
  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const saved = localStorage.getItem(fullStorageKey)
      if (saved) {
        const parsed: SavedDraft<T> = JSON.parse(saved)
        const age = Date.now() - parsed.savedAt

        if (age < maxAgeMs && parsed.version === CURRENT_VERSION) {
          setHasDraft(true)
          setDraftData(parsed.data)
          setDraftSavedAt(new Date(parsed.savedAt))
        } else {
          localStorage.removeItem(fullStorageKey)
        }
      }
    } catch {
      localStorage.removeItem(fullStorageKey)
    }
  }, [fullStorageKey, maxAgeMs])

  // Save to localStorage (debounced)
  const saveToStorage = useCallback((data: T) => {
    if (typeof window === "undefined") return

    markSaving()

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const saveData: SavedDraft<T> = {
          data,
          savedAt: Date.now(),
          version: CURRENT_VERSION,
        }
        localStorage.setItem(fullStorageKey, JSON.stringify(saveData))
        markSaved()
      } catch {
        markError()
      }
    }, debounceMs)
  }, [fullStorageKey, debounceMs, markSaving, markSaved, markError])

  // Auto-save on form data change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    // Don't save if we're showing the restore banner
    if (hasDraft) return

    saveToStorage(formData)
  }, [formData, saveToStorage, hasDraft])

  // Handle restore
  const handleRestore = useCallback(() => {
    if (draftData) {
      onRestore(draftData)
      setHasDraft(false)
      setDraftData(null)
    }
  }, [draftData, onRestore])

  // Handle discard
  const handleDiscard = useCallback(() => {
    try {
      localStorage.removeItem(fullStorageKey)
    } catch {
      // Silent fail
    }
    setHasDraft(false)
    setDraftData(null)
    onDiscard?.()
  }, [fullStorageKey, onDiscard])

  // Clear draft (call after successful submission)
  const clearDraft = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    try {
      localStorage.removeItem(fullStorageKey)
    } catch {
      // Silent fail
    }
    setHasDraft(false)
  }, [fullStorageKey])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const indicatorClasses = {
    "top-right": "absolute top-2 right-2",
    "bottom-right": "absolute bottom-2 right-2",
    "inline": "",
  }

  return (
    <div className={cn("relative", className)}>
      {/* Restore draft banner */}
      {hasDraft && draftSavedAt && (
        <RestoreDraftBanner
          lastSaved={draftSavedAt}
          onRestore={handleRestore}
          onDiscard={handleDiscard}
          className="mb-4"
        />
      )}

      {/* Autosave indicator */}
      {showIndicator && !hasDraft && (
        <AutosaveIndicator
          status={isOnline ? status : "offline"}
          lastSaved={lastSaved}
          className={indicatorClasses[indicatorPosition]}
        />
      )}

      {/* Form content */}
      {children}

      {/* Expose clearDraft via data attribute for parent access */}
      <input 
        type="hidden" 
        data-clear-draft={fullStorageKey}
        onClick={clearDraft}
        readOnly
      />
    </div>
  )
}

/**
 * Hook to clear form draft after successful submission
 */
export function useClearFormDraft(storageKey: string) {
  return useCallback(() => {
    if (typeof window === "undefined") return
    try {
      localStorage.removeItem(`form_autosave_${storageKey}`)
    } catch {
      // Silent fail
    }
  }, [storageKey])
}
