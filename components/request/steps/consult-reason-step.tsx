"use client"

/**
 * Consult Reason Step - General consultation pathway selection
 * Collects reason for consultation with common categories
 *
 * When consultSubtype is already set (user selected from service hub),
 * the category selector is hidden - only details + urgency are shown.
 */

import { useState, useEffect, useCallback } from "react"
import { usePostHog } from "@/components/providers/posthog-provider"
import { Stethoscope, MessageSquare, Info, ArrowRight } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EnhancedSelectionButton } from "@/components/shared/enhanced-selection-button"
import { useRequestStore } from "../store"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { CONSULT_SUBTYPE_LABELS, type ConsultSubtype } from "@/lib/request/step-registry"

interface ConsultReasonStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

// General consult only - specialty subtypes (ED, hair loss, women's health, weight loss)
// have dedicated flows accessed from the service hub, not from here.
const CONSULT_CATEGORIES = [
  { value: "skin", label: "Skin condition", description: "Rash, acne, eczema, or other skin concern" },
  { value: "infection", label: "Infection", description: "May need antibiotics or antiviral treatment" },
  { value: "mental_health", label: "Mental health", description: "Anxiety, depression, stress, or mood concerns" },
  { value: "general", label: "Other / General concern", description: "Something else not listed above" },
] as const

// Map hub subtypes to category values - only for the general subtype path
const SUBTYPE_TO_CATEGORY: Record<string, string> = {
  'general': 'general',
  'skin': 'skin',
  'infection': 'infection',
  'mental_health': 'mental_health',
}

// Subtype-specific guidance and placeholders
const CATEGORY_GUIDANCE: Record<string, {
  placeholder: string
  helperText: string
  suggestedTopics: string[]
}> = {
  skin: {
    placeholder: "Describe the skin condition - where it is, how long you've had it, any itching/pain, and what you've tried...",
    helperText: "Include location, appearance, duration, and any triggers or treatments tried.",
    suggestedTopics: ["Location on body", "Appearance", "Duration", "Triggers", "Treatments tried"],
  },
  infection: {
    placeholder: "Describe your symptoms - e.g., sore throat, ear pain, wound infection - how long, and any fever...",
    helperText: "Include symptoms, duration, and whether you think antibiotics may be needed.",
    suggestedTopics: ["Main symptoms", "Duration", "Fever", "Previous antibiotics"],
  },
  mental_health: {
    placeholder: "Describe what you're experiencing - e.g., anxiety, low mood, sleep issues - how long, and how it's affecting your daily life...",
    helperText: "Include how long you've been experiencing this, what triggers it, and any previous treatment.",
    suggestedTopics: ["Main symptoms", "Duration", "Impact on daily life", "Previous treatment"],
  },
  general: {
    placeholder: "Describe your health concern - this could be a referral, general health question, or anything else...",
    helperText: "Include symptoms, duration, and any relevant history. The more detail, the better we can help.",
    suggestedTopics: ["Main concern", "Duration", "Current medications", "What you've tried"],
  },
}

export default function ConsultReasonStep({ onNext }: ConsultReasonStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const posthog = usePostHog()
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

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (!consultCategory) {
      newErrors.consultCategory = "Please select what you'd like help with"
    }

    if (!consultDetails?.trim() || consultDetails.length < 20) {
      newErrors.consultDetails = "Please provide more detail (at least 20 characters)"
    }

    if (!consultUrgency) {
      newErrors.consultUrgency = "Please indicate how urgent this is"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [consultCategory, consultDetails, consultUrgency])

  const handleNext = useCallback(() => {
    if (validate()) {
      posthog?.capture('step_completed', { step: 'consult-reason', category: consultCategory, urgency: consultUrgency })
      onNext()
    }
  }, [validate, posthog, consultCategory, consultUrgency, onNext])

  const isComplete = consultCategory && consultDetails?.length >= 20 && consultUrgency

  useKeyboardNavigation({
    onNext: isComplete ? handleNext : undefined,
    enabled: Boolean(isComplete),
  })

  // Friendly label for pre-selected subtype
  const subtypeLabel = consultSubtype
    ? CONSULT_SUBTYPE_LABELS[consultSubtype as ConsultSubtype] || consultSubtype
    : null

  return (
    <div className="space-y-5">
      {/* Info alert */}
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <Stethoscope className="w-4 h-4" />
        <AlertDescription className="text-xs">
          A doctor will review your request and respond within 1 hour during business hours.
        </AlertDescription>
      </Alert>

      {/* Category selection - hidden when subtype was pre-selected from the service hub */}
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
                label={category.label}
                description={category.description}
              />
            ))}
          </div>
          {errors.consultCategory && (
            <p className="text-xs text-destructive" role="alert" aria-live="polite">{errors.consultCategory}</p>
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
            <p className="text-destructive" role="alert" aria-live="polite">{errors.consultDetails}</p>
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
        {errors.consultUrgency && (
          <p className="text-xs text-destructive" role="alert" aria-live="polite">{errors.consultUrgency}</p>
        )}
      </div>

      {/* Continue button */}
      <Button
        onClick={handleNext}
        className="w-full h-12"
        disabled={!isComplete}
      >
        {isComplete ? (
          <>
            Continue to medical history
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  )
}
