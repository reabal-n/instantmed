"use client"

/**
 * Consult Reason Step - General consultation pathway selection
 * Collects reason for consultation with common categories
 */

import { useState, useEffect } from "react"
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
  { value: "new_medication", label: "New medication", icon: "💊" },
  { value: "ed", label: "Erectile dysfunction", icon: "🔵" },
  { value: "hair_loss", label: "Hair loss", icon: "💇" },
  { value: "weight_loss", label: "Weight loss", icon: "⚖️" },
  { value: "womens_health", label: "Women's health", icon: "🌸" },
  { value: "general", label: "Other / General consult", icon: "🩺" },
] as const

// Map hub subtypes to category values
const SUBTYPE_TO_CATEGORY: Record<string, string> = {
  'general': 'general',
  'new-medication': 'new_medication',
  'ed': 'ed',
  'hair-loss': 'hair_loss',
  'womens-health': 'womens_health',
  'weight-loss': 'weight_loss',
}

// Subtype-specific guidance and placeholders
const CATEGORY_GUIDANCE: Record<string, {
  placeholder: string
  helperText: string
  suggestedTopics: string[]
}> = {
  new_medication: {
    placeholder: "Tell us about the medication you need and why you believe it would help...",
    helperText: "Include any relevant symptoms, previous treatments, or why you're seeking this specific medication.",
    suggestedTopics: ["Medication name", "Why you need it", "Relevant symptoms", "Previous treatments"],
  },
  ed: {
    placeholder: "Describe when you first noticed symptoms, how often they occur, and any relevant health conditions...",
    helperText: "Include information about onset, frequency, and any medications you currently take.",
    suggestedTopics: ["When symptoms started", "Frequency", "Current medications", "Other health conditions"],
  },
  hair_loss: {
    placeholder: "Describe the pattern of hair loss, when you first noticed it, and any family history...",
    helperText: "Include where hair loss is occurring and any changes to your routine.",
    suggestedTopics: ["Pattern of loss", "Duration", "Family history", "Recent changes"],
  },
  weight_loss: {
    placeholder: "Describe your weight goals, current diet and exercise, and any previous attempts...",
    helperText: "Include your current weight, target, and any relevant health conditions.",
    suggestedTopics: ["Current weight", "Target weight", "Diet history", "Exercise routine"],
  },
  womens_health: {
    placeholder: "Describe your concern, relevant symptoms, and any relevant menstrual or reproductive history...",
    helperText: "Include cycle regularity, any current contraception, and symptom timing.",
    suggestedTopics: ["Main concern", "Symptom timing", "Current contraception", "Relevant history"],
  },
  general: {
    placeholder: "Describe your health concern, including any symptoms, how long you've had them, and what you've tried...",
    helperText: "The more detail you provide, the better the doctor can assess your situation.",
    suggestedTopics: ["Main concern", "Duration", "Severity", "What you've tried"],
  },
}

export default function ConsultReasonStep({ onNext }: ConsultReasonStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Pre-fill from hub subtype selection
  const consultSubtype = answers.consultSubtype as string | undefined
  const consultCategory = answers.consultCategory as string | undefined
  const consultDetails = (answers.consultDetails as string) || ""
  const consultUrgency = answers.consultUrgency as string | undefined

  // Apply hub subtype selection on mount
  useEffect(() => {
    if (consultSubtype && !consultCategory) {
      const mappedCategory = SUBTYPE_TO_CATEGORY[consultSubtype]
      if (mappedCategory) {
        setAnswer("consultCategory", mappedCategory)
      }
    }
  }, [consultSubtype, consultCategory, setAnswer])

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
          {consultCategory && CATEGORY_GUIDANCE[consultCategory]
            ? CATEGORY_GUIDANCE[consultCategory].helperText
            : "Include symptoms, duration, and any relevant history. The more detail, the better we can help."}
        </p>
        
        {/* Suggested topics for the selected category */}
        {consultCategory && CATEGORY_GUIDANCE[consultCategory] && (
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_GUIDANCE[consultCategory].suggestedTopics.map((topic) => (
              <span
                key={topic}
                className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
              >
                {topic}
              </span>
            ))}
          </div>
        )}
        
        <Textarea
          value={consultDetails}
          onChange={(e) => setAnswer("consultDetails", e.target.value)}
          placeholder={
            consultCategory && CATEGORY_GUIDANCE[consultCategory]
              ? CATEGORY_GUIDANCE[consultCategory].placeholder
              : "Describe your concern in detail..."
          }
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
