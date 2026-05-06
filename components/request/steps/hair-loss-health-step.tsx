"use client"

/**
 * Hair Loss Health Step - Step 3 of 4 in the hair loss intake flow
 *
 * Safety screening with a reproductive hard block (full service decline)
 * and medical history collection in accordion sections.
 *
 * Sections:
 * 1. Reproductive safety (hard block if partner is pregnant/trying to conceive)
 * 2. Scalp conditions (informational toggles)
 * 3. Blood pressure & heart (informational - topical treatment safety)
 * 4. Medications, allergies & conditions (shared answer keys with common tail)
 */

import {
  Activity,
  ArrowRight,
  Baby,
  CheckCircle2,
  HeartPulse,
  Home,
  Pill,
  XCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { usePostHog } from "@/components/providers/posthog-provider"
import { BinaryChoice, IntakeStepIntro, QuestionCard, StringBinaryChoice } from "@/components/request/shared/intake-step-primitives"
import { MedicalHistoryToggles } from "@/components/request/shared/medical-history-toggles"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { cn } from "@/lib/utils"

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
  { key: "scalpNone", label: "No scalp conditions" },
] as const

const REPRODUCTIVE_OPTIONS = [
  {
    value: "no",
    label: "No",
  },
  {
    value: "na",
    label: "Not applicable",
  },
  {
    value: "yes",
    label: "Yes, my partner is pregnant or trying to conceive",
  },
] as const

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

/** Section completion indicator shown in accordion triggers */
function SectionComplete({ complete }: { complete: boolean }) {
  if (!complete) return null
  return <CheckCircle2 className="w-4 h-4 text-success shrink-0 mr-2" />
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function HairLossHealthStep({
  onNext,
  onBack,
}: HairLossHealthStepProps) {
  const router = useRouter()
  const posthog = usePostHog()
  const { answers, setAnswer } = useRequestStore()

  // Track previously open sections so analytics only fires on NEW opens
  const prevOpenSections = useRef<Set<string>>(new Set(["reproductive"]))

  // Controlled accordion state for auto-expand
  const [topAccordionValue, setTopAccordionValue] = useState<string[]>([
    "reproductive",
  ])
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

  const handleNext = useCallback(() => {
    if (canContinue) {
      posthog?.capture("step_completed", { step: "hair-loss-health" })
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
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header */}
      <IntakeStepIntro
        eyebrow={
          !reproductiveComplete
            ? "Safety 1 of 4"
            : !scalpComplete
              ? "Safety 2 of 4"
              : !bpComplete
                ? "Safety 3 of 4"
                : "Safety 4 of 4"
        }
        title={
          !reproductiveComplete
            ? "A quick safety check"
            : !scalpComplete
              ? "Scalp health"
              : !bpComplete
                ? "Blood pressure & heart"
                : "Medical basics"
        }
        description={
          !reproductiveComplete
            ? "Start with the pregnancy safety question."
            : "Answer only what applies."
        }
      />

      {/* ── Top accordion: Reproductive safety ──────────────────────── */}
      {!reproductiveComplete && (
        <Accordion
          type="multiple"
          value={topAccordionValue}
          className="space-y-3"
          onValueChange={(openSections: string[]) => {
            setTopAccordionValue(openSections)
            const newlyOpened = openSections.filter(
              (s) => !prevOpenSections.current.has(s)
            )
            if (newlyOpened.length > 0) {
              posthog?.capture("hair_loss_health_sections_viewed", {
                opened_sections: newlyOpened,
                total_open: openSections.length,
              })
            }
            prevOpenSections.current = new Set(openSections)
          }}
        >
          <AccordionItem
            value="reproductive"
            className="border rounded-xl overflow-hidden"
          >
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2 flex-1">
                <Baby className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Reproductive safety</span>
              </div>
              <SectionComplete complete={reproductiveComplete} />
            </AccordionTrigger>
            <AccordionContent className="px-4 space-y-3">
              <div className="space-y-2.5">
                <p className="text-sm font-medium">
                  Is your partner currently pregnant or trying to conceive?{" "}
                  <span className="text-destructive">*</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Some hair loss medicines are not suitable around pregnancy.
                </p>
                <div
                  className="flex flex-col gap-2"
                  role="radiogroup"
                  aria-label="Partner pregnancy or conception status"
                >
                  {REPRODUCTIVE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      onClick={() =>
                        setAnswer("hairReproductive", option.value)
                      }
                      aria-checked={hairReproductive === option.value}
                      className={cn(
                        "w-full px-4 py-3 text-sm rounded-xl border-2 transition-colors text-left",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none",
                        hairReproductive === option.value
                          ? option.value === "yes"
                            ? "border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 font-medium"
                            : "border-sky-300/60 bg-sky-50 dark:border-sky-600/40 dark:bg-sky-500/10 text-sky-800 dark:text-sky-200 font-medium"
                          : "border-border/50 bg-white dark:bg-card text-foreground"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {reproductiveComplete && !isBlocked && !scalpComplete && (
        <QuestionCard compact>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm font-medium">Any scalp conditions?</p>
            <SectionComplete complete={scalpComplete} />
          </div>
          <MedicalHistoryToggles
            items={SCALP_CONDITIONS}
            values={answers}
            onChange={handleScalpChange}
          />
        </QuestionCard>
      )}

      {reproductiveComplete && scalpComplete && !bpComplete && (
        <QuestionCard compact>
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-blue-500 shrink-0" />
            <p className="text-sm font-medium">Blood pressure &amp; heart</p>
            <SectionComplete complete={bpComplete} />
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Low blood pressure or dizziness on standing?</p>
              <BinaryChoice
                value={hairLowBP}
                onChange={(checked) => setAnswer("hairLowBP", checked)}
                ariaLabel="Low blood pressure or dizziness on standing?"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Any heart conditions or heart medication?</p>
              <BinaryChoice
                value={hairHeartConditions}
                onChange={(checked) => setAnswer("hairHeartConditions", checked)}
                ariaLabel="Any heart conditions or heart medication?"
              />
            </div>
          </div>
        </QuestionCard>
      )}

      {reproductiveComplete && scalpComplete && bpComplete && !medicalComplete && (
        <QuestionCard className="space-y-5">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-indigo-500 shrink-0" />
            <p className="text-sm font-medium">Medications, allergies &amp; conditions</p>
            <SectionComplete complete={medicalComplete} />
          </div>
            {/* Medications */}
            <div className="space-y-2.5">
              <div>
                <p className="text-sm font-medium">
                  Taking any medications?{" "}
                  <span className="text-destructive">*</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Prescriptions, over-the-counter, vitamins, supplements
                </p>
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
                  onChange={(e) =>
                    setAnswer("current_medications", e.target.value)
                  }
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
                  Any allergies?{" "}
                  <span className="text-destructive">*</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Drug, food, or environmental allergies
                </p>
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
                  onChange={(e) =>
                    setAnswer("known_allergies", e.target.value)
                  }
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
                  Any other medical conditions?{" "}
                  <span className="text-destructive">*</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Chronic illness, past surgeries, ongoing issues
                </p>
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
                  onChange={(e) =>
                    setAnswer("existing_conditions", e.target.value)
                  }
                  placeholder="e.g., Asthma, Type 2 Diabetes, High blood pressure"
                  className="min-h-[60px] text-sm"
                />
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
