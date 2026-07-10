"use client"

import { useEffect, useRef, useState } from "react"

// INTENTIONAL-navigation suppression for the beforeunload handler below.
// Without it, every successful payment fired `intake_abandoned_passive`: the
// redirect to Stripe Checkout is a page unload at the pay step, so paying
// customers were recorded as late-funnel abandoners — poisoning the exact
// metric the drop-off work optimises. Deliberate exits (handleExit) already
// emit the ACTIVE `intake_abandoned` event and must not double-count.
let intentionalNavigationInProgress = false

export function markIntentionalNavigation(): void {
  intentionalNavigationInProgress = true
}

/** Test seam — the module flag would otherwise leak between vitest cases. */
export function resetIntentionalNavigationForTests(): void {
  intentionalNavigationInProgress = false
}

export function isIntentionalNavigationInProgress(): boolean {
  return intentionalNavigationInProgress
}

interface UseUnsavedChangesOptions {
  answers: Record<string, unknown>
  /** Current step index - unsaved warnings only apply after the first step */
  currentStepIndex: number
  /** Current service type for abandonment tracking */
  serviceType: string | null
  /** Analytics service type (canonical) */
  analyticsServiceType: string
  /** Current step ID for abandonment tracking */
  currentStepId: string
  /** PostHog instance for passive abandonment beacon */
  posthog: { config?: { token?: string; api_host?: string }; get_distinct_id?: () => string } | null
}

/**
 * Tracks whether the user has unsaved answer changes and provides:
 * - `hasUnsavedChanges` / `setHasUnsavedChanges` state
 * - `showExitConfirm` / `setShowExitConfirm` dialog state
 * - `beforeunload` listener that warns on unsaved changes and fires
 *   a passive abandonment beacon via sendBeacon
 */
export function useUnsavedChanges({
  answers,
  currentStepIndex,
  serviceType,
  analyticsServiceType,
  currentStepId,
  posthog,
}: UseUnsavedChangesOptions) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // Track unsaved changes by comparing serialised answers
  const previousAnswersRef = useRef(JSON.stringify(answers))
  useEffect(() => {
    const currentAnswers = JSON.stringify(answers)
    if (currentAnswers !== previousAnswersRef.current) {
      setHasUnsavedChanges(true)
      previousAnswersRef.current = currentAnswers
      // Auto-save triggers after a short delay (handled by store persistence)
      const timer = setTimeout(() => setHasUnsavedChanges(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [answers])

  // Browser back button / unsaved changes warning + passive abandonment tracking
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Stripe-checkout redirects and deliberate exits are not abandonment —
      // skip both the beacon and the leave-site warning.
      if (intentionalNavigationInProgress) return

      // Track passive abandonment via sendBeacon (fires even on tab close)
      if (currentStepIndex > 0 && serviceType) {
        const payload = JSON.stringify({
          api_key: posthog?.config?.token,
          event: "intake_abandoned_passive",
          properties: {
            distinct_id: posthog?.get_distinct_id?.(),
            service_type: analyticsServiceType,
            step_id: currentStepId,
            step_number: currentStepIndex + 1,
          },
          timestamp: new Date().toISOString(),
        })
        navigator.sendBeacon?.(
          `${posthog?.config?.api_host ?? "https://us.i.posthog.com"}/capture/`,
          new Blob([payload], { type: "application/json" }),
        )
      }

      if (hasUnsavedChanges && currentStepIndex > 0) {
        e.preventDefault()
        e.returnValue = ""
        return ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges, currentStepIndex, serviceType, analyticsServiceType, currentStepId, posthog])

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    showExitConfirm,
    setShowExitConfirm,
  }
}
