"use client"

import { PrescriptionAuthStep } from "./prescription-auth-step"
import { PrescriptionFormStep } from "./prescription-form-step"
import { PrescriptionIntroStep } from "./prescription-intro-step"
import { PrescriptionOnboardingStep } from "./prescription-onboarding-step"
import type { PrescriptionFlowClientProps } from "./types"
import { usePrescriptionFlow } from "./use-prescription-flow"

export function PrescriptionFlowClient({
  category: _category,
  subtype,
  title,
  description: _description,
  patientId: initialPatientId,
  isAuthenticated: initialIsAuthenticated,
  needsOnboarding: initialNeedsOnboarding,
  userEmail: _userEmail,
  userName,
}: PrescriptionFlowClientProps) {
  const flow = usePrescriptionFlow({
    subtype,
    initialPatientId,
    initialIsAuthenticated,
    initialNeedsOnboarding,
    userName,
  })

  if (flow.step === "intro") {
    return (
      <PrescriptionIntroStep
        title={title}
        subtype={subtype}
        setStep={flow.setStep}
      />
    )
  }

  if (flow.step === "auth") {
    return (
      <PrescriptionAuthStep
        setStep={flow.setStep}
        onAuthComplete={flow.handleAuthComplete}
      />
    )
  }

  if (flow.step === "onboarding") {
    return (
      <PrescriptionOnboardingStep
        patientId={flow.patientId!}
        currentUserName={flow.currentUserName}
        setStep={flow.setStep}
        onComplete={flow.handleOnboardingComplete}
      />
    )
  }

  // Form step
  return (
    <PrescriptionFormStep
      subtype={subtype}
      title={title}
      flow={flow}
    />
  )
}
