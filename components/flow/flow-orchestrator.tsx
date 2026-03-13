"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Loader2 } from "lucide-react"
import { StepErrorBoundary } from "@/components/request/step-error-boundary"
import { useFlowStore, useFlowService } from "@/lib/flow"
import type { FlowConfig } from "@/lib/flow"
import { cn } from "@/lib/utils"

// Step components
import {
  ServiceStep,
  AuthStep,
  QuestionnaireStep,
  DetailsStep,
  PrescriptionDetailsStep,
  SafetyScreeningStep,
  SafetyCheckStep,
} from "./steps"

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

type FlowStepId =
  | "service"
  | "auth"
  | "questionnaire"
  | "safety-screening"
  | "safety-check"
  | "prescription-details"
  | "details"

interface FlowStepDef {
  id: FlowStepId
  label: string
  /** Only include in sequence when this service is selected (null = always) */
  serviceFilter?: string | null
}

/**
 * Master step sequence. Steps with `serviceFilter` only render for that service.
 * The orchestrator filters at runtime based on the selected service slug.
 */
const ALL_STEPS: FlowStepDef[] = [
  { id: "service", label: "Choose service" },
  { id: "auth", label: "Account" },
  { id: "safety-screening", label: "Safety check" },
  { id: "prescription-details", label: "Medication", serviceFilter: "prescription" },
  { id: "questionnaire", label: "Questions" },
  { id: "safety-check", label: "Safety review" },
  { id: "details", label: "Your details" },
]

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 20 : -20,
    opacity: 0,
  }),
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FlowOrchestratorProps {
  /** Pre-selected service slug from URL query param */
  initialService?: string
  /** Flow config to pass to questionnaire / details steps */
  configLoader?: (serviceSlug: string) => FlowConfig | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FlowOrchestrator({
  initialService,
  configLoader,
}: FlowOrchestratorProps) {
  const router = useRouter()
  const serviceSlug = useFlowService()
  const { currentStep, setServiceSlug, nextStep, prevStep, reset } = useFlowStore()
  const [direction, setDirection] = useState<1 | -1>(1)
  const [isCompleting, setIsCompleting] = useState(false)

  // If initial service is provided and not yet set, apply it
  useMemo(() => {
    if (initialService && !serviceSlug) {
      setServiceSlug(initialService)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialService])

  // Build filtered step sequence based on selected service
  const steps = useMemo(() => {
    return ALL_STEPS.filter((step) => {
      if (!step.serviceFilter) return true
      return step.serviceFilter === serviceSlug
    })
  }, [serviceSlug])

  // Current step definition
  const currentStepDef = steps[currentStep] ?? steps[0]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1

  // Resolve config for current service
  const flowConfig = useMemo(() => {
    if (!serviceSlug || !configLoader) return null
    return configLoader(serviceSlug)
  }, [serviceSlug, configLoader])

  // Navigation handlers
  const handleNext = useCallback(() => {
    setDirection(1)
    if (isLastStep) {
      setIsCompleting(true)
      // Navigate to checkout or completion
      router.push(`/request?service=${serviceSlug}`)
    } else {
      nextStep()
    }
  }, [isLastStep, nextStep, router, serviceSlug])

  const handleBack = useCallback(() => {
    if (isFirstStep) return
    setDirection(-1)
    prevStep()
  }, [isFirstStep, prevStep])

  const handleServiceSelect = useCallback(
    (slug: string) => {
      setServiceSlug(slug)
      setDirection(1)
      nextStep()
    },
    [setServiceSlug, nextStep]
  )

  const handleEligibilityFail = useCallback(
    (_reason: string) => {
      // Navigate to the safety check step
      const safetyIdx = steps.findIndex((s) => s.id === "safety-check")
      if (safetyIdx !== -1) {
        // Jump to safety check
        const diff = safetyIdx - currentStep
        for (let i = 0; i < Math.abs(diff); i++) {
          if (diff > 0) nextStep()
          else prevStep()
        }
      }
    },
    [steps, currentStep, nextStep, prevStep]
  )

  // Progress percentage
  const progress = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 0

  // ---------------------------------------------------------------------------
  // Render step
  // ---------------------------------------------------------------------------

  function renderStep() {
    if (!currentStepDef) return null

    switch (currentStepDef.id) {
      case "service":
        return <ServiceStep onServiceSelect={handleServiceSelect} />

      case "auth":
        return (
          <AuthStep
            onAuthenticated={handleNext}
            onSkip={handleNext}
            allowSkip
          />
        )

      case "safety-screening":
        return <SafetyScreeningStep />

      case "prescription-details":
        return <PrescriptionDetailsStep onComplete={handleNext} />

      case "questionnaire":
        return flowConfig ? (
          <QuestionnaireStep
            config={flowConfig}
            onComplete={handleNext}
            onEligibilityFail={handleEligibilityFail}
          />
        ) : (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground mt-2">Loading questions…</p>
          </div>
        )

      case "safety-check":
        return (
          <SafetyCheckStep
            onContinue={handleNext}
            onDecline={(_reason) => {
              // Reset and go home
              reset()
              router.push("/")
            }}
          />
        )

      case "details":
        return flowConfig ? (
          <DetailsStep config={flowConfig} onComplete={handleNext} />
        ) : (
          <DetailsStep
            config={{ questionnaire: { eligibilityFields: [], groups: [] } }}
            onComplete={handleNext}
          />
        )

      default:
        return null
    }
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {/* Back button */}
          {!isFirstStep && (
            <button
              onClick={handleBack}
              className={cn(
                "flex items-center gap-1 text-sm text-muted-foreground",
                "hover:text-foreground transition-colors"
              )}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          {isFirstStep && <div />}

          {/* Step label */}
          <span className="text-xs text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>

        {/* Progress track */}
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Step content with transitions */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStepDef?.id ?? "loading"}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <StepErrorBoundary stepId={currentStepDef?.id ?? "unknown"}>
            {isCompleting ? (
              <div className="text-center py-16">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
                <p className="text-sm text-muted-foreground mt-4">
                  Preparing your request…
                </p>
              </div>
            ) : (
              renderStep()
            )}
          </StepErrorBoundary>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
