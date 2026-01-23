"use client"

import { useCallback, useRef, useEffect } from "react"
import posthog from "posthog-js"

interface FieldInteraction {
  fieldName: string
  focusedAt: number
  blurredAt?: number
  changed: boolean
  timeSpentMs?: number
}

interface FormAnalyticsOptions {
  formName: string
  service?: string
  enabled?: boolean
}

/**
 * PostHog Form Analytics Hook
 * 
 * Tracks field-level interactions for conversion optimization:
 * - Field focus/blur timing
 * - Time spent per field
 * - Drop-off points
 * - Form completion rate
 * 
 * Usage:
 * ```tsx
 * const { trackFieldFocus, trackFieldBlur, trackFieldChange, trackFormSubmit, trackFormAbandon } = useFormAnalytics({
 *   formName: 'med_cert_intake',
 *   service: 'medical-certificate'
 * })
 * 
 * <Input
 *   onFocus={() => trackFieldFocus('email')}
 *   onBlur={() => trackFieldBlur('email')}
 *   onChange={() => trackFieldChange('email')}
 * />
 * ```
 */
export function useFormAnalytics({ formName, service, enabled = true }: FormAnalyticsOptions) {
  const startTime = useRef<number>(Date.now())
  const fieldInteractions = useRef<Map<string, FieldInteraction>>(new Map())
  const currentField = useRef<string | null>(null)
  const hasTrackedStart = useRef(false)

  // Track form start on first interaction
  const trackFormStart = useCallback(() => {
    if (!enabled || hasTrackedStart.current) return
    hasTrackedStart.current = true
    
    posthog.capture("form_started", {
      form_name: formName,
      service,
      timestamp: new Date().toISOString(),
    })
  }, [enabled, formName, service])

  // Track field focus
  const trackFieldFocus = useCallback((fieldName: string) => {
    if (!enabled) return
    
    trackFormStart()
    currentField.current = fieldName

    const existing = fieldInteractions.current.get(fieldName)
    if (!existing) {
      fieldInteractions.current.set(fieldName, {
        fieldName,
        focusedAt: Date.now(),
        changed: false,
      })
    } else {
      existing.focusedAt = Date.now()
    }

    posthog.capture("form_field_focused", {
      form_name: formName,
      field_name: fieldName,
      service,
    })
  }, [enabled, formName, service, trackFormStart])

  // Track field blur
  const trackFieldBlur = useCallback((fieldName: string) => {
    if (!enabled) return

    const interaction = fieldInteractions.current.get(fieldName)
    if (interaction) {
      interaction.blurredAt = Date.now()
      interaction.timeSpentMs = interaction.blurredAt - interaction.focusedAt

      posthog.capture("form_field_blurred", {
        form_name: formName,
        field_name: fieldName,
        time_spent_ms: interaction.timeSpentMs,
        was_changed: interaction.changed,
        service,
      })
    }

    if (currentField.current === fieldName) {
      currentField.current = null
    }
  }, [enabled, formName, service])

  // Track field value change
  const trackFieldChange = useCallback((fieldName: string) => {
    if (!enabled) return

    const interaction = fieldInteractions.current.get(fieldName)
    if (interaction) {
      interaction.changed = true
    }
  }, [enabled])

  // Track step completion (for multi-step forms)
  const trackStepComplete = useCallback((stepName: string, stepIndex: number, totalSteps: number) => {
    if (!enabled) return

    const fieldsInStep = Array.from(fieldInteractions.current.values())
    const totalTimeMs = Date.now() - startTime.current

    posthog.capture("form_step_completed", {
      form_name: formName,
      step_name: stepName,
      step_index: stepIndex,
      total_steps: totalSteps,
      progress_percent: Math.round((stepIndex / totalSteps) * 100),
      time_spent_ms: totalTimeMs,
      fields_interacted: fieldsInStep.length,
      service,
    })
  }, [enabled, formName, service])

  // Track form submission
  const trackFormSubmit = useCallback((success: boolean, metadata?: Record<string, unknown>) => {
    if (!enabled) return

    const totalTimeMs = Date.now() - startTime.current
    const fieldsData = Array.from(fieldInteractions.current.values())
    
    const avgTimePerField = fieldsData.length > 0
      ? fieldsData.reduce((sum, f) => sum + (f.timeSpentMs || 0), 0) / fieldsData.length
      : 0

    posthog.capture("form_submitted", {
      form_name: formName,
      success,
      total_time_ms: totalTimeMs,
      total_time_seconds: Math.round(totalTimeMs / 1000),
      fields_count: fieldsData.length,
      avg_time_per_field_ms: Math.round(avgTimePerField),
      service,
      ...metadata,
    })

    // Reset for potential re-submission
    if (success) {
      fieldInteractions.current.clear()
      hasTrackedStart.current = false
    }
  }, [enabled, formName, service])

  // Track form abandonment
  const trackFormAbandon = useCallback((reason?: string) => {
    if (!enabled || !hasTrackedStart.current) return

    const totalTimeMs = Date.now() - startTime.current
    const lastField = currentField.current
    const fieldsData = Array.from(fieldInteractions.current.values())
    const completedFields = fieldsData.filter(f => f.changed).length

    posthog.capture("form_abandoned", {
      form_name: formName,
      last_field: lastField,
      total_time_ms: totalTimeMs,
      total_time_seconds: Math.round(totalTimeMs / 1000),
      fields_completed: completedFields,
      fields_total: fieldsData.length,
      completion_percent: fieldsData.length > 0 
        ? Math.round((completedFields / fieldsData.length) * 100) 
        : 0,
      reason,
      service,
    })
  }, [enabled, formName, service])

  // Track abandonment on unmount if form wasn't submitted
  useEffect(() => {
    const interactions = fieldInteractions.current
    const hasStarted = hasTrackedStart.current
    return () => {
      if (hasStarted && interactions.size > 0) {
        trackFormAbandon("page_leave")
      }
    }
  }, [trackFormAbandon])

  return {
    trackFieldFocus,
    trackFieldBlur,
    trackFieldChange,
    trackStepComplete,
    trackFormSubmit,
    trackFormAbandon,
    trackFormStart,
  }
}

/**
 * HOC props for form fields with analytics
 */
export function withFormAnalytics(
  fieldName: string,
  analytics: ReturnType<typeof useFormAnalytics>
) {
  return {
    onFocus: () => analytics.trackFieldFocus(fieldName),
    onBlur: () => analytics.trackFieldBlur(fieldName),
    onChange: () => analytics.trackFieldChange(fieldName),
  }
}
