"use client"

import { useCallback, useEffect, useState } from "react"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("intake-progress")

const STORAGE_KEY = "instantmed_intake_progress"
const EXPIRY_HOURS = 24

interface IntakeProgress {
  currentStep: number
  totalSteps: number
  formData: Record<string, unknown>
  consultType: string
  savedAt: number
  expiresAt: number
}

/**
 * Patient Intake Progress Persistence
 * 
 * Saves patient progress through intake flow to allow:
 * - Resume after accidental navigation
 * - Continue on different device (if logged in)
 * - Recover from browser crash
 */

export function saveIntakeProgress(progress: Omit<IntakeProgress, "savedAt" | "expiresAt">): void {
  try {
    const data: IntakeProgress = {
      ...progress,
      savedAt: Date.now(),
      expiresAt: Date.now() + EXPIRY_HOURS * 60 * 60 * 1000,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    logger.debug("Intake progress saved", { step: progress.currentStep })
  } catch (error) {
    logger.warn("Failed to save intake progress", { error })
  }
}

export function loadIntakeProgress(): IntakeProgress | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const progress: IntakeProgress = JSON.parse(stored)
    
    // Check expiration
    if (progress.expiresAt < Date.now()) {
      localStorage.removeItem(STORAGE_KEY)
      logger.debug("Intake progress expired")
      return null
    }

    logger.debug("Intake progress loaded", { step: progress.currentStep })
    return progress
  } catch (error) {
    logger.warn("Failed to load intake progress", { error })
    return null
  }
}

export function clearIntakeProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    logger.debug("Intake progress cleared")
  } catch (error) {
    logger.warn("Failed to clear intake progress", { error })
  }
}

export function hasIntakeProgress(): boolean {
  const progress = loadIntakeProgress()
  return progress !== null
}

/**
 * Hook for intake progress management
 */
export function useIntakeProgress(consultType: string) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [hasExistingProgress, setHasExistingProgress] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)

  // Check for existing progress on mount
  useEffect(() => {
    const existing = loadIntakeProgress()
    if (existing && existing.consultType === consultType) {
      setHasExistingProgress(true)
    }
    setIsRestoring(false)
  }, [consultType])

  // Save progress on changes
  useEffect(() => {
    if (!isRestoring && currentStep > 0) {
      saveIntakeProgress({
        currentStep,
        totalSteps: 5, // Adjust based on actual flow
        formData,
        consultType,
      })
    }
  }, [currentStep, formData, consultType, isRestoring])

  const restoreProgress = useCallback(() => {
    const existing = loadIntakeProgress()
    if (existing) {
      setCurrentStep(existing.currentStep)
      setFormData(existing.formData)
      setHasExistingProgress(false)
    }
  }, [])

  const discardProgress = useCallback(() => {
    clearIntakeProgress()
    setHasExistingProgress(false)
  }, [])

  const updateFormData = useCallback((key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => prev + 1)
  }, [])

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }, [])

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step)
  }, [])

  const completeIntake = useCallback(() => {
    clearIntakeProgress()
  }, [])

  return {
    currentStep,
    formData,
    hasExistingProgress,
    isRestoring,
    restoreProgress,
    discardProgress,
    updateFormData,
    nextStep,
    prevStep,
    goToStep,
    completeIntake,
    setFormData,
  }
}

/**
 * Progress Recovery Prompt Component Data
 */
export function getProgressRecoveryData(): {
  lastStep: number
  consultType: string
  savedAgo: string
} | null {
  const progress = loadIntakeProgress()
  if (!progress) return null

  const minutesAgo = Math.floor((Date.now() - progress.savedAt) / 60000)
  let savedAgo: string
  
  if (minutesAgo < 1) {
    savedAgo = "just now"
  } else if (minutesAgo < 60) {
    savedAgo = `${minutesAgo} minute${minutesAgo > 1 ? "s" : ""} ago`
  } else {
    const hoursAgo = Math.floor(minutesAgo / 60)
    savedAgo = `${hoursAgo} hour${hoursAgo > 1 ? "s" : ""} ago`
  }

  return {
    lastStep: progress.currentStep,
    consultType: progress.consultType,
    savedAgo,
  }
}
