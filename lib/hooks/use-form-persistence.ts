"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface UseFormPersistenceOptions<T> {
  key: string
  initialState: T
  debounceMs?: number
  expirationMs?: number // Optional expiration time for saved drafts
}

interface PersistedData<T> {
  data: T
  timestamp: number
  currentStep: number
}

/**
 * Custom hook for persisting form state to localStorage
 * Automatically saves on changes and restores on mount
 */
export function useFormPersistence<T extends Record<string, unknown>>({
  key,
  initialState,
  debounceMs = 500,
  expirationMs = 24 * 60 * 60 * 1000, // 24 hours default
}: UseFormPersistenceOptions<T>) {
  const [state, setState] = useState<T>(initialState)
  const [currentStep, setCurrentStep] = useState(0)
  const [isRestored, setIsRestored] = useState(false)
  const [hasSavedDraft, setHasSavedDraft] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialLoadRef = useRef(true)

  // Storage key with prefix for organization
  const storageKey = `instantmed_draft_${key}`

  // Load saved state on mount
  useEffect(() => {
    if (!initialLoadRef.current) return
    initialLoadRef.current = false

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed: PersistedData<T> = JSON.parse(saved)
        
        // Check if data has expired
        const now = Date.now()
        if (now - parsed.timestamp > expirationMs) {
          localStorage.removeItem(storageKey)
          setIsRestored(true)
          return
        }

        // Restore saved state
        setState(parsed.data)
        setCurrentStep(parsed.currentStep)
        setHasSavedDraft(true)
        setIsRestored(true)
      } else {
        setIsRestored(true)
      }
    } catch (error) {
      console.error("Failed to restore form state:", error)
      localStorage.removeItem(storageKey)
      setIsRestored(true)
    }
  }, [storageKey, expirationMs])

  // Debounced save function
  const saveToStorage = useCallback(
    (data: T, step: number) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        try {
          const persistedData: PersistedData<T> = {
            data,
            timestamp: Date.now(),
            currentStep: step,
          }
          localStorage.setItem(storageKey, JSON.stringify(persistedData))
          setHasSavedDraft(true)
        } catch (error) {
          console.error("Failed to save form state:", error)
        }
      }, debounceMs)
    },
    [storageKey, debounceMs]
  )

  // Update state and trigger save
  const updateState = useCallback(
    (updates: Partial<T>) => {
      setState((prev) => {
        const newState = { ...prev, ...updates }
        saveToStorage(newState, currentStep)
        return newState
      })
    },
    [saveToStorage, currentStep]
  )

  // Update step and trigger save
  const updateStep = useCallback(
    (step: number) => {
      setCurrentStep(step)
      saveToStorage(state, step)
    },
    [saveToStorage, state]
  )

  // Clear saved draft
  const clearDraft = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    localStorage.removeItem(storageKey)
    setHasSavedDraft(false)
    setState(initialState)
    setCurrentStep(0)
  }, [storageKey, initialState])

  // Discard draft and reset to initial state
  const discardDraft = useCallback(() => {
    clearDraft()
  }, [clearDraft])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    state,
    currentStep,
    isRestored,
    hasSavedDraft,
    updateState,
    updateStep,
    clearDraft,
    discardDraft,
    // Direct state setter for complex updates
    setState,
    setCurrentStep: updateStep,
  }
}

/**
 * Lightweight version for simple state persistence
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [state, setState] = useState<T>(initialValue)
  const storageKey = `instantmed_${key}`

  // Load on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        setState(JSON.parse(saved))
      }
    } catch {
      // Ignore errors
    }
  }, [storageKey])

  // Save on change
  const setPersistedState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const newValue = typeof value === "function" ? (value as (prev: T) => T)(prev) : value
        try {
          localStorage.setItem(storageKey, JSON.stringify(newValue))
        } catch {
          // Ignore errors
        }
        return newValue
      })
    },
    [storageKey]
  )

  const clearState = useCallback(() => {
    localStorage.removeItem(storageKey)
    setState(initialValue)
  }, [storageKey, initialValue])

  return [state, setPersistedState, clearState]
}

