"use client"

/**
 * Medical History Step - Repeat Prescription Intake
 * 
 * Collects medical history and conditions.
 * ~100 lines - well under 200 line limit.
 */

import { StepHeader, FormInput, PillButton } from "../shared"
import { Textarea } from "@/components/ui/textarea"
import { REPEAT_RX_COPY } from "@/lib/microcopy/repeat-rx"

interface MedicalHistoryStepProps {
  hasAllergies: boolean | null
  onHasAllergiesChange: (value: boolean) => void
  allergiesDetails: string
  onAllergiesDetailsChange: (value: string) => void
  otherMedications: string
  onOtherMedicationsChange: (value: string) => void
  medicalConditions: string
  onMedicalConditionsChange: (value: string) => void
  errors?: {
    hasAllergies?: string
    allergiesDetails?: string
  }
}

export function MedicalHistoryStep({
  hasAllergies,
  onHasAllergiesChange,
  allergiesDetails,
  onAllergiesDetailsChange,
  otherMedications,
  onOtherMedicationsChange,
  medicalConditions,
  onMedicalConditionsChange,
  errors,
}: MedicalHistoryStepProps) {
  return (
    <div className="space-y-6 animate-step-enter">
      <StepHeader
        title={REPEAT_RX_COPY.steps.medical_history.title}
        subtitle={REPEAT_RX_COPY.steps.medical_history.subtitle}
        emoji="🏥"
      />

      {/* Allergies */}
      <FormInput
        label="Do you have any drug allergies?"
        required
        error={errors?.hasAllergies}
      >
        <div className="flex gap-3">
          <PillButton
            selected={hasAllergies === true}
            onClick={() => onHasAllergiesChange(true)}
            className="flex-1"
          >
            Yes
          </PillButton>
          <PillButton
            selected={hasAllergies === false}
            onClick={() => onHasAllergiesChange(false)}
            className="flex-1"
          >
            No
          </PillButton>
        </div>
      </FormInput>

      {hasAllergies && (
        <FormInput
          label="Please list your allergies"
          required
          error={errors?.allergiesDetails}
        >
          <Textarea
            value={allergiesDetails}
            onChange={(e) => onAllergiesDetailsChange(e.target.value)}
            placeholder="e.g., Penicillin - causes rash"
            className="min-h-[80px]"
          />
        </FormInput>
      )}

      {/* Other medications */}
      <FormInput
        label="Are you taking any other medications?"
        hint="This helps us check for interactions"
      >
        <Textarea
          value={otherMedications}
          onChange={(e) => onOtherMedicationsChange(e.target.value)}
          placeholder="List any current medications..."
          className="min-h-[80px]"
        />
      </FormInput>

      {/* Medical conditions */}
      <FormInput
        label="Any relevant medical conditions?"
        hint="e.g., diabetes, high blood pressure"
      >
        <Textarea
          value={medicalConditions}
          onChange={(e) => onMedicalConditionsChange(e.target.value)}
          placeholder="List any conditions..."
          className="min-h-[80px]"
        />
      </FormInput>
    </div>
  )
}
