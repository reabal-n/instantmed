"use client"

/**
 * Safety Step - Repeat Prescription Intake
 * 
 * Emergency hard gate - MUST be completed before any clinical data entry.
 * Uses the shared EmergencyGate component for consistent compliance.
 * ~50 lines - well under 200 line limit.
 */

import { EmergencyGate } from "@/components/shared/emergency-gate"

interface SafetyStepProps {
  emergencyAccepted: boolean
  onEmergencyAcceptedChange: (value: boolean) => void
  emergencyTimestamp: string | null
}

export function SafetyStep({
  emergencyAccepted,
  onEmergencyAcceptedChange,
}: SafetyStepProps) {
  // If already acknowledged, show minimal confirmation
  if (emergencyAccepted) {
    return (
      <div className="space-y-4 animate-step-enter text-center py-8">
        <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-950/50 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Safety confirmed</h2>
          <p className="text-sm text-muted-foreground mt-1">
            You&apos;ve confirmed this is not a medical emergency
          </p>
        </div>
      </div>
    )
  }

  // Show the emergency gate for acknowledgment
  return (
    <div className="animate-step-enter">
      <EmergencyGate
        serviceName="Repeat prescription requests"
        onAcknowledge={() => {
          onEmergencyAcceptedChange(true)
        }}
      />
    </div>
  )
}
