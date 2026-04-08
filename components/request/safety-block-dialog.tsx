"use client"

import { AlertTriangle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Button } from "@/components/ui/button"
import type { SafetyEvaluationResult } from "@/lib/safety"

interface SafetyBlockDialogProps {
  safetyBlock: SafetyEvaluationResult | null
  onDismiss: () => void
  onReturnHome: () => void
  onContactUs: () => void
}

export function SafetyBlockDialog({
  safetyBlock,
  onDismiss,
  onReturnHome,
  onContactUs,
}: SafetyBlockDialogProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {safetyBlock && (
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={prefersReducedMotion ? {} : { scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-background rounded-xl p-6 max-w-md w-full shadow-xl"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {safetyBlock.patientTitle}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {safetyBlock.patientMessage}
                </p>
              </div>
            </div>
            {safetyBlock.outcome === 'REQUIRES_CALL' ? (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onReturnHome}
                >
                  Return home
                </Button>
                <Button
                  className="flex-1"
                  onClick={onContactUs}
                >
                  Contact us
                </Button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onDismiss}
                >
                  Go back
                </Button>
                <Button
                  className="flex-1"
                  onClick={onReturnHome}
                >
                  Return home
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
