"use client"

/**
 * Safety Step - Inline emergency notice before clinical data entry
 * Uses the shared EmergencyGate component for consistency.
 *
 * UX: Compact inline card with single-click acknowledgment.
 * No more full-screen gate or animated reassurance — just a quick
 * confirmation that auto-advances to the next step.
 */

import { useCallback } from "react"
import { motion } from "framer-motion"
import { EmergencyGate } from "@/components/shared/emergency-gate"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowRight } from "lucide-react"
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

  const handleAcknowledge = useCallback(() => {
    setSafetyConfirmed(true)
    onNext()
  }, [setSafetyConfirmed, onNext])

  // Already confirmed (navigated back) — show compact confirmation with continue
  if (safetyConfirmed) {
    return (
      <div className="space-y-4 animate-in fade-in">
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">Safety confirmed</p>
            <p className="text-xs text-green-600 dark:text-green-400">Not a medical emergency</p>
          </div>
        </div>
        <Button
          onClick={onNext}
          className="w-full h-11 rounded-xl"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <EmergencyGate
        serviceName={SERVICE_NAMES[serviceType]}
        onAcknowledge={handleAcknowledge}
      />
    </motion.div>
  )
}
