"use client"

/**
 * @deprecated This component is being replaced by the unified /request flow.
 * 
 * Use the new unified flow instead:
 * - Import: `import { RequestFlow } from "@/components/request"`
 * - Route: `/request?service=prescription` or `/request?service=repeat-script`
 * 
 * This legacy component will be removed in a future release.
 * Migration guide: See ARCHITECTURE.md → Intake System
 * 
 * @see /components/request/request-flow.tsx
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import confetti from "canvas-confetti"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  X,
  Check,
  Clock,
  Shield,
  Lock,
  BadgeCheck,
  ChevronRight,
  Pill,
  RefreshCw,
} from "lucide-react"
import { ButtonSpinner } from "@/components/ui/unified-skeleton"
import { createClient } from "@/lib/supabase/client"
import { createOrGetProfile } from "@/app/actions/create-profile"
import type { User } from "@supabase/supabase-js"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { MedicationSearch, type SelectedPBSProduct } from "@/components/shared/medication-search"
import { REPEAT_RX_COPY } from "@/lib/microcopy/repeat-rx"
import type {
  RepeatRxStep,
  EligibilityResult,
} from "@/types/repeat-rx"
import { cn } from "@/lib/utils"
import { FieldLabelWithHelp } from "@/components/ui/help-tooltip"
import { InfoCard } from "@/components/ui/contextual-help"
import { ProgressiveSection } from "@/components/ui/progressive-section"
import { CompactStepper } from "@/components/ui/form-stepper"
import { SafetyStep } from "./steps/safety-step"
import { SmartSymptomInput, isSymptomInputValid } from "@/components/intake/smart-symptom-input"
import { SmartValidation } from "@/components/intake/smart-validation"
import { useFormAnalytics } from "@/hooks/use-form-analytics"

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS: RepeatRxStep[] = [
  "safety",      // CRITICAL: Emergency gate FIRST - before any clinical data
  "auth",
  "medication",
  "history",
  "medical_history",
  "attestation",
  "review",
  "payment",
  "confirmation",
]

// Future: Steps that can be skipped for logged-in users with prefill
const _SKIPPABLE_STEPS: RepeatRxStep[] = []

// Future: Storage key for form persistence
const _STORAGE_KEY = "instantmed_repeat_rx_draft"
const _DRAFT_EXPIRY_HOURS = 24

// ============================================================================
// TYPES
// ============================================================================

interface RepeatRxIntakeProps {
  patientId: string | null
  isAuthenticated: boolean
  needsOnboarding: boolean
  userEmail?: string
  userName?: string
  userPhone?: string
  userDob?: string
  userAddress?: string
  preferredPharmacy?: {
    name: string
    address: string
    phone: string
  } | null
}

// ============================================================================
// PROGRESS INDICATOR - Now uses CompactStepper from form-stepper.tsx
// ============================================================================

function ProgressIndicator({
  currentStep,
  steps,
}: {
  currentStep: RepeatRxStep
  steps: RepeatRxStep[]
}) {
  // Filter out auth and confirmation for display
  const displaySteps = steps.filter(s => s !== "auth" && s !== "confirmation")
  
  if (currentStep === "auth" || currentStep === "confirmation") {
    return null
  }
  
  const currentIndex = displaySteps.indexOf(currentStep as typeof displaySteps[number])
  const totalSteps = displaySteps.length

  return (
    <CompactStepper 
      current={currentIndex} 
      total={totalSteps}
      labels={displaySteps}
    />
  )
}

// ============================================================================
// NOTE: Emergency disclaimer is now handled by SafetyStep using EmergencyGate
// component at the start of the flow (see steps/safety-step.tsx)
// ============================================================================

// ============================================================================
// TRUST STRIP
// ============================================================================

function TrustStrip() {
  return (
    <div className="flex items-center justify-center gap-4 py-2 text-xs text-muted-foreground">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <BadgeCheck className="w-3.5 h-3.5 text-green-600" />
              <span>{REPEAT_RX_COPY.trust.ahpra}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>All doctors are AHPRA-registered</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span>{REPEAT_RX_COPY.trust.encrypted}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Bank-level encryption protects your data</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-help">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>{REPEAT_RX_COPY.trust.private}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>We never sell your data</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

// ============================================================================
// AUTH STEP
// ============================================================================

function AuthStep({
  onSignIn,
  onGuest,
  isLoading,
}: {
  onSignIn: () => void
  onGuest: () => void
  isLoading: boolean
}) {
  return (
    <div className="space-y-6 animate-step-enter">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">{REPEAT_RX_COPY.titles.main}</h1>
        <p className="text-muted-foreground">{REPEAT_RX_COPY.titles.subtitle}</p>
      </div>
      
      <div className="space-y-4">
        <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
          <h2 className="font-semibold">{REPEAT_RX_COPY.auth.heading}</h2>
          <p className="text-sm text-muted-foreground">{REPEAT_RX_COPY.auth.subtitle}</p>
          
          <Button
            onClick={onSignIn}
            disabled={isLoading}
            className="w-full h-12 rounded-full bg-linear-to-r from-primary-500 to-primary-600 text-white shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgb(59,130,246,0.4)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <ButtonSpinner className="mr-2" />
            ) : null}
            {REPEAT_RX_COPY.auth.signInButton}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={onGuest}
            disabled={isLoading}
            className="w-full h-12 rounded-full bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 hover:bg-white/85 dark:hover:bg-white/10 hover:shadow-[0_4px_12px_rgb(59,130,246,0.1)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {REPEAT_RX_COPY.auth.guestButton}
          </Button>
        </div>
        
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_4px_16px_rgb(0,0,0,0.04)] space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Sign in for the best experience:
          </p>
          <ul className="space-y-1.5">
            {REPEAT_RX_COPY.auth.signInBenefits.map((benefit, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <TrustStrip />
    </div>
  )
}

// ============================================================================
// STEP HEADER
// ============================================================================

function StepHeader({
  title,
  subtitle,
  emoji,
}: {
  title: string
  subtitle?: string
  emoji?: string
}) {
  return (
    <div className="text-center space-y-1">
      {emoji && <div className="text-3xl mb-2">{emoji}</div>}
      <h1 className="text-xl font-semibold">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

// ============================================================================
// OPTION CARD (future use for multi-select options)
// ============================================================================

function _OptionCard({
  selected,
  onClick,
  label,
  description,
}: {
  selected: boolean
  onClick: () => void
  label: string
  description?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
        "hover:scale-[1.01] active:scale-[0.99]",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border/60 bg-white/50 hover:border-primary/40"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className={cn(
            "font-medium transition-colors",
            selected ? "text-primary" : "text-foreground"
          )}>
            {label}
          </p>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {selected && (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>
    </button>
  )
}

// ============================================================================
// PILL BUTTON
// ============================================================================

function PillButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "min-h-[44px] px-4 py-2 rounded-full text-sm font-medium",
        "bg-white/70 dark:bg-white/5 backdrop-blur-xl",
        "border-2 border-white/40 dark:border-white/10",
        "transition-all duration-300 ease-out",
        selected
          ? "border-primary/50 bg-linear-to-r from-primary-500 to-primary-600 text-white shadow-[0_8px_30px_rgb(59,130,246,0.25)]"
          : "hover:border-primary/40 hover:bg-white/85 dark:hover:bg-white/10 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgb(59,130,246,0.12)]"
      )}
      whileHover={selected ? {} : { y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 200, damping: 30 }}
    >
      {children}
    </motion.button>
  )
}

// ============================================================================
// FORM INPUT (with InstantMed styling)
// ============================================================================

function FormInput({
  label,
  required,
  hint,
  error,
  helpText,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  helpText?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      {helpText ? (
        <FieldLabelWithHelp
          label={label}
          helpText={helpText}
          required={required}
        />
      ) : (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RepeatRxIntakeFlow({
  patientId: initialPatientId,
  isAuthenticated: initialIsAuthenticated,
  needsOnboarding: _initialNeedsOnboarding,
  userEmail: _userEmail,
  userName: _userName,
  userPhone: _userPhone,
  userDob: _userDob,
  userAddress: _userAddress,
  preferredPharmacy: _preferredPharmacy,
}: RepeatRxIntakeProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  // Form analytics for conversion tracking
  const formAnalytics = useFormAnalytics({
    formName: "repeat_rx_intake",
    service: "repeat-prescription",
  })
  
  // Supabase auth state
  const [user, setUser] = useState<User | null>(null)
  const [_isAuthLoading, setIsAuthLoading] = useState(true)
  const isSignedIn = !!user
  
  // ============================================================================
  // STATE
  // ============================================================================
  
  // Auth state
  const [_patientId, setPatientId] = useState<string | null>(initialPatientId)
  const [_isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated)
  const [_isGuest, setIsGuest] = useState(false)
  
  // Flow state
  const [currentStep, setCurrentStep] = useState<RepeatRxStep>(
    initialIsAuthenticated ? "medication" : "auth"
  )
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [medication, setMedication] = useState<SelectedPBSProduct | null>(null)
  const [_medicationSearchUsed, setMedicationSearchUsed] = useState(false)
  const [_strengthConfirmed, _setStrengthConfirmed] = useState(false)
  
  // History answers
  const [lastPrescribed, setLastPrescribed] = useState<string | null>(null)
  const [stability, setStability] = useState<string | null>(null)
  const [prescriber, setPrescriber] = useState("")
  const [indication, setIndication] = useState("")
  const [currentDose, setCurrentDose] = useState("")
  const [doseChanged, setDoseChanged] = useState<boolean | null>(null)
  
  // Safety answers (clinical safety questions - shown in medical_history step)
  const [sideEffects, _setSideEffects] = useState<string | null>(null)
  const [sideEffectsDetails, _setSideEffectsDetails] = useState("")
  const [pregnantOrBreastfeeding, _setPregnantOrBreastfeeding] = useState<boolean | null>(null)
  const [allergies, _setAllergies] = useState<string[]>([])
  const [allergyDetails, _setAllergyDetails] = useState("")
  
  // Medical history
  const [pmhxFlags, setPmhxFlags] = useState({
    heartDisease: false,
    kidneyDisease: false,
    liverDisease: false,
    diabetes: false,
    mentalHealthCondition: false,
    otherSignificant: false,
    otherDetails: "",
  })
  const [_otherMeds, _setOtherMeds] = useState<string[]>([])
  const [otherMedsInput, setOtherMedsInput] = useState("")
  
  // Attestations
  // Note: Emergency acceptance now handled by SafetyStep via EmergencyGate
  const [emergencyAccepted, setEmergencyAccepted] = useState(false)
  const [_emergencyTimestamp, _setEmergencyTimestamp] = useState<string | null>(null)
  const [gpAttestationAccepted, setGpAttestationAccepted] = useState(false)
  const [_gpAttestationTimestamp, setGpAttestationTimestamp] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  
  // Pharmacy preference (default: eToken via SMS)
  const [deliveryMethod, setDeliveryMethod] = useState<"etoken" | "pharmacy">("etoken")
  const [pharmacyName, setPharmacyName] = useState("")
  const [pharmacyLocation, setPharmacyLocation] = useState("")
  
  // Eligibility
  const [_eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null)
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false)
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleSignIn = async () => {
    setIsLoading(true)
    // Save current form state before redirect
    sessionStorage.setItem("repeat_rx_redirect", "true")
    
    // Redirect to login page
    router.push(`/auth/login?redirect=${encodeURIComponent(`${window.location.origin}/prescriptions/repeat?auth_success=true`)}`)
    setIsLoading(false)
  }
  
  const handleGuestContinue = () => {
    setIsGuest(true)
    goToStep("medication")
  }
  
  // Emergency acceptance handler - called from SafetyStep
  const handleEmergencyAccept = (accepted: boolean) => {
    setEmergencyAccepted(accepted)
  }
  
  const handleGpAttestationAccept = (accepted: boolean) => {
    setGpAttestationAccepted(accepted)
    if (accepted) {
      setGpAttestationTimestamp(new Date().toISOString())
    } else {
      setGpAttestationTimestamp(null)
    }
  }
  
  const goToStep = useCallback((step: RepeatRxStep) => {
    // Track step completion for analytics
    const fromIndex = STEPS.indexOf(currentStep)
    const toIndex = STEPS.indexOf(step)
    if (toIndex > fromIndex && fromIndex >= 0) {
      formAnalytics.trackStepComplete(currentStep, fromIndex, STEPS.length)
    }
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentStep(step)
      setIsTransitioning(false)
    }, 150)
  }, [currentStep, formAnalytics])
  
  const goBack = useCallback(() => {
    const currentIndex = STEPS.indexOf(currentStep)
    if (currentIndex > 0) {
      goToStep(STEPS[currentIndex - 1])
    }
  }, [currentStep, goToStep])
  
  const goNext = useCallback(() => {
    const currentIndex = STEPS.indexOf(currentStep)
    if (currentIndex < STEPS.length - 1) {
      goToStep(STEPS[currentIndex + 1])
    }
  }, [currentStep, goToStep])

  // Check Supabase auth session on mount (run once)
  const hasCheckedSessionRef = useRef(false)
  useEffect(() => {
    if (hasCheckedSessionRef.current) return
    hasCheckedSessionRef.current = true

    const checkSession = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)

        if (currentUser && !_isAuthenticated) {
          const userMetadata = currentUser.user_metadata || {}
          const { profileId } = await createOrGetProfile(
            currentUser.id,
            userMetadata.full_name || userMetadata.name || currentUser.email?.split('@')[0] || "",
            ""
          )

          if (profileId) {
            setPatientId(profileId)
            setIsAuthenticated(true)

            // Check for auth_success query param — redirect to medication only from auth step
            const urlParams = new URLSearchParams(window.location.search)
            if (urlParams.get("auth_success") === "true") {
              window.history.replaceState({}, "", window.location.pathname)
              goToStep("medication")
            }
          }
        }
      } catch (_error) {
        // Error checking session
      } finally {
        setIsAuthLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes (e.g., OAuth popup completing)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)

      if (session?.user && !_isAuthenticated) {
        const userMetadata = session.user.user_metadata || {}
        const { profileId } = await createOrGetProfile(
          session.user.id,
          userMetadata.full_name || userMetadata.name || session.user.email?.split('@')[0] || "",
          ""
        )

        if (profileId) {
          setPatientId(profileId)
          setIsAuthenticated(true)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  // Eligibility check removed - simplified Parchment workflow
  // All requests go directly to doctor review
  const checkEligibility = async () => {
    if (!medication) return
    goNext()
  }
  
  // Validate current step
  const canContinue = useCallback(() => {
    switch (currentStep) {
      case "auth":
        return true
      case "medication":
        return medication !== null
      case "history":
        return lastPrescribed && stability && prescriber.trim() && isSymptomInputValid(indication, 10) && currentDose.trim() && doseChanged !== null
      case "safety":
        return emergencyAccepted // Emergency gate must be acknowledged
      case "medical_history":
        return true // Optional flags
      case "attestation":
        return gpAttestationAccepted && termsAccepted
      case "review":
        return true
      case "payment":
        return true
      default:
        return false
    }
  }, [currentStep, medication, emergencyAccepted, lastPrescribed, stability, prescriber, indication, currentDose, doseChanged, gpAttestationAccepted, termsAccepted])
  
  // Handle auth callback — only run once when auth state first resolves
  const hasSetupProfileRef = useRef(false)
  useEffect(() => {
    if (searchParams?.get("auth_success") === "true") {
      // Clear the URL param
      window.history.replaceState({}, "", window.location.pathname)
    }

    // Use auth state for authentication check after OAuth redirect
    const setupProfile = async () => {
      if (!user || !isSignedIn || hasSetupProfileRef.current) {
        return
      }

      hasSetupProfileRef.current = true
      const userMetadata = user.user_metadata || {}
      const userName = userMetadata.full_name || userMetadata.name || user.email?.split('@')[0] || ""
      const { profileId } = await createOrGetProfile(
        user.id,
        userName,
        ""
      )

      if (profileId) {
        setPatientId(profileId)
        setIsAuthenticated(true)
        // Only redirect to medication if still on auth step
        if (currentStep === "auth") {
          goToStep("medication")
        }
      }
    }

    if (user && isSignedIn) {
      setupProfile()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isSignedIn])
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-linear-to-b from-slate-50 via-blue-50/30 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Header */}
        {currentStep !== "auth" && currentStep !== "confirmation" && (
          <header className="sticky top-0 z-40 bg-white/80 dark:bg-white/10 backdrop-blur-xl border-b border-white/40 dark:border-white/10">
            <div className="max-w-lg mx-auto px-3 py-2">
              <div className="flex items-center gap-2 mb-2">
                {currentStep !== "medication" && (
                  <button
                    onClick={goBack}
                    className="p-1.5 -ml-1 rounded-lg hover:bg-muted transition-colors"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
                  <Pill className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs font-medium truncate">Repeat Prescription</span>
                </div>
                <Link href="/" className="p-1.5 -mr-1 rounded-lg hover:bg-muted transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </Link>
              </div>
              <ProgressIndicator currentStep={currentStep} steps={STEPS} />
            </div>
          </header>
        )}
        
        {/* Content */}
        <main className={cn(
          "max-w-lg mx-auto px-4 py-6 pb-32 transition-opacity duration-150",
          isTransitioning ? "opacity-0" : "opacity-100"
        )}>
          {/* Error banner */}
          {error && (
            <div className="mb-4 p-4 rounded-2xl bg-red-50/80 dark:bg-red-900/30 backdrop-blur-lg border border-red-200/50 dark:border-red-800/30 shadow-[0_4px_16px_rgb(239,68,68,0.15)] text-sm text-red-600">
              {error}
            </div>
          )}
          
          {/* Auth Step */}
          {currentStep === "auth" && (
            <AuthStep
              onSignIn={handleSignIn}
              onGuest={handleGuestContinue}
              isLoading={isLoading}
            />
          )}
          
          {/* Medication Step */}
          {currentStep === "medication" && (
            <div className="space-y-6 animate-step-enter">
              <StepHeader
                emoji="📋"
                title={REPEAT_RX_COPY.steps.medication.title}
                subtitle={REPEAT_RX_COPY.steps.medication.subtitle}
              />
              
              {/* Emergency acknowledgment now handled in safety step via EmergencyGate */}
              <div className="space-y-4">
                <InfoCard
                  title="Reference only"
                  description="Search helps locate your medication. The doctor will verify and make the final prescribing decision."
                  variant="info"
                  className="mb-2"
                />
                <div className="space-y-2">
                  <MedicationSearch
                    value={medication}
                    onChange={(product) => {
                      setMedicationSearchUsed(true)
                      setMedication(product)
                    }}
                  />
                </div>
                  
                  {medication && (
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_4px_16px_rgb(0,0,0,0.04)] space-y-3">
                      <p className="text-sm font-medium">{REPEAT_RX_COPY.steps.medication.strengthConfirm}</p>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-white/5 backdrop-blur-lg border border-white/40 dark:border-white/10 shadow-[0_2px_8px_rgb(0,0,0,0.04)]">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{medication.drug_name}</p>
                          {medication.strength && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {medication.strength}
                            </p>
                          )}
                          {medication.form && (
                            <p className="text-xs text-muted-foreground/70">
                              {medication.form}
                            </p>
                          )}
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {REPEAT_RX_COPY.steps.medication.strengthHint}
                      </p>
                    </div>
                  )}
              </div>
            </div>
          )}
          
          {/* History Step */}
          {currentStep === "history" && (
            <div className="space-y-6 animate-step-enter">
              <StepHeader
                emoji="📋"
                title={REPEAT_RX_COPY.steps.history.title}
                subtitle={REPEAT_RX_COPY.steps.history.subtitle}
              />
              
              <div className="space-y-5">
                {/* Last prescribed */}
                <FormInput
                  label={REPEAT_RX_COPY.steps.history.lastPrescribed}
                  required
                >
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(REPEAT_RX_COPY.steps.history.lastPrescribedOptions).map(([key, label]) => (
                      <PillButton
                        key={key}
                        selected={lastPrescribed === key}
                        onClick={() => setLastPrescribed(key)}
                      >
                        {label}
                      </PillButton>
                    ))}
                  </div>
                </FormInput>
                
                {/* Stability duration */}
                <FormInput
                  label={REPEAT_RX_COPY.steps.history.stability}
                  required
                  hint={REPEAT_RX_COPY.steps.history.stabilityNote}
                >
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(REPEAT_RX_COPY.steps.history.stabilityOptions).map(([key, label]) => (
                      <PillButton
                        key={key}
                        selected={stability === key}
                        onClick={() => setStability(key)}
                      >
                        {label}
                      </PillButton>
                    ))}
                  </div>
                </FormInput>
                
                {/* Prescriber */}
                <FormInput
                  label={REPEAT_RX_COPY.steps.history.prescriber}
                  required
                  helpText="The name of the doctor who originally prescribed this medication"
                >
                  <Input
                    value={prescriber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrescriber(e.target.value)}
                    placeholder={REPEAT_RX_COPY.steps.history.prescriberPlaceholder}
                    className="h-12 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-lg border-white/30 dark:border-white/10 focus:border-primary/50 focus:shadow-[0_0_20px_rgb(59,130,246,0.15)] transition-all duration-200"
                  />
                </FormInput>
                
                {/* Indication - with AI-assisted input */}
                <div className="space-y-2">
                  <FieldLabelWithHelp
                    label="Why do you take this medication?"
                    helpText="Include: the condition being treated, how long you've been on it, and how well it's working for you"
                    required
                  />
                  <SmartSymptomInput
                    value={indication}
                    onChange={setIndication}
                    label=""
                    placeholder="e.g., I've been taking this for high blood pressure for 3 years. It keeps my BP around 120/80..."
                    context="repeat_rx"
                    minLength={10}
                    maxLength={500}
                    required={true}
                    helperText="Good examples: condition name, duration, effectiveness"
                  />
                </div>
                
                {/* Current dose */}
                <FormInput
                  label={REPEAT_RX_COPY.steps.history.currentDose}
                  required
                  helpText="Your current dosage (e.g., '1 tablet daily', '500mg twice daily')"
                >
                  <Input
                    value={currentDose}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentDose(e.target.value)}
                    placeholder={REPEAT_RX_COPY.steps.history.currentDosePlaceholder}
                    className="h-12 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-lg border-white/30 dark:border-white/10 focus:border-primary/50 focus:shadow-[0_0_20px_rgb(59,130,246,0.15)] transition-all duration-200"
                  />
                </FormInput>
                
                {/* Dose changed */}
                <FormInput
                  label={REPEAT_RX_COPY.steps.history.doseChanged}
                  required
                >
                  <div className="flex gap-3">
                    <PillButton
                      selected={doseChanged === false}
                      onClick={() => setDoseChanged(false)}
                    >
                      No
                    </PillButton>
                    <PillButton
                      selected={doseChanged === true}
                      onClick={() => setDoseChanged(true)}
                    >
                      Yes
                    </PillButton>
                  </div>
                </FormInput>
              </div>
            </div>
          )}
          
          {/* Safety Step - Emergency Gate (MUST be first) */}
          {currentStep === "safety" && (
            <SafetyStep
              emergencyAccepted={emergencyAccepted}
              onEmergencyAcceptedChange={handleEmergencyAccept}
              emergencyTimestamp={null}
            />
          )}
          
          {/* Medical History Step */}
          {currentStep === "medical_history" && (
            <div className="space-y-6 animate-step-enter">
              <StepHeader
                emoji="📝"
                title={REPEAT_RX_COPY.steps.medical_history.title}
                subtitle={REPEAT_RX_COPY.steps.medical_history.subtitle}
              />
              
              <div className="space-y-4">
                {Object.entries(REPEAT_RX_COPY.steps.medical_history.flags).map(([key, label]) => (
                  <label
                    key={key}
                    className={cn(
                      "flex items-center justify-between gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300",
                      "bg-white/70 dark:bg-white/5 backdrop-blur-xl",
                      "border-white/40 dark:border-white/10",
                      pmhxFlags[key as keyof typeof pmhxFlags]
                        ? "border-primary/50 bg-primary/10 dark:bg-primary/20 shadow-[0_4px_16px_rgb(59,130,246,0.15)]"
                        : "hover:border-primary/40 hover:bg-white/85 dark:hover:bg-white/10 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgb(59,130,246,0.1)]"
                    )}
                  >
                    <span className="text-sm font-medium flex-1">{label}</span>
                    <Switch
                      checked={pmhxFlags[key as keyof typeof pmhxFlags] as boolean}
                      onCheckedChange={(checked) => setPmhxFlags(prev => ({
                        ...prev,
                        [key]: checked,
                      }))}
                    />
                  </label>
                ))}
                
                {pmhxFlags.otherSignificant && (
                  <Input
                    value={pmhxFlags.otherDetails}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPmhxFlags(prev => ({
                      ...prev,
                      otherDetails: e.target.value,
                    }))}
                    placeholder={REPEAT_RX_COPY.steps.medical_history.otherPlaceholder}
                    className="h-12 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-lg border-white/30 dark:border-white/10 focus:border-primary/50 focus:shadow-[0_0_20px_rgb(59,130,246,0.15)] transition-all duration-200"
                  />
                )}
              </div>
              
              <ProgressiveSection
                title="Other medications"
                description="List any other medications you're currently taking (optional)"
                defaultOpen={!!otherMedsInput}
              >
                <FormInput
                  label={REPEAT_RX_COPY.steps.medical_history.otherMeds}
                  hint={REPEAT_RX_COPY.steps.medical_history.otherMedsHint}
                  helpText="This helps us check for potential drug interactions"
                >
                <Textarea
                  value={otherMedsInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtherMedsInput(e.target.value)}
                  placeholder={REPEAT_RX_COPY.steps.medical_history.otherMedsPlaceholder}
                  className="min-h-[100px] rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-lg border-white/30 dark:border-white/10 focus:border-primary/50 focus:shadow-[0_0_20px_rgb(59,130,246,0.15)] transition-all duration-200"
                />
                </FormInput>
              </ProgressiveSection>
            </div>
          )}
          
          {/* Attestation Step */}
          {currentStep === "attestation" && (
            <div className="space-y-6 animate-step-enter">
              <StepHeader
                emoji="✋"
                title={REPEAT_RX_COPY.steps.attestation.title}
                subtitle={REPEAT_RX_COPY.steps.attestation.subtitle}
              />
              
              <div className="space-y-4">
                {/* GP Attestation */}
                <label
                  className={cn(
                    "flex items-center justify-between gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300",
                    "bg-white/70 dark:bg-white/5 backdrop-blur-xl",
                    "border-white/40 dark:border-white/10",
                    gpAttestationAccepted
                      ? "border-primary/50 bg-primary/10 dark:bg-primary/20 shadow-[0_4px_16px_rgb(59,130,246,0.15)]"
                      : "hover:border-primary/40 hover:bg-white/85 dark:hover:bg-white/10 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgb(59,130,246,0.1)]"
                  )}
                >
                  <div className="space-y-1 flex-1">
                    <span className="text-sm font-medium block">
                      {REPEAT_RX_COPY.steps.attestation.gpAttestation}
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      {REPEAT_RX_COPY.steps.attestation.gpNote}
                    </span>
                  </div>
                  <Switch
                    checked={gpAttestationAccepted}
                    onCheckedChange={(checked) => handleGpAttestationAccept(checked)}
                  />
                </label>
                
                {/* Terms */}
                <label
                  className={cn(
                    "flex items-center justify-between gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300",
                    "bg-white/70 dark:bg-white/5 backdrop-blur-xl",
                    "border-white/40 dark:border-white/10",
                    termsAccepted
                      ? "border-primary/50 bg-primary/10 dark:bg-primary/20 shadow-[0_4px_16px_rgb(59,130,246,0.15)]"
                      : "hover:border-primary/40 hover:bg-white/85 dark:hover:bg-white/10 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgb(59,130,246,0.1)]"
                  )}
                >
                  <span className="text-sm flex-1">
                    {REPEAT_RX_COPY.steps.attestation.termsAccept}{" "}
                    <Link href="/terms" className="text-primary underline">
                      {REPEAT_RX_COPY.steps.attestation.termsLink}
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-primary underline">
                      {REPEAT_RX_COPY.steps.attestation.privacyLink}
                    </Link>
                  </span>
                  <Switch
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked)}
                  />
                </label>
              </div>
              
              {/* Pharmacy Preference */}
              <div className="space-y-3 pt-2">
                <Label className="text-sm font-medium">How would you like to receive your prescription?</Label>
                <div className="space-y-2">
                  <label
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300",
                      "bg-white/70 dark:bg-white/5 backdrop-blur-xl",
                      deliveryMethod === "etoken"
                        ? "border-primary/50 bg-primary/10 dark:bg-primary/20 shadow-[0_4px_16px_rgb(59,130,246,0.15)]"
                        : "border-white/40 dark:border-white/10 hover:border-primary/40"
                    )}
                  >
                    <input
                      type="radio"
                      name="deliveryMethod"
                      checked={deliveryMethod === "etoken"}
                      onChange={() => setDeliveryMethod("etoken")}
                      className="mt-1 h-4 w-4 text-primary"
                    />
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium block">eToken via SMS (recommended)</span>
                      <span className="text-xs text-muted-foreground block">
                        Receive a digital prescription token on your phone. Present at any pharmacy.
                      </span>
                    </div>
                  </label>
                  
                  <label
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300",
                      "bg-white/70 dark:bg-white/5 backdrop-blur-xl",
                      deliveryMethod === "pharmacy"
                        ? "border-primary/50 bg-primary/10 dark:bg-primary/20 shadow-[0_4px_16px_rgb(59,130,246,0.15)]"
                        : "border-white/40 dark:border-white/10 hover:border-primary/40"
                    )}
                  >
                    <input
                      type="radio"
                      name="deliveryMethod"
                      checked={deliveryMethod === "pharmacy"}
                      onChange={() => setDeliveryMethod("pharmacy")}
                      className="mt-1 h-4 w-4 text-primary"
                    />
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium block">Send to a specific pharmacy</span>
                      <span className="text-xs text-muted-foreground block">
                        The pharmacy receives the eScript directly.
                      </span>
                    </div>
                  </label>
                </div>
                
                {deliveryMethod === "pharmacy" && (
                  <div className="space-y-3 p-4 rounded-xl bg-white/60 dark:bg-white/5 border border-white/30 dark:border-white/10">
                    <div className="space-y-2">
                      <Label htmlFor="pharmacy-name" className="text-sm font-medium">
                        Pharmacy name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="pharmacy-name"
                        value={pharmacyName}
                        onChange={(e) => setPharmacyName(e.target.value)}
                        placeholder="e.g., Priceline Pharmacy"
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pharmacy-location" className="text-sm font-medium">
                        Location or email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="pharmacy-location"
                        value={pharmacyLocation}
                        onChange={(e) => setPharmacyLocation(e.target.value)}
                        placeholder="e.g., 123 Main St, Sydney or pharmacy@email.com"
                        className="h-11 rounded-xl"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the suburb/address or pharmacy email address
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Review Step */}
          {currentStep === "review" && (
            <div className="space-y-6 animate-step-enter">
              <StepHeader
                emoji="👀"
                title={REPEAT_RX_COPY.steps.review.title}
                subtitle={REPEAT_RX_COPY.steps.review.subtitle}
              />
              
              {/* AI-powered pre-submission validation */}
              <SmartValidation
                formType="repeat_rx"
                formData={{
                  medication,
                  indication,
                  currentDose,
                  lastPrescribed,
                  stability,
                  prescriber,
                  doseChanged,
                  sideEffects,
                  pregnantOrBreastfeeding,
                }}
                autoValidate={true}
              />
              
              <div className="space-y-4">
                {/* Medication */}
                <div className="p-4 rounded-2xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl shadow-[0_4px_16px_rgb(0,0,0,0.04)]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {REPEAT_RX_COPY.steps.review.medication}
                      </p>
                      <p className="font-medium">{medication?.drug_name}</p>
                      {medication?.strength && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {medication.strength}
                        </p>
                      )}
                      {medication?.form && (
                        <p className="text-xs text-muted-foreground/70">
                          {medication.form}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => goToStep("medication")}
                      className="text-xs text-primary hover:underline"
                    >
                      {REPEAT_RX_COPY.steps.review.edit}
                    </button>
                  </div>
                </div>
                
                {/* History summary */}
                <div className="p-4 rounded-2xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl shadow-[0_4px_16px_rgb(0,0,0,0.04)] space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="text-xs text-muted-foreground">
                      {REPEAT_RX_COPY.steps.review.history}
                    </p>
                    <button
                      onClick={() => goToStep("history")}
                      className="text-xs text-primary hover:underline"
                    >
                      {REPEAT_RX_COPY.steps.review.edit}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Stability:</span>{" "}
                      <span className="font-medium">
                        {REPEAT_RX_COPY.steps.history.stabilityOptions[stability as keyof typeof REPEAT_RX_COPY.steps.history.stabilityOptions] || stability}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dose:</span>{" "}
                      <span className="font-medium">{currentDose}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">For:</span>{" "}
                      <span className="font-medium">{indication}</span>
                    </div>
                  </div>
                </div>
                
                {/* Attestations */}
                <div className="p-4 rounded-2xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl shadow-[0_4px_16px_rgb(0,0,0,0.04)] space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {REPEAT_RX_COPY.steps.review.attestations}
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Emergency disclaimer confirmed</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Will see GP in 1-3 months</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Terms accepted</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Payment Step */}
          {currentStep === "payment" && (
            <div className="space-y-6 animate-step-enter">
              <StepHeader
                emoji="💳"
                title={REPEAT_RX_COPY.payment.title}
                subtitle={REPEAT_RX_COPY.payment.subtitle}
              />
              
              <div className="p-5 rounded-2xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {REPEAT_RX_COPY.payment.price}
                  </span>
                </div>
                
                <hr className="border-border" />
                
                <ul className="space-y-2">
                  {REPEAT_RX_COPY.payment.includes.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <p className="text-xs text-center text-muted-foreground">
                {REPEAT_RX_COPY.payment.disclaimer}
              </p>
            </div>
          )}
          
          {/* Confirmation Step */}
          {currentStep === "confirmation" && (
            <div className="space-y-6 animate-step-enter">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-2xl font-semibold">{REPEAT_RX_COPY.confirmation.title}</h1>
                <p className="text-muted-foreground">{REPEAT_RX_COPY.confirmation.subtitle}</p>
              </div>
              
              {/* Timeline */}
              <div className="p-5 rounded-2xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                <div className="space-y-4">
                  {REPEAT_RX_COPY.confirmation.timeline.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        item.status === "complete" ? "bg-green-100" :
                        item.status === "current" ? "bg-primary/20" :
                        "bg-muted"
                      )}>
                        {item.status === "complete" ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : item.status === "current" ? (
                          <ButtonSpinner className="text-primary" />
                        ) : (
                          <Clock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        item.status === "pending" ? "text-muted-foreground" : ""
                      )}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_4px_16px_rgb(0,0,0,0.04)] space-y-3">
                <p className="font-medium text-sm">{REPEAT_RX_COPY.confirmation.whatNext}</p>
                <ol className="space-y-2">
                  {REPEAT_RX_COPY.confirmation.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="font-medium text-primary">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-muted-foreground">
                  {REPEAT_RX_COPY.confirmation.eta}
                </p>
              </div>
              
              <Button
                onClick={() => router.push("/patient/intakes")}
                className="w-full h-12 rounded-full bg-linear-to-r from-primary-500 to-primary-600 text-white shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgb(59,130,246,0.4)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
              >
                {REPEAT_RX_COPY.confirmation.trackStatus}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </main>
        
        {/* Footer */}
        {currentStep !== "auth" && currentStep !== "confirmation" && (
          <footer className="fixed bottom-0 inset-x-0 z-40 bg-white/80 dark:bg-white/10 backdrop-blur-xl border-t border-white/40 dark:border-white/10 px-4 py-4 safe-area-pb">
            <div className="max-w-lg mx-auto space-y-3">
              {/* Trust strip */}
              <TrustStrip />
              
              {/* Action buttons */}
              <div className="flex gap-3">
                {currentStep !== "medication" && (
                  <Button
                    variant="ghost"
                    onClick={goBack}
                    className="h-12 px-4 rounded-xl"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                )}
                
                {currentStep === "payment" ? (
                  <Button
                    onClick={() => {
                      confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { x: 0.5, y: 0.6 },
                      })
                      goToStep("confirmation")
                    }}
                    disabled={isLoading}
                    className="flex-1 h-12 rounded-full bg-linear-to-r from-primary-500 to-primary-600 text-white shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgb(59,130,246,0.4)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <ButtonSpinner className="mr-2" />
                        {REPEAT_RX_COPY.payment.processing}
                      </>
                    ) : (
                      <>
                        {REPEAT_RX_COPY.payment.button}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                ) : currentStep === "attestation" ? (
                  <Button
                    onClick={checkEligibility}
                    disabled={!canContinue() || isCheckingEligibility}
                    className="flex-1 h-12 rounded-full bg-linear-to-r from-primary-500 to-primary-600 text-white shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgb(59,130,246,0.4)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCheckingEligibility ? (
                      <>
                        <ButtonSpinner className="mr-2" />
                        {REPEAT_RX_COPY.eligibility.checking}
                      </>
                    ) : (
                      <>
                        {REPEAT_RX_COPY.nav.continue}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={goNext}
                    disabled={!canContinue()}
                    className="flex-1 h-12 rounded-full bg-linear-to-r from-primary-500 to-primary-600 text-white shadow-[0_8px_30px_rgb(59,130,246,0.3)] hover:shadow-[0_12px_40px_rgb(59,130,246,0.4)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {REPEAT_RX_COPY.nav.continue}
                    <ArrowRight className="w-4 h-4 ml-2" />
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

export default RepeatRxIntakeFlow
