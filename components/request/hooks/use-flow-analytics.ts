"use client"

import { useEffect, useRef, useMemo } from "react"
import { usePostHog } from "@/components/providers/posthog-provider"
import { useRequestStore } from "../store"
import { canonicalizeServiceType } from "@/lib/request/draft-storage"
import { trackFunnelStep, trackStepEvent } from "@/lib/analytics/conversion-tracking"
import type { StepDefinition, UnifiedServiceType } from "@/lib/request/step-registry"

interface UseFlowAnalyticsOptions {
  serviceType: UnifiedServiceType | null
  currentStep: StepDefinition | null
  currentStepId: string
  currentStepIndex: number
  totalSteps: number
  answers: Record<string, unknown>
  /** Email from auth pre-fill (store email is read internally) */
  userEmail?: string
}

/**
 * Encapsulates all analytics tracking for the request flow:
 * - PostHog step_viewed / intake_started events
 * - Google Ads funnel milestone tracking (trackFunnelStep)
 * - Google Ads per-step remarketing events (trackStepEvent)
 * - Step timing (stepEnteredAtRef) exposed via trackStepCompleted()
 *
 * Returns trackStepCompleted() for the parent to call when advancing steps.
 */
export function useFlowAnalytics({
  serviceType,
  currentStep,
  currentStepId,
  currentStepIndex,
  totalSteps,
  answers,
  userEmail,
}: UseFlowAnalyticsOptions) {
  const posthog = usePostHog()
  const { email: storeEmail } = useRequestStore()

  const trackedFunnelEventsRef = useRef<Set<string>>(new Set())
  const stepEnteredAtRef = useRef<number>(Date.now())

  // Canonical service type for analytics (prescription/repeat-script -> 'prescription')
  const analyticsServiceType = useMemo(
    () => canonicalizeServiceType(serviceType) || serviceType || "unknown",
    [serviceType],
  )

  // Reset funnel event de-duplication state when changing flows.
  useEffect(() => {
    trackedFunnelEventsRef.current = new Set()
  }, [serviceType])

  // Track step views in PostHog + fire gtag funnel_step for remarketing audiences
  useEffect(() => {
    if (currentStep && serviceType) {
      // Reset timer whenever the visible step changes
      stepEnteredAtRef.current = Date.now()

      const subtype = (answers.consultSubtype as string | undefined) ?? undefined
      const stepNumber = currentStepIndex + 1

      // intake_started fires once per flow on the first step
      if (stepNumber === 1) {
        posthog?.capture("intake_started", {
          service_type: analyticsServiceType,
          subtype,
        })
      }

      posthog?.capture("step_viewed", {
        service_type: analyticsServiceType,
        step_id: currentStep.id,
        step_number: stepNumber,
        subtype,
      })

      // Fire gtag funnel_step event for every step transition.
      // Enables Google Ads remarketing audiences (e.g. "reached step 3 but didn't check out").
      trackStepEvent({
        stepName: currentStep.id,
        stepIndex: currentStepIndex,
        serviceType: analyticsServiceType,
        totalSteps,
      })
    }
    // answers.consultSubtype intentionally excluded - only track on step/service change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, serviceType, analyticsServiceType, currentStepIndex, totalSteps, posthog])

  // Track Google Ads funnel milestones once per flow.
  // Pass email (from store or auth pre-fill) for Enhanced Conversions cross-device attribution.
  const patientEmail = storeEmail || userEmail || undefined
  useEffect(() => {
    if (!currentStep || !serviceType) return

    const tracked = trackedFunnelEventsRef.current

    if (!tracked.has("landing")) {
      void trackFunnelStep("landing", analyticsServiceType, patientEmail)
      tracked.add("landing")
    }

    if (currentStepIndex === 0 && !tracked.has("start")) {
      void trackFunnelStep("start", analyticsServiceType, patientEmail)
      tracked.add("start")
    }

    if (currentStepId === "checkout" && !tracked.has("intake_complete")) {
      void trackFunnelStep("intake_complete", analyticsServiceType, patientEmail)
      tracked.add("intake_complete")
    }
  }, [currentStep, serviceType, currentStepIndex, currentStepId, analyticsServiceType, patientEmail])

  /**
   * Call when a step is completed (user clicks Next).
   * Fires `step_completed` with time_on_step_ms and returns the time spent.
   */
  function trackStepCompleted() {
    const subtype = (answers.consultSubtype as string | undefined) ?? undefined
    const timeOnStep = Date.now() - stepEnteredAtRef.current

    posthog?.capture("step_completed", {
      service_type: analyticsServiceType,
      step_id: currentStepId,
      step_number: currentStepIndex + 1,
      subtype,
      time_on_step_ms: timeOnStep,
    })

    return timeOnStep
  }

  return {
    analyticsServiceType,
    patientEmail,
    posthog,
    trackStepCompleted,
  }
}
