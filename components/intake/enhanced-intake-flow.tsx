"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
// Removed confetti - per brand guidelines, interface should feel calm, not celebratory
import {
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertTriangle,
  Briefcase,
  GraduationCap,
  Heart,
  FileText,
  Shield,
  Pill,
  Stethoscope,
  Phone,
  Edit2,
  Zap,
  TrendingUp,
  X,
} from "lucide-react"
import { ButtonSpinner } from "@/components/ui/unified-skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EnhancedTextarea } from "@/components/ui/enhanced-textarea"
import { ValidatedInput, validationRules } from "@/components/ui/validated-input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { StepProgress } from "@/components/intake/step-progress"
import { GlassCard } from "@/components/ui/glass-card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, CheckCircle2 } from "lucide-react"
import { EnhancedSelectionButton } from "@/components/intake/enhanced-selection-button"
// Collapsible removed - additional details now always visible
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAnnouncement } from "@/components/ui/live-region"
import {
  SymptomChecker,
  checkSymptoms,
} from "@/components/intake/symptom-checker"
import { RadioGroup, RadioCard } from "@/components/ui/radio-group-card"
import { TrustBadgeStrip } from "@/components/shared/doctor-credentials"
import { SocialProofStrip } from "@/components/intake/social-proof-strip"
import { DoctorAvailability } from "@/components/shared/doctor-availability"
import { ExitIntentPopup } from "@/components/shared/exit-intent-popup"
import { createGuestCheckoutAction } from "@/lib/stripe/guest-checkout"
import { createIntakeAndCheckoutAction } from "@/lib/stripe/checkout"
import type { ServiceCategory } from "@/lib/stripe/client"
import { MedicationSearch, type SelectedPBSProduct } from "@/components/intake/medication-search"
import posthog from "posthog-js"
import { PRICING_DISPLAY, GP_COMPARISON } from "@/lib/constants"

// ============================================
// UTILITIES
// ============================================

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? "s" : ""} ago`
  return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? "s" : ""} ago`
}

// ============================================
// TYPES
// ============================================

type ServiceType = "med-cert" | "repeat-script" | "new-script" | "consult"

type IntakeStep =
  | "service"      // Step 1: What do you need?
  | "details"      // Step 2: Service-specific details (combined)
  | "safety"       // Step 3: Quick safety check (integrated with symptom checker)
  | "account"      // Step 4: Your details
  | "review"       // Step 5: Review & pay

interface IntakeState {
  // Service selection
  service: ServiceType | null
  
  // Med cert specific
  certType: "work" | "study" | "carer" | null
  duration: "1" | "2" | "3" | null
  startDate: string
  symptoms: string[]
  symptomDetails: string
  employerName: string
  
  // Prescription specific
  medicationType: "repeat" | "new" | null
  medicationName: string
  medicationDosage: string
  lastPrescribed: string
  pharmacyPreference: string
  
  // PBS medication search audit fields
  medicationSearchUsed: boolean
  selectedPBSProduct: SelectedPBSProduct | null
  
  // Consult specific
  consultReason: string
  
  // Safety
  safetyConfirmed: boolean
  hasEmergencySymptoms: boolean
  
  // Account
  firstName: string
  lastName: string
  email: string
  phone: string
  dob: string
  
  // Meta
  agreedToTerms: boolean
  confirmedAccuracy: boolean
}

interface EnhancedIntakeFlowProps {
  initialService?: ServiceType
  patientId?: string | null
  isAuthenticated?: boolean
  userEmail?: string
  userName?: string
  userPhone?: string
  userDob?: string
  onComplete?: (state: IntakeState) => Promise<void>
}

// ============================================
// CONSTANTS
// ============================================

const SERVICES: Array<{
  id: ServiceType
  title: string
  subtitle: string
  icon: React.ElementType
  price: string
  time: string
  noCall: boolean
  popular?: boolean
  gpCost?: string
}> = [
  {
    id: "med-cert",
    title: "Medical Certificate",
    subtitle: "Sick leave, carer's leave, study",
    icon: FileText,
    price: PRICING_DISPLAY.MED_CERT,
    time: "Under 30 min",
    noCall: true,
    popular: true,
    gpCost: GP_COMPARISON.STANDARD,
  },
  {
    id: "repeat-script",
    title: "Repeat Prescription",
    subtitle: "Medication you already take",
    icon: Pill,
    price: PRICING_DISPLAY.REPEAT_SCRIPT,
    time: "Under 30 min",
    noCall: true,
    gpCost: GP_COMPARISON.STANDARD,
  },
  {
    id: "new-script",
    title: "New Prescription",
    subtitle: "First-time medication",
    icon: Stethoscope,
    price: PRICING_DISPLAY.NEW_SCRIPT,
    time: "Under 30 min",
    noCall: false,
    gpCost: GP_COMPARISON.COMPLEX,
  },
  {
    id: "consult",
    title: "General Consult",
    subtitle: "New prescriptions & dose changes",
    icon: Zap,
    price: PRICING_DISPLAY.CONSULT,
    time: "Under 30 min",
    noCall: false,
    gpCost: GP_COMPARISON.COMPLEX,
  },
]

const CERT_TYPES = [
  { id: "work", label: "Work", icon: Briefcase, description: "For your employer" },
  { id: "study", label: "Study", icon: GraduationCap, description: "For uni or school" },
  { id: "carer", label: "Carer's leave", icon: Heart, description: "To care for someone" },
] as const

const SYMPTOMS_LIST = [
  "Cold/Flu",
  "Fever",
  "Headache",
  "Nausea",
  "Gastro",
  "Fatigue",
  "Pain",
  "Migraine",
  "Anxiety",
  "Other",
] as const

// ============================================
// ANIMATION VARIANTS
// ============================================

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 30 : -30,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 30 : -30,
    opacity: 0,
  }),
}

// ============================================
// SUB-COMPONENTS
// ============================================

// Progress indicator is now using StepProgress component

function SelectableChip({
  selected,
  onClick,
  children,
  className,
  gradient = "primary-subtle",
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
  gradient?: "blue-purple" | "purple-pink" | "teal-emerald" | "orange-red" | "primary-subtle"
}) {
  return (
    <EnhancedSelectionButton
      variant="chip"
      selected={selected}
      onClick={onClick}
      gradient={gradient}
      className={cn("touch-target", className)}
    >
      {children}
    </EnhancedSelectionButton>
  )
}

function OptionCard({
  selected,
  onClick,
  icon: Icon,
  label,
  description,
  gradient = "blue-purple",
}: {
  selected: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
  description?: string
  gradient?: "blue-purple" | "purple-pink" | "teal-emerald" | "orange-red" | "primary-subtle"
}) {
  return (
    <EnhancedSelectionButton
      variant="option"
      selected={selected}
      onClick={onClick}
      icon={Icon}
      label={label}
      description={description}
      gradient={gradient}
      className="touch-target"
    />
  )
}

