"use client"

/**
 * Medication Step — the single "Your medication" screen for repeat requests.
 *
 * P2.1 (2026-07-17): the separate `medication-history` step was merged in here.
 * The split asked for a medicine on one screen and everything ABOUT that
 * medicine on the next; the second screen was never independently answerable,
 * so it only cost a page turn on the weakest paid path. One medicine, one
 * screen: name/strength/form, when it was last prescribed, one plain-language
 * directions answer, the unchanged-regimen attestation, what it treats, and
 * side effects.
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
 * - controlled-substance hard block (isControlledMedicationName)
 * - dedicated-service steer: ED, hair-loss and contraceptive-pill medicines
 *   route to their own services (detectDedicatedServiceForMedication). ED and
 *   hair loss are hard-routed (no escape; checkout refuses them too); the pill
 *   keeps its "continuing my current pill" escape
 * - server-side `dedicated_service_medication` attention flag
 *   (lib/clinical/derive-intake-flags.ts), which scans name+strength+form
 * - checkout re-validates via validateMedicationStep +
 *   validateMedicationHistoryStep (lib/request/unified-checkout.ts)
 * - the unchanged-regimen attestation (doseChanged) is a prescribing gate
 *   (lib/clinical/repeat-rx-attestation.ts); editing the medicine or the dose
 *   clears it, because the attestation belongs to the exact regimen reviewed.
 * Amount / timing / indication are mandatory for repeat-Rx, but amount and
 * timing stay in one label-copy field rather than three separate controls.
 */

import { ArrowRight, HeartPulse, Info, ShieldAlert, Stethoscope } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  BinaryChoice,
  CompactChoiceRow,
  IntakeStepIntro,
  QuestionCard,
  QuestionPrompt,
  SegmentedChoiceGroup,
} from "@/components/request/shared/intake-step-primitives"
import { StepBlockedSummary } from "@/components/request/shared/step-blocked-summary"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  buildIntakeValidationBlockedProperties,
  buildMedicationSteerProperties,
  captureIntakeEvent,
  INTAKE_ANALYTICS_EVENTS,
  type IntakeBlockResolution,
  type IntakeBlockType,
} from "@/lib/analytics/intake-events"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { isControlledMedicationName } from "@/lib/clinical/intake-validation"
import { type DedicatedServiceMatch, detectDedicatedServiceForMedication, ROUTING_CONTEXT_LABELS } from "@/lib/clinical/medication-service-routing"
import { normalizePrescriptionHistory } from "@/lib/clinical/prescription-history"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { GUARANTEE } from "@/lib/marketing/voice"
import {
  normalizeMedicationEntriesAnswer,
  normalizeMedicationProductAnswer,
  stringAnswer,
} from "@/lib/request/intake-answer-normalizers"
import { addRecentMedication, getSmartDefaults } from "@/lib/request/preferences"
import {
  areRepeatRxMedicationDetailsEqual,
  hasCompleteRepeatRxRegimen,
  REPEAT_RX_REGIMEN_REQUIRED_MESSAGE,
} from "@/lib/request/repeat-rx-regimen"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { deriveRepeatMedicationTerminalBlock } from "@/lib/request/terminal-safety-blocks"
import {
  getLikelyDeclinedRepeatMedication,
  getRepeatScriptMedicationConcreteStrength,
  resolveRepeatMedicationCode,
} from "@/lib/validation/repeat-script-medications"

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
  { value: "within_12_months", label: "Within 12 months" },
  { value: "over_12_months", label: "Over 12 months" },
  { value: "never", label: "Never" },
] as const

const DOSE_CONFIRMATION_REQUIRED = "Please confirm whether the dose or the way you take this medicine has changed"
const DOSE_CHANGE_REQUIRES_REVIEW = "A dose or directions change needs review by your regular GP or specialist"
const DECLINE_ADVISORY_REQUIRED = "Read and acknowledge the online-prescribing note before continuing"
const MEDICATION_STRENGTH_REQUIRED = "Enter the strength shown on the medication label (for example, 100 mg)"

