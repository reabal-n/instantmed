"use client"

/**
 * Medication Step - PBS medication search and selection
 * Uses the shared MedicationSearch component with PBS API integration
 */

import { useState } from "react"
import { Info } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { MedicationSearch, type SelectedPBSProduct } from "@/components/shared/medication-search"
import { useRequestStore } from "../store"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface MedicationStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

function FormField({
  label,
  required,
  error,
  children,
  hint,
  helpText,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  hint?: string
  helpText?: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {helpText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{helpText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

export default function MedicationStep({ onNext }: MedicationStepProps) {
  const { answers, setAnswers } = useRequestStore()
  
  const selectedMedication = answers.selectedMedication as SelectedPBSProduct | null
  const medicationName = (answers.medicationName as string) || ""
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleMedicationSelect = (product: SelectedPBSProduct | null) => {
    setAnswers({
      selectedMedication: product,
      medicationName: product?.drug_name || "",
      medicationStrength: product?.strength || "",
      medicationForm: product?.form || "",
      pbsCode: product?.pbs_code || "",
    })
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!selectedMedication && !medicationName) {
      newErrors.medication = "Please search for and select your medication"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      onNext()
    }
  }

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Info alert */}
      <Alert variant="default" className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
          Search using the PBS database. If you can&apos;t find your exact medication, type the name manually.
        </AlertDescription>
      </Alert>

      {/* Medication search */}
      <FormField
        label="Medication name"
        required
        error={errors.medication}
        hint="If you know the name, start typing to help us locate it"
        helpText="This helps with accuracy. Doctor will review and confirm the correct medication."
      >
        <div className="mt-2">
          <MedicationSearch
            value={selectedMedication}
            onChange={handleMedicationSelect}
          />
        </div>
      </FormField>

      {/* Selected medication display */}
      {selectedMedication && (
        <div className="p-3 rounded-lg border bg-muted/30">
          <p className="font-medium text-sm">{selectedMedication.drug_name}</p>
          {selectedMedication.strength && (
            <p className="text-xs text-muted-foreground">{selectedMedication.strength}</p>
          )}
          {selectedMedication.form && (
            <p className="text-xs text-muted-foreground">{selectedMedication.form}</p>
          )}
        </div>
      )}

      {/* Blocked medication warning placeholder */}
      {/* Note: Actual blocking logic is in lib/validation/repeat-script-schema.ts */}

      {/* Continue button */}
      <Button 
        onClick={handleNext} 
        className="w-full h-12 mt-4"
        disabled={!selectedMedication && !medicationName}
      >
        Continue
      </Button>
    </div>
  )
}
