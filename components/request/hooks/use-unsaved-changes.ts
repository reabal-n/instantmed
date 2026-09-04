"use client"

import { useEffect, useRef, useState } from "react"

import { buildPassiveAbandonmentBeacon } from "@/lib/analytics/intake-events"

// INTENTIONAL-navigation suppression for the beforeunload handler below.
// Without it, every successful payment fired `intake_abandoned_passive`: the
// redirect to Stripe Checkout is a page unload at the pay step, so paying
// customers were recorded as late-funnel abandoners — poisoning the exact
// metric the drop-off work optimises. Deliberate exits (handleExit) already
// emit the ACTIVE `intake_abandoned` event and must not double-count.
let intentionalNavigationInProgress = false

interface IntentionalFlowDestination {
  entryRef: "womens-health-repeat-handoff"
  serviceType: "repeat-script"
}

const WOMENS_HEALTH_REPEAT_HANDOFF_DESTINATION: IntentionalFlowDestination = {
  entryRef: "womens-health-repeat-handoff",
  serviceType: "repeat-script",
}

let pendingIntentionalFlowDestination: IntentionalFlowDestination | null = null

export function markIntentionalNavigation(): void {
  intentionalNavigationInProgress = true
  pendingIntentionalFlowDestination = null
}

function markIntentionalNavigationToFlowDestination(
  destination: IntentionalFlowDestination,
): void {
  intentionalNavigationInProgress = true
  pendingIntentionalFlowDestination = destination
}

/** Clear the transition latch after the destination flow has mounted. */
function clearIntentionalNavigation(): void {
  intentionalNavigationInProgress = false
  pendingIntentionalFlowDestination = null
}

export interface WomensHealthRepeatHandoffAttemptGate {
  current: string | null
}

/**
 * Claim the current-pill handoff synchronously before navigation starts.
 * Desktop and mobile actions share the same ref-backed gate, so rapid repeat
 * activation cannot duplicate either the durable steer event or navigation.
 * A synchronous navigation failure releases both latches for a real retry.
 */
export function runWomensHealthRepeatHandoffOnce({
  attemptKey,
  capture,
  gate,
  navigate,
}: {
  attemptKey: string
  capture: () => void
  gate: WomensHealthRepeatHandoffAttemptGate
  navigate: () => void
}): boolean {
  // Hydration can replace the initial `unscoped` key with a real flow ID while
  // the same navigation is still in flight. Any active claim belongs to this
  // mounted source step, irrespective of that key refinement.
  if (gate.current !== null) return false

  gate.current = attemptKey
  markIntentionalNavigationToFlowDestination(
    WOMENS_HEALTH_REPEAT_HANDOFF_DESTINATION,
  )

  try {
    navigate()
  } catch {
    gate.current = null
    clearIntentionalNavigation()
    return false
  }

  capture()
  return true
}

/**
 * Complete a same-route handoff only once a real destination flow exists. This
 * keeps the source protected during navigation while ensuring a later exit
 * from the destination is measured normally.
 */
export function completeIntentionalNavigationAtFlowDestination({
  entryRef,
  serviceType,
}: {
  entryRef: string | null
  flowInstanceId: string | null
  serviceType: string | null
}): void {
  const pendingDestination = pendingIntentionalFlowDestination
  if (!pendingDestination) return
  if (
    serviceType !== pendingDestination.serviceType
    || entryRef !== pendingDestination.entryRef
  ) return

  clearIntentionalNavigation()
}

/** Test seam — the module flag would otherwise leak between vitest cases. */
export function resetIntentionalNavigationForTests(): void {
  clearIntentionalNavigation()
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
  /** Opaque identifier for this intake attempt. */
  flowInstanceId: string | null
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
  flowInstanceId,
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

      // Track passive abandonment via sendBeacon (fires even on tab close).
      // PostHog is intentionally disabled in E2E and can fail to initialize in
      // real browsers, so never send an unauthenticated fallback request.
      const beacon = buildPassiveAbandonmentBeacon({
        analyticsServiceType,
        currentStepId,
        currentStepIndex,
        flowInstanceId,
        posthog,
        serviceType,
      })
      if (beacon) {
        navigator.sendBeacon?.(
          beacon.url,
          new Blob([beacon.payload], { type: "application/json" }),
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
  }, [hasUnsavedChanges, currentStepIndex, serviceType, analyticsServiceType, currentStepId, posthog, flowInstanceId])

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    showExitConfirm,
    setShowExitConfirm,
  }
}
