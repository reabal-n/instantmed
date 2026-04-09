"use client"

/**
 * Request Flow - Main orchestration component for unified /request
 * 
 * Handles:
 * - Service type initialization
 * - Step navigation with auth context
 * - Progress tracking with checkmarks
 * - Animated transitions between steps
 * - Swipe gestures for mobile navigation
 * - Auto-save indicator
 * - Unsaved changes warning
 * - PostHog analytics
 * - Draft restoration
 * - Error boundaries
 * - Flow completion
 */

import { useEffect, useCallback, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, X } from "lucide-react"
import { usePostHog } from "@/components/providers/posthog-provider"
import { motion, AnimatePresence, useMotionValue, type PanInfo } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Button } from "@/components/ui/button"
import { StepRouter } from "./step-router"
import { ServiceHubScreen } from "./service-hub-screen"
import { useRequestStore } from "./store"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import { ConnectionBanner } from "./connection-banner"
import { ProgressBar } from "@/components/request/progress-bar"
import { AutoSaveIndicator } from "@/components/request/auto-save-indicator"
import { TimeRemaining } from "@/components/request/time-remaining"
import { DraftRestorationBanner } from "@/components/request/draft-restoration-banner"
import { SubtypeMismatchBanner } from "@/components/request/subtype-mismatch-banner"
import { SafetyBlockDialog } from "@/components/request/safety-block-dialog"
import { ExitConfirmDialog } from "@/components/request/exit-confirm-dialog"
import {
  getStepsForService,
  getStepDefinitionById,
  type UnifiedServiceType,
  type UnifiedStepId,
  type StepContext,
} from "@/lib/request/step-registry"
import { canonicalizeServiceType } from "@/lib/request/draft-storage"
import { evaluateSafety, type SafetyEvaluationResult } from "@/lib/safety"
import { trackFunnelStep } from "@/lib/analytics/conversion-tracking"
import { isValidCertCategory } from "@/lib/marketing/med-cert-selector"

// Map UnifiedServiceType → safety config slug for client-side pre-check
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

// Steps that trigger a safety pre-check when completed
// These are the first clinical steps per service — catch blocks early
const SAFETY_PRE_CHECK_STEPS = new Set([
  'symptoms',          // med-cert: after symptom selection
  'medication',        // prescription/repeat-script: after medication selection
  'medical-history',   // shared: after medical history (catches drug interactions)
  'ed-health',         // ED consult: after health screening (nitrates, cardiac, medical history)
  'weight-loss-assessment', // Weight loss: after BMI/screening
  'consult-reason',    // General consult: after describing concern
])

interface HealthProfilePrefill {
  allergies?: string[]
  conditions?: string[]
  current_medications?: string[]
}

interface RequestFlowProps {
  /** Service from URL param. null = invalid param was provided */
  initialService: UnifiedServiceType | null
  /** Raw service param from URL (for error messages) */
  rawServiceParam?: string
  /** Subtype from URL (e.g., 'new-medication' for consult handoff) */
  initialSubtype?: string
  /** Medication context from URL (for consult handoff from prescription flow) */
  initialMedication?: string
  /** Certificate type from URL (pre-seeded from landing page selector) */
  initialCertType?: string
  isAuthenticated: boolean
  hasProfile: boolean
  /** Profile has complete identity (incl. date_of_birth) — details step can be skipped */
  hasCompleteIdentity?: boolean
  hasMedicare: boolean
  hasAddress: boolean
  /** Profile has a phone number — required for prescriptions + consults */
  hasPhone?: boolean
  /** User email for pre-filling */
  userEmail?: string
  /** User name for pre-filling */
  userName?: string
  /** User phone for pre-filling */
  userPhone?: string
  /** Profile date of birth for pre-filling (decrypted) */
  profileDateOfBirth?: string
  /** Profile Medicare number for pre-filling */
  profileMedicare?: string
  /** Profile address for pre-filling */
  profileAddress?: { addressLine1: string; suburb: string; state: string; postcode: string }
  /** Health profile data for pre-filling medical history steps */
  healthProfile?: HealthProfilePrefill | null
}


