"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, Phone, Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/uix"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Red flag symptoms that require immediate medical attention
 * Based on Australian telehealth guidelines
 */
export const RED_FLAG_SYMPTOMS = [
  { id: "chest_pain", label: "Chest pain or tightness", severity: "critical", emoji: "💔" },
  { id: "breathing_difficulty", label: "Severe difficulty breathing", severity: "critical", emoji: "😮‍💨" },
  { id: "stroke_signs", label: "Face drooping, arm weakness, speech difficulty", severity: "critical", emoji: "🧠" },
  { id: "severe_bleeding", label: "Uncontrolled bleeding", severity: "critical", emoji: "🩸" },
  { id: "loss_consciousness", label: "Loss of consciousness", severity: "critical", emoji: "😵" },
  { id: "severe_allergic", label: "Severe allergic reaction (swelling, can&apos;t breathe)", severity: "critical", emoji: "⚠️" },
  { id: "suicidal_thoughts", label: "Thoughts of self-harm or suicide", severity: "critical", emoji: "🆘" },
  { id: "severe_head_injury", label: "Severe head injury", severity: "critical", emoji: "🤕" },
] as const

/**
 * Yellow flag symptoms that need prompt attention but not emergency
 */
export const YELLOW_FLAG_SYMPTOMS = [
  { id: "high_fever", label: "Fever over 39°C / 102°F", severity: "urgent", emoji: "🌡️" },
  { id: "dehydration", label: "Signs of severe dehydration", severity: "urgent", emoji: "💧" },
  { id: "severe_pain", label: "Severe pain not controlled by painkillers", severity: "urgent", emoji: "😣" },
  { id: "confusion", label: "Sudden confusion or disorientation", severity: "urgent", emoji: "😵‍💫" },
  { id: "blood_vomit", label: "Vomiting blood", severity: "urgent", emoji: "🤮" },
  { id: "blood_stool", label: "Blood in stool", severity: "urgent", emoji: "🩸" },
  { id: "pregnancy_pain", label: "Severe abdominal pain during pregnancy", severity: "urgent", emoji: "🤰" },
] as const

type Severity = "ok" | "mild" | "urgent" | "critical"

interface SymptomCheckResult {
  severity: Severity
  redFlags: string[]
  yellowFlags: string[]
  canProceed: boolean
  message: string
}

interface SymptomCheckerProps {
  selectedSymptoms: string[]
  symptomDetails?: string
  onContinue: () => void
  onEmergency: () => void
  className?: string
}

/**
 * Check symptoms for red/yellow flags
 */
export function checkSymptoms(
  selectedSymptoms: string[],
  symptomDetails?: string
): SymptomCheckResult {
  const detailsLower = (symptomDetails || "").toLowerCase()
  const symptomsLower = selectedSymptoms.map((s) => s.toLowerCase())

  const redFlags: string[] = []
  const yellowFlags: string[] = []

  // Check for red flag symptoms
  RED_FLAG_SYMPTOMS.forEach(({ id, label }) => {
    if (
      symptomsLower.some((s) => s.includes(id.replace(/_/g, " "))) ||
      selectedSymptoms.includes(id) ||
      detailsLower.includes(id.replace(/_/g, " ")) ||
      detailsLower.includes(label.toLowerCase())
    ) {
      redFlags.push(label)
    }
  })

  // Check for additional keywords in details
  const criticalKeywords = [
    "can&apos;t breathe",
    "cannot breathe",
    "crushing chest",
    "heart attack",
    "stroke",
    "kill myself",
    "suicide",
    "end my life",
    "unconscious",
    "passed out",
    "seizure",
    "anaphylaxis",
  ]

  criticalKeywords.forEach((keyword) => {
    if (detailsLower.includes(keyword) && !redFlags.includes(keyword)) {
      redFlags.push(`Mentioned: "${keyword}"`)
    }
  })

  // Check for yellow flag symptoms
  YELLOW_FLAG_SYMPTOMS.forEach(({ id, label }) => {
    if (
      symptomsLower.some((s) => s.includes(id.replace(/_/g, " "))) ||
      selectedSymptoms.includes(id) ||
      detailsLower.includes(id.replace(/_/g, " ")) ||
      detailsLower.includes(label.toLowerCase())
    ) {
      yellowFlags.push(label)
    }
  })

  // Determine severity and response
  if (redFlags.length > 0) {
    return {
      severity: "critical",
      redFlags,
      yellowFlags,
      canProceed: false,
      message: "These symptoms require immediate emergency attention.",
    }
  }

  if (yellowFlags.length > 0) {
    return {
      severity: "urgent",
      redFlags,
      yellowFlags,
      canProceed: true,
      message:
        "These symptoms may need prompt attention. Our doctors will prioritize your request.",
    }
  }

  return {
    severity: "ok",
    redFlags: [],
    yellowFlags: [],
    canProceed: true,
    message: "No red flags detected. You can proceed with your request.",
  }
}

