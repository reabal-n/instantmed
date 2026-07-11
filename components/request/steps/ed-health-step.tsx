"use client"

/**
 * ED Health Step - Step 3 of 4 in the ED intake flow
 *
 * Consolidated safety + medical history on ONE screen — no progressive
 * phase reveal. 2026-07-02 (operator rule from #209): answered sections must
 * stay mounted and editable; the previous "Safety 1 of 3" flow unmounted each
 * section once complete, which read as three stacked steps and made earlier
 * answers uneditable. Completion checkmarks in the section headers provide
 * the progress feedback instead.
 *
 * Sections (all always visible):
 * 1. Heart & blood pressure (nitrate hard block, cardiac soft blocks + GP clearance)
 * 2. Current medications, allergies, and conditions
 * 3. Previous ED treatment
 */

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  Pill,
  XCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"

import {
  BinaryChoice,
  CompactChoiceRow,
  IntakeStepIntro,
  QuestionCard,
  SegmentedChoiceGroup,
  StringBinaryChoice,
} from "@/components/request/shared/intake-step-primitives"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { useStepValidationSummary } from "@/lib/hooks/use-step-validation-summary"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

import { useRequestStore } from "../store"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EdHealthStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const ED_EFFECTIVENESS_OPTIONS = [
  { value: "worked_well", label: "Worked well" },
  { value: "somewhat", label: "Somewhat" },
  { value: "didnt_work", label: "Didn’t work" },
] as const

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

