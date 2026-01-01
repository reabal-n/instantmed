"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button, Input, Textarea } from "@heroui/react"
import confetti from "canvas-confetti"
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Pill,
  Eye,
  EyeOff,
  HelpCircle,
  X,
  Check,
  Pencil,
  ExternalLink,
  Brain,
  Heart,
  Droplets,
  Wind,
  Shield,
  Bug,
  Sparkles,
  MoreHorizontal,
} from "lucide-react"
import { createRequestAndCheckoutAction } from "@/lib/stripe/checkout"
import { createClient } from "@/lib/supabase/client"
import { createOrGetProfile } from "@/app/actions/create-profile"
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RX_MICROCOPY } from "@/lib/microcopy/prescription"
import { MedicationCombobox, type SelectedMedication } from "@/components/prescriptions/medication-combobox"
import { AnimatedSelect } from "@/components/ui/animated-select"
import { logger } from "@/lib/logger"

// Flow steps
type FlowStep =
  | "type"
  | "medication"
  | "gating" // New gating questions step
  | "condition"
  | "duration"
  | "control"
  | "sideEffects"
  | "notes"
  | "safety"
  | "medicare"
  | "signup"
  | "review"
  | "payment"

const REPEAT_STEPS: FlowStep[] = [
  "type",
  "medication",
  "gating", // Gating questions after medication selection
  "condition",
  "duration",
  "control",
  "sideEffects",
  "notes",
  "safety",
  "medicare",
  "signup",
  "review",
  "payment",
]
// NEW_STEPS removed - new scripts require General Consult

// Prescription types - only repeat scripts available
// New scripts require General Consult ($44.95)
const RX_TYPES = [
  {
    id: "repeat",
    label: RX_MICROCOPY.type.repeat.label,
    description: RX_MICROCOPY.type.repeat.description,
    icon: RefreshCw,
  },
] as const

// Conditions with icons for AnimatedSelect
const CONDITIONS = [
  { id: "mental_health", label: "Mental health", icon: Brain, color: "#8B5CF6" },
  { id: "cardiovascular", label: "Blood pressure / heart", icon: Heart, color: "#EF4444" },
  { id: "diabetes", label: "Diabetes", icon: Droplets, color: "#3B82F6" },
  { id: "respiratory", label: "Asthma / respiratory", icon: Wind, color: "#06B6D4" },
  { id: "contraceptive", label: "Contraception", icon: Shield, color: "#EC4899" },
  { id: "infection", label: "Infection", icon: Bug, color: "#F59E0B" },
  { id: "skin", label: "Skin condition", icon: Sparkles, color: "#10B981" },
  { id: "other", label: "Other", icon: MoreHorizontal, color: "#6B7280" },
] as const

// Duration options
const DURATIONS = [
  { id: "<3months", label: "< 3 months" },
  { id: "3-12months", label: "3–12 months" },
  { id: ">1year", label: "> 1 year" },
] as const

// Control options
const CONTROL_OPTIONS = [
  { id: "well", label: "Well controlled" },
  { id: "partial", label: "Partially" },
  { id: "poor", label: "Poorly controlled" },
] as const

// Side effects options
const SIDE_EFFECTS = [
  { id: "none", label: "None" },
  { id: "mild", label: "Mild" },
  { id: "significant", label: "Significant" },
] as const

// Safety questions
const SAFETY_QUESTIONS = [
  { id: "allergies", label: "Known allergies to this medication?", knockout: true },
  { id: "pregnant", label: "Pregnant or possibly pregnant?", knockout: false },
  { id: "breastfeeding", label: "Currently breastfeeding?", knockout: false },
  { id: "seriousSideEffects", label: "Previous serious side effects?", knockout: true },
] as const

// IRN options
const IRNS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

// Progress stages
const PROGRESS_STAGES = ["Details", "Medicare", "Account", "Pay"] as const

interface Props {
  patientId: string | null
  isAuthenticated: boolean
  needsOnboarding: boolean
  userEmail?: string
  userName?: string
}

// Google icon
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

