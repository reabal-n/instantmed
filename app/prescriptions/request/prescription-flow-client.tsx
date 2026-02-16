"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button, Input, DatePickerField } from "@/components/uix"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Pill,
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
  Lock,
  BadgeCheck,
  Phone,
  Save,
} from "lucide-react"
import { createIntakeAndCheckoutAction } from "@/lib/stripe/checkout"
import { useUser } from "@clerk/nextjs"
import { InlineAuthStep } from "@/components/shared/inline-auth-step"
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RX_MICROCOPY } from "@/lib/microcopy/prescription"
import { MedicationSearch, type SelectedPBSProduct } from "@/components/shared/medication-search"
import { AnimatedSelect } from "@/components/ui/animated-select"
import { CinematicSwitch } from "@/components/ui/cinematic-switch"
import { ButtonSpinner } from "@/components/ui/unified-skeleton"
import { createLogger } from "@/lib/observability/logger"
const log = createLogger("prescription-flow-client")

// Draft persistence constants
const STORAGE_KEY = "instantmed_rx_draft"
const DRAFT_EXPIRY_HOURS = 24

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
// New scripts require General Consult ($49.95)
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
  { id: "mental_health", label: "Mental health", icon: Brain, color: "#4f46e5" },
  { id: "cardiovascular", label: "Blood pressure / heart", icon: Heart, color: "#EF4444" },
  { id: "diabetes", label: "Diabetes", icon: Droplets, color: "#3B82F6" },
  { id: "respiratory", label: "Asthma / respiratory", icon: Wind, color: "#4f46e5" },
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

// Time estimate per stage in minutes
const STAGE_TIME_ESTIMATES = [4, 1, 1, 1] // Details takes longer due to medication search

// Trust indicators strip
function TrustStrip() {
  return (
    <div className="flex items-center justify-center gap-4 py-2 px-3 bg-muted/50 rounded-lg">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
            <BadgeCheck className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />
            <span className="hidden sm:inline">AHPRA Doctors</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-xs">
          All prescriptions reviewed by AHPRA-registered Australian doctors
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
            <Lock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span className="hidden sm:inline">Encrypted</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-xs">
          Your data is protected with bank-level 256-bit encryption
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
            <Shield className="w-3.5 h-3.5 text-purple-600" aria-hidden="true" />
            <span className="hidden sm:inline">Private</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-xs">
          We never sell your data. Your health information stays private.
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

interface Props {
  patientId: string | null
  isAuthenticated: boolean
  needsOnboarding: boolean
  userEmail?: string
  userName?: string
}

// Progress indicator with animated dots and time estimate
function Progress({ stages, currentIndex }: { stages: readonly string[]; currentIndex: number }) {
  // Calculate remaining time
  const remainingMinutes = STAGE_TIME_ESTIMATES.slice(currentIndex).reduce((a, b) => a + b, 0)
  
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
        {/* Step label with time estimate */}
        <p className="text-xs text-muted-foreground">
          Step {currentIndex + 1} of {stages.length}: <span className="font-medium text-foreground">{stages[currentIndex]}</span>
          <span className="ml-2 text-muted-foreground/70">~{remainingMinutes} min left</span>
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
      className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-300 ${
        selected
          ? "border-sky-300/60 dark:border-sky-600/40 bg-sky-50/80 dark:bg-sky-900/20 shadow-[0_2px_8px_rgba(138,187,224,0.15)]"
          : "border-slate-200/60 dark:border-slate-700/40 bg-white/90 dark:bg-white/5 hover:border-slate-300 hover:bg-white"
      }`}
    >
      <div className="flex items-center gap-3">
        {emoji && (
          <span className="text-2xl">{emoji}</span>
        )}
        {Icon && !emoji && (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
              selected 
                ? "bg-sky-100 dark:bg-sky-800/40 text-sky-600 dark:text-sky-400" 
                : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400"
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-medium transition-colors ${selected ? "text-slate-800 dark:text-slate-200" : "text-slate-700 dark:text-slate-300"}`}>{label}</p>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-800/40 flex items-center justify-center">
            <Check className="w-3 h-3 text-sky-600 dark:text-sky-400" />
          </div>
        )}
      </div>
    </button>
  )
}

