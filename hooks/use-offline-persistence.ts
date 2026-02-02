"use client"

/**
 * Offline Form Persistence Hook
 * 
 * Automatically saves form data to localStorage when offline or on blur,
 * and restores it when the user returns. Handles connection state changes
 * and provides sync status indicators.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("offline-persistence")

interface OfflinePersistenceConfig {
  storageKey: string
  debounceMs?: number
  maxAgeMs?: number  // Auto-expire saved data after this duration
}

interface SavedFormData<T> {
  data: T
  savedAt: number
  flowStep?: number
  version: number
}

const STORAGE_VERSION = 1

export function useOfflinePersistence<T extends Record<string, unknown>>(
  config: OfflinePersistenceConfig
) {
  const { storageKey, debounceMs = 1000, maxAgeMs = 24 * 60 * 60 * 1000 } = config
  
  const [isOnline, setIsOnline] = useState(true)
  const [hasSavedData, setHasSavedData] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Check for saved data on mount
  useEffect(() => {
    // Initialize online state
    setIsOnline(navigator.onLine)
    
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    
    // Check for existing saved data
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed: SavedFormData<T> = JSON.parse(saved)
        const age = Date.now() - parsed.savedAt
        
        if (age < maxAgeMs && parsed.version === STORAGE_VERSION) {
          setHasSavedData(true)
          setLastSaved(new Date(parsed.savedAt))
        } else {
          // Data is too old or wrong version, remove it
          localStorage.removeItem(storageKey)
        }
      }
    } catch {
      logger.warn("Failed to check saved form data", { storageKey })
    }
    
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [storageKey, maxAgeMs])
  
  // Save form data (debounced)
  const saveFormData = useCallback((data: T, flowStep?: number) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    debounceTimerRef.current = setTimeout(() => {
      try {
        const saveData: SavedFormData<T> = {
          data,
          savedAt: Date.now(),
          flowStep,
          version: STORAGE_VERSION,
        }
        localStorage.setItem(storageKey, JSON.stringify(saveData))
        setHasSavedData(true)
        setLastSaved(new Date())
        
        logger.debug("Form data saved offline", { storageKey, flowStep })
      } catch {
        // localStorage might be full or disabled
        logger.warn("Failed to save form data offline", { storageKey })
      }
    }, debounceMs)
  }, [storageKey, debounceMs])
  
  // Save immediately (for beforeunload)
  const saveImmediately = useCallback((data: T, flowStep?: number) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    try {
      const saveData: SavedFormData<T> = {
        data,
        savedAt: Date.now(),
        flowStep,
        version: STORAGE_VERSION,
      }
      localStorage.setItem(storageKey, JSON.stringify(saveData))
      setHasSavedData(true)
    } catch {
      // Ignore errors on immediate save (e.g., during unload)
    }
  }, [storageKey])
  
  // Load saved form data
  const loadFormData = useCallback((): { data: T; flowStep?: number } | null => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (!saved) return null
      
      const parsed: SavedFormData<T> = JSON.parse(saved)
      const age = Date.now() - parsed.savedAt
      
      if (age >= maxAgeMs || parsed.version !== STORAGE_VERSION) {
        localStorage.removeItem(storageKey)
        setHasSavedData(false)
        return null
      }
      
      logger.info("Restored form data from offline storage", { 
        storageKey, 
        flowStep: parsed.flowStep,
        ageMinutes: Math.round(age / 60000),
      })
      
      return { data: parsed.data, flowStep: parsed.flowStep }
    } catch {
      logger.warn("Failed to load saved form data", { storageKey })
      return null
    }
  }, [storageKey, maxAgeMs])
  
  // Clear saved data (after successful submission)
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
      setHasSavedData(false)
      setLastSaved(null)
      logger.debug("Cleared saved form data", { storageKey })
    } catch {
      // Ignore errors
    }
  }, [storageKey])
  
  return {
    isOnline,
    hasSavedData,
    lastSaved,
    saveFormData,
    saveImmediately,
    loadFormData,
    clearSavedData,
  }
}
