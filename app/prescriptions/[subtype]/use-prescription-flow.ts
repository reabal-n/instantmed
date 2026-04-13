"use client"

import { useMemo, useRef, useState } from "react"

import type { SelectedPBSProduct } from "@/components/shared"
import { createIntakeAndCheckoutAction } from "@/lib/stripe/checkout"

import {
  chronicConditionOptions,
  chronicControlOptions,
  chronicRequestOptions,
  chronicReviewOptions,
  type FlowStep,
  type PrescriptionFlowState,
  redFlags,
  repeatControlOptions,
  repeatDurationOptions,
  repeatReasonOptions,
  repeatSideEffectsOptions,
} from "./types"

interface UsePrescriptionFlowArgs {
  subtype: string
  initialPatientId: string | null
  initialIsAuthenticated: boolean
  initialNeedsOnboarding: boolean
  userName?: string
}

export function usePrescriptionFlow({
  subtype,
  initialPatientId,
  initialIsAuthenticated,
  initialNeedsOnboarding,
  userName,
}: UsePrescriptionFlowArgs): PrescriptionFlowState {
  // Auth state
  const [patientId, setPatientId] = useState<string | null>(initialPatientId)
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated)
  const [needsOnboarding, setNeedsOnboarding] = useState(initialNeedsOnboarding)
  const [currentUserName] = useState(userName || "")

  // Flow state
  const [step, setStep] = useState<FlowStep>("intro")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // CRITICAL: Synchronous ref check to prevent rapid double-clicks (async state is too slow)
  const submittingRef = useRef(false)
  // Generate idempotency key once on mount to prevent duplicate checkouts
  const idempotencyKey = useMemo(() => crypto.randomUUID(), [])

  // Common form state
  const [selectedMedication, setSelectedMedication] = useState<SelectedPBSProduct | null>(null)
  const [additionalNotes, setAdditionalNotes] = useState("")
  const [redFlagValues, setRedFlagValues] = useState<Record<string, boolean>>(
    Object.fromEntries(redFlags.map((rf) => [rf.id, false])),
  )

  // Repeat prescription state
  const [repeatReason, setRepeatReason] = useState<string | null>(null)
  const [repeatDuration, setRepeatDuration] = useState<string | null>(null)
  const [repeatControl, setRepeatControl] = useState<string | null>(null)
  const [repeatSideEffects, setRepeatSideEffects] = useState<string | null>(null)

  // Chronic review state
  const [chronicRequests, setChronicRequests] = useState<string[]>([])
  const [chronicCondition, setChronicCondition] = useState<string | null>(null)
  const [chronicReview, setChronicReview] = useState<string | null>(null)
  const [chronicControl, setChronicControl] = useState<string | null>(null)

  const hasRedFlags = Object.values(redFlagValues).some((v) => v)

  // Validation based on subtype
  const isFormValid = (() => {
    if (hasRedFlags) return false
    if (!selectedMedication) return false
    switch (subtype) {
      case "repeat":
        return !!(repeatReason && repeatDuration && repeatControl && repeatSideEffects)
      case "chronic":
        return !!(chronicRequests.length > 0 && chronicCondition && chronicReview && chronicControl)
      default:
        return false
    }
  })()

  const handleRedFlagChange = (id: string, value: boolean) => {
    setRedFlagValues((prev) => ({ ...prev, [id]: value }))
  }

  const toggleChronicRequest = (id: string) => {
    setChronicRequests((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
  }

  const buildAnswers = (): Record<string, unknown> => {
    const baseAnswers = {
      // PBS-backed structured medication data
      pbs_code: selectedMedication?.pbs_code,
      medication_name: selectedMedication?.drug_name,
      strength: selectedMedication?.strength,
      form: selectedMedication?.form,
      additional_notes: additionalNotes,
      red_flags: redFlagValues,
    }

    switch (subtype) {
      case "repeat":
        return {
          ...baseAnswers,
          reason: repeatReason,
          reason_label: repeatReasonOptions.find((r) => r.id === repeatReason)?.label,
          duration_on_medication: repeatDuration,
          duration_label: repeatDurationOptions.find((d) => d.id === repeatDuration)?.label,
          symptom_control: repeatControl,
          control_label: repeatControlOptions.find((c) => c.id === repeatControl)?.label,
          side_effects: repeatSideEffects,
          side_effects_label: repeatSideEffectsOptions.find((s) => s.id === repeatSideEffects)?.label,
        }
      case "chronic":
        return {
          ...baseAnswers,
          request_types: chronicRequests,
          request_types_labels: chronicRequests.map((r) => chronicRequestOptions.find((o) => o.id === r)?.label),
          primary_condition: chronicCondition,
          condition_label: chronicConditionOptions.find((c) => c.id === chronicCondition)?.label,
          recent_review: chronicReview,
          review_label: chronicReviewOptions.find((r) => r.id === chronicReview)?.label,
          current_control: chronicControl,
          control_label: chronicControlOptions.find((c) => c.id === chronicControl)?.label,
        }
      default:
        return baseAnswers
    }
  }

  const handleSubmit = async () => {
    // CRITICAL: Synchronous check to prevent rapid double-clicks
    if (submittingRef.current || !isFormValid || hasSubmitted) return
    submittingRef.current = true

    if (!patientId) {
      setError("Authentication required")
      setStep("auth")
      submittingRef.current = false
      return
    }

    setIsSubmitting(true)
    setHasSubmitted(true) // Prevent double-click
    setError(null)

    try {
      const answers = buildAnswers()
      // Use pre-generated idempotency key to prevent duplicate checkouts
      const result = await createIntakeAndCheckoutAction({
        category: "prescription",
        subtype,
        type: "script",
        answers,
        idempotencyKey,
      })

      if (!result.success) {
        setError(result.error || "Failed to create checkout session. Please try again.")
        setIsSubmitting(false)
        setHasSubmitted(false) // Allow retry on error
        submittingRef.current = false
        return
      }

      if (!result.checkoutUrl) {
        setError("No checkout URL received. Please try again.")
        setIsSubmitting(false)
        setHasSubmitted(false) // Allow retry on error
        submittingRef.current = false
        return
      }

      window.location.href = result.checkoutUrl
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setIsSubmitting(false)
      setHasSubmitted(false) // Allow retry on error
      submittingRef.current = false
    }
  }

  const handleFormComplete = () => {
    if (!isAuthenticated) {
      setStep("auth")
    } else if (needsOnboarding) {
      setStep("onboarding")
    } else {
      handleSubmit()
    }
  }

  const handleAuthComplete = (userId: string, profileId: string) => {
    setPatientId(profileId)
    setIsAuthenticated(true)
    setNeedsOnboarding(true)
    setStep("onboarding")
  }

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false)
    handleSubmit()
  }

  return {
    patientId,
    setPatientId,
    isAuthenticated,
    setIsAuthenticated,
    needsOnboarding,
    setNeedsOnboarding,
    currentUserName,

    step,
    setStep,
    isSubmitting,
    error,
    hasSubmitted,

    selectedMedication,
    setSelectedMedication,
    additionalNotes,
    setAdditionalNotes,
    redFlagValues,
    handleRedFlagChange,
    hasRedFlags,

    repeatReason,
    setRepeatReason,
    repeatDuration,
    setRepeatDuration,
    repeatControl,
    setRepeatControl,
    repeatSideEffects,
    setRepeatSideEffects,

    chronicRequests,
    toggleChronicRequest,
    chronicCondition,
    setChronicCondition,
    chronicReview,
    setChronicReview,
    chronicControl,
    setChronicControl,

    isFormValid,

    handleFormComplete,
    handleAuthComplete,
    handleOnboardingComplete,
  }
}
