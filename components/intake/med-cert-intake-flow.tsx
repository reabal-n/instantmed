"use client"

import { useState, useCallback, useMemo, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ============================================
// TYPES
// ============================================

export interface IntakeStep {
  id: string
  title: string
  description?: string
}

interface MedCertIntakeFlowProps {
  /** Array of step definitions */
  steps: IntakeStep[]
  /** Currently active step index (0-based) */
  currentStep?: number
  /** Callback when step changes */
  onStepChange?: (step: number, direction: "forward" | "back") => void
  /** Callback when user completes all steps */
  onComplete?: () => void
  /** Callback when user exits the flow */
  onExit?: () => void
  /** Callback when user clicks the close (X) button */
  onClose?: () => void
  /** Whether the continue button should be disabled */
  canContinue?: boolean
  /** Whether the form is currently submitting */
  isSubmitting?: boolean
  /** Custom label for the continue button */
  continueLabel?: string
  /** Custom label for the back button */
  backLabel?: string
  /** Hide the navigation footer (useful for intro/auto-advance steps) */
  hideNavigation?: boolean
  /** Hide the progress indicator (useful for intro steps) */
  hideProgress?: boolean
  /** Hide the close button */
  hideCloseButton?: boolean
  /** Children render prop receiving current step index */
  children: (currentStep: number) => ReactNode
  /** Additional className for the container */
  className?: string
}

// ============================================
// ANIMATION VARIANTS
// ============================================

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 40 : -40,
    opacity: 0,
  }),
}

const progressVariants = {
  initial: { width: 0 },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      mass: 0.8,
    },
  }),
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface ProgressIndicatorProps {
  currentStep: number
  totalSteps: number
  steps: IntakeStep[]
}

