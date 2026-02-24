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
import { useRequestStore } from "../store"
import { FormField } from "../form-field"
import { getSmartDefaults, recordStepCompletion, savePreferences } from "@/lib/request/preferences"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import { MED_CERT_DURATIONS } from "@/lib/constants"
import { cn } from "@/lib/utils"
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

type CertType = "work" | "study" | "carer"
type Duration = "1" | "2" | "3"

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
    // Ensure startDate is set in store (defaults to today if not set)
    if (!answers.startDate) {
      setAnswer('startDate', new Date().toISOString().split("T")[0])
    }
  }, [certType, answers.startDate, setAnswer])

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

      {/* Certificate type — segmented control */}
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
        <div className="relative flex rounded-xl bg-slate-100 dark:bg-white/5 p-1 gap-1 mt-2">
          {CERT_TYPES.map((type) => {
            const isSelected = certType === type.id
            const Icon = type.icon
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setAnswer("certType", type.id)}
                className={cn(
                  "relative flex-1 flex flex-col items-center gap-1 py-3 rounded-lg text-sm font-medium transition-all duration-200 touch-manipulation",
                  isSelected
                    ? "bg-white dark:bg-white/10 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn(
                  "w-4 h-4 transition-colors duration-200",
                  isSelected ? "text-primary" : "text-muted-foreground/60"
                )} />
                <span>{type.label}</span>
              </button>
            )
          })}
        </div>
      </FormField>

      {/* Duration with tiered pricing — segmented selector */}
      <FormField
        label="How many days?"
        required
        error={touched.duration ? errors.duration : undefined}
        helpContent={{
          title: "How long can I get?",
          content: `1 day: $${MED_CERT_DURATIONS.prices[1]}. 2 days: $${MED_CERT_DURATIONS.prices[2]}. 3 days: $${MED_CERT_DURATIONS.prices[3]}. For longer periods, a telehealth consultation is required.`
        }}
      >
        <div className="space-y-3 mt-2">
          {/* Segmented control */}
          <div className="relative flex rounded-xl bg-slate-100 dark:bg-white/5 p-1 gap-1">
            {MED_CERT_DURATIONS.options.map((days) => {
              const isSelected = duration === String(days)
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => setAnswer("duration", String(days))}
                  className={cn(
                    "relative flex-1 flex flex-col items-center gap-0.5 py-3 rounded-lg text-sm font-medium transition-all duration-200 touch-manipulation",
                    isSelected
                      ? "bg-white dark:bg-white/10 text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{MED_CERT_DURATIONS.labels[days]}</span>
                  <span className={cn(
                    "text-xs font-semibold transition-colors duration-200",
                    isSelected ? "text-primary" : "text-muted-foreground/60"
                  )}>
                    ${MED_CERT_DURATIONS.prices[days]}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Active price display */}
          {duration && (
            <div className="flex items-center justify-between px-1 animate-in fade-in duration-200">
              <p className="text-xs text-muted-foreground">
                No waiting rooms. Reviewed by a doctor within ~1 hour.
              </p>
              <span className="text-sm font-semibold text-primary">
                ${MED_CERT_DURATIONS.prices[Number(duration) as 1 | 2 | 3]}
              </span>
            </div>
          )}

          {!duration && (
            <p className="text-xs text-muted-foreground text-center">
              No waiting rooms. Reviewed by a doctor within ~1 hour.
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Need 4+ days? You&apos;ll need a{" "}
            <a href="/request?service=consult" className="text-primary underline underline-offset-2 hover:text-primary/80">
              general consultation
            </a>
            .
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
        className="w-full h-12"
        disabled={!canContinue}
      >
        Continue
      </Button>
    </div>
  )
}
