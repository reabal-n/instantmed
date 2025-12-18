"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import confetti from "canvas-confetti"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Briefcase,
  GraduationCap,
  Heart,
  X,
  AlertCircle,
  Check,
  FileText,
  Shield,
  Pencil,
  Calendar,
} from "lucide-react"
import { createRequestAndCheckoutAction } from "@/lib/stripe/checkout"
import { createClient } from "@/lib/supabase/client"
import { createOrGetProfile } from "@/app/actions/create-profile"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { MICROCOPY } from "@/lib/microcopy/med-cert"
import { TagsSelector } from "@/components/ui/tags-selector"
import { createGuestCheckoutAction } from "@/lib/stripe/guest-checkout" // Added createGuestCheckoutAction

// Flow steps
type FlowStep =
  | "type"
  | "duration"
  | "startDate"
  | "symptoms"
  | "notes"
  | "safety"
  | "patientDetails"
  | "review"
  | "payment"

// Updated steps
const STEPS: FlowStep[] = [
  "type",
  "duration",
  "startDate",
  "symptoms",
  "notes",
  "safety",
  "patientDetails",
  "review",
  "payment",
]

// Certificate types with compliant labels
const CERT_TYPES = [
  { id: "work", label: MICROCOPY.type.work.label, icon: Briefcase, description: MICROCOPY.type.work.description },
  { id: "uni", label: MICROCOPY.type.uni.label, icon: GraduationCap, description: MICROCOPY.type.uni.description },
  { id: "carer", label: MICROCOPY.type.carer.label, icon: Heart, description: MICROCOPY.type.carer.description },
] as const

// Duration options with compliant labels
const DURATION_OPTIONS = [
  { value: "1", label: MICROCOPY.duration.options["1"] },
  { value: "2", label: MICROCOPY.duration.options["2"] },
  { value: "3", label: MICROCOPY.duration.options["3"] },
  { value: "4-7", label: MICROCOPY.duration.options["4-7"] },
  { value: "1-2weeks", label: MICROCOPY.duration.options["1-2weeks"] },
  { value: "specific", label: MICROCOPY.duration.options["specific"] },
] as const

// Symptoms
const SYMPTOMS = ["Headache", "Fever", "Nausea", "Pain", "Fatigue", "Cold/Flu", "Gastro", "Other"] as const

// Relationships for carer's certificate
const RELATIONSHIPS = ["Parent", "Child", "Partner", "Sibling", "Grandparent", "Other"] as const

const IRNS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

interface MedCertFlowClientProps {
  patientId: string | null
  isAuthenticated: boolean
  needsOnboarding: boolean
  userEmail?: string
  userName?: string
}

// Google icon component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

