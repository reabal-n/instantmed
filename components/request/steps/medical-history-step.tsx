"use client"

/**
 * Medical History Step — allergies/reactions, conditions, other medications,
 * plus a single pregnancy/breastfeeding check for prescribing flows.
 *
 * 2026-06-28 (operator): collapsed the previous two-phase reveal — 3 clinical
 * questions, then the card swapped to a SECOND screen with 2 safety toggles —
 * into ONE screen. That swap read as "two steps back to back" and made the
 * screening feel long. The "previous reactions to medications?" toggle is now
 * folded into the allergies question (a drug allergy IS an adverse reaction —
 * one prescribing-safety question); the separate `hasAdverseMedicationReactions`
 * answer key is kept in sync for the doctor summary + the validation contract.
 * Pregnancy/breastfeeding stays a distinct EXPLICIT yes/no — it must never
 * silently default to "no".
 */

import { ArrowRight } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { IntakeStepIntro, QuestionCard, YesNoDetailQuestion } from "@/components/request/shared/intake-step-primitives"
import { StepBlockedSummary } from "@/components/request/shared/step-blocked-summary"
import { Button } from "@/components/ui/button"
import {
  buildIntakeValidationBlockedProperties,
  captureIntakeEvent,
  INTAKE_ANALYTICS_EVENTS,
} from "@/lib/analytics/intake-events"
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
  const requiresMedicationSafety = serviceType === "prescription" || serviceType === "repeat-script"

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [blockedReasons, setBlockedReasons] = useState<string[]>([])

  // The allergies question doubles as the medication-reaction check on
  // prescribing flows. Keep the separate `hasAdverseMedicationReactions` answer
  // key in sync with the allergies answer so the doctor summary and the
  // prescription validation contract still receive it (incl. resumed drafts
  // saved before this merge).
  useEffect(() => {
    if (requiresMedicationSafety && hasAllergies !== undefined && answers.hasAdverseMedicationReactions !== hasAllergies) {
      setAnswer("hasAdverseMedicationReactions", hasAllergies)
    }
  }, [requiresMedicationSafety, hasAllergies, answers.hasAdverseMedicationReactions, setAnswer])

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (hasAllergies === undefined) {
      newErrors.allergies = requiresMedicationSafety
        ? "Please tell us about any allergies or medication reactions"
        : "Please indicate if you have any allergies"
    }
    if (hasAllergies && !allergies.trim()) {
      newErrors.allergies = "Please list your allergies or reactions"
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

    setErrors(newErrors)
    setBlockedReasons(Object.values(newErrors))
    setTouched({
      allergies: true,
      conditions: true,
      otherMedications: true,
      isPregnantOrBreastfeeding: true,
    })
    const blockerLabels: Record<string, string> = {
      allergies: "allergy history",
      conditions: "medical conditions",
      otherMedications: "other medications",
      isPregnantOrBreastfeeding: "pregnancy or breastfeeding status",
    }
    const blockers = Object.keys(newErrors).map((key) => blockerLabels[key] ?? key)
    if (blockers.length > 0) {
      captureIntakeEvent(
        posthog,
        INTAKE_ANALYTICS_EVENTS.validationBlocked,
        buildIntakeValidationBlockedProperties({
          serviceType,
          subtype: answers.consultSubtype as string | undefined,
          stepId: "medical-history",
          blockers,
        }),
      )
    }
    return Object.keys(newErrors).length === 0
  }, [answers.consultSubtype, hasAllergies, allergies, hasConditions, conditions, hasOtherMedications, otherMedications, posthog, requiresMedicationSafety, isPregnantOrBreastfeeding, serviceType])

  const handleNext = useCallback(() => {
    if (validate()) {
      onNext()
    }
  }, [validate, onNext])

  const isComplete =
    hasAllergies !== undefined && (!hasAllergies || allergies.trim()) &&
    hasConditions !== undefined && (!hasConditions || conditions.trim()) &&
    hasOtherMedications !== undefined && (!hasOtherMedications || otherMedications.trim()) &&
    (!requiresMedicationSafety || isPregnantOrBreastfeeding !== undefined)
  // Live-computed (not gated on the stale `errors` object).
  const canContinue = Boolean(isComplete)

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
        title="Anything the doctor should know?"
        description="A few quick questions so the doctor can prescribe safely."
      />

      <StepBlockedSummary reasons={blockedReasons} />

      {/* One screen — no progressive reveal. All checks visible at once. */}
      <QuestionCard className="space-y-5">
        <YesNoDetailQuestion
          label={requiresMedicationSafety ? "Any allergies or bad reactions to a medicine?" : "Any allergies?"}
          helpText="Drug, food, or environmental allergies, and any past medication reactions"
          noLabel="None"
          yesLabel="Yes"
          value={hasAllergies}
          onSelect={(val) => {
            setAnswer("hasAllergies", val)
            // The allergies answer is also the medication-reaction signal on
            // prescribing flows — set both immediately so the validation
            // contract never sees an undefined `hasAdverseMedicationReactions`.
            if (requiresMedicationSafety) setAnswer("hasAdverseMedicationReactions", val)
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

        {/* Pregnancy/breastfeeding — distinct safety signal, kept as its own
            explicit yes/no (never silently defaulted). Prescribing flows only. */}
        {requiresMedicationSafety && (
          <>
            <div className="border-t border-border/40" />
            <YesNoDetailQuestion
              label="Currently pregnant or breastfeeding?"
              helpText="Important for safe prescribing"
              noLabel="No"
              yesLabel="Yes"
              value={isPregnantOrBreastfeeding}
              onSelect={(val) => setAnswer('isPregnantOrBreastfeeding', val)}
              error={touched.isPregnantOrBreastfeeding ? errors.isPregnantOrBreastfeeding : undefined}
            />
          </>
        )}
      </QuestionCard>

      {/* Always clickable so a tap surfaces the blocking reason instead of a
          silently greyed mobile dead-end. */}
      <Button
        data-intake-primary-action="true"
        data-intake-primary-label="Continue"
        data-intake-primary-ready={canContinue ? "true" : "false"}
        onClick={handleNext}
        variant={canContinue ? "default" : "secondary"}
        className="w-full h-12 max-sm:hidden"
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