export default function MedicationStep({ serviceType, onNext }: MedicationStepProps) {
  const { answers, flowInstanceId, setAnswers, setAnswer } = useRequestStore()
  const posthog = usePostHog()
  const router = useRouter()
  const searchParams = useSearchParams()
  const medicationNameRef = useRef<HTMLInputElement>(null)
  const steerAlertRef = useRef<HTMLDivElement>(null)
  const declineAlertRef = useRef<HTMLDivElement>(null)
  const directionsSectionRef = useRef<HTMLElement>(null)

  // Old drafts may carry a PBS `selectedMedication` object or multiple
  // medication rows. Collapse everything to the first requested medicine: a
  // repeat request now covers one medicine so dose/history answers stay clear.
  const existingMedications = normalizeMedicationEntriesAnswer(answers.medications) as MedicationEntry[]
  const legacyProduct = normalizeMedicationProductAnswer(answers.selectedMedication) as { drug_name?: string; strength?: string; form?: string } | null
  const medicationName = stringAnswer(answers.medicationName)
  const medicationStrength = stringAnswer(answers.medicationStrength)
  const medicationForm = stringAnswer(answers.medicationForm)

  const prescriptionHistory = answers.prescriptionHistory as string | undefined
  const selectedPrescriptionHistory = normalizePrescriptionHistory(prescriptionHistory)
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

  const [showMedicationForm, setShowMedicationForm] = useState(
    Boolean(medications[0]?.form?.trim()),
  )

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  // Subtype the patient explicitly chose to keep as a repeat (clears the steer).
  const [steerDismissedSubtype, setSteerDismissedSubtype] = useState<string | null>(null)
  const [blockedReasons, setBlockedReasons] = useState<string[]>([])
  const [recentMeds, setRecentMeds] = useState<RecentMedication[]>([])
  const controlledBlock = deriveRepeatMedicationTerminalBlock(answers)
  const controlledBlockKind = controlledBlock?.kind

  const getBlockedFocusTarget = useCallback(() => {
    if (Object.keys(errors)[0] !== "currentDose") return null
    return directionsSectionRef.current?.querySelector<HTMLElement>("#current-dose") ?? null
  }, [errors])

  const captureMedicationBlock = useCallback(({
    blockType,
    blockers,
    resolution,
  }: {
    blockType: IntakeBlockType
    blockers: string[]
    resolution?: IntakeBlockResolution
  }) => {
    captureIntakeEvent(
      posthog,
      INTAKE_ANALYTICS_EVENTS.validationBlocked,
      buildIntakeValidationBlockedProperties({
        flowInstanceId,
        serviceType,
        stepId: "medication",
        blockType,
        blockers,
        resolution,
      }),
    )
  }, [flowInstanceId, posthog, serviceType])

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
              // The unchanged-regimen attestation and the routing-context
              // selection both belong to the exact medicine they were made
              // for — a different medicine starts clean.
              doseChanged: undefined,
              dose_changed: undefined,
              routing_context: undefined,
              routingContext: undefined,
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
      delete next[`strength-${index}`]
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
    if (med.form) setShowMedicationForm(true)
  }

  // Steer medicines that have a dedicated service out of the generic
  // repeat/prescription flow. Intent-aware and tiered: ED and hair loss are
  // hard-routed (the dedicated flow owns screening this one never asks for),
  // the contraceptive pill keeps its escape because continuing the same pill
  // is deliberately a cheap repeat, and a medicine whose stated indication
  // shows it is not the dedicated condition never steers at all. Server-side
  // backstops: the `dedicated_service_medication` flag
  // (lib/clinical/derive-intake-flags.ts) and the checkout block in
  // lib/validation/repeat-script-schema.ts.
  const steerEnabled = serviceType === "repeat-script" || serviceType === "prescription"
  // The structured "what do I take this for" answer — the only exemption
  // input. See the intent-binding note in medication-service-routing.ts.
  const routingContext = answers.routing_context ?? answers.routingContext
  const serviceSteer = useMemo<DedicatedServiceMatch | null>(() => {
    if (!steerEnabled) return null
    for (const med of medications) {
      // Medicine, indication, and the structured context stay separate inputs:
      // only a medicine can steer; the token can only exempt (to flag_only).
      const medicationText = [med.name, med.strength, med.form].filter(Boolean).join(" ")
      const match = detectDedicatedServiceForMedication(medicationText, indication, routingContext)
      if (match) return match
    }
    return null
  }, [steerEnabled, medications, indication, routingContext])
  // flag_only never steers (the doctor sees the flag instead); only a soft
  // match can be dismissed — hard-routed medicines have no escape.
  const steerActive = serviceSteer !== null
    && serviceSteer.enforcement !== "flag_only"
    && !(serviceSteer.enforcement === "soft" && serviceSteer.subtype === steerDismissedSubtype)

  const likelyDeclinedMedication = useMemo(() => {
    if (!steerEnabled) return null
    for (const med of medications) {
      const match = getLikelyDeclinedRepeatMedication({
        ...med,
        displayName: med.name,
      })
      if (match) return match
    }
    return null
  }, [steerEnabled, medications])
  const declineAdvisoryAcknowledgement = stringAnswer(
    answers.repeat_rx_decline_advisory_acknowledged_for,
  )
  const declineRiskActive = Boolean(
    likelyDeclinedMedication &&
    declineAdvisoryAcknowledgement !== likelyDeclinedMedication.token,
  )

  useEffect(() => {
    if (!controlledBlockKind) return
    captureMedicationBlock({
      blockType: "clinical_hard_block",
      blockers: ["controlled_substance"],
      resolution: "shown",
    })
  }, [captureMedicationBlock, controlledBlockKind])

  useEffect(() => {
    if (!steerActive) return
    captureMedicationBlock({
      blockType: "service_steer",
      blockers: ["dedicated_service_steer"],
      resolution: "shown",
    })
  }, [captureMedicationBlock, steerActive])

  const goToDedicatedService = useCallback((subtype: string) => {
    captureIntakeEvent(
      posthog,
      INTAKE_ANALYTICS_EVENTS.medicationSteerFollowed,
      buildMedicationSteerProperties({ flowInstanceId, serviceType, subtype }),
    )
    captureMedicationBlock({
      blockType: "service_steer",
      blockers: ["dedicated_service_steer"],
      resolution: "redirected",
    })
    const params = new URLSearchParams()
    for (const key of MEDICATION_STEER_ATTRIBUTION_PARAMS) {
      const value = searchParams.get(key)
      if (value) params.set(key, value)
    }
    params.set("service", "consult")
    params.set("subtype", subtype)
    // Lets the destination flow acknowledge the reroute and lets analytics
    // join steer -> started -> paid across the two flow instances.
    params.set("from", "repeat-steer")
    router.push(`/request?${params.toString()}`)
  }, [captureMedicationBlock, flowInstanceId, posthog, router, searchParams, serviceType])

  // Selecting an exempting context keeps the repeat (flagged for the doctor);
  // selecting the routed condition keeps the steer. Token values only.
  const selectRoutingContext = useCallback((value: string) => {
    if (!serviceSteer) return
    setAnswers({ routing_context: value, routingContext: value })
    captureIntakeEvent(
      posthog,
      INTAKE_ANALYTICS_EVENTS.medicationSteerContextSelected,
      buildMedicationSteerProperties({
        flowInstanceId,
        serviceType,
        subtype: serviceSteer.subtype,
        context: value,
      }),
    )
  }, [serviceSteer, setAnswers, posthog, flowInstanceId, serviceType])

  const keepAsRepeat = useCallback((subtype: string) => {
    captureMedicationBlock({
      blockType: "service_steer",
      blockers: ["dedicated_service_steer"],
      resolution: "overridden",
    })
    setSteerDismissedSubtype(subtype)
  }, [captureMedicationBlock])

  // How often each steer fires, and whether patients follow it. Subtype and
  // enforcement tokens only — never the typed medication text.
  const steerSeenRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!steerActive || !serviceSteer) return
    const key = `${serviceSteer.subtype}:${serviceSteer.enforcement}`
    if (steerSeenRef.current.has(key)) return
    steerSeenRef.current.add(key)
    captureIntakeEvent(
      posthog,
      INTAKE_ANALYTICS_EVENTS.medicationSteerShown,
      buildMedicationSteerProperties({
        flowInstanceId,
        serviceType,
        subtype: serviceSteer.subtype,
        enforcement: serviceSteer.enforcement,
      }),
    )
  }, [steerActive, serviceSteer, posthog, flowInstanceId, serviceType])

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
    if (hasCompleteRepeatRxRegimen(nextDose)) {
      setErrors((prev) => {
        if (!prev.currentDose) return prev
        const next = { ...prev }
        delete next.currentDose
        return next
      })
      setBlockedReasons((prev) =>
        prev.filter((reason) => reason !== REPEAT_RX_REGIMEN_REQUIRED_MESSAGE),
      )
    }
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

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}
    const hasAtLeastOne = medications.some((m) => m.name.trim())
    if (!hasAtLeastOne) {
      newErrors.medication = "Enter the name of the medication you need"
    }
    // Belt-and-suspenders: recheck controlled substances in validate.
    for (const [index, med] of medications.entries()) {
      if (med.name && isControlledMedicationName(med.name)) {
        newErrors.medication = "Controlled substances cannot be prescribed online"
        break
      }
      if (med.name.trim() && !getRepeatScriptMedicationConcreteStrength(med)) {
        newErrors[`strength-${index}`] = MEDICATION_STRENGTH_REQUIRED
      }
      // Form remains optional; an omission is preserved only as quiet review
      // context and does not make the request look clinically high risk.
    }

    if (!prescriptionHistory) {
      newErrors.prescriptionHistory = "Please select when you were last prescribed this medication"
    }

    // Note: prescriptionHistory === "never" is intentionally NOT a validation
    // error. The inline card explains the repeat-script boundary and points
    // patients back to the live service hub, without reviving a
    // general-consult fallback.
    const isRepeatActive = Boolean(prescriptionHistory) && !isNeverPrescribed
    if (isRepeatActive && !hasCompleteRepeatRxRegimen(currentDose)) {
      newErrors.currentDose = REPEAT_RX_REGIMEN_REQUIRED_MESSAGE
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
    const blockers = Object.keys(newErrors)
    if (blockers.length > 0) {
      captureMedicationBlock({
        blockType: "validation",
        blockers,
        resolution: "shown",
      })
    }
    return blockers.length === 0
  }, [
    captureMedicationBlock,
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
    // above already explains it; never advance past it.
    if (controlledBlock) return
    if (declineRiskActive) {
      setBlockedReasons((reasons) => [
        ...reasons.filter((reason) => reason !== DECLINE_ADVISORY_REQUIRED),
        DECLINE_ADVISORY_REQUIRED,
      ])
      declineAlertRef.current?.focus()
      return
    }
    // A steer must never make Continue a dead control: tapping it scrolls the
    // reason into view and states it in the blocked summary, rather than
    // silently doing nothing.
    if (steerActive && serviceSteer) {
      setBlockedReasons([
        `This medicine is prescribed through our ${serviceSteer.serviceLabel} service — use the button above to continue there.`,
      ])
      // focus() rather than a smooth scroll: it brings the alert into view
      // without animation (the project motion rule requires honouring
      // prefers-reduced-motion) AND puts the keyboard user on the steer, whose
      // CTA sits before the focused input in DOM order.
      steerAlertRef.current?.focus()
      return
    }
    if (validate()) {
      // Save to recent medications for next-time quick-pick.
      for (const med of medications) {
        if (med.name.trim()) {
          addRecentMedication({ name: med.name, strength: med.strength || undefined, form: med.form || undefined, pbsCode: med.pbsCode || "MANUAL" })
        }
      }
      onNext()
    }
  }, [controlledBlock, declineRiskActive, steerActive, serviceSteer, validate, medications, onNext])

  const activeMedications = useMemo(
    () => medications.filter((m) => m.name.trim()),
    [medications],
  )
  // Readiness: a named medicine with a concrete strength (structured or
  // reliably inferred from text such as "Sertraline 100mg"), when it was last
  // prescribed, and — for a genuine repeat — current directions/frequency,
  // what it treats, the unchanged-regimen attestation, and an explicit
  // side-effect answer. Form remains optional.
  //
  // Built as a list of outstanding answers so the "N to finish" line above
  // Continue and the readiness gate share ONE source — a display list computed
  // separately would eventually drift and lie about completeness. Each entry
  // mirrors one clause of the original readiness predicate exactly.
  const remainingAnswers = useMemo(() => {
    const remaining: string[] = []
    if (activeMedications.length === 0) {
      remaining.push("medicine name")
    } else if (
      !activeMedications.every((medication) =>
        Boolean(getRepeatScriptMedicationConcreteStrength(medication)),
      )
    ) {
      remaining.push("medicine strength")
    }
    if (!prescriptionHistory) remaining.push("when it was last prescribed")
    if (showRepeatDetails) {
      if (!hasCompleteRepeatRxRegimen(currentDose)) remaining.push("your directions")
      if (!indication.trim()) remaining.push("what it's for")
      if (doseChanged === undefined) remaining.push("same-dose confirmation")
      if (hasSideEffects === undefined) remaining.push("side-effects question")
      else if (hasSideEffects && !sideEffects.trim()) remaining.push("side-effect details")
    }
    return remaining
  }, [activeMedications, prescriptionHistory, showRepeatDetails, currentDose, indication, doseChanged, hasSideEffects, sideEffects])
  // doseChanged === true is not a missing answer (the inline error explains the
  // GP-review boundary), but it still blocks readiness — hence the explicit
  // `doseChanged === false` alongside the empty remaining list.
  const isComplete = Boolean(
    !isNeverPrescribed
    && remainingAnswers.length === 0
    && doseChanged === false
  )
  // Live-computed; controlledBlock stays (a real clinical block), the stale
  // `errors` object does not gate readiness.
  const canContinue = isComplete && !controlledBlock && !declineRiskActive && !steerActive

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
        title="Your medication"
        description="One medicine per request. Use the name and strength on the label."
      />

      {answers.renewalPrefilled === true && (
        <p
          data-renewal-prefill-note="true"
          className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground"
        >
          Filled from your selected prescription. Check the medicine and directions are still current.
        </p>
      )}

      <StepBlockedSummary
        reasons={blockedReasons}
        getFocusTarget={getBlockedFocusTarget}
      />

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

      {/* Dedicated-service steer (ED / hair loss / women's health) */}
      {steerActive && serviceSteer && (
        <div ref={steerAlertRef} tabIndex={-1} className="outline-none">
        <Alert>
          <HeartPulse className="w-4 h-4" />
          {/* Not AlertTitle: it renders a hardcoded <h5>, an invalid jump under
              the step's <h2>. The wrapper's role="alert" carries the semantics. */}
          <p className="mb-1 font-medium leading-none tracking-tight">
            {serviceSteer.serviceLabel} has a dedicated service
          </p>
          {/* Body copy stays at the 16px patient-flow minimum and the actions at
              the 48px tap-target minimum — this is the route explanation, not
              incidental helper text (DESIGN.md §Typography, §Patient forms). */}
          <AlertDescription className="text-base">
            <p>
              {serviceSteer.subtype === "womens_health"
                ? "Starting or switching pills goes through our Women's Health service, which asks the right safety questions before prescribing."
                : serviceSteer.subtype === "ed"
                  ? "This medicine is prescribed through our Erectile Dysfunction service, which asks the heart and medication safety questions we need first. If you take it for something else, choose it below and you can continue here."
                  : serviceSteer.subtype === "weight_loss"
                    ? "This medicine is prescribed through our Weight Management service, which checks eligibility and safety first. If you take it for type 2 diabetes, choose that below and you can continue here."
                    : "This medicine is prescribed through our Hair Loss service, which includes the right safety screening."}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button type="button" className="h-12" onClick={() => goToDedicatedService(serviceSteer.subtype)}>
                Continue in {serviceSteer.serviceLabel}
                <ArrowRight className="w-4 h-4" />
              </Button>
              {/* Escape only for soft matches (contraceptive pills — continuing
                  the same pill is deliberately a cheap repeat). ED and hair
                  loss are hard-routed and checkout refuses them too. */}
              {serviceSteer.enforcement === "soft" && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-12"
                  onClick={() => keepAsRepeat(serviceSteer.subtype)}
                >
                  I&apos;m continuing my current pill — keep as repeat
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
        </div>
      )}

      {declineRiskActive && likelyDeclinedMedication && (
        <div ref={declineAlertRef} tabIndex={-1} className="outline-none">
          <Alert variant="warning">
            <Info className="size-4" />
            <p className="mb-1 font-medium leading-none tracking-tight">
              This request is likely to be declined online
            </p>
            <AlertDescription className="text-base">
              <p>
                Some {likelyDeclinedMedication.label} products contain codeine.
                InstantMed doctors commonly decline these through an online repeat
                request and direct patients to their regular GP for a fuller medication review.
              </p>
              <p className="mt-2">
                You can still ask a doctor to review it. {GUARANTEE}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 h-12"
                onClick={() => {
                  setAnswer(
                    "repeat_rx_decline_advisory_acknowledged_for",
                    likelyDeclinedMedication.token,
                  )
                  setBlockedReasons((reasons) =>
                    reasons.filter((reason) => reason !== DECLINE_ADVISORY_REQUIRED),
                  )
                }}
              >
                I understand, continue
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Structured disambiguation for multi-indication medicines. Rendered
          with the steer while unresolved, and kept after an exempting
          selection so the patient can change their answer. This replaces
          free-text exemption inference entirely — see
          lib/clinical/medication-service-routing.ts. */}
      {serviceSteer?.contextOptions && (
        <QuestionCard compact className="space-y-3">
          <QuestionPrompt label="What do you take this medicine for?" required />
          <SegmentedChoiceGroup
            options={serviceSteer.contextOptions.map((value) => ({
              value,
              label: ROUTING_CONTEXT_LABELS[value],
            }))}
            value={typeof routingContext === "string" ? routingContext : undefined}
            onChange={selectRoutingContext}
            ariaLabel="What do you take this medicine for?"
            columns="two"
          />
          {serviceSteer.enforcement === "flag_only" && (
            <p className="text-base text-muted-foreground">
              Kept as a repeat — the reviewing doctor will see this context.
            </p>
          )}
        </QuestionCard>
      )}

      {/* Three labelled regions — Your medicine / How you take it / Quick
          confirmation — so the single long screen scans as three short jobs on
          mobile instead of one undifferentiated wall. Visual grouping only:
          everything stays mounted (#209) and every answer key, handler, and
          clinical backstop is unchanged. */}
      <section aria-labelledby="medication-region-medicine" className="space-y-2.5">
      <h3
        id="medication-region-medicine"
        className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
      >
        Your medicine
      </h3>

      {/* Recent medications suggestion */}
      {recentMeds.length > 0 && !medications.some((m) => m.name.trim()) && (
        <div className="rounded-2xl border border-border/50 bg-white p-3 shadow-md shadow-primary/[0.06] dark:bg-card dark:shadow-none">
          <p className="text-xs text-muted-foreground mb-2">Previously requested:</p>
          <div className="flex flex-wrap gap-1.5">
            {recentMeds.slice(0, 3).map((med) => (
              <button
                key={med.name}
                type="button"
                onClick={() => handleRecentMedClick(med)}
                className="inline-flex min-h-12 items-center rounded-full bg-primary/10 px-3 py-2 text-xs text-primary outline-none transition-colors hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                + {med.name}{med.strength ? ` ${med.strength}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Medication entry — one compact surface. Form is optional and only
          appears when the patient asks for it or a restored medicine has one. */}
      {medications.map((med, index) => {
        const inferredStrength = !med.strength?.trim()
          ? getRepeatScriptMedicationConcreteStrength(med)
          : undefined
        const separateStrengthRequired = !inferredStrength
        const strengthError = errors[`strength-${index}`]

        return (
          <QuestionCard key={index} compact>
            <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] gap-2">
              <FormField
                label="Medication name"
                required
                error={errors.medication}
                helpContent={{
                  title: "Why do we ask this?",
                  content: "The doctor reviews and confirms the exact medicine before prescribing."
                }}
              >
                <Input
                  id={`medication-name-${index}`}
                  ref={index === 0 ? medicationNameRef : undefined}
                  value={med.name}
                  onChange={(event) => handleMedicationNameChange(index, event.target.value)}
                  placeholder="e.g. Sertraline"
                  autoComplete="off"
                  className="h-12 sm:h-11"
                  aria-invalid={Boolean(errors.medication)}
                />
              </FormField>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor={`medication-strength-${index}`}>
                  Strength {separateStrengthRequired ? (
                    <span className="text-destructive" aria-hidden="true">*</span>
                  ) : (
                    <span className="sr-only">captured in name</span>
                  )}
                </label>
                <Input
                  id={`medication-strength-${index}`}
                  value={med.strength || ""}
                  onChange={(event) => handleMedicationFieldChange(index, "strength", event.target.value)}
                  placeholder="10 mg"
                  className="h-12 sm:h-11"
                  aria-required={separateStrengthRequired}
                  aria-invalid={Boolean(strengthError)}
                  aria-describedby={strengthError || inferredStrength
                    ? `medication-strength-help-${index}`
                    : undefined}
                />
              </div>
            </div>

            {(strengthError || inferredStrength) && (
              <p
                id={`medication-strength-help-${index}`}
                className={strengthError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
                role={strengthError ? "alert" : undefined}
              >
                {strengthError || `Using ${inferredStrength} from the medication name.`}
              </p>
            )}

            {showMedicationForm ? (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor={`medication-form-${index}`}>
                  Form <span className="text-muted-foreground/70">(optional)</span>
                </label>
                <Input
                  id={`medication-form-${index}`}
                  value={med.form || ""}
                  onChange={(event) => handleMedicationFieldChange(index, "form", event.target.value)}
                  placeholder="e.g. tablet, inhaler, cream"
                  className="h-12 sm:h-10"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMedicationForm(true)}
                className="inline-flex min-h-12 items-center text-xs font-medium text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Add form (optional)
              </button>
            )}
          </QuestionCard>
        )
      })}
      </section>

      {/* The repeat questions stay on one surface per region. Related answers
          stay together, while free typing is progressively disclosed only for
          uncommon dosing directions or a reported side effect. */}
      <section
        ref={directionsSectionRef}
        aria-labelledby="medication-region-directions"
        className="space-y-2.5"
      >
      <h3
        id="medication-region-directions"
        className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
      >
        How you take it
      </h3>
      <QuestionCard compact>
        <div className="divide-y divide-border/40">
          <div className="space-y-2.5 pb-3">
            <QuestionPrompt label="Last prescribed" required />
            <SegmentedChoiceGroup
              options={PRESCRIPTION_HISTORY_OPTIONS}
              value={selectedPrescriptionHistory}
              onChange={(value) => {
                setAnswer("prescriptionHistory", value)
                setErrors((prev) => {
                  const next = { ...prev }
                  delete next.prescriptionHistory
                  return next
                })
              }}
              ariaLabel="When were you last prescribed this medication?"
              columns="three"
            />
            {touched.prescriptionHistory && errors.prescriptionHistory && (
              <p className="text-xs text-destructive" role="alert" aria-live="polite">
                {errors.prescriptionHistory}
              </p>
            )}
          </div>

          {showRepeatDetails && (
            <>
              <div className="py-3">
                <FormField
                  id="current-dose"
                  label="How do you take it?"
                  hint="Copy the directions from the label. Include how much and how often."
                  required
                  error={touched.currentDose ? errors.currentDose : undefined}
                >
                  <Textarea
                    id="current-dose"
                    value={currentDose}
                    onChange={(event) => updateCurrentDose(event.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, currentDose: true }))}
                    placeholder="e.g. 1 tablet each morning"
                    className="min-h-[72px] resize-none text-base"
                  />
                </FormField>
              </div>

              <div className="py-3">
                <FormField
                  label="What is it for?"
                  required
                  error={touched.indication ? errors.indication : undefined}
                >
                  <Input
                    id="medication-indication"
                    value={indication}
                    onChange={(event) => {
                      const value = event.target.value
                      setAnswer("indication", value)
                      if (value.trim()) {
                        setErrors((prev) => {
                          const next = { ...prev }
                          delete next.indication
                          return next
                        })
                      }
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, indication: true }))}
                    placeholder="e.g. asthma"
                    className="mt-1.5 h-12 sm:h-11"
                  />
                </FormField>
              </div>
            </>
          )}
        </div>
      </QuestionCard>
      </section>

      {/* The two yes/no confirmations sit apart from the free-entry fields so
          the end of the form reads as a short, finishable job. Same rows, same
          answer keys, same attestation semantics as before the split. */}
      {showRepeatDetails && (
      <section aria-labelledby="medication-region-confirm" className="space-y-2.5">
      <h3
        id="medication-region-confirm"
        className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
      >
        Quick confirmation
      </h3>
      <QuestionCard compact>
        <div className="divide-y divide-border/40">
              <CompactChoiceRow
                label="Same dose and directions as last time?"
                required
                detail={touched.doseChanged && errors.doseChanged ? (
                  <p className="text-xs text-destructive" role="alert" aria-live="polite">
                    {errors.doseChanged}
                  </p>
                ) : undefined}
              >
                <BinaryChoice
                  value={doseChanged}
                  onChange={(value) => {
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
                  ariaLabel="Same dose and directions as last time?"
                  ariaInvalid={Boolean(touched.doseChanged && errors.doseChanged)}
                  ariaRequired
                  noLabel="Same"
                  yesLabel="Changed"
                />
              </CompactChoiceRow>

              <CompactChoiceRow
                label="Any side effects?"
                required
                detail={hasSideEffects === true || errors.sideEffects ? (
                  <div className="space-y-1.5">
                    {hasSideEffects === true && (
                      <Textarea
                        id="side-effects-details"
                        value={sideEffects}
                        onValueChange={(value) => {
                          setAnswer("sideEffects", value)
                          if (value.trim()) {
                            setErrors((prev) => {
                              const next = { ...prev }
                              delete next.sideEffects
                              return next
                            })
                          }
                        }}
                        aria-label="Describe side effects"
                        aria-invalid={Boolean(errors.sideEffects)}
                        aria-describedby={errors.sideEffects ? "side-effects-details-error" : undefined}
                        placeholder="Briefly describe what happened"
                        className="min-h-[60px]"
                      />
                    )}
                    {errors.sideEffects && (
                      <p
                        id="side-effects-details-error"
                        className="text-xs text-destructive"
                        role="alert"
                        aria-live="polite"
                      >
                        {errors.sideEffects}
                      </p>
                    )}
                  </div>
                ) : undefined}
              >
                <BinaryChoice
                  value={hasSideEffects}
                  onChange={(value) => {
                    setAnswer("hasSideEffects", value)
                    if (!value) setAnswer("sideEffects", "")
                    setErrors((prev) => {
                      const next = { ...prev }
                      delete next.sideEffects
                      return next
                    })
                  }}
                  ariaLabel="Any side effects?"
                  ariaInvalid={Boolean(errors.sideEffects)}
                  ariaRequired
                  noLabel="No"
                  yesLabel="Yes"
                />
              </CompactChoiceRow>
        </div>
      </QuestionCard>
      </section>
      )}

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
              className="h-12 flex-1 gap-2"
            >
              Change medication
            </Button>
            <Button variant="ghost" asChild className="h-12 flex-1 gap-2">
              <a href="/request">Browse other services</a>
            </Button>
          </div>
        </div>
      )}

      {/* Live "what's left" line: bottom-adjacent feedback for the sticky
          mobile CTA, whose blocked-tap summary otherwise scrolls the patient
          back to the top of a long screen. Derived from the same list that
          gates readiness, so it can never disagree with Continue. Calm helper
          text, not an error — hidden while a block/steer alert owns the screen
          and once everything is answered. */}
      {!canContinue
        && !isNeverPrescribed
        && !controlledBlock
        && !steerActive
        && !declineRiskActive
        && remainingAnswers.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          {remainingAnswers.length === 1
            ? `One thing left: ${remainingAnswers[0]}`
            : `${remainingAnswers.length} to finish: ${remainingAnswers.join(" · ")}`}
        </p>
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
