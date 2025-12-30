"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
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
  RefreshCw,
  Pill,
  Clock,
  FileText,
  Shield,
  Sparkles,
  AlertTriangle,
  Search,
  X,
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

// Safety questions
const SAFETY_QUESTIONS = [
  { id: "allergies", question: "Do you have any known drug allergies?" },
  { id: "pregnant", question: "Are you pregnant or breastfeeding?" },
  { id: "otherMeds", question: "Are you taking any other medications?" },
  { id: "conditions", question: "Do you have any chronic health conditions?" },
]

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
                  "h-0.5 w-8 sm:w-12 mx-1 sm:mx-2 transition-all duration-300",
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
              "transition-colors text-center flex-1",
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

function OptionChip({
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
        "px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        selected
          ? "bg-primary text-white shadow-lg shadow-primary/20"
          : "bg-white border-2 border-border hover:border-primary/40"
      )}
    >
      {label}
    </button>
  )
}

function SafetyQuestion({
  question,
  value,
  onChange,
}: {
  question: string
  value: boolean | undefined
  onChange: (val: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-border">
      <span className="text-sm font-medium pr-4 flex-1">{question}</span>
      <div className="flex gap-2">
        {[
          { label: "No", val: false },
          { label: "Yes", val: true },
        ].map(({ label, val }) => (
          <button
            key={label}
            type="button"
            onClick={() => onChange(val)}
            className={cn(
              "min-w-[52px] min-h-[40px] px-4 py-2 rounded-lg text-sm font-medium transition-all",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              value === val
                ? val
                  ? "bg-amber-500 text-white"
                  : "bg-primary text-white"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
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
export function PrescriptionIntake({
  isAuthenticated,
  profileData,
  onSubmit,
  onAuthRequired,
}: PrescriptionIntakeProps) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Controlled Substance</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This medication is a controlled substance and cannot be prescribed through our online service.
                  Please visit your local GP or specialist.
                </p>
              </div>
            </div>
            <Button onClick={() => setShowControlledWarning(false)} className="w-full">
              I understand
            </Button>
          </motion.div>
        </div>
      )}

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
        {/* Step 1: Type */}
        {step === "type" && (
          <motion.div
            key="type"
            variants={fadeSlide}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                What type of prescription?
              </h1>
              <p className="text-muted-foreground">
                Select whether this is a repeat or new prescription
              </p>
            </div>

            <motion.div variants={staggerChildren} className="space-y-3">
              <motion.div variants={childFade}>
                <SelectCard
                  selected={formData.rxType === "repeat"}
                  onClick={() => updateField("rxType", "repeat")}
                  icon={RefreshCw}
                  title="Repeat prescription"
                  description="I've been prescribed this medication before"
                />
              </motion.div>
              <motion.div variants={childFade}>
                <SelectCard
                  selected={formData.rxType === "new"}
                  onClick={() => updateField("rxType", "new")}
                  icon={Pill}
                  title="New prescription"
                  description="I need a new medication for a condition"
                />
              </motion.div>
            </motion.div>

            {errors.rxType && (
              <p className="text-sm text-destructive text-center">{errors.rxType}</p>
            )}

            <Button
              onClick={goNext}
              disabled={!formData.rxType}
              className="w-full h-12 rounded-xl text-base font-medium"
            >
              Continue
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Medication */}
        {step === "medication" && (
          <motion.div
            key="medication"
            variants={fadeSlide}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Which medication?
              </h1>
              <p className="text-muted-foreground">
                Enter the name of the medication you need
              </p>
            </div>

            <div className="space-y-3">
              <FormField label="Medication name" required error={errors.medication}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Start typing medication name..."
                    value={formData.medication}
                    onChange={(e) => updateField("medication", e.target.value)}
                    className={cn(
                      "h-12 pl-10 rounded-xl text-base",
                      isControlled && "border-amber-500 focus-visible:ring-amber-500"
                    )}
                  />
                  {formData.medication && (
                    <button
                      type="button"
                      onClick={() => updateField("medication", "")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </FormField>

              {/* Autocomplete suggestions */}
              {medicationSuggestions.length > 0 && !isControlled && (
                <div className="bg-white border rounded-xl shadow-lg overflow-hidden">
                  {medicationSuggestions.map((med) => (
                    <button
                      key={med}
                      type="button"
                      onClick={() => {
                        updateField("medication", med)
                        setMedicationSuggestions([])
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors text-sm"
                    >
                      {med}
                    </button>
                  ))}
                </div>
              )}

              {isControlled && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>This medication cannot be prescribed online. Please visit your GP.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={goBack} className="h-12 rounded-xl px-6">
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back
              </Button>
              <Button
                onClick={goNext}
                disabled={!formData.medication.trim() || isControlled}
                className="flex-1 h-12 rounded-xl text-base font-medium"
              >
                Continue
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Details */}
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
                    selected={formData.condition === c.value}
                    onClick={() => updateField("condition", c.value)}
                    label={c.label}
                  />
                ))}
              </div>
              {errors.condition && (
                <p className="text-xs text-destructive">{errors.condition}</p>
              )}
            </div>

            {/* Other condition */}
            {formData.condition === "other" && (
              <FormField label="Please specify" required error={errors.otherCondition}>
                <Input
                  placeholder="Describe your condition"
                  value={formData.otherCondition}
                  onChange={(e) => updateField("otherCondition", e.target.value)}
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
                    selected={formData.duration === d.value}
                    onClick={() => updateField("duration", d.value)}
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

        {/* Step 4: Safety */}
        {step === "safety" && (
          <motion.div
            key="safety"
            variants={fadeSlide}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Safety check
              </h1>
              <p className="text-muted-foreground">
                Please answer these questions for your safety
              </p>
            </div>

            <div className="space-y-3">
              {SAFETY_QUESTIONS.map((q) => (
                <SafetyQuestion
                  key={q.id}
                  question={q.question}
                  value={formData.safetyAnswers[q.id]}
                  onChange={(val) => updateSafetyAnswer(q.id, val)}
                />
              ))}
            </div>

            {errors.safety && (
              <p className="text-sm text-destructive text-center">{errors.safety}</p>
            )}

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

        {/* Step 5: Account (only if not authenticated) */}
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

        {/* Step 6: Review */}
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
              <p className="text-2xl font-bold text-primary">$24.99</p>
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
                ~30 min review
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                PBS eligible
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
