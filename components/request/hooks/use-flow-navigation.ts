"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef } from "react"

import {
  buildIntakeContinueClickedProperties,
  captureIntakeEvent,
  INTAKE_ANALYTICS_EVENTS,
} from "@/lib/analytics/intake-events"
import { getConsultSubtypeResetKeys } from "@/lib/request/consult-flow"
import type { StepDefinition, UnifiedServiceType } from "@/lib/request/step-registry"
import type { SafetyEvaluationResult } from "@/lib/safety/types"

import { type RequestProfilePrefill, useRequestStore } from "../store"
import { markIntentionalNavigation } from "./use-unsaved-changes"

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
  dismissDraftNotice: () => void
  setShowSubtypeMismatch: (v: boolean) => void
  profilePrefill: RequestProfilePrefill
  onDraftDiscarded: () => void
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
  dismissDraftNotice,
  setShowSubtypeMismatch,
  profilePrefill,
  onDraftDiscarded,
}: UseFlowNavigationOptions) {
  const router = useRouter()
  const {
    flowInstanceId,
    nextStep,
    prevStep,
    goToStep,
    setServiceType,
    setAnswer,
    discardCurrentDraft,
  } = useRequestStore()

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
      flow_instance_id: flowInstanceId,
      from_step: currentStepId,
      step_index: currentStepIndex,
    })
    const isEditingSkippedStep = !activeSteps.some((step) => step.id === currentStepId)
    if (isEditingSkippedStep) {
      // The skipped-step store guard keeps a materially edited Details screen
      // open until its validated Continue succeeds. An unchanged edit can
      // safely return to review without leaving the request flow.
      prevStep()
    } else if (currentStepIndex > 0) {
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
  }, [currentStepIndex, currentStepId, analyticsServiceType, activeSteps, prevStep, router, posthog, flowInstanceId])

  const handleNext = useCallback(async () => {
    captureIntakeEvent(
      posthog,
      INTAKE_ANALYTICS_EVENTS.continueClicked,
      buildIntakeContinueClickedProperties({
        flowInstanceId,
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
            flow_instance_id: flowInstanceId,
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
  }, [trackStepCompleted, analyticsServiceType, currentStepId, currentStepIndex, activeSteps.length, nextStep, posthog, effectiveService, answers, setSafetyBlock, flowInstanceId])

  const handleComplete = useCallback(() => {
    posthog?.capture('request_flow_completed', {
      service_type: analyticsServiceType,
      flow_instance_id: flowInstanceId,
      total_steps: activeSteps.length,
      is_authenticated: isAuthenticated,
    })
    void import("@/lib/analytics/conversion-tracking").then(({ trackFunnelStep }) => {
      void trackFunnelStep('intake_complete', analyticsServiceType, patientEmail)
    })
    router.push('/patient/intakes/success')
  }, [analyticsServiceType, activeSteps.length, isAuthenticated, router, posthog, patientEmail, flowInstanceId])

  const handleExit = useCallback(() => {
    const subtype = (answers.consultSubtype as string | undefined) ?? undefined
    posthog?.capture('intake_abandoned', {
      service_type: analyticsServiceType,
      flow_instance_id: flowInstanceId,
      step_id: currentStepId,
      step_number: currentStepIndex + 1,
      subtype,
    })
    // Deliberate exit already emitted the ACTIVE abandonment event above —
    // don't let the unload beacon double-count it as passive abandonment.
    markIntentionalNavigation()
    // Full page navigation to avoid white-page from layout mismatch
    window.location.href = '/'
  }, [analyticsServiceType, currentStepId, currentStepIndex, answers.consultSubtype, posthog, flowInstanceId])

  const handleDiscardDraft = useCallback(() => {
    dismissDraftNotice()
    discardCurrentDraft(profilePrefill)
    // Discard wipes consultSubtype, and for a consult the step list is EMPTY
    // without one — before this re-seed, Discard on any consult deep link
    // (/request?service=consult&subtype=ed) stranded the patient on a
    // permanent spinner at a $49.95 entry. Seed it BEFORE selecting the
    // service so setServiceType can resolve the first step without a
    // patient-work navigation stamp.
    if (initialService === 'consult' && initialSubtype) {
      setAnswer('consultSubtype', initialSubtype, { touch: false })
    }
    if (initialService) setServiceType(initialService)
    onDraftDiscarded()
    posthog?.capture('request_draft_discarded', {
      service_type: analyticsServiceType,
      flow_instance_id: flowInstanceId,
    })
  }, [dismissDraftNotice, discardCurrentDraft, profilePrefill, initialService, initialSubtype, setServiceType, setAnswer, onDraftDiscarded, analyticsServiceType, posthog, flowInstanceId])

  const handleResumeDraft = useCallback(() => {
    setShowSubtypeMismatch(false)
    if (draftSubtype) {
      router.replace(`/request?service=consult&subtype=${draftSubtype}`)
    }
    posthog?.capture('consult_draft_resumed', {
      service_type: analyticsServiceType,
      flow_instance_id: flowInstanceId,
      draft_subtype: draftSubtype,
      url_subtype: initialSubtype,
    })
  }, [draftSubtype, initialSubtype, analyticsServiceType, router, posthog, setShowSubtypeMismatch, flowInstanceId])

  const handleStartFreshSubtype = useCallback(() => {
    setShowSubtypeMismatch(false)
    discardCurrentDraft(profilePrefill)
    setAnswer('consultSubtype', initialSubtype, { touch: false })
    setServiceType('consult')
    posthog?.capture('consult_draft_cleared_for_new_subtype', {
      service_type: analyticsServiceType,
      flow_instance_id: flowInstanceId,
      old_subtype: draftSubtype,
      new_subtype: initialSubtype,
    })
  }, [
    initialSubtype,
    draftSubtype,
    analyticsServiceType,
    discardCurrentDraft,
    profilePrefill,
    setServiceType,
    setAnswer,
    posthog,
    setShowSubtypeMismatch,
    flowInstanceId,
  ])

  const handleStepClick = useCallback((stepId: string, stepIndex: number) => {
    if (stepIndex === currentStepIndex) return
    posthog?.capture('request_step_jumped', {
      service_type: analyticsServiceType,
      flow_instance_id: flowInstanceId,
      from_step: currentStepId,
      to_step: stepId,
      from_index: currentStepIndex,
      to_index: stepIndex,
    })
    goToStep(stepId as Parameters<typeof goToStep>[0])
  }, [currentStepIndex, currentStepId, analyticsServiceType, goToStep, posthog, flowInstanceId])

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
      const restoredSubtype = useRequestStore.getState().answers.consultSubtype as string | undefined
      if (restoredSubtype !== consultSubtype) {
        // setServiceType may have restored a target-service draft. If the
        // patient chose a different subtype, that is a genuinely fresh
        // attempt: retire the old local/server flow before seeding the new one.
        if (restoredSubtype || effectiveService === service) {
          discardCurrentDraft(profilePrefill)
        } else {
          clearConsultSubtypeAnswers()
        }
        setAnswer('consultSubtype', consultSubtype, { touch: false })
        // Re-run same-service resolution now that the subtype exists. This
        // selects the first subtype step without stamping passive route state
        // as patient work or creating an email-eligible empty draft.
        setServiceType(service)
      }
      router.push(`/request?service=${service}&subtype=${consultSubtype}`)
    } else {
      router.push(`/request?service=${service}`)
    }
  }, [clearConsultSubtypeAnswers, discardCurrentDraft, effectiveService, profilePrefill, setServiceType, setAnswer, router])

  return {
    handleBack,
    handleNext,
    handleComplete,
    handleExit,
    handleDiscardDraft,
    handleResumeDraft,
    handleStartFreshSubtype,
    handleStepClick,
    handleExitWithConfirm,
    confirmExit,
    handleSelectService,
  }
}
