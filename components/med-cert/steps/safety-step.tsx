"use client"

import { MED_CERT_COPY } from "@/lib/microcopy/med-cert-v2"
import { StepHeader, EmergencyBanner } from "@/components/med-cert/med-cert-shared"

interface SafetyStepProps {
  emergencyDisclaimerConfirmed: boolean
  emergencyDisclaimerTimestamp: string | undefined
  onEmergencyConfirm: (confirmed: boolean) => void
}

export function SafetyStep({
  emergencyDisclaimerConfirmed,
  emergencyDisclaimerTimestamp,
  onEmergencyConfirm,
}: SafetyStepProps) {
  return (
    <div className="space-y-6 animate-step-enter">
      <StepHeader
        emoji="🩺"
        title="Medical Certificate"
        subtitle="A GP will review your request"
      />

      <EmergencyBanner
        accepted={emergencyDisclaimerConfirmed}
        onAccept={onEmergencyConfirm}
        timestamp={emergencyDisclaimerTimestamp || null}
      />

      {emergencyDisclaimerConfirmed && (
        <div className="animate-fade-in">
          <p className="text-sm text-center text-muted-foreground">
            {MED_CERT_COPY.global.turnaround}
          </p>
        </div>
      )}
    </div>
  )
}
