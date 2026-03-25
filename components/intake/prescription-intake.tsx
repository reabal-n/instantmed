"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

// Extracted components
import { ProgressBar } from "@/components/intake/prescription-shared"
import { ControlledSubstanceWarning } from "@/components/intake/controlled-substance-warning"
import { TypeStep } from "@/components/intake/prescription-steps/type-step"
import { MedicationStep } from "@/components/intake/prescription-steps/medication-step"
import { DetailsStep } from "@/components/intake/prescription-steps/details-step"
import { PrescriptionSafetyStep, SAFETY_QUESTIONS } from "@/components/intake/prescription-steps/safety-step"
import { AccountStep } from "@/components/intake/prescription-steps/account-step"
import { PrescriptionReviewStep } from "@/components/intake/prescription-steps/review-step"

// Types
export type PrescriptionStep = "type" | "medication" | "details" | "safety" | "account" | "review"

export interface PrescriptionFormData {
  // Type
  rxType: "repeat" | "new" | null
  // Medication
  medication: string
  // Details
  condition: string | null
  otherCondition: string
  duration: string | null
  controlLevel: string | null
  sideEffects: string | null
  additionalNotes: string
  // Safety
  safetyAnswers: Record<string, boolean>
  // Account
  fullName: string
  email: string
  dateOfBirth: string
  medicareNumber: string
  medicareIrn: string
}

interface PrescriptionIntakeProps {
  isAuthenticated: boolean
  profileData?: {
    fullName?: string
    email?: string
    dateOfBirth?: string
    medicareNumber?: string
    medicareIrn?: string
  }
  onSubmit: (data: PrescriptionFormData) => Promise<void>
  onAuthRequired: () => void
}

// Common medications for autocomplete
const COMMON_MEDICATIONS = [
  "Metformin",
  "Atorvastatin",
  "Omeprazole",
  "Amlodipine",
  "Metoprolol",
  "Losartan",
  "Sertraline",
  "Escitalopram",
  "Pantoprazole",
  "Rosuvastatin",
  "Levothyroxine",
  "Salbutamol",
  "Fluticasone",
  "Cetirizine",
  "Paracetamol",
]

// Controlled substances that cannot be prescribed online
const CONTROLLED_SUBSTANCES = [
  "codeine",
  "oxycodone",
  "morphine",
  "tramadol",
  "diazepam",
  "alprazolam",
  "temazepam",
  "clonazepam",
  "dexamphetamine",
  "methylphenidate",
  "ritalin",
  "concerta",
]

