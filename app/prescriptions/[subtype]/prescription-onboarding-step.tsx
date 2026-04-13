"use client"

import { CreditCard } from "lucide-react"

import { InlineOnboardingStep } from "@/components/shared"

import type { FlowStep } from "./types"

interface PrescriptionOnboardingStepProps {
  patientId: string
  currentUserName: string
  setStep: (s: FlowStep) => void
  onComplete: () => void
}

export function PrescriptionOnboardingStep({
  patientId,
  currentUserName,
  setStep,
  onComplete,
}: PrescriptionOnboardingStepProps) {
  return (
    <div className="space-y-6">
      <div
        className="text-center animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm text-primary mb-4">
          <CreditCard className="h-4 w-4" />
          Step 3 of 3
        </div>
      </div>

      <div
        className="glass-card rounded-2xl p-6 sm:p-8 animate-scale-in opacity-0"
        style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
      >
        <InlineOnboardingStep
          profileId={patientId}
          userName={currentUserName}
          onBack={() => setStep("auth")}
          onComplete={onComplete}
        />
      </div>
    </div>
  )
}
