"use client"

/**
 * Request Flow - Main orchestration component for unified /request
 * 
 * Handles:
 * - Service type initialization
 * - Step navigation with auth context
 * - Progress tracking
 * - PostHog analytics
 * - Draft restoration
 * - Error boundaries
 * - Flow completion
 */

import { useEffect, useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, X, RotateCcw } from "lucide-react"
import { usePostHog } from "posthog-js/react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StepRouter } from "./step-router"
import { useRequestStore } from "./store"
import { 
  getStepsForService,
  type UnifiedServiceType,
  type StepContext,
} from "@/lib/request/step-registry"

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
    <div className="w-full flex gap-1" role="navigation" aria-label="Request progress">
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex
        const isCurrent = i === currentIndex
        const isClickable = i <= currentIndex // Can click current or completed steps
        
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
            <div 
              className={`h-1 rounded-full transition-all duration-300 ${
                i <= currentIndex ? "bg-primary" : "bg-muted"
              } ${isClickable && !isCurrent ? "group-hover:bg-primary/70" : ""}`} 
            />
            <span 
              className={`text-[10px] mt-1 block text-center font-medium transition-colors ${
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

  // Service name for display
  const serviceName = useMemo(() => {
    const names: Record<UnifiedServiceType, string> = {
      'med-cert': 'medical certificate',
      'prescription': 'prescription',
      'repeat-script': 'repeat prescription',
      'consult': 'consultation',
      'referral': 'referral',
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

  return (
    <div className="min-h-screen bg-background">
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
          
          <h1 className="font-semibold text-sm">
            {currentStep.label}
          </h1>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleExit}
            aria-label="Exit"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Progress bar */}
        <div className="container max-w-lg mx-auto px-4 pb-3">
          <ProgressBar 
            steps={activeSteps.map(s => ({ id: s.id, shortLabel: s.shortLabel }))} 
            currentIndex={currentStepIndex}
            onStepClick={(stepId, stepIndex) => handleStepClick(stepId, stepIndex)}
          />
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-lg mx-auto px-4 py-6">
        {/* Draft restoration banner */}
        {showDraftBanner && (
          <DraftRestorationBanner
            serviceName={serviceName}
            onRestore={handleRestoreDraft}
            onDiscard={handleDiscardDraft}
          />
        )}

        {/* Step content with loading state */}
        {isTransitioning ? (
          <StepSkeleton />
        ) : (
          <StepRouter
            serviceType={serviceType}
            currentStepId={currentStepId}
            componentPath={currentStep.componentPath}
            direction={direction}
            onNext={handleNext}
            onBack={handleBack}
            onComplete={handleComplete}
          />
        )}
      </main>
    </div>
  )
}
