"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Button, Input } from "@/components/uix"
import { Textarea } from "@/components/ui/textarea"
import { ChevronRight, ChevronLeft, Clock } from "lucide-react"
import { DurationChip, SymptomChip, FormField, fadeSlide } from "../intake-ui-primitives"
import type { IntakeFormData } from "../streamlined-intake"

interface DetailsStepProps {
  formData: IntakeFormData
  errors: Record<string, string>
  symptomOptions: string[]
  relationshipOptions: string[]
  onUpdateField: <K extends keyof IntakeFormData>(field: K, value: IntakeFormData[K]) => void
  onToggleSymptom: (symptom: string) => void
  onNext: () => void
  onBack: () => void
}

export function DetailsStep({
  formData,
  errors,
  symptomOptions,
  relationshipOptions,
  onUpdateField,
  onToggleSymptom,
  onNext,
  onBack,
}: DetailsStepProps) {
  const prefersReducedMotion = useReducedMotion()
  const router = useRouter()

  return (
    <motion.div
      key="details"
      variants={prefersReducedMotion ? undefined : fadeSlide}
      initial={prefersReducedMotion ? {} : "initial"}
      animate="animate"
      exit={prefersReducedMotion ? undefined : "exit"}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          Tell us more
        </h1>
        <p className="text-muted-foreground">
          {formData.certType === "carer"
            ? "About the person you&apos;re caring for"
            : "About your condition"}
        </p>
      </div>

      {/* Carer-specific fields */}
      {formData.certType === "carer" && (
        <div className="space-y-4 p-4 rounded-2xl bg-card/70 dark:bg-background/60 backdrop-blur-xl border border-border/40 dark:border-white/10 shadow-[0_4px_16px_rgb(0,0,0,0.04)]">
          <FormField label="Who are you caring for?" required error={errors.carerPatientName}>
            <Input
              placeholder="Patient's full name"
              value={formData.carerPatientName}
              onChange={(e) => onUpdateField("carerPatientName", e.target.value)}
              className="h-12 rounded-full bg-card/70 dark:bg-background/60 backdrop-blur-xl border border-border/40 dark:border-white/10 hover:bg-card/85 dark:hover:bg-background/80 hover:shadow-[0_4px_12px_rgb(59,130,246,0.1)] transition-all duration-200"
            />
          </FormField>
          <FormField label="Your relationship" required error={errors.carerRelationship}>
            <div className="flex flex-wrap gap-2">
              {relationshipOptions.map((rel) => (
                <SymptomChip
                  key={rel}
                  selected={formData.carerRelationship === rel}
                  onClick={() => onUpdateField("carerRelationship", rel)}
                  label={rel}
                />
              ))}
            </div>
          </FormField>
        </div>
      )}

      {/* Duration */}
      <div className="space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          How long do you need?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {["1 day", "2 days"].map((d) => (
            <DurationChip
              key={d}
              selected={formData.duration === d}
              onClick={() => onUpdateField("duration", d)}
              label={d}
            />
          ))}
        </div>
        {/* Discreet link for longer durations - routes to general consultation */}
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams({
              source: 'med_cert',
              reason: 'extended_duration',
              intended_duration: 'more_than_2_days',
            })
            router.push(`/consult?${params.toString()}`)
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
        >
          More than 2 days?
        </button>
        {errors.duration && (
          <p className="text-xs text-destructive">{errors.duration}</p>
        )}
      </div>

      {/* Start date */}
      <FormField label="Start date" hint="When did/will your leave start?">
        <Input
          type="date"
          value={formData.startDate}
          onChange={(e) => onUpdateField("startDate", e.target.value)}
          className="h-12 rounded-full bg-card/70 dark:bg-background/60 backdrop-blur-xl border border-border/40 dark:border-white/10 hover:bg-card/85 dark:hover:bg-background/80 hover:shadow-[0_4px_12px_rgb(59,130,246,0.1)] transition-all duration-200"
        />
      </FormField>

      {/* Symptoms */}
      <div className="space-y-3">
        <label className="text-sm font-medium">
          {formData.certType === "carer" ? "Reason for leave" : "Symptoms"} *
        </label>
        <div className="flex flex-wrap gap-2">
          {symptomOptions.map((symptom) => (
            <SymptomChip
              key={symptom}
              selected={formData.symptoms.includes(symptom)}
              onClick={() => onToggleSymptom(symptom)}
              label={symptom}
            />
          ))}
        </div>
        {errors.symptoms && (
          <p className="text-xs text-destructive">{errors.symptoms}</p>
        )}
      </div>

      {/* Additional notes */}
      <FormField label="Additional notes" hint="Optional - any other details for the doctor">
        <Textarea
          placeholder="E.g., ongoing condition, specific requirements..."
          value={formData.additionalNotes}
          onChange={(e) => onUpdateField("additionalNotes", e.target.value)}
          className="min-h-20 rounded-xl bg-white dark:bg-card border-border/30 dark:border-white/10 focus:border-primary/50 focus:shadow-[0_0_20px_rgb(59,130,246,0.15)] transition-all duration-200 resize-none"
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
