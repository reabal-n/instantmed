"use client"

/**
 * Consult Reason Step - General consultation pathway selection
 * Collects reason for consultation with common categories
 */

import { useState } from "react"
import { Stethoscope, MessageSquare, Info } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EnhancedSelectionButton } from "@/components/shared/enhanced-selection-button"
import { useRequestStore } from "../store"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface ConsultReasonStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const CONSULT_CATEGORIES = [
  { value: "ed", label: "Erectile dysfunction", icon: "💊" },
  { value: "hair_loss", label: "Hair loss", icon: "💇" },
  { value: "weight_loss", label: "Weight loss", icon: "⚖️" },
  { value: "womens_health", label: "Women's health", icon: "🌸" },
  { value: "general", label: "General consult", icon: "🩺" },
] as const

export default function ConsultReasonStep({ onNext }: ConsultReasonStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const consultCategory = answers.consultCategory as string | undefined
  const consultDetails = (answers.consultDetails as string) || ""
  const consultUrgency = answers.consultUrgency as string | undefined

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!consultCategory) {
      newErrors.consultCategory = "Please select what you'd like help with"
    }
    
    if (!consultDetails?.trim() || consultDetails.length < 20) {
      newErrors.consultDetails = "Please provide more detail (at least 20 characters)"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      onNext()
    }
  }

  const isComplete = consultCategory && consultDetails?.length >= 20

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Info alert */}
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <Stethoscope className="w-4 h-4" />
        <AlertDescription className="text-xs">
          A doctor will review your request and respond within 1 hour during business hours.
        </AlertDescription>
      </Alert>

      {/* Category selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          What would you like help with?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {CONSULT_CATEGORIES.map((category) => (
            <EnhancedSelectionButton
              key={category.value}
              variant="card"
              selected={consultCategory === category.value}
              onClick={() => setAnswer("consultCategory", category.value)}
              className="justify-start gap-2 h-auto py-3 px-3"
            >
              <span className="text-lg">{category.icon}</span>
              <span className="text-sm">{category.label}</span>
            </EnhancedSelectionButton>
          ))}
        </div>
        {errors.consultCategory && (
          <p className="text-xs text-destructive">{errors.consultCategory}</p>
        )}
      </div>

      {/* Details textarea */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-medium">
            Tell us more about your concern
            <span className="text-destructive ml-0.5">*</span>
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Include symptoms, duration, and any relevant history. The more detail, the better we can help.
        </p>
        <Textarea
          value={consultDetails}
          onChange={(e) => setAnswer("consultDetails", e.target.value)}
          placeholder="Describe your concern in detail..."
          className="min-h-[120px] resize-none"
        />
        <div className="flex justify-between text-xs">
          {errors.consultDetails ? (
            <p className="text-destructive">{errors.consultDetails}</p>
          ) : (
            <p className="text-muted-foreground">Minimum 20 characters</p>
          )}
          <p className={`${consultDetails.length >= 20 ? 'text-primary' : 'text-muted-foreground'}`}>
            {consultDetails.length} characters
          </p>
        </div>
      </div>

      {/* Urgency selection */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-medium">How urgent is this?</Label>
        </div>
        <div className="flex gap-2">
          <EnhancedSelectionButton
            variant="chip"
            selected={consultUrgency === "routine"}
            onClick={() => setAnswer("consultUrgency", "routine")}
            className="flex-1"
          >
            Routine
          </EnhancedSelectionButton>
          <EnhancedSelectionButton
            variant="chip"
            selected={consultUrgency === "soon"}
            onClick={() => setAnswer("consultUrgency", "soon")}
            className="flex-1"
          >
            Within a day
          </EnhancedSelectionButton>
          <EnhancedSelectionButton
            variant="chip"
            selected={consultUrgency === "urgent"}
            onClick={() => setAnswer("consultUrgency", "urgent")}
            className="flex-1"
          >
            Urgent
          </EnhancedSelectionButton>
        </div>
      </div>

      {/* Continue button */}
      <Button 
        onClick={handleNext} 
        className="w-full h-12 mt-4"
        disabled={!isComplete}
      >
        Continue
      </Button>
    </div>
  )
}
