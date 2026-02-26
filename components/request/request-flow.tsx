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
import { ArrowLeft, X, RotateCcw, Check, Clock, Cloud, CloudOff, AlertTriangle } from "lucide-react"
import { usePostHog } from "posthog-js/react"
import { motion, AnimatePresence, useMotionValue, type PanInfo } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SkeletonForm } from "@/components/ui/skeleton"
import { StepRouter } from "./step-router"
import { ServiceHubScreen } from "./service-hub-screen"
import { useRequestStore } from "./store"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import { ConnectionBanner } from "./connection-banner"
import {
  getStepsForService,
  type UnifiedServiceType,
  type StepContext,
} from "@/lib/request/step-registry"
import { canonicalizeServiceType } from "@/lib/request/draft-storage"
import { evaluateSafety, type SafetyEvaluationResult } from "@/lib/flow/safety"

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
  'ed-assessment',     // ED consult: after ED-specific questions
  'ed-safety',         // ED consult: after safety screening (nitrates, cardiac)
  'weight-loss-assessment', // Weight loss: after BMI/screening
  'consult-reason',    // General consult: after describing concern
])

// Estimated time per step type (in seconds)
const STEP_TIME_ESTIMATES: Record<string, number> = {
  'safety': 15,
  'certificate': 30,
  'symptoms': 45,
  'medication': 60,
  'medication-history': 45,
  'medical-history': 60,
  'consult-reason': 45,
  'referral-reason': 45,
  'details': 90,
  'review': 30,
  'checkout': 60,
}

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
  isAuthenticated: boolean
  hasProfile: boolean
  hasMedicare: boolean
  /** User email for pre-filling */
  userEmail?: string
  /** User name for pre-filling */
  userName?: string
  /** Health profile data for pre-filling medical history steps */
  healthProfile?: HealthProfilePrefill | null
}

