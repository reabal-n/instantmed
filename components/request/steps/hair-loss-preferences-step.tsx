"use client"

/**
 * Hair Loss Preferences Step - Step 4 of 4 in the hair loss intake flow
 *
 * Treatment preference selection + results timeline education.
 * TGA-compliant: NO Schedule 4 drug names anywhere in this component.
 *
 * Business context:
 * - Finasteride (S4) is the only prescribable medication
 * - Minoxidil (S3) is OTC, no prescription needed
 * - So there is no standalone "topical" card
 * - Options: oral tablet (Rx), combination (Rx + doctor-recommended OTC), doctor decides
 */

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  CalendarDays,
  Layers,
  ShieldCheck,
  Stethoscope,
} from "lucide-react"

import { usePostHog } from "@/components/providers/posthog-provider"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useReducedMotion } from "@/components/ui/motion"
import { Textarea } from "@/components/ui/textarea"
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
      "One tablet a day to slow hair loss and promote regrowth.",
    chips: ["Once daily", "Proven effective", "Easy routine"],
  },
  {
    value: "combination",
    label: "Combination approach",
    icon: Layers,
    description:
      "Oral prescription paired with a doctor-recommended over-the-counter scalp treatment for maximum results.",
    chips: ["Maximum results", "Complete plan"],
  },
  {
    value: "doctor_decides",
    label: "Not sure, let the doctor decide",
    icon: Stethoscope,
    description:
      "Your doctor will recommend the best approach based on your assessment.",
    chips: ["Expert guidance", "Personalised"],
  },
]

const TIMELINE_MILESTONES = [
  {
    period: "Month 0-3",
    title: "Initial adjustment",
    description:
      "Possible temporary shedding as follicles reset. This is normal.",
  },
  {
    period: "Month 3-6",
    title: "Stabilisation",
    description: "Reduced hair loss, early signs of improvement",
  },
  {
    period: "Month 6-12",
    title: "Visible improvement",
    description: "Noticeable thickening and regrowth",
  },
  {
    period: "Month 12+",
    title: "Full results",
    description: "Maximum benefit typically achieved",
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
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          How would you like treatment to fit your life?
        </h2>
        <p className="text-sm text-muted-foreground">
          Your doctor will prescribe the most appropriate medication based on
          your health profile.
        </p>
      </div>

      {/* Treatment preference cards */}
      <motion.div
        className="flex flex-col gap-3"
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
                "w-full text-left p-4 rounded-2xl border cursor-pointer transition-all",
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

      {/* Results timeline */}
      <div className="space-y-3 pt-2">
        <Label className="text-sm font-medium">What to expect</Label>
        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
          <div className="space-y-4">
            {TIMELINE_MILESTONES.map((milestone, i) => (
              <div key={i} className="relative">
                {/* Dot on the line */}
                <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-primary/60 ring-2 ring-background" />
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-foreground">
                    {milestone.period}: {milestone.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {milestone.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional info */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Anything else relevant?
        </Label>
        <Textarea
          value={hairAdditionalInfo}
          onChange={(e) => setAnswer("hairAdditionalInfo", e.target.value)}
          placeholder="Optional: recent changes, stress, medications, etc..."
          className="min-h-[80px] resize-none"
        />
      </div>

      {/* Trust text */}
      <div className="flex items-start gap-2 px-1">
        <ShieldCheck className="w-4 h-4 text-primary/60 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Your responses are reviewed by an Australian-registered doctor. All
          information is kept strictly confidential and encrypted.
        </p>
      </div>

      {/* Continue button */}
      <Button
        onClick={handleNext}
        disabled={!isComplete}
        className="w-full h-12 text-base font-medium"
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
