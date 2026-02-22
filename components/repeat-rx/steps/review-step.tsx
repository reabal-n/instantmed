"use client"

/**
 * Review Step - Repeat Prescription Intake
 * 
 * Summary of all entered information for review.
 * ~120 lines - well under 200 line limit.
 */

import { Edit2 } from "lucide-react"
import { StepHeader } from "../shared"
import { Button } from "@/components/ui/button"
import type { SelectedPBSProduct } from "@/components/shared/medication-search"

interface ReviewStepProps {
  medication: SelectedPBSProduct | null
  hasPreviousPrescription: boolean | null
  lastPrescriptionDate: string
  hasAllergies: boolean | null
  allergiesDetails: string
  otherMedications: string
  onEditStep: (step: string) => void
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm">{title}</h3>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 px-2">
            <Edit2 className="w-3 h-3 mr-1" />
            Edit
          </Button>
        )}
      </div>
      <div className="text-sm text-muted-foreground space-y-1">{children}</div>
    </div>
  )
}

export function ReviewStep({
  medication,
  hasPreviousPrescription,
  lastPrescriptionDate,
  hasAllergies,
  allergiesDetails,
  otherMedications,
  onEditStep,
}: ReviewStepProps) {
  return (
    <div className="space-y-6 animate-step-enter">
      <StepHeader
        title="Review your request"
        subtitle="Please confirm all details are correct"
        emoji="📝"
      />

      <div className="space-y-3">
        {/* Medication */}
        <ReviewSection title="Medication" onEdit={() => onEditStep("medication")}>
          {medication ? (
            <p>
              {medication.drug_name}
              {medication.strength && ` - ${medication.strength}`}
            </p>
          ) : (
            <p className="text-red-500">Not selected</p>
          )}
        </ReviewSection>

        {/* History */}
        <ReviewSection title="Prescription History" onEdit={() => onEditStep("history")}>
          <p>
            {hasPreviousPrescription === true
              ? `Previously prescribed${lastPrescriptionDate ? ` (last: ${lastPrescriptionDate})` : ""}`
              : hasPreviousPrescription === false
                ? "First time prescription"
                : "Not specified"}
          </p>
        </ReviewSection>

        {/* Medical History */}
        <ReviewSection title="Medical History" onEdit={() => onEditStep("medical_history")}>
          <p>
            Allergies: {hasAllergies === true ? allergiesDetails || "Yes" : hasAllergies === false ? "None" : "Not specified"}
          </p>
          {otherMedications && <p>Other medications: {otherMedications}</p>}
        </ReviewSection>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        By proceeding, you confirm this information is accurate
      </p>
    </div>
  )
}