function ProgressBar({ 
  steps, 
  currentIndex,
  onStepClick,
}: { 
  steps: { id: string; shortLabel: string }[]
  currentIndex: number
  onStepClick: (stepId: string, index: number) => void
}) {
  return (
    <div className="w-full flex gap-1.5" role="navigation" aria-label="Request progress">
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex
        const isCurrent = i === currentIndex
        const isClickable = i <= currentIndex
        
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => isClickable && onStepClick(step.id, i)}
            disabled={!isClickable}
            className={`flex-1 group min-h-[44px] sm:min-h-0 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
            aria-current={isCurrent ? 'step' : undefined}
            aria-label={`${step.shortLabel}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
          >
            {/* Progress bar segment -- taller on mobile for better touch targets */}
            <div className="relative">
              <div 
                className={`h-2 sm:h-1.5 rounded-full transition-all duration-300 ${
                  i <= currentIndex ? "bg-primary" : "bg-muted"
                } ${isClickable && !isCurrent ? "group-hover:bg-primary/70" : ""}`} 
              />
              {/* Checkmark for completed steps -- hidden on mobile, dot indicator instead */}
              {isCompleted && (
                <>
                  {/* Mobile: small dot */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary sm:hidden"
                  />
                  {/* Desktop: checkmark */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary items-center justify-center hidden sm:flex"
                  >
                    <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
                  </motion.div>
                </>
              )}
            </div>
            {/* Label - hidden on mobile, visible on sm+ */}
            <span 
              className={`text-xs mt-1.5 text-center font-medium transition-colors truncate hidden sm:block ${
                i <= currentIndex ? "text-foreground" : "text-muted-foreground"
              } ${isClickable && !isCurrent ? "group-hover:text-primary" : ""}`}
            >
              {step.shortLabel}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// Auto-save indicator component
function AutoSaveIndicator({ 
  lastSavedAt, 
  hasUnsavedChanges 
}: { 
  lastSavedAt: string | null
  hasUnsavedChanges: boolean 
}) {
  const [showSaved, setShowSaved] = useState(false)
  
  useEffect(() => {
    if (lastSavedAt) {
      setShowSaved(true)
      const timer = setTimeout(() => setShowSaved(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [lastSavedAt])
  
  if (!lastSavedAt && !hasUnsavedChanges) return null
  
  return (
    <AnimatePresence mode="wait">
      {hasUnsavedChanges ? (
        <motion.div
          key="unsaved"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <CloudOff className="w-3 h-3" />
          <span>Unsaved</span>
        </motion.div>
      ) : showSaved ? (
        <motion.div
          key="saved"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-1.5 text-xs text-emerald-600"
        >
          <Cloud className="w-3 h-3" />
          <span>Saved</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

// Time remaining indicator
function TimeRemaining({ 
  steps, 
  currentIndex 
}: { 
  steps: { id: string }[]
  currentIndex: number 
}) {
  const remainingTime = useMemo(() => {
    const remainingSteps = steps.slice(currentIndex)
    const totalSeconds = remainingSteps.reduce((acc, step) => {
      return acc + (STEP_TIME_ESTIMATES[step.id] || 30)
    }, 0)
    const minutes = Math.ceil(totalSeconds / 60)
    return minutes
  }, [steps, currentIndex])
  
  if (remainingTime <= 0) return null
  
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="w-3 h-3" />
      <span>~{remainingTime} min left</span>
    </div>
  )
}

// Skeleton loading component for step transitions
// Uses shared SkeletonForm for consistency
function StepSkeleton() {
  return <SkeletonForm />
}

// Draft restoration banner
function DraftRestorationBanner({ 
  onRestore, 
  onDiscard,
  serviceName,
}: { 
  onRestore: () => void
  onDiscard: () => void 
  serviceName: string
}) {
  return (
    <Alert className="mb-4 border-primary/20 bg-primary/5">
      <RotateCcw className="w-4 h-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-sm">
          You have an unfinished {serviceName} request. Continue where you left off?
        </span>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={onDiscard}>
            Start fresh
          </Button>
          <Button size="sm" onClick={onRestore}>
            Continue
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

// Consult subtype mismatch banner - shown when URL subtype differs from draft
function SubtypeMismatchBanner({ 
  draftSubtype,
  urlSubtype,
  onResumeDraft, 
  onStartFresh,
}: { 
  draftSubtype: string
  urlSubtype: string
  onResumeDraft: () => void
  onStartFresh: () => void 
}) {
  // Import labels for display
  const subtypeLabels: Record<string, string> = {
    general: 'General consultation',
    new_medication: 'General consultation', // legacy backward compat
    ed: 'Erectile dysfunction',
    hair_loss: 'Hair loss treatment',
    womens_health: "Women's health",
    weight_loss: 'Weight management',
  }
  
  const draftLabel = subtypeLabels[draftSubtype] || draftSubtype
  const urlLabel = subtypeLabels[urlSubtype] || urlSubtype
  
  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
      <AlertTriangle className="w-4 h-4 text-amber-600" />
      <AlertDescription className="flex flex-col gap-3">
        <span className="text-sm text-amber-700 dark:text-amber-300">
          You have an unfinished <strong>{draftLabel}</strong> consult. 
          You selected <strong>{urlLabel}</strong>.
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onStartFresh}>
            Start {urlLabel}
          </Button>
          <Button size="sm" onClick={onResumeDraft}>
            Resume {draftLabel}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

export function RequestFlow({
  initialService,
  rawServiceParam,
  initialSubtype,
  initialMedication,
  isAuthenticated,
  hasProfile,
  hasMedicare,
  userEmail,
  userName,
  healthProfile,
}: RequestFlowProps) {
  const router = useRouter()
  const posthog = usePostHog()
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [showSubtypeMismatch, setShowSubtypeMismatch] = useState(false)
  const [draftSubtype, setDraftSubtype] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [safetyBlock, setSafetyBlock] = useState<SafetyEvaluationResult | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const dragX = useMotionValue(0)
  
  const { 
    serviceType, 
    currentStepId, 
    direction,
    setServiceType,
    nextStep, 
    prevStep,
    goToStep,
    answers,
    setAnswer,
    setIdentity,
    setAuthContext,
    lastSavedAt,
    reset,
  } = useRequestStore()
  
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
    setAuthContext({ isAuthenticated, hasProfile, hasMedicare })
  }, [isAuthenticated, hasProfile, hasMedicare, setAuthContext])

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
  }, [userEmail, userName, answers.email, setIdentity])

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

  // Dev sanity check: log service routing on mount
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[RequestFlow] Mount:', {
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
      if (hoursSinceSave < 24 && currentStepId !== 'safety') {
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
    hasMedicare,
    serviceType: effectiveService || 'med-cert',
    answers,
  }), [isAuthenticated, hasProfile, hasMedicare, effectiveService, answers])

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

  // Find current step index - default to first step if current step not found
  const currentStepIndex = useMemo(() => {
    const index = activeSteps.findIndex(s => s.id === currentStepId)
    // If step not found in this flow, default to first step
    return index >= 0 ? index : 0
  }, [activeSteps, currentStepId])

  // Get current step definition (safe now since we default to 0)
  const currentStep = activeSteps.length > 0 ? activeSteps[currentStepIndex] : null

  // Track step views in PostHog
  useEffect(() => {
    if (currentStep && serviceType) {
      posthog?.capture('request_step_viewed', {
        service_type: analyticsServiceType,
        step_id: currentStep.id,
        step_index: currentStepIndex,
        total_steps: activeSteps.length,
        is_authenticated: isAuthenticated,
      })
    }
  }, [currentStep, serviceType, analyticsServiceType, currentStepIndex, activeSteps.length, isAuthenticated, posthog])

  // Handle back navigation with tracking
  const handleBack = useCallback(() => {
    posthog?.capture('request_step_back', {
      service_type: analyticsServiceType,
      from_step: currentStepId,
      step_index: currentStepIndex,
    })
    
    if (currentStepIndex > 0) {
      setIsTransitioning(true)
      setTimeout(() => {
        prevStep()
        setIsTransitioning(false)
      }, 150)
    } else {
      router.back()
    }
  }, [currentStepIndex, currentStepId, analyticsServiceType, prevStep, router, posthog])

  // Handle next navigation with tracking + safety pre-check
  const handleNext = useCallback(() => {
    posthog?.capture('request_step_completed', {
      service_type: analyticsServiceType,
      step_id: currentStepId,
      step_index: currentStepIndex,
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

    setIsTransitioning(true)
    setTimeout(() => {
      nextStep()
      setIsTransitioning(false)
    }, 150)
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
    posthog?.capture('request_flow_exited', {
      service_type: analyticsServiceType,
      exit_step: currentStepId,
      step_index: currentStepIndex,
    })
    router.push('/')
  }, [analyticsServiceType, currentStepId, currentStepIndex, router, posthog])

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
    
    setIsTransitioning(true)
    setTimeout(() => {
      goToStep(stepId as Parameters<typeof goToStep>[0])
      setIsTransitioning(false)
    }, 150)
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
    enabled: !showExitConfirm && !isTransitioning,
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
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Connection status banner */}
      <ConnectionBanner />

      {/* Exit confirmation dialog */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowExitConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background rounded-xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="font-semibold text-lg mb-2">Leave this request?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your progress has been saved as a draft. You can continue later.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowExitConfirm(false)}
                >
                  Keep editing
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={confirmExit}
                >
                  Leave
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Safety pre-check block dialog */}
      <AnimatePresence>
        {safetyBlock && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background rounded-xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {safetyBlock.patientTitle}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {safetyBlock.patientMessage}
                  </p>
                </div>
              </div>
              {safetyBlock.outcome === 'REQUIRES_CALL' ? (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSafetyBlock(null)
                      router.push('/')
                    }}
                  >
                    Return home
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setSafetyBlock(null)
                      router.push('/contact')
                    }}
                  >
                    Contact us
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSafetyBlock(null)}
                  >
                    Go back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setSafetyBlock(null)
                      router.push('/')
                    }}
                  >
                    Return home
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
        <div className="container max-w-lg mx-auto px-4 h-14 sm:h-14 flex items-center justify-between">
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
        <div className="container max-w-lg mx-auto px-4 pb-3">
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
        className="container max-w-lg mx-auto px-4 py-6 pb-28 sm:pb-6 touch-pan-y"
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
          {isTransitioning ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <StepSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key={currentStepId}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
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
          )}
        </AnimatePresence>
      </motion.main>

      {/* Sticky bottom CTA bar for mobile */}
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
    </div>
  )
}
