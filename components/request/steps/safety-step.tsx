"use client"

/**
 * Safety Step - Emergency gate before any clinical data entry
 * Uses the shared EmergencyGate component for consistency.
 * 
 * UX: After acknowledging, shows a brief reassurance animation (800ms)
 * before auto-advancing to the next step. This reduces patient anxiety
 * and provides positive feedback that they've cleared the safety check.
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
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

const AUTO_ADVANCE_DELAY = 800

export default function SafetyStep({ serviceType, onNext }: SafetyStepProps) {
  const { safetyConfirmed, setSafetyConfirmed } = useRequestStore()
  const [showReassurance, setShowReassurance] = useState(false)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    }
  }, [])

  const handleAcknowledge = useCallback(() => {
    setSafetyConfirmed(true)
    setShowReassurance(true)
    // Brief reassurance moment before auto-advancing
    advanceTimerRef.current = setTimeout(() => {
      onNext()
    }, AUTO_ADVANCE_DELAY)
  }, [setSafetyConfirmed, onNext])

  // Already confirmed (navigated back) -- show static confirmation
  if (safetyConfirmed && !showReassurance) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
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
        <Button
          onClick={onNext}
          className="w-full h-12 rounded-xl text-base font-medium"
        >
          Continue
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    )
  }

  // Just acknowledged -- show animated reassurance before auto-advance
  if (showReassurance) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center"
        >
          <CheckCircle className="w-8 h-8 text-green-600" />
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="text-center"
        >
          <p className="text-base font-medium text-green-800 dark:text-green-200">
            All clear
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Proceeding to your request...
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="gate"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        <EmergencyGate
          serviceName={SERVICE_NAMES[serviceType]}
          onAcknowledge={handleAcknowledge}
        />
      </motion.div>
    </AnimatePresence>
  )
}
