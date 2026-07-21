"use client"

/**
 * Medication Step — the single "Your medication" screen for repeat requests.
 *
 * P2.1 (2026-07-17): the separate `medication-history` step was merged in here.
 * The split asked for a medicine on one screen and everything ABOUT that
 * medicine on the next; the second screen was never independently answerable,
 * so it only cost a page turn on the weakest paid path. One medicine, one
 * screen: name/strength/form, when it was last prescribed, dose & frequency,
 * the unchanged-regimen attestation, what it treats, and side effects.
 *
 * Everything below the medicine is always mounted (no phased reveals — the
 * #209 rule) except the "never prescribed before" route-out, which is a
 * terminal branch: the request cannot proceed as a repeat, so the remaining
 * questions are moot rather than merely hidden.
 *
 * The PBS reference combobox was retired here (2026-06-28, operator): it was
 * slow and read as a hard "search and select from the list" gate, blocking
 * patients on a lookup that is reference-only anyway — the doctor confirms the
 * exact medicine in Parchment/MIMS at prescribing time. Patients now just type
 * the name (and any details) into a plain box.
 *
 * ANSWER KEYS ARE UNCHANGED by the merge. Every clinical backstop still
 * operates on the same typed text and the same keys:
 * - controlled-substance hard block (isControlledSubstance)
 * - dedicated-service steer: hair-loss + contraceptive-pill medicines route to
 *   their own services (detectDedicatedServiceForMedication) — a soft block
 *   with an explicit "keep as repeat" escape
 * - server-side `dedicated_service_medication` attention flag
 *   (lib/clinical/derive-intake-flags.ts), which scans name+strength+form
 * - checkout re-validates via validateMedicationStep +
 *   validateMedicationHistoryStep (lib/request/unified-checkout.ts)
 * - the unchanged-regimen attestation (doseChanged) is a prescribing gate
 *   (lib/clinical/repeat-rx-attestation.ts); editing the medicine or the dose
 *   clears it, because the attestation belongs to the exact regimen reviewed.
 * Dose / frequency / indication are mandatory for repeat-Rx (operator decision
 * 2026-06-26).
 */

import { ArrowRight, HeartPulse, ShieldAlert, Stethoscope } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  ChipToggleGroup,
  IntakeStepIntro,
  QuestionCard,
  QuestionPrompt,
  SegmentedChoiceGroup,
  YesNoDetailQuestion,
} from "@/components/request/shared/intake-step-primitives"
import { StepBlockedSummary } from "@/components/request/shared/step-blocked-summary"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { isControlledSubstance } from "@/lib/clinical/intake-validation"
import { type DedicatedServiceMatch, detectDedicatedServiceForMedication } from "@/lib/clinical/medication-service-routing"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import {
  normalizeMedicationEntriesAnswer,
  normalizeMedicationProductAnswer,
  stringAnswer,
} from "@/lib/request/intake-answer-normalizers"
import { addRecentMedication, getSmartDefaults } from "@/lib/request/preferences"
import {
  areRepeatRxMedicationDetailsEqual,
  hasDoseFrequencyStarter,
  toggleDoseFrequencyStarter,
} from "@/lib/request/repeat-rx-regimen"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { deriveRepeatMedicationTerminalBlock } from "@/lib/request/terminal-safety-blocks"
import { resolveRepeatMedicationCode } from "@/lib/validation/repeat-script-medications"

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

const PRESCRIPTION_HISTORY_OPTIONS = [
  { value: "less_than_3_months", label: "Under 3 months" },
  { value: "3_to_6_months", label: "3-6 months" },
  { value: "6_to_12_months", label: "6-12 months" },
  { value: "over_12_months", label: "Over 12 months" },
] as const

// Tap-to-add frequency starters. The textarea stays the source of truth — a
// chip only seeds the words most patients would otherwise have to type on a
// phone keyboard, and they still add the amount ("2 puffs", "1 tablet").
const COMMON_FREQUENCY_STARTERS = [
  { key: "once_daily", label: "Once daily" },
  { key: "twice_daily", label: "Twice daily" },
  { key: "three_times_daily", label: "Three times daily" },
  { key: "morning", label: "In the morning" },
  { key: "night", label: "At night" },
  { key: "as_needed", label: "As needed" },
] as const

const DOSE_CONFIRMATION_REQUIRED = "Please confirm whether the dose or the way you take this medicine has changed"
const DOSE_CHANGE_REQUIRES_REVIEW = "A dose or directions change needs review by your regular GP or specialist"

