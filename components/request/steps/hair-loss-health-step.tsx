"use client"

/**
 * Hair Loss Health Step - Step 3 of 4 in the hair loss intake flow
 *
 * Safety screening with a reproductive hard block (full service decline)
 * and medical history collection on ONE screen — no progressive phase
 * reveal. 2026-07-02 (operator rule from #209): answered sections must stay
 * mounted and editable; the previous "Safety 1 of 4" flow unmounted each
 * section once complete, which read as four stacked steps and made earlier
 * answers uneditable. Completion checkmarks in the section headers provide
 * the progress feedback instead.
 *
 * Sections (all always visible):
 * 1. Reproductive safety (hard block if partner is pregnant/trying to conceive)
 * 2. Scalp conditions (informational toggles)
 * 3. Blood pressure & heart (informational - topical treatment safety)
 * 4. Medications, allergies & conditions (shared answer keys with common tail)
 */

import {
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  Home,
  Pill,
  XCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo } from "react"

import {
  BinaryChoice,
  ChipToggleGroup,
  CompactChoiceRow,
  IntakeStepIntro,
  QuestionCard,
  SegmentedChoiceGroup,
  StringBinaryChoice,
} from "@/components/request/shared/intake-step-primitives"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { useStepValidationSummary } from "@/lib/hooks/use-step-validation-summary"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

import { useRequestStore } from "../store"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HairLossHealthStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCALP_CONDITIONS = [
  { key: "scalpDandruff", label: "Dandruff / seborrheic dermatitis" },
  { key: "scalpPsoriasis", label: "Scalp psoriasis" },
  { key: "scalpItching", label: "Persistent itching or irritation" },
  { key: "scalpFolliculitis", label: "Folliculitis (infected hair follicles)" },
  { key: "scalpNone", label: "None" },
] as const

const REPRODUCTIVE_OPTIONS = [
  {
    value: "no",
    label: "No",
  },
  {
    value: "na",
    label: "N/A",
  },
  {
    value: "yes",
    label: "Yes",
  },
] as const

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

