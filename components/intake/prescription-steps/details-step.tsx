"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChevronRight, ChevronLeft, Clock } from "lucide-react"
import { OptionChip, FormField } from "@/components/intake/prescription-shared"

// Animation variants
const fadeSlide = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

// Condition options
const CONDITIONS = [
  { value: "blood_pressure", label: "High blood pressure" },
  { value: "cholesterol", label: "High cholesterol" },
  { value: "diabetes", label: "Diabetes" },
  { value: "thyroid", label: "Thyroid condition" },
  { value: "asthma", label: "Asthma/Respiratory" },
  { value: "mental_health", label: "Mental health" },
  { value: "pain", label: "Pain management" },
  { value: "other", label: "Other" },
]

// Duration options
const DURATIONS = [
  { value: "1_month", label: "1 month" },
  { value: "3_months", label: "3 months" },
  { value: "6_months", label: "6 months" },
]

interface DetailsStepProps {
  condition: string | null
  otherCondition: string
  duration: string | null
  additionalNotes: string
  errors: Record<string, string>
  onConditionChange: (value: string) => void
  onOtherConditionChange: (value: string) => void
  onDurationChange: (value: string) => void
  onNotesChange: (value: string) => void
  onNext: () => void
  onBack: () => void
}

export function DetailsStep({
  condition,
  otherCondition,
  duration,
  additionalNotes,
  errors,
  onConditionChange,
  onOtherConditionChange,
  onDurationChange,
  onNotesChange,
  onNext,
  onBack,
}: DetailsStepProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      key="details"
      variants={prefersReducedMotion ? undefined : fadeSlide}
      initial={prefersReducedMotion ? false : "initial"}
      animate="animate"
      exit={prefersReducedMotion ? undefined : "exit"}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          Tell us more
        </h1>
        <p className="text-muted-foreground">
          Help our doctors understand your needs
        </p>
      </div>

      {/* Condition */}
      <div className="space-y-3">
        <label className="text-sm font-medium">What condition is this for? *</label>
        <div className="grid grid-cols-2 gap-2">
          {CONDITIONS.map((c) => (
            <OptionChip
              key={c.value}
              selected={condition === c.value}
              onClick={() => onConditionChange(c.value)}
              label={c.label}
            />
          ))}
        </div>
        {errors.condition && (
          <p className="text-xs text-destructive">{errors.condition}</p>
        )}
      </div>

      {/* Other condition */}
      {condition === "other" && (
        <FormField label="Please specify" required error={errors.otherCondition}>
          <Input
            placeholder="Describe your condition"
            value={otherCondition}
            onChange={(e) => onOtherConditionChange(e.target.value)}
            className="h-12 rounded-xl"
          />
        </FormField>
      )}

      {/* Duration */}
      <div className="space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          How long have you been taking this? *
        </label>
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <OptionChip
              key={d.value}
              selected={duration === d.value}
              onClick={() => onDurationChange(d.value)}
              label={d.label}
            />
          ))}
        </div>
        {errors.duration && (
          <p className="text-xs text-destructive">{errors.duration}</p>
        )}
      </div>

      {/* Additional notes */}
      <FormField label="Additional notes" hint="Optional - any other details for the doctor">
        <Textarea
          placeholder="E.g., dosage, frequency, any concerns..."
          value={additionalNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="min-h-20 rounded-xl bg-card/60 dark:bg-white/5 backdrop-blur-lg border-border/30 dark:border-white/10 focus:border-primary/50 focus:shadow-[0_0_20px_rgb(59,130,246,0.15)] transition-all duration-200 resize-none"
        />
      </FormField>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="h-12 rounded-xl px-6">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back
        </Button>
        <Button onClick={onNext} className="flex-1 h-12 rounded-xl text-base font-medium">
          Continue
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </motion.div>
  )
}

// Export constants for use in review step
export { CONDITIONS, DURATIONS }