export default function MedicationStep({ serviceType, onNext }: MedicationStepProps) {
  const { answers, setAnswers, setAnswer } = useRequestStore()
  const posthog = usePostHog()
  const router = useRouter()
  const searchParams = useSearchParams()
  const medicationNameRef = useRef<HTMLInputElement>(null)

  // Old drafts may carry a PBS `selectedMedication` object or multiple
  // medication rows. Collapse everything to the first requested medicine: a
  // repeat request now covers one medicine so dose/history answers stay clear.
  const existingMedications = normalizeMedicationEntriesAnswer(answers.medications) as MedicationEntry[]
  const legacyProduct = normalizeMedicationProductAnswer(answers.selectedMedication) as { drug_name?: string; strength?: string; form?: string } | null
  const medicationName = stringAnswer(answers.medicationName)
  const medicationStrength = stringAnswer(answers.medicationStrength)
  const medicationForm = stringAnswer(answers.medicationForm)

  const prescriptionHistory = answers.prescriptionHistory as string | undefined
  const currentDose = (answers.currentDose as string) || ""
  const indication = (answers.indication as string) || ""
  const doseChanged = answers.doseChanged as boolean | undefined
  const sideEffects = (answers.sideEffects as string) || ""
  const hasSideEffects = answers.hasSideEffects as boolean | undefined

  // Initialize medications array from existing data
  const [medications, setMedications] = useState<MedicationEntry[]>(() => {
    if (existingMedications && existingMedications.length > 0) {
      const med = existingMedications[0] ?? { name: "" }
      return [{
        name: med.name || "",
        strength: med.strength,
        form: med.form,
        // A restored draft can carry the retired PBS-search UNKNOWN sentinel,
        // which the checkout validators treat as unidentified. Normalise it
        // away when a real name exists so a resumed request isn't blocked at
        // Pay on a description field this UI no longer renders.
        pbsCode: resolveRepeatMedicationCode(med.name, med.pbsCode),
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
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  // Subtype the patient explicitly chose to keep as a repeat (clears the steer).
  const [steerDismissedSubtype, setSteerDismissedSubtype] = useState<string | null>(null)
  const [blockedReasons, setBlockedReasons] = useState<string[]>([])
  const [recentMeds, setRecentMeds] = useState<RecentMedication[]>([])
  const controlledBlock = deriveRepeatMedicationTerminalBlock(answers)

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
    const previousPrimary = medications[0] ?? { name: "" }
    const medicationChanged = !areRepeatRxMedicationDetailsEqual(previousPrimary, primary)
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
        ...(medicationChanged
          ? {
              // The unchanged-regimen attestation belongs to the exact
              // medication details the patient reviewed.
              doseChanged: undefined,
              dose_changed: undefined,
            }
          : {}),
      })
    }
  }, [medications, setAnswer, setAnswers])

  const handleMedicationNameChange = (index: number, value: string) => {
    const updated = [...medications]
    updated[index] = {
      ...updated[index],
      name: value,
      pbsCode: value ? "MANUAL" : "",
    }
    syncToStore(updated)
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
      // Saved recent-medication preferences have no expiry, so a pre-#211 save
      // can still carry the retired UNKNOWN sentinel — normalise it so one tap
      // on a saved medicine can't seed an entry checkout will reject.
      pbsCode: resolveRepeatMedicationCode(med.name, med.pbsCode),
    }
    syncToStore(updated)
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

  const isNeverPrescribed = prescriptionHistory === "never"
  // Everything below the medicine stays mounted; only the terminal
  // not-a-repeat branch removes it.
  const showRepeatDetails = !isNeverPrescribed

  // Editing the regimen text invalidates an attestation the patient already
  // gave against the previous wording.
  const updateCurrentDose = useCallback((nextDose: string) => {
    if (nextDose === currentDose) return

    const hadRegimenAttestation = doseChanged !== undefined
    setAnswer("currentDose", nextDose)
    setAnswer("dosageInstructions", nextDose)
    if (hadRegimenAttestation) {
      setAnswer("doseChanged", undefined)
      setAnswer("dose_changed", undefined)
      setErrors((prev) => ({ ...prev, doseChanged: DOSE_CONFIRMATION_REQUIRED }))
      setBlockedReasons((prev) => [
        ...prev.filter((reason) =>
          reason !== DOSE_CONFIRMATION_REQUIRED && reason !== DOSE_CHANGE_REQUIRES_REVIEW
        ),
        DOSE_CONFIRMATION_REQUIRED,
      ])
    }
  }, [currentDose, doseChanged, setAnswer])

  // Tap a starter to seed/clear the frequency wording. The textarea remains the
  // source of truth, so checkout validation and the doctor's view are unchanged.
  const toggleFrequencyStarter = useCallback((phrase: string) => {
    updateCurrentDose(toggleDoseFrequencyStarter(currentDose, phrase))
    setTouched((prev) => ({ ...prev, currentDose: true }))
  }, [currentDose, updateCurrentDose])

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

    if (!prescriptionHistory) {
      newErrors.prescriptionHistory = "Please select when you were last prescribed this medication"
    }

    // Note: prescriptionHistory === "never" is intentionally NOT a validation
    // error. The inline card explains the repeat-script boundary and points
    // patients back to the live service hub, without reviving a
    // general-consult fallback.
    const isRepeatActive = Boolean(prescriptionHistory) && !isNeverPrescribed
    if (isRepeatActive && !currentDose.trim()) {
      newErrors.currentDose = "Tell the doctor your current dose and how often you take it"
    }
    if (isRepeatActive && !indication.trim()) {
      newErrors.indication = "Tell the doctor what this medication is for"
    }
    if (isRepeatActive && doseChanged === undefined) {
      newErrors.doseChanged = DOSE_CONFIRMATION_REQUIRED
    } else if (isRepeatActive && doseChanged === true) {
      newErrors.doseChanged = DOSE_CHANGE_REQUIRES_REVIEW
    }

    if (isRepeatActive && hasSideEffects === undefined) {
      newErrors.sideEffects = "Please indicate if you have had side effects"
    } else if (hasSideEffects && !sideEffects.trim()) {
      newErrors.sideEffects = "Please describe the side effects you experienced"
    }

    setErrors(newErrors)
    setBlockedReasons(Object.values(newErrors))
    setTouched({
      medication: true,
      prescriptionHistory: true,
      currentDose: true,
      indication: true,
      doseChanged: true,
      sideEffects: true,
    })
    return Object.keys(newErrors).length === 0
  }, [
    medications,
    prescriptionHistory,
    isNeverPrescribed,
    currentDose,
    indication,
    doseChanged,
    hasSideEffects,
    sideEffects,
  ])

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
  // Readiness: a named medicine, when it was last prescribed, and — for a
  // genuine repeat — dose+frequency, what it treats, the unchanged-regimen
  // attestation, and an explicit side-effect answer. Strength/form stay
  // optional (the doctor is flagged if blank).
  const isComplete = Boolean(
    activeMedications.length > 0
    && prescriptionHistory
    && !isNeverPrescribed
    && currentDose.trim()
    && indication.trim()
    && doseChanged === false
    && (hasSideEffects === false || (hasSideEffects && sideEffects.trim()))
  )
  // Live-computed; controlledBlock stays (a real clinical block), the stale
  // `errors` object does not gate readiness.
  const canContinue = isComplete && !controlledBlock && !steerActive

  useEffect(() => {
    if (canContinue && blockedReasons.length > 0) setBlockedReasons([])
  }, [canContinue, blockedReasons.length])

  const frequencyValues = Object.fromEntries(
    COMMON_FREQUENCY_STARTERS.map((starter) => [
      starter.key,
      hasDoseFrequencyStarter(currentDose, starter.label),
    ]),
  )

  // Keyboard navigation
  useKeyboardNavigation({
    onNext: canContinue ? handleNext : undefined,
    enabled: Boolean(canContinue),
  })

  return (
    <div className="space-y-4">
      <IntakeStepIntro
        title="Your medication"
        description="Request one regular medicine at a time. Type the name, or describe it if you're not sure — the doctor confirms the right medicine before prescribing."
      />

      <StepBlockedSummary reasons={blockedReasons} />

      {/* Controlled substance block */}
      {controlledBlock && (
        <Alert variant="destructive">
          <ShieldAlert className="w-4 h-4" />
          <AlertTitle>{controlledBlock.title}</AlertTitle>
          <AlertDescription className="text-xs">
            <p>{controlledBlock.reason}</p>
            <p className="mt-1 font-medium">{controlledBlock.advice}</p>
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
              ref={index === 0 ? medicationNameRef : undefined}
              value={med.name}
              onChange={(event) => handleMedicationNameChange(index, event.target.value)}
              placeholder="e.g. Atorvastatin 20 mg — or describe it (white tablet for cholesterol)"
              autoComplete="off"
              className="mt-2 h-11"
              aria-invalid={Boolean(errors.medication)}
            />
          </FormField>

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
        </QuestionCard>
      ))}

      {/* Prescription history — always visible so answering never swaps the
          screen out (the old progressive reveal hid this card after a pick). */}
      <QuestionCard compact className="space-y-3">
        <QuestionPrompt
          label="When were you last prescribed this medication?"
          required
        />
        <SegmentedChoiceGroup
          options={PRESCRIPTION_HISTORY_OPTIONS}
          value={prescriptionHistory}
          onChange={(value) => setAnswer("prescriptionHistory", value)}
          ariaLabel="When were you last prescribed this medication?"
          columns="two"
        />
        {touched.prescriptionHistory && errors.prescriptionHistory && (
          <p className="text-xs text-destructive" role="alert" aria-live="polite">
            {errors.prescriptionHistory}
          </p>
        )}
        <button
          type="button"
          onClick={() => setAnswer("prescriptionHistory", "never")}
          className="w-full rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          I have not been prescribed this before
        </button>
      </QuestionCard>

      {/* New medication detected - repeat-script boundary */}
      {isNeverPrescribed && (
        <div className="p-4 rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] space-y-4">
          <div className="flex gap-3">
            <Stethoscope className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <AlertTitle className="text-sm font-medium text-foreground">
                Not a repeat prescription
              </AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground">
                Repeat prescriptions are only for medicines another doctor has prescribed before.
                For a new prescription, please visit your GP. InstantMed has specialty requests
                for ED, hair loss, and women&apos;s health when those pathways fit.
              </AlertDescription>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setAnswer("prescriptionHistory", undefined)
                medicationNameRef.current?.focus()
                medicationNameRef.current?.scrollIntoView({ block: "center" })
              }}
              className="flex-1 gap-2"
            >
              Change medication
            </Button>
            <Button
              variant="ghost"
              asChild
              className="flex-1 gap-2"
            >
              <a href="/request">
                Browse other services
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Current dose */}
      {showRepeatDetails && (
        <QuestionCard compact>
          <FormField
            label="What dose do you currently take?"
            required
            error={touched.currentDose ? errors.currentDose : undefined}
            hint="Include how often you take it. Copy the wording from your label if you can."
          >
            <ChipToggleGroup
              options={COMMON_FREQUENCY_STARTERS}
              values={frequencyValues}
              onChange={(key) => {
                const starter = COMMON_FREQUENCY_STARTERS.find((option) => option.key === key)
                if (starter) toggleFrequencyStarter(starter.label)
              }}
              ariaLabel="Common dose frequencies"
              className="mt-2"
            />
            <Label
              htmlFor="current-dose"
              className="mt-3 block text-xs font-normal text-muted-foreground"
            >
              Add the amount you take
            </Label>
            <Textarea
              id="current-dose"
              value={currentDose}
              onChange={(e) => updateCurrentDose(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, currentDose: true }))}
              placeholder="e.g., 2 puffs twice daily"
              className="min-h-[72px] mt-1.5"
            />
          </FormField>
        </QuestionCard>
      )}

      {/* Repeat eligibility requires the patient's explicit confirmation. */}
      {showRepeatDetails && (
        <QuestionCard compact>
          <YesNoDetailQuestion
            label="Has the dose or the way you take this medicine changed since it was last prescribed?"
            helpText="This includes how much you take, how often you take it, and the directions on the label."
            noLabel="No, unchanged"
            yesLabel="Yes, changed"
            value={doseChanged}
            onSelect={(value) => {
              setAnswer("doseChanged", value)
              setTouched((prev) => ({ ...prev, doseChanged: true }))
              setErrors((prev) => {
                const next = { ...prev }
                if (value) next.doseChanged = DOSE_CHANGE_REQUIRES_REVIEW
                else delete next.doseChanged
                return next
              })
              setBlockedReasons((prev) => {
                const remaining = prev.filter((reason) =>
                  reason !== DOSE_CONFIRMATION_REQUIRED && reason !== DOSE_CHANGE_REQUIRES_REVIEW
                )
                return value ? [...remaining, DOSE_CHANGE_REQUIRES_REVIEW] : remaining
              })
            }}
            error={touched.doseChanged ? errors.doseChanged : undefined}
          />
        </QuestionCard>
      )}

      {/* Indication — what the medication is for */}
      {showRepeatDetails && (
        <QuestionCard compact>
          <FormField
            label="What is this medication for?"
            required
            error={touched.indication ? errors.indication : undefined}
            hint="The condition or reason you take it — e.g., asthma, blood pressure, acne."
          >
            <Input
              value={indication}
              onChange={(e) => setAnswer("indication", e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, indication: true }))}
              placeholder="e.g., asthma"
              className="h-11 mt-2"
            />
          </FormField>
        </QuestionCard>
      )}

      {/* Side effects */}
      {showRepeatDetails && (
        <QuestionCard compact>
          <YesNoDetailQuestion
            label="Any side effects with this medication?"
            helpText="This helps the doctor decide whether a repeat is safe."
            noLabel="No side effects"
            yesLabel="Yes"
            value={hasSideEffects}
            onSelect={(value) => {
              setAnswer("hasSideEffects", value)
              if (!value) setAnswer("sideEffects", "")
            }}
            detail={sideEffects}
            onDetailChange={(value) => setAnswer("sideEffects", value)}
            detailPlaceholder="Briefly describe what happened"
            error={errors.sideEffects}
          />
        </QuestionCard>
      )}

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
            Continue to notes &amp; history
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