function ProgressIndicator({ currentStep, totalSteps, steps }: ProgressIndicatorProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100
  const currentStepData = steps[currentStep]

  return (
    <div className="w-full space-y-3">
      {/* Progress bar container */}
      <div className="relative">
        {/* Background track */}
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          {/* Animated progress fill */}
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-primary to-blue-500 rounded-full"
            initial="initial"
            animate="animate"
            custom={progress}
            variants={progressVariants}
          />
        </div>

        {/* Step dots */}
        <div className="absolute inset-0 flex items-center justify-between px-0">
          {steps.map((_, index) => {
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep
            const isPending = index > currentStep

            return (
              <motion.div
                key={index}
                className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                  isCompleted && "bg-primary border-primary",
                  isCurrent && "bg-white dark:bg-slate-900 border-primary ring-4 ring-primary/20",
                  isPending && "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                )}
                initial={{ scale: 0.8 }}
                animate={{ scale: isCurrent ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {isCompleted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </motion.div>
                )}
                {isCurrent && (
                  <motion.div
                    className="w-1.5 h-1.5 bg-primary rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  />
                )}
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Step text indicator */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-center"
      >
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Step {currentStep + 1}</span>
          <span className="mx-1.5 text-slate-300 dark:text-slate-600">of</span>
          <span>{totalSteps}</span>
          {currentStepData?.title && (
            <>
              <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
              <span className="text-foreground font-medium">{currentStepData.title}</span>
            </>
          )}
        </p>
      </motion.div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MedCertIntakeFlow({
  steps,
  currentStep: controlledStep,
  onStepChange,
  onComplete,
  onExit,
  onClose,
  canContinue = true,
  isSubmitting = false,
  continueLabel,
  backLabel = "Back",
  hideNavigation = false,
  hideProgress = false,
  hideCloseButton = false,
  children,
  className,
}: MedCertIntakeFlowProps) {
  // Support both controlled and uncontrolled modes
  const [internalStep, setInternalStep] = useState(0)
  const [direction, setDirection] = useState(1)

  const currentStep = controlledStep ?? internalStep
  const totalSteps = steps.length
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === totalSteps - 1

  // Determine continue button label
  const computedContinueLabel = useMemo(() => {
    if (continueLabel) return continueLabel
    return isLastStep ? "Complete" : "Continue"
  }, [continueLabel, isLastStep])

  // Navigation handlers
  const goNext = useCallback(() => {
    if (isLastStep) {
      onComplete?.()
      return
    }

    setDirection(1)
    const nextStep = currentStep + 1

    if (controlledStep === undefined) {
      setInternalStep(nextStep)
    }
    onStepChange?.(nextStep, "forward")
  }, [currentStep, isLastStep, onComplete, onStepChange, controlledStep])

  const goBack = useCallback(() => {
    if (isFirstStep) {
      onExit?.()
      return
    }

    setDirection(-1)
    const prevStep = currentStep - 1

    if (controlledStep === undefined) {
      setInternalStep(prevStep)
    }
    onStepChange?.(prevStep, "back")
  }, [currentStep, isFirstStep, onExit, onStepChange, controlledStep])

  return (
    <div
      className={cn(
        "min-h-screen flex items-start justify-center px-4 py-8 sm:py-12",
        "bg-gradient-to-b from-slate-50 via-blue-50/30 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950",
        className
      )}
    >
      {/* Main container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          "w-full max-w-2xl relative",
          "bg-white dark:bg-slate-900",
          "rounded-2xl",
          "shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]",
          "border border-slate-100 dark:border-slate-800",
          "overflow-hidden"
        )}
      >
        {/* Close (X) button */}
        {!hideCloseButton && onClose && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className={cn(
              "absolute top-4 right-4 z-10",
              "w-10 h-10 rounded-full",
              "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700",
              "border border-slate-200/60 dark:border-slate-600/60",
              "flex items-center justify-center",
              "text-slate-500 dark:text-slate-400",
              "hover:text-slate-700 dark:hover:text-slate-200",
              "hover:border-slate-300 dark:hover:border-slate-500",
              "hover:shadow-md",
              "transition-all duration-200"
            )}
            aria-label="Close and return home"
          >
            <X className="w-5 h-5" />
          </motion.button>
        )}

        {/* Header with progress */}
        <AnimatePresence mode="wait">
          {!hideProgress && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-6 pt-6 pb-4 sm:px-8 sm:pt-8 border-b border-slate-100 dark:border-slate-800"
            >
              <ProgressIndicator
                currentStep={currentStep}
                totalSteps={totalSteps}
                steps={steps}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content area with step transitions */}
        <div className="relative min-h-[320px] sm:min-h-[400px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="px-6 py-6 sm:px-8 sm:py-8"
            >
              {children(currentStep)}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        <AnimatePresence mode="wait">
          {!hideNavigation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="px-6 py-4 sm:px-8 sm:py-5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Back button */}
                <Button
                  variant="ghost"
                  onClick={goBack}
                  disabled={isSubmitting}
                  className={cn(
                    "text-muted-foreground hover:text-foreground",
                    "transition-all duration-200",
                    isFirstStep && "invisible"
                  )}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {backLabel}
                </Button>

                {/* Continue button */}
                <Button
                  variant="default"
                  onClick={goNext}
                  disabled={!canContinue || isSubmitting}
                  className={cn(
                    "px-6 sm:px-8",
                    "bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90",
                    "text-white font-semibold",
                    "shadow-[0_4px_16px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)]",
                    "transition-all duration-200",
                    // Full width on mobile
                    "w-full sm:w-auto"
                  )}
                >
                  {isSubmitting ? (
                    <motion.div
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <>
                      {computedContinueLabel}
                      {!isLastStep && <ArrowRight className="w-4 h-4 ml-2" />}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ============================================
// STEP CONTENT WRAPPER (Optional helper)
// ============================================

interface StepContentProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function StepContent({ title, description, children, className }: StepContentProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Step header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="text-center sm:text-left"
      >
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-muted-foreground text-sm sm:text-base">
            {description}
          </p>
        )}
      </motion.div>

      {/* Step content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.3 }}
      >
        {children}
      </motion.div>
    </div>
  )
}

// ============================================
// EXAMPLE USAGE EXPORT
// ============================================

export const EXAMPLE_STEPS: IntakeStep[] = [
  { id: "purpose", title: "The reason" },
  { id: "details", title: "The details" },
  { id: "symptoms", title: "Your symptoms" },
  { id: "review", title: "Review" },
  { id: "payment", title: "Payment" },
]

