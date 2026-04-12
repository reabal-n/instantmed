"use client"

/**
 * Medical History Step - Allergies, conditions, other medications
 *
 * Layout:
 * 1. Three yes/no clinical questions (allergies, conditions, other meds)
 *    - compact card-based layout, each with conditional detail textarea
 * 2. Safety screening toggles (pregnancy, adverse reactions)
 *    - grouped in a single card with clear "informational only" label
 */

import { useState, useCallback } from "react"
import { usePostHog } from "@/components/providers/posthog-provider"
import { ArrowRight } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { EnhancedSelectionButton } from "@/components/shared/enhanced-selection-button"
import { useRequestStore } from "../store"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface MedicalHistoryStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

interface YesNoQuestionProps {
  label: string
  helpText: string
  yesLabel: string
  noLabel: string
  value: boolean | undefined
  onSelect: (val: boolean) => void
  detail?: string
  onDetailChange?: (val: string) => void
  detailPlaceholder?: string
  error?: string
}

function YesNoQuestion({
  label,
  helpText,
  yesLabel,
  noLabel,
  value,
  onSelect,
  detail,
  onDetailChange,
  detailPlaceholder,
  error,
}: YesNoQuestionProps) {
  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-sm font-medium">
          {label} <span className="text-destructive">*</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{helpText}</p>
      </div>
      <div className="flex gap-2">
        <EnhancedSelectionButton
          variant="chip"
          selected={value === false}
          onClick={() => onSelect(false)}
          className="flex-1 touch-manipulation"
        >
          {noLabel}
        </EnhancedSelectionButton>
        <EnhancedSelectionButton
          variant="chip"
          selected={value === true}
          onClick={() => onSelect(true)}
          className="flex-1 touch-manipulation"
        >
          {yesLabel}
        </EnhancedSelectionButton>
      </div>
      {value === true && onDetailChange && (
        <Textarea
          value={detail || ""}
          onChange={(e) => onDetailChange(e.target.value)}
          placeholder={detailPlaceholder}
          className="min-h-[60px] text-sm"
        />
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}

export default function MedicalHistoryStep({ serviceType, onNext }: MedicalHistoryStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const posthog = usePostHog()

  const hasAllergies = answers.hasAllergies as boolean | undefined
  const allergies = (answers.allergies as string) || ""
  const hasConditions = answers.hasConditions as boolean | undefined
  const conditions = (answers.conditions as string) || ""
  const hasOtherMedications = answers.hasOtherMedications as boolean | undefined
  const otherMedications = (answers.otherMedications as string) || ""
  const isPregnantOrBreastfeeding = answers.isPregnantOrBreastfeeding as boolean | undefined
  const hasAdverseMedicationReactions = answers.hasAdverseMedicationReactions as boolean | undefined

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (hasAllergies === undefined) {
      newErrors.allergies = "Please indicate if you have any allergies"
    }
    if (hasAllergies && !allergies.trim()) {
      newErrors.allergies = "Please list your allergies"
    }

    if (hasConditions === undefined) {
      newErrors.conditions = "Please indicate if you have any medical conditions"
    }
    if (hasConditions && !conditions.trim()) {
      newErrors.conditions = "Please list your medical conditions"
    }

    if (hasOtherMedications === undefined) {
      newErrors.otherMedications = "Please indicate if you take any other medications"
    }
    if (hasOtherMedications && !otherMedications.trim()) {
      newErrors.otherMedications = "Please list your other medications"
    }

    setErrors(newErrors)
    setTouched({ allergies: true, conditions: true, otherMedications: true })
    return Object.keys(newErrors).length === 0
  }, [hasAllergies, allergies, hasConditions, conditions, hasOtherMedications, otherMedications])

  const handleNext = useCallback(() => {
    if (validate()) {
      posthog?.capture('step_completed', { step: 'medical-history', service_type: serviceType, has_allergies: hasAllergies, has_conditions: hasConditions, has_other_meds: hasOtherMedications })
      onNext()
    }
  }, [validate, serviceType, posthog, hasAllergies, hasConditions, hasOtherMedications, onNext])

  const isComplete =
    hasAllergies !== undefined && (!hasAllergies || allergies.trim()) &&
    hasConditions !== undefined && (!hasConditions || conditions.trim()) &&
    hasOtherMedications !== undefined && (!hasOtherMedications || otherMedications.trim())
  const hasNoErrors = Object.keys(errors).length === 0
  const canContinue = isComplete && hasNoErrors

  // Keyboard navigation
  useKeyboardNavigation({
    onNext: canContinue ? handleNext : undefined,
    enabled: Boolean(canContinue),
  })

  return (
    <div className="space-y-4">
      {/* Clinical questions - required */}
      <div className="rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] p-4 space-y-5">
        <YesNoQuestion
          label="Any allergies?"
          helpText="Drug, food, or environmental allergies"
          noLabel="No allergies"
          yesLabel="Yes"
          value={hasAllergies}
          onSelect={(val) => {
            setAnswer("hasAllergies", val)
            if (!val) setAnswer("allergies", "")
          }}
          detail={allergies}
          onDetailChange={(val) => setAnswer("allergies", val)}
          detailPlaceholder="e.g., Penicillin - rash, Peanuts - anaphylaxis"
          error={touched.allergies ? errors.allergies : undefined}
        />

        <div className="border-t border-border/40" />

        <YesNoQuestion
          label="Any medical conditions?"
          helpText="Chronic illness, past surgeries, ongoing issues"
          noLabel="No conditions"
          yesLabel="Yes"
          value={hasConditions}
          onSelect={(val) => {
            setAnswer("hasConditions", val)
            if (!val) setAnswer("conditions", "")
          }}
          detail={conditions}
          onDetailChange={(val) => setAnswer("conditions", val)}
          detailPlaceholder="e.g., Asthma, Type 2 Diabetes, High blood pressure"
          error={touched.conditions ? errors.conditions : undefined}
        />

        <div className="border-t border-border/40" />

        <YesNoQuestion
          label="Taking any other medications?"
          helpText="Prescriptions, over-the-counter, vitamins, supplements"
          noLabel="No medications"
          yesLabel="Yes"
          value={hasOtherMedications}
          onSelect={(val) => {
            setAnswer("hasOtherMedications", val)
            if (!val) setAnswer("otherMedications", "")
          }}
          detail={otherMedications}
          onDetailChange={(val) => setAnswer("otherMedications", val)}
          detailPlaceholder="e.g., Metformin 500mg twice daily, Vitamin D 1000IU"
          error={touched.otherMedications ? errors.otherMedications : undefined}
        />
      </div>

      {/* Safety screening - same format as above */}
      <div className="rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] p-4 space-y-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Safety screening
        </p>

        <YesNoQuestion
          label="Currently pregnant or breastfeeding?"
          helpText="Important for medication safety"
          noLabel="No"
          yesLabel="Yes"
          value={isPregnantOrBreastfeeding}
          onSelect={(val) => setAnswer('isPregnantOrBreastfeeding', val)}
        />

        <div className="border-t border-border/40" />

        <YesNoQuestion
          label="Previous adverse reactions to medications?"
          helpText="Allergic reactions, side effects, intolerances"
          noLabel="No reactions"
          yesLabel="Yes"
          value={hasAdverseMedicationReactions}
          onSelect={(val) => setAnswer('hasAdverseMedicationReactions', val)}
        />
      </div>

      {/* Continue button */}
      <Button
        onClick={handleNext}
        className="w-full h-12"
        disabled={!canContinue}
      >
        {canContinue ? (
          <>
            Continue to your details
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          "Continue"
        )}
      </Button>
      {canContinue && (
        <p className="text-[11px] text-muted-foreground/60 text-center hidden sm:block">
          Press Enter to continue
        </p>
      )}
    </div>
  )
}