// Progress indicator component with animated dots
function ProgressIndicator({
  steps,
  currentIndex,
}: {
  steps: readonly string[]
  currentIndex: number
}) {
  return (
    <nav aria-label="Request progress" className="w-full">
      <div className="flex flex-col items-center gap-2">
        {/* Animated dots */}
        <div className="flex items-center gap-3 relative">
          {steps.map((label, i) => {
            const isComplete = i < currentIndex
            const isCurrent = i === currentIndex
            return (
              <div
                key={label}
                className={`w-2.5 h-2.5 rounded-full relative z-10 transition-all duration-300 ${
                  isComplete ? "bg-primary scale-100" : isCurrent ? "bg-primary/80 scale-110" : "bg-muted-foreground/30"
                }`}
                role="progressbar"
                aria-valuenow={isComplete ? 100 : isCurrent ? 50 : 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${label}: ${isComplete ? "Complete" : isCurrent ? "In progress" : "Not started"}`}
              />
            )
          })}
          {/* Animated progress line */}
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary/20 rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${Math.max(10, (currentIndex / (steps.length - 1)) * 100)}%`,
            }}
          />
        </div>
        {/* Step label */}
        <p className="text-xs text-muted-foreground">
          Step {currentIndex + 1} of {steps.length}: <span className="font-medium text-foreground">{steps[currentIndex]}</span>
        </p>
      </div>
    </nav>
  )
}

// Accessible step header with emoji support
function StepHeader({
  title,
  subtitle,
  stepNumber,
  totalSteps,
  emoji,
}: {
  title: string
  subtitle?: string
  stepNumber?: number
  totalSteps?: number
  emoji?: string
}) {
  return (
    <header className="text-center space-y-1">
      {emoji && <div className="text-4xl mb-2 animate-bounce-gentle">{emoji}</div>}
      {stepNumber && totalSteps && (
        <p className="sr-only">
          Step {stepNumber} of {totalSteps}
        </p>
      )}
      <h1 className="text-xl font-semibold text-foreground leading-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </header>
  )
}

// Error message component
function ErrorMessage({
  message,
  onDismiss,
  id,
}: {
  message: string
  onDismiss?: () => void
  id?: string
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      id={id}
      className="flex items-start gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20"
    >
      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-sm text-destructive flex-1">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded hover:bg-destructive/10 transition-colors"
          aria-label="Dismiss error"
        >
          <X className="w-4 h-4 text-destructive" />
        </button>
      )}
    </div>
  )
}

// Tile button component with emoji support
function TileButton({
  selected,
  onClick,
  icon: Icon,
  label,
  description,
  emoji,
  className = "",
}: {
  selected: boolean
  onClick: () => void
  icon?: React.ComponentType<{ className?: string }>
  label: string
  description?: string
  emoji?: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`
        w-full min-h-[48px] p-4 rounded-2xl border-2 transition-all duration-200
        flex items-center gap-3 text-left
        hover:scale-[1.02] active:scale-[0.98]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        ${
          selected
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border bg-white hover:border-primary/40 hover:bg-white/80"
        }
        ${className}
      `}
    >
      {emoji && (
        <span className={`text-2xl ${selected ? "animate-bounce-once" : ""}`}>{emoji}</span>
      )}
      {Icon && !emoji && (
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
          aria-hidden="true"
        >
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm block">{label}</span>
        {description && <span className="text-xs text-muted-foreground block truncate">{description}</span>}
      </div>
      {selected && <Check className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />}
    </button>
  )
}

// Chip button for multi-select
function ChipButton({
  selected,
  onClick,
  label,
  disabled = false,
}: {
  selected: boolean
  onClick: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`
        min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-all
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${
          selected
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-white border border-border hover:border-primary/40"
        }
      `}
    >
      {label}
    </button>
  )
}

function getDurationDays(duration: string): number {
  if (duration === "1") return 1
  if (duration === "2") return 2
  if (duration === "3") return 3
  if (duration === "4-7") return 4
  if (duration === "1-2weeks") return 7
  return 0
}

export function MedCertFlowClient({
  patientId: initialPatientId,
  isAuthenticated: initialIsAuthenticated,
  needsOnboarding: initialNeedsOnboarding,
  userEmail,
  userName,
}: MedCertFlowClientProps) {
  const router = useRouter()
  const mainRef = useRef<HTMLElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams() // Added for guest checkout redirection

  // Auth state
  const [patientId, setPatientId] = useState<string | null>(initialPatientId)
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated)
  const [needsOnboarding, setNeedsOnboarding] = useState(initialNeedsOnboarding)

  // Form data state for all steps
  // Updated formData with new fields and removed old ones
  const [formData, setFormData] = useState({
    certType: null as string | null,
    duration: null as string | null,
    startDate: new Date().toISOString().split("T")[0],
    specificDateFrom: "",
    specificDateTo: "",
    selectedSymptoms: [] as string[],
    otherSymptom: "",
    carerPatientName: "",
    carerRelationship: null as string | null,
    additionalNotes: "", // Notes for the doctor
    fullName: userName || "", // Patient full name
    guestEmail: "", // For guest checkout email collection
    email: userEmail || "", // Moved from auth to patientDetails
    dateOfBirth: "", // Moved from auth to patientDetails
    medicareNumber: "", // Moved to patientDetails
    medicareIrn: "", // Moved to patientDetails
    addressLine1: "", // Moved to patientDetails
    suburb: "", // Moved to patientDetails
    state: "", // Moved to patientDetails
    postcode: "", // Moved to patientDetails
    // Moved safety answers to a separate object
    safetyAnswers: {} as Record<string, boolean>,
  })

  // Flow state
  const [step, setStep] = useState<FlowStep>("type")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  // const [medicareError, setMedicareError] = useState<string | null>(null) // Removed
  // const [medicareValid, setMedicareValid] = useState(false) // Removed

  const isCarer = formData.certType === "carer"
  const isRedFlag =
    formData.safetyAnswers.chestPain === true || 
    formData.safetyAnswers.severeSymptoms === true || 
    formData.safetyAnswers.emergency === true

  // Focus management on step change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.focus()
    }
  }, [step])

  // Focus error message when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus()
    }
  }, [error])

  // Auto-advance handlers
  const selectCertType = useCallback((t: string) => {
    setFormData((prev) => ({ ...prev, certType: t }))
    setTimeout(() => setStep("duration"), 200)
  }, [])

  const selectDuration = useCallback((d: string) => {
    setFormData((prev) => ({ ...prev, duration: d }))
    if (d !== "specific") {
      // Automatically advance to startDate if duration is not specific
      setTimeout(() => setStep("startDate"), 200)
    }
  }, [])

  // Progress calculation
  const getCurrentStepIndex = () => {
    const index = STEPS.indexOf(step)
    // Map STEPS to progressSteps indices
    switch (index) {
      case 0: // type
      case 1: // duration
      case 2: // startDate
      case 3: // symptoms
      case 4: // notes
      case 5: // safety
      case 6: // patientDetails
        return 0 // Details
      case 7: // review
        return 1 // Review
      case 8: // payment
        return 2 // Pay
      default:
        return 0
    }
  }

  // Adjusted progressSteps to reflect the removal of 'medicare' and new order
  // Updated progressSteps to match new flow
  const progressSteps = ["Details", "Review", "Pay"] as const
  const currentProgressIndex = getCurrentStepIndex()

  // Navigation
  const goNext = useCallback(() => {
    setError(null)
    const currentIndex = STEPS.indexOf(step)

    // Updated navigation logic for new flow
    if (step === "safety") {
      setStep("patientDetails")
      return
    }

    if (step === "review") {
      setStep("payment")
      return
    }

    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1])
    }
  }, [step])

  const goBack = useCallback(() => {
    setError(null)
    const currentIndex = STEPS.indexOf(step)

    // Updated navigation logic for new flow
    if (step === "payment") {
      setStep("review")
      return
    }

    if (step === "review") {
      setStep("patientDetails")
      return
    }

    if (step === "patientDetails") {
      setStep("safety")
      return
    }

    if (step === "safety") {
      setStep("notes")
      return
    }

    if (step === "notes") {
      setStep("symptoms")
      return
    }

    if (step === "symptoms") {
      setStep("startDate")
      return
    }

    if (step === "startDate") {
      setStep("duration")
      return
    }

    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1])
    }
  }, [step])

  const goToStep = (targetStep: FlowStep) => {
    setError(null)
    setStep(targetStep)
  }

  // Check for returning users (modified for new flow)
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user && !isAuthenticated) {
        // Removed direct set of userName, dateOfBirth, as they are now part of patientDetails step
        const { profileId } = await createOrGetProfile(
          session.user.id,
          session.user.user_metadata?.full_name || "",
          session.user.user_metadata?.date_of_birth || "",
        )

        if (profileId) {
          setPatientId(profileId)
          setIsAuthenticated(true)
          setNeedsOnboarding(false)

          const urlParams = new URLSearchParams(window.location.search)
          if (urlParams.get("auth_success") === "true") {
            // Remove the query param
            window.history.replaceState({}, "", window.location.pathname)
            // Continue flow
            // Adjusted continue logic for new flow
            if (step === "patientDetails") {
              goNext()
            }
          }
        }
      }
    }
    checkSession()
  }, [isAuthenticated, step, goNext])

  const toggleSymptom = (symptom: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedSymptoms: prev.selectedSymptoms.includes(symptom)
        ? prev.selectedSymptoms.filter((s) => s !== symptom)
        : [...prev.selectedSymptoms, symptom],
    }))
  }

  // Medicare validation with realtime feedback using microcopy
  // Removed Medicare validation logic as it's no longer a separate step
  // const formatMedicareNumber = (value: string): string => {
  //   const digits = value.replace(/\D/g, "").slice(0, 10)
  //   if (digits.length <= 4) return digits
  //   if (digits.length <= 9) return `${digits.slice(0, 4)} ${digits.slice(4)}`
  //   return `${digits.slice(0, 4)} ${digits.slice(4, 9)} ${digits.slice(9)}`
  // }

  // const validateMedicareNumber = (value: string): { error: string | null; valid: boolean } => {
  //   const raw = value.replace(/\s/g, "")
  //   if (raw.length === 0) return { error: null, valid: false }
  //   if (raw.length < 10) return { error: MICROCOPY.medicare.errors.incomplete(10 - raw.length), valid: false }
  //   if (!/^[2-6]/.test(raw)) return { error: MICROCOPY.medicare.errors.startDigit, valid: false }

  //   const weights = [1, 3, 7, 9, 1, 3, 7, 9]
  //   let sum = 0
  //   for (let i = 0; i < 8; i++) {
  //     sum += Number.parseInt(raw[i]) * weights[i]
  //   }
  //   if (sum % 10 !== Number.parseInt(raw[8])) {
  //     return { error: MICROCOPY.medicare.errors.checksum, valid: false }
  //   }
  //   return { error: null, valid: true }
  // }

  // const handleMedicareChange = (value: string) => {
  //   const formatted = formatMedicareNumber(value)
  //   setFormData((prev) => ({ ...prev, medicareNumber: formatted }))
  //   const { error, valid } = validateMedicareNumber(formatted)
  //   setMedicareError(error)
  //   setMedicareValid(valid)
  // }

  // Date range calculation
  const getDateRange = () => {
    if (formData.duration === "specific") {
      return { from: formData.specificDateFrom, to: formData.specificDateTo }
    }

    // Use startDate from form data
    const today = new Date(formData.startDate)
    const from = today.toISOString().split("T")[0]
    let to = from

    const durationMap: Record<string, number> = {
      "1": 0,
      "2": 1,
      "3": 2,
      "4-7": 6,
      "1-2weeks": 13,
    }

    if (formData.duration && formData.duration in durationMap) {
      const d = new Date(today)
      d.setDate(d.getDate() + durationMap[formData.duration])
      to = d.toISOString().split("T")[0]
    }

    return { from, to }
  }

  // Validation
  const canProceed = () => {
    switch (step) {
      case "type":
        return formData.certType !== null
      case "duration":
        return formData.duration === "specific"
          ? formData.specificDateFrom && formData.specificDateTo
          : formData.duration !== null
      case "startDate":
        return !!formData.startDate
      case "symptoms":
        if (isCarer) {
          return formData.selectedSymptoms.length > 0 && !!formData.carerPatientName && !!formData.carerRelationship
        }
        return formData.selectedSymptoms.length > 0
      case "notes":
        const days = getDurationDays(formData.duration!) // Added ! to assert duration is not null
        if (days > 2 || formData.duration === "4-7" || formData.duration === "1-2weeks") {
          return formData.additionalNotes.trim().length > 0
        }
        return true // Optional for <= 2 days
      case "safety":
        // Check if all safety answers are provided
        return Object.keys(formData.safetyAnswers).length === 3
      // Removed 'medicare' validation
      case "patientDetails":
        return (
          !!formData.email &&
          !!formData.dateOfBirth &&
          formData.medicareNumber.length === 10 && // Assumes length check is sufficient for format
          !!formData.medicareIrn &&
          !!formData.addressLine1 &&
          !!formData.suburb &&
          !!formData.state &&
          !!formData.postcode
        )
      case "review":
        return true // Always proceed to review
      case "payment":
        return true // Always proceed to payment
      default:
        return false
    }
  }

  // Google auth
  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      sessionStorage.setItem("questionnaire_flow", "true")
      sessionStorage.setItem("questionnaire_path", window.location.pathname)
      // Preserve dateOfBirth for signup
      sessionStorage.setItem("pending_profile_dob", formData.dateOfBirth)
      sessionStorage.setItem("pending_profile_name", formData.fullName || "") // Store full name for profile creation

      const callbackUrl = new URL("/auth/callback", window.location.origin)
      callbackUrl.searchParams.set("redirect", window.location.pathname)
      callbackUrl.searchParams.set("flow", "questionnaire")
      // Add auth_success param to indicate successful auth flow
      callbackUrl.searchParams.set("auth_success", "true")

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Use NEXT_PUBLIC_VERCEL_URL for deployment, fallback to localhost
          redirectTo: process.env.NEXT_PUBLIC_VERCEL_URL
            ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/auth/callback`
            : "http://localhost:3000/auth/callback",
        },
      })

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : MICROCOPY.errors.signIn)
      setIsGoogleLoading(false)
    }
  }

  // Guest checkout handler
  const handleGuestCheckout = async () => {
    setIsSubmitting(true)
    setError(null)

    const dates = getDateRange()

    try {
      const result = await createGuestCheckoutAction({
        category: "medical_certificate",
        subtype: formData.certType || "work",
        type: "med_cert",
        guestEmail: formData.guestEmail || formData.email,
        guestName: formData.fullName || undefined,
        guestDateOfBirth: formData.dateOfBirth || undefined,
        answers: {
          certificate_type: formData.certType,
          duration: formData.duration,
          date_from: dates.from,
          date_to: dates.to,
          symptoms: formData.selectedSymptoms,
          other_symptom: formData.selectedSymptoms.includes("Other") ? formData.otherSymptom : null,
          additional_notes: formData.additionalNotes || null,
          carer_patient_name: isCarer ? formData.carerPatientName : null,
          carer_relationship: isCarer ? formData.carerRelationship : null,
          safety_chest_pain: formData.safetyAnswers.chestPain ?? null,
          safety_severe_symptoms: formData.safetyAnswers.severeSymptoms ?? null,
          safety_emergency: formData.safetyAnswers.emergency ?? null,
          // Patient details
          patient_email: formData.email,
          patient_dob: formData.dateOfBirth,
          medicare_number: formData.medicareNumber,
          medicare_irn: formData.medicareIrn,
          address_line1: formData.addressLine1,
          suburb: formData.suburb,
          state: formData.state,
          postcode: formData.postcode,
        },
      })

      if (!result.success) {
        throw new Error(result.error || MICROCOPY.errors.payment)
      }

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : MICROCOPY.errors.generic)
      setIsSubmitting(false)
    }
  }

  // Submit and pay (authenticated users only)
  const handleSubmit = async () => {
    // This function requires authentication - guests should use handleGuestCheckout() instead
    if (!isAuthenticated) {
      setError("Please log in to proceed, or use guest checkout.")
      setStep("patientDetails")
      return
    }

    // Trigger confetti on submission
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.6 },
      colors: ["#00E2B5", "#06B6D4", "#8B5CF6", "#F59E0B", "#10B981"],
    })

    setIsSubmitting(true)
    setError(null)

    const dates = getDateRange()

    const answers = {
      certificate_type: formData.certType,
      duration: formData.duration,
      date_from: dates.from,
      date_to: dates.to,
      symptoms: formData.selectedSymptoms,
      other_symptom: formData.selectedSymptoms.includes("Other") ? formData.otherSymptom : null,
      additional_notes: formData.additionalNotes || null,
      carer_patient_name: isCarer ? formData.carerPatientName : null,
      carer_relationship: isCarer ? formData.carerRelationship : null,
      safety_chest_pain: formData.safetyAnswers.chestPain ?? null,
      safety_severe_symptoms: formData.safetyAnswers.severeSymptoms ?? null,
      safety_emergency: formData.safetyAnswers.emergency ?? null,
      // Patient details
      patient_email: formData.email,
      patient_dob: formData.dateOfBirth,
      medicare_number: formData.medicareNumber,
      medicare_irn: formData.medicareIrn,
      address_line1: formData.addressLine1,
      suburb: formData.suburb,
      state: formData.state,
      postcode: formData.postcode,
    }

    try {
      // Create request and redirect to Stripe checkout (authenticated users only)
      const result = await createRequestAndCheckoutAction({
        category: "medical_certificate",
        subtype: formData.certType || "work",
        type: "med_cert",
        answers,
      })

      if (!result.success) {
        throw new Error(result.error || MICROCOPY.errors.payment)
      }

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : MICROCOPY.errors.generic)
      setIsSubmitting(false)
    }
  }

  // Handle proceeding to payment, especially for guests
  const handleProceedToPayment = async () => {
    // Modified logic: if not authenticated, collect guest email first
    if (!isAuthenticated) {
      if (!formData.guestEmail) {
        setError("Please provide an email address to receive your certificate.")
        return
      }
      // Proceed to guest checkout if email is provided
      await handleGuestCheckout()
      return
    }

    // If authenticated, directly proceed to payment
    setStep("payment")
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
  }

  // Get duration label for review
  const getDurationLabel = () => {
    if (formData.duration === "specific") {
      return `${formatDate(formData.specificDateFrom)} – ${formatDate(formData.specificDateTo)}`
    }
    return DURATION_OPTIONS.find((o) => o.value === formData.duration)?.label || formData.duration
  }

  // Get cert type label
  const getCertTypeLabel = () => {
    return CERT_TYPES.find((t) => t.id === formData.certType)?.label || formData.certType
  }

  // Render step content
  const renderStep = () => {
    switch (step) {
      case "type":
        return (
          <section aria-labelledby="step-type-heading" className="space-y-4 animate-step-enter">
            <StepHeader
              emoji="📄"
              title={MICROCOPY.type.heading}
              subtitle={MICROCOPY.type.subtitle}
              stepNumber={1}
              totalSteps={3}
            />

            <div className="space-y-2" role="radiogroup" aria-label="Certificate type">
              {CERT_TYPES.map((type) => (
                <TileButton
                  key={type.id}
                  selected={formData.certType === type.id}
                  onClick={() => setFormData((prev) => ({ ...prev, certType: type.id }))}
                  icon={type.icon}
                  label={type.label}
                  description={type.description}
                />
              ))}
            </div>
          </section>
        )

      case "duration":
        return (
          <section aria-labelledby="step-duration-heading" className="space-y-4 animate-step-enter">
            <StepHeader emoji="📅" title={MICROCOPY.duration.heading} />

            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Duration">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, duration: option.value }))}
                  aria-pressed={formData.duration === option.value}
                  className={`
                    min-h-[48px] p-3 rounded-xl border-2 font-medium text-sm transition-all
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                    ${
                      formData.duration === option.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-white hover:border-primary/40"
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {formData.duration === "specific" && (
              <fieldset className="space-y-3 p-3 rounded-xl bg-muted/50">
                <legend className="sr-only">Specific date range</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="date-from" className="text-xs font-medium">
                      {MICROCOPY.duration.dateFrom}
                    </Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={formData.specificDateFrom}
                      onChange={(e) => setFormData((prev) => ({ ...prev, specificDateFrom: e.target.value }))}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="date-to" className="text-xs font-medium">
                      {MICROCOPY.duration.dateTo}
                    </Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={formData.specificDateTo}
                      onChange={(e) => setFormData((prev) => ({ ...prev, specificDateTo: e.target.value }))}
                      className="h-11 rounded-xl"
                      min={formData.specificDateFrom}
                    />
                  </div>
                </div>
              </fieldset>
            )}
          </section>
        )

      // New Step: Start Date
      case "startDate":
        return (
          <section aria-labelledby="step-start-date-heading" className="space-y-4 animate-step-enter">
            <header className="text-center space-y-1">
              <div className="text-4xl mb-2 animate-bounce-gentle">🗓️</div>
              <h2 id="step-start-date-heading" className="text-xl font-semibold">
                When does your leave start?
              </h2>
              <p className="text-sm text-muted-foreground">We cannot backdate medical certificates</p>
            </header>

            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-sm font-medium">
                Start date
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  min={new Date().toISOString().split("T")[0]}
                  className="h-12 pl-10 rounded-xl"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Medical certificates can only be issued from today onwards
              </p>
            </div>
          </section>
        )

      case "symptoms":
        return (
          <section aria-labelledby="step-symptoms-heading" className="space-y-4 animate-step-enter">
            <StepHeader
              emoji={isCarer ? "🧑‍⚕️" : "🪒"}
              title={isCarer ? MICROCOPY.symptoms.headingCarer : MICROCOPY.symptoms.heading}
              subtitle={MICROCOPY.symptoms.subtitle}
            />

            {isCarer && (
              <fieldset className="space-y-3">
                <legend className="sr-only">Person being cared for</legend>
                <div className="space-y-1">
                  <Label htmlFor="carer-name" className="text-xs font-medium">
                    {MICROCOPY.symptoms.carerName}
                  </Label>
                  <Input
                    id="carer-name"
                    placeholder={MICROCOPY.symptoms.carerNamePlaceholder}
                    value={formData.carerPatientName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, carerPatientName: e.target.value }))}
                    className="h-11 rounded-xl"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{MICROCOPY.symptoms.relationship}</Label>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Relationship">
                    {RELATIONSHIPS.map((rel) => (
                      <ChipButton
                        key={rel}
                        selected={formData.carerRelationship === rel}
                        onClick={() => setFormData((prev) => ({ ...prev, carerRelationship: rel }))}
                        label={rel}
                      />
                    ))}
                  </div>
                </div>
              </fieldset>
            )}

            <TagsSelector
              tags={SYMPTOMS.map((s) => ({ id: s, label: s }))}
              value={formData.selectedSymptoms.map((s) => ({ id: s, label: s }))}
              onChange={(tags) => setFormData((prev) => ({ ...prev, selectedSymptoms: tags.map((t) => t.label) }))}
              placeholder="Tap to select symptoms..."
            />

            {formData.selectedSymptoms.includes("Other") && (
              <div className="space-y-1">
                <Label htmlFor="other-symptom" className="text-xs font-medium">
                  {MICROCOPY.symptoms.otherLabel}
                </Label>
                <Input
                  id="other-symptom"
                  placeholder={MICROCOPY.symptoms.otherPlaceholder}
                  value={formData.otherSymptom}
                  onChange={(e) => setFormData((prev) => ({ ...prev, otherSymptom: e.target.value }))}
                  className="h-11 rounded-xl"
                />
              </div>
            )}
          </section>
        )

      case "notes":
        return (
          <section aria-labelledby="step-notes-heading" className="space-y-4 animate-step-enter">
            <header className="text-center space-y-1">
              <div className="text-4xl mb-2 animate-bounce-gentle">✍️</div>
              <h2 id="step-notes-heading" className="text-xl font-semibold">
                {MICROCOPY.notes.heading}
              </h2>
              <p className="text-sm text-muted-foreground">
                {getDurationDays(formData.duration!) > 2 ||
                formData.duration === "4-7" ||
                formData.duration === "1-2weeks"
                  ? "Please describe why you need extended leave (required for certificates over 2 days)"
                  : MICROCOPY.notes.subtitle}
              </p>
            </header>

            <div className="space-y-2">
              <Textarea
                id="notes"
                value={formData.additionalNotes} // Changed from formData.notes to formData.additionalNotes
                onChange={(e) => setFormData((prev) => ({ ...prev, additionalNotes: e.target.value.slice(0, 500) }))}
                placeholder={MICROCOPY.notes.placeholder}
                className="min-h-[120px] resize-none rounded-xl"
                maxLength={500}
                aria-describedby="notes-count"
              />
              <p id="notes-count" className="text-xs text-right text-muted-foreground">
                {formData.additionalNotes.length}/500 {/* Changed from formData.notes.length */}
              </p>
            </div>
          </section>
        )

      case "safety":
        return (
          <section aria-labelledby="step-safety-heading" className="space-y-4 animate-step-enter">
            <StepHeader emoji="🛡️" title={MICROCOPY.safety.heading} subtitle={MICROCOPY.safety.subtitle} />

            <fieldset className="space-y-3">
              <legend className="sr-only">Safety screening questions</legend>

              {[
                {
                  id: "chest-pain",
                  question: MICROCOPY.safety.questions.chestPain,
                  value: formData.safetyAnswers.chestPain, // Changed from formData.hasChestPain
                  setter: (val: boolean) =>
                    setFormData((prev) => ({ ...prev, safetyAnswers: { ...prev.safetyAnswers, chestPain: val } })), // Changed setter
                },
                {
                  id: "severe",
                  question: MICROCOPY.safety.questions.severe,
                  value: formData.safetyAnswers.severeSymptoms, // Changed from formData.hasSevereSymptoms
                  setter: (val: boolean) =>
                    setFormData((prev) => ({ ...prev, safetyAnswers: { ...prev.safetyAnswers, severeSymptoms: val } })), // Changed setter
                },
                {
                  id: "emergency",
                  question: MICROCOPY.safety.questions.emergency,
                  value: formData.safetyAnswers.emergency, // Changed from formData.isEmergency
                  setter: (val: boolean) =>
                    setFormData((prev) => ({ ...prev, safetyAnswers: { ...prev.safetyAnswers, emergency: val } })), // Changed setter
                },
              ].map(({ id, question, value, setter }) => (
                <div
                  key={id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white border border-border"
                >
                  <span className="text-sm font-medium pr-4">{question}</span>
                  <div className="flex gap-2" role="radiogroup" aria-label={question}>
                    {[
                      { label: MICROCOPY.safety.no, val: false },
                      { label: MICROCOPY.safety.yes, val: true },
                    ].map(({ label, val }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          setter(val)
                          if (val && id === "emergency") setShowEmergencyModal(true)
                        }}
                        aria-pressed={value === val}
                        className={`
                          min-w-[48px] min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-all
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                          ${
                            value === val
                              ? val
                                ? "bg-destructive text-destructive-foreground"
                                : "bg-primary text-primary-foreground"
                              : "bg-muted hover:bg-muted/80"
                          }
                        `}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </fieldset>

            {isRedFlag && (
              <div role="alert" className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                  <span className="font-semibold">{MICROCOPY.safety.alert.heading}</span>
                </div>
                <p className="text-sm text-destructive/90">{MICROCOPY.safety.alert.body}</p>
                <Button variant="destructive" className="w-full mt-2" onClick={() => window.open("tel:000")}>
                  {MICROCOPY.safety.alert.cta}
                </Button>
              </div>
            )}
          </section>
        )

      // Removed medicare step rendering
      // case "medicare":
      //   return null

      // New Step: Patient Details
      case "patientDetails":
        return (
          <section aria-labelledby="step-patient-details-heading" className="space-y-4">
            <div>
              <h2 id="step-patient-details-heading" className="text-xl font-semibold mb-1">
                Your details
              </h2>
              <p className="text-sm text-muted-foreground">Required for your certificate</p>
            </div>

            <div className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="h-11 rounded-xl"
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="dob">Date of birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                  max={new Date().toISOString().split("T")[0]}
                  className="h-11 rounded-xl"
                />
              </div>

              {/* Medicare Number with auto-formatting */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="medicare">Medicare number</Label>
                  <Input
                    id="medicare"
                    type="text"
                    value={formData.medicareNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 10)
                      setFormData((prev) => ({ ...prev, medicareNumber: value }))
                    }}
                    placeholder="1234 56789 0"
                    className="h-11 rounded-xl font-mono"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.medicareNumber.length === 10 ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Valid format
                      </span>
                    ) : (
                      `${10 - formData.medicareNumber.length} more digits needed`
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="irn">IRN</Label>
                  <Input
                    id="irn"
                    type="text"
                    value={formData.medicareIrn}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 1)
                      setFormData((prev) => ({ ...prev, medicareIrn: value }))
                    }}
                    placeholder="1"
                    className="h-11 rounded-xl font-mono text-center"
                    maxLength={1}
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Street address</Label>
                <Input
                  id="address"
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  placeholder="123 Main St"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="suburb">Suburb</Label>
                  <Input
                    id="suburb"
                    type="text"
                    value={formData.suburb}
                    onChange={(e) => setFormData((prev) => ({ ...prev, suburb: e.target.value }))}
                    placeholder="Sydney"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <select
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select</option>
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="QLD">QLD</option>
                    <option value="WA">WA</option>
                    <option value="SA">SA</option>
                    <option value="TAS">TAS</option>
                    <option value="ACT">ACT</option>
                    <option value="NT">NT</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  type="text"
                  value={formData.postcode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 4)
                    setFormData((prev) => ({ ...prev, postcode: value }))
                  }}
                  placeholder="2000"
                  className="h-11 rounded-xl"
                  maxLength={4}
                />
              </div>
            </div>
          </section>
        )

      case "review": {
        return (
          <section aria-labelledby="step-review-heading" className="space-y-4">
            <StepHeader
              title={MICROCOPY.review.heading}
              subtitle={MICROCOPY.review.subtitle}
              stepNumber={2} // Updated step number
              totalSteps={3} // Updated totalSteps count
            />

            <div className="rounded-xl border border-border bg-white divide-y divide-border">
              {/* Certificate type */}
              <div className="flex items-center justify-between p-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">{MICROCOPY.review.certificateType}</p>
                  <p className="text-sm font-medium">{getCertTypeLabel()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => goToStep("type")}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label={`${MICROCOPY.review.edit} ${MICROCOPY.review.certificateType}`}
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Duration */}
              <div className="flex items-center justify-between p-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">{MICROCOPY.review.duration}</p>
                  <p className="text-sm font-medium">{getDurationLabel()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => goToStep("duration")}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label={`${MICROCOPY.review.edit} ${MICROCOPY.review.duration}`}
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Start Date */}
              <div className="flex items-center justify-between p-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="text-sm font-medium">{formatDate(formData.startDate)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => goToStep("startDate")}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Edit start date"
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Symptoms */}
              <div className="flex items-center justify-between p-3">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{MICROCOPY.review.symptoms}</p>
                  <p className="text-sm font-medium truncate">
                    {formData.selectedSymptoms.join(", ")}
                    {formData.selectedSymptoms.includes("Other") &&
                      formData.otherSymptom &&
                      ` (${formData.otherSymptom})`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => goToStep("symptoms")}
                  className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
                  aria-label={`${MICROCOPY.review.edit} ${MICROCOPY.review.symptoms}`}
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Notes */}
              <div className="flex items-center justify-between p-3">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{MICROCOPY.review.notes}</p>
                  <p className="text-sm font-medium truncate">{formData.additionalNotes || MICROCOPY.review.none}</p>
                </div>
                <button
                  type="button"
                  onClick={() => goToStep("notes")}
                  className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
                  aria-label={`${MICROCOPY.review.edit} ${MICROCOPY.review.notes}`}
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Medicare */}
              {/* Removed medicare section from review */}

              {!isAuthenticated && (
                <div className="p-3">
                  <Label htmlFor="guest-email" className="text-sm font-medium mb-2 block">
                    Email Address
                  </Label>
                  <Input
                    id="guest-email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.guestEmail}
                    onChange={(e) => setFormData((prev) => ({ ...prev, guestEmail: e.target.value }))}
                    required
                    className="h-11 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    We&apos;ll send your medical certificate to this email
                  </p>
                </div>
              )}
            </div>
          </section>
        )
      }

      // Removed signup step
      // case "signup":
      //   return (
      //     <section aria-labelledby="step-signup-heading" className="space-y-4">
      //       <StepHeader
      //         title={formData.signupMode === "new" ? MICROCOPY.signup.headingNew : MICROCOPY.signup.headingExisting}
      //         subtitle={MICROCOPY.signup.subtitle}
      //         stepNumber={4} // Updated step number
      //         totalSteps={4} // Updated totalSteps count
      //       />

      //       <div className="space-y-3">
      //         <Button
      //           type="button"
      //           variant="outline"
      //           onClick={handleGoogleAuth}
      //           disabled={isGoogleLoading}
      //           className="w-full h-12 rounded-xl gap-3 bg-transparent"
      //         >
      //           {isGoogleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon className="w-5 h-5" />}
      //           {MICROCOPY.signup.google}
      //         </Button>

      //         <div className="relative">
      //           <div className="absolute inset-0 flex items-center">
      //             <div className="w-full border-t border-border" />
      //           </div>
      //           <div className="relative flex justify-center text-xs">
      //             <span className="bg-background px-3 text-muted-foreground">{MICROCOPY.signup.or}</span>
      //           </div>
      //         </div>

      //         <form
      //           onSubmit={(e) => {
      //             e.preventDefault()
      //             handleEmailSignup()
      //           }}
      //           className="space-y-3"
      //         >
      //           {formData.signupMode === "new" && (
      //             <div className="space-y-1">
      //               <Label htmlFor="fullName" className="text-xs font-medium">
      //                 {MICROCOPY.signup.nameLabel}
      //               </Label>
      //               <Input
      //                 id="fullName"
      //                 type="text"
      //                 placeholder={MICROCOPY.signup.namePlaceholder}
      //                 value={formData.fullName}
      //                 onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
      //                 className="h-11 rounded-xl"
      //                 autoComplete="name"
      //                 required
      //               />
      //             </div>
      //           )}

      //           <div className="space-y-1">
      //             <Label htmlFor="email" className="text-xs font-medium">
      //               {MICROCOPY.signup.emailLabel}
      //             </Label>
      //             <Input
      //               id="email"
      //               type="email"
      //               placeholder={MICROCOPY.signup.emailPlaceholder}
      //               value={formData.email}
      //               onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
      //               className="h-11 rounded-xl"
      //               autoComplete="email"
      //               required
      //             />
      //           </div>

      //           <div className="space-y-1">
      //             <Label htmlFor="password" className="text-xs font-medium">
      //               {MICROCOPY.signup.passwordLabel}
      //             </Label>
      //             <div className="relative">
      //               <Input
      //                 id="password"
      //                 type={formData.showPassword ? "text" : "password"}
      //                 placeholder={
      //                   formData.signupMode === "new"
      //                     ? MICROCOPY.signup.passwordPlaceholderNew
      //                     : MICROCOPY.signup.passwordPlaceholderExisting
      //                 }
      //                 value={formData.password}
      //                 onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
      //                 className="h-11 rounded-xl pr-10"
      //                 autoComplete={formData.signupMode === "new" ? "new-password" : "current-password"}
      //                 required
      //                 minLength={formData.signupMode === "new" ? 8 : undefined}
      //               />
      //               <button
      //                 type="button"
      //                 onClick={() => setFormData((prev) => ({ ...prev, showPassword: !prev.showPassword }))}
      //                 className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
      //                 aria-label={formData.showPassword ? MICROCOPY.signup.hidePassword : MICROCOPY.signup.showPassword}
      //               >
      //                 {formData.showPassword ? (
      //                   <EyeOff className="w-4 h-4 text-muted-foreground" />
      //                 ) : (
      //                   <Eye className="w-4 h-4 text-muted-foreground" />
      //                 )}
      //               </button>
      //             </div>
      //             {formData.signupMode === "existing" && (
      //               <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
      //                 {MICROCOPY.signup.forgotPassword}
      //               </Link>
      //             )}
      //           </div>

      //           {formData.signupMode === "new" && (
      //             <div className="flex items-start gap-2">
      //               <Checkbox
      //                 id="terms"
      //                 checked={formData.termsAccepted}
      //                 onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, termsAccepted: !!checked }))}
      //                 className="mt-0.5"
      //               />
      //               <Label htmlFor="terms" className="text-xs text-muted-foreground leading-tight">
      //                 {MICROCOPY.signup.terms.prefix}{" "}
      //                 <Link href="/terms" className="text-primary hover:underline">
      //                   {MICROCOPY.signup.terms.termsLink}
      //                 </Link>{" "}
      //                 {MICROCOPY.signup.terms.and}{" "}
      //                 <Link href="/privacy" className="text-primary hover:underline">
      //                   {MICROCOPY.signup.terms.privacyLink}
      //                 </Link>
      //               </Label>
      //             </div>
      //           )}

      //           <Button type="submit" disabled={isSubmitting || !canProceed()} className="w-full h-12 rounded-xl">
      //             {isSubmitting ? (
      //               <Loader2 className="w-5 h-5 animate-spin" />
      //             ) : formData.signupMode === "new" ? (
      //               MICROCOPY.signup.ctaNew
      //             ) : (
      //               MICROCOPY.signup.ctaExisting
      //             )}
      //           </Button>
      //         </form>

      //         <p className="text-center text-xs text-muted-foreground">
      //           {formData.signupMode === "new" ? (
      //             <>
      //               {MICROCOPY.signup.switchToExisting}{" "}
      //               <button
      //                 type="button"
      //                 onClick={() => setFormData((prev) => ({ ...prev, signupMode: "existing" }))}
      //                 className="text-primary hover:underline font-medium"
      //               >
      //                 {MICROCOPY.signup.signIn}
      //               </button>
      //             </>
      //           ) : (
      //             <>
      //               {MICROCOPY.signup.switchToNew}{" "}
      //               <button
      //                 type="button"
      //                 onClick={() => setFormData((prev) => ({ ...prev, signupMode: "new" }))}
      //                 className="text-primary hover:underline font-medium"
      //               >
      //                 {MICROCOPY.signup.createAccount}
      //               </button>
      //             </>
      //           )}
      //         </p>
      //       </div>
      //     </section>
      //   )

      case "payment":
        return (
          <section aria-labelledby="step-payment-heading" className="space-y-4">
            <StepHeader
              title={MICROCOPY.payment.heading}
              subtitle={MICROCOPY.payment.subtitle}
              stepNumber={3} // Updated step number
              totalSteps={3} // Updated totalSteps count
            />

            <div className="rounded-xl border border-border bg-white p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Medical Certificate</p>
                    <p className="text-xs text-muted-foreground">{getCertTypeLabel()}</p>
                  </div>
                </div>
                <p className="text-lg font-semibold">{MICROCOPY.payment.price}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                {MICROCOPY.payment.includes.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{MICROCOPY.payment.disclaimer}</p>
              </div>
            </div>

            {/* Turnaround info */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{MICROCOPY.turnaround}</span>
            </div>
          </section>
        )

      default:
        return null
    }
  }

  return (
    <TooltipProvider>
      <main
        ref={mainRef}
        tabIndex={-1}
        className="min-h-screen bg-background flex flex-col"
        aria-label="Medical certificate request"
      >
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
          <div className="max-w-md mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-sm font-semibold text-primary">
                InstantMed
              </Link>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{MICROCOPY.turnaround}</span>
              </div>
            </div>
            <ProgressIndicator steps={progressSteps} currentIndex={currentProgressIndex} />
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 px-4 py-5">
          <div className="max-w-md mx-auto">
            {error && (
              <div ref={errorRef} tabIndex={-1} className="mb-4">
                <ErrorMessage message={error} onDismiss={() => setError(null)} />
              </div>
            )}

            {renderStep()}
          </div>
        </div>

        {/* Footer */}
        <footer className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3">
          <div className="max-w-md mx-auto flex gap-3">
            {step !== "type" &&
              step !== "startDate" &&
              step !== "payment" && ( // Show back button unless on specific steps
                <Button
                  type="button"
                  variant="ghost"
                  onClick={goBack}
                  className="h-12 px-4 rounded-xl"
                  aria-label={MICROCOPY.nav.back}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}

            {step === "payment" ? (
              <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 h-12 rounded-xl gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {MICROCOPY.payment.processing}
                  </>
                ) : (
                  <>
                    {MICROCOPY.payment.cta}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            ) : step === "review" ? (
              <Button
                onClick={handleProceedToPayment}
                className="flex-1 h-12 rounded-xl gap-2"
                disabled={!isAuthenticated && !formData.guestEmail}
              >
                Proceed to Payment
                <ArrowRight className="w-5 h-5" />
              </Button>
            ) : (
              <Button onClick={goNext} disabled={!canProceed()} className="flex-1 h-12 rounded-xl gap-2">
                {MICROCOPY.nav.continue}
                <ArrowRight className="w-5 h-5" />
              </Button>
            )}
          </div>
        </footer>
      </main>
    </TooltipProvider>
  )
}
