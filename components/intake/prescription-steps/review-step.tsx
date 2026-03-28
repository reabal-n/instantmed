"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Button } from "@/components/ui/button"
import { ButtonSpinner } from "@/components/ui/skeleton"
import { ChevronLeft, Pill, FileText, Shield, Clock, Check, Sparkles } from "lucide-react"
import { CONDITIONS, DURATIONS } from "@/components/intake/prescription-steps/details-step"
import { IntakeReviewSocialProof } from "@/components/intake/intake-review-social-proof"
import type { PrescriptionFormData } from "@/components/intake/prescription-intake"

// Animation variants
const fadeSlide = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

interface ReviewStepProps {
  formData: PrescriptionFormData
  isSubmitting: boolean
  submitError?: string
  onSubmit: () => void
  onBack: () => void
}

export function PrescriptionReviewStep({
  formData,
  isSubmitting,
  submitError,
  onSubmit,
  onBack,
}: ReviewStepProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      key="review"
      variants={prefersReducedMotion ? undefined : fadeSlide}
      initial={prefersReducedMotion ? {} : "initial"}
      animate="animate"
      exit={prefersReducedMotion ? undefined : "exit"}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Review your request
        </h1>
        <p className="text-muted-foreground">
          Please confirm the details below
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-2xl border-2 border-border overflow-hidden">
        <div className="p-4 bg-muted/30 border-b">
          <div className="flex items-center gap-3">
            <Pill className="w-5 h-5 text-primary" />
            <span className="font-semibold">
              {formData.rxType === "repeat" ? "Repeat" : "New"} Prescription
            </span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Medication</span>
            <span className="font-medium">{formData.medication}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Condition</span>
            <span className="font-medium">
              {formData.condition === "other"
                ? formData.otherCondition
                : CONDITIONS.find((c) => c.value === formData.condition)?.label}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium">
              {DURATIONS.find((d) => d.value === formData.duration)?.label}
            </span>
          </div>
          {formData.additionalNotes && (
            <div className="pt-2 border-t">
              <span className="text-sm text-muted-foreground">Notes</span>
              <p className="text-sm mt-1">{formData.additionalNotes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div>
          <p className="font-semibold">Total</p>
          <p className="text-xs text-muted-foreground">Reviewed by Australian doctor</p>
        </div>
        <p className="text-2xl font-semibold text-primary">$29.95</p>
      </div>

      {submitError && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {submitError}
        </div>
      )}

      {/* Social proof */}
      <IntakeReviewSocialProof service="prescription" />

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="h-12 rounded-xl px-6">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex-1 h-12 rounded-xl text-base font-medium bg-primary hover:bg-primary/90"
        >
          {isSubmitting ? (
            <>
              <ButtonSpinner className="w-5 h-5 mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Submit for review
            </>
          )}
        </Button>
      </div>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
        <span className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5" />
          Secure payment
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          1–2 hour review
        </span>
        <span className="flex items-center gap-1">
          <Check className="w-3.5 h-3.5" />
          PBS eligible
        </span>
      </div>
    </motion.div>
  )
}