/** Section completion indicator shown in section headers */
function SectionComplete({ complete }: { complete: boolean }) {
  if (!complete) return null
  return <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-success" />
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function HairLossHealthStep({
  serviceType,
  onNext,
  onBack,
}: HairLossHealthStepProps) {
  const router = useRouter()
  const posthog = usePostHog()
  const { answers, setAnswer } = useRequestStore()

  // ---------------------------------------------------------------------------
  // Read answers from store
  // ---------------------------------------------------------------------------

  // Reproductive safety
  const hairReproductive = answers.hairReproductive as string | undefined

  // Scalp conditions (individual values for stable useMemo deps)
  const scalpDandruff = answers.scalpDandruff as boolean | undefined
  const scalpPsoriasis = answers.scalpPsoriasis as boolean | undefined
  const scalpItching = answers.scalpItching as boolean | undefined
  const scalpFolliculitis = answers.scalpFolliculitis as boolean | undefined
  const scalpNone = answers.scalpNone as boolean | undefined

  // Blood pressure & heart
  const hairLowBP = answers.hairLowBP as boolean | undefined
  const hairHeartConditions = answers.hairHeartConditions as boolean | undefined

  // Shared medical history (same keys as common tail medical-history-step)
  const takesMedications = answers.takes_medications as "yes" | "no" | undefined
  const currentMedications = (answers.current_medications as string) || ""
  const hasAllergies = answers.has_allergies as "yes" | "no" | undefined
  const knownAllergies = (answers.known_allergies as string) || ""
  const hasConditions = answers.has_conditions as "yes" | "no" | undefined
  const existingConditions = (answers.existing_conditions as string) || ""

  // ---------------------------------------------------------------------------
  // Hard block: reproductive safety
  // ---------------------------------------------------------------------------

  const isBlocked = hairReproductive === "yes"

  // Fire analytics when block triggers
  useEffect(() => {
    if (isBlocked) {
      posthog?.capture("hair_loss_reproductive_block")
    }
  }, [isBlocked, posthog])

  // ---------------------------------------------------------------------------
  // Section completion checks
  // ---------------------------------------------------------------------------

  const reproductiveComplete = useMemo(
    () =>
      hairReproductive !== undefined &&
      hairReproductive !== "",
    [hairReproductive]
  )

  const scalpComplete = useMemo(
    () =>
      scalpDandruff === true ||
      scalpPsoriasis === true ||
      scalpItching === true ||
      scalpFolliculitis === true ||
      scalpNone === true,
    [scalpDandruff, scalpPsoriasis, scalpItching, scalpFolliculitis, scalpNone]
  )

  const bpComplete = useMemo(
    () => hairLowBP !== undefined && hairHeartConditions !== undefined,
    [hairLowBP, hairHeartConditions]
  )

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

  const medicalComplete = useMemo(
    () => medicationsComplete && allergiesComplete && conditionsComplete,
    [medicationsComplete, allergiesComplete, conditionsComplete]
  )

  // ---------------------------------------------------------------------------
  // Can continue?
  // ---------------------------------------------------------------------------

  const canContinue = useMemo(
    () =>
      reproductiveComplete &&
      scalpComplete &&
      bpComplete &&
      medicalComplete &&
      !isBlocked,
    [reproductiveComplete, scalpComplete, bpComplete, medicalComplete, isBlocked]
  )

  const { validationSummary, showBlockingReasons } = useStepValidationSummary(
    canContinue,
    useCallback(() => {
      const reasons: string[] = []
      if (!reproductiveComplete) reasons.push("the reproductive health section")
      if (!scalpComplete) reasons.push("the scalp conditions section")
      if (!bpComplete) reasons.push("the blood pressure section")
      if (!medicalComplete) reasons.push("the medical history section")
      return reasons
    }, [reproductiveComplete, scalpComplete, bpComplete, medicalComplete]),
    { posthog, serviceType, subtype: answers.consultSubtype as string | undefined, stepId: "hair-loss-health" },
  )

  const handleNext = useCallback(() => {
    if (!canContinue) {
      showBlockingReasons()
      return
    }
    posthog?.capture("step_completed", { step: "hair-loss-health" })
    onNext()
  }, [canContinue, showBlockingReasons, posthog, onNext])

  // Keyboard navigation
  useKeyboardNavigation({
    onNext: canContinue ? handleNext : undefined,
    onBack,
    enabled: true,
  })

  // ---------------------------------------------------------------------------
  // Scalp toggle handler
  // ---------------------------------------------------------------------------

  const handleScalpChange = useCallback(
    (key: string, checked: boolean) => {
      // If "No scalp conditions" is toggled on, turn off all others
      if (key === "scalpNone" && checked) {
        for (const item of SCALP_CONDITIONS) {
          if (item.key !== "scalpNone") {
            setAnswer(item.key, false)
          }
        }
      }
      // If any specific condition is toggled on, turn off "None"
      if (key !== "scalpNone" && checked) {
        setAnswer("scalpNone", false)
      }
      setAnswer(key, checked)
    },
    [setAnswer]
  )

  // ---------------------------------------------------------------------------
  // Hard block screen (full service decline)
  // ---------------------------------------------------------------------------

  if (isBlocked) {
    return (
      <div className="space-y-6">
        <Alert
          variant="destructive"
          className="border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/50"
          role="alert"
        >
          <XCircle className="w-5 h-5" />
          <AlertTitle className="text-base font-semibold">
            We can&apos;t prescribe hair loss medication right now
          </AlertTitle>
          <AlertDescription className="mt-2 text-sm leading-relaxed">
            Some prescription hair loss medicines can cause serious birth
            defects and cannot be prescribed when a partner is pregnant or
            trying to conceive. We&apos;d recommend speaking with your GP about
            alternative options such as topical treatments available from any
            pharmacy. If your circumstances change, you&apos;re welcome to come
            back anytime.
          </AlertDescription>
        </Alert>

        <Button
          onClick={() => router.push("/")}
          variant="outline"
          className="w-full h-12 text-base font-medium"
        >
          <Home className="w-4 h-4" />
          Return to homepage
        </Button>

        <Button
          variant="ghost"
          onClick={() => setAnswer("hairReproductive", "")}
          className="w-full text-sm text-muted-foreground"
        >
          I made a mistake, let me go back
        </Button>
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
        description="Answer only what applies — the doctor reviews everything."
      />

      <QuestionCard compact className="space-y-0">
        <div className="flex items-center gap-2 pb-2">
          <HeartPulse className="h-4 w-4 shrink-0 text-rose-500" />
          <p className="text-sm font-medium">Treatment safety</p>
          <SectionComplete complete={reproductiveComplete && bpComplete} />
        </div>

        <CompactChoiceRow
          label="Is your partner currently pregnant or trying to conceive?"
          hint="Some hair loss medicines are not suitable around pregnancy"
          required
        >
          <SegmentedChoiceGroup
            options={REPRODUCTIVE_OPTIONS}
            value={hairReproductive}
            onChange={(value) => setAnswer("hairReproductive", value)}
            ariaLabel="Partner pregnancy or conception status"
            columns="three"
            className="gap-1.5"
          />
        </CompactChoiceRow>

        <CompactChoiceRow label="Low blood pressure or dizziness on standing?">
          <BinaryChoice
            value={hairLowBP}
            onChange={(checked) => setAnswer("hairLowBP", checked)}
            ariaLabel="Low blood pressure or dizziness on standing?"
            className="gap-1.5"
          />
        </CompactChoiceRow>

        <CompactChoiceRow label="Any heart conditions or heart medication?">
          <BinaryChoice
            value={hairHeartConditions}
            onChange={(checked) => setAnswer("hairHeartConditions", checked)}
            ariaLabel="Any heart conditions or heart medication?"
            className="gap-1.5"
          />
        </CompactChoiceRow>
      </QuestionCard>

      <QuestionCard compact className="space-y-0">
        <div className="flex items-center gap-2 pb-2">
          <Pill className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm font-medium">Doctor notes</p>
          <SectionComplete complete={scalpComplete && medicalComplete} />
        </div>

        <div className="border-b border-border/40 py-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Any scalp conditions?</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Choose all that apply, or choose None.
            </p>
          </div>
          <ChipToggleGroup
            options={SCALP_CONDITIONS}
            values={answers}
            onChange={handleScalpChange}
            ariaLabel="Scalp conditions"
            className="pt-2"
          />
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
          hint="Chronic illness, previous surgery, or an ongoing health issue"
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