// Progress indicator with animated dots
function Progress({ stages, currentIndex }: { stages: readonly string[]; currentIndex: number }) {
  return (
    <nav aria-label="Progress" className="w-full">
      <div className="flex flex-col items-center gap-2">
        {/* Animated dots */}
        <div className="flex items-center gap-3 relative">
          {stages.map((label, i) => {
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
              width: `${Math.max(10, (currentIndex / (stages.length - 1)) * 100)}%`,
            }}
          />
        </div>
        {/* Step label */}
        <p className="text-xs text-muted-foreground">
          Step {currentIndex + 1} of {stages.length}: <span className="font-medium text-foreground">{stages[currentIndex]}</span>
        </p>
      </div>
    </nav>
  )
}

// Step header with emoji support
function StepHeader({ title, subtitle, emoji }: { title: string; subtitle?: string; emoji?: string }) {
  return (
    <header className="text-center space-y-1">
      {emoji && <div className="text-4xl mb-2 animate-bounce-gentle">{emoji}</div>}
      <h1 className="text-xl font-semibold">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </header>
  )
}

// Option tile with emoji support
function OptionTile({
  selected,
  onClick,
  label,
  description,
  icon: Icon,
  emoji,
}: {
  selected: boolean
  onClick: () => void
  label: string
  description?: string
  icon?: React.ElementType
  emoji?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
        selected
          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
          : "border-border/60 bg-white/50 hover:border-primary/40 hover:bg-white/80"
      }`}
    >
      <div className="flex items-center gap-3">
        {emoji && (
          <span className={`text-2xl ${selected ? "animate-bounce-once" : ""}`}>{emoji}</span>
        )}
        {Icon && !emoji && (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-medium transition-colors ${selected ? "text-primary" : "text-foreground"}`}>{label}</p>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {selected && (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-scale-in">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>
    </button>
  )
}

// Pill button with animation
function PillButton({
  selected,
  onClick,
  children,
  emoji,
}: { selected: boolean; onClick: () => void; children: React.ReactNode; emoji?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
        selected ? "bg-primary text-primary-foreground shadow-md" : "bg-muted hover:bg-muted/80 border border-border/40"
      }`}
    >
      {emoji && <span className="mr-1.5">{emoji}</span>}
      {children}
    </button>
  )
}

// Controlled substance warning
function ControlledWarning({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-2xl p-5 max-w-sm w-full space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold">{RX_MICROCOPY.controlled.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{RX_MICROCOPY.controlled.body}</p>
          </div>
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-2">Includes:</p>
          <div className="flex flex-wrap gap-1">
            {RX_MICROCOPY.controlled.affected.map((med) => (
              <span key={med} className="text-xs bg-background px-2 py-0.5 rounded">
                {med}
              </span>
            ))}
          </div>
        </div>
        <Button onPress={onClose} className="w-full" color="primary" radius="lg">
          I understand
        </Button>
      </div>
    </div>
  )
}

// Safety knockout screen
function SafetyKnockout() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-amber-600" />
      </div>
      <h1 className="text-xl font-semibold mb-2">{RX_MICROCOPY.safety.knockoutTitle}</h1>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">{RX_MICROCOPY.safety.knockoutBody}</p>
      <Button
        as={Link}
        href="https://www.healthdirect.gov.au/australian-health-services"
        target="_blank"
        variant="bordered"
        radius="lg"
      >
        {RX_MICROCOPY.safety.knockoutCta}
        <ExternalLink className="w-4 h-4 ml-2" />
      </Button>
    </div>
  )
}

export function PrescriptionFlowClient({
  patientId: initialPatientId,
  isAuthenticated: initialIsAuthenticated,
  needsOnboarding: initialNeedsOnboarding,
  userEmail,
  userName,
}: Props) {
  const _router = useRouter()
  const supabase = createClient()

  // Auth state
  const [patientId, setPatientId] = useState<string | null>(initialPatientId)
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated)
  const [needsOnboarding, setNeedsOnboarding] = useState(initialNeedsOnboarding)

  // Flow state
  const [rxType, setRxType] = useState<"repeat" | "new" | null>(null)
  const [step, setStep] = useState<FlowStep>("type")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [_isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [signupMode, setSignupMode] = useState<"new" | "existing">("new")

  // Form state - structured medication selection
  const [selectedMedication, setSelectedMedication] = useState<SelectedMedication | null>(null)
  
  // Gating questions state
  const [prescribedBefore, setPrescribedBefore] = useState<boolean | null>(null)
  const [doseChanged, setDoseChanged] = useState<boolean | null>(null)
  const [isGatingBlocked, setIsGatingBlocked] = useState(false)
  
  const [condition, setCondition] = useState<string | null>(null)
  const [otherCondition, setOtherCondition] = useState("")
  const [duration, setDuration] = useState<string | null>(null)
  const [control, setControl] = useState<string | null>(null)
  const [sideEffects, setSideEffects] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [safetyAnswers, setSafetyAnswers] = useState<Record<string, boolean | null>>({})

  // Medicare state
  const [medicareNumber, setMedicareNumber] = useState("")
  const [irn, setIrn] = useState<number | null>(null)
  const [dob, setDob] = useState("")

  // Signup state
  const [isSignUp, setIsSignUp] = useState(true)
  const [fullName, setFullName] = useState(userName || "")
  const [email, setEmail] = useState(userEmail || "")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [showEmailConfirm, setShowEmailConfirm] = useState(false)

  // Controlled substance warning
  const [showControlledWarning, setShowControlledWarning] = useState(false)
  const [isKnockedOut, setIsKnockedOut] = useState(false)

  // Only repeat scripts - new scripts require General Consult
  const steps = REPEAT_STEPS
  const stepIndex = steps.indexOf(step)

  // Get progress stage index
  const getProgressIndex = () => {
    if (["type", "medication", "condition", "duration", "control", "sideEffects", "notes", "safety"].includes(step))
      return 0
    if (step === "medicare") return 1
    if (step === "signup") return 2
    return 3
  }

  // Medicare validation
  const formatMedicare = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10)
    if (digits.length <= 4) return digits
    if (digits.length <= 9) return `${digits.slice(0, 4)} ${digits.slice(4)}`
    return `${digits.slice(0, 4)} ${digits.slice(4, 9)} ${digits.slice(9)}`
  }

  const validateMedicare = (num: string) => {
    const digits = num.replace(/\D/g, "")
    if (digits.length < 10) return { valid: false, error: `${10 - digits.length} more` }
    if (!/^[2-6]/.test(digits)) return { valid: false, error: "Invalid start" }
    // Checksum validation
    const weights = [1, 3, 7, 9, 1, 3, 7, 9]
    const sum = weights.reduce((acc, w, i) => acc + w * Number.parseInt(digits[i], 10), 0)
    if (sum % 10 !== Number.parseInt(digits[8], 10)) return { valid: false, error: "Check number" }
    return { valid: true, error: null }
  }

  const medicareValidation = validateMedicare(medicareNumber)
  const medicareDigits = medicareNumber.replace(/\D/g, "").length

  // Check for controlled substance - now handled by MedicationCombobox
  // The combobox blocks S8 searches at the API level

  // Step transitions
  const goTo = useCallback((nextStep: FlowStep) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setStep(nextStep)
      setIsTransitioning(false)
    }, 150)
  }, [])

  const goNext = useCallback(() => {
    const currentIndex = steps.indexOf(step)
    if (currentIndex < steps.length - 1) {
      // Skip steps based on auth state
      let nextIndex = currentIndex + 1
      if (nextIndex < steps.length && steps[nextIndex] === "medicare" && !needsOnboarding && patientId) {
        nextIndex++
      }
      if (nextIndex < steps.length && steps[nextIndex] === "signup" && isAuthenticated && !needsOnboarding) {
        nextIndex++
      }
      // Safety check: ensure we don&apos;t go out of bounds
      if (nextIndex < steps.length) {
        goTo(steps[nextIndex])
      }
    }
  }, [step, steps, goTo, isAuthenticated, needsOnboarding, patientId])

  const goBack = useCallback(() => {
    const currentIndex = steps.indexOf(step)
    if (currentIndex > 0) {
      goTo(steps[currentIndex - 1])
    }
  }, [step, steps, goTo])

  // Auto-advance for type selection
  const selectType = (type: "repeat" | "new") => {
    setRxType(type)
    setTimeout(() => goTo("medication"), 150)
  }

  // Check if can continue
  const canContinue = () => {
    switch (step) {
      case "type":
        return !!rxType
      case "medication":
        // Must have a structured medication selection (not free text)
        return selectedMedication !== null
      case "gating":
        // Both gating questions must be answered
        // If blocked (prescribedBefore=No OR doseChanged=Yes), show block UI but don&apos;t allow continue
        return prescribedBefore !== null && doseChanged !== null && !isGatingBlocked
      case "condition":
        return !!condition && (condition !== "other" || otherCondition.trim().length > 0)
      case "duration":
        return !!duration
      case "control":
        return !!control
      case "sideEffects":
        return !!sideEffects
      case "notes":
        return notes.trim().length > 0
      case "safety":
        return Object.keys(safetyAnswers).length === SAFETY_QUESTIONS.length
      case "medicare":
        return medicareValidation.valid && !!irn && !!dob
      case "signup":
        return isSignUp ? fullName && email && password && agreedToTerms : email && password
      case "review":
        return true
      default:
        return false
    }
  }

  // Check for safety knockout
  const checkSafetyKnockout = () => {
    return SAFETY_QUESTIONS.some((q) => q.knockout && safetyAnswers[q.id] === true)
  }

  // Handle signup/signin
  const _handleAuth = async () => {
    setAuthLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
          },
        })

        if (signUpError) throw signUpError

        if (data.session) {
          // Immediate login - create profile
          const profileResult = await createOrGetProfile(
            data.user!.id,
            fullName,
            dob
          )

          if (!profileResult.error && profileResult.profileId) {
            setPatientId(profileResult.profileId)
            setIsAuthenticated(true)
            setNeedsOnboarding(false)
            goTo("review")
          }
        } else {
          setShowEmailConfirm(true)
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError

        // Check if profile exists
        const profileResult = await createOrGetProfile(
          data.user.id,
          data.user.user_metadata?.full_name || fullName,
          dob
        )

        if (!profileResult.error && profileResult.profileId) {
          setPatientId(profileResult.profileId)
          setIsAuthenticated(true)
          setNeedsOnboarding(false)
          goTo("review")
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : RX_MICROCOPY.errors.generic)
    } finally {
      setAuthLoading(false)
    }
  }

  // Handle Google auth
  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true)
    setError(null)

    try {
      // Save form data before OAuth redirect
      const formState = {
        rxType,
        step,
        selectedMedication,
        prescribedBefore,
        doseChanged,
        condition,
        otherCondition,
        duration,
        control,
        sideEffects,
        notes,
        safetyAnswers,
        medicareNumber,
        irn,
        dob,
        fullName,
        email,
      }
      sessionStorage.setItem("rx_form_data", JSON.stringify(formState))
      sessionStorage.setItem("rx_form_step", step)
      
      sessionStorage.setItem("questionnaire_flow", "true")
      sessionStorage.setItem("questionnaire_path", window.location.pathname)
      sessionStorage.setItem("pending_profile_dob", dob)

      const callbackUrl = new URL("/auth/callback", window.location.origin)
      callbackUrl.searchParams.set("redirect", window.location.pathname)
      callbackUrl.searchParams.set("flow", "questionnaire")
      callbackUrl.searchParams.set("auth_success", "true")

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      })

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed")
      setIsGoogleLoading(false)
    }
  }

  // Handle email signup
  const handleEmailSignup = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      sessionStorage.setItem("pending_profile_name", fullName)
      sessionStorage.setItem("pending_profile_dob", dob)

      if (signupMode === "existing") {
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError
        if (!authData.user) throw new Error("Sign in failed")

        const { profileId } = await createOrGetProfile(
          authData.user.id,
          authData.user.user_metadata?.full_name || fullName,
          dob,
        )

        if (!profileId) throw new Error("Failed to create profile")

        setPatientId(profileId)
        setIsAuthenticated(true)
        setNeedsOnboarding(false)

        await new Promise((resolve) => setTimeout(resolve, 100))
        goNext()
      } else {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
            data: {
              full_name: fullName,
              date_of_birth: dob,
              role: "patient",
            },
          },
        })

        if (signUpError) throw signUpError
        if (!authData.user) throw new Error("Sign up failed")

        if (authData.session) {
          const { profileId } = await createOrGetProfile(authData.user.id, fullName, dob)

          if (!profileId) throw new Error("Failed to create profile")

          setPatientId(profileId)
          setIsAuthenticated(true)
          setNeedsOnboarding(false)

          await new Promise((resolve) => setTimeout(resolve, 100))
          goNext()
        } else {
          setError("Please check your email to confirm your account, then sign in.")
          setSignupMode("existing")
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle submit
  const handleSubmit = async () => {
    if (!isAuthenticated || !patientId) {
      setError("Please complete the signup step before submitting.")
      setStep("signup")
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

    try {
      const result = await createRequestAndCheckoutAction({
        category: "prescription",
        subtype: rxType || "repeat",
        type: "script",
        answers: {
          // AMT-backed structured medication data
          amt_code: selectedMedication?.amt_code,
          medication_display: selectedMedication?.display,
          medication_name: selectedMedication?.medication_name,
          medication_form: selectedMedication?.form,
          medication_strength: selectedMedication?.strength,
          // Gating answers
          prescribed_before: prescribedBefore,
          dose_changed: doseChanged,
          // Clinical details
          condition,
          otherCondition: condition === "other" ? otherCondition : undefined,
          duration,
          control,
          sideEffects,
          notes,
          safetyAnswers,
        },
      })

      if (result.success && result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      } else {
        setError(result.error || RX_MICROCOPY.errors.generic)
      }
    } catch {
      setError(RX_MICROCOPY.errors.generic)
    } finally {
      setIsSubmitting(false)
    }
  }

   
  useEffect(() => {
    const checkSession = async () => {
      // Restore form data from sessionStorage if returning from OAuth
      const savedFormData = sessionStorage.getItem("rx_form_data")
      const savedStep = sessionStorage.getItem("rx_form_step") as FlowStep | null
      
      if (savedFormData) {
        try {
          const parsed = JSON.parse(savedFormData)
          // Restore all form state
          if (parsed.rxType) setRxType(parsed.rxType)
          if (parsed.selectedMedication) setSelectedMedication(parsed.selectedMedication)
          if (parsed.prescribedBefore !== null) setPrescribedBefore(parsed.prescribedBefore)
          if (parsed.doseChanged !== null) setDoseChanged(parsed.doseChanged)
          if (parsed.condition) setCondition(parsed.condition)
          if (parsed.otherCondition) setOtherCondition(parsed.otherCondition)
          if (parsed.duration) setDuration(parsed.duration)
          if (parsed.control) setControl(parsed.control)
          if (parsed.sideEffects) setSideEffects(parsed.sideEffects)
          if (parsed.notes) setNotes(parsed.notes)
          if (parsed.safetyAnswers) setSafetyAnswers(parsed.safetyAnswers)
          if (parsed.medicareNumber) setMedicareNumber(parsed.medicareNumber)
          if (parsed.irn) setIrn(parsed.irn)
          if (parsed.dob) setDob(parsed.dob)
          if (parsed.fullName) setFullName(parsed.fullName)
          if (parsed.email) setEmail(parsed.email)
          sessionStorage.removeItem("rx_form_data")
        } catch (e) {
          logger.error("Failed to restore form data", { error: e })
        }
      }
      
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user && !isAuthenticated) {
        const pendingName = sessionStorage.getItem("pending_profile_name")
        const pendingDob = sessionStorage.getItem("pending_profile_dob")
        const userNameFromSession = pendingName || session.user.user_metadata?.full_name || ""
        const userDob = pendingDob || session.user.user_metadata?.date_of_birth || ""

        const { profileId } = await createOrGetProfile(session.user.id, userNameFromSession, userDob)

        if (profileId) {
          sessionStorage.removeItem("pending_profile_name")
          sessionStorage.removeItem("pending_profile_dob")
          sessionStorage.removeItem("rx_form_step")
          setPatientId(profileId)
          setIsAuthenticated(true)
          setNeedsOnboarding(false)

          const urlParams = new URLSearchParams(window.location.search)
          if (urlParams.get("auth_success") === "true") {
            window.history.replaceState({}, "", window.location.pathname)
            // If we restored form data, go to review step
            if (savedFormData && savedStep) {
              goTo("review")
            } else if (step === "signup") {
              goNext()
            }
          }
        }
      }
    }
    checkSession()
  }, [isAuthenticated, step, goNext, goTo])

  // If knocked out by safety check
  if (isKnockedOut) {
    return <SafetyKnockout />
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
        {showControlledWarning && (
          <ControlledWarning
            onClose={() => {
              setShowControlledWarning(false)
              setSelectedMedication(null)
            }}
          />
        )}

        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
          <div className="max-w-md mx-auto px-4 py-3">
            <div className="flex items-center gap-3 mb-3">
              {stepIndex > 0 && (
                <button
                  onClick={goBack}
                  className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="flex-1 flex items-center justify-center gap-2">
                <Pill className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Prescription Request</span>
              </div>
              <Link href="/" className="p-2 -mr-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </Link>
            </div>
            <Progress stages={PROGRESS_STAGES} currentIndex={getProgressIndex()} />
          </div>
        </header>

        {/* Content */}
        <main
          className={`max-w-md mx-auto px-4 py-5 pb-24 transition-opacity duration-150 ${isTransitioning ? "opacity-0" : "opacity-100"}`}
        >
          {/* Step: Type */}
          {step === "type" && (
            <div className="space-y-4 animate-step-enter">
              <StepHeader emoji="💊" title={RX_MICROCOPY.type.heading} subtitle={RX_MICROCOPY.type.subtitle} />
              {/* S8 Disclaimer - shown upfront */}
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <p className="text-xs text-red-800 leading-relaxed font-medium">
                  <strong className="text-red-900">No Schedule 8 / controlled medications.</strong>
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Requests for these will be declined: dexamphetamine, methylphenidate, lisdexamfetamine, oxycodone, morphine, fentanyl, buprenorphine, methadone, ketamine, alprazolam.
                </p>
                <p className="text-xs text-red-700 mt-2">
                  <strong>If you need a new medication or dose change →</strong>{" "}
                  <Link href="/consult" className="underline hover:no-underline">General Consult</Link> required.
                </p>
              </div>
              <div className="space-y-3">
                {RX_TYPES.map((type) => (
                  <OptionTile
                    key={type.id}
                    selected={rxType === type.id}
                    onClick={() => selectType(type.id as "repeat" | "new")}
                    label={type.label}
                    description={type.description}
                    icon={type.icon}
                  />
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground">{RX_MICROCOPY.doctorReview}</p>
            </div>
          )}

          {/* Step: Medication */}
          {step === "medication" && (
            <div className="space-y-4 animate-step-enter">
              <StepHeader
                emoji="🔍"
                title={RX_MICROCOPY.medication.headingRepeat}
                subtitle="Search and select your medication from the list"
              />
              {/* S8 Disclaimer */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong className="text-amber-900">No Schedule 8 (S8) medications.</strong>{" "}
                  Common examples we do not provide via repeat script: dexamphetamine, lisdexamfetamine (Vyvanse), 
                  methylphenidate (Ritalin/Concerta), oxycodone, morphine, fentanyl, buprenorphine, methadone, ketamine.
                </p>
              </div>
              <MedicationCombobox
                value={selectedMedication}
                onChange={setSelectedMedication}
                placeholder="Search for your medication (e.g. Atorvastatin 20mg)"
              />
            </div>
          )}

          {/* Step: Gating Questions */}
          {step === "gating" && (
            <div className="space-y-6 animate-step-enter">
              <StepHeader
                emoji="📋"
                title="A few quick questions"
                subtitle="To ensure this service is right for you"
              />
              
              {/* Question 1: Prescribed before? */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Have you been prescribed this medication before by a doctor?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setPrescribedBefore(true)
                      if (doseChanged === true) {
                        setIsGatingBlocked(true)
                      } else if (doseChanged === false) {
                        setIsGatingBlocked(false)
                      }
                    }}
                    className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${
                      prescribedBefore === true
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-border/60 hover:border-border"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => {
                      setPrescribedBefore(false)
                      setIsGatingBlocked(true)
                    }}
                    className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${
                      prescribedBefore === false
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-border/60 hover:border-border"
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Question 2: Dose changes? */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Any dose changes since your last prescription?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setDoseChanged(true)
                      setIsGatingBlocked(true)
                    }}
                    className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${
                      doseChanged === true
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-border/60 hover:border-border"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => {
                      setDoseChanged(false)
                      if (prescribedBefore === true) {
                        setIsGatingBlocked(false)
                      }
                    }}
                    className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${
                      doseChanged === false
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-border/60 hover:border-border"
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Blocking message */}
              {isGatingBlocked && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-900">This request requires a general consultation</p>
                      <p className="text-sm text-amber-700 mt-1">
                        {prescribedBefore === false
                          ? "New medications require a doctor consultation to assess suitability."
                          : "Dose changes require a doctor consultation to ensure safety."}
                      </p>
                    </div>
                  </div>
                  <Button
                    as={Link}
                    href="/consult"
                    className="w-full bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                    radius="lg"
                  >
                    Continue to General Consult ($44.95)
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step: Condition */}
          {step === "condition" && (
            <div className="space-y-4 animate-step-enter">
              <StepHeader
                emoji="🩺"
                title={rxType === "new" ? RX_MICROCOPY.condition.headingNew : RX_MICROCOPY.condition.heading}
                subtitle={RX_MICROCOPY.condition.subtitle}
              />
              <AnimatedSelect
                options={CONDITIONS.map((c) => ({
                  id: c.id,
                  label: c.label,
                  icon: c.icon,
                  color: c.color,
                }))}
                value={condition || undefined}
                onChange={(value) => setCondition(value)}
                placeholder="Select your condition..."
              />
              {condition === "other" && (
                <Input
                  value={otherCondition}
                  onChange={(e) => setOtherCondition(e.target.value)}
                  placeholder={RX_MICROCOPY.condition.otherPlaceholder}
                  className="h-11"
                  autoFocus
                />
              )}
            </div>
          )}

          {/* Step: Duration (repeat only) */}
          {step === "duration" && (
            <div className="space-y-4 animate-step-enter">
              <StepHeader emoji="⏰" title={RX_MICROCOPY.duration.heading} />
              <div className="flex flex-wrap gap-2 justify-center">
                {DURATIONS.map((d) => (
                  <PillButton
                    key={d.id}
                    selected={duration === d.id}
                    onClick={() => {
                      setDuration(d.id)
                      setTimeout(goNext, 150)
                    }}
                  >
                    {d.label}
                  </PillButton>
                ))}
              </div>
            </div>
          )}

          {/* Step: Control (repeat only) */}
          {step === "control" && (
            <div className="space-y-4 animate-step-enter">
              <StepHeader emoji="📊" title={RX_MICROCOPY.control.heading} />
              <div className="flex flex-wrap gap-2 justify-center">
                {CONTROL_OPTIONS.map((c) => (
                  <PillButton
                    key={c.id}
                    selected={control === c.id}
                    onClick={() => {
                      setControl(c.id)
                      setTimeout(goNext, 150)
                    }}
                  >
                    {c.label}
                  </PillButton>
                ))}
              </div>
            </div>
          )}

          {/* Step: Side Effects (repeat only) */}
          {step === "sideEffects" && (
            <div className="space-y-4 animate-step-enter">
              <StepHeader emoji="⚠️" title={RX_MICROCOPY.sideEffects.heading} />
              <div className="flex flex-wrap gap-2 justify-center">
                {SIDE_EFFECTS.map((s) => (
                  <PillButton
                    key={s.id}
                    selected={sideEffects === s.id}
                    onClick={() => {
                      setSideEffects(s.id)
                      setTimeout(goNext, 150)
                    }}
                  >
                    {s.label}
                  </PillButton>
                ))}
              </div>
            </div>
          )}

          {/* Step: Notes */}
          {step === "notes" && (
            <div className="space-y-4 animate-step-enter">
              <StepHeader
                emoji="✍️"
                title="Tell us more"
                subtitle="Describe your symptoms so the doctor can help you"
              />
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                placeholder="e.g. I've had a sore throat for 3 days, difficulty swallowing..."
                className="min-h-[120px] resize-none"
                maxLength={500}
                required
              />
              <p className="text-xs text-right text-muted-foreground">{notes.length}/500</p>
              {notes.length === 0 && (
                <p className="text-xs text-amber-600">
                  This information helps the doctor assess whether this medication is appropriate for you
                </p>
              )}
            </div>
          )}

          {/* Step: Safety */}
          {step === "safety" && (
            <div className="space-y-4 animate-step-enter">
              <StepHeader emoji="🛡️" title={RX_MICROCOPY.safety.heading} subtitle={RX_MICROCOPY.safety.subtitle} />
              <div className="space-y-3">
                {SAFETY_QUESTIONS.map((q) => (
                  <div key={q.id} className="flex items-center justify-between p-3 rounded-xl border border-border/60">
                    <p className="text-sm pr-4">{q.label}</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSafetyAnswers((prev) => ({ ...prev, [q.id]: false }))}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          safetyAnswers[q.id] === false ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        No
                      </button>
                      <button
                        onClick={() => setSafetyAnswers((prev) => ({ ...prev, [q.id]: true }))}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          safetyAnswers[q.id] === true ? "bg-amber-500 text-white" : "bg-muted"
                        }`}
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {checkSafetyKnockout() && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-800">{RX_MICROCOPY.safety.knockoutBody}</p>
                </div>
              )}
            </div>
          )}

          {/* Step: Medicare */}
          {step === "medicare" && (
            <div className="space-y-4">
              <StepHeader title={RX_MICROCOPY.medicare.heading} subtitle={RX_MICROCOPY.medicare.subtitle} />
              <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">{RX_MICROCOPY.medicare.numberLabel}</label>
                  <div className="relative">
                    <Input
                      value={medicareNumber}
                      onChange={(e) => setMedicareNumber(formatMedicare(e.target.value))}
                      placeholder={RX_MICROCOPY.medicare.numberPlaceholder}
                      className="h-12 text-lg tracking-widest font-mono pr-10"
                      inputMode="numeric"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {medicareDigits === 10 && medicareValidation.valid ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : medicareDigits > 0 ? (
                        <span className="text-xs text-muted-foreground">{medicareDigits}/10</span>
                      ) : null}
                    </div>
                  </div>
                  {medicareDigits > 0 && !medicareValidation.valid && (
                    <p className="text-xs text-destructive">{medicareValidation.error}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <label className="text-xs font-medium">{RX_MICROCOPY.medicare.irnLabel}</label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px] text-xs">
                        {RX_MICROCOPY.medicare.irnTooltip}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex gap-1">
                    {IRNS.map((n) => (
                      <button
                        key={n}
                        onClick={() => setIrn(n)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                          irn === n ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Date of birth</label>
                  <Input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="h-11"
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step: Signup */}
          {step === "signup" && (
            <div className="space-y-4">
              {showEmailConfirm ? (
                <div className="text-center space-y-4 py-8">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">Check your email</h2>
                  <p className="text-sm text-muted-foreground">We sent a confirmation link to {email}</p>
                  <Button
                    variant="bordered"
                    onPress={() => {
                      setIsSignUp(false)
                      setShowEmailConfirm(false)
                    }}
                  >
                    Sign in instead
                  </Button>
                </div>
              ) : (
                <>
                  <StepHeader
                    title={isSignUp ? RX_MICROCOPY.signup.headingNew : RX_MICROCOPY.signup.headingExisting}
                    subtitle={RX_MICROCOPY.signup.subtitle}
                  />

                  <Button variant="bordered" className="w-full h-11" onPress={handleGoogleAuth}>
                    <GoogleIcon className="w-5 h-5 mr-2" />
                    Continue with Google
                  </Button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div className="space-y-3">
                    {isSignUp && (
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Full name"
                        className="h-11"
                      />
                    )}
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className="h-11"
                    />
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {isSignUp && (
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-1 rounded border-border"
                        />
                        <span className="text-xs text-muted-foreground">
                          I agree to the{" "}
                          <Link href="/terms" className="underline">
                            Terms
                          </Link>{" "}
                          and{" "}
                          <Link href="/privacy" className="underline">
                            Privacy Policy
                          </Link>
                        </span>
                      </label>
                    )}

                    {error && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-xs text-destructive">{error}</p>
                      </div>
                    )}

                    <Button
                      onClick={handleEmailSignup}
                      disabled={authLoading || (isSignUp ? !agreedToTerms : false)}
                      className="w-full h-11"
                    >
                      {authLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isSignUp ? (
                        "Create account"
                      ) : (
                        "Sign in"
                      )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      {isSignUp ? "Already have an account?" : "New here?"}{" "}
                      <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary underline">
                        {isSignUp ? "Sign in" : "Create account"}
                      </button>
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step: Review */}
          {step === "review" && (
            <div className="space-y-4">
              <StepHeader title={RX_MICROCOPY.review.heading} subtitle={RX_MICROCOPY.review.subtitle} />
              <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-muted-foreground">{RX_MICROCOPY.review.medication}</p>
                    <p className="text-sm font-medium">{selectedMedication?.display || "Not selected"}</p>
                    {selectedMedication && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selectedMedication.medication_name} • {selectedMedication.strength} {selectedMedication.form}
                      </p>
                    )}
                  </div>
                  <button onClick={() => goTo("medication")} className="p-1 hover:bg-muted rounded">
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
                <hr className="border-border/40" />
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-muted-foreground">{RX_MICROCOPY.review.condition}</p>
                    <p className="text-sm font-medium">
                      {condition === "other" ? otherCondition : CONDITIONS.find((c) => c.id === condition)?.label}
                    </p>
                  </div>
                  <button onClick={() => goTo("condition")} className="p-1 hover:bg-muted rounded">
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
                {rxType === "repeat" && (
                  <>
                    <hr className="border-border/40" />
                    <div>
                      <p className="text-xs text-muted-foreground">{RX_MICROCOPY.review.duration}</p>
                      <p className="text-sm font-medium">{DURATIONS.find((d) => d.id === duration)?.label}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step: Payment */}
          {step === "payment" && (
            <div className="space-y-4">
              <StepHeader title={RX_MICROCOPY.payment.heading} subtitle={RX_MICROCOPY.payment.subtitle} />
              <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total</span>
                  <span className="text-2xl font-bold">{RX_MICROCOPY.payment.price}</span>
                </div>
                <hr className="border-border/40" />
                <ul className="space-y-2">
                  {RX_MICROCOPY.payment.includes.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-muted-foreground text-center">{RX_MICROCOPY.payment.disclaimer}</p>
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        {!showEmailConfirm && (
          <footer className="sticky bottom-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 safe-area-pb">
            <div className="max-w-md mx-auto flex gap-3">
              {/* Back button */}
              {step !== "type" && (
                <Button
                  variant="ghost"
                  onClick={goBack}
                  className="h-12 px-4 rounded-xl"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              
              {/* Step-specific CTAs */}
              {step === "type" ? (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                  <span>Tap an option to continue</span>
                </div>
              ) : step === "payment" ? (
                <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 h-12 rounded-xl">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {RX_MICROCOPY.payment.processing}
                    </>
                  ) : (
                    RX_MICROCOPY.payment.cta
                  )}
                </Button>
              ) : step === "safety" && checkSafetyKnockout() ? (
                <Button onPress={() => setIsKnockedOut(true)} variant="bordered" className="flex-1 h-12 rounded-xl">
                  Find a GP near you
                </Button>
              ) : step !== "signup" ? (
                <Button onClick={goNext} disabled={!canContinue()} className="flex-1 h-12 rounded-xl">
                  {RX_MICROCOPY.nav.continue}
                </Button>
              ) : null}
            </div>
          </footer>
        )}
      </div>
    </TooltipProvider>
  )
}