// Pill button - calm selection styling per brand guidelines
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
      className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
        selected 
          ? "bg-sky-50 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200 border-2 border-sky-300/60 dark:border-sky-600/40 shadow-[0_2px_8px_rgba(138,187,224,0.15)]" 
          : "bg-white/90 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-2 border-slate-200/60 dark:border-slate-700/40 hover:border-slate-300 hover:bg-white"
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
            <AlertTriangle className="w-5 h-5 text-dawn-600" />
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
        <Button onClick={onClose} className="w-full rounded-lg">
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
        <AlertTriangle className="w-8 h-8 text-dawn-600" />
      </div>
      <h1 className="text-xl font-semibold mb-2">{RX_MICROCOPY.safety.knockoutTitle}</h1>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">{RX_MICROCOPY.safety.knockoutBody}</p>
      <Button asChild variant="outline" className="rounded-lg">
        <a
          href="https://www.healthdirect.gov.au/australian-health-services"
          target="_blank"
          rel="noopener noreferrer"
        >
          {RX_MICROCOPY.safety.knockoutCta}
          <ExternalLink className="w-4 h-4 ml-2" />
        </a>
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
  
  // Clerk auth state
  const { isLoaded: isClerkLoaded, isSignedIn } = useUser()

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

  // Form state - structured medication selection
  const [selectedMedication, setSelectedMedication] = useState<SelectedPBSProduct | null>(null)
  
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

  // Form data for draft persistence (name/email from props or Clerk)
  const [fullName, setFullName] = useState(userName || "")
  const [email, setEmail] = useState(userEmail || "")

  // Controlled substance warning
  const [showControlledWarning, setShowControlledWarning] = useState(false)
  const [isKnockedOut, setIsKnockedOut] = useState(false)
  
  // Draft persistence state
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const draftCheckDone = useRef(false)

  // Only repeat scripts - new scripts require General Consult
  const steps = REPEAT_STEPS
  const stepIndex = steps.indexOf(step)

  // Get progress stage index
  const getProgressIndex = () => {
    if (["type", "medication", "gating", "condition", "duration", "control", "sideEffects", "notes", "safety"].includes(step))
      return 0
    if (step === "medicare") return 1
    if (step === "signup") return 2
    return 3
  }
  
  // Draft persistence - collect form data
  const getFormData = useCallback(() => ({
    rxType,
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
    step,
  }), [rxType, selectedMedication, prescribedBefore, doseChanged, condition, otherCondition, duration, control, sideEffects, notes, safetyAnswers, medicareNumber, irn, dob, fullName, email, step])
  
  // Check for existing draft on mount
  useEffect(() => {
    if (draftCheckDone.current) return
    draftCheckDone.current = true
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const { data, timestamp } = JSON.parse(saved)
        const age = (Date.now() - timestamp) / (1000 * 60 * 60)
        if (age < DRAFT_EXPIRY_HOURS && data.step !== "type") {
          setShowRecoveryPrompt(true)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])
  
  // Auto-save draft
  useEffect(() => {
    if (step === "type" || step === "payment") return
    
    const timer = setTimeout(() => {
      try {
        const draft = { data: getFormData(), timestamp: Date.now() }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
        setLastSaved(new Date())
      } catch {
        // localStorage may be full or unavailable
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [getFormData, step])
  
  // Restore draft
  const restoreDraft = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const { data } = JSON.parse(saved)
        if (data.rxType) setRxType(data.rxType)
        if (data.selectedMedication) setSelectedMedication(data.selectedMedication)
        if (data.prescribedBefore !== null) setPrescribedBefore(data.prescribedBefore)
        if (data.doseChanged !== null) setDoseChanged(data.doseChanged)
        if (data.condition) setCondition(data.condition)
        if (data.otherCondition) setOtherCondition(data.otherCondition)
        if (data.duration) setDuration(data.duration)
        if (data.control) setControl(data.control)
        if (data.sideEffects) setSideEffects(data.sideEffects)
        if (data.notes) setNotes(data.notes)
        if (data.safetyAnswers) setSafetyAnswers(data.safetyAnswers)
        if (data.medicareNumber) setMedicareNumber(data.medicareNumber)
        if (data.irn) setIrn(data.irn)
        if (data.dob) setDob(data.dob)
        if (data.fullName) setFullName(data.fullName)
        if (data.email) setEmail(data.email)
        if (data.step && data.step !== "type") setStep(data.step)
      }
    } catch {
      // Ignore errors
    }
    setShowRecoveryPrompt(false)
  }
  
  // Start fresh
  const startFresh = () => {
    localStorage.removeItem(STORAGE_KEY)
    setShowRecoveryPrompt(false)
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
        // InlineAuthStep handles its own validation - always allow continue if authenticated
        return isAuthenticated && !!patientId
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

  // Handle auth completion from InlineAuthStep
  const handleAuthComplete = useCallback((userId: string, profileId: string) => {
    setPatientId(profileId)
    setIsAuthenticated(true)
    setNeedsOnboarding(false)
    // Auto-advance to review step
    goTo("review")
  }, [goTo])

  // Handle submit
  const handleSubmit = async () => {
    if (!isAuthenticated || !patientId) {
      setError("Please complete the signup step before submitting.")
      setStep("signup")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Generate idempotency key to prevent duplicate submissions on double-click
      const idempotencyKey = crypto.randomUUID()
      const result = await createIntakeAndCheckoutAction({
        category: "prescription",
        subtype: rxType || "repeat",
        type: "script",
        answers: {
          // PBS-backed structured medication data
          pbs_code: selectedMedication?.pbs_code,
          medication_name: selectedMedication?.drug_name,
          strength: selectedMedication?.strength,
          form: selectedMedication?.form,
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
        idempotencyKey,
      })

      if (!result.success) {
        setError(result.error || RX_MICROCOPY.errors.generic)
        return
      }
      
      if (!result.checkoutUrl) {
        setError("No checkout URL received. Please try again.")
        return
      }
      
      window.location.href = result.checkoutUrl
    } catch {
      setError(RX_MICROCOPY.errors.generic)
    } finally {
      setIsSubmitting(false)
    }
  }

   
  useEffect(() => {
    const restoreFormData = () => {
      // Restore form data from sessionStorage if returning from auth
      const savedFormData = sessionStorage.getItem("rx_form_data")
      
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
          log.error("Failed to restore form data", { error: e })
        }
      }
    }
    restoreFormData()
  }, [])

  // Sync Clerk auth state - if user signs in via Clerk, update local state
  useEffect(() => {
    // Skip if already authenticated or Clerk not loaded
    if (!isClerkLoaded || isAuthenticated) return
    
    // If signed in via Clerk but not authenticated locally, the InlineAuthStep
    // will handle profile creation and call handleAuthComplete
  }, [isClerkLoaded, isSignedIn, isAuthenticated])

  // If knocked out by safety check
  if (isKnockedOut) {
    return <SafetyKnockout />
  }

  return (
    <TooltipProvider>
      <div className="h-screen bg-linear-to-b from-background to-muted/30 flex flex-col overflow-hidden">
        {/* Draft Recovery Modal */}
        {showRecoveryPrompt && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-background rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Continue where you left off?</h2>
                <p className="text-sm text-muted-foreground">
                  We saved your progress from your last visit.
                </p>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={restoreDraft}
                  className="w-full h-12 rounded-xl"
                >
                  Continue my request
                </Button>
                <Button
                  onClick={startFresh}
                  variant="ghost"
                  className="w-full h-10 rounded-xl"
                >
                  Start fresh
                </Button>
              </div>
            </div>
          </div>
        )}

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
            <TrustStrip />
            <div className="mt-3">
              <Progress stages={PROGRESS_STAGES} currentIndex={getProgressIndex()} />
            </div>
          </div>
        </header>

        {/* Content */}
        <main
          className={`flex-1 max-w-md mx-auto w-full px-4 py-5 overflow-y-auto transition-opacity duration-150 ${isTransitioning ? "opacity-0" : "opacity-100"}`}
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
              <MedicationSearch
                value={selectedMedication}
                onChange={setSelectedMedication}
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
                        ? "border-dawn-500 bg-amber-50 text-amber-700"
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
                        ? "border-dawn-500 bg-amber-50 text-amber-700"
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
                    <AlertTriangle className="h-5 w-5 text-dawn-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-900">This request requires a general consultation</p>
                      <p className="text-sm text-amber-700 mt-1">
                        {prescribedBefore === false
                          ? "New medications require a doctor consultation to assess suitability."
                          : "Dose changes require a doctor consultation to ensure safety."}
                      </p>
                    </div>
                  </div>
                  <Button asChild className="w-full rounded-lg bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white">
                    <Link href="/consult">
                      Continue to General Consult ($49.95)
                    </Link>
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
                <p className="text-xs text-dawn-600">
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
                    <p className="text-sm pr-4 flex-1">{q.label}</p>
                    <CinematicSwitch
                      value={safetyAnswers[q.id] ?? undefined}
                      onChange={(value) => setSafetyAnswers((prev) => ({ ...prev, [q.id]: value }))}
                      onLabel="YES"
                      offLabel="NO"
                      variant="safety"
                      className="shrink-0"
                    />
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
                  <DatePickerField
                    label="Date of birth"
                    value={dob}
                    onChange={(date: string | null) => setDob(date || "")}
                    disableFuture
                    size="md"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step: Signup - Uses Clerk via InlineAuthStep */}
          {step === "signup" && (
            <div className="space-y-4 animate-step-enter">
              <InlineAuthStep
                onBack={() => goTo("medicare")}
                onAuthComplete={handleAuthComplete}
                serviceName="prescription"
              />
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
                    <p className="text-sm font-medium">{selectedMedication?.drug_name || "Not selected"}</p>
                    {selectedMedication && (
                      <>
                        {selectedMedication.strength && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {selectedMedication.strength}
                          </p>
                        )}
                        {selectedMedication.form && (
                          <p className="text-xs text-muted-foreground/70">
                            {selectedMedication.form}
                          </p>
                        )}
                      </>
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
        {step !== "signup" && (
          <footer className="shrink-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 safe-area-pb">
            <div className="max-w-md mx-auto space-y-3">
              {/* Save indicator & Emergency info */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  {lastSaved && (
                    <>
                      <Save className="w-3 h-3 text-green-500" aria-hidden="true" />
                      <span>Progress saved</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-red-500" aria-hidden="true" />
                  <span>Emergency? Call <a href="tel:000" className="underline font-medium">000</a></span>
                </div>
              </div>

              <div className="flex gap-3">
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
                        <ButtonSpinner className="mr-2" />
                        {RX_MICROCOPY.payment.processing}
                      </>
                    ) : (
                      RX_MICROCOPY.payment.cta
                    )}
                  </Button>
                ) : step === "safety" && checkSafetyKnockout() ? (
                  <Button onClick={() => setIsKnockedOut(true)} variant="outline" className="flex-1 h-12 rounded-xl">
                    Find a doctor near you
                  </Button>
                ) : (
                  <Button onClick={goNext} disabled={!canContinue()} className="flex-1 h-12 rounded-xl">
                    {RX_MICROCOPY.nav.continue}
                  </Button>
                )}
              </div>
            </div>
          </footer>
        )}
      </div>
    </TooltipProvider>
  )
}
