"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface ControlledSubstanceWarningProps {
  onClose: () => void
}

export function ControlledSubstanceWarning({ onClose }: ControlledSubstanceWarningProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={prefersReducedMotion ? {} : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-card rounded-2xl p-6 max-w-sm w-full space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Controlled Substance</h2>
            <p className="text-sm text-muted-foreground mt-1">
              This medication is a controlled substance and cannot be prescribed through our online service.
              Please visit your local GP or specialist.
            </p>
          </div>
        </div>
        <Button onClick={onClose} className="w-full">
          I understand
        </Button>
      </motion.div>
    </div>
  )
}
