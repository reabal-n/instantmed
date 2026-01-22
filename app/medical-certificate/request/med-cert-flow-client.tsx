"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useConfetti as _useConfetti } from "@/components/effects/confetti"
import { ShakeAnimation } from "@/components/effects/shake-animation"
import { RefundGuaranteeBadge } from "@/components/checkout/refund-guarantee-badge"
import { Input } from "@/components/ui/input"
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  AlertCircle,
  Check,
  FileText,
  Shield,
  Pencil as _Pencil,
  Calendar,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Lock,
  BadgeCheck,
  Phone,
} from "lucide-react"
import { createIntakeAndCheckoutAction } from "@/lib/stripe/checkout"
import { createClient } from "@/lib/supabase/client"
import { createOrGetProfile } from "@/app/actions/create-profile"
import type { User } from "@supabase/supabase-js"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { MICROCOPY } from "@/lib/microcopy/med-cert"
import { PRICING } from "@/lib/constants"
import { TagsSelector } from "@/components/ui/tags-selector"
import { SmartSymptomInput, isSymptomInputValid } from "@/components/intake/smart-symptom-input"
// SmartValidation removed - simplified checkout flow
import { AvailabilityIndicator as _AvailabilityIndicator } from "@/components/shared/availability-indicator"
import { createGuestCheckoutAction } from "@/lib/stripe/guest-checkout"
import { AnimatedSelect } from "@/components/ui/animated-select"
import { SessionProgress } from "@/components/shell"
import posthog from "posthog-js"

// Storage key for form persistence
const STORAGE_KEY = "instantmed_medcert_draft"
const DRAFT_EXPIRY_HOURS = 24

// Flow steps - streamlined checkout
type FlowStep =
  | "type"
  | "duration"
  | "startDate"
  | "symptoms"
  | "review"

// Updated steps - streamlined flow (payment step removed - review triggers checkout)
const STEPS: FlowStep[] = [
  "type",
  "duration",
  "startDate",
  "symptoms",
  "review",
]

// Certificate types with emojis
const CERT_TYPES = [
  { id: "work", label: MICROCOPY.type.work.label, emoji: "💼", description: MICROCOPY.type.work.description },
  { id: "uni", label: MICROCOPY.type.uni.label, emoji: "📚", description: MICROCOPY.type.uni.description },
  { id: "carer", label: MICROCOPY.type.carer.label, emoji: "❤️", description: MICROCOPY.type.carer.description },
] as const

// Duration options with icons and pricing for AnimatedSelect
const DURATION_OPTIONS = [
  { value: "1", label: `${MICROCOPY.duration.options["1"]} · $${PRICING.MED_CERT}`, icon: CalendarDays, color: "#10B981" },
  { value: "2", label: `${MICROCOPY.duration.options["2"]} · $${PRICING.MED_CERT_2DAY}`, icon: CalendarDays, color: "#4f46e5" },
  { value: "3", label: `${MICROCOPY.duration.options["3"]} · Consult required`, icon: CalendarDays, color: "#3B82F6" },
  { value: "4-7", label: `${MICROCOPY.duration.options["4-7"]} · Consult required`, icon: CalendarRange, color: "#4f46e5" },
  { value: "1-2weeks", label: `${MICROCOPY.duration.options["1-2weeks"]} · Consult required`, icon: CalendarRange, color: "#EC4899" },
  { value: "specific", label: MICROCOPY.duration.options["specific"], icon: CalendarClock, color: "#F59E0B" },
] as const

// Symptoms
const SYMPTOMS = ["Headache", "Fever", "Nausea", "Pain", "Fatigue", "Cold/Flu", "Gastro", "Other"] as const

// Relationships for carer's certificate
const RELATIONSHIPS = ["Parent", "Child", "Partner", "Sibling", "Grandparent", "Other"] as const

interface MedCertFlowClientProps {
  patientId: string | null
  isAuthenticated: boolean
  needsOnboarding: boolean
  userEmail?: string
  userName?: string
}

