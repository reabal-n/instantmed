"use client"

/**
 * Medication Step — free-text medication name + optional strength/form.
 *
 * The PBS reference combobox was retired here (2026-06-28, operator): it was
 * slow and read as a hard "search and select from the list" gate, blocking
 * patients on a lookup that is reference-only anyway — the doctor confirms the
 * exact medicine in Parchment/MIMS at prescribing time. Patients now just type
 * the name (and any details) into a plain box.
 *
 * All clinical backstops are UNCHANGED and operate on the typed text:
 * - controlled-substance hard block (isControlledSubstance)
 * - dedicated-service steer: hair-loss + contraceptive-pill medicines route to
 *   their own services (detectDedicatedServiceForMedication)
 * - server-side `dedicated_service_medication` attention flag
 *   (lib/clinical/derive-intake-flags.ts), which scans name+strength+form.
 * Dose / frequency / indication stay mandatory in the next step
 * (medication-history) for repeat-Rx.
 */

import { ArrowRight, HeartPulse, ShieldAlert } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

import { InlineRecoveryEmailField } from "@/components/request/shared/inline-recovery-email-field"
import { IntakeStepIntro, QuestionCard } from "@/components/request/shared/intake-step-primitives"
import { StepBlockedSummary } from "@/components/request/shared/step-blocked-summary"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { CONTROLLED_SUBSTANCE_DISCLAIMER, isControlledSubstance } from "@/lib/clinical/intake-validation"
import { type DedicatedServiceMatch, detectDedicatedServiceForMedication } from "@/lib/clinical/medication-service-routing"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import {
  normalizeMedicationEntriesAnswer,
  normalizeMedicationProductAnswer,
  stringAnswer,
} from "@/lib/request/intake-answer-normalizers"
import { addRecentMedication, getSmartDefaults } from "@/lib/request/preferences"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

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
  name: string
  strength?: string
  form?: string
  // "MANUAL" for free-text entries. Kept for back-compat with the prescribing
  // packet / recent-meds; the PBS code is no longer collected from patients.
  pbsCode?: string
}

// Attribution params preserved when we hand a patient to a dedicated service,
// mirroring the womens-health-type-step "continue my pill" redirect.
const MEDICATION_STEER_ATTRIBUTION_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "gclid", "gbraid", "wbraid"]

