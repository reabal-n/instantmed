"use client"

/**
 * Consult Reason Step - General consultation pathway selection
 * Collects reason for consultation with common categories
 *
 * When consultSubtype is already set (user selected from service hub),
 * the category selector is hidden — only details + urgency are shown.
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
import { CONSULT_SUBTYPE_LABELS, type ConsultSubtype } from "@/lib/request/step-registry"

interface ConsultReasonStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const CONSULT_CATEGORIES = [
  { value: "skin", label: "Skin condition", icon: "🩹", description: "Rash, acne, eczema, or other skin concern" },
  { value: "infection", label: "Infection", icon: "💊", description: "May need antibiotics or antiviral treatment" },
  { value: "new_medication", label: "Starting new medication", icon: "📋", description: "Need a new prescription or recommendation" },
  { value: "general", label: "Other / General concern", icon: "🩺", description: "Something else not listed above" },
  { value: "ed", label: "Erectile dysfunction", icon: "🔵", description: "ED assessment and treatment" },
  { value: "hair_loss", label: "Hair loss", icon: "💇", description: "Hair loss assessment and treatment" },
  { value: "weight_loss", label: "Weight loss", icon: "⚖️", description: "Weight management consultation" },
  { value: "womens_health", label: "Women's health", icon: "🌸", description: "Women's health concern" },
] as const

// Map hub subtypes to category values (hub uses underscores: hair_loss, womens_health, weight_loss)
const SUBTYPE_TO_CATEGORY: Record<string, string> = {
  'general': 'general',
  'skin': 'skin',
  'infection': 'infection',
  'new_medication': 'new_medication',
  'ed': 'ed',
  'hair_loss': 'hair_loss',
  'womens_health': 'womens_health',
  'weight_loss': 'weight_loss',
}

// Subtype-specific guidance and placeholders
const CATEGORY_GUIDANCE: Record<string, {
  placeholder: string
  helperText: string
  suggestedTopics: string[]
}> = {
  skin: {
    placeholder: "Describe the skin condition — where it is, how long you've had it, any itching/pain, and what you've tried...",
    helperText: "Include location, appearance, duration, and any triggers or treatments tried.",
    suggestedTopics: ["Location on body", "Appearance", "Duration", "Triggers", "Treatments tried"],
  },
  infection: {
    placeholder: "Describe your symptoms — e.g., sore throat, ear pain, wound infection — how long, and any fever...",
    helperText: "Include symptoms, duration, and whether you think antibiotics may be needed.",
    suggestedTopics: ["Main symptoms", "Duration", "Fever", "Previous antibiotics"],
  },
  new_medication: {
    placeholder: "Describe what medication you need, what it's for, and any relevant medical history...",
    helperText: "Include the medication name (if known), reason for starting, and any allergies.",
    suggestedTopics: ["Medication name", "Reason for starting", "Allergies", "Current medications"],
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
    placeholder: "Describe your health concern — this could be a referral, general health question, or anything else...",
    helperText: "Include symptoms, duration, and any relevant history. The more detail, the better we can help.",
    suggestedTopics: ["Main concern", "Duration", "Current medications", "What you've tried"],
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

  // If user already selected a subtype from the service hub, category is pre-determined
  // and should not be shown again (fixes redundant type selection)
  const subtypePreSelected = !!consultSubtype && !!SUBTYPE_TO_CATEGORY[consultSubtype]

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

  // Friendly label for pre-selected subtype
  const subtypeLabel = consultSubtype
    ? CONSULT_SUBTYPE_LABELS[consultSubtype as ConsultSubtype] || consultSubtype
    : null

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Info alert */}
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <Stethoscope className="w-4 h-4" />
        <AlertDescription className="text-xs">
          A doctor will review your request and respond within 1 hour during business hours.
        </AlertDescription>
      </Alert>

      {/* Category selection — hidden when subtype was pre-selected from the service hub */}
      {subtypePreSelected ? (
        <div className="space-y-1">
          <Label className="text-sm font-medium text-muted-foreground">
            Consultation type
          </Label>
          <p className="text-sm font-medium">{subtypeLabel}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            What would you like help with?
            <span className="text-destructive ml-0.5">*</span>
          </Label>
          <div className="space-y-2">
            {CONSULT_CATEGORIES.map((category) => (
              <EnhancedSelectionButton
                key={category.value}
                variant="option"
                selected={consultCategory === category.value}
                onClick={() => setAnswer("consultCategory", category.value)}
                label={`${category.icon} ${category.label}`}
                description={category.description}
              />
            ))}
          </div>
          {errors.consultCategory && (
            <p className="text-xs text-destructive">{errors.consultCategory}</p>
          )}
        </div>
      )}

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
                className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
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
        className="w-full h-12"
        disabled={!isComplete}
      >
        Continue
      </Button>
    </div>
  )
}
