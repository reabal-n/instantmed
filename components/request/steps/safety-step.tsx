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
}

export default function SafetyStep({ serviceType, onNext }: SafetyStepProps) {
  const { safetyConfirmed, setSafetyConfirmed } = useRequestStore()

  if (safetyConfirmed) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 animate-in fade-in">
        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
          <CheckCircle className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">Safety confirmed</p>
          <p className="text-xs text-green-600 dark:text-green-400">
            Not a medical emergency
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