/** Section completion indicator shown in section headers */
function SectionComplete({ complete }: { complete: boolean }) {
  if (!complete) return null
  return (
    <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-success" />
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function EdHealthStep({ serviceType, onNext, onBack }: EdHealthStepProps) {
  const router = useRouter()
  const posthog = usePostHog()
  const { answers, setAnswer } = useRequestStore()

  // Hard block state
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState("")

  // ---------------------------------------------------------------------------
  // Read answers from store
  // ---------------------------------------------------------------------------

  // Section 1: Heart & blood pressure
  const edNitrates = answers.edNitrates as boolean | undefined
  const edAlphaBlockers = answers.edAlphaBlockers as boolean | undefined
  const edRecentHeartEvent = answers.edRecentHeartEvent as boolean | undefined
  const edSevereHeart = answers.edSevereHeart as boolean | undefined
  const edGpCleared = answers.edGpCleared as boolean | undefined

  // Section 2: Current medications
  const takesMedications = answers.takes_medications as "yes" | "no" | undefined
  const currentMedications = (answers.current_medications as string) || ""

  // Section 2: Allergies
  const hasAllergies = answers.has_allergies as "yes" | "no" | undefined
  const knownAllergies = (answers.known_allergies as string) || ""

  // Section 2: Other conditions
  const hasConditions = answers.has_conditions as "yes" | "no" | undefined
  const existingConditions = (answers.existing_conditions as string) || ""

  // Section 3: Previous ED treatment
  const previousEdMeds = answers.previousEdMeds as boolean | undefined
  const edPreviousTreatment = (answers.edPreviousTreatment as string) || ""
  const edPreviousEffectiveness = answers.edPreviousEffectiveness as string | undefined

  // ---------------------------------------------------------------------------
  // Nitrate hard block handler
  // ---------------------------------------------------------------------------

  const handleNitrateChange = useCallback((checked: boolean) => {
    setAnswer("edNitrates", checked)
    if (checked) {
      setIsBlocked(true)
      setBlockReason(
        "Some ED prescription options can cause a dangerous drop in blood pressure when combined with nitrates. Please see your GP or cardiologist."
      )
    }
  }, [setAnswer])

  // ---------------------------------------------------------------------------
  // Soft block: GP clearance required
  // ---------------------------------------------------------------------------

  const clearanceBlockActive = edRecentHeartEvent === true || edSevereHeart === true
  const gpClearanceRequired = clearanceBlockActive && edGpCleared !== true

  // ---------------------------------------------------------------------------
  // Section completion checks
  // ---------------------------------------------------------------------------

  const heartComplete = useMemo(() => {
    // Nitrates must be answered
    if (edNitrates === undefined) return false
    // If nitrates are true, section is "answered" (but blocked)
    if (edNitrates === true) return true
    // Alpha-blockers, heart event & severe heart must be answered
    if (edAlphaBlockers === undefined) return false
    if (edRecentHeartEvent === undefined || edSevereHeart === undefined) return false
    // Cardiac-risk answers need GP/cardiology clearance. Alpha blockers are
    // a caution for the doctor, not an intake hard stop.
    if ((edRecentHeartEvent || edSevereHeart) && edGpCleared !== true) return false
    return true
  }, [edNitrates, edAlphaBlockers, edRecentHeartEvent, edSevereHeart, edGpCleared])

  const medicationsComplete = useMemo(() => {
    if (takesMedications === undefined) return false
    if (takesMedications === "yes" && !currentMedications.trim()) return false
    return true
  }, [takesMedications, currentMedications])

  const allergiesComplete = useMemo(() => {
    if (hasAllergies === undefined) return false
    if (hasAllergies === "yes" && !knownAllergies.trim()) return false
    return true
  }, [hasAllergies, knownAllergies])

  const conditionsComplete = useMemo(() => {
    if (hasConditions === undefined) return false
    if (hasConditions === "yes" && !existingConditions.trim()) return false
    return true
  }, [hasConditions, existingConditions])

  const previousTreatmentComplete = useMemo(() => {
    if (previousEdMeds === undefined) return false
    if (previousEdMeds === true) {
      if (!edPreviousTreatment.trim()) return false
      if (!edPreviousEffectiveness) return false
    }
    return true
  }, [previousEdMeds, edPreviousTreatment, edPreviousEffectiveness])

  const coreHistoryComplete = medicationsComplete && allergiesComplete && conditionsComplete

  // ---------------------------------------------------------------------------
  // Can continue?
  // ---------------------------------------------------------------------------

  const canContinue = useMemo(() => {
    // Hard block
    if (edNitrates === true) return false
    // Nitrates never answered
    if (edNitrates === undefined) return false
    // Soft block without GP clearance
    if (gpClearanceRequired) return false
    // All required sections must be complete
    return heartComplete &&
      medicationsComplete &&
      allergiesComplete &&
      conditionsComplete &&
      previousTreatmentComplete
  }, [
    edNitrates,
    gpClearanceRequired,
    heartComplete,
    medicationsComplete,
    allergiesComplete,
    conditionsComplete,
    previousTreatmentComplete,
  ])

  const { validationSummary, showBlockingReasons } = useStepValidationSummary(
    canContinue,
    useCallback(() => {
      const reasons: string[] = []
      if (edNitrates === undefined) {
        reasons.push("whether you take nitrates")
      } else if (gpClearanceRequired) {
        reasons.push("GP clearance confirmation")
      } else {
        if (!heartComplete) reasons.push("the cardiac safety section")
        if (!medicationsComplete) reasons.push("the medications section")
        if (!allergiesComplete) reasons.push("the allergies section")
        if (!conditionsComplete) reasons.push("the other conditions section")
        if (!previousTreatmentComplete) reasons.push("the previous treatment section")
      }
      return reasons
    }, [edNitrates, gpClearanceRequired, heartComplete, medicationsComplete, allergiesComplete, conditionsComplete, previousTreatmentComplete]),
    { posthog, serviceType, subtype: answers.consultSubtype as string | undefined, stepId: "ed-health" },
  )

  const handleNext = useCallback(() => {
    if (!canContinue) {
      showBlockingReasons()
      return
    }
    posthog?.capture('step_completed', { step: 'ed-health' })
    onNext()
  }, [canContinue, showBlockingReasons, posthog, onNext])

  // Keyboard navigation
  useKeyboardNavigation({
    onNext: canContinue ? handleNext : undefined,
    onBack,
    enabled: true,
  })

  const cardiacClearanceDetail = (
    <div className="space-y-2">
      <Alert variant="default" className="border-warning/30 bg-warning/5">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertDescription className="text-sm">
          This condition requires clearance from your GP before we can prescribe.
        </AlertDescription>
      </Alert>
      <div className="rounded-xl border bg-muted/30 p-3">
        <Checkbox
          id="ed-gp-cleared"
          checked={edGpCleared === true}
          onCheckedChange={(checked) => setAnswer("edGpCleared", checked)}
        >
          My GP has cleared me for ED treatment
        </Checkbox>
      </div>
    </div>
  )

  // ---------------------------------------------------------------------------
  // Hard block screen
  // ---------------------------------------------------------------------------

  if (isBlocked) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive" className="border-destructive/50">
          <XCircle className="w-5 h-5" />
          <AlertTitle className="font-semibold">
            This service is not suitable for you
          </AlertTitle>
          <AlertDescription className="mt-2 text-sm">
            {blockReason}
          </AlertDescription>
        </Alert>

        <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
          <h4 className="text-sm font-medium">What you can do</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Book an appointment with your GP or cardiologist</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>They can assess your situation in person and discuss safe options</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>If cleared by your doctor, you may be able to use this service in the future</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="w-full"
          >
            Return home
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setIsBlocked(false)
              setAnswer("edNitrates", false)
            }}
            className="w-full"
          >
            I made a mistake - I do NOT take nitrates
          </Button>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Main render — one screen, all sections mounted
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header */}
      <IntakeStepIntro
        title="A quick safety check"
        description="A few quick questions so the doctor can prescribe safely."
      />

      <QuestionCard compact className="space-y-0">
        <div className="flex items-center gap-2 pb-2">
          <HeartPulse className="h-4 w-4 shrink-0 text-rose-500" />
          <p className="text-sm font-medium">Treatment safety</p>
          <SectionComplete complete={heartComplete} />
        </div>

        <CompactChoiceRow
          label="Do you take nitrates?"
          hint="Including chest-pain sprays or tablets"
        >
          <BinaryChoice
            value={edNitrates}
            onChange={handleNitrateChange}
            ariaLabel="Do you take nitrates?"
            className="gap-1.5"
          />
        </CompactChoiceRow>

        <CompactChoiceRow
          label="Do you take alpha-blockers?"
          hint="Usually prescribed for blood pressure or prostate symptoms"
          detail={edAlphaBlockers === true ? (
            <Alert variant="default" className="border-warning/30 bg-warning/5">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-sm">
                These medicines can interact with ED prescription options. The doctor will check dose timing and safety before prescribing.
              </AlertDescription>
            </Alert>
          ) : undefined}
        >
          <BinaryChoice
            value={edAlphaBlockers}
            onChange={(checked) => setAnswer("edAlphaBlockers", checked)}
            ariaLabel="Do you take alpha-blockers?"
            className="gap-1.5"
          />
        </CompactChoiceRow>

        <CompactChoiceRow
          label="Heart attack, stroke, or unstable angina in the last 6 months?"
          detail={edRecentHeartEvent === true ? cardiacClearanceDetail : undefined}
        >
          <BinaryChoice
            value={edRecentHeartEvent}
            onChange={(checked) => setAnswer("edRecentHeartEvent", checked)}
            ariaLabel="Heart attack, stroke, or unstable angina in the last 6 months?"
            className="gap-1.5"
          />
        </CompactChoiceRow>

        <CompactChoiceRow
          label="Severe heart disease, very low blood pressure, or HOCM?"
          detail={edSevereHeart === true && edRecentHeartEvent !== true ? cardiacClearanceDetail : undefined}
        >
          <BinaryChoice
            value={edSevereHeart}
            onChange={(checked) => setAnswer("edSevereHeart", checked)}
            ariaLabel="Severe heart disease, very low blood pressure, or HOCM?"
            className="gap-1.5"
          />
        </CompactChoiceRow>
      </QuestionCard>

      <QuestionCard compact className="space-y-0">
        <div className="flex items-center gap-2 pb-2">
          <Pill className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm font-medium">Doctor notes</p>
          <SectionComplete complete={coreHistoryComplete && previousTreatmentComplete} />
        </div>

        <CompactChoiceRow
          label="Taking any medications?"
          hint="Prescriptions, over-the-counter medicines, vitamins, or supplements"
          required
          detail={takesMedications === "yes" ? (
            <Textarea
              value={currentMedications}
              onChange={(event) => setAnswer("current_medications", event.target.value)}
              placeholder="List the name, dose, and how often you take each one"
              className="min-h-[60px] text-sm"
            />
          ) : undefined}
        >
          <StringBinaryChoice
            value={takesMedications}
            noValue="no"
            yesValue="yes"
            onChange={(value) => setAnswer("takes_medications", value)}
            ariaLabel="Taking any medications?"
            className="gap-1.5"
          />
        </CompactChoiceRow>

        <CompactChoiceRow
          label="Any allergies?"
          hint="Medicines, food, or environmental allergies"
          required
          detail={hasAllergies === "yes" ? (
            <Textarea
              value={knownAllergies}
              onChange={(event) => setAnswer("known_allergies", event.target.value)}
              placeholder="List the allergy and what happens"
              className="min-h-[60px] text-sm"
            />
          ) : undefined}
        >
          <StringBinaryChoice
            value={hasAllergies}
            noValue="no"
            yesValue="yes"
            onChange={(value) => setAnswer("has_allergies", value)}
            ariaLabel="Any allergies?"
            className="gap-1.5"
          />
        </CompactChoiceRow>

        <CompactChoiceRow
          label="Any other medical conditions?"
          hint="Including blood pressure, diabetes, chronic illness, or surgery"
          required
          detail={hasConditions === "yes" ? (
            <Textarea
              value={existingConditions}
              onChange={(event) => setAnswer("existing_conditions", event.target.value)}
              placeholder="List the condition and any relevant details"
              className="min-h-[60px] text-sm"
            />
          ) : undefined}
        >
          <StringBinaryChoice
            value={hasConditions}
            noValue="no"
            yesValue="yes"
            onChange={(value) => setAnswer("has_conditions", value)}
            ariaLabel="Any other medical conditions?"
            className="gap-1.5"
          />
        </CompactChoiceRow>

        <CompactChoiceRow
          label="Have you tried ED treatment before?"
          detail={previousEdMeds === true ? (
            <div className="space-y-3">
              <Textarea
                id="ed-previous-treatment"
                value={edPreviousTreatment}
                onChange={(event) => setAnswer("edPreviousTreatment", event.target.value)}
                placeholder="What did you try?"
                className="min-h-[60px] text-sm"
              />
              <div className="space-y-2">
                <p className="text-sm font-medium">How effective was it?</p>
                <SegmentedChoiceGroup
                  options={ED_EFFECTIVENESS_OPTIONS}
                  value={edPreviousEffectiveness}
                  onChange={(value) => setAnswer("edPreviousEffectiveness", value)}
                  ariaLabel="Previous treatment effectiveness"
                  columns="three"
                />
              </div>
            </div>
          ) : undefined}
        >
          <BinaryChoice
            value={previousEdMeds}
            onChange={(checked) => setAnswer("previousEdMeds", checked)}
            ariaLabel="Have you tried ED treatment before?"
            className="gap-1.5"
          />
        </CompactChoiceRow>
      </QuestionCard>

      {/* Validation summary — announced to screen readers on first Continue tap */}
      {validationSummary.length > 0 && (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertDescription>
            {validationSummary.length === 1 ? "Complete this to continue: " : "Complete these to continue: "}
            {validationSummary.join(", ")}.
          </AlertDescription>
        </Alert>
      )}

      {/* Always clickable — variant signals readiness; handleNext gates progression */}
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
            Continue to preferences
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
