"use client"

import { AlertTriangle } from "lucide-react"

import type { SafetyEvaluationResult } from "@/lib/safety/types"

import { RequestButton } from "./request-button"

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
  if (!safetyBlock) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl p-6 max-w-md w-full shadow-xl">
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
            <RequestButton
              variant="outline"
              className="flex-1"
              onClick={onReturnHome}
            >
              Return home
            </RequestButton>
            <RequestButton
              className="flex-1"
              onClick={onContactUs}
            >
              Contact us
            </RequestButton>
          </div>
        ) : (
          <div className="flex gap-3">
            <RequestButton
              variant="outline"
              className="flex-1"
              onClick={onDismiss}
            >
              Go back
            </RequestButton>
            <RequestButton
              className="flex-1"
              onClick={onReturnHome}
            >
              Return home
            </RequestButton>
          </div>
        )}
      </div>
    </div>
  )
}
