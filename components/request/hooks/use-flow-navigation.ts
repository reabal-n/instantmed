"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef } from "react"

import {
  buildIntakeContinueClickedProperties,
  captureIntakeEvent,
  INTAKE_ANALYTICS_EVENTS,
} from "@/lib/analytics/intake-events"
import { getConsultSubtypeFirstStep, getConsultSubtypeResetKeys } from "@/lib/request/consult-flow"
import type { StepDefinition, UnifiedServiceType } from "@/lib/request/step-registry"
import type { SafetyEvaluationResult } from "@/lib/safety/types"

import { useRequestStore } from "../store"

// Map UnifiedServiceType → safety config slug for client-side pre-check.
// Must match server-side getServiceSlug() in lib/stripe/checkout.ts
function getSafetySlug(serviceType: UnifiedServiceType, answers: Record<string, unknown>): string {
  switch (serviceType) {
    case 'med-cert':
      return 'med-cert-sick'
    case 'prescription':
    case 'repeat-script':
      return 'common-scripts'
    case 'consult': {
      const subtype = answers.consultSubtype as string | undefined
      if (subtype === 'weight_loss') return 'weight-loss'
      if (subtype === 'ed') return 'consult'
      return 'consult'
    }
    default:
      return 'consult'
  }
}

// Steps that trigger a safety pre-check when completed.
// These are the first clinical steps per service — catch blocks early.
const SAFETY_PRE_CHECK_STEPS = new Set([
  'symptoms',               // med-cert: after symptom selection
  'medication',             // prescription/repeat-script: after medication selection
  'medical-history',        // shared: after medical history (catches drug interactions)
  'ed-health',              // ED consult: after health screening (nitrates, cardiac)
  'weight-loss-assessment', // Weight loss: after BMI/screening
])

interface PostHogLike {
  capture: (event: string, properties?: Record<string, unknown>) => void
}

interface UseFlowNavigationOptions {
  // URL props
  initialService: UnifiedServiceType | null
  initialSubtype?: string
  // From useFlowAnalytics
  posthog: PostHogLike | null | undefined
  analyticsServiceType: string
  patientEmail: string | undefined
  trackStepCompleted: () => void
  // Derived state (computed in parent)
  currentStepId: string
  currentStepIndex: number
  effectiveService: UnifiedServiceType | null
  answers: Record<string, unknown>
  activeSteps: StepDefinition[]
  isAuthenticated: boolean
  // Component state
  hasUnsavedChanges: boolean
  setShowExitConfirm: (v: boolean) => void
  setSafetyBlock: (v: SafetyEvaluationResult | null) => void
  draftSubtype: string | null
  setShowDraftBanner: (v: boolean) => void
  setShowSubtypeMismatch: (v: boolean) => void
}

/**
 * Encapsulates all navigation callbacks for the request flow:
 * step advancement, back navigation, exit handling, draft management,
 * service selection, and safety pre-checks.
 *
 * Imports the store directly (singleton). Accepts analytics values and
 * component state setters as params.
 */
