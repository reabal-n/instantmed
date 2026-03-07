"use client"

/**
 * Attestation Step - Repeat Prescription Intake
 * 
 * Patient attestations and confirmations.
 * ~80 lines - well under 200 line limit.
 */

import { Check } from "lucide-react"
import { StepHeader } from "../shared"
import { cn } from "@/lib/utils"
import { REPEAT_RX_COPY } from "@/lib/microcopy/repeat-rx"

interface AttestationStepProps {
  attestations: Record<string, boolean>
  onAttestationChange: (key: string, value: boolean) => void
}

const ATTESTATION_ITEMS = [
  {
    key: "truthful",
    label: "I confirm all information provided is true and accurate",
  },
  {
    key: "understanding",
    label: "I understand this is for a repeat of an existing prescription",
  },
  {
    key: "consent",
    label: "I consent to a doctor reviewing my request",
  },
  {
    key: "notify",
    label: "I will notify my regular GP about this prescription",
  },
]

export function AttestationStep({
  attestations,
  onAttestationChange,
}: AttestationStepProps) {
  return (
    <div className="space-y-6 animate-step-enter">
      <StepHeader
        title={REPEAT_RX_COPY.steps.attestation.title}
        subtitle={REPEAT_RX_COPY.steps.attestation.subtitle}
        emoji="✅"
      />

      <div className="space-y-3">
        {ATTESTATION_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onAttestationChange(item.key, !attestations[item.key])}
            className={cn(
              "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
              "flex items-start gap-3",
              attestations[item.key]
                ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                : "border-border hover:border-primary/40"
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5",
                attestations[item.key]
                  ? "border-green-500 bg-green-500"
                  : "border-border"
              )}
            >
              {attestations[item.key] && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