// Main Component
export function PrescriptionIntake({
  isAuthenticated,
  profileData,
  onSubmit,
  onAuthRequired,
}: PrescriptionIntakeProps) {
  const prefersReducedMotion = useReducedMotion()
  const [step, setStep] = useState<PrescriptionStep>("type")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showControlledWarning, setShowControlledWarning] = useState(false)
  const [medicationSuggestions, setMedicationSuggestions] = useState<string[]>([])
  const mainRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState<PrescriptionFormData>({
    rxType: null,
    medication: "",
    condition: null,
    otherCondition: "",
    duration: null,
    controlLevel: null,
    sideEffects: null,
    additionalNotes: "",
    safetyAnswers: {},
    fullName: profileData?.fullName || "",
    email: profileData?.email || "",
    dateOfBirth: profileData?.dateOfBirth || "",
    medicareNumber: profileData?.medicareNumber || "",
    medicareIrn: profileData?.medicareIrn || "",
  })

  const steps = ["Type", "Medication", "Details", "Safety", "Account", "Review"]
  const stepOrder = useMemo<PrescriptionStep[]>(() => ["type", "medication", "details", "safety", "account", "review"], [])
  const stepIndex = stepOrder.indexOf(step)

  // Check for controlled substance
  const isControlled = CONTROLLED_SUBSTANCES.some((s) =>
    formData.medication.toLowerCase().includes(s)
  )

  // Auto-save to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("prescription_draft")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setFormData((prev) => ({ ...prev, ...parsed }))
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("prescription_draft", JSON.stringify(formData))
  }, [formData])

  // Focus management
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [step])

  // Medication autocomplete
  useEffect(() => {
    if (formData.medication.length >= 2) {
      const matches = COMMON_MEDICATIONS.filter((m) =>
        m.toLowerCase().includes(formData.medication.toLowerCase())
      )
      setMedicationSuggestions(matches.slice(0, 5))
    } else {
      setMedicationSuggestions([])
    }

    // Check for controlled substance
    if (isControlled) {
      setShowControlledWarning(true)
    }
  }, [formData.medication, isControlled])

  const updateField = useCallback(<K extends keyof PrescriptionFormData>(
    field: K,
    value: PrescriptionFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: "" }))
  }, [])

  const updateSafetyAnswer = useCallback((id: string, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      safetyAnswers: { ...prev.safetyAnswers, [id]: value },
    }))
  }, [])

  const validateStep = useCallback((currentStep: PrescriptionStep): boolean => {
    const newErrors: Record<string, string> = {}

    if (currentStep === "type") {
      if (!formData.rxType) newErrors.rxType = "Please select a prescription type"
    }

    if (currentStep === "medication") {
      if (!formData.medication.trim()) newErrors.medication = "Please enter a medication name"
      if (isControlled) newErrors.medication = "This medication cannot be prescribed online"
    }

    if (currentStep === "details") {
      if (!formData.condition) newErrors.condition = "Please select a condition"
      if (formData.condition === "other" && !formData.otherCondition.trim()) {
        newErrors.otherCondition = "Please specify the condition"
      }
      if (!formData.duration) newErrors.duration = "Please select a duration"
    }

    if (currentStep === "safety") {
      if (Object.keys(formData.safetyAnswers).length < SAFETY_QUESTIONS.length) {
        newErrors.safety = "Please answer all safety questions"
      }
    }

    if (currentStep === "account" && !isAuthenticated) {
      if (!formData.fullName.trim()) newErrors.fullName = "Full name is required"
      if (!formData.email.trim()) newErrors.email = "Email is required"
      if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, isAuthenticated, isControlled])

  const goNext = useCallback(() => {
    if (!validateStep(step)) return

    const currentIndex = stepOrder.indexOf(step)
    let nextIndex = currentIndex + 1

    // Skip account step if already authenticated
    if (stepOrder[nextIndex] === "account" && isAuthenticated) {
      nextIndex++
    }

    if (nextIndex < stepOrder.length) {
      setStep(stepOrder[nextIndex])
    }
  }, [step, validateStep, isAuthenticated, stepOrder])

  const goBack = useCallback(() => {
    const currentIndex = stepOrder.indexOf(step)
    let prevIndex = currentIndex - 1

    if (stepOrder[prevIndex] === "account" && isAuthenticated) {
      prevIndex--
    }

    if (prevIndex >= 0) {
      setStep(stepOrder[prevIndex])
    }
  }, [step, isAuthenticated, stepOrder])

  const handleSubmit = async () => {
    if (!validateStep("review")) return

    if (!isAuthenticated) {
      onAuthRequired()
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      localStorage.removeItem("prescription_draft")
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : "Something went wrong" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div ref={mainRef} className="w-full max-w-lg mx-auto px-4 py-6 sm:py-8">
      {/* Controlled substance warning modal */}
      {showControlledWarning && (
        <ControlledSubstanceWarning onClose={() => setShowControlledWarning(false)} />
      )}

      {/* Progress */}
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <ProgressBar steps={steps} currentIndex={stepIndex} />
      </motion.div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Type */}
        {step === "type" && (
          <TypeStep
            rxType={formData.rxType}
            error={errors.rxType}
            onSelect={(type) => updateField("rxType", type)}
            onNext={goNext}
          />
        )}

        {/* Step 2: Medication */}
        {step === "medication" && (
          <MedicationStep
            medication={formData.medication}
            isControlled={isControlled}
            medicationSuggestions={medicationSuggestions}
            error={errors.medication}
            onMedicationChange={(value) => updateField("medication", value)}
            onSuggestionSelect={(med) => {
              updateField("medication", med)
              setMedicationSuggestions([])
            }}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {/* Step 3: Details */}
        {step === "details" && (
          <DetailsStep
            condition={formData.condition}
            otherCondition={formData.otherCondition}
            duration={formData.duration}
            additionalNotes={formData.additionalNotes}
            errors={errors}
            onConditionChange={(value) => updateField("condition", value)}
            onOtherConditionChange={(value) => updateField("otherCondition", value)}
            onDurationChange={(value) => updateField("duration", value)}
            onNotesChange={(value) => updateField("additionalNotes", value)}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {/* Step 4: Safety */}
        {step === "safety" && (
          <PrescriptionSafetyStep
            safetyAnswers={formData.safetyAnswers}
            error={errors.safety}
            onAnswerChange={updateSafetyAnswer}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {/* Step 5: Account (only if not authenticated) */}
        {step === "account" && !isAuthenticated && (
          <AccountStep
            fullName={formData.fullName}
            email={formData.email}
            dateOfBirth={formData.dateOfBirth}
            errors={errors}
            onFullNameChange={(value) => updateField("fullName", value)}
            onEmailChange={(value) => updateField("email", value)}
            onDateOfBirthChange={(value) => updateField("dateOfBirth", value)}
            onAuthRequired={onAuthRequired}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {/* Step 6: Review */}
        {step === "review" && (
          <PrescriptionReviewStep
            formData={formData}
            isSubmitting={isSubmitting}
            submitError={errors.submit}
            onSubmit={handleSubmit}
            onBack={goBack}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
