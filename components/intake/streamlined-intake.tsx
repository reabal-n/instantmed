"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { ProgressBar } from "./intake-ui-primitives"
import { PurposeStep } from "./streamlined-steps/purpose-step"
import { DetailsStep } from "./streamlined-steps/details-step"
import { AccountStep } from "./streamlined-steps/account-step"
import { ReviewStep } from "./streamlined-steps/review-step"

// Types
export type IntakeStep = "purpose" | "details" | "account" | "review"

export interface IntakeFormData {
  // Purpose
  certType: "work" | "uni" | "carer" | null
  // Details
  duration: string | null
  startDate: string
  symptoms: string[]
  additionalNotes: string
  // For carer
  carerPatientName: string
  carerRelationship: string | null
  // Account (collected inline if needed)
  fullName: string
  email: string
  dateOfBirth: string
  medicareNumber: string
  medicareIrn: string
}

interface StreamlinedIntakeProps {
  type: "med_cert" | "prescription"
  subtype?: string
  isAuthenticated: boolean
  profileData?: {
    fullName?: string
    email?: string
    dateOfBirth?: string
    medicareNumber?: string
    medicareIrn?: string
  }
  onSubmit: (data: IntakeFormData) => Promise<void>
  onAuthRequired: () => void
}

// Main Component
export function StreamlinedIntake({
  type,
  subtype,
  isAuthenticated,
  profileData,
  onSubmit,
  onAuthRequired,
}: StreamlinedIntakeProps) {
  const prefersReducedMotion = useReducedMotion()
  const [step, setStep] = useState<IntakeStep>("purpose")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const mainRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState<IntakeFormData>({
    certType: subtype === "work" ? "work" : subtype === "uni" ? "uni" : subtype === "carer" ? "carer" : null,
    duration: null,
    startDate: new Date().toISOString().split("T")[0],
    symptoms: [],
    additionalNotes: "",
    carerPatientName: "",
    carerRelationship: null,
    fullName: profileData?.fullName || "",
    email: profileData?.email || "",
    dateOfBirth: profileData?.dateOfBirth || "",
    medicareNumber: profileData?.medicareNumber || "",
    medicareIrn: profileData?.medicareIrn || "",
  })

  const steps = type === "med_cert"
    ? ["Type", "Details", "Account", "Review"]
    : ["Medication", "Details", "Account", "Review"]

  const stepIndex = ["purpose", "details", "account", "review"].indexOf(step)

  // Auto-save to localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`intake_${type}_draft`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setFormData((prev) => ({ ...prev, ...parsed }))
      } catch {
        // Ignore parse errors
      }
    }
  }, [type])

  useEffect(() => {
    localStorage.setItem(`intake_${type}_draft`, JSON.stringify(formData))
  }, [formData, type])

  // Focus management
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [step])

  const updateField = useCallback(<K extends keyof IntakeFormData>(
    field: K,
    value: IntakeFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: "" }))
  }, [])

  const toggleSymptom = useCallback((symptom: string) => {
    setFormData((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter((s) => s !== symptom)
        : [...prev.symptoms, symptom],
    }))
  }, [])

  const validateStep = useCallback((currentStep: IntakeStep): boolean => {
    const newErrors: Record<string, string> = {}

    if (currentStep === "purpose") {
      if (!formData.certType) newErrors.certType = "Please select a certificate type"
    }

    if (currentStep === "details") {
      if (!formData.duration) newErrors.duration = "Please select a duration"
      if (formData.symptoms.length === 0) newErrors.symptoms = "Please select at least one symptom"
      if (formData.certType === "carer") {
        if (!formData.carerPatientName.trim()) newErrors.carerPatientName = "Patient name is required"
        if (!formData.carerRelationship) newErrors.carerRelationship = "Relationship is required"
      }
    }

    if (currentStep === "account" && !isAuthenticated) {
      if (!formData.fullName.trim()) newErrors.fullName = "Full name is required"
      if (!formData.email.trim()) newErrors.email = "Email is required"
      if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, isAuthenticated])

  const goNext = useCallback(() => {
    if (!validateStep(step)) return

    const stepOrder: IntakeStep[] = ["purpose", "details", "account", "review"]
    const currentIndex = stepOrder.indexOf(step)

    // Skip account step if already authenticated
    let nextIndex = currentIndex + 1
    if (stepOrder[nextIndex] === "account" && isAuthenticated) {
      nextIndex++
    }

    if (nextIndex < stepOrder.length) {
      setStep(stepOrder[nextIndex])
    }
  }, [step, validateStep, isAuthenticated])

  const goBack = useCallback(() => {
    const stepOrder: IntakeStep[] = ["purpose", "details", "account", "review"]
    const currentIndex = stepOrder.indexOf(step)

    let prevIndex = currentIndex - 1
    if (stepOrder[prevIndex] === "account" && isAuthenticated) {
      prevIndex--
    }

    if (prevIndex >= 0) {
      setStep(stepOrder[prevIndex])
    }
  }, [step, isAuthenticated])

  const handleSubmit = async () => {
    if (!validateStep("review")) return

    if (!isAuthenticated) {
      onAuthRequired()
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      localStorage.removeItem(`intake_${type}_draft`)
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : "Something went wrong" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Symptom options based on cert type
  const symptomOptions = formData.certType === "carer"
    ? ["Caring for ill family member", "Medical appointments", "Recovery support", "Ongoing care needs"]
    : ["Cold/Flu symptoms", "Fever", "Fatigue", "Headache", "Nausea", "Body aches", "Cough", "Other"]

  const relationshipOptions = ["Parent", "Child", "Spouse/Partner", "Sibling", "Other family member"]

  return (
    <div ref={mainRef} className="w-full max-w-lg mx-auto px-4 py-6 sm:py-8">
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
        {step === "purpose" && (
          <PurposeStep
            formData={formData}
            errors={errors}
            onUpdateField={updateField}
            onNext={goNext}
          />
        )}

        {step === "details" && (
          <DetailsStep
            formData={formData}
            errors={errors}
            symptomOptions={symptomOptions}
            relationshipOptions={relationshipOptions}
            onUpdateField={updateField}
            onToggleSymptom={toggleSymptom}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {step === "account" && !isAuthenticated && (
          <AccountStep
            formData={formData}
            errors={errors}
            onUpdateField={updateField}
            onNext={goNext}
            onBack={goBack}
            onAuthRequired={onAuthRequired}
          />
        )}

        {step === "review" && (
          <ReviewStep
            formData={formData}
            errors={errors}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onBack={goBack}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
