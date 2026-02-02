"use client"

/**
 * Intake Flow Analytics Hook
 * 
 * Tracks user progression through intake flows for conversion optimization.
 * Captures step views, abandonment points, and completion rates.
 */

import { useCallback, useEffect, useRef } from "react"
import { usePostHog } from "posthog-js/react"

interface IntakeAnalyticsConfig {
  flowName: string
  flowId?: string
  totalSteps: number
}

interface StepMetadata {
  stepName: string
  fieldCount?: number
  hasValidationErrors?: boolean
}

export function useIntakeAnalytics(config: IntakeAnalyticsConfig) {
  const posthog = usePostHog()
  const startTimeRef = useRef<number>(0)
  const stepStartTimeRef = useRef<number>(0)
  const lastStepRef = useRef<number>(0)
  const hasStartedRef = useRef<boolean>(false)
  
  // Track flow start (only once)
  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true
    
    const now = Date.now()
    startTimeRef.current = now
    stepStartTimeRef.current = now
    
    posthog?.capture("intake_flow_started", {
      flow_name: config.flowName,
      flow_id: config.flowId,
      total_steps: config.totalSteps,
      timestamp: new Date().toISOString(),
    })
    
    // Track abandonment on page unload
    const handleBeforeUnload = () => {
      const timeSpentMs = Date.now() - startTimeRef.current
      posthog?.capture("intake_flow_abandoned", {
        flow_name: config.flowName,
        flow_id: config.flowId,
        last_step: lastStepRef.current,
        total_steps: config.totalSteps,
        time_spent_seconds: Math.round(timeSpentMs / 1000),
        completion_percentage: Math.round((lastStepRef.current / config.totalSteps) * 100),
      })
    }
    
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [config.flowName, config.flowId, config.totalSteps, posthog])
  
  // Track step view
  const trackStepView = useCallback((stepIndex: number, metadata?: StepMetadata) => {
    const stepTimeMs = Date.now() - stepStartTimeRef.current
    stepStartTimeRef.current = Date.now()
    lastStepRef.current = stepIndex
    
    posthog?.capture("intake_step_viewed", {
      flow_name: config.flowName,
      flow_id: config.flowId,
      step_index: stepIndex,
      step_name: metadata?.stepName,
      total_steps: config.totalSteps,
      progress_percentage: Math.round((stepIndex / config.totalSteps) * 100),
      previous_step_time_seconds: stepIndex > 0 ? Math.round(stepTimeMs / 1000) : null,
      field_count: metadata?.fieldCount,
    })
  }, [config.flowName, config.flowId, config.totalSteps, posthog])
  
  // Track step completion
  const trackStepCompleted = useCallback((stepIndex: number, metadata?: StepMetadata) => {
    const stepTimeMs = Date.now() - stepStartTimeRef.current
    
    posthog?.capture("intake_step_completed", {
      flow_name: config.flowName,
      flow_id: config.flowId,
      step_index: stepIndex,
      step_name: metadata?.stepName,
      total_steps: config.totalSteps,
      time_on_step_seconds: Math.round(stepTimeMs / 1000),
      had_validation_errors: metadata?.hasValidationErrors,
    })
  }, [config.flowName, config.flowId, config.totalSteps, posthog])
  
  // Track validation errors (friction points)
  const trackValidationError = useCallback((stepIndex: number, fieldName: string, errorMessage: string) => {
    posthog?.capture("intake_validation_error", {
      flow_name: config.flowName,
      flow_id: config.flowId,
      step_index: stepIndex,
      field_name: fieldName,
      error_message: errorMessage,
    })
  }, [config.flowName, config.flowId, posthog])
  
  // Track flow completion
  const trackFlowCompleted = useCallback((metadata?: { intakeId?: string; paymentStatus?: string }) => {
    const totalTimeMs = Date.now() - startTimeRef.current
    
    posthog?.capture("intake_flow_completed", {
      flow_name: config.flowName,
      flow_id: config.flowId,
      total_steps: config.totalSteps,
      total_time_seconds: Math.round(totalTimeMs / 1000),
      intake_id: metadata?.intakeId,
      payment_status: metadata?.paymentStatus,
    })
  }, [config.flowName, config.flowId, config.totalSteps, posthog])
  
  // Track back navigation (potential confusion/friction)
  const trackBackNavigation = useCallback((fromStep: number, toStep: number) => {
    posthog?.capture("intake_back_navigation", {
      flow_name: config.flowName,
      flow_id: config.flowId,
      from_step: fromStep,
      to_step: toStep,
      steps_back: fromStep - toStep,
    })
  }, [config.flowName, config.flowId, posthog])
  
  return {
    trackStepView,
    trackStepCompleted,
    trackValidationError,
    trackFlowCompleted,
    trackBackNavigation,
  }
}
