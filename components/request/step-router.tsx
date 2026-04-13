"use client"

/**
 * Step Router - Dynamically renders the current step component
 *
 * This component handles:
 * - Lazy loading step components
 * - Error boundaries for step failures
 *
 * Note: Transitions are owned by request-flow.tsx's AnimatePresence.
 * Do NOT add a second AnimatePresence here - it causes ghost renders.
 */

import { lazy, Suspense, useMemo } from "react"

import { SkeletonForm } from "@/components/ui/skeleton"
import type { UnifiedServiceType, UnifiedStepId } from "@/lib/request/step-registry"

import { StepErrorBoundary } from "./step-error-boundary"

// Lazy load step components
const stepComponents = {
  'certificate-step': lazy(() => import('./steps/certificate-step')),
  'symptoms-step': lazy(() => import('./steps/symptoms-step')),
  'medication-step': lazy(() => import('./steps/medication-step')),
  'medication-history-step': lazy(() => import('./steps/medication-history-step')),
  'medical-history-step': lazy(() => import('./steps/medical-history-step')),
  'consult-reason-step': lazy(() => import('./steps/consult-reason-step')),
  'patient-details-step': lazy(() => import('./steps/patient-details-step')),
  'review-step': lazy(() => import('./steps/review-step')),
  'checkout-step': lazy(() => import('./steps/checkout-step')),
  // Consult subtype-specific steps - ED
  'ed-goals-step': lazy(() => import('./steps/ed-goals-step')),
  'ed-assessment-step': lazy(() => import('./steps/ed-assessment-step')),
  'ed-health-step': lazy(() => import('./steps/ed-health-step')),
  'ed-preferences-step': lazy(() => import('./steps/ed-preferences-step')),
  'hair-loss-assessment-step': lazy(() => import('./steps/hair-loss-assessment-step')),
  'womens-health-type-step': lazy(() => import('./steps/womens-health-type-step')),
  'womens-health-assessment-step': lazy(() => import('./steps/womens-health-assessment-step')),
  'weight-loss-assessment-step': lazy(() => import('./steps/weight-loss-assessment-step')),
  'weight-loss-call-step': lazy(() => import('./steps/weight-loss-call-step')),
} as const

type StepComponentKey = keyof typeof stepComponents

export interface StepRouterProps {
  serviceType: UnifiedServiceType
  currentStepId: UnifiedStepId
  componentPath: string
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

function StepLoadingFallback() {
  return <SkeletonForm />
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

export function StepRouter({
  serviceType,
  currentStepId,
  componentPath,
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
  )
}
