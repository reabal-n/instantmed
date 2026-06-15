"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import {
  buildIntakeValidationBlockedProperties,
  captureIntakeEvent,
  INTAKE_ANALYTICS_EVENTS,
  type PostHogCaptureLike,
} from "@/lib/analytics/intake-events"

interface ValidationSummaryAnalytics {
  posthog?: PostHogCaptureLike | null
  serviceType?: string | null
  /**
   * Consult subtype (ed / hair_loss / …) for consult-subtype steps. Must match
   * the value the step_viewed / step_completed events carry (answers.consultSubtype)
   * so intake_validation_blocked lands in the same funnel bucket — otherwise the
   * blocked count splits into a null-subtype row.
   */
  subtype?: string
  stepId: string
  stepIndex?: number
  totalSteps?: number
}

/**
 * Manages the "add these to continue" blocking-reason summary shown when a
 * patient taps Continue before a step is complete.
 *
 * Keeping the button always-clickable (no disabled prop) prevents silent
 * grey-out dead ends on mobile — especially in the sticky CTA — where the
 * only feedback would otherwise be "nothing happened." The button uses
 * variant="secondary" when incomplete and the summary tells the patient
 * exactly what to fill in.
 *
 * Once the patient has tapped Continue at least once ("attempted"), the
 * summary recomputes live as they fill fields — resolved blockers disappear
 * immediately without needing another tap.
 *
 * Usage:
 *   const { validationSummary, showBlockingReasons } = useStepValidationSummary(
 *     isComplete,
 *     useCallback(() => {
 *       const reasons: string[] = []
 *       if (!field) reasons.push("the field label")
 *       return reasons
 *     }, [field])
 *   )
 *
 *   // In handleNext:
 *   if (!isComplete) { showBlockingReasons(); return }
 *   onNext()
 *
 *   // In JSX (above the button):
 *   {validationSummary.length > 0 && (
 *     <Alert variant="destructive" role="alert" aria-live="assertive">
 *       <AlertDescription>
 *         {validationSummary.length === 1 ? "Add this to continue: " : "Add these to continue: "}
 *         {validationSummary.join(", ")}.
 *       </AlertDescription>
 *     </Alert>
 *   )}
 */
export function useStepValidationSummary(
  canContinue: boolean,
  computeReasons: () => string[],
  analytics?: ValidationSummaryAnalytics,
) {
  const [hasAttempted, setHasAttempted] = useState(false)

  // Recompute live once the patient has attempted — resolved blockers clear immediately
  const liveReasons = useMemo(
    () => (hasAttempted && !canContinue ? computeReasons() : []),
      [hasAttempted, canContinue, computeReasons]
  )

  // Clear attempted state when the step becomes completable so the alert doesn't
  // flash back if the patient undoes an answer on another visit to this step
  useEffect(() => {
    if (canContinue) setHasAttempted(false)
  }, [canContinue])

  const showBlockingReasons = useCallback(() => {
    setHasAttempted(true)
    const blockers = computeReasons()
    if (blockers.length > 0 && analytics) {
      captureIntakeEvent(
        analytics.posthog,
        INTAKE_ANALYTICS_EVENTS.validationBlocked,
        buildIntakeValidationBlockedProperties({
          serviceType: analytics.serviceType,
          subtype: analytics.subtype,
          stepId: analytics.stepId,
          stepIndex: analytics.stepIndex,
          totalSteps: analytics.totalSteps,
          blockers,
        }),
      )
    }
  }, [analytics, computeReasons])

  return { validationSummary: liveReasons, showBlockingReasons }
}
