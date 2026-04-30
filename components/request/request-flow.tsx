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

import { AnimatePresence,motion } from "framer-motion"
import { ArrowLeft, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef,useState } from "react"

import { AutoSaveIndicator } from "@/components/request/auto-save-indicator"
import { DraftRestorationBanner } from "@/components/request/draft-restoration-banner"
import { ExitConfirmDialog } from "@/components/request/exit-confirm-dialog"
import { ProgressBar } from "@/components/request/progress-bar"
import { SafetyBlockDialog } from "@/components/request/safety-block-dialog"
import { SubtypeMismatchBanner } from "@/components/request/subtype-mismatch-banner"
import { TimeRemaining } from "@/components/request/time-remaining"
import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/components/ui/motion"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { isValidCertCategory } from "@/lib/marketing/med-cert-selector"
import {
  type ConsultSubtype,
  getStepDefinitionById,
  getStepsForService,
  isConsultSubtypeAvailable,
  type StepContext,
  type UnifiedServiceType,
  type UnifiedStepId,
} from "@/lib/request/step-registry"
import { type SafetyEvaluationResult } from "@/lib/safety"

import { ConnectionBanner } from "./connection-banner"
import { FlowErrorScreen } from "./flow-error-screen"
import { useFlowAnalytics } from "./hooks/use-flow-analytics"
import { useFlowNavigation } from "./hooks/use-flow-navigation"
import { useSwipeNavigation } from "./hooks/use-swipe-navigation"
import { useUnsavedChanges } from "./hooks/use-unsaved-changes"
import { ServiceHubScreen } from "./service-hub-screen"
import { StepRouter } from "./step-router"
import { useRequestStore } from "./store"


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
  /** Profile has complete identity (incl. date_of_birth) - details step can be skipped */
  hasCompleteIdentity?: boolean
  hasMedicare: boolean
  hasAddress: boolean
  /** Profile has a phone number - required for prescriptions + consults */
  hasPhone?: boolean
  /** Profile has prescribing sex - required for prescription details skipping */
  hasSex?: boolean
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
  /** Profile Medicare IRN for pre-filling */
  profileMedicareIrn?: number | string
  /** Profile Medicare expiry for pre-filling */
  profileMedicareExpiry?: string
  /** Profile prescribing sex for pre-filling */
  profileSex?: string
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
  hasSex,
  userEmail,
  userName,
  userPhone,
  profileDateOfBirth,
  profileMedicare,
  profileMedicareIrn,
  profileMedicareExpiry,
  profileSex,
  profileAddress,
  healthProfile,
}: RequestFlowProps) {
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [showSubtypeMismatch, setShowSubtypeMismatch] = useState(false)
  const [draftSubtype, setDraftSubtype] = useState<string | null>(null)
  const [safetyBlock, setSafetyBlock] = useState<SafetyEvaluationResult | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  
  const {
    serviceType,
    currentStepId,
    direction,
    setServiceType,
    prevStep,
    goToStep,
    answers,
    phone,
    setAnswer,
    setIdentity,
    setAuthContext,
    lastSavedAt,
  } = useRequestStore()
  
  // Rehydrate persisted store after mount (SSR-safe pattern).
  // The store uses skipHydration:true to avoid a server/client mismatch on first render.
  useEffect(() => {
    useRequestStore.persist.rehydrate()
  }, [])

  // Initialize auth context in store for step navigation
  useEffect(() => {
    setAuthContext({ isAuthenticated, hasProfile, hasCompleteIdentity: hasCompleteIdentity ?? hasProfile, hasMedicare, hasAddress, hasPhone, hasSex })
  }, [isAuthenticated, hasProfile, hasCompleteIdentity, hasMedicare, hasAddress, hasPhone, hasSex, setAuthContext])

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
    if (profileMedicareIrn && !answers.medicareIrn) {
      setAnswer('medicareIrn', String(profileMedicareIrn))
    }
    if (profileMedicareExpiry && !answers.medicareExpiry) {
      setAnswer('medicareExpiry', profileMedicareExpiry)
    }
    if (profileSex && !answers.sex) {
      setAnswer('sex', profileSex)
    }
    // Pre-fill address from profile
    if (profileAddress && !answers.addressLine1) {
      setAnswer('addressLine1', profileAddress.addressLine1)
      setAnswer('suburb', profileAddress.suburb)
      setAnswer('state', profileAddress.state)
      setAnswer('postcode', profileAddress.postcode)
    }
  }, [userEmail, userName, userPhone, profileDateOfBirth, profileMedicare, profileMedicareIrn, profileMedicareExpiry, profileSex, profileAddress, answers.email, answers.medicareNumber, answers.medicareIrn, answers.medicareExpiry, answers.sex, answers.addressLine1, phone, setIdentity, setAnswer])

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

  // Block Coming Soon subtypes - redirect to landing page
  useEffect(() => {
    if (initialService === 'consult' && initialSubtype) {
      if (!isConsultSubtypeAvailable(initialSubtype as ConsultSubtype)) {
        const redirectMap: Record<string, string> = {
          womens_health: '/womens-health',
          weight_loss: '/weight-loss',
        }
        router.replace(redirectMap[initialSubtype] || '/')
      }
    }
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
    hasSex,
    serviceType: effectiveService || 'med-cert',
    answers,
  }), [isAuthenticated, hasProfile, hasCompleteIdentity, hasMedicare, hasAddress, hasPhone, hasSex, effectiveService, answers])

  // Get active steps for current service
  const activeSteps = useMemo(() => {
    if (!effectiveService) return []
    return getStepsForService(effectiveService, stepContext)
  }, [effectiveService, stepContext])

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
  // Exception: when editModeStep exists, user explicitly navigated to edit a skipped step - don't redirect
  useEffect(() => {
    if (editModeStep) return
    if (activeSteps.length > 0 && !activeSteps.some(s => s.id === currentStepId)) {
      goToStep(activeSteps[0].id as UnifiedStepId)
    }
  }, [activeSteps, currentStepId, goToStep, editModeStep])

  // Get current step definition - use editModeStep when editing a skipped step
  const currentStep = editModeStep ?? (activeSteps.length > 0 ? activeSteps[currentStepIndex] : null)

  // --- Extracted hooks ---

  const { analyticsServiceType, patientEmail, posthog, trackStepCompleted } = useFlowAnalytics({
    serviceType,
    currentStep,
    currentStepId,
    currentStepIndex,
    totalSteps: activeSteps.length,
    answers,
    userEmail,
  })

  const { hasUnsavedChanges, showExitConfirm, setShowExitConfirm } = useUnsavedChanges({
    answers,
    currentStepIndex,
    serviceType,
    analyticsServiceType,
    currentStepId,
    posthog,
  })

  const { dragX, handleDragEnd, dragConstraints } = useSwipeNavigation({
    onSwipeBack: () => {
      if (currentStepIndex > 0) prevStep()
    },
    canGoBack: currentStepIndex > 0,
  })

  const {
    handleBack,
    handleNext,
    handleComplete,
    handleExit: _handleExit,
    handleRestoreDraft,
    handleDiscardDraft,
    handleResumeDraft,
    handleStartFreshSubtype,
    handleStepClick,
    handleExitWithConfirm,
    confirmExit,
    handleSelectService,
  } = useFlowNavigation({
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
  })

  // Keyboard navigation: Escape to go back
  // Note: Enter to continue is handled by individual step components
  // to respect their validation state
  useKeyboardNavigation({
    onBack: handleBack,
    enabled: !showExitConfirm,
  })

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

  // No service param provided - show service hub
  if (initialService === null && !rawServiceParam) {
    return <ServiceHubScreen onSelectService={handleSelectService} />
  }

  // Consult without subtype → redirect to service hub (no general consult)
  // Active subtypes: ed, hair_loss. Coming soon: womens_health, weight_loss.
  if (initialService === 'consult' && !initialSubtype) {
    return <ServiceHubScreen onSelectService={handleSelectService} />
  }

  // Invalid service param provided - show error screen
  if (initialService === null && rawServiceParam) {
    return <FlowErrorScreen invalidService={rawServiceParam} />
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
          currentStepId === 'checkout' || currentStepId === 'review' ? 'pb-6' : 'pb-[calc(5rem+env(safe-area-inset-bottom))]'
        }`}
        drag="x"
        dragConstraints={dragConstraints}
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
              onNext={handleNext}
              onBack={handleBack}
              onComplete={handleComplete}
            />
          </motion.div>
        </AnimatePresence>
      </motion.main>

      {/* Sticky bottom CTA bar for mobile - hidden on checkout/review which have their own CTAs */}
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
