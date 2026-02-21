"use client"

/**
 * Emergency Gate - Inline safety notice before clinical data entry
 *
 * CRITICAL: This component MUST be shown as the very first step of every
 * clinical flow. Users cannot proceed until they acknowledge they are not
 * experiencing an emergency.
 *
 * Compliance requirement: Emergency screening before clinical data collection.
 *
 * Design: Compact inline card instead of full-screen gate to reduce
 * conversion friction while maintaining compliance.
 */

import { useState } from "react"
import { Phone, AlertTriangle, CheckCircle, ChevronDown } from "lucide-react"
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
  const [showSymptoms, setShowSymptoms] = useState(false)

  const handleAcknowledge = () => {
    setAcknowledged(true)
    // Auto-advance after a brief moment so user sees the check
    setTimeout(() => {
      onAcknowledge()
    }, 300)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Compact safety notice */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-950/20 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              This service is for non-urgent conditions only
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              {serviceName} cannot treat emergencies.
            </p>
          </div>
        </div>

        {/* Expandable emergency details */}
        <button
          type="button"
          onClick={() => setShowSymptoms(!showSymptoms)}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
        >
          <Phone className="w-3 h-3" />
          <span>Call 000 if you have an emergency</span>
          <ChevronDown className={cn("w-3 h-3 transition-transform", showSymptoms && "rotate-180")} />
        </button>

        {showSymptoms && (
          <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-800/30 space-y-2">
            <ul className="space-y-1 text-xs text-red-800 dark:text-red-300">
              {EMERGENCY_SYMPTOMS.map((symptom, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-red-500 mt-0.5">&#8226;</span>
                  {symptom}
                </li>
              ))}
            </ul>
            <a
              href="tel:000"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              Call 000 — Emergency Services
            </a>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <a href="tel:131114" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Lifeline: 13 11 14
              </a>
              <span className="text-xs text-muted-foreground">&#8226;</span>
              <a href="tel:1800022222" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Healthdirect: 1800 022 222
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Acknowledgment checkbox — single click to proceed */}
      <button
        type="button"
        onClick={handleAcknowledge}
        disabled={acknowledged}
        className={cn(
          "w-full p-3.5 rounded-xl border-2 text-left transition-all duration-200",
          "flex items-center gap-3",
          acknowledged
            ? "border-green-500 bg-green-50 dark:bg-green-950/30"
            : "border-border hover:border-primary/40 cursor-pointer"
        )}
      >
        <div
          className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
            acknowledged
              ? "border-green-500 bg-green-500"
              : "border-muted-foreground/30"
          )}
        >
          {acknowledged && <CheckCircle className="w-3.5 h-3.5 text-white" />}
        </div>
        <p className="font-medium text-sm">
          I confirm this is not a medical emergency
        </p>
      </button>
    </div>
  )
}
