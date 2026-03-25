"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/uix"
import {
  ChevronLeft,
  Briefcase,
  GraduationCap,
  Heart,
  FileText,
  Shield,
  Clock,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react"
import { PRICING } from "@/lib/constants"
import { fadeSlide } from "../intake-ui-primitives"
import type { IntakeFormData } from "../streamlined-intake"

interface ReviewStepProps {
  formData: IntakeFormData
  errors: Record<string, string>
  isSubmitting: boolean
  onSubmit: () => void
  onBack: () => void
}

export function ReviewStep({
  formData,
  errors,
  isSubmitting,
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
        <h1 className="text-2xl font-bold text-foreground">
          Review your request
        </h1>
        <p className="text-muted-foreground">
          Please confirm the details below
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-2xl border-2 border-border/40 dark:border-white/10 bg-card/70 dark:bg-background/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden">
        <div className="p-4 bg-card/50 dark:bg-background/40 backdrop-blur-lg border-b border-border/40 dark:border-white/10">
          <div className="flex items-center gap-3">
            {formData.certType === "work" && <Briefcase className="w-5 h-5 text-primary" />}
            {formData.certType === "uni" && <GraduationCap className="w-5 h-5 text-primary" />}
            {formData.certType === "carer" && <Heart className="w-5 h-5 text-primary" />}
            <span className="font-semibold">
              Medical Certificate - {formData.certType === "work" ? "Work" : formData.certType === "uni" ? "Education" : "Carer's Leave"}
            </span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium">{formData.duration}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Start date</span>
            <span className="font-medium">
              {new Date(formData.startDate).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          {formData.certType === "carer" && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Caring for</span>
                <span className="font-medium">{formData.carerPatientName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Relationship</span>
                <span className="font-medium">{formData.carerRelationship}</span>
              </div>
            </>
          )}
          <div className="pt-2 border-t">
            <span className="text-sm text-muted-foreground">Symptoms/Reason</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {formData.symptoms.map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-full bg-card/70 dark:bg-background/60 backdrop-blur-xl border border-border/40 dark:border-white/10 text-xs">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div>
          <p className="font-semibold">Total</p>
          <p className="text-xs text-muted-foreground">Reviewed by Australian doctor</p>
        </div>
        <p className="text-2xl font-bold text-primary">
          ${formData.duration === "2 days" ? PRICING.MED_CERT_2DAY.toFixed(2) : PRICING.MED_CERT.toFixed(2)}
        </p>
      </div>

      {errors.submit && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {errors.submit}
        </div>
      )}

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
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
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
          ~15 min review
        </span>
        <span className="flex items-center gap-1">
          <Check className="w-3.5 h-3.5" />
          AHPRA doctors
        </span>
      </div>
    </motion.div>
  )
}
