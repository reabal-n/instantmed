"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
  Eye,
  EyeOff,
  HelpCircle,
  X,
  AlertCircle,
  Check,
  FileText,
  Shield,
  Pencil,
  FlaskConical,
} from "lucide-react"
import { createRequestAndCheckoutAction, createTestRequestAction } from "@/lib/stripe/checkout"
import { createClient } from "@/lib/supabase/client"
import { createOrGetProfile } from "@/app/actions/create-profile"
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { MICROCOPY } from "@/lib/microcopy/med-cert"

// Flow steps
type FlowStep = "type" | "duration" | "symptoms" | "notes" | "safety" | "medicare" | "signup" | "review" | "payment"

const STEPS: FlowStep[] = ["type", "duration", "symptoms", "notes", "safety", "medicare", "signup", "review", "payment"]

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

// Test mode - allows testing the flow without real Medicare/payment details
const IS_TEST_MODE = process.env.NEXT_PUBLIC_ENABLE_TEST_MODE === "true"

// Test data for Medicare
const TEST_MEDICARE_DATA = {
  number: "2123 45670 1", // Valid test Medicare number
  irn: 1,
  dob: "1990-01-15",
}

// Complete test data for entire flow
const TEST_FLOW_DATA = {
  certType: "work" as const,
  duration: "2" as const,
  symptoms: ["Cold/Flu", "Fatigue"] as string[],
  additionalNotes: "Testing the medical certificate flow",
  hasChestPain: false,
  hasSevereSymptoms: false,
  isEmergency: false,
  medicare: TEST_MEDICARE_DATA,
}

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

