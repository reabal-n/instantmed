/**
 * @deprecated Exported from lib/hooks/index.ts but NOT used by any component — last verified 2026-02-22.
 *
 * The request flow tracks steps directly via posthog.capture() in request-flow.tsx.
 * This hook provides richer timing data (step duration, abandonment) that could be useful
 * if wired into the request flow in the future.
 */
"use client"

import { useCallback, useRef, useEffect } from "react"
import posthog from "posthog-js"

interface IntakeStep {
  id: string
  title: string
}

interface UseIntakeAnalyticsOptions {
  flowType: "medical_certificate" | "repeat_prescription" | "consult"
  steps: IntakeStep[]
}

/**
 * Custom hook for tracking intake flow analytics with PostHog
 */
export function useIntakeAnalytics({ flowType, steps }: UseIntakeAnalyticsOptions) {
  const startTimeRef = useRef<number>(0)
  const stepTimesRef = useRef<Record<number, number>>({})
  const trackedStepsRef = useRef<Set<number>>(new Set())
  
  // Initialize start time in effect to avoid calling Date.now() during render
  useEffect(() => {
    if (startTimeRef.current === 0) {
      startTimeRef.current = Date.now()
    }
  }, [])

  // Track when flow starts
  const trackFlowStart = useCallback(() => {
    startTimeRef.current = Date.now()
    posthog.capture("intake_flow_started", {
      flow_type: flowType,
      total_steps: steps.length,
      timestamp: new Date().toISOString(),
    })
  }, [flowType, steps.length])

  // Track step entry
  const trackStepEnter = useCallback(
    (stepIndex: number) => {
      const step = steps[stepIndex]
      if (!step) return

      stepTimesRef.current[stepIndex] = Date.now()

      // Only track first entry to each step
      if (!trackedStepsRef.current.has(stepIndex)) {
        trackedStepsRef.current.add(stepIndex)

        posthog.capture("intake_step_viewed", {
          flow_type: flowType,
          step_index: stepIndex,
          step_id: step.id,
          step_title: step.title,
          time_in_flow_seconds: Math.round((Date.now() - startTimeRef.current) / 1000),
        })
      }
    },
    [flowType, steps]
  )

  // Track step completion
  const trackStepComplete = useCallback(
    (stepIndex: number, additionalData?: Record<string, unknown>) => {
      const step = steps[stepIndex]
      if (!step) return

      const stepStartTime = stepTimesRef.current[stepIndex] || Date.now()
      const timeOnStep = Math.round((Date.now() - stepStartTime) / 1000)

      posthog.capture("intake_step_completed", {
        flow_type: flowType,
        step_index: stepIndex,
        step_id: step.id,
        step_title: step.title,
        time_on_step_seconds: timeOnStep,
        time_in_flow_seconds: Math.round((Date.now() - startTimeRef.current) / 1000),
        ...additionalData,
      })
    },
    [flowType, steps]
  )

  // Track flow abandonment
  const trackFlowAbandoned = useCallback(
    (lastStepIndex: number, reason?: string) => {
      const step = steps[lastStepIndex]
      const totalTime = Math.round((Date.now() - startTimeRef.current) / 1000)

      posthog.capture("intake_flow_abandoned", {
        flow_type: flowType,
        last_step_index: lastStepIndex,
        last_step_id: step?.id,
        last_step_title: step?.title,
        total_time_seconds: totalTime,
        steps_completed: trackedStepsRef.current.size,
        reason,
      })
    },
    [flowType, steps]
  )

  // Track flow completion
  const trackFlowComplete = useCallback(
    (additionalData?: Record<string, unknown>) => {
      const totalTime = Math.round((Date.now() - startTimeRef.current) / 1000)

      posthog.capture("intake_flow_completed", {
        flow_type: flowType,
        total_steps: steps.length,
        total_time_seconds: totalTime,
        timestamp: new Date().toISOString(),
        ...additionalData,
      })
    },
    [flowType, steps.length]
  )

  // Track validation errors
  const trackValidationError = useCallback(
    (stepIndex: number, errorType: string, errorMessage?: string) => {
      const step = steps[stepIndex]

      posthog.capture("intake_validation_error", {
        flow_type: flowType,
        step_index: stepIndex,
        step_id: step?.id,
        error_type: errorType,
        error_message: errorMessage,
      })
    },
    [flowType, steps]
  )

  // Track payment initiated
  const trackPaymentInitiated = useCallback(
    (amount: number, isGuest: boolean) => {
      posthog.capture("intake_payment_initiated", {
        flow_type: flowType,
        amount_cents: Math.round(amount * 100),
        is_guest: isGuest,
        total_time_seconds: Math.round((Date.now() - startTimeRef.current) / 1000),
      })
    },
    [flowType]
  )

  // Track emergency redirect
  const trackEmergencyRedirect = useCallback(() => {
    posthog.capture("intake_emergency_redirect", {
      flow_type: flowType,
      time_in_flow_seconds: Math.round((Date.now() - startTimeRef.current) / 1000),
    })
  }, [flowType])

  // Track draft restored
  const trackDraftRestored = useCallback(() => {
    posthog.capture("intake_draft_restored", {
      flow_type: flowType,
    })
  }, [flowType])

  // Track draft discarded
  const trackDraftDiscarded = useCallback(() => {
    posthog.capture("intake_draft_discarded", {
      flow_type: flowType,
    })
  }, [flowType])

  return {
    trackFlowStart,
    trackStepEnter,
    trackStepComplete,
    trackFlowAbandoned,
    trackFlowComplete,
    trackValidationError,
    trackPaymentInitiated,
    trackEmergencyRedirect,
    trackDraftRestored,
    trackDraftDiscarded,
  }
}

