"use client"

/**
 * Hair Loss Preferences Step - Step 4 of 4 in the hair loss intake flow
 *
 * Treatment preference selection + results timeline education.
 * TGA-compliant: NO Schedule 4 drug names anywhere in this component.
 *
 * Options: oral tablet, combination plan, or doctor decides.
 */

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  CalendarDays,
  Layers,
  Stethoscope,
} from "lucide-react"

import { IntakeStepIntro, QuestionCard } from "@/components/request/shared/intake-step-primitives"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useReducedMotion } from "@/components/ui/motion"
import { Textarea } from "@/components/ui/textarea"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { stagger } from "@/lib/motion"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { cn } from "@/lib/utils"

import { useRequestStore } from "../store"

interface HairLossPreferencesStepProps {
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
    value: "oral",
    label: "Daily oral tablet",
    icon: CalendarDays,
    description:
      "A doctor-assessed prescription option taken as a daily routine.",
    chips: ["Once daily", "Routine"],
  },
  {
    value: "combination",
    label: "Combination approach",
    icon: Layers,
    description:
      "A prescription option plus an over-the-counter scalp treatment if the doctor recommends it.",
    chips: ["Broader plan", "Doctor-guided"],
  },
  {
    value: "doctor_decides",
    label: "Let the doctor decide",
    icon: Stethoscope,
    description:
      "Your doctor will recommend the best approach based on your assessment.",
    chips: ["Expert guidance", "Personalised"],
  },
]

export default function HairLossPreferencesStep({
  onNext,
}: HairLossPreferencesStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const posthog = usePostHog()
  const prefersReducedMotion = useReducedMotion()

  const hairMedicationPreference =
    (answers.hairMedicationPreference as string) || ""
  const hairAdditionalInfo =
    (answers.hairAdditionalInfo as string) || ""

  const isComplete = !!hairMedicationPreference

  const handleNext = () => {
    if (isComplete) {
      posthog?.capture("step_completed", {
        step: "hair-loss-preferences",
        preference: hairMedicationPreference,
      })
      onNext()
    }
  }

  useKeyboardNavigation({
    onNext: handleNext,
    enabled: isComplete,
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <IntakeStepIntro
        title="How should treatment fit your routine?"
        description="Choose a preference. The doctor will decide what is clinically appropriate."
      />

      {/* Treatment preference cards */}
      <motion.div
        className="flex flex-col gap-2.5"
        variants={prefersReducedMotion ? undefined : stagger.container}
        initial="initial"
        animate="animate"
        role="radiogroup"
        aria-label="Treatment preference"
      >
        {PREFERENCE_OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = hairMedicationPreference === option.value
          return (
            <motion.button
              key={option.value}
              type="button"
              role="radio"
              variants={prefersReducedMotion ? undefined : stagger.item}
              onClick={() =>
                setAnswer("hairMedicationPreference", option.value)
              }
              aria-checked={isSelected}
              aria-label={`${option.label}: ${option.description}`}
              className={cn(
                "w-full text-left p-2.5 rounded-2xl border cursor-pointer transition-[background-color,border-color]",
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
                    "flex items-center justify-center w-9 h-9 rounded-lg shrink-0",
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
                  <p className="hidden text-xs text-muted-foreground leading-relaxed sm:block">
                    {option.description}
                  </p>

                  {/* Benefit chips */}
                  <div className="hidden flex-wrap gap-1.5 pt-1 sm:flex">
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

      <QuestionCard compact>
        <Label className="text-sm font-medium">Doctor-reviewed plan</Label>
        <p className="text-xs leading-relaxed text-muted-foreground">
          If treatment is prescribed, your doctor will explain timing and safety details.
        </p>
      </QuestionCard>

      {/* Additional info */}
      <QuestionCard compact className="hidden sm:block">
        <Label className="text-sm font-medium">
          Anything else relevant?
        </Label>
        <Textarea
          value={hairAdditionalInfo}
          onChange={(e) => setAnswer("hairAdditionalInfo", e.target.value)}
          placeholder="Optional: recent changes, stress, medications, etc."
          className="min-h-[72px] resize-none"
        />
      </QuestionCard>

      {/* Continue button */}
      <Button
        data-intake-primary-action="true"
        data-intake-primary-label="Continue"
        onClick={handleNext}
        disabled={!isComplete}
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
