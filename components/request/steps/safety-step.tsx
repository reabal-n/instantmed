"use client"

/**
 * Safety Step - Emergency gate before any clinical data entry
 * Uses the shared EmergencyGate component for consistency
 */

import { EmergencyGate } from "@/components/shared/emergency-gate"
import { CheckCircle } from "lucide-react"
import { useRequestStore } from "../store"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface SafetyStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const SERVICE_NAMES: Record<UnifiedServiceType, string> = {
  'med-cert': 'Medical certificate requests',
  'prescription': 'Prescription requests',
  'repeat-script': 'Repeat prescription requests',
  'consult': 'Telehealth consultations',
  'referral': 'Referral requests',
}

export default function SafetyStep({ serviceType, onNext }: SafetyStepProps) {
  const { safetyConfirmed, setSafetyConfirmed } = useRequestStore()

  if (safetyConfirmed) {
    return (
      <div className="text-center py-8 animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-950/50 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div className="mt-4">
          <h2 className="text-lg font-semibold">Safety confirmed</h2>
          <p className="text-sm text-muted-foreground mt-1">
            You&apos;ve confirmed this is not a medical emergency
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in">
      <EmergencyGate
        serviceName={SERVICE_NAMES[serviceType]}
        onAcknowledge={() => {
          setSafetyConfirmed(true)
          onNext()
        }}
      />
    </div>
  )
}
