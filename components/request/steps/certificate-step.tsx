"use client"

/**
 * Certificate Step - Medical certificate type and duration selection
 * Extracted from EnhancedIntakeFlow for the unified /request flow
 */

import { useState } from "react"
import { Briefcase, GraduationCap, Heart, Shield, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { EnhancedSelectionButton } from "@/components/shared/enhanced-selection-button"
import { useRequestStore } from "../store"
import { cn as _cn } from "@/lib/utils"
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

function FormField({
  label,
  required,
  error,
  children,
  hint,
  helpText,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  hint?: string
  helpText?: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {helpText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{helpText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

export default function CertificateStep({ onNext }: CertificateStepProps) {
  const { answers, setAnswer } = useRequestStore()
  
  const certType = answers.certType as CertType | undefined
  const duration = answers.duration as Duration | undefined
  const startDate = (answers.startDate as string) || new Date().toISOString().split("T")[0]
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!certType) newErrors.certType = "Please select certificate type"
    if (!duration) newErrors.duration = "Please select duration"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      onNext()
    }
  }

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
        error={errors.certType}
        hint="Choose the type that matches your situation"
        helpText="Select Work for employer, Study for university/school, or Carer's leave to care for someone"
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
        error={errors.duration}
        helpText={`1 day: $${PRICING.MED_CERT} · 2 days: $${PRICING.MED_CERT_2DAY} · 3+ days requires a consult`}
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
        helpText="Medical certificates can only be issued from today onwards."
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
        disabled={!certType || !duration}
      >
        Continue
      </Button>
    </div>
  )
}
