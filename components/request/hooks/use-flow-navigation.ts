"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"

import { trackFunnelStep } from "@/lib/analytics/conversion-tracking"
import { getConsultSubtypeFirstStep, getConsultSubtypeResetKeys } from "@/lib/request/consult-flow"
import type { StepDefinition, UnifiedServiceType } from "@/lib/request/step-registry"
import { evaluateSafety, type SafetyEvaluationResult } from "@/lib/safety"

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
  'consult-reason',         // General consult: after describing concern
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
    } else {
      router.back()
    }
  }, [currentStepIndex, currentStepId, analyticsServiceType, prevStep, router, posthog])

  const handleNext = useCallback(() => {
    trackStepCompleted()

    // Run safety pre-check when leaving key clinical steps.
    // Catches emergencies and hard blocks EARLY, before the patient invests
    // more time filling out details + payment. Full server-side check still
    // runs at checkout as a backstop.
    if (effectiveService && SAFETY_PRE_CHECK_STEPS.has(currentStepId)) {
      const slug = getSafetySlug(effectiveService, answers)
      const result = evaluateSafety(slug, answers)

      if (result.outcome === 'DECLINE' || result.outcome === 'REQUIRES_CALL') {
        posthog?.capture('safety_precheck_blocked', {
          service_type: analyticsServiceType,
          step_id: currentStepId,
          outcome: result.outcome,
          risk_tier: result.riskTier,
          triggered_rules: result.triggeredRules.map(r => r.ruleId),
        })
        setSafetyBlock(result)
        return // Don't advance — show safety block dialog
      }
    }

    nextStep()
  }, [trackStepCompleted, analyticsServiceType, currentStepId, nextStep, posthog, effectiveService, answers, setSafetyBlock])

  const handleComplete = useCallback(() => {
    posthog?.capture('request_flow_completed', {
      service_type: analyticsServiceType,
      total_steps: activeSteps.length,
      is_authenticated: isAuthenticated,
    })
    void trackFunnelStep('intake_complete', analyticsServiceType, patientEmail)
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
