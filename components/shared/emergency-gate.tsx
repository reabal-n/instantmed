"use client"

/**
 * Emergency Gate - Hard gate before any clinical data entry
 * 
 * CRITICAL: This component MUST be shown as the very first step of every
 * clinical flow. Users cannot proceed until they acknowledge they are not
 * experiencing an emergency.
 * 
 * Compliance requirement: Emergency screening before clinical data collection.
 */

import { useState } from "react"
import { Phone, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmergencyGateProps {
  onAcknowledge: () => void
  serviceName?: string
  className?: string
}

const EMERGENCY_SYMPTOMS = [
  "Chest pain or pressure",
  "Difficulty breathing",
  "Severe bleeding",
  "Signs of stroke (face drooping, arm weakness, speech difficulty)",
  "Severe allergic reaction",
  "Loss of consciousness",
  "Thoughts of self-harm",
]

export function EmergencyGate({
  onAcknowledge,
  serviceName = "this service",
  className,
}: EmergencyGateProps) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [acknowledgedAt, setAcknowledgedAt] = useState<string | null>(null)

  const handleAcknowledge = () => {
    const timestamp = new Date().toISOString()
    setAcknowledged(true)
    setAcknowledgedAt(timestamp)
  }

  const handleContinue = () => {
    if (acknowledged && acknowledgedAt) {
      onAcknowledge()
    }
  }

  return (
    <div className={cn("max-w-lg mx-auto space-y-6", className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-xl font-semibold">Before we begin</h1>
        <p className="text-muted-foreground text-sm">
          {serviceName} is for non-urgent medical needs only
        </p>
      </div>

      {/* Emergency warning card */}
      <div className="rounded-2xl border-2 border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="font-semibold text-red-900 dark:text-red-200">
              Call 000 immediately if you have:
            </h2>
          </div>
        </div>

        <ul className="space-y-2 ml-2">
          {EMERGENCY_SYMPTOMS.map((symptom, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-red-800 dark:text-red-300"
            >
              <span className="text-red-500 mt-0.5">•</span>
              {symptom}
            </li>
          ))}
        </ul>

        <a
          href="tel:000"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
        >
          <Phone className="w-4 h-4" />
          Call 000 — Emergency Services
        </a>
      </div>

      {/* Acknowledgment */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleAcknowledge}
          className={cn(
            "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
            "flex items-start gap-3",
            acknowledged
              ? "border-green-500 bg-green-50 dark:bg-green-950/30"
              : "border-border hover:border-primary/40"
          )}
        >
          <div
            className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
              acknowledged
                ? "border-green-500 bg-green-500"
                : "border-muted-foreground/30"
            )}
          >
            {acknowledged && <CheckCircle className="w-4 h-4 text-white" />}
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">
              I confirm I am not experiencing a medical emergency
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              I understand this service is for non-urgent conditions and will
              call 000 if my situation changes
            </p>
          </div>
        </button>

        {acknowledged && acknowledgedAt && (
          <p className="text-xs text-muted-foreground text-center">
            Acknowledged at {new Date(acknowledgedAt).toLocaleTimeString()}
          </p>
        )}

        <Button
          onClick={handleContinue}
          disabled={!acknowledged}
          className="w-full h-12 rounded-xl"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Additional resources */}
      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center mb-3">
          Other support services
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <a
            href="tel:131114"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 text-purple-700 dark:text-purple-400 text-xs font-medium hover:bg-purple-100 transition-colors"
          >
            Lifeline — 13 11 14
          </a>
          <a
            href="tel:1800022222"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 transition-colors"
          >
            Healthdirect — 1800 022 222
          </a>
        </div>
      </div>
    </div>
  )
}
