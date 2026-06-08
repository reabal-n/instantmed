"use client"

/**
 * ED Preferences Step - Step 4 of 4 in the ED intake flow
 *
 * Lifestyle-framed treatment preference selection (daily vs as-needed vs doctor decides).
 * TGA-compliant: NO drug names anywhere in this component.
 * Uses Tier 2 elevated cards with ring selection (Tier 3).
 */

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { ArrowRight,CalendarDays, Clock, ShieldCheck, Stethoscope } from "lucide-react"
import { useCallback } from "react"

import { IntakeStepIntro, QuestionCard } from "@/components/request/shared/intake-step-primitives"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/components/ui/motion"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { useStepValidationSummary } from "@/lib/hooks/use-step-validation-summary"
import { stagger } from "@/lib/motion"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { cn } from "@/lib/utils"

import { useRequestStore } from "../store"

interface EdPreferencesStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

interface PreferenceOption {
  value: string
  label: string
  icon: LucideIcon
  description: string
  chips: string[]
}

const PREFERENCE_OPTIONS: PreferenceOption[] = [
  {
    value: "daily",
    label: "Daily routine",
    icon: CalendarDays,
    description:
      "A daily option with less timing around activity.",
    chips: ["Routine", "Less planning", "Regular activity"],
  },
  {
    value: "prn",
    label: "As-needed",
    icon: Clock,
    description:
      "A planned-use option. The doctor will confirm whether it suits your health profile.",
    chips: ["Flexible", "Occasional use"],
  },
  {
    value: "doctor_decides",
    label: "Let the doctor decide",
    icon: Stethoscope,
    description:
      "Your doctor will recommend the best option based on your assessment.",
    chips: ["Expert guidance", "Personalised"],
  },
]

export default function EdPreferencesStep({ onNext }: EdPreferencesStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const posthog = usePostHog()
  const prefersReducedMotion = useReducedMotion()

  const edPreference = (answers.edPreference as string) || ""

  const isComplete = !!edPreference

  const { validationSummary, showBlockingReasons } = useStepValidationSummary(
    isComplete,
    useCallback(() => ["a treatment preference"], [])
  )

  const handleNext = () => {
    if (!isComplete) {
      showBlockingReasons()
      return
    }
    posthog?.capture('step_completed', { step: 'ed-preferences', preference: edPreference })
    onNext()
  }

  useKeyboardNavigation({
    onNext: isComplete ? handleNext : undefined,
    enabled: isComplete,
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <IntakeStepIntro
        title="How should treatment fit your life?"
        description="Tell the doctor your preference. They will prescribe only if it is clinically appropriate."
      />

      {/* Treatment preference cards */}
      <motion.div
        className="flex flex-col gap-2.5"
        variants={prefersReducedMotion ? undefined : stagger.container}
        initial="initial"
        animate="animate"
      >
        {PREFERENCE_OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = edPreference === option.value
          return (
            <motion.button
              key={option.value}
              type="button"
              variants={prefersReducedMotion ? undefined : stagger.item}
              onClick={() => setAnswer("edPreference", option.value)}
              className={cn(
                "w-full text-left p-3 rounded-2xl border cursor-pointer transition-[background-color,border-color]",
                "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none",
                isSelected
                  ? "border-primary ring-2 ring-primary shadow-lg shadow-primary/[0.1] bg-white dark:bg-card"
                  : "bg-white dark:bg-card border-border/50 shadow-md shadow-primary/[0.06] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/[0.08]"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Icon container */}
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 space-y-1.5">
                  {/* Label */}
                  <span className="text-sm font-medium leading-snug block">
                    {option.label}
                  </span>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {option.description}
                  </p>

                  {/* Benefit chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {option.chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full bg-muted/50 text-xs px-2.5 py-1 text-muted-foreground"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.button>
          )
        })}
      </motion.div>

      {/* Trust text */}
      <QuestionCard compact className="flex flex-row items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Your doctor will review your full health profile and prescribe the
          most clinically appropriate option for you.
        </p>
      </QuestionCard>

      {/* Validation summary — announced to screen readers on first Continue tap */}
      {validationSummary.length > 0 && (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertDescription>
            Select a treatment preference to continue.
          </AlertDescription>
        </Alert>
      )}

      {/* Always clickable — variant signals readiness; handleNext gates progression */}
      <Button
        data-intake-primary-action="true"
        data-intake-primary-label="Continue"
        onClick={handleNext}
        variant={isComplete ? "default" : "secondary"}
        className="w-full h-12 text-base font-medium max-sm:hidden"
      >
        {isComplete ? (
          <>
            Continue to your details
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          "Continue"
        )}
      </Button>
      {isComplete && (
        <p className="text-[11px] text-muted-foreground text-center hidden sm:block">
          Press Enter to continue
        </p>
      )}
    </div>
  )
}