export function useFlowNavigation({
  initialService,
  initialSubtype,
  posthog,
  analyticsServiceType,
  patientEmail,
  trackStepCompleted,
  currentStepId,
  currentStepIndex,
  effectiveService,
  answers,
  activeSteps,
  isAuthenticated,
  hasUnsavedChanges,
  setShowExitConfirm,
  setSafetyBlock,
  draftSubtype,
  setShowDraftBanner,
  setShowSubtypeMismatch,
}: UseFlowNavigationOptions) {
  const router = useRouter()
  const { nextStep, prevStep, goToStep, setServiceType, setAnswer, reset } = useRequestStore()

  // Tracks how many history.pushState entries we've added for step advances so the
  // popstate handler knows whether Back is "previous step" or "leave the flow".
  const flowHistoryDepth = useRef(0)
  // Set by handleBack before calling history.back() so the popstate handler
  // doesn't call prevStep() again (the step was already decremented by the click).
  const skippingPopState = useRef(false)
  // Always-current ref so the static popstate listener never captures a stale closure.
  const prevStepRef = useRef(prevStep)
  prevStepRef.current = prevStep

  useEffect(() => {
    const onPopState = () => {
      if (skippingPopState.current) {
        skippingPopState.current = false
        return
      }
      if (flowHistoryDepth.current > 0) {
        flowHistoryDepth.current--
        prevStepRef.current()
      }
      // depth === 0 → browser is navigating past the flow entirely; let it happen
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const clearConsultSubtypeAnswers = useCallback(() => {
    for (const key of getConsultSubtypeResetKeys()) {
      setAnswer(key, undefined)
    }
  }, [setAnswer])

  const handleBack = useCallback(() => {
    posthog?.capture('request_step_back', {
      service_type: analyticsServiceType,
      from_step: currentStepId,
      step_index: currentStepIndex,
    })
    if (currentStepIndex > 0) {
      prevStep()
      // Pop the matching history entry to keep the browser stack in sync.
      // Set the skip flag so the resulting popstate doesn't call prevStep() again.
      if (flowHistoryDepth.current > 0) {
        skippingPopState.current = true
        flowHistoryDepth.current--
        history.back()
      }
    } else {
      router.back()
    }
  }, [currentStepIndex, currentStepId, analyticsServiceType, prevStep, router, posthog])

  const handleNext = useCallback(async () => {
    captureIntakeEvent(
      posthog,
      INTAKE_ANALYTICS_EVENTS.continueClicked,
      buildIntakeContinueClickedProperties({
        serviceType: analyticsServiceType,
        stepId: currentStepId,
        stepIndex: currentStepIndex,
        totalSteps: activeSteps.length,
        subtype: (answers.consultSubtype as string | undefined) ?? undefined,
      }),
    )

    // Run safety pre-check when leaving key clinical steps.
    // Catches emergencies and hard blocks EARLY, before the patient invests
    // more time filling out details + payment. Full server-side check still
    // runs at checkout as a backstop.
    if (effectiveService && SAFETY_PRE_CHECK_STEPS.has(currentStepId)) {
      try {
        const slug = getSafetySlug(effectiveService, answers)
        const { evaluateSafety } = await import("@/lib/safety/evaluate")
        const result = evaluateSafety(slug, answers)

        if (result.outcome === 'DECLINE' || result.outcome === 'REQUIRES_CALL') {
          captureIntakeEvent(posthog, INTAKE_ANALYTICS_EVENTS.safetyPrecheckBlocked, {
            service_type: analyticsServiceType,
            step_id: currentStepId,
            outcome: result.outcome,
            risk_tier: result.riskTier,
            triggered_rules: result.triggeredRules.map(r => r.ruleId),
          })
          setSafetyBlock(result)
          return // Don't advance — show safety block dialog
        }
      } catch (err) {
        // Dynamic import failure (e.g. ChunkLoadError on flaky connection).
        // Fail open — proceed to next step; full server-side safety check runs at checkout.
        import("@sentry/nextjs").then(({ captureException }) => captureException(err)).catch(() => {})
      }
    }

    // Only count the step as completed once the safety pre-check has passed and
    // the step actually advances — firing before the early-return above would
    // over-count completions on friction-prone clinical steps (a DECLINE /
    // REQUIRES_CALL block keeps the patient on the step).
    trackStepCompleted()

    nextStep()
    // Push a history entry so the browser's Back button maps to "previous step"
    // rather than "leave the flow entirely". The popstate listener calls prevStep()
    // to sync Zustand when the browser pops this entry.
    history.pushState({ instantmedFlow: true }, '')
    flowHistoryDepth.current++
  }, [trackStepCompleted, analyticsServiceType, currentStepId, currentStepIndex, activeSteps.length, nextStep, posthog, effectiveService, answers, setSafetyBlock])

  const handleComplete = useCallback(() => {
    posthog?.capture('request_flow_completed', {
      service_type: analyticsServiceType,
      total_steps: activeSteps.length,
      is_authenticated: isAuthenticated,
    })
    void import("@/lib/analytics/conversion-tracking").then(({ trackFunnelStep }) => {
      void trackFunnelStep('intake_complete', analyticsServiceType, patientEmail)
    })
    router.push('/patient/intakes/success')
  }, [analyticsServiceType, activeSteps.length, isAuthenticated, router, posthog, patientEmail])

  const handleExit = useCallback(() => {
    const subtype = (answers.consultSubtype as string | undefined) ?? undefined
    posthog?.capture('intake_abandoned', {
      service_type: analyticsServiceType,
      step_id: currentStepId,
      step_number: currentStepIndex + 1,
      subtype,
    })
    // Full page navigation to avoid white-page from layout mismatch
    window.location.href = '/'
  }, [analyticsServiceType, currentStepId, currentStepIndex, answers.consultSubtype, posthog])

  const handleRestoreDraft = useCallback(() => {
    setShowDraftBanner(false)
    posthog?.capture('request_draft_restored', { service_type: analyticsServiceType })
  }, [analyticsServiceType, posthog, setShowDraftBanner])

  const handleDiscardDraft = useCallback(() => {
    setShowDraftBanner(false)
    reset()
    if (initialService) setServiceType(initialService)
    posthog?.capture('request_draft_discarded', { service_type: analyticsServiceType })
  }, [reset, initialService, setServiceType, analyticsServiceType, posthog, setShowDraftBanner])

  const handleResumeDraft = useCallback(() => {
    setShowSubtypeMismatch(false)
    if (draftSubtype) {
      router.replace(`/request?service=consult&subtype=${draftSubtype}`)
    }
    posthog?.capture('consult_draft_resumed', {
      service_type: analyticsServiceType,
      draft_subtype: draftSubtype,
      url_subtype: initialSubtype,
    })
  }, [draftSubtype, initialSubtype, analyticsServiceType, router, posthog, setShowSubtypeMismatch])

  const handleStartFreshSubtype = useCallback(() => {
    setShowSubtypeMismatch(false)
    clearConsultSubtypeAnswers()
    setAnswer('consultSubtype', initialSubtype)
    goToStep(getConsultSubtypeFirstStep(initialSubtype))
    posthog?.capture('consult_draft_cleared_for_new_subtype', {
      service_type: analyticsServiceType,
      old_subtype: draftSubtype,
      new_subtype: initialSubtype,
    })
  }, [
    initialSubtype,
    draftSubtype,
    analyticsServiceType,
    clearConsultSubtypeAnswers,
    setAnswer,
    goToStep,
    posthog,
    setShowSubtypeMismatch,
  ])

  const handleStepClick = useCallback((stepId: string, stepIndex: number) => {
    if (stepIndex === currentStepIndex) return
    posthog?.capture('request_step_jumped', {
      service_type: analyticsServiceType,
      from_step: currentStepId,
      to_step: stepId,
      from_index: currentStepIndex,
      to_index: stepIndex,
    })
    goToStep(stepId as Parameters<typeof goToStep>[0])
  }, [currentStepIndex, currentStepId, analyticsServiceType, goToStep, posthog])

  const handleExitWithConfirm = useCallback(() => {
    if (hasUnsavedChanges && currentStepIndex > 0) {
      setShowExitConfirm(true)
    } else {
      handleExit()
    }
  }, [hasUnsavedChanges, currentStepIndex, handleExit, setShowExitConfirm])

  const confirmExit = useCallback(() => {
    setShowExitConfirm(false)
    handleExit()
  }, [handleExit, setShowExitConfirm])

  const handleSelectService = useCallback((service: UnifiedServiceType, consultSubtype?: string) => {
    setServiceType(service)
    // Set consultSubtype so step registry branches correctly on client-side hub navigation.
    // (The mount-only effect handles direct URL navigation; hub navigation doesn't remount.)
    if (service === 'consult' && consultSubtype) {
      const currentSubtype = answers.consultSubtype as string | undefined
      if (currentSubtype !== consultSubtype) {
        clearConsultSubtypeAnswers()
      }
      setAnswer('consultSubtype', consultSubtype)
      goToStep(getConsultSubtypeFirstStep(consultSubtype))
      router.push(`/request?service=${service}&subtype=${consultSubtype}`)
    } else {
      router.push(`/request?service=${service}`)
    }
  }, [answers.consultSubtype, clearConsultSubtypeAnswers, setServiceType, setAnswer, goToStep, router])

  return {
    handleBack,
    handleNext,
    handleComplete,
    handleExit,
    handleRestoreDraft,
    handleDiscardDraft,
    handleResumeDraft,
    handleStartFreshSubtype,
    handleStepClick,
    handleExitWithConfirm,
    confirmExit,
    handleSelectService,
  }
}