function FormField({
  label,
  required,
  error,
  children,
  className,
  hint,
  helpText,
  example,
  showSuccess: _showSuccess,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  className?: string
  hint?: string
  helpText?: string
  example?: string
  showSuccess?: boolean
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {helpText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="More information"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{helpText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {example && (
        <p className="text-xs text-muted-foreground italic">e.g., {example}</p>
      )}
      {children}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1 mt-1">
          <AlertTriangle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function EnhancedIntakeFlow({
  initialService,
  isAuthenticated = false,
  userEmail,
  userName,
  patientId: _patientId,
  userPhone,
  userDob,
}: EnhancedIntakeFlowProps) {
  const router = useRouter()
  const [[step, direction], setStep] = useState<[IntakeStep, number]>([
    initialService ? "details" : "service",
    0,
  ])

  // Load saved preferences from localStorage (only on client)
  const [savedPreferences] = useState<{
    lastService?: ServiceType
    lastCertType?: "work" | "study" | "carer"
    lastDuration?: "1" | "2" | "3"
    lastPharmacy?: string
  }>(() => {
    if (typeof window === "undefined") return {}
    try {
      const saved = localStorage.getItem("intake_preferences")
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // Form state with smart defaults
  const [state, setState] = useState<IntakeState>({
    service: initialService || savedPreferences.lastService || null,
    certType: savedPreferences.lastCertType || null,
    duration: savedPreferences.lastDuration || null,
    startDate: new Date().toISOString().split("T")[0],
    symptoms: [],
    symptomDetails: "",
    employerName: "",
    medicationType: null,
    medicationName: "",
    medicationDosage: "",
    lastPrescribed: "",
    pharmacyPreference: savedPreferences.lastPharmacy || "",
    medicationSearchUsed: false,
    selectedPBSProduct: null,
    consultReason: "",
    safetyConfirmed: false,
    hasEmergencySymptoms: false,
    firstName: userName?.split(" ")[0] || "",
    lastName: userName?.split(" ").slice(1).join(" ") || "",
    email: userEmail || "",
    phone: userPhone || "",
    dob: userDob || "",
    agreedToTerms: false,
    confirmedAccuracy: false,
  })

  // Save preferences when they change
  useEffect(() => {
    if (typeof window === "undefined") return
    const prefs = {
      lastService: state.service,
      lastCertType: state.certType || undefined,
      lastDuration: state.duration || undefined,
    }
    localStorage.setItem("intake_preferences", JSON.stringify(prefs))
  }, [state.service, state.certType, state.duration])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof IntakeState, string>>>({})
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [editingSection, setEditingSection] = useState<string | null>(null)

  // Determine steps based on service
  const steps = useMemo(() => {
    const baseSteps: IntakeStep[] = ["service", "details", "safety"]
    if (!isAuthenticated) {
      baseSteps.push("account")
    }
    baseSteps.push("review")
    return baseSteps
  }, [isAuthenticated])

  const stepIndex = steps.indexOf(step)
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === steps.length - 1

  // Step labels for progress indicator
  const stepLabels = useMemo(() => {
    const labels: string[] = []
    steps.forEach((step) => {
      switch (step) {
        case "service":
          labels.push("Service")
          break
        case "details":
          labels.push("Details")
          break
        case "safety":
          labels.push("Safety")
          break
        case "account":
          labels.push("Account")
          break
        case "review":
          labels.push("Review")
          break
      }
    })
    return labels
  }, [steps])

  // Time estimates per step (in minutes) - reduced by 2 minutes total
  const timeEstimates = useMemo(() => {
    return steps.map((step) => {
      switch (step) {
        case "service":
          return 1
        case "details":
          return 1
        case "safety":
          return 1
        case "account":
          return 1
        case "review":
          return 1
        default:
          return 1
      }
    })
  }, [steps])

  // Auto-save to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    if (step === "service" && !state.service) return
    
    setIsSaving(true)
    const timer = setTimeout(() => {
      try {
        const draft = {
          ...state,
          step,
          savedAt: new Date().toISOString(),
        }
        localStorage.setItem("intake_flow_draft", JSON.stringify(draft))
        setLastSavedAt(new Date())
        setIsSaving(false)
      } catch (error) {
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === 'development') console.error("Auto-save error:", error)
        setIsSaving(false)
      }
    }, 2000) // Debounce 2 seconds

    return () => clearTimeout(timer)
  }, [state, step])

  // Real-time validation
  const validateField = useCallback(<K extends keyof IntakeState>(
    field: K,
    value: IntakeState[K]
  ): string | undefined => {
    switch (field) {
      case "certType":
        if (!value && step === "details" && state.service === "med-cert") {
          return "Please select a certificate type"
        }
        break
      case "duration":
        if (!value && step === "details" && state.service === "med-cert") {
          return "Please select duration"
        }
        break
      case "symptoms":
        if (Array.isArray(value) && value.length === 0 && step === "details" && state.service === "med-cert") {
          return "Please select at least one symptom"
        }
        break
      case "medicationName":
        if (!value && step === "details" && (state.service === "repeat-script" || state.service === "new-script")) {
          return "Please enter medication name"
        }
        break
      case "consultReason":
        if (!value && step === "details" && state.service === "consult") {
          return "Please describe what you need help with"
        } else if (value && typeof value === "string" && value.length < 10) {
          return "Please provide more details (at least 10 characters)"
        }
        break
      case "firstName":
        if (!value && step === "account") {
          return "First name is required"
        }
        break
      case "lastName":
        if (!value && step === "account") {
          return "Last name is required"
        }
        break
      case "email":
        if (!value && step === "account") {
          return "Email is required"
        } else if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string)) {
          return "Please enter a valid email address"
        }
        break
      case "phone":
        if (!value && step === "account") {
          return "Phone number is required"
        } else if (value && !/^04\d{8}$/.test((value as string).replace(/\s/g, ""))) {
          return "Please enter a valid Australian mobile number (04XX XXX XXX)"
        }
        break
      case "dob":
        if (!value && step === "account") {
          return "Date of birth is required"
        } else if (value) {
          const dob = new Date(value as string)
          const today = new Date()
          if (dob > today) {
            return "Date of birth cannot be in the future"
          }
          const age = today.getFullYear() - dob.getFullYear()
          if (age < 18) {
            return "You must be 18 or older to use this service"
          }
        }
        break
    }
    return undefined
  }, [step, state.service])

  // Update field with real-time validation
  const updateField = useCallback(
    <K extends keyof IntakeState>(field: K, value: IntakeState[K]) => {
      setState((prev) => ({ ...prev, [field]: value }))
      
      // Real-time validation
      const error = validateField(field, value)
      if (error) {
        setErrors((prev) => ({ ...prev, [field]: error }))
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[field]
          return newErrors
        })
      }

      // PostHog: Track service selection
      if (field === "service" && value) {
        const selectedService = SERVICES.find(s => s.id === value)
        posthog.capture("service_selected", {
          service_type: value,
          service_title: selectedService?.title,
          service_price: selectedService?.price,
          is_authenticated: isAuthenticated,
        })
      }
    },
    [isAuthenticated, validateField]
  )

  // Toggle symptom
  const toggleSymptom = useCallback((symptom: string) => {
    setState((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter((s) => s !== symptom)
        : [...prev.symptoms, symptom],
    }))
  }, [])

  // Check red flags
  const symptomCheckResult = useMemo(() => {
    return checkSymptoms(state.symptoms, state.symptomDetails)
  }, [state.symptoms, state.symptomDetails])

  // Validate current step
  const validateStep = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof IntakeState, string>> = {}

    switch (step) {
      case "service":
        if (!state.service) {
          newErrors.service = "Please select a service"
        }
        break

      case "details":
        if (state.service === "med-cert") {
          if (!state.certType) newErrors.certType = "Please select certificate type"
          if (!state.duration) newErrors.duration = "Please select duration"
          if (state.symptoms.length === 0)
            newErrors.symptoms = "Please select at least one symptom"
          if (!state.symptomDetails || state.symptomDetails.length < 20)
            newErrors.symptomDetails = "Please describe your symptoms (minimum 20 characters)"
        } else if (state.service === "repeat-script" || state.service === "new-script") {
          if (!state.medicationName)
            newErrors.medicationName = "Please enter medication name"
        }
        break

      case "safety":
        if (symptomCheckResult.severity === "critical") {
          return false // Block progression
        }
        if (!state.safetyConfirmed) {
          newErrors.safetyConfirmed = "Please confirm this is not a medical emergency"
        }
        break

      case "account":
        if (!state.firstName) newErrors.firstName = "First name is required"
        if (!state.lastName) newErrors.lastName = "Last name is required"
        if (!state.email) newErrors.email = "Email is required"
        if (!state.phone) newErrors.phone = "Phone number is required"
        if (!state.dob) newErrors.dob = "Date of birth is required"
        break

      case "review":
        if (!state.agreedToTerms) {
          newErrors.agreedToTerms = "Please agree to terms"
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [step, state, symptomCheckResult])

  // Map service type to Stripe category
  const getStripeCategory = useCallback((): ServiceCategory => {
    switch (state.service) {
      case "med-cert":
        return "medical_certificate"
      case "repeat-script":
      case "new-script":
        return "prescription"
      default:
        return "consult"
    }
  }, [state.service])

  // Build answers payload for Stripe
  const buildAnswersPayload = useCallback(() => {
    const answers: Record<string, unknown> = {}

    if (state.service === "med-cert") {
      answers.certificate_type = state.certType
      answers.duration = state.duration
      answers.start_date = state.startDate
      answers.symptoms = state.symptoms
      answers.symptom_details = state.symptomDetails
      answers.employer_name = state.employerName
    } else if (state.service === "consult") {
      answers.consult_reason = state.consultReason
    } else {
      answers.medication_name = state.medicationName
      answers.medication_dosage = state.medicationDosage
      answers.last_prescribed = state.lastPrescribed
      answers.pharmacy_preference = state.pharmacyPreference
      answers.is_repeat = state.service === "repeat-script"
      // PBS audit fields
      answers.medication_search_used = state.medicationSearchUsed
      answers.medication_selected = state.selectedPBSProduct !== null
      answers.selected_pbs_code = state.selectedPBSProduct?.pbs_code || null
      answers.selected_medication_name = state.selectedPBSProduct?.drug_name || null
    }

    // Patient details
    answers.patient_name = `${state.firstName} ${state.lastName}`
    answers.patient_email = state.email
    answers.patient_phone = state.phone
    answers.patient_dob = state.dob

    return answers
  }, [state])

  // Submit to Stripe - moved before goNext to fix initialization order
  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return
    
    // Clear any previous errors
    setErrors({})
    setIsSubmitting(true)

    // PostHog: Track checkout started
    posthog.capture("checkout_started", {
      service_type: state.service,
      cert_type: state.certType,
      medication_name: state.medicationName,
      is_authenticated: isAuthenticated,
    })

    try {
      // Force save draft before checkout (ensures data isn't lost if user returns)
      try {
        const draft = {
          ...state,
          step,
          savedAt: new Date().toISOString(),
          checkoutAttempted: true,
        }
        localStorage.setItem("intake_flow_draft", JSON.stringify(draft))
      } catch {
        // Non-blocking - continue with checkout even if save fails
      }

      // Validate required fields before proceeding
      if (!state.agreedToTerms) {
        setErrors({ agreedToTerms: "Please agree to the terms and conditions to continue" })
        setIsSubmitting(false)
        return
      }

      const category = getStripeCategory()
      const subtype = state.service === "med-cert"
        ? (state.certType || "sick_leave")
        : state.service === "repeat-script"
          ? "repeat"
          : state.service === "consult"
            ? "general"
            : "new"
      const answers = buildAnswersPayload()

      // Verify server actions are available
      if (!createIntakeAndCheckoutAction || !createGuestCheckoutAction) {
        throw new Error("Payment system not available. Please refresh the page and try again.")
      }

      let result

      if (isAuthenticated) {
        // Authenticated user checkout
        result = await createIntakeAndCheckoutAction({
          category,
          subtype,
          type: state.service || "consult",
          answers,
        })
      } else {
        // Guest checkout - validate email
        if (!state.email || !state.email.includes("@")) {
          setErrors({ agreedToTerms: "Please enter a valid email address" })
          setIsSubmitting(false)
          return
        }
        
        result = await createGuestCheckoutAction({
          category,
          subtype,
          type: state.service || "consult",
          answers,
          guestEmail: state.email,
          guestName: `${state.firstName} ${state.lastName}`,
          guestDateOfBirth: state.dob,
        })
      }

      if (result.success && result.checkoutUrl) {
        // Redirect to Stripe checkout - calm transition, no celebration
        window.location.href = result.checkoutUrl
      } else {
        // PostHog: Track checkout error
        posthog.capture("checkout_error", {
          service_type: state.service,
          error_message: result.error,
          is_authenticated: isAuthenticated,
        })
        
        // Show error with better visibility
        const errorMessage = result.error || "Something went wrong. Please try again."
        setErrors({ agreedToTerms: errorMessage })
        
        // Log error for debugging
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === 'development') console.error("Checkout error:", errorMessage)
        
        // If authentication error, suggest signing in
        if (errorMessage.includes("logged in") || errorMessage.includes("Authentication")) {
          // Could trigger a sign-in modal here if needed
        }
      }
    } catch (error) {
      // PostHog: Track checkout exception
      posthog.captureException(error)
      const errorMessage = error instanceof Error ? error.message : "Something went wrong. Please try again."
      
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') console.error("Submit error:", error)
      
      setErrors({ 
        agreedToTerms: `An unexpected error occurred: ${errorMessage}. Please try again or contact support at hello@LumenHealth.com.au` 
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, state, step, isAuthenticated, setIsSubmitting, setErrors, getStripeCategory, buildAnswersPayload])

  // Navigate
  const goNext = useCallback(() => {
    if (!validateStep()) return

    // PostHog: Track step completion
    posthog.capture("intake_step_completed", {
      step_name: step,
      step_number: stepIndex + 1,
      total_steps: steps.length,
      service_type: state.service,
      is_authenticated: isAuthenticated,
    })

    if (isLastStep) {
      handleSubmit()
    } else {
      const nextStep = steps[stepIndex + 1]
      setStep([nextStep, 1])
    }
  }, [validateStep, isLastStep, stepIndex, steps, step, state.service, isAuthenticated, handleSubmit])

  const goBack = useCallback(() => {
    if (isFirstStep) {
      router.push("/")
    } else {
      // Clear errors when going back to prevent button from being disabled
      setErrors({})
      const prevStep = steps[stepIndex - 1]
      setStep([prevStep, -1])
    }
  }, [isFirstStep, stepIndex, steps, router, setErrors])

  // Get step title
  const getStepTitle = () => {
    switch (step) {
      case "service":
        return { title: "What do you need?", subtitle: "Select a service to get started" }
      case "details":
        return {
          title:
            state.service === "med-cert"
              ? "Tell us about your absence"
              : state.service === "consult"
              ? "What do you need help with?"
              : "Your medication",
          subtitle: "This helps our doctors help you faster",
        }
      case "safety":
        return { title: "Quick health check", subtitle: "Just a few safety questions" }
      case "account":
        return { title: "Your details", subtitle: "So we can send you the result" }
      case "review":
        return { title: "Review & pay", subtitle: "Check everything looks right." }
    }
  }

  const { title, subtitle } = getStepTitle()

  // ==========================================
  // RENDER STEPS
  // ==========================================

  const renderStep = () => {
    switch (step) {
      // ======= SERVICE SELECTION =======
      case "service":
        return (
          <motion.div className="space-y-3">
            {/* Service timing note - calm, not urgent */}
            <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-sky-50/60 dark:bg-sky-900/20 border border-sky-200/40 dark:border-sky-700/30">
              <Clock className="w-3 h-3 shrink-0 text-slate-500" />
              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                Most requests reviewed within an hour
              </span>
            </div>

            <RadioGroup
              value={state.service || undefined}
              onValueChange={(value) => updateField("service", value as ServiceType)}
              className="w-full"
            >
              {SERVICES.map((service) => {
                const Icon = service.icon
                return (
                  <RadioCard
                    key={service.id}
                    value={service.id}
                    title={service.title}
                    description={service.subtitle}
                    icon={<Icon className="w-5 h-5" />}
                    className="relative"
                  >
                    <div className="flex items-center justify-between w-full mt-2">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {service.noCall && (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            Quick review
                          </span>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{service.price}</span>
                          {service.gpCost && (
                            <span className="text-[10px] text-muted-foreground">vs {service.gpCost} GP</span>
                          )}
                        </div>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {service.time}
                        </span>
                      </div>
                      {service.popular && (
                        <Badge className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                          Popular
                        </Badge>
                      )}
                    </div>
                  </RadioCard>
                )
              })}
            </RadioGroup>

            {/* Trust badges */}
            <div className="pt-2">
              <TrustBadgeStrip />
            </div>
          </motion.div>
        )

      // ======= DETAILS STEP =======
      case "details":
        if (state.service === "med-cert") {
          return (
            <motion.div className="space-y-4">
              {/* Trust indicator */}
              <Alert variant="info" className="border-primary/20 bg-primary/5">
                <Shield className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  All certificates are reviewed by AHPRA-registered Australian doctors
                </AlertDescription>
              </Alert>

              {/* Certificate type */}
              <FormField
                label="Certificate type"
                required
                error={errors.certType}
                hint="Choose the type that matches your situation"
                helpText="Select Work for employer, Study for university/school, or Carer's leave to care for someone"
              >
                <div className="grid grid-cols-3 gap-2">
                  {CERT_TYPES.map((type) => (
                    <OptionCard
                      key={type.id}
                      selected={state.certType === type.id}
                      onClick={() => updateField("certType", type.id as "work" | "study" | "carer")}
                      icon={type.icon}
                      label={type.label}
                      gradient="primary-subtle"
                    />
                  ))}
                </div>
              </FormField>

              {/* Duration */}
              <FormField
                label="How many days?"
                required
                error={errors.duration}
                hint="Select the number of days you need off"
                helpText="Most employers accept 1-3 days. If you need more, contact us."
              >
                <div className="flex gap-2">
                  {["1", "2", "3"].map((d) => (
                    <SelectableChip
                      key={d}
                      selected={state.duration === d}
                      onClick={() => updateField("duration", d as "1" | "2" | "3")}
                      className="flex-1 touch-target"
                    >
                      {d} day{d !== "1" ? "s" : ""}
                    </SelectableChip>
                  ))}
                </div>
              </FormField>

              {/* Start date with warning for backdating */}
              <FormField
                label="Start date"
                required
                error={errors.startDate}
                hint="When does your absence start?"
                helpText="You can select today or a past date. Future dates may require additional verification."
                showSuccess={!!state.startDate && !errors.startDate}
              >
                <div className="space-y-2">
                  <Input
                    type="date"
                    value={state.startDate}
                    onChange={(e) => {
                      updateField("startDate", e.target.value)
                    }}
                    className="h-11"
                    max={new Date().toISOString().split("T")[0]}
                    aria-label="Select start date for absence"
                  />
                  {(() => {
                    const selectedDate = new Date(state.startDate)
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const daysDiff = Math.floor((today.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24))
                    
                    if (daysDiff > 3 && state.startDate) {
                      return (
                        <Alert variant="warning" className="py-2">
                          <AlertTriangle className="w-3 h-3" />
                          <AlertDescription className="text-xs">
                            Backdating more than 3 days may incur additional fees (+$10)
                          </AlertDescription>
                        </Alert>
                      )
                    }
                    return null
                  })()}
                </div>
              </FormField>

              {/* Symptoms - Multi-select chips */}
              <FormField
                label="What symptoms do you have?"
                required
                error={errors.symptoms}
                hint="Select all that apply"
                helpText="This helps our doctors understand your condition and provide appropriate care"
              >
                <div className="flex flex-wrap gap-2">
                  {SYMPTOMS_LIST.map((symptom, index) => (
                    <SelectableChip
                      key={symptom}
                      selected={state.symptoms.includes(symptom)}
                      onClick={() => toggleSymptom(symptom)}
                      className="touch-target"
                      gradient={
                        index % 4 === 0 ? "blue-purple" :
                        index % 4 === 1 ? "purple-pink" :
                        index % 4 === 2 ? "teal-emerald" : "orange-red"
                      }
                    >
                      {symptom}
                    </SelectableChip>
                  ))}
                </div>
              </FormField>

              {/* Additional details - Required */}
              <FormField
                label="Tell us more about your symptoms"
                required
                hint="This helps our doctors understand your situation"
                example="e.g., Started feeling unwell yesterday evening, have been resting since"
                error={errors.symptomDetails}
              >
                <EnhancedTextarea
                  label=""
                  value={state.symptomDetails}
                  onChange={(value) => updateField("symptomDetails", value)}
                  placeholder="Describe your symptoms and how you're feeling..."
                  minRows={3}
                  className="resize-none touch-target"
                  maxLength={500}
                  showCharacterCounter={true}
                  helperText="Minimum 20 characters required"
                />
              </FormField>

              {/* Email collection for cart abandonment recovery - only for guests */}
              {!isAuthenticated && (
                <FormField
                  label="Your email"
                  required
                  error={errors.email}
                  hint="We'll send your certificate here"
                >
                  <Input
                    type="email"
                    value={state.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="you@example.com"
                    className="h-11"
                    autoComplete="email"
                  />
                </FormField>
              )}
            </motion.div>
          )
        }

        // Consult details
        if (state.service === "consult") {
          return (
            <motion.div className="space-y-4">
              {/* Trust indicator */}
              <Alert variant="info" className="border-primary/20 bg-primary/5">
                <Shield className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  All consultations are reviewed by AHPRA-registered Australian doctors
                </AlertDescription>
              </Alert>

              {/* Consult reason */}
              <FormField
                label="What do you need help with?"
                required
                error={errors.consultReason}
                hint="Describe your health concern or what you need"
                helpText="Be as specific as possible. This helps our doctors understand how to help you."
                example="e.g., I need a new prescription for acne treatment, or I want to discuss adjusting my blood pressure medication"
              >
                <EnhancedTextarea
                  label=""
                  value={state.consultReason}
                  onChange={(value) => updateField("consultReason", value)}
                  placeholder="Tell us about your health concern..."
                  minRows={4}
                  className="resize-none touch-target"
                  maxLength={1000}
                  showCharacterCounter={true}
                  helperText="Describe what you need help with - new prescription, medication review, health concern, etc."
                />
              </FormField>

              {/* Phone call notice */}
              <Alert variant="info" className="border-primary/20 bg-primary/5">
                <Phone className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  A doctor may call you for a quick 2-minute consultation to discuss your needs
                </AlertDescription>
              </Alert>

              {/* Email collection for cart abandonment recovery - only for guests */}
              {!isAuthenticated && (
                <FormField
                  label="Your email"
                  required
                  error={errors.email}
                  hint="We'll send your results here"
                >
                  <Input
                    type="email"
                    value={state.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="you@example.com"
                    className="h-11"
                    autoComplete="email"
                  />
                </FormField>
              )}
            </motion.div>
          )
        }

        // Prescription details
        return (
          <motion.div className="space-y-4">
            {/* Repeat vs New */}
            {state.service === "repeat-script" ? (
              <div className="py-2 px-3 bg-muted/50 border border-border rounded-xl">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">
                    Doctor reviews your request
                  </span>
                  <span className="text-[10px]">
                    • E-script sent via SMS if approved
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-2 px-3 bg-blue-50 border border-primary rounded-xl">
                <div className="flex items-center gap-2 text-blue-800">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">
                    Quick 2-minute phone consult required
                  </span>
                </div>
                <p className="text-[10px] text-primary mt-1">
                  Our doctor will call you to discuss your needs
                </p>
              </div>
            )}

            {/* Medication Search - PBS Reference Database */}
            <MedicationSearch
              value={state.selectedPBSProduct}
              onChange={(product) => {
                updateField("medicationSearchUsed", true)
                updateField("selectedPBSProduct", product)
                if (product) {
                  updateField("medicationName", product.drug_name)
                }
              }}
            />

            {/* Dosage */}
            <FormField label="Dosage & strength (if known)">
              <Input
                value={state.medicationDosage}
                onChange={(e) => updateField("medicationDosage", e.target.value)}
                placeholder="e.g., 500mg twice daily"
                className="h-11"
              />
            </FormField>

            {/* When last prescribed */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                When was this last prescribed?
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "within_3mo", label: "Within 3 months" },
                  { value: "3_6mo", label: "3-6 months" },
                  { value: "6_12mo", label: "6-12 months" },
                  { value: "over_1yr", label: "Over a year" },
                ].map((opt) => (
                  <SelectableChip
                    key={opt.value}
                    selected={state.lastPrescribed === opt.value}
                    onClick={() => updateField("lastPrescribed", opt.value)}
                  >
                    {opt.label}
                  </SelectableChip>
                ))}
              </div>
            </div>

            {/* Email collection for cart abandonment recovery - only for guests */}
            {!isAuthenticated && (
              <FormField
                label="Your email"
                required
                error={errors.email}
                hint="We'll send your e-script details here"
              >
                <Input
                  type="email"
                  value={state.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="you@example.com"
                  className="h-11"
                  autoComplete="email"
                />
              </FormField>
            )}
          </motion.div>
        )

      // ======= SAFETY CHECK =======
      case "safety":
        return (
          <motion.div className="space-y-4">
            {/* Emergency warning - Enhanced */}
            <Alert variant="warning" role="alert">
              <AlertTriangle className="w-5 h-5" />
              <AlertTitle className="font-medium">Important</AlertTitle>
              <AlertDescription>
                If you&apos;re experiencing a medical emergency, call 000 immediately.
              </AlertDescription>
            </Alert>

            {/* Integrated symptom checker */}
            <SymptomChecker
              selectedSymptoms={state.symptoms}
              symptomDetails={state.symptomDetails}
              onContinue={() => {}}
              onEmergency={() => updateField("hasEmergencySymptoms", true)}
            />

            {/* Safety confirmation - iOS-style toggle per brand guidelines */}
            {symptomCheckResult.severity !== "critical" && (
              <div className="space-y-4">
                <div className="p-4 bg-ivory-100 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 rounded-xl">
                  <label className="flex items-center justify-between gap-4 cursor-pointer">
                    <div className="text-sm">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        This is not a medical emergency
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">
                        I understand this is a non-urgent telehealth service
                      </p>
                    </div>
                    <div 
                      role="switch"
                      aria-checked={state.safetyConfirmed}
                      onClick={() => updateField("safetyConfirmed", !state.safetyConfirmed)}
                      onKeyDown={(e) => e.key === 'Enter' && updateField("safetyConfirmed", !state.safetyConfirmed)}
                      tabIndex={0}
                      className={cn(
                        "relative inline-flex h-8 w-[52px] shrink-0 cursor-pointer rounded-full border transition-all duration-300",
                        state.safetyConfirmed 
                          ? "bg-[#6BBF8A] border-[#6BBF8A]/40" 
                          : "bg-slate-200/80 dark:bg-slate-700/60 border-slate-300/30 dark:border-slate-600/30"
                      )}
                    >
                      <span 
                        className={cn(
                          "pointer-events-none inline-block h-[26px] w-[26px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition-transform duration-300 mt-[2px]",
                          state.safetyConfirmed ? "translate-x-[24px]" : "translate-x-[2px]"
                        )}
                      />
                    </div>
                  </label>
                </div>

                {state.safetyConfirmed && (
                  <div className="flex items-center gap-2 text-[#6BBF8A]">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">
                      Ready to continue
                    </span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )

      // ======= ACCOUNT DETAILS =======
      case "account":
        return (
          <motion.div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="First name"
                required
                error={errors.firstName}
              >
                <Input
                  value={state.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  placeholder="John"
                  className="h-11"
                  autoComplete="given-name"
                />
              </FormField>
              <FormField label="Last name" required error={errors.lastName}>
                <Input
                  value={state.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  placeholder="Smith"
                  className="h-11"
                  autoComplete="family-name"
                />
              </FormField>
            </div>

            <FormField
              label="Email"
              required
              error={errors.email}
            >
              <ValidatedInput
                type="email"
                label=""
                value={state.email}
                onChange={(value) => updateField("email", value)}
                placeholder="you@example.com"
                className="h-11 touch-target"
                autoComplete="email"
                helperText="We'll send your certificate here"
                validationRules={[validationRules.email]}
                showSuccessIndicator={true}
              />
            </FormField>

            <FormField
              label="Mobile number"
              required
              error={errors.phone}
            >
              <ValidatedInput
                type="tel"
                label=""
                value={state.phone}
                onChange={(value) => {
                  // Format phone number as user types
                  const digits = value.replace(/\D/g, "")
                  if (digits.length <= 10) {
                    const formatted = digits.length > 6
                      ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
                      : digits.length > 4
                      ? `${digits.slice(0, 4)} ${digits.slice(4)}`
                      : digits
                    updateField("phone", formatted.trim())
                  }
                }}
                placeholder="04XX XXX XXX"
                className="h-11 touch-target"
                autoComplete="tel"
                maxLength={12}
                formatHint="04XX XXX XXX"
                helperText="We may need to contact you if the doctor has questions"
                validationRules={[validationRules.phoneAU]}
                showFormatHintOnFocus={true}
                showSuccessIndicator={true}
              />
            </FormField>

            <FormField
              label="Date of birth"
              required
              error={errors.dob}
              hint="You must be 18 or older"
            >
              <Input
                type="date"
                value={state.dob}
                onChange={(e) => updateField("dob", e.target.value)}
                className="h-11 touch-target"
                max={new Date().toISOString().split("T")[0]}
                autoComplete="bday"
              />
            </FormField>
          </motion.div>
        )

      // ======= REVIEW =======
      case "review":
        const selectedService = SERVICES.find((s) => s.id === state.service)
        
        return (
          <motion.div className="space-y-4" data-intake-form>
            {/* Trust indicators - calm, professional */}
            <div className="flex flex-wrap items-center justify-center gap-4 p-3 bg-ivory-50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <Shield className="w-3.5 h-3.5" />
                <span>AHPRA-registered doctors</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Usually reviewed within an hour</span>
              </div>
            </div>

            {/* Summary card - Enhanced with edit capability */}
            <div className="p-5 bg-linear-to-br from-slate-50 to-white rounded-2xl border-2 border-slate-200 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedService && (
                    <motion.div 
                      className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 200 }}
                    >
                      <selectedService.icon className="w-6 h-6 text-primary" />
                    </motion.div>
                  )}
                  <div>
                    <p className="font-semibold text-lg">{selectedService?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {state.service === "med-cert" && state.certType
                        ? `${state.duration} day${state.duration !== "1" ? "s" : ""} • ${CERT_TYPES.find((t) => t.id === state.certType)?.label}`
                        : state.service === "consult"
                        ? state.consultReason?.slice(0, 50) + (state.consultReason?.length > 50 ? "..." : "")
                        : state.medicationName || "Prescription request"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-primary">
                    {selectedService?.price}
                  </span>
                  <p className="text-xs text-muted-foreground">One-time payment</p>
                </div>
              </div>

              {/* ETA with urgency */}
              <motion.div 
                className="flex items-center gap-2 text-sm p-3 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-xl border border-white/40 dark:border-white/10 shadow-[0_2px_8px_rgb(0,0,0,0.04)]"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">
                  Estimated completion:{" "}
                  <strong className="text-foreground font-semibold">
                    {selectedService?.time}
                  </strong>
                </span>
              </motion.div>

              {/* No call badge - subtle secondary messaging */}
              {selectedService?.noCall && (
                <motion.div 
                  className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-lg"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Clock className="w-4 h-4" />
                  <span>Doctor reviews your request</span>
                </motion.div>
              )}

              {/* Price Breakdown */}
              <div className="pt-3 border-t border-slate-200/50">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{selectedService?.title}</span>
                  <span>{selectedService?.price}</span>
                </div>
                {state.service === "med-cert" && state.startDate && (() => {
                  const selectedDate = new Date(state.startDate)
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const daysDiff = Math.floor((today.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24))
                  if (daysDiff > 3) {
                    return (
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Backdating fee</span>
                        <span>$10.00</span>
                      </div>
                    )
                  }
                  return null
                })()}
                <div className="flex justify-between font-semibold text-base pt-2 border-t border-dashed border-slate-200">
                  <span>Total</span>
                  <span className="text-primary">
                    {(() => {
                      const basePrice = parseFloat(selectedService?.price?.replace('$', '') || '0')
                      const selectedDate = new Date(state.startDate)
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const daysDiff = Math.floor((today.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24))
                      const hasBackdatingFee = state.service === "med-cert" && state.startDate && daysDiff > 3
                      const total = hasBackdatingFee ? basePrice + 10 : basePrice
                      return `$${total.toFixed(2)}`
                    })()}
                  </span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="flex items-center justify-center gap-3 pt-3">
                <span className="text-xs text-muted-foreground">Pay with</span>
                <div className="flex items-center gap-2">
                  {/* Apple Pay */}
                  <div className="h-7 px-2 bg-black rounded flex items-center justify-center">
                    <svg className="h-4 w-auto" viewBox="0 0 50 21" fill="white">
                      <path d="M9.4 6.7c-.5.6-1.3 1.1-2.1 1-.1-.8.3-1.6.7-2.2.5-.6 1.4-1.1 2.1-1.1.1.8-.2 1.7-.7 2.3zm.7 1.2c-1.2-.1-2.2.7-2.7.7-.6 0-1.4-.6-2.4-.6-1.2 0-2.3.7-3 1.8-1.3 2.2-.3 5.5.9 7.3.6.9 1.4 1.9 2.4 1.9 1 0 1.3-.6 2.5-.6 1.2 0 1.4.6 2.5.6 1 0 1.7-.9 2.3-1.8.7-1 1-2 1-2.1-.1 0-2-.8-2-3 0-1.9 1.5-2.8 1.6-2.8-.9-1.3-2.3-1.4-2.8-1.4h-.3z"/>
                      <path d="M21.3 4.3c2.6 0 4.4 1.8 4.4 4.4 0 2.6-1.9 4.4-4.5 4.4h-2.9v4.6h-2.1V4.3h5.1zm-2.9 7h2.4c1.8 0 2.8-1 2.8-2.6 0-1.6-1-2.6-2.8-2.6h-2.4v5.2zm8.8 2.8c0-1.7 1.3-2.7 3.6-2.8l2.6-.2v-.7c0-1.1-.7-1.7-1.9-1.7-1.1 0-1.8.5-2 1.3h-1.9c.1-1.8 1.6-3.1 4-3.1 2.3 0 3.8 1.2 3.8 3.2v6.6h-1.9v-1.6h-.1c-.6 1.1-1.8 1.8-3.1 1.8-2 0-3.1-1.2-3.1-2.8zm6.3-.8v-.8l-2.4.2c-1.2.1-1.9.6-1.9 1.4 0 .8.7 1.4 1.8 1.4 1.4 0 2.5-.9 2.5-2.2zm4.2 5.6v-1.6c.1 0 .5.1.9.1 1.2 0 1.8-.5 2.2-1.8l.2-.7-3.7-10.2h2.2l2.6 8.4h.1l2.6-8.4h2.1l-3.8 10.7c-.9 2.5-1.9 3.3-4 3.3-.4.1-.8.1-1.4.2z"/>
                    </svg>
                  </div>
                  {/* Google Pay */}
                  <div className="h-7 px-2 bg-white border border-slate-200 rounded flex items-center justify-center">
                    <svg className="h-4 w-auto" viewBox="0 0 41 17" fill="none">
                      <path d="M19.5 8.4v5h-1.6V1.6h4.2c1 0 1.9.3 2.6 1 .7.6 1.1 1.5 1.1 2.5s-.4 1.9-1.1 2.5c-.7.7-1.6 1-2.6 1l-2.6-.2zm0-5.3v3.8h2.6c.6 0 1.1-.2 1.5-.6.4-.4.6-.9.6-1.3 0-.5-.2-1-.6-1.3-.4-.4-.9-.6-1.5-.6h-2.6z" fill="#5F6368"/>
                      <path d="M30 5.2c1.2 0 2.1.3 2.8 1 .7.7 1 1.6 1 2.7v5.5h-1.5v-1.2h-.1c-.6 1-1.5 1.5-2.6 1.5-1 0-1.8-.3-2.4-.9-.6-.6-.9-1.3-.9-2.1 0-.9.3-1.6 1-2.2.6-.5 1.5-.8 2.5-.8.9 0 1.6.2 2.2.5v-.4c0-.6-.2-1.1-.7-1.5-.4-.4-1-.6-1.6-.6-.9 0-1.6.4-2.1 1.2l-1.4-.9c.8-1.2 1.9-1.8 3.8-1.8zm-2.1 6.4c0 .4.2.8.5 1.1.4.3.8.5 1.3.5.7 0 1.3-.3 1.8-.8.5-.5.8-1.1.8-1.7-.5-.4-1.1-.6-2-.6-.6 0-1.2.2-1.6.5-.5.3-.8.6-.8 1z" fill="#5F6368"/>
                      <path d="M41 5.5l-5.3 12.2h-1.6l2-4.3-3.5-7.9h1.7l2.5 6.2h.1l2.5-6.2H41z" fill="#5F6368"/>
                      <path d="M13.3 7.1c0-.5 0-.9-.1-1.4H6.8v2.6h3.7c-.2.9-.7 1.7-1.4 2.2v1.8h2.3c1.3-1.2 2.1-3 2.1-5.2h-.2z" fill="#4285F4"/>
                      <path d="M6.8 14c1.9 0 3.5-.6 4.6-1.7l-2.3-1.8c-.6.4-1.4.7-2.4.7-1.8 0-3.4-1.2-3.9-2.9H.5v1.9C1.6 12.5 4 14 6.8 14z" fill="#34A853"/>
                      <path d="M2.9 8.3c-.3-.9-.3-1.8 0-2.6V3.8H.5C-.5 5.8-.5 8.2.5 10.1l2.4-1.8z" fill="#FBBC04"/>
                      <path d="M6.8 2.8c1 0 2 .3 2.7 1l2-2C10.3.7 8.7 0 6.8 0 4 0 1.6 1.5.5 3.8l2.4 1.9c.5-1.7 2.1-2.9 3.9-2.9z" fill="#EA4335"/>
                    </svg>
                  </div>
                  {/* Visa/MC */}
                  <div className="flex items-center gap-1">
                    <div className="h-5 w-8 bg-slate-100 rounded flex items-center justify-center">
                      <span className="text-[8px] font-bold text-blue-600">VISA</span>
                    </div>
                    <div className="h-5 w-8 bg-slate-100 rounded flex items-center justify-center">
                      <span className="text-[8px] font-bold text-orange-500">MC</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Patient info - Editable */}
            <GlassCard variant="default" size="sm" hover="lift" className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Sending to:</p>
                <motion.button
                  onClick={() => setEditingSection(editingSection === "patient" ? null : "patient")}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors touch-target"
                  aria-label="Edit patient details"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </motion.button>
              </div>
              {editingSection === "patient" ? (
                <div className="space-y-3 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="First name" required>
                      <Input
                        value={state.firstName}
                        onChange={(e) => updateField("firstName", e.target.value)}
                        className="h-10 touch-target"
                      />
                    </FormField>
                    <FormField label="Last name" required>
                      <Input
                        value={state.lastName}
                        onChange={(e) => updateField("lastName", e.target.value)}
                        className="h-10 touch-target"
                      />
                    </FormField>
                  </div>
                  <FormField label="Email" required>
                    <Input
                      type="email"
                      value={state.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="h-10 touch-target"
                    />
                  </FormField>
                  <FormField label="Phone" required>
                    <Input
                      type="tel"
                      value={state.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "")
                        if (value.length <= 10) {
                          const formatted = value.length > 6
                            ? `${value.slice(0, 4)} ${value.slice(4, 7)} ${value.slice(7)}`
                            : value.length > 4
                            ? `${value.slice(0, 4)} ${value.slice(4)}`
                            : value
                          updateField("phone", formatted.trim())
                        }
                      }}
                      className="h-10 touch-target"
                      maxLength={12}
                    />
                  </FormField>
                  <Button
                    onClick={() => setEditingSection(null)}
                    className="w-full touch-target"
                    size="sm"
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {state.firstName} {state.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{state.email}</p>
                  <p className="text-sm text-muted-foreground">{state.phone}</p>
                </div>
              )}
            </GlassCard>

            {/* Service details - Editable */}
            {state.service === "med-cert" && (
              <GlassCard variant="default" size="sm" hover="lift" className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Service details:</p>
                  <button
                    onClick={() => setEditingSection(editingSection === "details" ? null : "details")}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors touch-target"
                    aria-label="Edit service details"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </div>
                {editingSection === "details" ? (
                  <div className="space-y-3 pt-2 border-t">
                    <FormField label="Certificate type" required>
                      <div className="grid grid-cols-3 gap-2">
                        {CERT_TYPES.map((type) => (
                          <OptionCard
                            key={type.id}
                            selected={state.certType === type.id}
                            onClick={() => updateField("certType", type.id as "work" | "study" | "carer")}
                            icon={type.icon}
                            label={type.label}
                            gradient="primary-subtle"
                          />
                        ))}
                      </div>
                    </FormField>
                    <FormField label="Duration" required>
                      <div className="flex gap-2">
                        {["1", "2", "3"].map((d) => (
                          <SelectableChip
                            key={d}
                            selected={state.duration === d}
                            onClick={() => updateField("duration", d as "1" | "2" | "3")}
                            className="flex-1 touch-target"
                          >
                            {d} day{d !== "1" ? "s" : ""}
                          </SelectableChip>
                        ))}
                      </div>
                    </FormField>
                    <Button
                      onClick={() => setEditingSection(null)}
                      className="w-full touch-target"
                      size="sm"
                    >
                      Done
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Type:</span> {CERT_TYPES.find((t) => t.id === state.certType)?.label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Duration:</span> {state.duration} day{state.duration !== "1" ? "s" : ""}
                    </p>
                    {state.symptoms.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Symptoms:</span> {state.symptoms.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </GlassCard>
            )}

            {/* What happens next timeline */}
            <div className="p-4 bg-linear-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                What happens next?
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-muted-foreground">You&apos;ll receive a confirmation email</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-muted-foreground">A doctor reviews your request (usually within 1 hour)</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-muted-foreground">You&apos;ll receive the result via email</p>
                </div>
              </div>
            </div>

            {/* Payment disclaimer - P0 compliance */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Important:</strong> Your payment covers the doctor&apos;s review. If your request isn&apos;t suitable for telehealth, you&apos;ll receive a full refund.
              </p>
            </div>

            {/* Accuracy confirmation - P1 compliance */}
            <label className="flex items-start gap-3 cursor-pointer p-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border-2 border-white/40 dark:border-white/10 hover:border-primary/50 hover:bg-white/85 dark:hover:bg-slate-900/80 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgb(59,130,246,0.1)] transition-all duration-300 touch-target">
              <input
                type="checkbox"
                checked={state.confirmedAccuracy}
                onChange={(e) => updateField("confirmedAccuracy", e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Confirm information accuracy"
              />
              <span className="text-sm text-muted-foreground">
                I confirm the information I&apos;ve provided is accurate and complete
              </span>
            </label>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer p-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border-2 border-white/40 dark:border-white/10 hover:border-primary/50 hover:bg-white/85 dark:hover:bg-slate-900/80 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgb(59,130,246,0.1)] transition-all duration-300 touch-target">
              <input
                type="checkbox"
                checked={state.agreedToTerms}
                onChange={(e) => updateField("agreedToTerms", e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Agree to terms and conditions"
              />
              <span className="text-sm text-muted-foreground">
                I agree to the{" "}
                <a href="/terms" className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy" className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>
              </span>
            </label>
            {errors.agreedToTerms && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="text-xs">{errors.agreedToTerms}</AlertDescription>
              </Alert>
            )}

            {/* Trust note - calm, not salesy */}
            <div className="text-center text-xs text-slate-500 dark:text-slate-400">
              Reviewed by AHPRA-registered Australian doctors
            </div>
          </motion.div>
        )
    }
  }

  // ==========================================
  // MAIN RENDER
  // ==========================================

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key to go back
      if (e.key === "Escape" && stepIndex > 0) {
        goBack()
      }
      // Enter key to continue (when button is enabled)
      if (e.key === "Enter" && step !== "service" && Object.keys(errors).length === 0) {
        const continueButton = document.querySelector('[aria-label*="Continue"]') as HTMLButtonElement
        if (continueButton && !continueButton.disabled) {
          e.preventDefault()
          continueButton.click()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [stepIndex, step, errors, goBack])

  // Warn user before closing with unsaved changes
  useEffect(() => {
    const hasUnsavedChanges = stepIndex > 0 && !isSubmitting
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?"
        return e.returnValue
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [stepIndex, isSubmitting])

  // Screen reader announcements
  const { announce, LiveRegion } = useAnnouncement()
  
  useEffect(() => {
    announce(`Step ${stepIndex + 1} of ${steps.length}: ${title}`, "polite")
  }, [stepIndex, steps.length, title, announce])

  // Announce validation errors
  useEffect(() => {
    const errorKeys = Object.keys(errors) as Array<keyof IntakeState>
    if (errorKeys.length > 0) {
      const firstError = errors[errorKeys[0]]
      if (firstError) {
        announce(`Validation error: ${firstError}`, "assertive")
      }
    }
  }, [errors, announce])

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-blue-50/30 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col">
      {/* Screen reader announcements */}
      <LiveRegion />
      
      {/* Exit intent popup for save-for-later */}
      <ExitIntentPopup variant="save" formData={state as unknown as Record<string, unknown>} />
      
      {/* Real-time doctor availability */}
      <DoctorAvailability variant="banner" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-white/40 dark:border-white/10">
        <div className="max-w-lg mx-auto px-3 py-2 flex items-start justify-between">
          {/* Close button */}
          <motion.button
            onClick={() => router.push("/")}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/70 dark:hover:bg-slate-800/60 backdrop-blur-lg transition-all duration-200 mt-0.5"
            aria-label="Close and return to home"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <X className="w-5 h-5 text-slate-600" />
          </motion.button>

          <div className="flex-1 min-w-0 flex justify-center">
            <StepProgress
              currentStep={stepIndex + 1}
              totalSteps={steps.length}
              steps={stepLabels}
              showTimeEstimate={true}
              timeEstimates={timeEstimates}
              className="compact"
            />
          </div>

          {/* Auto-save indicator */}
          <div className="w-8 flex items-center justify-end shrink-0 mt-0.5">
            {lastSavedAt && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {isSaving ? (
                        <ButtonSpinner className="w-3 h-3" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {isSaving 
                        ? "Saving..." 
                        : `Saved ${formatTimeAgo(lastSavedAt)}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-20">
        {/* Step title */}
        <motion.div
          key={step + "-title"}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </motion.div>

        {/* Step content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer CTA */}
      <footer className="sticky bottom-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-white/40 dark:border-white/10 px-4 py-2 pb-safe">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-center gap-3">
            {stepIndex > 0 && (
              <button
                onClick={goBack}
                disabled={isSubmitting}
                className="shrink-0 w-12 h-12 rounded-full border-2 border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.12)] hover:scale-105 active:scale-95 flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            )}
            <button
              onClick={isLastStep ? handleSubmit : goNext}
              disabled={
                isSubmitting ||
                (step === "service" && !state.service) ||
                (step === "safety" && (symptomCheckResult.severity === "critical" || !state.safetyConfirmed)) ||
                (isLastStep && (!state.agreedToTerms || !state.confirmedAccuracy)) ||
                // Only check errors relevant to current step to prevent disabled state when going back
                !!(step === "details" && (errors.medicationName || errors.symptoms || errors.symptomDetails || errors.certType || errors.duration || errors.consultReason)) ||
                !!(step === "account" && (errors.firstName || errors.lastName || errors.email || errors.phone || errors.dob)) ||
                !!(step === "review" && errors.agreedToTerms)
              }
              className="bg-linear-to-r from-primary to-primary/80 text-white shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgb(59,130,246,0.4)] hover:from-primary/90 hover:to-primary/70 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] min-w-[160px] h-12 font-semibold rounded-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-[0_8px_30px_rgb(59,130,246,0.3)] flex items-center justify-center px-6"
            >
              {isSubmitting ? (
                <>
                  <ButtonSpinner className="w-4 h-4 mr-2" />
                  Preparing secure checkout...
                </>
              ) : isLastStep ? (
                <>
                  Pay {SERVICES.find((s) => s.id === state.service)?.price}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>

        {step === "service" && (
          <div className="mt-2">
            <SocialProofStrip variant="minimal" />
          </div>
        )}
      </footer>
    </div>
  )
}
