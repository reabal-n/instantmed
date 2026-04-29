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

import type { ComponentType } from "react"
import { useMemo } from "react"

import type { UnifiedServiceType, UnifiedStepId } from "@/lib/request/step-registry"

import { StepErrorBoundary } from "./step-error-boundary"
import CertificateStep from "./steps/certificate-step"
import CheckoutStep from "./steps/checkout-step"
import ConsultReasonStep from "./steps/consult-reason-step"
import EdAssessmentStep from "./steps/ed-assessment-step"
import EdGoalsStep from "./steps/ed-goals-step"
import EdHealthStep from "./steps/ed-health-step"
import EdPreferencesStep from "./steps/ed-preferences-step"
import HairLossAssessmentStep from "./steps/hair-loss-assessment-step"
import HairLossGoalsStep from "./steps/hair-loss-goals-step"
import HairLossHealthStep from "./steps/hair-loss-health-step"
import HairLossPreferencesStep from "./steps/hair-loss-preferences-step"
import MedicalHistoryStep from "./steps/medical-history-step"
import MedicationHistoryStep from "./steps/medication-history-step"
import MedicationStep from "./steps/medication-step"
import PatientDetailsStep from "./steps/patient-details-step"
import ReviewStep from "./steps/review-step"
import SymptomsStep from "./steps/symptoms-step"
import WeightLossAssessmentStep from "./steps/weight-loss-assessment-step"
import WeightLossCallStep from "./steps/weight-loss-call-step"
import WomensHealthAssessmentStep from "./steps/womens-health-assessment-step"
import WomensHealthTypeStep from "./steps/womens-health-type-step"

interface StepComponentProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const stepComponents = {
  'certificate-step': CertificateStep,
  'symptoms-step': SymptomsStep,
  'medication-step': MedicationStep,
  'medication-history-step': MedicationHistoryStep,
  'medical-history-step': MedicalHistoryStep,
  'consult-reason-step': ConsultReasonStep,
  'patient-details-step': PatientDetailsStep,
  'review-step': ReviewStep,
  'checkout-step': CheckoutStep,
  // Consult subtype-specific steps - ED
  'ed-goals-step': EdGoalsStep,
  'ed-assessment-step': EdAssessmentStep,
  'ed-health-step': EdHealthStep,
  'ed-preferences-step': EdPreferencesStep,
  // Consult subtype-specific steps - Hair loss
  'hair-loss-goals-step': HairLossGoalsStep,
  'hair-loss-assessment-step': HairLossAssessmentStep,
  'hair-loss-health-step': HairLossHealthStep,
  'hair-loss-preferences-step': HairLossPreferencesStep,
  'womens-health-type-step': WomensHealthTypeStep,
  'womens-health-assessment-step': WomensHealthAssessmentStep,
  'weight-loss-assessment-step': WeightLossAssessmentStep,
  'weight-loss-call-step': WeightLossCallStep,
} satisfies Record<string, ComponentType<StepComponentProps>>

type StepComponentKey = keyof typeof stepComponents

export interface StepRouterProps {
  serviceType: UnifiedServiceType
  currentStepId: UnifiedStepId
  componentPath: string
  onNext: () => void
  onBack: () => void
  onComplete: () => void
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
      <StepComponent
        serviceType={serviceType}
        onNext={onNext}
        onBack={onBack}
        onComplete={onComplete}
      />
    </StepErrorBoundary>
  )
}