// Google icon component
function _GoogleIcon({ className }: { className?: string }) {
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

// Progress indicator component with animated dots and time estimate
function _ProgressIndicator({
  steps,
  currentIndex,
}: {
  steps: readonly string[]
  currentIndex: number
}) {
  // Estimate remaining time based on steps left
  const stepsRemaining = steps.length - currentIndex
  const estimatedMinutes = Math.max(1, stepsRemaining) // ~1 min per step

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
        {/* Step label with time estimate */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Step {currentIndex + 1} of {steps.length}</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="text-primary/70">~{estimatedMinutes} min left</span>
        </div>
      </div>
    </nav>
  )
}

// Trust indicators strip for telehealth compliance
function TrustStrip() {
  return (
    <div className="flex items-center justify-center gap-4 py-2 text-xs text-muted-foreground" role="region" aria-label="Trust indicators">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-help">
            <BadgeCheck className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />
            <span>AHPRA Doctors</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">All our doctors are registered with AHPRA</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-help">
            <Lock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span>256-bit encrypted</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Your data is protected with bank-grade encryption</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-help">
            <Shield className="w-3.5 h-3.5 text-purple-600" aria-hidden="true" />
            <span>Privacy compliant</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">We follow Australian healthcare privacy standards</p>
        </TooltipContent>
      </Tooltip>
    </div>
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

// Error message component with shake animation
function ErrorMessage({
  message,
  onDismiss,
  id,
  shake = true,
}: {
  message: string
  onDismiss?: () => void
  id?: string
  shake?: boolean
}) {
  return (
    <ShakeAnimation trigger={shake} intensity="light" duration={0.4}>
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
    </ShakeAnimation>
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
        w-full min-h-[48px] p-4 rounded-2xl border-2 transition-all duration-300
        flex items-center gap-3 text-left
        focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2
        ${
          selected
            ? "border-sky-300/60 dark:border-sky-600/40 bg-sky-50/80 dark:bg-sky-900/20 shadow-[0_2px_8px_rgba(138,187,224,0.15)]"
            : "bg-white/90 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-700/40 hover:border-slate-300 hover:bg-white"
        }
        ${className}
      `}
    >
      {emoji && (
        <span className="text-2xl">{emoji}</span>
      )}
      {Icon && !emoji && (
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
            selected 
              ? "bg-sky-100 dark:bg-sky-800/40 text-sky-600 dark:text-sky-400" 
              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
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
      {selected && (
        <div className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-800/40 flex items-center justify-center">
          <Check className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
        </div>
      )}
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
        min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
        focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${
          selected
            ? "bg-sky-50 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200 border-2 border-sky-300/60 dark:border-sky-600/40 shadow-[0_2px_8px_rgba(138,187,224,0.15)]"
            : "bg-white/90 dark:bg-slate-900/60 border-2 border-slate-200/60 dark:border-slate-700/40 hover:border-slate-300 hover:bg-white text-slate-700 dark:text-slate-300"
        }
      `}
    >
      {label}
    </button>
  )
}

export function MedCertFlowClient({
  patientId: initialPatientId,
  isAuthenticated: initialIsAuthenticated,
  needsOnboarding: initialNeedsOnboarding,
  userEmail,
  userName,
}: MedCertFlowClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const mainRef = useRef<HTMLElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const _searchParams = useSearchParams() // Added for guest checkout redirection
  
  // Supabase auth state
  const [user, setUser] = useState<User | null>(null)
  const [, setIsLoading] = useState(true)
  const _isSignedIn = !!user

  // Auth state
  const [_patientId, setPatientId] = useState<string | null>(initialPatientId)
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated)
  const [_needsOnboarding, setNeedsOnboarding] = useState(initialNeedsOnboarding)

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
    symptomDescription: "", // Mandatory symptom description for AI and certificate
    carerPatientName: "",
    carerRelationship: null as string | null,
    additionalNotes: "", // Notes for the doctor
    fullName: userName || "", // Patient full name
    guestEmail: "", // For guest checkout email collection
    email: userEmail || "", // For authenticated user display
    dateOfBirth: "", // Optional - collected during onboarding, not checkout
    // Moved safety answers to a separate object
    safetyAnswers: {} as Record<string, boolean>,
  })

  // Flow state
  const [step, setStep] = useState<FlowStep>("type")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [_isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const isCarer = formData.certType === "carer"

  // Auto-save draft to localStorage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only save if we have meaningful data
      if (formData.certType || formData.selectedSymptoms.length > 0) {
        const draft = {
          formData,
          step,
          savedAt: Date.now(),
        }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
          setLastSaved(new Date())
        } catch {
          // localStorage might be full or disabled
        }
      }
    }, 1000) // Save 1 second after last change

    return () => clearTimeout(timer)
  }, [formData, step])

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const draft = JSON.parse(saved)
        const hoursSinceSave = (Date.now() - draft.savedAt) / (1000 * 60 * 60)
        if (hoursSinceSave < DRAFT_EXPIRY_HOURS && draft.formData?.certType) {
          setShowRecoveryPrompt(true)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // Restore draft handler
  const restoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const draft = JSON.parse(saved)
        setFormData(draft.formData)
        setStep(draft.step)

        // PostHog: Track draft recovery
        posthog.capture("draft_recovered", {
          draft_step: draft.step,
          cert_type: draft.formData?.certType,
        })
      }
    } catch {
      // Ignore errors
    }
    setShowRecoveryPrompt(false)
  }, [])

  // Clear draft and start fresh
  const startFresh = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setShowRecoveryPrompt(false)
  }, [])

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
  const _selectCertType = useCallback((t: string) => {
    setFormData((prev) => ({ ...prev, certType: t }))
    setTimeout(() => setStep("duration"), 200)
  }, [])

  const _selectDuration = useCallback((d: string) => {
    setFormData((prev) => ({ ...prev, duration: d }))
    if (d !== "specific") {
      // Automatically advance to startDate if duration is not specific
      setTimeout(() => setStep("startDate"), 200)
    }
  }, [])

  // Progress calculation - maps 5 steps to 2 progress stages
  const getCurrentStepIndex = () => {
    const index = STEPS.indexOf(step)
    // type(0), duration(1), startDate(2), symptoms(3) = Details
    // review(4) = Review & Pay
    if (index <= 3) return 0 // Details
    return 1 // Review & Pay
  }

  // Simplified progress steps - Details then Review/Pay
  const progressSteps = ["Details", "Review & Pay"] as const
  const currentProgressIndex = getCurrentStepIndex()

  // Navigation
  const goNext = useCallback(() => {
    setError(null)
    const currentIndex = STEPS.indexOf(step)

    // PostHog: Track step-specific events
    if (step === "type" && formData.certType) {
      posthog.capture("med_cert_type_selected", {
        cert_type: formData.certType,
        is_authenticated: isAuthenticated,
      })
    } else if (step === "duration" && formData.duration) {
      const priceTier = formData.duration === "2" ? "2_day" : "1_day"
      const price = formData.duration === "2" ? PRICING.MED_CERT_2DAY : PRICING.MED_CERT
      posthog.capture("med_cert_duration_selected", {
        duration_days: formData.duration,
        price_tier: priceTier,
        price_amount: price,
        cert_type: formData.certType,
      })
    } else if (step === "symptoms") {
      posthog.capture("med_cert_symptoms_entered", {
        symptoms_count: formData.selectedSymptoms.length,
        has_custom_details: !!formData.otherSymptom,
        safety_confirmed: formData.safetyAnswers.notEmergency === true,
      })
    }

    // Simple navigation - just go to next step
    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1])
    }
  }, [step, formData, isAuthenticated])

  const goBack = useCallback(() => {
    setError(null)
    const currentIndex = STEPS.indexOf(step)

    // Simple navigation - just go to previous step
    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1])
    }
  }, [step])

  const goToStep = (targetStep: FlowStep) => {
    setError(null)
    setStep(targetStep)
  }

  // Check Supabase auth session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)
        
        if (currentUser && !isAuthenticated) {
          const userMetadata = currentUser.user_metadata || {}
          // Retrieve pending profile data from sessionStorage (set before auth redirect)
          const pendingName = sessionStorage.getItem("pending_profile_name")
          const pendingDob = sessionStorage.getItem("pending_profile_dob")

          const { profileId } = await createOrGetProfile(
            currentUser.id,
            pendingName || userMetadata.full_name || userMetadata.name || currentUser.email?.split('@')[0] || "",
            pendingDob || "",
          )

          if (profileId) {
            // Clear pending profile data from sessionStorage
            sessionStorage.removeItem("pending_profile_name")
            sessionStorage.removeItem("pending_profile_dob")
            sessionStorage.removeItem("questionnaire_flow")
            sessionStorage.removeItem("questionnaire_path")

            setPatientId(profileId)
            setIsAuthenticated(true)
            setNeedsOnboarding(false)

            const urlParams = new URLSearchParams(window.location.search)
            if (urlParams.get("auth_success") === "true") {
              // Remove the query param
              window.history.replaceState({}, "", window.location.pathname)
              // Continue to review after auth
              if (step === "symptoms") {
                goNext()
              }
            }
          }
        }
      } catch (_error) {
        // Error checking session
      } finally {
        setIsLoading(false)
      }
    }
    
    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      
      if (session?.user && !isAuthenticated) {
        const userMetadata = session.user.user_metadata || {}
        // Retrieve pending profile data from sessionStorage (set before auth redirect)
        const pendingName = sessionStorage.getItem("pending_profile_name")
        const pendingDob = sessionStorage.getItem("pending_profile_dob")

        const { profileId } = await createOrGetProfile(
          session.user.id,
          pendingName || userMetadata.full_name || userMetadata.name || session.user.email?.split('@')[0] || "",
          pendingDob || "",
        )

        if (profileId) {
          // Clear pending profile data from sessionStorage
          sessionStorage.removeItem("pending_profile_name")
          sessionStorage.removeItem("pending_profile_dob")
          sessionStorage.removeItem("questionnaire_flow")
          sessionStorage.removeItem("questionnaire_path")

          setPatientId(profileId)
          setIsAuthenticated(true)
          setNeedsOnboarding(false)

          const urlParams = new URLSearchParams(window.location.search)
          if (urlParams.get("auth_success") === "true") {
            window.history.replaceState({}, "", window.location.pathname)
            if (step === "symptoms") {
              goNext()
            }
          }
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, isAuthenticated, step, goNext])

  const _toggleSymptom = (symptom: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedSymptoms: prev.selectedSymptoms.includes(symptom)
        ? prev.selectedSymptoms.filter((s) => s !== symptom)
        : [...prev.selectedSymptoms, symptom],
    }))
  }

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
      case "symptoms": {
        // Must have symptom description (min 10 chars) and emergency confirmation
        const hasValidDescription = isSymptomInputValid(formData.symptomDescription, 10)
        if (isCarer) {
          return (
            hasValidDescription &&
            !!formData.carerPatientName &&
            !!formData.carerRelationship &&
            formData.safetyAnswers.notEmergency === true
          )
        }
        return hasValidDescription && formData.safetyAnswers.notEmergency === true
      }
      case "review":
        return true
      default:
        return false
    }
  }

  // Google auth
  const _handleGoogleAuth = async () => {
    setIsGoogleLoading(true)
    setError(null)

    try {
      sessionStorage.setItem("questionnaire_flow", "true")
      sessionStorage.setItem("questionnaire_path", window.location.pathname)
      // Preserve dateOfBirth for signup
      sessionStorage.setItem("pending_profile_dob", formData.dateOfBirth)
      sessionStorage.setItem("pending_profile_name", formData.fullName || "") // Store full name for profile creation

      router.push(`/sign-in?redirect=${encodeURIComponent(window.location.href)}`)
      setIsGoogleLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : MICROCOPY.errors.signIn)
      setIsGoogleLoading(false)
    }
  }

  // Guest checkout handler
  const handleGuestCheckout = async () => {
    setIsSubmitting(true)
    setError(null)

    // PostHog: Track checkout initiated (guest)
    posthog.capture("med_cert_checkout_initiated", {
      checkout_type: "guest",
      cert_type: formData.certType,
      duration_days: formData.duration,
      symptoms_count: formData.selectedSymptoms.length,
    })

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
        },
      })

      if (!result.success) {
        throw new Error(result.error || MICROCOPY.errors.payment)
      }

      if (!result.checkoutUrl) {
        throw new Error("No checkout URL received. Please try again.")
      }

      window.location.href = result.checkoutUrl
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
      setStep("review")
      return
    }

    // PostHog: Track checkout initiated (authenticated)
    posthog.capture("med_cert_checkout_initiated", {
      checkout_type: "authenticated",
      cert_type: formData.certType,
      duration_days: formData.duration,
      symptoms_count: formData.selectedSymptoms.length,
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
    }

    try {
      // Create request and redirect to Stripe checkout (authenticated users only)
      const result = await createIntakeAndCheckoutAction({
        category: "medical_certificate",
        subtype: formData.certType || "work",
        type: "med_cert",
        answers,
      })

      if (!result.success) {
        throw new Error(result.error || MICROCOPY.errors.payment)
      }

      if (!result.checkoutUrl) {
        throw new Error("No checkout URL received. Please try again.")
      }

      window.location.href = result.checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : MICROCOPY.errors.generic)
      setIsSubmitting(false)
    }
  }

  // Handle proceeding to payment - actually submits the request and creates checkout
  const handleProceedToPayment = async () => {
    // For guests: validate email and proceed to guest checkout
    if (!isAuthenticated) {
      if (!formData.guestEmail && !formData.email) {
        setError("Please provide an email address to receive your certificate.")
        return
      }
      // Proceed to guest checkout if email is provided
      await handleGuestCheckout()
      return
    }

    // For authenticated users: directly submit and create checkout
    // This actually processes the payment, not just changes the step
    await handleSubmit()
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
              title="What's the certificate for?"
              subtitle="Select one option"
              stepNumber={STEPS.indexOf("type") + 1}
              totalSteps={STEPS.length}
            />

            <div className="space-y-2" role="radiogroup" aria-label="Certificate type">
              {CERT_TYPES.map((type) => (
                <TileButton
                  key={type.id}
                  selected={formData.certType === type.id}
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, certType: type.id }))
                    // Auto-advance after selection for smoother UX
                    setTimeout(() => setStep("duration"), 250)
                  }}
                  emoji={type.emoji}
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

            <AnimatedSelect
              options={DURATION_OPTIONS.map((opt) => ({
                id: opt.value,
                label: opt.label,
                icon: opt.icon,
                color: opt.color,
              }))}
              value={formData.duration || undefined}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, duration: value }))
                // Auto-advance for preset durations, not for "specific"
                if (value !== "specific") {
                  setTimeout(() => setStep("startDate"), 300)
                }
              }}
              placeholder="Select duration..."
            />
            
            {/* GP comparison - subtle value anchor */}
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              <span className="line-through opacity-60">$60–90 GP visit</span>
              <span className="mx-1.5">→</span>
              <span className="text-primary font-medium">
                Save ${formData.duration === "2" 
                  ? (60 - PRICING.MED_CERT_2DAY).toFixed(0)
                  : (60 - PRICING.MED_CERT).toFixed(0)}+
              </span>
            </p>

            {formData.duration === "specific" && (
              <fieldset className="space-y-3 p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_4px_16px_rgb(0,0,0,0.04)]">
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
              <Input
                id="start-date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                min={new Date().toISOString().split("T")[0]}
                className="h-12"
                startContent={<Calendar className="w-4 h-4 text-muted-foreground" />}
              />
              <p className="text-xs text-muted-foreground">
                Medical certificates can only be issued from today onwards
              </p>
            </div>
          </section>
        )

      case "symptoms":
        return (
          <section aria-labelledby="step-symptoms-heading" className="space-y-5 animate-step-enter">
            <StepHeader
              emoji={isCarer ? "🩺" : "🤒"}
              title={isCarer ? "Tell us about their condition" : "Tell us about your symptoms"}
              subtitle="This helps our doctors help you faster"
            />

            {/* Carer details */}
            {isCarer && (
              <fieldset className="space-y-3 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_4px_16px_rgb(0,0,0,0.04)]">
                <legend className="sr-only">Person being cared for</legend>
                <div className="space-y-1">
                  <Label htmlFor="carer-name" className="text-sm font-medium">
                    Who are you caring for?
                  </Label>
                  <Input
                    id="carer-name"
                    placeholder="Their full name"
                    value={formData.carerPatientName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, carerPatientName: e.target.value }))}
                    className="h-11 rounded-xl"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Your relationship</Label>
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

            {/* Quick symptom selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {isCarer ? "Select symptoms they have" : "Select your symptoms"} (optional)
              </Label>
              <TagsSelector
                tags={SYMPTOMS.map((s) => ({ id: s, label: s }))}
                value={formData.selectedSymptoms.map((s) => ({ id: s, label: s }))}
                onChange={(tags) => setFormData((prev) => ({ ...prev, selectedSymptoms: tags.map((t) => t.label) }))}
                placeholder="Tap to select..."
              />
            </div>

            {/* Mandatory symptom description with AI assistance */}
            <SmartSymptomInput
              value={formData.symptomDescription}
              onChange={(value) => setFormData((prev) => ({ ...prev, symptomDescription: value }))}
              context="med_cert"
              isCarer={isCarer}
              minLength={10}
              maxLength={500}
              required={true}
              helperText="Please describe your symptoms in detail (minimum 10 characters)"
            />

            {/* Safety confirmation - calm, serious tone */}
            <div className="p-4 rounded-2xl bg-ivory-100 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Important</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    If you&apos;re experiencing a medical emergency, call 000.
                  </p>
                </div>
              </div>
              
              {/* iOS-style toggle for safety confirmation */}
              <label className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/80 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-700/30 cursor-pointer">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    This is not a medical emergency
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 block">
                    I understand this is a non-urgent telehealth service
                  </span>
                </div>
                <div 
                  role="switch"
                  aria-checked={formData.safetyAnswers.notEmergency === true}
                  onClick={() => setFormData((prev) => ({ 
                    ...prev, 
                    safetyAnswers: { ...prev.safetyAnswers, notEmergency: !prev.safetyAnswers.notEmergency } 
                  }))}
                  onKeyDown={(e) => e.key === 'Enter' && setFormData((prev) => ({ 
                    ...prev, 
                    safetyAnswers: { ...prev.safetyAnswers, notEmergency: !prev.safetyAnswers.notEmergency } 
                  }))}
                  tabIndex={0}
                  className={`relative inline-flex h-8 w-[52px] shrink-0 cursor-pointer rounded-full border transition-all duration-300 ${
                    formData.safetyAnswers.notEmergency 
                      ? "bg-[#6BBF8A] border-[#6BBF8A]/40" 
                      : "bg-slate-200/80 dark:bg-slate-700/60 border-slate-300/30 dark:border-slate-600/30"
                  }`}
                >
                  <span 
                    className={`pointer-events-none inline-block h-[26px] w-[26px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition-transform duration-300 mt-[2px] ${
                      formData.safetyAnswers.notEmergency ? "translate-x-[24px]" : "translate-x-[2px]"
                    }`}
                  />
                </div>
              </label>
              
              {formData.safetyAnswers.notEmergency && (
                <div className="flex items-center gap-2 text-[#6BBF8A]">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Ready to continue</span>
                </div>
              )}
            </div>
          </section>
        )

      case "review": {
        return (
          <section aria-labelledby="step-review-heading" className="space-y-4">
            <StepHeader
              title="Review & pay"
              subtitle="Check your details before submitting"
              stepNumber={STEPS.indexOf("review") + 1}
              totalSteps={STEPS.length}
            />

            {/* Email input FIRST for guests - most important */}
            {!isAuthenticated && (
              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
                <Label htmlFor="guest-email" className="text-sm font-semibold mb-2 block">
                  Your email address
                </Label>
                <Input
                  id="guest-email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.guestEmail}
                  onChange={(e) => setFormData((prev) => ({ ...prev, guestEmail: e.target.value }))}
                  required
                  autoFocus
                  className="h-12 rounded-xl text-base"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  We&apos;ll send your certificate here
                </p>
              </div>
            )}

            {/* Compact summary */}
            <div className="rounded-xl border border-border bg-white p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Certificate</span>
                <span className="font-medium">{getCertTypeLabel()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{getDurationLabel()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Start date</span>
                <span className="font-medium">{formatDate(formData.startDate)}</span>
              </div>
              {formData.symptomDescription && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reason</span>
                  <span className="font-medium truncate max-w-[200px]">{formData.symptomDescription}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => goToStep("type")}
                className="text-xs text-primary hover:underline mt-2"
              >
                Edit details
              </button>
            </div>

            {/* Price and what's included */}
            <div className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">
                  ${formData.duration === "2" ? PRICING.MED_CERT_2DAY.toFixed(2) : PRICING.MED_CERT.toFixed(2)}
                </span>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <span>Reviewed by a doctor</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <span>Emailed within 1 hour</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <span>Full refund if declined</span>
                </div>
              </div>
            </div>

            {/* Refund guarantee badge - prominent trust signal */}
            <RefundGuaranteeBadge variant="inline" className="mt-2" />
          </section>
        )
      }

      default:
        return null
    }
  }

  return (
    <TooltipProvider>
      {/* Draft Recovery Prompt */}
      {showRecoveryPrompt && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Welcome back!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                You have an unfinished request. Would you like to continue where you left off?
              </p>
              <div className="space-y-2">
                <Button onClick={restoreDraft} className="w-full h-12 rounded-xl">
                  Continue my request
                </Button>
                <Button onClick={startFresh} variant="outline" className="w-full h-12 rounded-xl">
                  Start fresh
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main
        ref={mainRef}
        tabIndex={-1}
        className="h-screen bg-background flex flex-col overflow-hidden"
        aria-label="Medical certificate request"
      >
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2">
          <div className="max-w-md mx-auto space-y-2">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-sm font-semibold text-primary">
                InstantMed
              </Link>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{MICROCOPY.turnaround}</span>
              </div>
            </div>
            <SessionProgress 
              currentStep={currentProgressIndex} 
              totalSteps={progressSteps.length}
              stepLabel={progressSteps[currentProgressIndex]}
              className="mb-2"
            />
            {/* Trust indicators */}
            <TrustStrip />
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 px-4 py-5 overflow-y-auto">
          <div className="max-w-md mx-auto">
            {error && (
              <div ref={errorRef} tabIndex={-1} className="mb-4">
                <ErrorMessage message={error} onDismiss={() => setError(null)} />
              </div>
            )}

            {renderStep()}
          </div>
        </div>

        {/* Footer - fixed at bottom of flex container */}
        <footer className="shrink-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 safe-area-pb">
          <div className="max-w-md mx-auto flex gap-3">
            {/* Back button - show on most steps except first and startDate */}
            {step !== "type" &&
              step !== "startDate" && (
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

            {/* Step-specific CTAs */}
            {step === "type" ? (
              // Type step: show helper text, selection auto-advances
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                <span>Tap an option to continue</span>
              </div>
            ) : step === "duration" && formData.duration !== "specific" && !formData.duration ? (
              // Duration step without selection: show helper
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                <span>Select your leave duration</span>
              </div>
            ) : step === "review" ? (
              <Button
                onClick={handleProceedToPayment}
                className="flex-1 h-14 rounded-xl gap-2 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg"
                disabled={(!isAuthenticated && !formData.guestEmail) || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Pay ${formData.duration === "2" ? PRICING.MED_CERT_2DAY.toFixed(2) : PRICING.MED_CERT.toFixed(2)} &amp; Submit
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={goNext} disabled={!canProceed()} className="flex-1 h-12 rounded-xl gap-2">
                {MICROCOPY.nav.continue}
                <ArrowRight className="w-5 h-5" />
              </Button>
            )}
          </div>
          {/* Auto-save indicator and emergency info */}
          <div className="max-w-md mx-auto flex items-center justify-between mt-2 text-[10px] text-muted-foreground/60">
            <div className="flex items-center gap-1">
              {lastSaved && (
                <>
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Draft saved</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <span>Emergency? Call 000</span>
            </div>
          </div>
        </footer>
      </main>
    </TooltipProvider>
  )
}
