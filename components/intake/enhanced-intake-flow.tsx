"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
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
import { IOSToggle } from "@/components/ui/ios-toggle"
import { TrustBadgeStrip } from "@/components/shared/doctor-credentials"
import { SocialProofStrip } from "@/components/intake/social-proof-strip"
import { ReassuranceStrip } from "@/components/shared/reassurance-strip"
import { DoctorAvailability } from "@/components/shared/doctor-availability"
import { ExitIntentPopup } from "@/components/shared/exit-intent-popup"
import { createGuestCheckoutAction } from "@/lib/stripe/guest-checkout"
import { createIntakeAndCheckoutAction } from "@/lib/stripe/checkout"
import type { ServiceCategory } from "@/lib/stripe/client"
import { MedicationSearch, type SelectedPBSProduct } from "@/components/intake/medication-search"
import { ExtendedDurationInterstitial } from "@/components/intake/extended-duration-interstitial"
import { RefundGuaranteeBadge } from "@/components/checkout/refund-guarantee-badge"
import { PaymentMethodIcons } from "@/components/checkout/trust-badges"
import { SocialProofCheckout } from "@/components/shared/social-proof-checkout"
import { getUTMParamsForIntake } from "@/lib/analytics/utm-capture"
import posthog from "posthog-js"
import { PRICING_DISPLAY, PRICING, GP_COMPARISON } from "@/lib/constants"
import { BLOCKED_S8_TERMS, containsBlockedSubstance } from "@/lib/validation/repeat-script-schema"
import { logger } from "@/lib/observability/logger"
import { useFormAutosave } from "@/hooks/use-form-autosave"

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
  duration: "1" | "2" | null
  startDate: string
  symptoms: string[]
  symptomDetails: string
  symptomDuration: string // P1 IC-1: How long have you had these symptoms?
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
  
  // Consent & Compliance - Per MEDICOLEGAL_AUDIT_REPORT CN-1, CN-2, CN-3
  agreedToTerms: boolean
  confirmedAccuracy: boolean
  telehealthConsentGiven: boolean // P0: Explicit telehealth consent per episode
  telehealthLimitationsAcknowledged: boolean // P1: Acknowledged async limitations
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

const SERVICES: ReadonlyArray<{
  id: string
  title: string
  subtitle: string
  icon: React.ElementType
  price: string
  basePrice?: number
  twoDayPrice?: number
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
    price: `From ${PRICING_DISPLAY.MED_CERT}`,
    basePrice: PRICING.MED_CERT,
    twoDayPrice: PRICING.MED_CERT_2DAY,
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
  "Back pain",
  "Injury",
  "Migraine",
  "Period pain",
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
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  className?: string
  hint?: string
  helpText?: string
  example?: string
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

/**
 * Persistent price summary chip - shows selected service price throughout the flow
 * Provides price certainty and reduces checkout abandonment
 * For med certs, shows dynamic pricing based on duration (1-day: $19.95, 2-day: $29.95)
 */
function PriceSummaryChip({ 
  service, 
  duration,
  className 
}: { 
  service: ServiceType | null
  duration?: string
  className?: string 
}) {
  if (!service) return null
  
  const selectedService = SERVICES.find(s => s.id === service)
  if (!selectedService) return null
  
  // Calculate dynamic price for med certs based on duration
  let displayPrice = selectedService.price
  if (service === "med-cert" && duration && selectedService.basePrice && selectedService.twoDayPrice) {
    const is2Day = duration === "2" || duration === "2 days"
    const price = is2Day ? selectedService.twoDayPrice : selectedService.basePrice
    displayPrice = `$${price.toFixed(2)}`
  }
  
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
      "bg-green-50 dark:bg-green-950/30 border border-green-200/60 dark:border-green-800/40",
      className
    )}>
      <span className="text-xs text-green-700 dark:text-green-300">
        {selectedService.title}:
      </span>
      <span className="text-sm font-semibold text-green-800 dark:text-green-200">
        {displayPrice}
      </span>
    </div>
  )
}

/**
 * Compact trust signals strip for showing on all steps
 */
