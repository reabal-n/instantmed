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

import { ArrowRight, Plus, ShieldAlert, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { EarlyRecoveryEmailCard } from "@/components/request/shared/early-recovery-email-card"
import { IntakeStepIntro, QuestionCard } from "@/components/request/shared/intake-step-primitives"
import { StepBlockedSummary } from "@/components/request/shared/step-blocked-summary"
import type { SelectedPBSProduct } from "@/components/shared/medication-search"
import { MedicationSearch } from "@/components/shared/medication-search"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { CONTROLLED_SUBSTANCE_DISCLAIMER, isControlledSubstance } from "@/lib/clinical/intake-validation"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import {
  normalizeMedicationEntriesAnswer,
  normalizeMedicationProductAnswer,
  stringAnswer,
} from "@/lib/request/intake-answer-normalizers"
import { addRecentMedication, getSmartDefaults } from "@/lib/request/preferences"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { isUsefulMedicationDescription } from "@/lib/validation/repeat-script-medications"

import { FormField } from "../form-field"
import { useRequestStore } from "../store"

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
  description?: string
}

const UNKNOWN_MEDICATION_NAME = "Unknown - doctor will confirm"

export default function MedicationStep({ serviceType, onNext }: MedicationStepProps) {
  const { answers, setAnswers, setAnswer } = useRequestStore()
  const posthog = usePostHog()

  // Support both single (legacy) and multi-medication modes
  const existingMedications = normalizeMedicationEntriesAnswer(answers.medications) as MedicationEntry[]
  const selectedMedication = normalizeMedicationProductAnswer(answers.selectedMedication) as SelectedPBSProduct | null
  const medicationName = stringAnswer(answers.medicationName)
  const medicationStrength = stringAnswer(answers.medicationStrength)
  const medicationForm = stringAnswer(answers.medicationForm)
  const pbsCode = stringAnswer(answers.pbsCode)

  // Initialize medications array from existing data
  const [medications, setMedications] = useState<MedicationEntry[]>(() => {
    if (existingMedications && existingMedications.length > 0) return existingMedications
    if (selectedMedication || medicationName) {
      return [{
        product: selectedMedication,
        name: medicationName,
        strength: selectedMedication?.strength || medicationStrength,
        form: selectedMedication?.form || medicationForm,
        pbsCode: selectedMedication?.pbs_code || pbsCode || (medicationName ? "MANUAL" : ""),
      }]
    }
    return [{ product: null, name: "" }]
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [controlledBlock, setControlledBlock] = useState<string | null>(null)
  const [blockedReasons, setBlockedReasons] = useState<string[]>([])
  const [recentMeds, setRecentMeds] = useState<RecentMedication[]>([])

  // Load recent medications on mount
  useEffect(() => {
    const defaults = getSmartDefaults('medication')
    const recentMedications = normalizeMedicationEntriesAnswer(defaults.recentMedications)
    if (recentMedications.length > 0) {
      setRecentMeds(recentMedications.map((med) => ({
        name: med.name,
        strength: med.strength,
        form: med.form,
        pbsCode: med.pbsCode,
      })))
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

  const checkForControlledSubstance = useCallback((meds: MedicationEntry[]) => {
    for (const med of meds) {
      // Scan both the named medicine AND the free-text "I don't know the name"
      // description — the server controlled-substance block (via
      // buildRepeatScriptMedicationValidationText) scans the description too, so
      // the in-flow warning must stay in parity or a patient types a controlled
      // name into the description and is only stopped server-side after paying.
      const candidates = [med.product?.drug_name || med.name, med.description]
      if (candidates.some((value) => value && isControlledSubstance(value))) {
        setControlledBlock(CONTROLLED_SUBSTANCE_DISCLAIMER.message)
        return
      }
    }
    setControlledBlock(null)
  }, [])

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
    checkForControlledSubstance(updated)
  }

  const handleMedicationFieldChange = (index: number, field: "strength" | "form", value: string) => {
    const updated = [...medications]
    updated[index] = {
      ...updated[index],
      [field]: value,
    }
    syncToStore(updated)
    setErrors((prev) => {
      const next = { ...prev }
      delete next[`${field}-${index}`]
      return next
    })
  }

  const handleRecentMedClick = (med: RecentMedication) => {
    const updated = [...medications]
    updated[0] = {
      product: null,
      name: med.name,
      strength: med.strength || "",
      form: med.form || "",
      pbsCode: med.pbsCode || "MANUAL",
    }
    syncToStore(updated)
    checkForControlledSubstance(updated)
  }

  const addMedication = () => {
    if (medications.length < 10) {
      const updated = [...medications, { product: null, name: "" }]
      syncToStore(updated)
      checkForControlledSubstance(updated)
    }
  }

  const removeMedication = (index: number) => {
    if (medications.length <= 1) return
    const updated = medications.filter((_, i) => i !== index)
    syncToStore(updated)
    checkForControlledSubstance(updated)
  }

  // "I don't know the exact name" path (A3 boundary 3). The patient can proceed
  // only after describing the medicine; the doctor then sees that description on
  // a medication_needs_identification flag.
  const handleMarkUnknown = (index: number) => {
    const updated = [...medications]
    updated[index] = {
      product: null,
      name: UNKNOWN_MEDICATION_NAME,
      strength: "",
      form: "",
      pbsCode: "UNKNOWN",
      description: "",
    }
    syncToStore(updated)
    setControlledBlock(null)
  }

  const handleDescriptionChange = (index: number, value: string) => {
    const updated = [...medications]
    updated[index] = { ...updated[index], description: value }
    syncToStore(updated)
    checkForControlledSubstance(updated)
  }

  const handleExitUnknown = (index: number) => {
    const updated = [...medications]
    updated[index] = { product: null, name: "" }
    syncToStore(updated)
    setControlledBlock(null)
  }

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}
    const hasAtLeastOne = medications.some(m => m.product || m.name)
    if (!hasAtLeastOne) {
      newErrors.medication = "Please search for and select your medication"
    }
    // Belt-and-suspenders: recheck controlled substances in validate
    medications.forEach((med) => {
      const name = med.product?.drug_name || med.name
      const code = med.pbsCode || med.product?.pbs_code || ""
      // Scan name AND free-text description for parity with the server block.
      const controlledCandidates = [name, med.description]
      if (controlledCandidates.some((value) => value && isControlledSubstance(value))) {
        newErrors.medication = "Controlled substances cannot be prescribed online"
        return
      }
      const isUnknown = code.toUpperCase() === "UNKNOWN" || name?.toLowerCase().includes("unknown - doctor")
      if (isUnknown && !isUsefulMedicationDescription(med.description)) {
        newErrors.medication = "Tell us what you can about this medicine so the doctor can identify it"
      }
      // A3 softening: strength and form are no longer required to continue. If the
      // patient leaves them blank, the doctor sees medication_strength_missing /
      // medication_form_missing flags instead of a dead-end.
    })
    setErrors(newErrors)
    setBlockedReasons(Object.values(newErrors))
    return Object.keys(newErrors).length === 0
  }, [medications])

  const handleNext = useCallback(() => {
    // A controlled substance is a hard clinical block — the destructive alert
    // above already explains it; never advance past it.
    if (controlledBlock) return
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
          addRecentMedication({ name: med.name, strength: med.strength || undefined, form: med.form || undefined, pbsCode: med.pbsCode || "MANUAL" })
        }
      }
      posthog?.capture('step_completed', { step: 'medication', medication_count: medications.filter(m => m.product || m.name).length })
      onNext()
    }
  }, [controlledBlock, validate, medications, posthog, onNext])

  const activeMedications = medications.filter(m => m.product || m.name)
  // A3 softening: readiness no longer requires strength or form (both are
  // doctor-flagged if blank). A selected/typed medication is enough — except an
  // "I don't know the name" entry, which needs a useful description first.
  const isComplete = activeMedications.length > 0 && activeMedications.every((med) => {
    const isUnknown = (med.pbsCode || "").toUpperCase() === "UNKNOWN"
      || med.name.toLowerCase().includes("unknown - doctor")
    return !isUnknown || isUsefulMedicationDescription(med.description)
  })
  // Live-computed; controlledBlock stays (a real clinical block), the stale
  // `errors` object does not gate readiness.
  const canContinue = Boolean(isComplete) && !controlledBlock

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
        title="Which medication do you need?"
        description="Search first. If the exact item is not listed, enter it manually."
      />

      <StepBlockedSummary reasons={blockedReasons} />

      {/* Controlled substance block */}
      {controlledBlock && (
        <Alert variant="destructive">
          <ShieldAlert className="w-4 h-4" />
          <AlertTitle>{CONTROLLED_SUBSTANCE_DISCLAIMER.title}</AlertTitle>
          <AlertDescription className="text-xs">
            <p>{controlledBlock}</p>
            <p className="mt-1 font-medium">{CONTROLLED_SUBSTANCE_DISCLAIMER.advice}</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Recent medications suggestion */}
      {recentMeds.length > 0 && !medications.some(m => m.product || m.name) && (
        <div className="rounded-2xl border border-border/50 bg-white p-3 shadow-md shadow-primary/[0.06] dark:bg-card dark:shadow-none">
          <p className="text-xs text-muted-foreground mb-2">Previously requested:</p>
          <div className="flex flex-wrap gap-1.5">
            {recentMeds.slice(0, 3).map((med) => (
              <button
                key={med.name}
                onClick={() => handleRecentMedClick(med)}
                className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none"
              >
                + {med.name}{med.strength ? ` ${med.strength}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Medication search slots */}
      {medications.map((med, index) => {
        const isUnknownEntry = (med.pbsCode || "").toUpperCase() === "UNKNOWN"
          || med.name.toLowerCase().includes("unknown - doctor")
        return (
        <QuestionCard key={index} compact>
          {isUnknownEntry ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Describe your medication</p>
                {medications.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMedication(index)}
                    aria-label={`Remove medication ${index + 1}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Tell the doctor what you can: what it&apos;s for, the name on the box, what it looks like, who prescribed it, or your usual dose.
              </p>
              <Textarea
                id={`medication-description-${index}`}
                value={med.description || ""}
                onChange={(event) => handleDescriptionChange(index, event.target.value)}
                placeholder="e.g. small white tablet for blood pressure, prescribed by Dr Smith"
                className="min-h-[88px] resize-none"
                aria-invalid={index === 0 ? Boolean(errors.medication) : undefined}
              />
              {index === 0 && errors.medication && (
                <p className="text-xs text-destructive">{errors.medication}</p>
              )}
              <button
                type="button"
                onClick={() => handleExitUnknown(index)}
                className="rounded text-xs text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Actually, let me search for it
              </button>
            </div>
          ) : (
            <>
              <FormField
                label={medications.length > 1 ? `Medication ${index + 1}` : "Medication name"}
                required={index === 0}
                error={index === 0 ? errors.medication : undefined}
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

              {(med.product || med.name) && (
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{med.product?.drug_name || med.name}</p>
                    {med.pbsCode && med.pbsCode !== "MANUAL" && (
                      <span className="text-[11px] text-muted-foreground">PBS {med.pbsCode}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground" htmlFor={`medication-strength-${index}`}>
                        Strength
                      </label>
                      <Input
                        id={`medication-strength-${index}`}
                        value={med.strength || ""}
                        onChange={(event) => handleMedicationFieldChange(index, "strength", event.target.value)}
                        placeholder="e.g. 10 mg"
                        className="h-10"
                        aria-invalid={Boolean(errors[`strength-${index}`])}
                      />
                      {errors[`strength-${index}`] && (
                        <p className="text-xs text-destructive">{errors[`strength-${index}`]}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground" htmlFor={`medication-form-${index}`}>
                        Form
                      </label>
                      <Input
                        id={`medication-form-${index}`}
                        value={med.form || ""}
                        onChange={(event) => handleMedicationFieldChange(index, "form", event.target.value)}
                        placeholder="e.g. tablet"
                        className="h-10"
                        aria-invalid={Boolean(errors[`form-${index}`])}
                      />
                      {errors[`form-${index}`] && (
                        <p className="text-xs text-destructive">{errors[`form-${index}`]}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!med.product && !med.name && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleMarkUnknown(index)}
                  className="mt-2 min-h-11 w-full justify-start whitespace-normal text-left text-sm"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span className="leading-snug">Can&apos;t find it? Describe it for the doctor</span>
                </Button>
              )}
            </>
          )}
        </QuestionCard>
        )
      })}

      {/* Add another medication button */}
      {activeMedications.length > 0 && medications.length < 10 && (
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

      <EarlyRecoveryEmailCard serviceType={serviceType} stepId="medication" />

      {/* Always clickable so a tap surfaces the blocking reason instead of a
          silently greyed mobile dead-end (controlled-substance block excepted —
          handleNext refuses and the alert above explains it). */}
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
            Continue to history
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
