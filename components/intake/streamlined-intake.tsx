"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Briefcase,
  GraduationCap,
  Heart,
  Clock,
  FileText,
  Shield,
  Sparkles,
  Info,
} from "lucide-react"

// Animation variants
const fadeSlide = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const childFade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
}

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

// Reusable Components
function ProgressBar({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                i < currentIndex
                  ? "bg-primary text-primary-foreground"
                  : i === currentIndex
                    ? "bg-primary/20 text-primary border-2 border-primary"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {i < currentIndex ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-12 sm:w-20 mx-2 transition-all duration-300",
                  i < currentIndex ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        {steps.map((step, i) => (
          <span
            key={step}
            className={cn(
              "transition-colors",
              i <= currentIndex ? "text-foreground font-medium" : ""
            )}
          >
            {step}
          </span>
        ))}
      </div>
    </div>
  )
}

function SelectCard({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
  disabled,
}: {
  selected: boolean
  onClick: () => void
  icon: React.ElementType
  title: string
  description: string
  disabled?: boolean
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full p-4 sm:p-5 rounded-2xl border-2 text-left transition-all",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "active:scale-[0.98]",
        selected
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border bg-white hover:border-primary/40 hover:shadow-md",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
            selected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("font-semibold text-base", selected && "text-primary")}>{title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0"
          >
            <Check className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </div>
    </motion.button>
  )
}

function DurationChip({
  selected,
  onClick,
  label,
}: {
  selected: boolean
  onClick: () => void
  label: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-3 rounded-xl font-medium text-sm transition-all min-h-[48px]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected
          ? "bg-primary text-white shadow-lg shadow-primary/20"
          : "bg-white border-2 border-border hover:border-primary/40"
      )}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
    >
      {label}
    </motion.button>
  )
}

function SymptomChip({
  selected,
  onClick,
  label,
}: {
  selected: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[40px]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected
          ? "bg-primary/10 text-primary border border-primary"
          : "bg-muted hover:bg-muted/80 border border-transparent"
      )}
    >
      {label}
    </button>
  )
}

function FormField({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-destructive flex items-center gap-1"
        >
          <AlertCircle className="w-3 h-3" />
          {error}
        </motion.p>
      )}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
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
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <ProgressBar steps={steps} currentIndex={stepIndex} />
      </motion.div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Purpose/Type */}
        {step === "purpose" && (
          <motion.div
            key="purpose"
            variants={fadeSlide}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                What do you need?
              </h1>
              <p className="text-muted-foreground">
                Select the type of medical certificate you need
              </p>
            </div>

            <motion.div variants={staggerChildren} className="space-y-3">
              <motion.div variants={childFade}>
                <SelectCard
                  selected={formData.certType === "work"}
                  onClick={() => updateField("certType", "work")}
                  icon={Briefcase}
                  title="Work absence"
                  description="For your employer - sick leave, personal leave"
                />
              </motion.div>
              <motion.div variants={childFade}>
                <SelectCard
                  selected={formData.certType === "uni"}
                  onClick={() => updateField("certType", "uni")}
                  icon={GraduationCap}
                  title="University/School"
                  description="For educational institutions - exams, assignments"
                />
              </motion.div>
              <motion.div variants={childFade}>
                <SelectCard
                  selected={formData.certType === "carer"}
                  onClick={() => updateField("certType", "carer")}
                  icon={Heart}
                  title="Carer's leave"
                  description="To care for an ill family member"
                />
              </motion.div>

              {formData.certType === "carer" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm"
                >
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-2 text-amber-800">
                      <p className="font-medium">Carer&apos;s Leave Certificate Requirements</p>
                      <ul className="text-xs space-y-1 text-amber-700">
                        <li>• You&apos;ll need to provide the name and relationship of the person you&apos;re caring for</li>
                        <li>• The certificate confirms you need time off to care for an immediate family member or household member</li>
                        <li>• No medical details about the person being cared for will be included</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {errors.certType && (
              <p className="text-sm text-destructive text-center">{errors.certType}</p>
            )}

            <Button
              onClick={goNext}
              disabled={!formData.certType}
              className="w-full h-12 rounded-xl text-base font-medium"
            >
              Continue
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Details */}
        {step === "details" && (
          <motion.div
            key="details"
            variants={fadeSlide}
            initial="initial"
            animate="animate"
            exit="exit"
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
              <div className="space-y-4 p-4 rounded-xl bg-muted/50">
                <FormField label="Who are you caring for?" required error={errors.carerPatientName}>
                  <Input
                    placeholder="Patient's full name"
                    value={formData.carerPatientName}
                    onChange={(e) => updateField("carerPatientName", e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </FormField>
                <FormField label="Your relationship" required error={errors.carerRelationship}>
                  <div className="flex flex-wrap gap-2">
                    {relationshipOptions.map((rel) => (
                      <SymptomChip
                        key={rel}
                        selected={formData.carerRelationship === rel}
                        onClick={() => updateField("carerRelationship", rel)}
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
              <div className="grid grid-cols-3 gap-2">
                {["1 day", "2 days", "3 days", "4-5 days", "1 week", "Custom"].map((d) => (
                  <DurationChip
                    key={d}
                    selected={formData.duration === d}
                    onClick={() => updateField("duration", d)}
                    label={d}
                  />
                ))}
              </div>
              {errors.duration && (
                <p className="text-xs text-destructive">{errors.duration}</p>
              )}
            </div>

            {/* Start date */}
            <FormField label="Start date" hint="When did/will your leave start?">
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
                className="h-12 rounded-xl"
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
                    onClick={() => toggleSymptom(symptom)}
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
                onChange={(e) => updateField("additionalNotes", e.target.value)}
                className="min-h-20 rounded-xl resize-none"
              />
            </FormField>

            {/* Navigation */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={goBack} className="h-12 rounded-xl px-6">
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back
              </Button>
              <Button onClick={goNext} className="flex-1 h-12 rounded-xl text-base font-medium">
                Continue
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Account (only if not authenticated) */}
        {step === "account" && !isAuthenticated && (
          <motion.div
            key="account"
            variants={fadeSlide}
            initial="initial"
            animate="animate"
            exit="exit"
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
                  onChange={(e) => updateField("fullName", e.target.value)}
                  className="h-12 rounded-xl"
                />
              </FormField>

              <FormField label="Email" required error={errors.email}>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="h-12 rounded-xl"
                />
              </FormField>

              <FormField label="Date of birth" required error={errors.dateOfBirth}>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateField("dateOfBirth", e.target.value)}
                  className="h-12 rounded-xl"
                />
              </FormField>
            </div>

            {/* Trust signals */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 text-sm text-muted-foreground">
              <Shield className="w-5 h-5 text-primary shrink-0" />
              <span>Your information is encrypted and secure. We never share your data.</span>
            </div>

            {/* Navigation */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={goBack} className="h-12 rounded-xl px-6">
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back
              </Button>
              <Button onClick={goNext} className="flex-1 h-12 rounded-xl text-base font-medium">
                Continue
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Review */}
        {step === "review" && (
          <motion.div
            key="review"
            variants={fadeSlide}
            initial="initial"
            animate="animate"
            exit="exit"
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
            <div className="rounded-2xl border-2 border-border overflow-hidden">
              <div className="p-4 bg-muted/30 border-b">
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
                      <span key={s} className="px-2 py-0.5 rounded-full bg-muted text-xs">
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
              <p className="text-2xl font-bold text-primary">$19.99</p>
            </div>

            {errors.submit && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {errors.submit}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={goBack} className="h-12 rounded-xl px-6">
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
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
                    Submit & Pay
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
                100% legitimate
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
