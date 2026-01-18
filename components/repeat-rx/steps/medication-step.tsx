"use client"

/**
 * Medication Step - Repeat Prescription Intake
 * 
 * Handles medication search and selection using PBS API.
 * ~150 lines - well under 200 line limit.
 */

import { MedicationSearch, type SelectedPBSProduct } from "@/components/intake/medication-search"
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
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200/60 dark:border-green-800/40">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Selected: {medication.drug_name}
          </p>
          {medication.strength && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {medication.strength} {medication.form && `• ${medication.form}`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
