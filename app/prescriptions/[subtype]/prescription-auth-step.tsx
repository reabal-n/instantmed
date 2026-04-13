"use client"

import { CheckCircle, User } from "lucide-react"

import { InlineAuthStep } from "@/components/shared"

import type { FlowStep } from "./types"

interface PrescriptionAuthStepProps {
  setStep: (s: FlowStep) => void
  onAuthComplete: (userId: string, profileId: string) => void
}

export function PrescriptionAuthStep({ setStep, onAuthComplete }: PrescriptionAuthStepProps) {
  return (
    <div className="space-y-6">
      <div
        className="text-center animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm text-primary mb-4">
          <User className="h-4 w-4" />
          Step 2 of 3
        </div>
      </div>

      <div
        className="glass-card rounded-2xl p-6 sm:p-8 animate-scale-in opacity-0"
        style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
      >
        <InlineAuthStep
          serviceName="prescription"
          onBack={() => setStep("form")}
          onAuthComplete={onAuthComplete}
        />
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
        <span>Your answers are saved and will not be lost</span>
      </div>
    </div>
  )
}
