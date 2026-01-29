"use client"

/**
 * History Step - Repeat Prescription Intake
 * 
 * Collects prescription history information.
 * ~100 lines - well under 200 line limit.
 */

import { StepHeader, FormInput, PillButton } from "../shared"
import { Textarea } from "@/components/ui/textarea"
import { REPEAT_RX_COPY } from "@/lib/microcopy/repeat-rx"

interface HistoryStepProps {
  hasPreviousPrescription: boolean | null
  onHasPreviousChange: (value: boolean) => void
  lastPrescriptionDate: string
  onLastPrescriptionDateChange: (value: string) => void
  prescribingDoctor: string
  onPrescribingDoctorChange: (value: string) => void
  errors?: {
    hasPreviousPrescription?: string
    lastPrescriptionDate?: string
  }
}

export function HistoryStep({
  hasPreviousPrescription,
  onHasPreviousChange,
  lastPrescriptionDate,
  onLastPrescriptionDateChange,
  prescribingDoctor,
  onPrescribingDoctorChange,
  errors,
}: HistoryStepProps) {
  return (
    <div className="space-y-6 animate-step-enter">
      <StepHeader
        title={REPEAT_RX_COPY.steps.history.title}
        subtitle={REPEAT_RX_COPY.steps.history.subtitle}
        emoji="📋"
      />

      <FormInput
        label="Have you been prescribed this medication before?"
        required
        error={errors?.hasPreviousPrescription}
      >
        <div className="flex gap-3">
          <PillButton
            selected={hasPreviousPrescription === true}
            onClick={() => onHasPreviousChange(true)}
            className="flex-1"
          >
            Yes
          </PillButton>
          <PillButton
            selected={hasPreviousPrescription === false}
            onClick={() => onHasPreviousChange(false)}
            className="flex-1"
          >
            No
          </PillButton>
        </div>
      </FormInput>

      {hasPreviousPrescription && (
        <>
          <FormInput
            label="When did you last receive this prescription?"
            hint="Approximate date is fine"
            error={errors?.lastPrescriptionDate}
          >
            <input
              type="date"
              value={lastPrescriptionDate}
              onChange={(e) => onLastPrescriptionDateChange(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-background"
              max={new Date().toISOString().split("T")[0]}
            />
          </FormInput>

          <FormInput
            label="Who prescribed it? (optional)"
            hint="e.g., Dr Smith at XYZ Medical Centre"
          >
            <Textarea
              value={prescribingDoctor}
              onChange={(e) => onPrescribingDoctorChange(e.target.value)}
              placeholder="Doctor name and/or clinic..."
              className="min-h-[80px]"
            />
          </FormInput>
        </>
      )}
    </div>
  )
}
