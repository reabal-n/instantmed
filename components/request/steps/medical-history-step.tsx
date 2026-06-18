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

import { ArrowRight } from "lucide-react"
import { useCallback,useEffect,useState } from "react"

import { IntakeStepIntro, QuestionCard, YesNoDetailQuestion } from "@/components/request/shared/intake-step-primitives"
import { StepBlockedSummary } from "@/components/request/shared/step-blocked-summary"
import { Button } from "@/components/ui/button"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

import { useRequestStore } from "../store"

interface MedicalHistoryStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
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
  const requiresMedicationSafety = serviceType === "prescription" || serviceType === "repeat-script"

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [blockedReasons, setBlockedReasons] = useState<string[]>([])

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

    if (requiresMedicationSafety && isPregnantOrBreastfeeding === undefined) {
      newErrors.isPregnantOrBreastfeeding = "Please indicate if you are pregnant or breastfeeding"
    }

    if (requiresMedicationSafety && hasAdverseMedicationReactions === undefined) {
      newErrors.hasAdverseMedicationReactions = "Please indicate if you have had adverse medication reactions"
    }

    setErrors(newErrors)
    setBlockedReasons(Object.values(newErrors))
    setTouched({
      allergies: true,
      conditions: true,
      otherMedications: true,
      isPregnantOrBreastfeeding: true,
      hasAdverseMedicationReactions: true,
    })
    return Object.keys(newErrors).length === 0
  }, [hasAllergies, allergies, hasConditions, conditions, hasOtherMedications, otherMedications, requiresMedicationSafety, isPregnantOrBreastfeeding, hasAdverseMedicationReactions])

  const handleNext = useCallback(() => {
    if (validate()) {
      posthog?.capture('step_completed', { step: 'medical-history', service_type: serviceType, has_allergies: hasAllergies, has_conditions: hasConditions, has_other_meds: hasOtherMedications })
      onNext()
    }
  }, [validate, serviceType, posthog, hasAllergies, hasConditions, hasOtherMedications, onNext])

  const isComplete =
    hasAllergies !== undefined && (!hasAllergies || allergies.trim()) &&
    hasConditions !== undefined && (!hasConditions || conditions.trim()) &&
    hasOtherMedications !== undefined && (!hasOtherMedications || otherMedications.trim()) &&
    (!requiresMedicationSafety || (
      isPregnantOrBreastfeeding !== undefined &&
      hasAdverseMedicationReactions !== undefined
    ))
  // Live-computed (not gated on the stale `errors` object).
  const canContinue = Boolean(isComplete)
  const clinicalHistoryComplete =
    hasAllergies !== undefined && (!hasAllergies || allergies.trim()) &&
    hasConditions !== undefined && (!hasConditions || conditions.trim()) &&
    hasOtherMedications !== undefined && (!hasOtherMedications || otherMedications.trim())

  useEffect(() => {
    if (canContinue && blockedReasons.length > 0) setBlockedReasons([])
  }, [canContinue, blockedReasons.length])

  // Keyboard navigation
  useKeyboardNavigation({
    onNext: canContinue ? handleNext : undefined,
    enabled: Boolean(canContinue),
  })

  return (
    <div className="space-y-4">
      <IntakeStepIntro
        eyebrow={requiresMedicationSafety ? (clinicalHistoryComplete ? "Health 2 of 2" : "Health 1 of 2") : undefined}
        title={clinicalHistoryComplete && requiresMedicationSafety ? "Medication safety" : "Anything the doctor should know?"}
        description={clinicalHistoryComplete && requiresMedicationSafety ? "Two final safety checks for the doctor." : "Clear answers here make the review safer and faster."}
      />

      <StepBlockedSummary reasons={blockedReasons} />

      {/* Clinical questions - required */}
      {(!requiresMedicationSafety || !clinicalHistoryComplete) && (
      <QuestionCard className="space-y-5">
        <YesNoDetailQuestion
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

        <YesNoDetailQuestion
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

        <YesNoDetailQuestion
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
      </QuestionCard>
      )}

      {requiresMedicationSafety && clinicalHistoryComplete && (
        <QuestionCard className="space-y-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Safety screening
          </p>

          <YesNoDetailQuestion
            label="Currently pregnant or breastfeeding?"
            helpText="Important for medication safety"
            noLabel="No"
            yesLabel="Yes"
            value={isPregnantOrBreastfeeding}
            onSelect={(val) => setAnswer('isPregnantOrBreastfeeding', val)}
            error={touched.isPregnantOrBreastfeeding ? errors.isPregnantOrBreastfeeding : undefined}
          />

          <div className="border-t border-border/40" />

          <YesNoDetailQuestion
            label="Previous adverse reactions to medications?"
            helpText="Allergic reactions, side effects, intolerances"
            noLabel="No reactions"
            yesLabel="Yes"
            value={hasAdverseMedicationReactions}
            onSelect={(val) => setAnswer('hasAdverseMedicationReactions', val)}
            error={touched.hasAdverseMedicationReactions ? errors.hasAdverseMedicationReactions : undefined}
          />
        </QuestionCard>
      )}

      {/* Always clickable so a tap surfaces the blocking reason (incl. the
          progressively-revealed safety questions) instead of a silently greyed
          mobile dead-end. */}
      <Button
        data-intake-primary-action="true"
        data-intake-primary-label="Continue"
        data-intake-primary-ready={canContinue ? "true" : "false"}
        onClick={handleNext}
        className={`w-full h-12 max-sm:hidden ${canContinue ? "" : "opacity-60"}`}
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
        <p className="text-[11px] text-muted-foreground text-center hidden sm:block">
          Press Enter to continue
        </p>
      )}
    </div>
  )
}
