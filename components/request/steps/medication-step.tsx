"use client"

/**
 * Medication Step - PBS medication search and selection
 * 
 * Features:
 * - PBS medication search with recent medications
 * - Real-time validation
 * - Help tooltips
 * - Keyboard navigation
 */

import { useState, useEffect, useCallback } from "react"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MedicationSearch, type SelectedPBSProduct } from "@/components/shared/medication-search"
import { useRequestStore } from "../store"
import { FormField } from "../form-field"
import { getSmartDefaults, addRecentMedication } from "@/lib/request/preferences"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface MedicationStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

interface RecentMedication {
  name: string
  strength?: string
  form?: string
  pbsCode?: string
}

export default function MedicationStep({ onNext }: MedicationStepProps) {
  const { answers, setAnswers } = useRequestStore()
  
  const selectedMedication = answers.selectedMedication as SelectedPBSProduct | null
  const medicationName = (answers.medicationName as string) || ""
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [recentMeds, setRecentMeds] = useState<RecentMedication[]>([])

  // Load recent medications on mount
  useEffect(() => {
    const defaults = getSmartDefaults('medication')
    if (defaults.recentMedications) {
      setRecentMeds(defaults.recentMedications as RecentMedication[])
    }
  }, [])

  const handleMedicationSelect = (product: SelectedPBSProduct | null) => {
    setAnswers({
      selectedMedication: product,
      medicationName: product?.drug_name || "",
      medicationStrength: product?.strength || "",
      medicationForm: product?.form || "",
      pbsCode: product?.pbs_code || "",
    })
  }

  const handleRecentMedClick = (med: RecentMedication) => {
    setAnswers({
      selectedMedication: null,
      medicationName: med.name,
      medicationStrength: med.strength || "",
      medicationForm: med.form || "",
      pbsCode: med.pbsCode || "",
    })
  }

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}
    if (!selectedMedication && !medicationName) {
      newErrors.medication = "Please search for and select your medication"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [selectedMedication, medicationName])

  const handleNext = useCallback(() => {
    if (validate()) {
      // Save to recent medications
      if (selectedMedication) {
        addRecentMedication({
          name: selectedMedication.drug_name,
          strength: selectedMedication.strength || undefined,
          form: selectedMedication.form || undefined,
          pbsCode: selectedMedication.pbs_code || undefined,
        })
      } else if (medicationName) {
        addRecentMedication({ name: medicationName })
      }
      onNext()
    }
  }, [validate, selectedMedication, medicationName, onNext])

  const isComplete = selectedMedication || medicationName
  const hasNoErrors = Object.keys(errors).length === 0
  const canContinue = isComplete && hasNoErrors

  // Keyboard navigation
  useKeyboardNavigation({
    onNext: canContinue ? handleNext : undefined,
    enabled: Boolean(canContinue),
  })

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Info alert */}
      <Alert variant="default" className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
          Search using the PBS database. If you can&apos;t find your exact medication, type the name manually.
        </AlertDescription>
      </Alert>

      {/* Recent medications suggestion */}
      {recentMeds.length > 0 && !selectedMedication && !medicationName && (
        <div className="p-3 rounded-lg border bg-muted/30">
          <p className="text-xs text-muted-foreground mb-2">Previously requested:</p>
          <div className="flex flex-wrap gap-1.5">
            {recentMeds.slice(0, 3).map((med) => (
              <button
                key={med.name}
                onClick={() => handleRecentMedClick(med)}
                className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                + {med.name}{med.strength ? ` ${med.strength}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Medication search */}
      <FormField
        label="Medication name"
        required
        error={errors.medication}
        hint="If you know the name, start typing to help us locate it"
        helpContent={{ 
          title: "Why do we ask this?", 
          content: "This is for reference only. The doctor will review and confirm the correct medication. All prescribing decisions are made by the clinician." 
        }}
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
        disabled={!canContinue}
      >
        Continue
      </Button>
    </div>
  )
}
