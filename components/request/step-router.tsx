"use client"

/**
 * Step Router - Dynamically renders the current step component
 * 
 * This component handles:
 * - Lazy loading step components
 * - Step transitions with animations
 * - Error boundaries for step failures
 */

import { Suspense, lazy, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"
import { StepErrorBoundary } from "./step-error-boundary"
import type { UnifiedServiceType, UnifiedStepId } from "@/lib/request/step-registry"

// Lazy load step components
const stepComponents = {
  'safety-step': lazy(() => import('./steps/safety-step')),
  'certificate-step': lazy(() => import('./steps/certificate-step')),
  'symptoms-step': lazy(() => import('./steps/symptoms-step')),
  'medication-step': lazy(() => import('./steps/medication-step')),
  'medication-history-step': lazy(() => import('./steps/medication-history-step')),
  'medical-history-step': lazy(() => import('./steps/medical-history-step')),
  'consult-reason-step': lazy(() => import('./steps/consult-reason-step')),
  'patient-details-step': lazy(() => import('./steps/patient-details-step')),
  'review-step': lazy(() => import('./steps/review-step')),
  'checkout-step': lazy(() => import('./steps/checkout-step')),
  'referral-reason-step': lazy(() => import('./steps/referral-reason-step')),
} as const

type StepComponentKey = keyof typeof stepComponents

export interface StepRouterProps {
  serviceType: UnifiedServiceType
  currentStepId: UnifiedStepId
  componentPath: string
  direction: 1 | -1
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

function StepLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function StepNotFound({ componentPath }: { componentPath: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">
        Step component not found: {componentPath}
      </p>
    </div>
  )
}

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

export function StepRouter({
  serviceType,
  currentStepId,
  componentPath,
  direction,
  onNext,
  onBack,
  onComplete,
}: StepRouterProps) {
  const StepComponent = useMemo(() => {
    const key = componentPath as StepComponentKey
    return stepComponents[key] || null
  }, [componentPath])

  if (!StepComponent) {
    return <StepNotFound componentPath={componentPath} />
  }

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={currentStepId}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <StepErrorBoundary stepId={currentStepId}>
          <Suspense fallback={<StepLoadingFallback />}>
            <StepComponent
              serviceType={serviceType}
              onNext={onNext}
              onBack={onBack}
              onComplete={onComplete}
            />
          </Suspense>
        </StepErrorBoundary>
      </motion.div>
    </AnimatePresence>
  )
}