// Progress indicator component
function ProgressIndicator({
  steps,
  currentIndex,
}: {
  steps: readonly string[]
  currentIndex: number
}) {
  return (
    <nav aria-label="Request progress" className="w-full">
      <ol className="flex items-center justify-between gap-1" role="list">
        {steps.map((label, i) => {
          const isComplete = i < currentIndex
          const isCurrent = i === currentIndex
          return (
            <li
              key={label}
              className="flex-1 flex flex-col items-center gap-1"
              aria-current={isCurrent ? "step" : undefined}
            >
              <div
                className={`h-1.5 w-full rounded-full transition-colors duration-300 ${
                  isComplete ? "bg-primary" : isCurrent ? "bg-primary/60" : "bg-muted"
                }`}
                role="progressbar"
                aria-valuenow={isComplete ? 100 : isCurrent ? 50 : 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${label}: ${isComplete ? "Complete" : isCurrent ? "In progress" : "Not started"}`}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isComplete || isCurrent ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Accessible step header
function StepHeader({
  title,
  subtitle,
  stepNumber,
  totalSteps,
}: {
  title: string
  subtitle?: string
  stepNumber?: number
  totalSteps?: number
}) {
  return (
    <header className="text-center space-y-1">
      {stepNumber && totalSteps && (
        <p className="sr-only">
          Step {stepNumber} of {totalSteps}
        </p>
      )}
      <h1 className="text-xl font-semibold text-foreground leading-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
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

// Tile button component
function TileButton({
  selected,
  onClick,
  icon: Icon,
  label,
  description,
  className = "",
}: {
  selected: boolean
  onClick: () => void
  icon?: React.ComponentType<{ className?: string }>
  label: string
  description?: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`
        w-full min-h-[48px] p-3 rounded-xl border-2 transition-all 
        flex items-center gap-3 text-left
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        ${
          selected
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border bg-white hover:border-primary/40 hover:bg-white/80"
        }
        ${className}
      `}
    >
      {Icon && (
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
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

  // Auth state
  const [patientId, setPatientId] = useState<string | null>(initialPatientId)
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated)
  const [needsOnboarding, setNeedsOnboarding] = useState(initialNeedsOnboarding)

  // Flow state
  const [step, setStep] = useState<FlowStep>("type")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data
  const [certType, setCertType] = useState<string | null>(null)
  const [duration, setDuration] = useState<string | null>(null)
  const [specificDateFrom, setSpecificDateFrom] = useState("")
  const [specificDateTo, setSpecificDateTo] = useState("")
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [otherSymptom, setOtherSymptom] = useState("")
  const [additionalNotes, setAdditionalNotes] = useState("")

  // Carer's certificate specific
  const [carerPatientName, setCarerPatientName] = useState("")
  const [carerRelationship, setCarerRelationship] = useState<string | null>(null)

  // Safety screening
  const [hasChestPain, setHasChestPain] = useState<boolean | null>(null)
  const [hasSevereSymptoms, setHasSevereSymptoms] = useState<boolean | null>(null)
  const [isEmergency, setIsEmergency] = useState<boolean | null>(null)
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)

  // Medicare
  const [medicareNumber, setMedicareNumber] = useState("")
  const [irn, setIrn] = useState<number | null>(null)
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [medicareError, setMedicareError] = useState<string | null>(null)
  const [medicareValid, setMedicareValid] = useState(false)

  // Signup
  const [fullName, setFullName] = useState(userName || "")
  const [email, setEmail] = useState(userEmail || "")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [signupMode, setSignupMode] = useState<"new" | "existing">("new")
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const isCarer = certType === "carer"
  const isRedFlag = hasChestPain === true || hasSevereSymptoms === true || isEmergency === true

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

  // Check for returning users
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
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
          setPatientId(profileId)
          setIsAuthenticated(true)
          setNeedsOnboarding(false)
          router.refresh()
        }
      }
    }
    checkSession()
  }, [isAuthenticated, router])

  // Auto-advance handlers
  const selectCertType = useCallback((t: string) => {
    setCertType(t)
    setTimeout(() => setStep("duration"), 200)
  }, [])

  const selectDuration = useCallback((d: string) => {
    setDuration(d)
    if (d !== "specific") {
      setTimeout(() => setStep("symptoms"), 200)
    }
  }, [])

  // Progress calculation
  const getCurrentStepIndex = () => {
    if (["type", "duration", "symptoms", "notes", "safety"].includes(step)) return 0
    if (step === "medicare") return 1
    if (step === "signup") return 2
    if (step === "review") return 3
    if (step === "payment") return 4
    return 0
  }

  const progressSteps = ["Details", "Medicare", "Account", "Review", "Pay"] as const
  const currentProgressIndex = getCurrentStepIndex()

  // Navigation
  const goNext = useCallback(() => {
    setError(null)
    const currentIndex = STEPS.indexOf(step)

    if (step === "safety") {
      if (isAuthenticated && !needsOnboarding) {
        setStep("review")
        return
      }
      setStep(isAuthenticated ? "medicare" : "medicare")
      return
    }

    if (step === "medicare") {
      setStep(isAuthenticated ? "review" : "signup")
      return
    }

    if (step === "signup") {
      setStep("review")
      return
    }

    if (step === "review") {
      setStep("payment")
      return
    }

    if (currentIndex < STEPS.length - 1) {
      setStep(STEPS[currentIndex + 1])
    }
  }, [step, isAuthenticated, needsOnboarding])

  const goBack = useCallback(() => {
    setError(null)
    const currentIndex = STEPS.indexOf(step)

    if (step === "payment") {
      setStep("review")
      return
    }

    if (step === "review") {
      if (isAuthenticated && !needsOnboarding) {
        setStep("safety")
        return
      }
      setStep(isAuthenticated ? "medicare" : "signup")
      return
    }

    if (step === "signup") {
      setStep("medicare")
      return
    }

    if (step === "medicare") {
      setStep("safety")
      return
    }

    if (currentIndex > 0) {
      setStep(STEPS[currentIndex - 1])
    }
  }, [step, isAuthenticated, needsOnboarding])

  const goToStep = (targetStep: FlowStep) => {
    setError(null)
    setStep(targetStep)
  }

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) => (prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]))
  }

  // Medicare validation with realtime feedback using microcopy
  const formatMedicareNumber = (value: string): string => {
    const digits = value.replace(/\D/g, "").slice(0, 10)
    if (digits.length <= 4) return digits
    if (digits.length <= 9) return `${digits.slice(0, 4)} ${digits.slice(4)}`
    return `${digits.slice(0, 4)} ${digits.slice(4, 9)} ${digits.slice(9)}`
  }

  const validateMedicareNumber = (value: string): { error: string | null; valid: boolean } => {
    const raw = value.replace(/\s/g, "")
    if (raw.length === 0) return { error: null, valid: false }
    if (raw.length < 10) return { error: MICROCOPY.medicare.errors.incomplete(10 - raw.length), valid: false }
    if (!/^[2-6]/.test(raw)) return { error: MICROCOPY.medicare.errors.startDigit, valid: false }

    const weights = [1, 3, 7, 9, 1, 3, 7, 9]
    let sum = 0
    for (let i = 0; i < 8; i++) {
      sum += Number.parseInt(raw[i]) * weights[i]
    }
    if (sum % 10 !== Number.parseInt(raw[8])) {
      return { error: MICROCOPY.medicare.errors.checksum, valid: false }
    }
    return { error: null, valid: true }
  }

  const handleMedicareChange = (value: string) => {
    const formatted = formatMedicareNumber(value)
    setMedicareNumber(formatted)
    const { error, valid } = validateMedicareNumber(formatted)
    setMedicareError(error)
    setMedicareValid(valid)
  }

  // Fill test Medicare data (only available in test mode)
  const fillTestMedicareData = () => {
    if (!IS_TEST_MODE) return
    setMedicareNumber(TEST_MEDICARE_DATA.number)
    setMedicareValid(true)
    setMedicareError(null)
    setIrn(TEST_MEDICARE_DATA.irn)
    setDateOfBirth(TEST_MEDICARE_DATA.dob)
  }

  // Fill ALL test data and skip to review (only available in test mode)
  const fillAllTestData = () => {
    if (!IS_TEST_MODE) return
    // Questionnaire data
    setCertType(TEST_FLOW_DATA.certType)
    setDuration(TEST_FLOW_DATA.duration)
    setSelectedSymptoms(TEST_FLOW_DATA.symptoms)
    setAdditionalNotes(TEST_FLOW_DATA.additionalNotes)
    // Safety data
    setHasChestPain(TEST_FLOW_DATA.hasChestPain)
    setHasSevereSymptoms(TEST_FLOW_DATA.hasSevereSymptoms)
    setIsEmergency(TEST_FLOW_DATA.isEmergency)
    // Medicare data
    setMedicareNumber(TEST_FLOW_DATA.medicare.number)
    setMedicareValid(true)
    setMedicareError(null)
    setIrn(TEST_FLOW_DATA.medicare.irn)
    setDateOfBirth(TEST_FLOW_DATA.medicare.dob)
    // Skip to appropriate step based on auth state
    if (isAuthenticated && !needsOnboarding) {
      setStep("review")
    } else {
      setStep("medicare")
    }
  }

  // Date range calculation
  const getDateRange = () => {
    if (duration === "specific") {
      return { from: specificDateFrom, to: specificDateTo }
    }

    const today = new Date()
    const from = today.toISOString().split("T")[0]
    let to = from

    const durationMap: Record<string, number> = {
      "1": 0,
      "2": 1,
      "3": 2,
      "4-7": 6,
      "1-2weeks": 13,
    }

    if (duration && duration in durationMap) {
      const d = new Date(today)
      d.setDate(d.getDate() + durationMap[duration])
      to = d.toISOString().split("T")[0]
    }

    return { from, to }
  }

  // Validation
  const canProceed = () => {
    switch (step) {
      case "type":
        return certType !== null
      case "duration":
        return duration === "specific" ? specificDateFrom && specificDateTo : duration !== null
      case "symptoms":
        if (isCarer) {
          return carerPatientName.trim() && carerRelationship && selectedSymptoms.length > 0
        }
        return selectedSymptoms.length > 0
      case "notes":
        return true
      case "safety":
        return hasChestPain !== null && hasSevereSymptoms !== null && isEmergency !== null && !isRedFlag
      case "medicare":
        return medicareValid && irn !== null && dateOfBirth
      case "signup":
        return signupMode === "existing" ? email && password : fullName && email && password && termsAccepted
      case "review":
      case "payment":
        return true
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
      sessionStorage.setItem("pending_profile_dob", dateOfBirth)

      const callbackUrl = new URL("/auth/callback", window.location.origin)
      callbackUrl.searchParams.set("redirect", window.location.pathname)
      callbackUrl.searchParams.set("flow", "questionnaire")

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || callbackUrl.toString(),
        },
      })

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : MICROCOPY.errors.signIn)
      setIsGoogleLoading(false)
    }
  }

  // Email signup
  const handleEmailSignup = async () => {
    setIsSubmitting(true)
    setError(null)

    const supabase = createClient()

    try {
      sessionStorage.setItem("pending_profile_name", fullName)
      sessionStorage.setItem("pending_profile_dob", dateOfBirth)
      sessionStorage.setItem("questionnaire_flow", "true")
      sessionStorage.setItem("questionnaire_path", window.location.pathname)

      if (signupMode === "existing") {
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError
        if (!authData.user) throw new Error(MICROCOPY.errors.signIn)

        const { profileId } = await createOrGetProfile(
          authData.user.id,
          authData.user.user_metadata?.full_name || "",
          dateOfBirth,
        )

        if (!profileId) throw new Error(MICROCOPY.errors.generic)

        setPatientId(profileId)
        setIsAuthenticated(true)
        setNeedsOnboarding(false)
        goNext()
      } else {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
              `${window.location.origin}${window.location.pathname}`,
            data: {
              full_name: fullName,
              date_of_birth: dateOfBirth,
              role: "patient",
            },
          },
        })

        if (signUpError) throw signUpError
        if (!authData.user) throw new Error(MICROCOPY.errors.signUp)

        if (authData.session) {
          const { profileId } = await createOrGetProfile(authData.user.id, fullName, dateOfBirth)

          if (!profileId) throw new Error(MICROCOPY.errors.generic)

          await supabase
            .from("profiles")
            .update({
              medicare_number: medicareNumber.replace(/\s/g, ""),
              medicare_irn: irn,
              onboarding_completed: true,
            })
            .eq("id", profileId)

          setPatientId(profileId)
          setIsAuthenticated(true)
          setNeedsOnboarding(false)
          goNext()
        } else {
          setError(MICROCOPY.signup.confirmEmail)
          setSignupMode("existing")
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : MICROCOPY.errors.generic)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit and pay
  const handleSubmit = async () => {
    if (!patientId) {
      setError(MICROCOPY.errors.session)
      setStep("signup")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const dates = getDateRange()

    const answers = {
      certificate_type: certType,
      duration,
      date_from: dates.from,
      date_to: dates.to,
      symptoms: selectedSymptoms,
      other_symptom: selectedSymptoms.includes("Other") ? otherSymptom : null,
      additional_notes: additionalNotes || null,
      carer_patient_name: isCarer ? carerPatientName : null,
      carer_relationship: isCarer ? carerRelationship : null,
      safety_chest_pain: hasChestPain,
      safety_severe_symptoms: hasSevereSymptoms,
      safety_emergency: isEmergency,
    }

    try {
      // Use test action if test mode is enabled
      const checkoutAction = IS_TEST_MODE ? createTestRequestAction : createRequestAndCheckoutAction
      
      const result = await checkoutAction({
        category: "medical_certificate",
        subtype: certType || "work",
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
    if (duration === "specific") {
      return `${formatDate(specificDateFrom)} – ${formatDate(specificDateTo)}`
    }
    return DURATION_OPTIONS.find((o) => o.value === duration)?.label || duration
  }

  // Get cert type label
  const getCertTypeLabel = () => {
    return CERT_TYPES.find((t) => t.id === certType)?.label || certType
  }

  // Render step content
  const renderStep = () => {
    switch (step) {
      case "type":
        return (
          <section aria-labelledby="step-type-heading" className="space-y-4">
            <StepHeader
              title={MICROCOPY.type.heading}
              subtitle={MICROCOPY.type.subtitle}
              stepNumber={1}
              totalSteps={5}
            />

            {/* Test Mode: Skip entire flow with test data */}
            {IS_TEST_MODE && (
              <button
                type="button"
                onClick={fillAllTestData}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <FlaskConical className="w-4 h-4" />
                <span className="text-sm font-medium">Skip to review with test data</span>
              </button>
            )}

            <div className="space-y-2" role="radiogroup" aria-label="Certificate type">
              {CERT_TYPES.map((type) => (
                <TileButton
                  key={type.id}
                  selected={certType === type.id}
                  onClick={() => selectCertType(type.id)}
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
          <section aria-labelledby="step-duration-heading" className="space-y-4">
            <StepHeader title={MICROCOPY.duration.heading} />

            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Duration">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectDuration(option.value)}
                  aria-pressed={duration === option.value}
                  className={`
                    min-h-[48px] p-3 rounded-xl border-2 font-medium text-sm transition-all
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                    ${
                      duration === option.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-white hover:border-primary/40"
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {duration === "specific" && (
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
                      value={specificDateFrom}
                      onChange={(e) => setSpecificDateFrom(e.target.value)}
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
                      value={specificDateTo}
                      onChange={(e) => setSpecificDateTo(e.target.value)}
                      className="h-11 rounded-xl"
                      min={specificDateFrom}
                    />
                  </div>
                </div>
              </fieldset>
            )}
          </section>
        )

      case "symptoms":
        return (
          <section aria-labelledby="step-symptoms-heading" className="space-y-4">
            <StepHeader
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
                    value={carerPatientName}
                    onChange={(e) => setCarerPatientName(e.target.value)}
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
                        selected={carerRelationship === rel}
                        onClick={() => setCarerRelationship(rel)}
                        label={rel}
                      />
                    ))}
                  </div>
                </div>
              </fieldset>
            )}

            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Symptoms">
              {SYMPTOMS.map((symptom) => (
                <ChipButton
                  key={symptom}
                  selected={selectedSymptoms.includes(symptom)}
                  onClick={() => toggleSymptom(symptom)}
                  label={symptom}
                />
              ))}
            </div>

            {selectedSymptoms.includes("Other") && (
              <div className="space-y-1">
                <Label htmlFor="other-symptom" className="text-xs font-medium">
                  {MICROCOPY.symptoms.otherLabel}
                </Label>
                <Input
                  id="other-symptom"
                  placeholder={MICROCOPY.symptoms.otherPlaceholder}
                  value={otherSymptom}
                  onChange={(e) => setOtherSymptom(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            )}
          </section>
        )

      case "notes":
        return (
          <section aria-labelledby="step-notes-heading" className="space-y-4">
            <StepHeader title={MICROCOPY.notes.heading} subtitle={MICROCOPY.notes.subtitle} />

            <div className="space-y-1">
              <Label htmlFor="notes" className="sr-only">
                Additional notes
              </Label>
              <Textarea
                id="notes"
                placeholder={MICROCOPY.notes.placeholder}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="min-h-[120px] rounded-xl resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {MICROCOPY.notes.charCount(additionalNotes.length)}
              </p>
            </div>
          </section>
        )

      case "safety":
        return (
          <section aria-labelledby="step-safety-heading" className="space-y-4">
            <StepHeader title={MICROCOPY.safety.heading} subtitle={MICROCOPY.safety.subtitle} />

            <fieldset className="space-y-3">
              <legend className="sr-only">Safety screening questions</legend>

              {[
                {
                  id: "chest-pain",
                  question: MICROCOPY.safety.questions.chestPain,
                  value: hasChestPain,
                  setter: setHasChestPain,
                },
                {
                  id: "severe",
                  question: MICROCOPY.safety.questions.severe,
                  value: hasSevereSymptoms,
                  setter: setHasSevereSymptoms,
                },
                {
                  id: "emergency",
                  question: MICROCOPY.safety.questions.emergency,
                  value: isEmergency,
                  setter: setIsEmergency,
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
                          if (val) setShowEmergencyModal(true)
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

      case "medicare":
        return (
          <section aria-labelledby="step-medicare-heading" className="space-y-4">
            <StepHeader title={MICROCOPY.medicare.heading} subtitle={MICROCOPY.medicare.subtitle} />

            {/* Test Mode Button */}
            {IS_TEST_MODE && (
              <button
                type="button"
                onClick={fillTestMedicareData}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <FlaskConical className="w-4 h-4" />
                <span className="text-sm font-medium">{MICROCOPY.medicare.testMode.fillButton}</span>
              </button>
            )}

            <div className="p-4 rounded-xl bg-white border border-border space-y-4">
              <div className="space-y-1">
                <Label htmlFor="medicare-number" className="text-xs font-medium">
                  {MICROCOPY.medicare.numberLabel}
                </Label>
                <div className="relative">
                  <Input
                    id="medicare-number"
                    type="text"
                    inputMode="numeric"
                    placeholder={MICROCOPY.medicare.numberPlaceholder}
                    value={medicareNumber}
                    onChange={(e) => handleMedicareChange(e.target.value)}
                    className={`h-12 rounded-xl text-lg tracking-wider pr-10 font-mono ${
                      medicareError ? "border-destructive" : medicareValid ? "border-green-500" : ""
                    }`}
                    aria-describedby={medicareError ? "medicare-error" : medicareValid ? "medicare-success" : undefined}
                    aria-invalid={!!medicareError}
                    autoComplete="off"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {medicareValid && <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />}
                    {medicareError && medicareNumber.length > 0 && (
                      <AlertCircle className="w-5 h-5 text-destructive" aria-hidden="true" />
                    )}
                  </div>
                </div>
                {medicareError && medicareNumber.length > 0 && (
                  <p id="medicare-error" className="text-xs text-destructive" role="alert">
                    {medicareError}
                  </p>
                )}
                {medicareValid && (
                  <p id="medicare-success" className="text-xs text-green-600">
                    {MICROCOPY.medicare.valid}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Label className="text-xs font-medium">{MICROCOPY.medicare.irnLabel}</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="p-0.5 rounded-full hover:bg-muted" aria-label="What is IRN?">
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <p className="text-xs">{MICROCOPY.medicare.irnTooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex gap-1.5 flex-wrap" role="radiogroup" aria-label="Individual Reference Number">
                  {IRNS.map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setIrn(num)}
                      aria-pressed={irn === num}
                      className={`
                        w-10 h-10 rounded-lg text-sm font-medium transition-all
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                        ${irn === num ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}
                      `}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="dob" className="text-xs font-medium">
                  {MICROCOPY.medicare.dobLabel}
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="h-12 rounded-xl"
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
          </section>
        )

      case "signup":
        return (
          <section aria-labelledby="step-signup-heading" className="space-y-4">
            <StepHeader
              title={signupMode === "new" ? MICROCOPY.signup.headingNew : MICROCOPY.signup.headingExisting}
              subtitle={MICROCOPY.signup.subtitle}
            />

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleAuth}
                disabled={isGoogleLoading}
                className="w-full h-12 rounded-xl gap-3 bg-transparent"
              >
                {isGoogleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon className="w-5 h-5" />}
                {MICROCOPY.signup.google}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">{MICROCOPY.signup.or}</span>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleEmailSignup()
                }}
                className="space-y-3"
              >
                {signupMode === "new" && (
                  <div className="space-y-1">
                    <Label htmlFor="fullName" className="text-xs font-medium">
                      {MICROCOPY.signup.nameLabel}
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder={MICROCOPY.signup.namePlaceholder}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-11 rounded-xl"
                      autoComplete="name"
                      required
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs font-medium">
                    {MICROCOPY.signup.emailLabel}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={MICROCOPY.signup.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="password" className="text-xs font-medium">
                    {MICROCOPY.signup.passwordLabel}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        signupMode === "new"
                          ? MICROCOPY.signup.passwordPlaceholderNew
                          : MICROCOPY.signup.passwordPlaceholderExisting
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl pr-10"
                      autoComplete={signupMode === "new" ? "new-password" : "current-password"}
                      required
                      minLength={signupMode === "new" ? 8 : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
                      aria-label={showPassword ? MICROCOPY.signup.hidePassword : MICROCOPY.signup.showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  {signupMode === "existing" && (
                    <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                      {MICROCOPY.signup.forgotPassword}
                    </Link>
                  )}
                </div>

                {signupMode === "new" && (
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="terms" className="text-xs text-muted-foreground leading-tight">
                      {MICROCOPY.signup.terms.prefix}{" "}
                      <Link href="/terms" className="text-primary hover:underline">
                        {MICROCOPY.signup.terms.termsLink}
                      </Link>{" "}
                      {MICROCOPY.signup.terms.and}{" "}
                      <Link href="/privacy" className="text-primary hover:underline">
                        {MICROCOPY.signup.terms.privacyLink}
                      </Link>
                    </Label>
                  </div>
                )}

                <Button type="submit" disabled={isSubmitting || !canProceed()} className="w-full h-12 rounded-xl">
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : signupMode === "new" ? (
                    MICROCOPY.signup.ctaNew
                  ) : (
                    MICROCOPY.signup.ctaExisting
                  )}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground">
                {signupMode === "new" ? (
                  <>
                    {MICROCOPY.signup.switchToExisting}{" "}
                    <button
                      type="button"
                      onClick={() => setSignupMode("existing")}
                      className="text-primary hover:underline font-medium"
                    >
                      {MICROCOPY.signup.signIn}
                    </button>
                  </>
                ) : (
                  <>
                    {MICROCOPY.signup.switchToNew}{" "}
                    <button
                      type="button"
                      onClick={() => setSignupMode("new")}
                      className="text-primary hover:underline font-medium"
                    >
                      {MICROCOPY.signup.createAccount}
                    </button>
                  </>
                )}
              </p>
            </div>
          </section>
        )

      case "review":
        return (
          <section aria-labelledby="step-review-heading" className="space-y-4">
            <StepHeader title={MICROCOPY.review.heading} subtitle={MICROCOPY.review.subtitle} />

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

              {/* Symptoms */}
              <div className="flex items-center justify-between p-3">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{MICROCOPY.review.symptoms}</p>
                  <p className="text-sm font-medium truncate">
                    {selectedSymptoms.join(", ")}
                    {selectedSymptoms.includes("Other") && otherSymptom && ` (${otherSymptom})`}
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
                  <p className="text-sm font-medium truncate">{additionalNotes || MICROCOPY.review.none}</p>
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
              <div className="flex items-center justify-between p-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">{MICROCOPY.review.medicare}</p>
                  <p className="text-sm font-medium font-mono">
                    {medicareNumber} (IRN {irn})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => goToStep("medicare")}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label={`${MICROCOPY.review.edit} ${MICROCOPY.review.medicare}`}
                >
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </section>
        )

      case "payment":
        return (
          <section aria-labelledby="step-payment-heading" className="space-y-4">
            <StepHeader title={MICROCOPY.payment.heading} subtitle={MICROCOPY.payment.subtitle} />

            {/* Test Mode Banner */}
            {IS_TEST_MODE && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <FlaskConical className="w-5 h-5 text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">{MICROCOPY.payment.testMode.badge}</p>
                  <p className="text-xs text-amber-600">{MICROCOPY.payment.testMode.tooltip}</p>
                </div>
              </div>
            )}

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
            {step !== "type" && (
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
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting} 
                className={`flex-1 h-12 rounded-xl gap-2 ${IS_TEST_MODE ? "bg-amber-500 hover:bg-amber-600" : ""}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {MICROCOPY.payment.processing}
                  </>
                ) : IS_TEST_MODE ? (
                  <>
                    <FlaskConical className="w-5 h-5" />
                    {MICROCOPY.payment.testMode.cta}
                  </>
                ) : (
                  <>
                    {MICROCOPY.payment.cta}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            ) : step === "signup" ? null : (
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
