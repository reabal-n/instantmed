"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import {
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertTriangle,
  Briefcase,
  GraduationCap,
  Heart,
  Check,
  FileText,
  Shield,
  Pill,
  Stethoscope,
  PhoneOff,
  Star,
  Phone,
  Edit2,
  ChevronDown,
  ChevronUp,
  Users,
  Zap,
  TrendingUp,
} from "lucide-react"
import { ButtonSpinner } from "@/components/ui/unified-skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { EnhancedTextarea } from "@/components/ui/enhanced-textarea"
import { ValidatedInput, validationRules } from "@/components/ui/validated-input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { StepProgress } from "@/components/intake/step-progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info, CheckCircle2 } from "lucide-react"
import { EnhancedSelectionButton } from "@/components/intake/enhanced-selection-button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAnnouncement } from "@/components/ui/live-region"
import {
  SymptomChecker,
  checkSymptoms,
} from "@/components/intake/symptom-checker"
import { RadioGroup, RadioCard } from "@/components/ui/radio-group-card"
import { TrustBadgeStrip } from "@/components/shared/doctor-credentials"
import { createGuestCheckoutAction } from "@/lib/stripe/guest-checkout"
import { createRequestAndCheckoutAction } from "@/lib/stripe/checkout"
import type { ServiceCategory } from "@/lib/stripe/client"
import { MedicationSearch } from "@/components/medication/medication-search"
import type { Medication } from "@/lib/data/medications"
import posthog from "posthog-js"

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
}> = [
  {
    id: "med-cert",
    title: "Medical Certificate",
    subtitle: "Sick leave, carer's leave, study",
    icon: FileText,
    price: "$29.95",
    time: "~15 mins",
    noCall: true,
    popular: true,
  },
  {
    id: "repeat-script",
    title: "Repeat Prescription",
    subtitle: "Medication you already take",
    icon: Pill,
    price: "$19.95",
    time: "~15 mins",
    noCall: true,
  },
  {
    id: "new-script",
    title: "New Prescription",
    subtitle: "First-time medication",
    icon: Stethoscope,
    price: "$29.95",
    time: "2 min call",
    noCall: false,
  },
  {
    id: "consult",
    title: "General Consult",
    subtitle: "New prescriptions & dose changes",
    icon: Zap,
    price: "$44.95",
    time: "~15 mins",
    noCall: false,
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

const cardVariants = {
  initial: { scale: 0.96, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  tap: { scale: 0.98 },
}

// ============================================
// SUB-COMPONENTS
// ============================================

// Progress indicator is now using StepProgress component

function ServiceCard({
  service,
  selected,
  onClick,
}: {
  service: (typeof SERVICES)[number]
  selected: boolean
  onClick: () => void
}) {
  return (
    <div className="relative">
      {/* Popular badge */}
      {service.popular && (
        <Badge className="absolute -top-2.5 right-3 z-10 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-[10px] shadow-lg">
          Most Popular
        </Badge>
      )}
      <EnhancedSelectionButton
        variant="card"
        selected={selected}
        onClick={onClick}
        icon={service.icon}
        gradient={service.popular ? "teal-emerald" : "blue-purple"}
        className="relative w-full p-5 touch-target"
        aria-label={`Select ${service.title} service`}
      >
        <div className="flex items-start gap-4 w-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
              <h3 className={cn("font-semibold", selected ? "text-white" : "text-foreground")}>
                {service.title}
              </h3>
            {service.noCall && (
                <span className={cn(
                  "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full",
                  selected 
                    ? "text-white/90 bg-white/20 backdrop-blur-sm"
                    : "text-green-700 bg-green-100"
                )}>
                <PhoneOff className="w-2.5 h-2.5" />
                No call
              </span>
            )}
          </div>
            <p className={cn("text-sm", selected ? "text-white/90" : "text-muted-foreground")}>
              {service.subtitle}
            </p>

          <div className="flex items-center gap-3 mt-3 text-xs">
              <span className={cn("font-semibold", selected ? "text-white" : "text-primary")}>
                {service.price}
              </span>
              <span className={cn("flex items-center gap-1", selected ? "text-white/80" : "text-muted-foreground")}>
              <Clock className="w-3 h-3" />
              {service.time}
            </span>
          </div>
        </div>
      </div>
      </EnhancedSelectionButton>
    </div>
  )
}

function SelectableChip({
  selected,
  onClick,
  children,
  className,
  gradient = "blue-purple",
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
  gradient?: "blue-purple" | "purple-pink" | "teal-emerald" | "orange-red"
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
  gradient?: "blue-purple" | "purple-pink" | "teal-emerald" | "orange-red"
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
  showSuccess,
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
  patientId,
  userPhone,
  userDob,
}: EnhancedIntakeFlowProps) {
  const router = useRouter()
  const [[step, direction], setStep] = useState<[IntakeStep, number]>([
    initialService ? "details" : "service",
    0,
  ])

  // Load saved preferences from localStorage
  const [savedPreferences, setSavedPreferences] = useState<{
    lastService?: ServiceType
    lastCertType?: "work" | "study" | "carer"
    lastDuration?: "1" | "2" | "3"
    lastPharmacy?: string
  }>(() => {
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
    consultReason: "",
    safetyConfirmed: false,
    hasEmergencySymptoms: false,
    firstName: userName?.split(" ")[0] || "",
    lastName: userName?.split(" ").slice(1).join(" ") || "",
    email: userEmail || "",
    phone: userPhone || "",
    dob: userDob || "",
    agreedToTerms: false,
  })

  // Save preferences when they change
  useEffect(() => {
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
        if (process.env.NODE_ENV === 'development') {
          console.error("Auto-save error:", error)
        }
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
        } else if (state.service === "repeat-script" || state.service === "new-script") {
          if (!state.medicationName)
            newErrors.medicationName = "Please enter medication name"
        }
        break

      case "safety":
        if (symptomCheckResult.severity === "critical") {
          return false // Block progression
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
      const prevStep = steps[stepIndex - 1]
      setStep([prevStep, -1])
    }
  }, [isFirstStep, stepIndex, steps, router])

  // Map service type to Stripe category
  const getStripeCategory = (): ServiceCategory => {
    switch (state.service) {
      case "med-cert":
        return "medical_certificate"
      case "repeat-script":
      case "new-script":
        return "prescription"
      default:
        return "consult"
    }
  }

  // Build answers payload for Stripe
  const buildAnswersPayload = () => {
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
    }

    // Patient details
    answers.patient_name = `${state.firstName} ${state.lastName}`
    answers.patient_email = state.email
    answers.patient_phone = state.phone
    answers.patient_dob = state.dob

    return answers
  }

  // Submit to Stripe
  const handleSubmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    // PostHog: Track checkout started
    posthog.capture("checkout_started", {
      service_type: state.service,
      cert_type: state.certType,
      medication_name: state.medicationName,
      is_authenticated: isAuthenticated,
    })

    try {
      const category = getStripeCategory()
      const subtype = state.service === "med-cert"
        ? (state.certType || "sick_leave")
        : state.service === "repeat-script"
          ? "repeat"
          : state.service === "consult"
          ? "general"
          : "new"
      const answers = buildAnswersPayload()

      let result

      if (isAuthenticated) {
        // Authenticated user checkout
        result = await createRequestAndCheckoutAction({
          category,
          subtype,
          type: state.service || "consult",
          answers,
        })
      } else {
        // Guest checkout
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
        // Trigger confetti before redirect
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        })

        // Small delay for confetti to show
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Redirect to Stripe checkout
        window.location.href = result.checkoutUrl
      } else {
        // PostHog: Track checkout error
        posthog.capture("checkout_error", {
          service_type: state.service,
          error_message: result.error,
        })
        // Show error
        setErrors({ agreedToTerms: result.error || "Something went wrong. Please try again." })
      }
    } catch (error) {
      // PostHog: Track checkout exception
      posthog.captureException(error)
      if (process.env.NODE_ENV === 'development') {
        console.error("Submit error:", error)
      }
      setErrors({ agreedToTerms: "Something went wrong. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

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
            {/* Urgency messaging */}
            <Alert variant="info" className="border-primary/20 bg-primary/5 py-2 px-3">
              <Clock className="w-3 h-3" />
              <AlertDescription className="text-[11px] leading-tight">
                Most requests reviewed within 1 hour • Doctors online now
              </AlertDescription>
            </Alert>

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
                          <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                            <PhoneOff className="w-3 h-3" />
                            No call
                          </span>
                        )}
                        <span className="font-medium text-foreground">{service.price}</span>
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
                  {CERT_TYPES.map((type, index) => (
                    <OptionCard
                      key={type.id}
                      selected={state.certType === type.id}
                      onClick={() => updateField("certType", type.id as "work" | "study" | "carer")}
                      icon={type.icon}
                      label={type.label}
                      gradient={index === 0 ? "blue-purple" : index === 1 ? "purple-pink" : "teal-emerald"}
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
                      const selectedDate = new Date(e.target.value)
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const daysDiff = Math.floor((today.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24))
                      
                      updateField("startDate", e.target.value)
                      
                      // Show warning for backdating more than 3 days
                      if (daysDiff > 3) {
                        // This could trigger a dialog or alert
                      }
                    }}
                    className="h-11 touch-target"
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

              {/* Brief details - Progressive disclosure */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors touch-target mb-2">
                  <span>Add additional details (optional)</span>
                  <ChevronDown className="w-4 h-4" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <FormField
                    label="Anything else?"
                    hint="Any additional information that might help"
                    example="e.g., Started feeling unwell yesterday evening, have been resting since"
                  >
                    <EnhancedTextarea
                      label=""
                      value={state.symptomDetails}
                      onChange={(value) => updateField("symptomDetails", value)}
                      placeholder="Additional details for the doctor..."
                      minRows={2}
                      className="resize-none touch-target"
                      maxLength={500}
                      showCharacterCounter={true}
                      helperText="Optional: Add any additional details that might help the doctor"
                    />
                  </FormField>
                </CollapsibleContent>
              </Collapsible>
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
            </motion.div>
          )
        }

        // Prescription details
        return (
          <motion.div className="space-y-4">
            {/* Repeat vs New */}
            {state.service === "repeat-script" ? (
              <div className="py-2 px-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 text-green-800">
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">
                    No phone call needed for repeats
                  </span>
                  <span className="text-[10px] text-green-700">
                    • Prescription token will be sent via SMS
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

            {/* Medication Search */}
            <FormField
              label="Medication name"
              required
              error={errors.medicationName}
            >
              <MedicationSearch
                value={state.medicationName}
                onChange={(medication, customValue) => {
                  if (medication) {
                    updateField("medicationName", medication.name)
                    // Auto-fill dosage if only one strength available
                    if (medication.strengths.length === 1) {
                      updateField("medicationDosage", medication.strengths[0])
                    }
                  } else if (customValue) {
                    updateField("medicationName", customValue)
                  }
                }}
                placeholder="Search for a medication..."
              />
            </FormField>

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

            {/* Safety confirmation */}
            {symptomCheckResult.severity !== "critical" && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={state.safetyConfirmed}
                      onChange={(e) =>
                        updateField("safetyConfirmed", e.target.checked)
                      }
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="text-sm">
                      <p className="font-medium text-green-800">
                        I confirm this is not a medical emergency
                      </p>
                      <p className="text-green-700">
                        I understand this is a non-urgent telehealth service
                      </p>
                    </div>
                  </label>
                </div>

                {state.safetyConfirmed && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-green-600"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      Great! You&apos;re ready to continue
                    </span>
                  </motion.div>
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
                  className="h-11"
                />
              </FormField>
              <FormField label="Last name" required error={errors.lastName}>
                <Input
                  value={state.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className="h-11"
                />
              </FormField>
            </div>

            <FormField
              label="Email"
              required
              error={errors.email}
              hint="We'll send your certificate here"
              example="you@example.com"
              showSuccess={!!state.email && !errors.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)}
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
              hint="Australian mobile number"
              example="0412 345 678"
              helpText="We may need to contact you if the doctor has questions"
              showSuccess={!!state.phone && !errors.phone && /^04\d{8}$/.test(state.phone.replace(/\s/g, ""))}
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
              hint="Required for medical records"
              helpText="You must be 18 or older to use this service"
              showSuccess={!!state.dob && !errors.dob}
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
            {/* Trust indicators at top */}
            <div className="flex flex-wrap items-center justify-center gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-green-700" />
                <span className="text-green-800 font-medium">AHPRA Registered</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-green-700" />
                <span className="text-green-800 font-medium">10,000+ Patients</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-green-700 fill-green-700" />
                <span className="text-green-800 font-medium">4.9/5 Rating</span>
              </div>
            </div>

            {/* Urgency messaging */}
            <Alert variant="info" className="border-primary/20 bg-primary/5">
              <Zap className="w-4 h-4" />
              <AlertTitle className="text-sm font-medium">Usually reviewed within 1 hour</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground mt-1">
                Our doctors are online now. Most requests are completed quickly.
              </AlertDescription>
            </Alert>

            {/* Summary card - Enhanced with edit capability */}
            <div className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl border-2 border-slate-200 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedService && (
                    <motion.div 
                      className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <selectedService.icon className="w-6 h-6 text-primary" />
                    </motion.div>
                  )}
                  <div>
                    <p className="font-semibold text-lg">{selectedService?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {state.service === "med-cert" && state.certType
                        ? `${state.duration} day${state.duration !== "1" ? "s" : ""} • ${CERT_TYPES.find((t) => t.id === state.certType)?.label}`
                        : state.medicationName}
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
              <div className="flex items-center gap-2 text-sm p-3 bg-white rounded-lg border border-slate-200">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">
                  Estimated completion:{" "}
                  <strong className="text-foreground font-semibold">
                    {selectedService?.time}
                  </strong>
                </span>
              </div>

              {/* No call badge */}
              {selectedService?.noCall && (
                <motion.div 
                  className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded-lg"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <PhoneOff className="w-4 h-4" />
                  <span className="font-medium">No phone call required</span>
                </motion.div>
              )}
            </div>

            {/* Patient info - Editable */}
            <div className="p-4 bg-white border-2 border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Sending to:</p>
                <button
                  onClick={() => setEditingSection(editingSection === "patient" ? null : "patient")}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors touch-target"
                  aria-label="Edit patient details"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
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
            </div>

            {/* Service details - Editable */}
            {state.service === "med-cert" && (
              <div className="p-4 bg-white border-2 border-slate-200 rounded-xl space-y-3">
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
              </div>
            )}

            {/* What happens next timeline */}
            <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
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

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer p-4 bg-slate-50 rounded-xl border-2 border-transparent hover:border-primary/20 transition-colors touch-target">
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

            {/* Trust badges - Enhanced */}
            <div className="flex flex-wrap gap-3 justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="font-medium text-foreground">AHPRA Verified</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <div className="flex items-center gap-1.5 text-xs">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-medium text-foreground">4.9/5 Rating</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <div className="flex items-center gap-1.5 text-xs">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium text-foreground">98% Approval</span>
              </div>
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
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white flex flex-col">
      {/* Screen reader announcements */}
      <LiveRegion />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b">
        <div className="max-w-lg mx-auto px-3 py-2 flex items-start justify-center">
          <div className="flex-1 min-w-0">
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
          <div className="w-7 flex items-center justify-end shrink-0 mt-0.5">
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
      <footer className="sticky bottom-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-2 pb-safe">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-center gap-3">
            {stepIndex > 0 && (
              <button
                onClick={goBack}
                disabled={isSubmitting}
                className="shrink-0 w-12 h-12 rounded-full border-2 border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            )}
            <button
              onClick={isLastStep ? handleSubmit : goNext}
              disabled={
                isSubmitting ||
                (step === "service" && !state.service) ||
                (step === "safety" && symptomCheckResult.severity === "critical") ||
                Object.keys(errors).length > 0 ||
                (isLastStep && !state.agreedToTerms)
              }
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] min-w-[160px] h-12 font-semibold rounded-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg flex items-center justify-center px-6"
            >
              {isSubmitting
                ? "Processing..."
                : isLastStep
                  ? `Pay ${SERVICES.find((s) => s.id === state.service)?.price}`
                  : "Continue"}
              {!isSubmitting && (
                <ArrowRight className="w-5 h-5 ml-2" />
              )}
            </button>
          </div>
        </div>

        {step === "service" && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            🔒 Secure • No payment until review complete
          </p>
        )}
      </footer>
    </div>
  )
}
