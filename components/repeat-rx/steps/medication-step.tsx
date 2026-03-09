"use client"

/**
 * Medication Step - Repeat Prescription Intake
 * 
 * Handles medication search and selection using PBS API.
 * ~150 lines - well under 200 line limit.
 */

import { MedicationSearch, type SelectedPBSProduct } from "@/components/shared/medication-search"
import { StepHeader, FormInput } from "../shared"
import { REPEAT_RX_COPY } from "@/lib/microcopy/repeat-rx"

interface MedicationStepProps {
  medication: SelectedPBSProduct | null
  onMedicationChange: (med: SelectedPBSProduct | null) => void
  error?: string
}

export function MedicationStep({
  medication,
  onMedicationChange,
  error,
}: MedicationStepProps) {
  return (
    <div className="space-y-6 animate-step-enter">
      <StepHeader
        title={REPEAT_RX_COPY.steps.medication.title}
        subtitle={REPEAT_RX_COPY.steps.medication.subtitle}
        emoji="💊"
      />

      <FormInput
        label="Medication name"
        required
        error={error}
        helpText="Start typing to search PBS medications. A doctor will verify the exact medication."
      >
        <MedicationSearch
          value={medication}
          onChange={onMedicationChange}
        />
      </FormInput>

      {/* Selected medication display */}
      {medication && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
            Selected: {medication.drug_name}
          </p>
          {medication.strength && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              {medication.strength} {medication.form && `• ${medication.form}`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