export function RequestFlow({
  initialService,
  rawServiceParam,
  initialSubtype,
  initialMedication,
  initialCertType,
  isAuthenticated,
  hasProfile,
  hasCompleteIdentity,
  hasMedicare,
  hasAddress,
  hasPhone,
  userEmail,
  userName,
  userPhone,
  profileDateOfBirth,
  profileMedicare,
  profileAddress,
  healthProfile,
}: RequestFlowProps) {
  const router = useRouter()
  const posthog = usePostHog()
  const prefersReducedMotion = useReducedMotion()
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [showSubtypeMismatch, setShowSubtypeMismatch] = useState(false)
  const [draftSubtype, setDraftSubtype] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [safetyBlock, setSafetyBlock] = useState<SafetyEvaluationResult | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const dragX = useMotionValue(0)
  const trackedFunnelEventsRef = useRef<Set<string>>(new Set())
  // Track time spent on each step for step_completed time_on_step_ms
  const stepEnteredAtRef = useRef<number>(Date.now())
  
  const {
    serviceType,
    currentStepId,
    direction,
    setServiceType,
    nextStep,
    prevStep,
    goToStep,
    answers,
    phone,
    setAnswer,
    setIdentity,
    setAuthContext,
    lastSavedAt,
    reset,
  } = useRequestStore()
  
  // Rehydrate persisted store after mount (SSR-safe pattern).
  // The store uses skipHydration:true to avoid a server/client mismatch on first render.
  useEffect(() => {
    useRequestStore.persist.rehydrate()
  }, [])

  // Track unsaved changes
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

  // Initialize auth context in store for step navigation
  useEffect(() => {
    setAuthContext({ isAuthenticated, hasProfile, hasCompleteIdentity: hasCompleteIdentity ?? hasProfile, hasMedicare, hasAddress, hasPhone })
  }, [isAuthenticated, hasProfile, hasCompleteIdentity, hasMedicare, hasAddress, hasPhone, setAuthContext])

  // Pre-fill identity from auth if available
  useEffect(() => {
    if (userEmail && !answers.email) {
      setIdentity({ email: userEmail })
    }
    if (userName) {
      const [firstName, ...lastParts] = userName.split(' ')
      setIdentity({ 
        firstName: firstName || '',
        lastName: lastParts.join(' ') || '',
      })
    }
    if (userPhone && !phone) {
      setIdentity({ phone: userPhone })
    }
    if (profileDateOfBirth) {
      setIdentity({ dob: profileDateOfBirth })
    }
    // Pre-fill Medicare from profile
    if (profileMedicare && !answers.medicareNumber) {
      setAnswer('medicareNumber', profileMedicare)
    }
    // Pre-fill address from profile
    if (profileAddress && !answers.addressLine1) {
      setAnswer('addressLine1', profileAddress.addressLine1)
      setAnswer('suburb', profileAddress.suburb)
      setAnswer('state', profileAddress.state)
      setAnswer('postcode', profileAddress.postcode)
    }
  }, [userEmail, userName, userPhone, profileDateOfBirth, profileMedicare, profileAddress, answers.email, answers.medicareNumber, answers.addressLine1, phone, setIdentity, setAnswer])

  // Pre-fill medical history from health profile
  useEffect(() => {
    if (!healthProfile) return
    // Only pre-fill if the fields haven't been filled yet
    if (healthProfile.allergies?.length && !answers.known_allergies) {
      setAnswer('known_allergies', healthProfile.allergies.join(', '))
      setAnswer('has_allergies', 'yes')
    }
    if (healthProfile.conditions?.length && !answers.existing_conditions) {
      setAnswer('existing_conditions', healthProfile.conditions.join(', '))
      setAnswer('has_conditions', 'yes')
    }
    if (healthProfile.current_medications?.length && !answers.current_medications) {
      setAnswer('current_medications', healthProfile.current_medications.join(', '))
      setAnswer('takes_medications', 'yes')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthProfile])

  // Initialize service type from URL param
  // IMPORTANT: URL param is the source of truth for which service to show
  // We do NOT reset other service drafts - they are preserved in service-scoped storage
  useEffect(() => {
    if (initialService && serviceType !== initialService) {
      // Set the service type to match URL - drafts for THIS service will be loaded
      // from service-scoped storage. Other service drafts remain untouched.
      setServiceType(initialService)
    }
  }, [initialService, serviceType, setServiceType])

  // Apply URL context params for consult handoff (survives refresh)
  // Also detect subtype mismatch between draft and URL
  useEffect(() => {
    if (initialService === 'consult' && initialSubtype) {
      const storedSubtype = answers.consultSubtype as string | undefined
      
      // Check for subtype mismatch - draft has different subtype than URL
      if (storedSubtype && storedSubtype !== initialSubtype && lastSavedAt) {
        // Show mismatch banner instead of silently overwriting
        setDraftSubtype(storedSubtype)
        setShowSubtypeMismatch(true)
        return // Don't auto-apply URL subtype - let user decide
      }
      
      // No mismatch or no existing draft - apply URL subtype
      setAnswer('consultSubtype', initialSubtype)
      
      // If medication context is provided, prefill consult details
      if (initialMedication && !answers.consultDetails) {
        const decodedMedication = decodeURIComponent(initialMedication)
        setAnswer('consultDetails', `I would like to discuss getting a prescription for ${decodedMedication}.`)
      }
    }
  // Only run on mount - URL params are the source of truth
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pre-seed cert type from URL param (from landing page selector)
  useEffect(() => {
    if (initialService === 'med-cert' && initialCertType && !answers.certType) {
      if (isValidCertCategory(initialCertType)) {
        setAnswer('certType', initialCertType)
      }
    }
  // Only run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Dev sanity check: trace service routing on mount
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      posthog?.capture('$debug_request_flow_mount', {
        initialService,
        rawServiceParam,
        storeServiceType: serviceType,
        currentStepId,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Check for existing draft on mount
  useEffect(() => {
    if (lastSavedAt && serviceType) {
      const savedTime = new Date(lastSavedAt).getTime()
      const now = Date.now()
      const hoursSinceSave = (now - savedTime) / (1000 * 60 * 60)
      
      // Show banner if draft is less than 24 hours old
      if (hoursSinceSave < 24 && currentStepId !== 'review') {
        setShowDraftBanner(true)
      }
    }
  }, [lastSavedAt, serviceType, currentStepId])

  // Use initialService as fallback during hydration
  const effectiveService = serviceType || initialService
  
  // Build step context with auth state
  const stepContext: StepContext = useMemo(() => ({
    isAuthenticated,
    hasProfile,
    hasCompleteIdentity: hasCompleteIdentity ?? hasProfile,
    hasMedicare,
    hasAddress,
    hasPhone,
    serviceType: effectiveService || 'med-cert',
    answers,
  }), [isAuthenticated, hasProfile, hasCompleteIdentity, hasMedicare, hasAddress, hasPhone, effectiveService, answers])

  // Get active steps for current service
  const activeSteps = useMemo(() => {
    if (!effectiveService) return []
    return getStepsForService(effectiveService, stepContext)
  }, [effectiveService, stepContext])

  // Canonical service type for analytics (prescription/repeat-script -> 'prescription')
  const analyticsServiceType = useMemo(() => 
    canonicalizeServiceType(serviceType) || serviceType || 'unknown',
    [serviceType]
  )

  // Reset funnel event de-duplication state when changing flows.
  useEffect(() => {
    trackedFunnelEventsRef.current = new Set()
  }, [serviceType])

  // Find current step index - default to first step if current step not found
  const currentStepIndex = useMemo(() => {
    const index = activeSteps.findIndex(s => s.id === currentStepId)
    return index >= 0 ? index : 0
  }, [activeSteps, currentStepId])

  // When currentStepId is not in activeSteps, check if it's a skipped step we can render for editing
  // (e.g. user clicked "Edit" on Your Details when details was skipped)
  const editModeStep = useMemo(() => {
    if (activeSteps.some(s => s.id === currentStepId)) return null
    return getStepDefinitionById(effectiveService || 'med-cert', currentStepId as UnifiedStepId, stepContext)
  }, [activeSteps, currentStepId, effectiveService, stepContext])

  // Sync store's currentStepId when it doesn't exist in the active steps list.
  // Exception: when editModeStep exists, user explicitly navigated to edit a skipped step — don't redirect
  useEffect(() => {
    if (editModeStep) return
    if (activeSteps.length > 0 && !activeSteps.some(s => s.id === currentStepId)) {
      goToStep(activeSteps[0].id as UnifiedStepId)
    }
  }, [activeSteps, currentStepId, goToStep, editModeStep])

  // Get current step definition — use editModeStep when editing a skipped step
  const currentStep = editModeStep ?? (activeSteps.length > 0 ? activeSteps[currentStepIndex] : null)

  // Track step views in PostHog
  useEffect(() => {
    if (currentStep && serviceType) {
      // Reset timer whenever the visible step changes
      stepEnteredAtRef.current = Date.now()

      const subtype = (answers.consultSubtype as string | undefined) ?? undefined
      const stepNumber = currentStepIndex + 1

      // intake_started fires once per flow on the first step
      if (stepNumber === 1) {
        posthog?.capture('intake_started', {
          service_type: analyticsServiceType,
          subtype,
        })
      }

      posthog?.capture('step_viewed', {
        service_type: analyticsServiceType,
        step_id: currentStep.id,
        step_number: stepNumber,
        subtype,
      })
    }
  // answers.consultSubtype intentionally excluded — only track on step/service change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, serviceType, analyticsServiceType, currentStepIndex, posthog])

  // Track Google Ads funnel milestones once per flow.
  useEffect(() => {
    if (!currentStep || !serviceType) return

    const tracked = trackedFunnelEventsRef.current

    if (!tracked.has('landing')) {
      trackFunnelStep('landing', analyticsServiceType)
      tracked.add('landing')
    }

    if (currentStepIndex === 0 && !tracked.has('start')) {
      trackFunnelStep('start', analyticsServiceType)
      tracked.add('start')
    }

    if (currentStepId === 'checkout' && !tracked.has('intake_complete')) {
      trackFunnelStep('intake_complete', analyticsServiceType)
      tracked.add('intake_complete')
    }
  }, [currentStep, serviceType, currentStepIndex, currentStepId, analyticsServiceType])

  // Handle back navigation with tracking
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

  // Handle next navigation with tracking + safety pre-check
  const handleNext = useCallback(() => {
    const subtype = (answers.consultSubtype as string | undefined) ?? undefined
    posthog?.capture('step_completed', {
      service_type: analyticsServiceType,
      step_id: currentStepId,
      step_number: currentStepIndex + 1,
      subtype,
      time_on_step_ms: Date.now() - stepEnteredAtRef.current,
    })

    // Run safety pre-check when leaving key clinical steps
    // This catches emergencies and hard blocks EARLY, before the patient
    // invests more time filling out details + payment info.
    // Full server-side check still runs at checkout as a backstop.
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
  }, [analyticsServiceType, currentStepId, currentStepIndex, nextStep, posthog, effectiveService, answers])

  // Handle flow completion with tracking
  const handleComplete = useCallback(() => {
    posthog?.capture('request_flow_completed', {
      service_type: analyticsServiceType,
      total_steps: activeSteps.length,
      is_authenticated: isAuthenticated,
    })
    router.push('/patient/intakes/success')
  }, [analyticsServiceType, activeSteps.length, isAuthenticated, router, posthog])

  // Handle exit with tracking
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

  // Handle draft restoration
  const handleRestoreDraft = useCallback(() => {
    setShowDraftBanner(false)
    posthog?.capture('request_draft_restored', { service_type: analyticsServiceType })
  }, [analyticsServiceType, posthog])

  // Handle draft discard
  const handleDiscardDraft = useCallback(() => {
    setShowDraftBanner(false)
    reset()
    if (initialService) {
      setServiceType(initialService)
    }
    posthog?.capture('request_draft_discarded', { service_type: analyticsServiceType })
  }, [reset, initialService, setServiceType, analyticsServiceType, posthog])

  // Handle consult subtype mismatch - resume existing draft
  const handleResumeDraft = useCallback(() => {
    setShowSubtypeMismatch(false)
    // Keep the draft subtype (don't change consultSubtype in store)
    // Navigate to the draft's subtype URL for consistency
    if (draftSubtype) {
      router.replace(`/request?service=consult&subtype=${draftSubtype}`)
    }
    posthog?.capture('consult_draft_resumed', { 
      service_type: analyticsServiceType,
      draft_subtype: draftSubtype,
      url_subtype: initialSubtype,
    })
  }, [draftSubtype, initialSubtype, analyticsServiceType, router, posthog])

  // Handle consult subtype mismatch - start fresh with URL subtype
  const handleStartFreshSubtype = useCallback(() => {
    setShowSubtypeMismatch(false)
    // Clear only consult-related answers and apply URL subtype
    setAnswer('consultSubtype', initialSubtype)
    setAnswer('consultCategory', undefined)
    setAnswer('consultDetails', undefined)
    // Clear any subtype-specific answers
    setAnswer('edOnset', undefined)
    setAnswer('edFrequency', undefined)
    setAnswer('hairPattern', undefined)
    setAnswer('womensHealthOption', undefined)
    setAnswer('currentWeight', undefined)
    setAnswer('preferredTimeSlot', undefined)
    
    posthog?.capture('consult_draft_cleared_for_new_subtype', { 
      service_type: analyticsServiceType,
      old_subtype: draftSubtype,
      new_subtype: initialSubtype,
    })
  }, [initialSubtype, draftSubtype, analyticsServiceType, setAnswer, posthog])

  // Handle step click (navigate to a previous step)
  const handleStepClick = useCallback((stepId: string, stepIndex: number) => {
    if (stepIndex === currentStepIndex) return // Already on this step
    
    posthog?.capture('request_step_jumped', {
      service_type: analyticsServiceType,
      from_step: currentStepId,
      to_step: stepId,
      from_index: currentStepIndex,
      to_index: stepIndex,
    })
    
    goToStep(stepId as Parameters<typeof goToStep>[0])
  }, [currentStepIndex, currentStepId, analyticsServiceType, goToStep, posthog])

  // Handle swipe gestures for mobile navigation
  const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100
    const velocity = 500
    
    if (info.offset.x > threshold || info.velocity.x > velocity) {
      // Swiped right - go back
      if (currentStepIndex > 0) {
        handleBack()
      }
    } else if (info.offset.x < -threshold || info.velocity.x < -velocity) {
      // Swiped left - cannot go forward via swipe (must complete step)
      // This is intentional - users must explicitly complete steps
    }
    
    // Reset drag position
    dragX.set(0)
  }, [currentStepIndex, handleBack, dragX])

  // Browser back button / unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && currentStepIndex > 0) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, currentStepIndex])

  // Keyboard navigation: Escape to go back
  // Note: Enter to continue is handled by individual step components
  // to respect their validation state
  useKeyboardNavigation({
    onBack: handleBack,
    enabled: !showExitConfirm,
  })

  // Handle exit with confirmation for unsaved changes
  const handleExitWithConfirm = useCallback(() => {
    if (hasUnsavedChanges && currentStepIndex > 0) {
      setShowExitConfirm(true)
    } else {
      handleExit()
    }
  }, [hasUnsavedChanges, currentStepIndex, handleExit])

  // Confirm exit
  const confirmExit = useCallback(() => {
    setShowExitConfirm(false)
    handleExit()
  }, [handleExit])

  // Service name for display
  const serviceName = useMemo(() => {
    const names: Record<UnifiedServiceType, string> = {
      'med-cert': 'medical certificate',
      'prescription': 'prescription',
      'repeat-script': 'repeat prescription',
      'consult': 'consultation',
    }
    return serviceType ? names[serviceType] : 'request'
  }, [serviceType])

  // Handle service selection from hub
  const handleSelectService = useCallback((service: UnifiedServiceType, consultSubtype?: string) => {
    // Set the service type (does not reset other drafts)
    setServiceType(service)
    
    // Navigate with URL params (URL is source of truth for subtype)
    if (service === 'consult' && consultSubtype) {
      router.push(`/request?service=${service}&subtype=${consultSubtype}`)
    } else {
      router.push(`/request?service=${service}`)
    }
  }, [setServiceType, router])

  // No service param provided - show service hub
  if (initialService === null && !rawServiceParam) {
    return <ServiceHubScreen onSelectService={handleSelectService} />
  }

  // Invalid service param provided - show error screen
  if (initialService === null && rawServiceParam) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Unknown service</h1>
          <p className="text-muted-foreground">
            The requested service &ldquo;{rawServiceParam}&rdquo; is not available.
          </p>
          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={() => router.push('/request')}>
              Choose a service
            </Button>
            <Button variant="outline" onClick={() => router.push('/')}>
              Return home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show loading only if we truly have no service type
  if (!effectiveService || !currentStep) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  // Slide animation variants
  const slideVariants = {
    enter: (dir: number) => (prefersReducedMotion
      ? { opacity: 0 }
      : { x: dir > 0 ? 40 : -40, opacity: 0 }
    ),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => (prefersReducedMotion
      ? { opacity: 0 }
      : { x: dir > 0 ? -40 : 40, opacity: 0 }
    ),
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Connection status banner */}
      <ConnectionBanner />

      {/* Exit confirmation dialog */}
      <ExitConfirmDialog
        open={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirmExit={confirmExit}
      />

      {/* Safety pre-check block dialog */}
      <SafetyBlockDialog
        safetyBlock={safetyBlock}
        onDismiss={() => setSafetyBlock(null)}
        onReturnHome={() => {
          setSafetyBlock(null)
          router.push('/')
        }}
        onContactUs={() => {
          setSafetyBlock(null)
          router.push('/contact')
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
        <div className="max-w-lg mx-auto px-4 h-14 sm:h-14 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            aria-label="Go back"
            className="h-11 w-11 sm:h-10 sm:w-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          {/* Center: Step label + count */}
          <div className="flex flex-col items-center">
            <h1 className="font-semibold text-sm">
              {currentStep.label}
            </h1>
            <span className="text-xs text-muted-foreground">
              Step {currentStepIndex + 1} of {activeSteps.length}
            </span>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleExitWithConfirm}
            aria-label="Exit"
            className="h-11 w-11 sm:h-10 sm:w-10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Progress bar + indicators row */}
        <div className="max-w-lg mx-auto px-4 pb-3">
          {/* Time remaining + Auto-save indicator */}
          <div className="flex items-center justify-between mb-2">
            <TimeRemaining 
              steps={activeSteps.map(s => ({ id: s.id }))} 
              currentIndex={currentStepIndex} 
            />
            <AutoSaveIndicator 
              lastSavedAt={lastSavedAt} 
              hasUnsavedChanges={hasUnsavedChanges} 
            />
          </div>
          
          <ProgressBar 
            steps={activeSteps.map(s => ({ id: s.id, shortLabel: s.shortLabel }))} 
            currentIndex={currentStepIndex}
            onStepClick={handleStepClick}
          />
        </div>
      </header>

      {/* Content with swipe gestures */}
      <motion.main 
        ref={contentRef}
        className={`max-w-lg mx-auto px-4 py-6 sm:pb-6 touch-pan-y ${
          currentStepId === 'checkout' || currentStepId === 'review' ? 'pb-6' : 'pb-28'
        }`}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x: dragX }}
      >
        {/* Draft restoration banner */}
        {showDraftBanner && (
          <DraftRestorationBanner
            serviceName={serviceName}
            onRestore={handleRestoreDraft}
            onDiscard={handleDiscardDraft}
          />
        )}

        {/* Consult subtype mismatch banner */}
        {showSubtypeMismatch && draftSubtype && initialSubtype && (
          <SubtypeMismatchBanner
            draftSubtype={draftSubtype}
            urlSubtype={initialSubtype}
            onResumeDraft={handleResumeDraft}
            onStartFresh={handleStartFreshSubtype}
          />
        )}

        {/* Step content with animated transitions */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStepId}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { duration: prefersReducedMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: prefersReducedMotion ? 0 : 0.15 },
            }}
          >
            <StepRouter
              serviceType={effectiveService}
              currentStepId={currentStepId}
              componentPath={currentStep.componentPath}
              direction={direction}
              onNext={handleNext}
              onBack={handleBack}
              onComplete={handleComplete}
            />
          </motion.div>
        </AnimatePresence>
      </motion.main>

      {/* Sticky bottom CTA bar for mobile — hidden on checkout/review which have their own CTAs */}
      {currentStepId !== 'checkout' && currentStepId !== 'review' && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t p-4 sm:hidden safe-area-bottom">
          <div className="container max-w-lg mx-auto flex items-center gap-3">
            {currentStepIndex > 0 && (
              <Button
                variant="outline"
                size="lg"
                onClick={handleBack}
                className="h-12 px-5"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="flex-1 text-center">
              <p className="text-xs text-muted-foreground">
                Step {currentStepIndex + 1} of {activeSteps.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
