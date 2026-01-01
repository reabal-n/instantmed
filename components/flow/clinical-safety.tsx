"use client"

import { useState } from "react"
import {
  AlertTriangle,
  Phone,
  MapPin,
  X,
  ChevronRight,
  Heart,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

// =============================================================================
// TYPES
// =============================================================================

interface RedFlagSymptom {
  id: string
  symptom: string
  severity: "critical" | "urgent" | "moderate"
  action: string
}

interface EmergencyModalProps {
  isOpen: boolean
  onClose: () => void
  symptoms?: string[]
}

// =============================================================================
// RED FLAG SYMPTOMS
// =============================================================================

export const RED_FLAG_SYMPTOMS: RedFlagSymptom[] = [
  { id: "chest_pain", symptom: "Chest pain or pressure", severity: "critical", action: "Call 000 immediately" },
  { id: "difficulty_breathing", symptom: "Severe difficulty breathing", severity: "critical", action: "Call 000 immediately" },
  { id: "stroke_signs", symptom: "Sudden weakness, numbness, or confusion", severity: "critical", action: "Call 000 immediately" },
  { id: "severe_bleeding", symptom: "Uncontrolled bleeding", severity: "critical", action: "Call 000 immediately" },
  { id: "suicidal_thoughts", symptom: "Thoughts of self-harm or suicide", severity: "critical", action: "Call Lifeline 13 11 14" },
  { id: "head_injury", symptom: "Severe head injury with loss of consciousness", severity: "urgent", action: "Seek emergency care" },
  { id: "severe_abdo_pain", symptom: "Sudden severe abdominal pain", severity: "urgent", action: "Seek urgent care" },
  { id: "high_fever", symptom: "Very high fever (>40°C) with confusion", severity: "urgent", action: "Seek urgent care" },
]

// =============================================================================
// EMERGENCY MODAL
// =============================================================================

export function EmergencyModal({ isOpen, onClose, symptoms }: EmergencyModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-muted rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-red-900 mb-2">
            This sounds like an emergency
          </h2>
          <p className="text-sm text-muted-foreground">
            Based on your symptoms, we recommend seeking immediate medical attention.
          </p>
        </div>

        {symptoms && symptoms.length > 0 && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-100">
            <p className="text-xs font-medium text-red-800 mb-2">Concerning symptoms:</p>
            <ul className="text-sm text-red-700 space-y-1">
              {symptoms.map((symptom, i) => (
                <li key={i} className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {symptom}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <a
            href="tel:000"
            className="flex items-center justify-center gap-3 w-full h-14 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
          >
            <Phone className="w-5 h-5" />
            Call 000 (Emergency)
          </a>

          <a
            href="https://www.healthdirect.gov.au/australian-health-services"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium"
          >
            <MapPin className="w-4 h-4" />
            Find nearest emergency department
            <ChevronRight className="w-4 h-4 ml-auto" />
          </a>

          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-3">
              Mental health support
            </p>
            <div className="flex gap-2">
              <a
                href="tel:131114"
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border border-border hover:bg-muted transition-colors text-xs font-medium"
              >
                <Heart className="w-3.5 h-3.5 text-pink-500" />
                Lifeline
              </a>
              <a
                href="tel:1300224636"
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border border-border hover:bg-muted transition-colors text-xs font-medium"
              >
                <Phone className="w-3.5 h-3.5 text-blue-500" />
                Beyond Blue
              </a>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          My symptoms are not this severe
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// SAFETY DISCLAIMER CHECKBOX
// =============================================================================

interface SafetyDisclaimerProps {
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
}

export function SafetyDisclaimer({ checked, onChange, className }: SafetyDisclaimerProps) {
  return (
    <div className={cn("p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3", className)}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-800">Important safety notice</p>
          <p className="text-sm text-amber-700">
            If you&apos;re experiencing a medical emergency, please call 000 immediately.
          </p>
        </div>
      </div>
      
      <label className="flex items-start gap-3 p-3 rounded-lg bg-white border border-amber-200 cursor-pointer hover:bg-amber-50/50 transition-colors">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-5 w-5 rounded border-amber-300 text-primary focus:ring-primary"
        />
        <div className="space-y-0.5">
          <span className="text-sm font-medium text-foreground">
            I confirm this is not a medical emergency
          </span>
          <span className="text-xs text-muted-foreground block">
            I understand this is a non-urgent telehealth consultation
          </span>
        </div>
      </label>
    </div>
  )
}

// =============================================================================
// HOOK FOR SAFETY CHECKS
// =============================================================================

export function useSafetyCheck() {
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [triggeredSymptoms, setTriggeredSymptoms] = useState<string[]>([])

  const checkForRedFlags = (symptoms: string[]): boolean => {
    const redFlagMatches = RED_FLAG_SYMPTOMS.filter((rf) =>
      symptoms.some((s) => s.toLowerCase().includes(rf.symptom.toLowerCase()))
    )
    
    if (redFlagMatches.length > 0) {
      setTriggeredSymptoms(redFlagMatches.map((rf) => rf.symptom))
      setShowEmergencyModal(true)
      return true
    }
    
    return false
  }

  const closeEmergencyModal = () => {
    setShowEmergencyModal(false)
  }

  return {
    showEmergencyModal,
    triggeredSymptoms,
    checkForRedFlags,
    closeEmergencyModal,
  }
}

export default SafetyDisclaimer
