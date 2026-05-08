"use client"

/**
 * ED Health Step - Step 3 of 4 in the ED intake flow
 *
 * Consolidated safety + medical history with progressive mobile panels.
 * Keeps clinical screening complete without turning the step into a long form.
 *
 * Sections:
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
import { useCallback, useMemo, useRef,useState } from "react"

import { BinaryChoice, IntakeStepIntro, QuestionCard, StringBinaryChoice } from "@/components/request/shared/intake-step-primitives"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
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

/** Section completion indicator shown in accordion triggers */
function SectionComplete({ complete }: { complete: boolean }) {
  if (!complete) return null
  return (
    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mr-2" />
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function EdHealthStep({ onNext, onBack }: EdHealthStepProps) {
  const router = useRouter()
  const posthog = usePostHog()
  const { answers, setAnswer } = useRequestStore()

  // Track previously open sections so analytics only fires on NEW opens
  const prevOpenSections = useRef<Set<string>>(new Set(["heart"]))

  // Controlled accordion state for auto-expand
  const [topAccordionValue, setTopAccordionValue] = useState<string[]>(["heart"])

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

  // Section 3: Current medications
  const takesMedications = answers.takes_medications as "yes" | "no" | undefined
  const currentMedications = (answers.current_medications as string) || ""

  // Section 4: Allergies
  const hasAllergies = answers.has_allergies as "yes" | "no" | undefined
  const knownAllergies = (answers.known_allergies as string) || ""

  // Section 5: Other conditions
  const hasConditions = answers.has_conditions as "yes" | "no" | undefined
  const existingConditions = (answers.existing_conditions as string) || ""

  // Section 6: Previous ED treatment
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

  const softBlockActive = (edRecentHeartEvent === true || edSevereHeart === true || edAlphaBlockers === true)
  const gpClearanceRequired = softBlockActive && edGpCleared !== true

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
    // If soft block is active, GP clearance must be checked
    if ((edRecentHeartEvent || edSevereHeart || edAlphaBlockers) && edGpCleared !== true) return false
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

  const handleNext = useCallback(() => {
    if (canContinue) {
      posthog?.capture('step_completed', { step: 'ed-health' })
      onNext()
    }
  }, [canContinue, posthog, onNext])

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
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header */}
      <IntakeStepIntro
        eyebrow={!heartComplete ? "Safety 1 of 3" : !coreHistoryComplete ? "Safety 2 of 3" : "Safety 3 of 3"}
        title={!heartComplete ? "A quick safety check" : !coreHistoryComplete ? "Medical basics" : "Previous treatment"}
        description={
          !heartComplete
            ? "Start with the heart safety questions."
            : !coreHistoryComplete
              ? "Answer the basics the doctor needs."
              : "One last question before preferences."
        }
      />

      {/* Accordion sections */}
      {!heartComplete && (
        <Accordion
          type="multiple"
          value={topAccordionValue}
          className="space-y-3"
          onValueChange={(openSections: string[]) => {
            setTopAccordionValue(openSections)
            const newlyOpened = openSections.filter((s) => !prevOpenSections.current.has(s))
            if (newlyOpened.length > 0) {
              posthog?.capture("ed_health_sections_viewed", {
                opened_sections: newlyOpened,
                total_open: openSections.length,
              })
            }
            prevOpenSections.current = new Set(openSections)
          }}
        >
        {/* ----------------------------------------------------------------- */}
        {/* Section 1: Heart & blood pressure */}
        {/* ----------------------------------------------------------------- */}
        <AccordionItem value="heart" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <HeartPulse className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Heart &amp; blood pressure</span>
            </div>
            <SectionComplete complete={heartComplete} />
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-3">
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
                    ? "Alpha-blockers can interact with ED prescription options, causing a drop in blood pressure. Your GP should confirm it\u2019s safe to combine them."
                    : "This condition requires clearance from your GP before we can prescribe."}
                </AlertDescription>
              </Alert>
            )}

            {/* GP clearance checkbox - shown only when soft block active */}
            {softBlockActive && (
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
          </AccordionContent>
        </AccordionItem>
        </Accordion>
      )}

      {/* ── Medical history (inline chip cards) ─────────────────────── */}
      {heartComplete && !coreHistoryComplete && (
      <QuestionCard className="space-y-5">
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
      )}

      {/* ── Previous treatment (accordion) ──────────────────────────── */}
      {heartComplete && coreHistoryComplete && (
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
                        { value: "didnt_work", label: "Didn\u2019t work" },
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
      )}

      {/* Continue button */}
      <Button
        data-intake-primary-action="true"
        data-intake-primary-label="Continue"
        onClick={handleNext}
        className="w-full h-12 max-sm:hidden"
        disabled={!canContinue}
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