/**
 * Emergency redirect dialog for critical symptoms
 */
export function EmergencyDialog({
  open,
  onClose,
  redFlags,
}: {
  open: boolean
  onClose: () => void
  redFlags: string[]
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Emergency Attention Needed
          </DialogTitle>
          <DialogDescription>
            Based on your symptoms, you need immediate medical care.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Red flags list */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800 mb-2">
              Concerning symptoms detected:
            </p>
            <ul className="space-y-1">
              {redFlags.map((flag) => (
                <li key={flag} className="text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {flag}
                </li>
              ))}
            </ul>
          </div>

          {/* Emergency options */}
          <div className="space-y-3">
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              size="lg"
              onClick={() => window.open("tel:000", "_self")}
            >
              <Phone className="h-4 w-4 mr-2" />
              Call 000 (Emergency)
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open("tel:131114", "_self")}
            >
              <Heart className="h-4 w-4 mr-2" />
              Lifeline: 13 11 14
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              If you&apos;re having a medical emergency, please call 000 immediately.
            </p>
          </div>

          {/* Override option */}
          <div className="pt-2 border-t">
            <button
              onClick={onClose}
              className="w-full text-sm text-muted-foreground hover:text-foreground py-2"
            >
              I understand the risks and want to continue anyway
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Inline symptom checker component
 */
export function SymptomChecker({
  selectedSymptoms,
  symptomDetails,
  onContinue,
  onEmergency,
  className,
}: SymptomCheckerProps) {
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false)

  const result = checkSymptoms(selectedSymptoms, symptomDetails)

  const handleContinue = () => {
    if (result.severity === "critical") {
      setShowEmergencyDialog(true)
      onEmergency()
    } else {
      onContinue()
    }
  }

  if (result.severity === "ok") return null

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-xl border p-4",
          result.severity === "critical"
            ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
            : "border-dawn-300 bg-dawn-50 dark:border-dawn-800 dark:bg-dawn-950/30",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              result.severity === "critical" ? "bg-red-500" : "bg-dawn-500"
            )}
          >
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>

          <div className="flex-1">
            <h4
              className={cn(
                "font-semibold",
                result.severity === "critical" ? "text-red-800" : "text-dawn-800"
              )}
            >
              {result.severity === "critical"
                ? "⚠️ These symptoms need immediate attention"
                : "⚡ These symptoms need prompt attention"}
            </h4>
            <p
              className={cn(
                "text-sm mt-1",
                result.severity === "critical" ? "text-red-700" : "text-dawn-700"
              )}
            >
              {result.message}
            </p>

            {/* Flags list */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {result.redFlags.map((flag) => (
                <Badge key={flag} variant="destructive" className="text-xs">
                  {flag}
                </Badge>
              ))}
              {result.yellowFlags.map((flag) => (
                <Badge
                  key={flag}
                  className="text-xs bg-dawn-200 text-dawn-800 hover:bg-dawn-300"
                >
                  {flag}
                </Badge>
              ))}
            </div>

            {result.severity === "critical" && (
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <Button
                  variant="destructive"
                  onClick={() => window.open("tel:000", "_self")}
                  className="flex-1"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call 000
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowEmergencyDialog(true)}
                  className="flex-1"
                >
                  View other options
                </Button>
              </div>
            )}

            {result.severity === "urgent" && (
              <div className="mt-4">
                <Button
                  onClick={handleContinue}
                  className="bg-dawn-600 hover:bg-dawn-700 text-white"
                >
                  I understand, continue anyway
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <EmergencyDialog
        open={showEmergencyDialog}
        onClose={() => setShowEmergencyDialog(false)}
        redFlags={result.redFlags}
      />
    </>
  )
}

/**
 * Simple red flag check badge for forms
 */
export function RedFlagBadge({ hasRedFlags }: { hasRedFlags: boolean }) {
  if (!hasRedFlags) return null

  return (
    <Badge variant="destructive" className="animate-pulse">
      <AlertTriangle className="h-3 w-3 mr-1" />
      Red flags detected
    </Badge>
  )
}
