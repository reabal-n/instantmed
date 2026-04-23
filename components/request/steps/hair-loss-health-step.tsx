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
 * 3. Blood pressure & heart (informational - minoxidil safety)
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
import { MedicalHistoryToggles, SwitchField } from "@/components/request/shared/medical-history-toggles"
import { EnhancedSelectionButton } from "@/components/shared"
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
  const [bottomAccordionValue, setBottomAccordionValue] = useState<string[]>([])

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
  const takesMedications = answers.takes_medications as string | undefined
  const currentMedications = (answers.current_medications as string) || ""
  const hasAllergies = answers.has_allergies as string | undefined
  const knownAllergies = (answers.known_allergies as string) || ""
  const hasConditions = answers.has_conditions as string | undefined
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
    () => hairLowBP !== undefined || hairHeartConditions !== undefined,
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
  // Auto-expand next sections when reproductive completes (not blocked)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (reproductiveComplete && !isBlocked && bottomAccordionValue.length === 0) {
      setBottomAccordionValue(["scalp", "bp", "medical"])
    }
  }, [reproductiveComplete, isBlocked]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Can continue?
  // ---------------------------------------------------------------------------

  const canContinue = useMemo(
    () => reproductiveComplete && !isBlocked,
    [reproductiveComplete, isBlocked]
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
            Hair loss medications like finasteride can cause serious birth
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
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          A quick health check
        </h2>
        <p className="text-sm text-muted-foreground">
          We need to make sure treatment is safe for you. Most people finish
          this in under 2 minutes.
        </p>
      </div>

      {/* ── Top accordion: Reproductive safety ──────────────────────── */}
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
                Some hair loss medications can cause birth defects through skin
                contact with tablets. This applies even if you are not trying to
                conceive yourself.
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

      {/* ── Bottom accordion: Scalp, BP, Medical ───────────────────── */}
      <Accordion
        type="multiple"
        value={bottomAccordionValue}
        onValueChange={setBottomAccordionValue}
        className="space-y-3"
      >
        {/* ─────────────────────────────────────────────────────────── */}
        {/* Scalp conditions                                           */}
        {/* ─────────────────────────────────────────────────────────── */}
        <AccordionItem
          value="scalp"
          className="border rounded-xl overflow-hidden"
        >
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <Activity className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Scalp conditions</span>
            </div>
            <SectionComplete complete={scalpComplete} />
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Let us know about any scalp issues. This helps the doctor choose
              the right treatment approach.
            </p>
            <MedicalHistoryToggles
              items={SCALP_CONDITIONS}
              values={answers}
              onChange={handleScalpChange}
            />
          </AccordionContent>
        </AccordionItem>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* Blood pressure & heart                                     */}
        {/* ─────────────────────────────────────────────────────────── */}
        <AccordionItem
          value="bp"
          className="border rounded-xl overflow-hidden"
        >
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <HeartPulse className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Blood pressure &amp; heart</span>
            </div>
            <SectionComplete complete={bpComplete} />
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Some topical treatments can affect blood pressure. This helps the
              doctor assess minoxidil suitability.
            </p>
            <SwitchField
              id="hair-low-bp"
              label="Do you have low blood pressure or dizziness on standing?"
              checked={hairLowBP === true}
              onChange={(checked) => setAnswer("hairLowBP", checked)}
            />
            <SwitchField
              id="hair-heart-conditions"
              label="Any heart conditions or taking heart medication?"
              checked={hairHeartConditions === true}
              onChange={(checked) =>
                setAnswer("hairHeartConditions", checked)
              }
            />
          </AccordionContent>
        </AccordionItem>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* Medications, allergies & conditions                        */}
        {/* ─────────────────────────────────────────────────────────── */}
        <AccordionItem
          value="medical"
          className="border rounded-xl overflow-hidden"
        >
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <Pill className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Medications, allergies &amp; conditions</span>
            </div>
            <SectionComplete complete={medicalComplete} />
          </AccordionTrigger>
          <AccordionContent className="px-4 space-y-5">
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
              <div className="flex gap-2">
                <EnhancedSelectionButton
                  variant="chip"
                  selected={takesMedications === "no"}
                  onClick={() => setAnswer("takes_medications", "no")}
                  className="flex-1 touch-manipulation"
                >
                  No medications
                </EnhancedSelectionButton>
                <EnhancedSelectionButton
                  variant="chip"
                  selected={takesMedications === "yes"}
                  onClick={() => setAnswer("takes_medications", "yes")}
                  className="flex-1 touch-manipulation"
                >
                  Yes
                </EnhancedSelectionButton>
              </div>
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
              <div className="flex gap-2">
                <EnhancedSelectionButton
                  variant="chip"
                  selected={hasAllergies === "no"}
                  onClick={() => setAnswer("has_allergies", "no")}
                  className="flex-1 touch-manipulation"
                >
                  No allergies
                </EnhancedSelectionButton>
                <EnhancedSelectionButton
                  variant="chip"
                  selected={hasAllergies === "yes"}
                  onClick={() => setAnswer("has_allergies", "yes")}
                  className="flex-1 touch-manipulation"
                >
                  Yes
                </EnhancedSelectionButton>
              </div>
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
              <div className="flex gap-2">
                <EnhancedSelectionButton
                  variant="chip"
                  selected={hasConditions === "no"}
                  onClick={() => setAnswer("has_conditions", "no")}
                  className="flex-1 touch-manipulation"
                >
                  No conditions
                </EnhancedSelectionButton>
                <EnhancedSelectionButton
                  variant="chip"
                  selected={hasConditions === "yes"}
                  onClick={() => setAnswer("has_conditions", "yes")}
                  className="flex-1 touch-manipulation"
                >
                  Yes
                </EnhancedSelectionButton>
              </div>
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Continue button */}
      <Button
        onClick={handleNext}
        className="w-full h-12"
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
