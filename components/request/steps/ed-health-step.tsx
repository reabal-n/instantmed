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

import { BinaryChoice, IntakeStepIntro, QuestionCard, StringBinaryChoice } from "@/components/request/shared/intake-step-primitives"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { useStepValidationSummary } from "@/lib/hooks/use-step-validation-summary"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { cn } from "@/lib/utils"

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

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

/** Section completion indicator shown in section headers */
function SectionComplete({ complete }: { complete: boolean }) {
  if (!complete) return null
  return (
    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mr-2" />
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
  const softBlockActive = clearanceBlockActive || edAlphaBlockers === true
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

      {/* ── Section 1: Heart & blood pressure ───────────────────────── */}
      <QuestionCard className="space-y-3">
        <div className="flex items-center gap-2">
          <HeartPulse className="w-4 h-4 text-rose-500 shrink-0" />
          <p className="text-sm font-medium">Heart &amp; blood pressure</p>
          <SectionComplete complete={heartComplete} />
        </div>

        {/* Nitrate toggle */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Do you take nitrates?</p>
          <p className="text-xs text-muted-foreground">e.g., GTN spray, Anginine, Imdur, or medication for chest pain</p>
          <BinaryChoice
            value={edNitrates}
            onChange={handleNitrateChange}
            ariaLabel="Do you take nitrates?"
          />
        </div>

        {/* Alpha-blocker toggle */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Do you take alpha-blockers?</p>
          <p className="text-xs text-muted-foreground">e.g., tamsulosin, prazosin, or doxazosin</p>
          <BinaryChoice
            value={edAlphaBlockers}
            onChange={(checked) => setAnswer("edAlphaBlockers", checked)}
            ariaLabel="Do you take alpha-blockers?"
          />
        </div>

        {/* Recent cardiac event */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Heart attack, stroke, or unstable angina in the last 6 months?</p>
          <BinaryChoice
            value={edRecentHeartEvent}
            onChange={(checked) => setAnswer("edRecentHeartEvent", checked)}
            ariaLabel="Heart attack, stroke, or unstable angina in the last 6 months?"
          />
        </div>

        {/* Severe heart condition */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Severe heart disease, very low blood pressure, or HOCM?</p>
          <BinaryChoice
            value={edSevereHeart}
            onChange={(checked) => setAnswer("edSevereHeart", checked)}
            ariaLabel="Severe heart disease, very low blood pressure, or HOCM?"
          />
        </div>

        {/* Warning when soft block is active */}
        {softBlockActive && (
          <Alert variant="default" className="border-warning/30 bg-warning/5">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <AlertDescription className="text-sm">
              {edAlphaBlockers
                ? "Alpha-blockers can interact with ED prescription options, causing a drop in blood pressure. The doctor will check dose timing and safety before prescribing."
                : "This condition requires clearance from your GP before we can prescribe."}
            </AlertDescription>
          </Alert>
        )}

        {/* GP clearance checkbox - shown only when soft block active */}
        {clearanceBlockActive && (
          <div className="p-3 rounded-xl border bg-muted/30">
            <Checkbox
              id="ed-gp-cleared"
              checked={edGpCleared === true}
              onCheckedChange={(checked) => setAnswer("edGpCleared", checked)}
            >
              My GP has cleared me for ED treatment
            </Checkbox>
          </div>
        )}
      </QuestionCard>

      {/* ── Section 2: Medications, allergies & conditions ──────────── */}
      <QuestionCard className="space-y-5">
        <div className="flex items-center gap-2">
          <Pill className="w-4 h-4 text-indigo-500 shrink-0" />
          <p className="text-sm font-medium">Medications, allergies &amp; conditions</p>
          <SectionComplete complete={coreHistoryComplete} />
        </div>

        {/* Medications */}
        <div className="space-y-2.5">
          <div>
            <p className="text-sm font-medium">
              Taking any medications? <span className="text-destructive">*</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Prescriptions, over-the-counter, vitamins, supplements</p>
          </div>
          <StringBinaryChoice
            value={takesMedications}
            noValue="no"
            yesValue="yes"
            onChange={(value) => setAnswer("takes_medications", value)}
            ariaLabel="Taking any medications?"
            noLabel="No medications"
          />
          {takesMedications === "yes" && (
            <Textarea
              value={currentMedications}
              onChange={(e) => setAnswer("current_medications", e.target.value)}
              placeholder="e.g., Metformin 500mg twice daily, Vitamin D 1000IU"
              className="min-h-[60px] text-sm"
            />
          )}
        </div>

        <div className="border-t border-border/40" />

        {/* Allergies */}
        <div className="space-y-2.5">
          <div>
            <p className="text-sm font-medium">
              Any allergies? <span className="text-destructive">*</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Drug, food, or environmental allergies</p>
          </div>
          <StringBinaryChoice
            value={hasAllergies}
            noValue="no"
            yesValue="yes"
            onChange={(value) => setAnswer("has_allergies", value)}
            ariaLabel="Any allergies?"
            noLabel="No allergies"
          />
          {hasAllergies === "yes" && (
            <Textarea
              value={knownAllergies}
              onChange={(e) => setAnswer("known_allergies", e.target.value)}
              placeholder="e.g., Penicillin - rash, Peanuts - anaphylaxis"
              className="min-h-[60px] text-sm"
            />
          )}
        </div>

        <div className="border-t border-border/40" />

        {/* Other conditions */}
        <div className="space-y-2.5">
          <div>
            <p className="text-sm font-medium">
              Any other medical conditions? <span className="text-destructive">*</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Including blood pressure, diabetes, chronic illness, or surgeries</p>
          </div>
          <StringBinaryChoice
            value={hasConditions}
            noValue="no"
            yesValue="yes"
            onChange={(value) => setAnswer("has_conditions", value)}
            ariaLabel="Any other medical conditions?"
            noLabel="No conditions"
          />
          {hasConditions === "yes" && (
            <Textarea
              value={existingConditions}
              onChange={(e) => setAnswer("existing_conditions", e.target.value)}
              placeholder="e.g., Asthma, diabetes, high blood pressure"
              className="min-h-[60px] text-sm"
            />
          )}
        </div>
      </QuestionCard>

      {/* ── Section 3: Previous ED treatment ────────────────────────── */}
      <QuestionCard compact>
        <div className="flex items-center gap-2">
          <Pill className="w-4 h-4 text-indigo-500 shrink-0" />
          <p className="text-sm font-medium">Previous ED treatment</p>
          <SectionComplete complete={previousTreatmentComplete} />
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Have you tried ED treatment before?</p>
            <BinaryChoice
              value={previousEdMeds}
              onChange={(checked) => setAnswer("previousEdMeds", checked)}
              ariaLabel="Have you tried ED treatment before?"
            />
          </div>
          {previousEdMeds === true && (
            <>
              <Textarea
                id="ed-previous-treatment"
                value={edPreviousTreatment}
                onChange={(e) => setAnswer("edPreviousTreatment", e.target.value)}
                placeholder="What did you try? e.g., a daily tablet, an as-needed medication"
                className="min-h-[80px] text-sm"
              />

              {/* Effectiveness selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">How effective was it?</Label>
                <div className="flex gap-2">
                  {(
                    [
                      { value: "worked_well", label: "Worked well" },
                      { value: "somewhat", label: "Somewhat" },
                      { value: "didnt_work", label: "Didn’t work" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAnswer("edPreviousEffectiveness", option.value)}
                      className={cn(
                        "flex-1 px-3 py-2 text-sm rounded-lg border transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none",
                        edPreviousEffectiveness === option.value
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
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
