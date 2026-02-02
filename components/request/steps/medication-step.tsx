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
import { Info, Plus, X } from "lucide-react"
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

interface MedicationEntry {
  product: SelectedPBSProduct | null
  name: string
  strength?: string
  form?: string
  pbsCode?: string
}

export default function MedicationStep({ onNext }: MedicationStepProps) {
  const { answers, setAnswers, setAnswer } = useRequestStore()

  // Support both single (legacy) and multi-medication modes
  const existingMedications = answers.medications as MedicationEntry[] | undefined
  const selectedMedication = answers.selectedMedication as SelectedPBSProduct | null
  const medicationName = (answers.medicationName as string) || ""

  // Initialize medications array from existing data
  const [medications, setMedications] = useState<MedicationEntry[]>(() => {
    if (existingMedications && existingMedications.length > 0) return existingMedications
    if (selectedMedication || medicationName) {
      return [{ product: selectedMedication, name: medicationName, strength: selectedMedication?.strength || "", form: selectedMedication?.form || "", pbsCode: selectedMedication?.pbs_code || "" }]
    }
    return [{ product: null, name: "" }]
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [recentMeds, setRecentMeds] = useState<RecentMedication[]>([])

  // Load recent medications on mount
  useEffect(() => {
    const defaults = getSmartDefaults('medication')
    if (defaults.recentMedications) {
      setRecentMeds(defaults.recentMedications as RecentMedication[])
    }
  }, [])

  // Sync medications to store
  const syncToStore = useCallback((meds: MedicationEntry[]) => {
    setMedications(meds)
    // Always keep medications[] in answers
    setAnswer("medications", meds)
    // Backward compat: primary medication fields from first entry
    const primary = meds[0]
    if (primary) {
      setAnswers({
        selectedMedication: primary.product,
        medicationName: primary.product?.drug_name || primary.name,
        medicationStrength: primary.strength || "",
        medicationForm: primary.form || "",
        pbsCode: primary.pbsCode || "",
      })
    }
  }, [setAnswer, setAnswers])

  const handleMedicationSelect = (index: number, product: SelectedPBSProduct | null) => {
    const updated = [...medications]
    updated[index] = {
      product,
      name: product?.drug_name || "",
      strength: product?.strength || "",
      form: product?.form || "",
      pbsCode: product?.pbs_code || "",
    }
    syncToStore(updated)
  }

  const handleRecentMedClick = (med: RecentMedication) => {
    const updated = [...medications]
    updated[0] = {
      product: null,
      name: med.name,
      strength: med.strength || "",
      form: med.form || "",
      pbsCode: med.pbsCode || "",
    }
    syncToStore(updated)
  }

  const addMedication = () => {
    if (medications.length < 5) {
      syncToStore([...medications, { product: null, name: "" }])
    }
  }

  const removeMedication = (index: number) => {
    if (medications.length <= 1) return
    const updated = medications.filter((_, i) => i !== index)
    syncToStore(updated)
  }

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}
    const hasAtLeastOne = medications.some(m => m.product || m.name)
    if (!hasAtLeastOne) {
      newErrors.medication = "Please search for and select your medication"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [medications])

  const handleNext = useCallback(() => {
    if (validate()) {
      // Save to recent medications
      for (const med of medications) {
        if (med.product) {
          addRecentMedication({
            name: med.product.drug_name,
            strength: med.product.strength || undefined,
            form: med.product.form || undefined,
            pbsCode: med.product.pbs_code || undefined,
          })
        } else if (med.name) {
          addRecentMedication({ name: med.name })
        }
      }
      onNext()
    }
  }, [validate, medications, onNext])

  const isComplete = medications.some(m => m.product || m.name)
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

      {/* Medication search slots */}
      {medications.map((med, index) => (
        <div key={index} className="space-y-2">
          <FormField
            label={medications.length > 1 ? `Medication ${index + 1}` : "Medication name"}
            required={index === 0}
            error={index === 0 ? errors.medication : undefined}
            hint={index === 0 ? "If you know the name, start typing to help us locate it" : undefined}
            helpContent={index === 0 ? {
              title: "Why do we ask this?",
              content: "This is for reference only. The doctor will review and confirm the correct medication. All prescribing decisions are made by the clinician."
            } : undefined}
          >
            <div className="mt-2 flex gap-2 items-start">
              <div className="flex-1">
                <MedicationSearch
                  value={med.product}
                  onChange={(product) => handleMedicationSelect(index, product)}
                />
              </div>
              {medications.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-10 w-10 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMedication(index)}
                  aria-label={`Remove medication ${index + 1}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </FormField>

          {/* Selected medication display */}
          {med.product && (
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="font-medium text-sm">{med.product.drug_name}</p>
              {med.product.strength && (
                <p className="text-xs text-muted-foreground">{med.product.strength}</p>
              )}
              {med.product.form && (
                <p className="text-xs text-muted-foreground">{med.product.form}</p>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add another medication button */}
      {medications.length < 5 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addMedication}
          className="w-full gap-2"
        >
          <Plus className="w-4 h-4" />
          Add another medication
        </Button>
      )}

      {/* Continue button */}
      <Button 
        onClick={handleNext} 
        className="w-full h-12"
        disabled={!canContinue}
      >
        Continue
      </Button>
    </div>
  )
}
