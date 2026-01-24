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
import { ArrowLeft, X, RotateCcw, Check, Clock, Cloud, CloudOff } from "lucide-react"
import { usePostHog } from "posthog-js/react"
import { motion, AnimatePresence, useMotionValue, type PanInfo } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StepRouter } from "./step-router"
import { useRequestStore } from "./store"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import { ConnectionBanner } from "./connection-banner"
import { 
  getStepsForService,
  type UnifiedServiceType,
  type StepContext,
} from "@/lib/request/step-registry"

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

interface RequestFlowProps {
  initialService: UnifiedServiceType | null
  isAuthenticated: boolean
  hasProfile: boolean
  hasMedicare: boolean
  /** User email for pre-filling */
  userEmail?: string
  /** User name for pre-filling */
  userName?: string
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
            className={`flex-1 group ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
            aria-current={isCurrent ? 'step' : undefined}
            aria-label={`${step.shortLabel}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
          >
            {/* Progress bar segment */}
            <div className="relative">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= currentIndex ? "bg-primary" : "bg-muted"
                } ${isClickable && !isCurrent ? "group-hover:bg-primary/70" : ""}`} 
              />
              {/* Checkmark for completed steps */}
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary flex items-center justify-center"
                >
                  <Check className="w-1.5 h-1.5 text-primary-foreground" strokeWidth={3} />
                </motion.div>
              )}
            </div>
            {/* Label - hidden on very small screens, shows abbreviated on small */}
            <span 
              className={`text-[10px] mt-1.5 block text-center font-medium transition-colors truncate ${
                i <= currentIndex ? "text-foreground" : "text-muted-foreground"
              } ${isClickable && !isCurrent ? "group-hover:text-primary" : ""} ${
                isCompleted ? "hidden xs:block" : ""
              }`}
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
function StepSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-12 bg-muted rounded-lg w-full" />
      <div className="h-24 bg-muted rounded-lg w-full" />
      <div className="h-10 bg-muted rounded-lg w-3/4" />
      <div className="h-10 bg-muted rounded-lg w-1/2" />
      <div className="h-12 bg-muted rounded-lg w-full mt-8" />
    </div>
  )
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

export function RequestFlow({
  initialService,
  isAuthenticated,
  hasProfile,
  hasMedicare,
  userEmail,
  userName,
}: RequestFlowProps) {
  const router = useRouter()
  const posthog = usePostHog()
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
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

  // Initialize service type from props
  useEffect(() => {
    if (initialService && !serviceType) {
      setServiceType(initialService)
    }
  }, [initialService, serviceType, setServiceType])

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

  // Build step context with auth state
  const stepContext: StepContext = useMemo(() => ({
    isAuthenticated,
    hasProfile,
    hasMedicare,
    serviceType: serviceType || 'med-cert',
    answers,
  }), [isAuthenticated, hasProfile, hasMedicare, serviceType, answers])

  // Get active steps for current service
  const activeSteps = useMemo(() => {
    if (!serviceType) return []
    return getStepsForService(serviceType, stepContext)
  }, [serviceType, stepContext])

  // Find current step index
  const currentStepIndex = useMemo(() => {
    return activeSteps.findIndex(s => s.id === currentStepId)
  }, [activeSteps, currentStepId])

  // Get current step definition
  const currentStep = activeSteps[currentStepIndex]

  // Track step views in PostHog
  useEffect(() => {
    if (currentStep && serviceType) {
      posthog?.capture('request_step_viewed', {
        service_type: serviceType,
        step_id: currentStep.id,
        step_index: currentStepIndex,
        total_steps: activeSteps.length,
        is_authenticated: isAuthenticated,
      })
    }
  }, [currentStep, serviceType, currentStepIndex, activeSteps.length, isAuthenticated, posthog])

  // Handle back navigation with tracking
  const handleBack = useCallback(() => {
    posthog?.capture('request_step_back', {
      service_type: serviceType,
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
  }, [currentStepIndex, currentStepId, serviceType, prevStep, router, posthog])

  // Handle next navigation with tracking
  const handleNext = useCallback(() => {
    posthog?.capture('request_step_completed', {
      service_type: serviceType,
      step_id: currentStepId,
      step_index: currentStepIndex,
    })
    
    setIsTransitioning(true)
    setTimeout(() => {
      nextStep()
      setIsTransitioning(false)
    }, 150)
  }, [serviceType, currentStepId, currentStepIndex, nextStep, posthog])

  // Handle flow completion with tracking
  const handleComplete = useCallback(() => {
    posthog?.capture('request_flow_completed', {
      service_type: serviceType,
      total_steps: activeSteps.length,
      is_authenticated: isAuthenticated,
    })
    router.push('/patient/intakes/success')
  }, [serviceType, activeSteps.length, isAuthenticated, router, posthog])

  // Handle exit with tracking
  const handleExit = useCallback(() => {
    posthog?.capture('request_flow_exited', {
      service_type: serviceType,
      exit_step: currentStepId,
      step_index: currentStepIndex,
    })
    router.push('/')
  }, [serviceType, currentStepId, currentStepIndex, router, posthog])

  // Handle draft restoration
  const handleRestoreDraft = useCallback(() => {
    setShowDraftBanner(false)
    posthog?.capture('request_draft_restored', { service_type: serviceType })
  }, [serviceType, posthog])

  // Handle draft discard
  const handleDiscardDraft = useCallback(() => {
    setShowDraftBanner(false)
    reset()
    if (initialService) {
      setServiceType(initialService)
    }
    posthog?.capture('request_draft_discarded', { service_type: serviceType })
  }, [reset, initialService, setServiceType, serviceType, posthog])

  // Handle step click (navigate to a previous step)
  const handleStepClick = useCallback((stepId: string, stepIndex: number) => {
    if (stepIndex === currentStepIndex) return // Already on this step
    
    posthog?.capture('request_step_jumped', {
      service_type: serviceType,
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
  }, [currentStepIndex, currentStepId, serviceType, goToStep, posthog])

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

  // Show loading if no service type yet
  if (!serviceType || !currentStep) {
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

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
        <div className="container max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          {/* Center: Step label + count */}
          <div className="flex flex-col items-center">
            <h1 className="font-semibold text-sm">
              {currentStep.label}
            </h1>
            <span className="text-[10px] text-muted-foreground">
              Step {currentStepIndex + 1} of {activeSteps.length}
            </span>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleExitWithConfirm}
            aria-label="Exit"
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
        className="container max-w-lg mx-auto px-4 py-6 touch-pan-y"
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
                serviceType={serviceType}
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
    </div>
  )
}