function CompactTrustStrip({ className }: { className?: string }) {
  return (
    <div className={cn(
      "flex items-center justify-center gap-3 py-2 px-3 rounded-lg",
      "bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-700/30",
      className
    )}>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Shield className="w-3 h-3 text-green-600" />
        <span>AHPRA Doctors</span>
      </div>
      <div className="w-px h-3 bg-slate-300 dark:bg-slate-600" />
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <CheckCircle className="w-3 h-3 text-primary" />
        <span>Encrypted</span>
      </div>
      <div className="w-px h-3 bg-slate-300 dark:bg-slate-600" />
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Clock className="w-3 h-3 text-purple-600" />
        <span>Quick Review</span>
      </div>
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
    lastDuration?: "1" | "2"
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
    symptomDuration: "", // P1 IC-1: How long have you had these symptoms?
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
    telehealthConsentGiven: false, // P0: Explicit telehealth consent
    telehealthLimitationsAcknowledged: false, // P1: Async limitations acknowledged
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

  // Auto-save form progress for resume later
  const { saveForm, loadForm, clearForm: _clearForm, hasAutosavedData } = useFormAutosave<Record<string, unknown>>(
    'intake-flow',
    {
      debounceMs: 3000,
      storage: 'local',
      onSave: () => {
        setLastSavedAt(new Date())
        setIsSaving(false)
      },
    }
  )

  // Load autosaved data on mount
  useEffect(() => {
    if (hasAutosavedData()) {
      const savedData = loadForm()
      if (savedData && !initialService) {
        // Only restore if user didn't come with a specific service intent
        setState(prev => ({ ...prev, ...savedData } as IntakeState))
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save state changes
  useEffect(() => {
    if (state.service) {
      setIsSaving(true)
      saveForm(state as unknown as Record<string, unknown>)
    }
  }, [state, saveForm])
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [showExtendedDurationInterstitial, setShowExtendedDurationInterstitial] = useState(false)

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
        logger.error("Auto-save error", { component: 'EnhancedIntakeFlow' }, error instanceof Error ? error : undefined)
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

      // PostHog: Track duration tier selection for med certs
      if (field === "duration" && value && state.service === "med-cert") {
        const priceTier = value === "2" ? "2_day" : "1_day"
        const price = value === "2" ? PRICING.MED_CERT_2DAY : PRICING.MED_CERT
        posthog.capture("med_cert_duration_selected", {
          duration_days: value,
          price_tier: priceTier,
          price_amount: price,
          cert_type: state.certType,
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
          // P1 IC-1: Symptom duration is mandatory for clinical defensibility
          if (!state.symptomDuration)
            newErrors.symptomDuration = "Please indicate how long you've had these symptoms"
        } else if (state.service === "repeat-script" || state.service === "new-script") {
          if (!state.medicationName)
            newErrors.medicationName = "Please enter medication name"
          // Check for controlled substances - client-side (server also validates)
          if (state.medicationName && containsBlockedSubstance(state.medicationName)) {
            newErrors.medicationName = "This medication cannot be prescribed online. Please visit your GP."
          }
          // P1: lastPrescribed required for repeat scripts (clinical risk)
          if (state.service === "repeat-script" && !state.lastPrescribed) {
            newErrors.lastPrescribed = "Please indicate when this was last prescribed"
          }
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
        // P0 CN-1, CN-2: Require explicit telehealth consent per episode
        if (!state.telehealthConsentGiven) {
          newErrors.telehealthConsentGiven = "Please consent to the telehealth consultation"
        }
        if (!state.telehealthLimitationsAcknowledged) {
          newErrors.telehealthLimitationsAcknowledged = "Please acknowledge the limitations of telehealth"
        }
        if (!state.confirmedAccuracy) {
          newErrors.confirmedAccuracy = "Please confirm your information is accurate"
        }
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
      answers.symptom_duration = state.symptomDuration // P1 IC-1: Clinical defensibility
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

    // P0 CN-1, CN-2: Record consent for audit trail
    answers.telehealth_consent_given = state.telehealthConsentGiven
    answers.telehealth_limitations_acknowledged = state.telehealthLimitationsAcknowledged
    answers.accuracy_confirmed = state.confirmedAccuracy
    answers.terms_agreed = state.agreedToTerms
    answers.consent_timestamp = new Date().toISOString()

    // UTM attribution for ROI tracking
    const utmParams = getUTMParamsForIntake()
    if (utmParams) {
      answers.attribution = utmParams
    }

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
        const idempotencyKey = crypto.randomUUID()
        result = await createIntakeAndCheckoutAction({
          category,
          subtype,
          type: state.service || "consult",
          answers,
          idempotencyKey,
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
        logger.error("Checkout error", { errorMessage, component: 'EnhancedIntakeFlow' })
        
        // If authentication error, suggest signing in
        if (errorMessage.includes("logged in") || errorMessage.includes("Authentication")) {
          // Could trigger a sign-in modal here if needed
        }
      }
    } catch (error) {
      // PostHog: Track checkout exception
      posthog.captureException(error)
      const errorMessage = error instanceof Error ? error.message : "Something went wrong. Please try again."
      
      logger.error("Submit error", { component: 'EnhancedIntakeFlow' }, error instanceof Error ? error : undefined)
      
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

              {/* Duration with tiered pricing */}
              <FormField
                label="How many days?"
                required
                error={errors.duration}
                helpText={`1 day: $${PRICING.MED_CERT} · 2 days: $${PRICING.MED_CERT_2DAY} · 3+ days requires a consult`}
              >
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <SelectableChip
                      selected={state.duration === "1"}
                      onClick={() => updateField("duration", "1" as "1" | "2")}
                      className="flex-1 touch-target"
                    >
                      <span className="flex flex-col items-center gap-0.5">
                        <span>1 day</span>
                        <span className="text-[10px] font-normal opacity-70">${PRICING.MED_CERT}</span>
                      </span>
                    </SelectableChip>
                    <SelectableChip
                      selected={state.duration === "2"}
                      onClick={() => updateField("duration", "2" as "1" | "2")}
                      className="flex-1 touch-target"
                    >
                      <span className="flex flex-col items-center gap-0.5">
                        <span>2 days</span>
                        <span className="text-[10px] font-normal opacity-70">${PRICING.MED_CERT_2DAY}</span>
                      </span>
                    </SelectableChip>
                  </div>
                  
                  {/* GP comparison - subtle value anchor */}
                  <p className="text-[10px] text-muted-foreground text-center">
                    <span className="line-through opacity-60">{GP_COMPARISON.STANDARD} GP visit</span>
                    <span className="mx-1.5">→</span>
                    <span className="text-primary font-medium">
                      Save ${state.duration === "2" 
                        ? (60 - PRICING.MED_CERT_2DAY).toFixed(0)
                        : (60 - PRICING.MED_CERT).toFixed(0)}+
                    </span>
                  </p>
                  
                  {/* Discreet link for longer durations - shows interstitial before redirect */}
                  <button
                    type="button"
                    onClick={() => setShowExtendedDurationInterstitial(true)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
                  >
                    More than 2 days?
                  </button>
                </div>
              </FormField>

              {/* Start date - no backdating allowed */}
              <FormField
                label="Start date"
                required
                error={errors.startDate}
                hint="When does your absence start?"
                helpText="Medical certificates can only be issued from today onwards."
              >
                <div className="space-y-2">
                  <Input
                    type="date"
                    value={state.startDate}
                    onChange={(e) => {
                      updateField("startDate", e.target.value)
                    }}
                    className="h-11"
                    min={new Date().toISOString().split("T")[0]}
                    aria-label="Select start date for absence"
                  />
                </div>
              </FormField>

              {/* Symptoms - Multi-select chips */}
              <FormField
                label={state.certType === "carer" ? "What symptoms does the person you're caring for have?" : "What symptoms do you have?"}
                required
                error={errors.symptoms}
                hint="Select all that apply"
                helpText={state.certType === "carer" ? "Describe the symptoms of the person you're caring for" : "This helps our doctors understand your condition and provide appropriate care"}
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

              {/* P1 IC-1: Symptom duration - Per MEDICOLEGAL_AUDIT_REPORT */}
              <FormField
                label={state.certType === "carer" ? "How long have they had these symptoms?" : "How long have you had these symptoms?"}
                required
                error={errors.symptomDuration}
                hint="This helps assess whether the condition is acute or ongoing"
              >
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "less_than_24h", label: "Less than 24 hours" },
                    { value: "1_2_days", label: "1-2 days" },
                    { value: "3_5_days", label: "3-5 days" },
                    { value: "1_week_plus", label: "1 week or more" },
                  ].map((option) => (
                    <SelectableChip
                      key={option.value}
                      selected={state.symptomDuration === option.value}
                      onClick={() => updateField("symptomDuration", option.value)}
                      gradient="primary-subtle"
                    >
                      {option.label}
                    </SelectableChip>
                  ))}
                </div>
              </FormField>

              {/* Additional details - Required */}
              <FormField
                label={state.certType === "carer" ? "Tell us more about their condition" : "Tell us more about your symptoms"}
                required
                hint={state.certType === "carer" ? "Describe what the person you're caring for is experiencing" : "This helps our doctors understand your situation"}
                example={state.certType === "carer" ? "My child has had a fever since yesterday and needs care at home" : "Started feeling unwell yesterday evening, have been resting since"}
                error={errors.symptomDetails}
              >
                <EnhancedTextarea
                  label=""
                  value={state.symptomDetails}
                  onChange={(value) => updateField("symptomDetails", value)}
                  placeholder={state.certType === "carer" ? "Describe what the person you're caring for is experiencing..." : "Describe your symptoms and how you're feeling..."}
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
                example="I need a new prescription for acne treatment, or I want to discuss adjusting my blood pressure medication"
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
                    • eScript sent to your phone via SMS
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

            {/* Controlled substance warning */}
            {state.medicationName && containsBlockedSubstance(state.medicationName) && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Controlled Substance</AlertTitle>
                <AlertDescription>
                  This medication cannot be prescribed through our online service.
                  Schedule 8 and controlled substances require an in-person consultation with your regular GP.
                </AlertDescription>
              </Alert>
            )}

            {errors.medicationName && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errors.medicationName}
              </p>
            )}

            {/* Dosage */}
            <FormField label="Dosage & strength (if known)">
              <Input
                value={state.medicationDosage}
                onChange={(e) => updateField("medicationDosage", e.target.value)}
                placeholder="e.g., 500mg twice daily"
                className="h-11"
              />
            </FormField>

            {/* When last prescribed - REQUIRED for repeat scripts */}
            <FormField
              label="When was this last prescribed?"
              required={state.service === "repeat-script"}
              error={errors.lastPrescribed}
              hint={state.service === "repeat-script" ? "Required for repeat prescriptions" : undefined}
            >
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
            </FormField>

            {/* P2 RX-1: Medication adherence attestation per MEDICOLEGAL_AUDIT_REPORT */}
            {state.service === "repeat-script" && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Attestation:</strong> By requesting this repeat prescription, I confirm I am currently taking this medication as prescribed by my regular doctor and have not experienced any significant side effects.
                </p>
              </div>
            )}

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
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 rounded-xl">
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
      // Progressive disclosure: show fields sequentially on mobile to reduce cognitive load
      case "account": {
        const hasValidName = state.firstName && state.lastName
        const hasValidEmail = state.email && state.email.includes("@")
        const hasValidPhone = state.phone && state.phone.replace(/\D/g, "").length >= 10
        
        return (
          <motion.div className="space-y-4">
            {/* Step 1: Name - always visible */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="First name"
                required
                error={errors.firstName}
              >
                <div className="relative">
                  <Input
                    value={state.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    placeholder="John"
                    className={cn(
                      "h-11 pr-8 transition-colors",
                      state.firstName && !errors.firstName && "border-green-500/50"
                    )}
                    autoComplete="given-name"
                  />
                  {state.firstName && !errors.firstName && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                </div>
              </FormField>
              <FormField label="Last name" required error={errors.lastName}>
                <div className="relative">
                  <Input
                    value={state.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    placeholder="Smith"
                    className={cn(
                      "h-11 pr-8 transition-colors",
                      state.lastName && !errors.lastName && "border-green-500/50"
                    )}
                    autoComplete="family-name"
                  />
                  {state.lastName && !errors.lastName && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                </div>
              </FormField>
            </div>

            {/* Step 2: Email - shows after name is valid (progressive disclosure) */}
            <motion.div
              initial={hasValidName ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
              animate={hasValidName ? { opacity: 1, height: "auto" } : { opacity: 0.4, height: "auto" }}
              transition={{ duration: 0.2 }}
            >
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
                  disabled={!hasValidName}
                />
              </FormField>
            </motion.div>

            {/* Step 3: Phone - shows after email is valid */}
            <motion.div
              initial={hasValidEmail ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
              animate={hasValidEmail ? { opacity: 1, height: "auto" } : { opacity: 0.4, height: "auto" }}
              transition={{ duration: 0.2 }}
            >
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
                  disabled={!hasValidEmail}
                />
              </FormField>
            </motion.div>

            {/* Step 4: DOB - shows after phone is valid */}
            <motion.div
              initial={hasValidPhone ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
              animate={hasValidPhone ? { opacity: 1, height: "auto" } : { opacity: 0.4, height: "auto" }}
              transition={{ duration: 0.2 }}
            >
              <FormField
                label="Date of birth"
                required
                error={errors.dob}
                hint="You must be 18 or older"
              >
                <div className="space-y-1">
                  <Input
                    type="date"
                    value={state.dob}
                    onChange={(e) => updateField("dob", e.target.value)}
                    className={cn(
                      "h-11 touch-target transition-colors",
                      state.dob && !errors.dob && "border-green-500/50"
                    )}
                    max={new Date().toISOString().split("T")[0]}
                    autoComplete="bday"
                    disabled={!hasValidPhone}
                  />
                  {/* Real-time DOB validation feedback */}
                  {state.dob && !errors.dob && (
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Age verified
                    </p>
                  )}
                </div>
              </FormField>
            </motion.div>
          </motion.div>
        )
      }

      // ======= REVIEW =======
      case "review": {
        const selectedService = SERVICES.find((s) => s.id === state.service)
        
        return (
          <motion.div className="space-y-4" data-intake-form>
            {/* Trust indicator - single, clean */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>AHPRA-registered doctors</span>
            </div>

            {/* Summary card - Enhanced with edit capability */}
            <div className="p-5 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
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
                    {state.service === "med-cert" && selectedService?.basePrice && selectedService?.twoDayPrice
                      ? `$${(state.duration === "2" ? selectedService.twoDayPrice : selectedService.basePrice).toFixed(2)}`
                      : selectedService?.price}
                  </span>
                  <p className="text-xs text-muted-foreground">One-time payment</p>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{selectedService?.title}</span>
                  <span>
                    {state.service === "med-cert" && selectedService?.basePrice && selectedService?.twoDayPrice
                      ? `$${(state.duration === "2" ? selectedService.twoDayPrice : selectedService.basePrice).toFixed(2)}`
                      : selectedService?.price}
                  </span>
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
                <div className="flex justify-between font-semibold text-base pt-2 border-t border-dashed border-slate-200 dark:border-slate-700">
                  <span>Total</span>
                  <span className="text-primary">
                    {(() => {
                      // Calculate base price - for med certs, use duration-based pricing
                      let basePrice: number
                      if (state.service === "med-cert" && selectedService?.basePrice && selectedService?.twoDayPrice) {
                        basePrice = state.duration === "2" ? selectedService.twoDayPrice : selectedService.basePrice
                      } else {
                        basePrice = parseFloat(selectedService?.price?.replace('$', '').replace('From ', '') || '0')
                      }
                      
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

              {/* Payment Methods - using shared component */}
              <div className="flex flex-col items-center gap-1 pt-3">
                <PaymentMethodIcons size="sm" />
              </div>
            </div>

            {/* Patient info - Editable */}
            <GlassCard variant="default" size="sm" hover="lift" className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Sending to:</p>
                <motion.button
                  onClick={() => setEditingSection(editingSection === "patient" ? null : "patient")}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors touch-target"
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
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors touch-target"
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
                        {["1", "2"].map((d) => (
                          <SelectableChip
                            key={d}
                            selected={state.duration === d}
                            onClick={() => updateField("duration", d as "1" | "2")}
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

            {/* What happens next - simplified */}
            <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl text-xs text-muted-foreground space-y-1.5">
              <p><strong className="text-foreground">After payment:</strong> A doctor reviews your request within 1 hour (Mon-Fri 8am-8pm AEST).</p>
              <p>You&apos;ll receive your result via email and SMS. If a call is needed, we&apos;ll contact you first.</p>
            </div>

            {/* Payment disclaimer - P0 compliance */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Important:</strong> Your payment covers the doctor&apos;s review. If your request isn&apos;t suitable for telehealth, you&apos;ll receive a full refund.
              </p>
            </div>

            {/* Combined consent toggle - telehealth + accuracy + terms */}
            <div className="p-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border-2 border-white/40 dark:border-white/10">
              <IOSToggle
                checked={state.telehealthConsentGiven && state.telehealthLimitationsAcknowledged && state.confirmedAccuracy && state.agreedToTerms}
                onChange={(checked) => {
                  updateField("telehealthConsentGiven", checked)
                  updateField("telehealthLimitationsAcknowledged", checked)
                  updateField("confirmedAccuracy", checked)
                  updateField("agreedToTerms", checked)
                }}
                label="I confirm and agree"
                description={
                  <span>
                    I consent to this telehealth consultation, confirm my information is accurate, and agree to the{" "}
                    <a href="/terms" className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">
                      Terms
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">
                      Privacy Policy
                    </a>.
                  </span>
                }
                size="md"
              />
            </div>
            {errors.agreedToTerms && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="text-xs">{errors.agreedToTerms}</AlertDescription>
              </Alert>
            )}

            {/* Refund guarantee badge - visible at checkout moment */}
            <RefundGuaranteeBadge variant="inline" className="mt-2" />

            {/* Social proof at decision point */}
            <div className="flex justify-center">
              <SocialProofCheckout variant="badge" />
            </div>

            {/* Trust note - calm, not salesy */}
            <div className="text-center text-xs text-slate-500 dark:text-slate-400">
              Reviewed by AHPRA-registered Australian doctors
            </div>
          </motion.div>
        )
      }
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
    <div className="h-screen bg-linear-to-b from-slate-50 via-blue-50/30 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col overflow-hidden">
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
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 overflow-y-auto scrollbar-hide">
        {/* Extended Duration Interstitial - shown when user clicks "More than 2 days" */}
        {showExtendedDurationInterstitial && (
          <ExtendedDurationInterstitial
            preservedData={{
              certType: state.certType || undefined,
              symptoms: state.symptoms,
              symptomDetails: state.symptomDetails,
              startDate: state.startDate || undefined,
              email: state.email,
            }}
            onGoBack={() => setShowExtendedDurationInterstitial(false)}
          />
        )}

        {/* Trust signals - shown on all steps for high-intent user reassurance */}
        {!showExtendedDurationInterstitial && step !== "service" && (
          <CompactTrustStrip className="mb-3" />
        )}

        {/* Price summary chip - visible after service selection */}
        {!showExtendedDurationInterstitial && state.service && step !== "service" && step !== "review" && (
          <div className="flex justify-center mb-3">
            <PriceSummaryChip service={state.service} duration={state.duration ?? undefined} />
          </div>
        )}

        {/* Step title */}
        {!showExtendedDurationInterstitial && (
          <motion.div
            key={step + "-title"}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-4"
          >
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </motion.div>
        )}

        {/* Step content */}
        {!showExtendedDurationInterstitial && (
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
        )}
      </main>

      {/* Footer CTA - fixed position at bottom of flex container */}
      <footer className="shrink-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-white/40 dark:border-white/10 px-4 py-3 pb-safe">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-center gap-3">
            {stepIndex > 0 && (
              <button
                onClick={goBack}
                disabled={isSubmitting}
                className="shrink-0 w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow hover:scale-105 active:scale-95 flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
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
                  Pay {(() => {
                    const svc = SERVICES.find((s) => s.id === state.service)
                    if (state.service === "med-cert" && svc?.basePrice && svc?.twoDayPrice) {
                      return `$${(state.duration === "2" ? svc.twoDayPrice : svc.basePrice).toFixed(2)}`
                    }
                    return svc?.price
                  })()}
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
          <div className="mt-2 space-y-2">
            <ReassuranceStrip 
              variant="compact" 
              showItems={
                state.service 
                  ? SERVICES.find(s => s.id === state.service)?.noCall 
                    ? ['no-account', 'no-call', 'refund'] 
                    : ['no-account', 'refund']
                  : ['no-account', 'refund']
              } 
            />
            <SocialProofStrip variant="minimal" />
          </div>
        )}
      </footer>
    </div>
  )
}
