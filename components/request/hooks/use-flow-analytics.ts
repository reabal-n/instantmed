"use client"

import { useEffect, useMemo, useRef } from "react"

import { shouldTrackIntakeComplete } from "@/lib/analytics/funnel-milestones"
import {
  buildIntakeStepCompletedProperties,
  buildIntakeStepViewedProperties,
  captureIntakeEvent,
  INTAKE_ANALYTICS_EVENTS,
} from "@/lib/analytics/intake-events"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { onFirstInteraction } from "@/lib/browser/first-interaction"
import { canonicalizeServiceType } from "@/lib/request/draft-storage"
import type { StepDefinition, UnifiedServiceType } from "@/lib/request/step-registry"

import { useRequestStore } from "../store"

function trackStepEventDeferred(input: {
  stepName: string
  stepIndex: number
  serviceType: string
  totalSteps: number
}) {
  onFirstInteraction(() => {
    void import("@/lib/analytics/conversion-tracking")
      .then(({ trackStepEvent }) => trackStepEvent(input))
      .catch(() => {})
  })
}

function trackFunnelStepDeferred(
  step: "landing" | "start" | "intake_complete" | "checkout",
  serviceType: string,
  email?: string
) {
  onFirstInteraction(() => {
    void import("@/lib/analytics/conversion-tracking")
      .then(({ trackFunnelStep }) => {
        void trackFunnelStep(step, serviceType, email)
      })
      .catch(() => {})
  })
}

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
  // Latches intake_started to once per flow so back-navigation to step 1 does
  // not re-fire it and inflate the funnel denominator. Reset on serviceType
  // change alongside trackedFunnelEventsRef.
  const startedFiredRef = useRef(false)
  const stepEnteredAtRef = useRef<number>(Date.now())

  // Canonical service type for analytics (prescription/repeat-script -> 'prescription')
  const analyticsServiceType = useMemo(
    () => canonicalizeServiceType(serviceType) || serviceType || "unknown",
    [serviceType],
  )

  // Reset funnel event de-duplication state when changing flows.
  useEffect(() => {
    trackedFunnelEventsRef.current = new Set()
    startedFiredRef.current = false
  }, [serviceType])

  // Track step views in PostHog + generic gtag funnel_step analytics.
  useEffect(() => {
    if (currentStep && serviceType) {
      // Reset timer whenever the visible step changes
      stepEnteredAtRef.current = Date.now()

      const subtype = (answers.consultSubtype as string | undefined) ?? undefined
      const stepNumber = currentStepIndex + 1

      // intake_started fires exactly once per flow on the first step. The latch
      // prevents back-navigation to step 1 from re-firing it (which would
      // inflate the funnel denominator).
      if (stepNumber === 1 && !startedFiredRef.current) {
        startedFiredRef.current = true
        captureIntakeEvent(posthog, INTAKE_ANALYTICS_EVENTS.started, {
          service_type: analyticsServiceType,
          subtype,
        })
      }

      captureIntakeEvent(
        posthog,
        INTAKE_ANALYTICS_EVENTS.stepViewed,
        buildIntakeStepViewedProperties({
          serviceType: analyticsServiceType,
          stepId: currentStep.id,
          stepIndex: currentStepIndex,
          totalSteps,
          subtype,
        }),
      )

      // Fire a generic gtag funnel_step event for aggregate diagnostics only.
      // Do not use these health-flow events for Google Ads remarketing audiences.
      trackStepEventDeferred({
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
      trackFunnelStepDeferred("landing", analyticsServiceType, patientEmail)
      tracked.add("landing")
    }

    if (currentStepIndex === 0 && !tracked.has("start")) {
      trackFunnelStepDeferred("start", analyticsServiceType, patientEmail)
      tracked.add("start")
    }

    if (shouldTrackIntakeComplete({ currentStepId, serviceType }) && !tracked.has("intake_complete")) {
      trackFunnelStepDeferred("intake_complete", analyticsServiceType, patientEmail)
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

    captureIntakeEvent(
      posthog,
      INTAKE_ANALYTICS_EVENTS.stepCompleted,
      buildIntakeStepCompletedProperties({
        serviceType: analyticsServiceType,
        stepId: currentStepId,
        stepIndex: currentStepIndex,
        totalSteps,
        subtype,
        timeOnStepMs: timeOnStep,
      }),
    )

    return timeOnStep
  }

  return {
    analyticsServiceType,
    patientEmail,
    posthog,
    trackStepCompleted,
  }
}
