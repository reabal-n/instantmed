"use client"

/**
 * Certificate Step - Medical certificate type and duration selection
 * 
 * Features:
 * - Smart defaults from preferences
 * - Real-time validation
 * - Help tooltips
 * - Keyboard navigation
 */

import { useState, useEffect, useCallback } from "react"
import { Briefcase, GraduationCap, Heart, Shield } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EnhancedSelectionButton } from "@/components/shared/enhanced-selection-button"
import { useRequestStore } from "../store"
import { FormField } from "../form-field"
import { getSmartDefaults, recordStepCompletion, savePreferences } from "@/lib/request/preferences"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface CertificateStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const CERT_TYPES = [
  { id: "work", label: "Work", icon: Briefcase, description: "For your employer" },
  { id: "study", label: "Study", icon: GraduationCap, description: "For uni or school" },
  { id: "carer", label: "Carer's leave", icon: Heart, description: "To care for someone" },
] as const

const PRICING = {
  MED_CERT: 19.95,
  MED_CERT_2DAY: 29.95,
}

type CertType = "work" | "study" | "carer"
type Duration = "1" | "2"

export default function CertificateStep({ onNext }: CertificateStepProps) {
  const { answers, setAnswer } = useRequestStore()
  
  const certType = answers.certType as CertType | undefined
  const duration = answers.duration as Duration | undefined
  const startDate = (answers.startDate as string) || new Date().toISOString().split("T")[0]
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Load smart defaults on mount
  useEffect(() => {
    const defaults = getSmartDefaults('certificate')
    if (defaults.certType && !certType) {
      setAnswer('certType', defaults.certType as string)
    }
  }, [certType, setAnswer])

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}
    if (!certType) newErrors.certType = "Please select certificate type"
    if (!duration) newErrors.duration = "Please select duration"
    setErrors(newErrors)
    setTouched({ certType: true, duration: true })
    return Object.keys(newErrors).length === 0
  }, [certType, duration])

  const handleNext = useCallback(() => {
    if (validate()) {
      // Save preferences for future
      savePreferences({ preferredCertType: certType })
      recordStepCompletion('certificate', { certType, duration })
      onNext()
    }
  }, [validate, certType, duration, onNext])

  const isComplete = certType && duration
  const hasNoErrors = Object.keys(errors).length === 0
  const canContinue = isComplete && hasNoErrors

  // Keyboard navigation
  useKeyboardNavigation({
    onNext: canContinue ? handleNext : undefined,
    enabled: Boolean(canContinue),
  })

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Trust indicator */}
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <Shield className="w-4 h-4" />
        <AlertDescription className="text-xs">
          All certificates are reviewed by AHPRA-registered Australian doctors
        </AlertDescription>
      </Alert>

      {/* Certificate type */}
      <FormField
        label="Certificate type"
        required
        error={touched.certType ? errors.certType : undefined}
        hint="Choose the type that matches your situation"
        helpContent={{ 
          title: "Which type should I choose?", 
          content: "Work: for your employer. Study: for university or school. Carer's leave: when caring for a family member." 
        }}
      >
        <div className="grid grid-cols-3 gap-2 mt-2">
          {CERT_TYPES.map((type) => (
            <EnhancedSelectionButton
              key={type.id}
              variant="option"
              selected={certType === type.id}
              onClick={() => setAnswer("certType", type.id)}
              icon={type.icon}
              label={type.label}
              gradient="primary-subtle"
              className="touch-manipulation"
            />
          ))}
        </div>
      </FormField>

      {/* Duration with tiered pricing */}
      <FormField
        label="How many days?"
        required
        error={touched.duration ? errors.duration : undefined}
        helpContent={{ 
          title: "How long can I get?", 
          content: `1 day: $${PRICING.MED_CERT}. 2 days: $${PRICING.MED_CERT_2DAY}. For 3+ days, a telehealth consultation is required.` 
        }}
      >
        <div className="space-y-3 mt-2">
          <div className="flex gap-2">
            <EnhancedSelectionButton
              variant="chip"
              selected={duration === "1"}
              onClick={() => setAnswer("duration", "1")}
              gradient="primary-subtle"
              className="flex-1 touch-manipulation"
            >
              <span className="flex flex-col items-center gap-0.5">
                <span>1 day</span>
                <span className="text-[10px] font-normal opacity-70">${PRICING.MED_CERT}</span>
              </span>
            </EnhancedSelectionButton>
            <EnhancedSelectionButton
              variant="chip"
              selected={duration === "2"}
              onClick={() => setAnswer("duration", "2")}
              gradient="primary-subtle"
              className="flex-1 touch-manipulation"
            >
              <span className="flex flex-col items-center gap-0.5">
                <span>2 days</span>
                <span className="text-[10px] font-normal opacity-70">${PRICING.MED_CERT_2DAY}</span>
              </span>
            </EnhancedSelectionButton>
          </div>
          
          {/* GP comparison - subtle value anchor */}
          <p className="text-[10px] text-muted-foreground text-center">
            <span className="line-through opacity-60">~$60 GP visit</span>
            <span className="mx-1.5">→</span>
            <span className="text-primary font-medium">
              Save ${duration === "2" 
                ? (60 - PRICING.MED_CERT_2DAY).toFixed(0)
                : (60 - PRICING.MED_CERT).toFixed(0)}+
            </span>
          </p>
        </div>
      </FormField>

      {/* Start date */}
      <FormField
        label="Start date"
        required
        hint="When does your absence start?"
        helpContent={{ 
          title: "Which date should I choose?", 
          content: "Select the first day you were unwell or unable to work/study. Backdating is not permitted." 
        }}
      >
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setAnswer("startDate", e.target.value)}
          className="h-11 mt-2"
          min={new Date().toISOString().split("T")[0]}
        />
      </FormField>

      {/* Continue button */}
      <Button 
        onClick={handleNext} 
        className="w-full h-12 mt-4"
        disabled={!canContinue}
      >
        Continue
      </Button>
    </div>
  )
}
