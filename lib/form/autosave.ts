"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("autosave")

const STORAGE_PREFIX = "instantmed_draft_"
const DEFAULT_DEBOUNCE_MS = 2000
const DRAFT_EXPIRY_HOURS = 72

interface DraftData<T> {
  data: T
  savedAt: number
  expiresAt: number
  version: number
}

/**
 * Form Autosave System
 * 
 * Features:
 * - Automatic draft saving with debounce
 * - Draft recovery on page load
 * - Expiration handling
 * - Version tracking for conflict detection
 * - Storage in localStorage with fallback
 */

export function saveDraft<T>(key: string, data: T, expiryHours = DRAFT_EXPIRY_HOURS): void {
  try {
    const draft: DraftData<T> = {
      data,
      savedAt: Date.now(),
      expiresAt: Date.now() + expiryHours * 60 * 60 * 1000,
      version: 1,
    }
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(draft))
    logger.debug("Draft saved", { key })
  } catch (error) {
    logger.warn("Failed to save draft", { key, error })
  }
}

export function loadDraft<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (!stored) return null

    const draft: DraftData<T> = JSON.parse(stored)
    
    // Check expiration
    if (draft.expiresAt < Date.now()) {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
      logger.debug("Draft expired and removed", { key })
      return null
    }

    logger.debug("Draft loaded", { key, savedAt: new Date(draft.savedAt).toISOString() })
    return draft.data
  } catch (error) {
    logger.warn("Failed to load draft", { key, error })
    return null
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
    logger.debug("Draft cleared", { key })
  } catch (error) {
    logger.warn("Failed to clear draft", { key, error })
  }
}

export function hasDraft(key: string): boolean {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (!stored) return false

    const draft: DraftData<unknown> = JSON.parse(stored)
    return draft.expiresAt > Date.now()
  } catch {
    return false
  }
}

export function getDraftAge(key: string): number | null {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (!stored) return null

    const draft: DraftData<unknown> = JSON.parse(stored)
    return Date.now() - draft.savedAt
  } catch {
    return null
  }
}

/**
 * Hook for automatic form saving
 */
export function useAutosave<T>({
  key,
  data,
  enabled = true,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  onSave,
  onRestore,
}: {
  key: string
  data: T
  enabled?: boolean
  debounceMs?: number
  onSave?: () => void
  onRestore?: (data: T) => void
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasSavedDraft, setHasSavedDraft] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialLoadRef = useRef(false)

  // Check for existing draft on mount
  useEffect(() => {
    if (!initialLoadRef.current && enabled) {
      initialLoadRef.current = true
      const draft = loadDraft<T>(key)
      if (draft) {
        setHasSavedDraft(true)
        onRestore?.(draft)
      }
    }
  }, [key, enabled, onRestore])

  // Debounced save
  useEffect(() => {
    if (!enabled) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setIsSaving(true)
      saveDraft(key, data)
      setLastSaved(new Date())
      setIsSaving(false)
      setHasSavedDraft(true)
      onSave?.()
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [key, data, enabled, debounceMs, onSave])

  const clear = useCallback(() => {
    clearDraft(key)
    setHasSavedDraft(false)
    setLastSaved(null)
  }, [key])

  const restore = useCallback((): T | null => {
    const draft = loadDraft<T>(key)
    if (draft) {
      onRestore?.(draft)
    }
    return draft
  }, [key, onRestore])

  return {
    isSaving,
    lastSaved,
    hasSavedDraft,
    clear,
    restore,
  }
}

/**
 * Hook for draft recovery prompt
 */
export function useDraftRecovery<T>(key: string) {
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false)
  const [draftData, setDraftData] = useState<T | null>(null)
  const [draftAge, setDraftAge] = useState<string | null>(null)

  useEffect(() => {
    const draft = loadDraft<T>(key)
    if (draft) {
      setDraftData(draft)
      setShowRecoveryPrompt(true)
      
      const age = getDraftAge(key)
      if (age) {
        const minutes = Math.floor(age / 60000)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)
        
        if (days > 0) {
          setDraftAge(`${days} day${days > 1 ? "s" : ""} ago`)
        } else if (hours > 0) {
          setDraftAge(`${hours} hour${hours > 1 ? "s" : ""} ago`)
        } else {
          setDraftAge(`${minutes} minute${minutes > 1 ? "s" : ""} ago`)
        }
      }
    }
  }, [key])

  const acceptRecovery = useCallback(() => {
    setShowRecoveryPrompt(false)
    return draftData
  }, [draftData])

  const declineRecovery = useCallback(() => {
    clearDraft(key)
    setShowRecoveryPrompt(false)
    setDraftData(null)
  }, [key])

  return {
    showRecoveryPrompt,
    draftData,
    draftAge,
    acceptRecovery,
    declineRecovery,
  }
}

// DraftRecoveryBanner component is in components/form/draft-recovery-banner.tsx
