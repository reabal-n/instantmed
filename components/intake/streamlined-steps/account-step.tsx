"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Button, Input } from "@/components/uix"
import { ChevronRight, ChevronLeft, Shield } from "lucide-react"
import { FormField, fadeSlide } from "../intake-ui-primitives"
import type { IntakeFormData } from "../streamlined-intake"

interface AccountStepProps {
  formData: IntakeFormData
  errors: Record<string, string>
  onUpdateField: <K extends keyof IntakeFormData>(field: K, value: IntakeFormData[K]) => void
  onNext: () => void
  onBack: () => void
  onAuthRequired: () => void
}

export function AccountStep({
  formData,
  errors,
  onUpdateField,
  onNext,
  onBack,
  onAuthRequired,
}: AccountStepProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      key="account"
      variants={prefersReducedMotion ? undefined : fadeSlide}
      initial={prefersReducedMotion ? {} : "initial"}
      animate="animate"
      exit={prefersReducedMotion ? undefined : "exit"}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          Your details
        </h1>
        <p className="text-muted-foreground">
          Sign in or enter your details to continue
        </p>
      </div>

      {/* Google OAuth Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 rounded-xl text-base font-medium border-2 hover:bg-muted/50"
        onClick={onAuthRequired}
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </Button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue as guest</span>
        </div>
      </div>

      <div className="space-y-4">
        <FormField label="Full name" required error={errors.fullName}>
          <Input
            placeholder="As shown on Medicare card"
            value={formData.fullName}
            onChange={(e) => onUpdateField("fullName", e.target.value)}
            className="h-12 rounded-full bg-white dark:bg-card border border-border/50 hover:bg-muted/50 hover:shadow-[0_4px_12px_rgb(59,130,246,0.1)] transition-all duration-200"
          />
        </FormField>

        <FormField label="Email" required error={errors.email}>
          <Input
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => onUpdateField("email", e.target.value)}
            className="h-12 rounded-full bg-white dark:bg-card border border-border/50 hover:bg-muted/50 hover:shadow-[0_4px_12px_rgb(59,130,246,0.1)] transition-all duration-200"
          />
        </FormField>

        <FormField label="Date of birth" required error={errors.dateOfBirth}>
          <Input
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => onUpdateField("dateOfBirth", e.target.value)}
            className="h-12 rounded-full bg-white dark:bg-card border border-border/50 hover:bg-muted/50 hover:shadow-[0_4px_12px_rgb(59,130,246,0.1)] transition-all duration-200"
          />
        </FormField>
      </div>

      {/* Trust signals */}
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-card border border-border/50 shadow-[0_4px_16px_rgb(0,0,0,0.04)] text-sm text-muted-foreground">
        <Shield className="w-5 h-5 text-primary shrink-0" />
        <span>Your information is encrypted and secure. We never share your data.</span>
      </div>

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