export default function MedicationStep({ serviceType, onNext }: MedicationStepProps) {
  const { answers, setAnswers, setAnswer } = useRequestStore()
  const posthog = usePostHog()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Old drafts may carry a PBS `selectedMedication` object or multiple
  // medication rows. Collapse everything to the first requested medicine: a
  // repeat request now covers one medicine so dose/history answers stay clear.
  const existingMedications = normalizeMedicationEntriesAnswer(answers.medications) as MedicationEntry[]
  const legacyProduct = normalizeMedicationProductAnswer(answers.selectedMedication) as { drug_name?: string; strength?: string; form?: string } | null
  const medicationName = stringAnswer(answers.medicationName)
  const medicationStrength = stringAnswer(answers.medicationStrength)
  const medicationForm = stringAnswer(answers.medicationForm)

  // Initialize medications array from existing data
  const [medications, setMedications] = useState<MedicationEntry[]>(() => {
    if (existingMedications && existingMedications.length > 0) {
      const med = existingMedications[0] ?? { name: "" }
      return [{
        name: med.name || "",
        strength: med.strength,
        form: med.form,
        pbsCode: med.pbsCode,
      }]
    }
    const seededName = medicationName || legacyProduct?.drug_name || ""
    if (seededName) {
      return [{
        name: seededName,
        strength: legacyProduct?.strength || medicationStrength,
        form: legacyProduct?.form || medicationForm,
        pbsCode: "MANUAL",
      }]
    }
    return [{ name: "" }]
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [controlledBlock, setControlledBlock] = useState<string | null>(null)
  // Subtype the patient explicitly chose to keep as a repeat (clears the steer).
  const [steerDismissedSubtype, setSteerDismissedSubtype] = useState<string | null>(null)
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
    const primary = meds[0] ?? { name: "" }
    const next = [primary]
    setMedications(next)
    // Always keep medications[] in answers; one request covers one medicine.
    setAnswer("medications", next)
    // Backward compat: primary medication fields from first entry. The PBS
    // product object is cleared — patients enter free text now.
    if (primary) {
      setAnswers({
        selectedMedication: null,
        medicationName: primary.name,
        medicationStrength: primary.strength || "",
        medicationForm: primary.form || "",
        pbsCode: primary.pbsCode || "",
      })
    }
  }, [setAnswer, setAnswers])

  const checkForControlledSubstance = useCallback((meds: MedicationEntry[]) => {
    for (const med of meds) {
      if (med.name && isControlledSubstance(med.name)) {
        setControlledBlock(CONTROLLED_SUBSTANCE_DISCLAIMER.message)
        return
      }
    }
    setControlledBlock(null)
  }, [])

  const handleMedicationNameChange = (index: number, value: string) => {
    const updated = [...medications]
    updated[index] = {
      ...updated[index],
      name: value,
      pbsCode: value ? "MANUAL" : "",
    }
    syncToStore(updated)
    checkForControlledSubstance(updated)
    setErrors((prev) => {
      const next = { ...prev }
      delete next.medication
      return next
    })
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
      name: med.name,
      strength: med.strength || "",
      form: med.form || "",
      pbsCode: med.pbsCode || "MANUAL",
    }
    syncToStore(updated)
    checkForControlledSubstance(updated)
  }

  // Steer medicines that have a dedicated service (hair loss / women's health)
  // out of the generic repeat/prescription flow. Intent-aware soft block: the
  // patient can still keep it as a repeat (e.g. a hair-loss medicine at a dose
  // used for another condition, or continuing the same pill). The
  // doctor-side backstop is the
  // `dedicated_service_medication` flag (lib/clinical/derive-intake-flags.ts).
  const steerEnabled = serviceType === "repeat-script" || serviceType === "prescription"
  const serviceSteer = useMemo<DedicatedServiceMatch | null>(() => {
    if (!steerEnabled) return null
    for (const med of medications) {
      const scanText = [med.name, med.strength, med.form]
        .filter(Boolean)
        .join(" ")
      const match = detectDedicatedServiceForMedication(scanText)
      if (match) return match
    }
    return null
  }, [steerEnabled, medications])
  const steerActive = serviceSteer !== null && serviceSteer.subtype !== steerDismissedSubtype

  const goToDedicatedService = useCallback((subtype: string) => {
    const params = new URLSearchParams()
    for (const key of MEDICATION_STEER_ATTRIBUTION_PARAMS) {
      const value = searchParams.get(key)
      if (value) params.set(key, value)
    }
    params.set("service", "consult")
    params.set("subtype", subtype)
    router.push(`/request?${params.toString()}`)
  }, [router, searchParams])

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}
    const hasAtLeastOne = medications.some((m) => m.name.trim())
    if (!hasAtLeastOne) {
      newErrors.medication = "Enter the name of the medication you need"
    }
    // Belt-and-suspenders: recheck controlled substances in validate.
    for (const med of medications) {
      if (med.name && isControlledSubstance(med.name)) {
        newErrors.medication = "Controlled substances cannot be prescribed online"
        break
      }
      // Strength and form are optional — if blank the doctor sees
      // medication_strength_missing / medication_form_missing flags instead of
      // a dead-end.
    }
    setErrors(newErrors)
    setBlockedReasons(Object.values(newErrors))
    return Object.keys(newErrors).length === 0
  }, [medications])

  const handleNext = useCallback(() => {
    // A controlled substance is a hard clinical block — the destructive alert
    // above already explains it; never advance past it. The dedicated-service
    // steer is a soft block with an explicit "keep as repeat" escape.
    if (controlledBlock || steerActive) return
    if (validate()) {
      // Save to recent medications for next-time quick-pick.
      for (const med of medications) {
        if (med.name.trim()) {
          addRecentMedication({ name: med.name, strength: med.strength || undefined, form: med.form || undefined, pbsCode: med.pbsCode || "MANUAL" })
        }
      }
      posthog?.capture('step_completed', { step: 'medication', medication_count: medications.filter((m) => m.name.trim()).length })
      onNext()
    }
  }, [controlledBlock, steerActive, validate, medications, posthog, onNext])

  const activeMedications = medications.filter((m) => m.name.trim())
  // Readiness: at least one named medicine. Strength/form are optional (the
  // doctor is flagged if blank); dose/frequency/indication are collected and
  // required in the next step (medication-history) for repeat-Rx.
  const isComplete = activeMedications.length > 0
  // Live-computed; controlledBlock stays (a real clinical block), the stale
  // `errors` object does not gate readiness.
  const canContinue = Boolean(isComplete) && !controlledBlock && !steerActive

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
        description="Request one regular medicine at a time. Type the name, or describe it if you're not sure — the doctor confirms the right medicine before prescribing."
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

      {/* Dedicated-service steer (hair loss / women's health) */}
      {steerActive && serviceSteer && (
        <Alert>
          <HeartPulse className="w-4 h-4" />
          <AlertTitle>{serviceSteer.serviceLabel} has a dedicated service</AlertTitle>
          <AlertDescription className="text-xs">
            <p>
              {serviceSteer.subtype === "womens_health"
                ? "Starting or switching pills goes through our Women's Health service, which asks the right safety questions before prescribing."
                : "This medicine is prescribed through our Hair Loss service, which includes the right safety screening."}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button type="button" size="sm" onClick={() => goToDedicatedService(serviceSteer.subtype)}>
                Continue in {serviceSteer.serviceLabel}
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSteerDismissedSubtype(serviceSteer.subtype)}
              >
                {serviceSteer.subtype === "womens_health"
                  ? "I'm continuing my current pill — keep as repeat"
                  : "I'm continuing an existing prescription — keep as repeat"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Recent medications suggestion */}
      {recentMeds.length > 0 && !medications.some((m) => m.name.trim()) && (
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

      {/* Medication entry */}
      {medications.map((med, index) => (
        <QuestionCard key={index} compact>
          <FormField
            label="Medication name"
            required
            error={errors.medication}
            helpContent={{
              title: "Why do we ask this?",
              content: "So the doctor knows what you're requesting. This is for reference — the doctor reviews and confirms the correct medication before prescribing."
            }}
          >
            <Input
              id={`medication-name-${index}`}
              value={med.name}
              onChange={(event) => handleMedicationNameChange(index, event.target.value)}
              placeholder="e.g. Atorvastatin 20 mg — or describe it (white tablet for cholesterol)"
              autoComplete="off"
              className="mt-2 h-11"
              aria-invalid={Boolean(errors.medication)}
            />
          </FormField>

          {med.name.trim() && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor={`medication-strength-${index}`}>
                  Strength <span className="text-muted-foreground/70">(optional)</span>
                </label>
                <Input
                  id={`medication-strength-${index}`}
                  value={med.strength || ""}
                  onChange={(event) => handleMedicationFieldChange(index, "strength", event.target.value)}
                  placeholder="e.g. 10 mg"
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor={`medication-form-${index}`}>
                  Form <span className="text-muted-foreground/70">(optional)</span>
                </label>
                <Input
                  id={`medication-form-${index}`}
                  value={med.form || ""}
                  onChange={(event) => handleMedicationFieldChange(index, "form", event.target.value)}
                  placeholder="e.g. tablet"
                  className="h-10"
                />
              </div>
            </div>
          )}
        </QuestionCard>
      ))}

      <InlineRecoveryEmailField serviceType={serviceType} stepId="medication" />

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
