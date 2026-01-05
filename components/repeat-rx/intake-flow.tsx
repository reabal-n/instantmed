"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import confetti from "canvas-confetti"
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  X,
  Check,
  Clock,
  Shield,
  Lock,
  BadgeCheck,
  Phone,
  ChevronRight,
  Pill,
  RefreshCw,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { createOrGetProfile } from "@/app/actions/create-profile"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { MedicationCombobox, type SelectedMedication } from "@/components/prescriptions/medication-combobox"
import { REPEAT_RX_COPY } from "@/lib/microcopy/repeat-rx"
import type {
  RepeatRxStep,
  EligibilityResult,
} from "@/types/repeat-rx"
import { cn } from "@/lib/utils"
import { useUser, useClerk } from "@clerk/nextjs"
import { EnhancedSelectionButton } from "@/components/intake/enhanced-selection-button"
import { UnifiedProgressIndicator } from "@/components/intake/unified-progress-indicator"

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS: RepeatRxStep[] = [
  "auth",
  "medication",
  "history",
  "safety",
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
// PROGRESS INDICATOR
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
    <div className="w-full">
      <div className="flex items-center justify-center gap-1.5">
        {displaySteps.map((step, i) => (
          <div
            key={step}
            className={cn(
              "h-1 rounded-full transition-all duration-300",
              i < currentIndex
                ? "bg-primary w-8"
                : i === currentIndex
                ? "bg-primary/80 w-10"
                : "bg-muted-foreground/20 w-6"
            )}
          />
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-2">
        Step {currentIndex + 1} of {totalSteps}
      </p>
    </div>
  )
}

// ============================================================================
// EMERGENCY DISCLAIMER BANNER
// ============================================================================

function EmergencyBanner({
  accepted,
  onAccept,
  timestamp,
}: {
  accepted: boolean
  onAccept: (accepted: boolean) => void
  timestamp: string | null
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
          <Phone className="w-5 h-5 text-red-600" />
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="font-semibold text-red-900 text-sm">
            {REPEAT_RX_COPY.emergency.title}
          </h3>
          <p className="text-sm text-red-800 leading-relaxed">
            {REPEAT_RX_COPY.emergency.body}
          </p>
        </div>
      </div>
      
      <label className="flex items-start gap-3 p-3 rounded-xl bg-white border border-red-200 cursor-pointer hover:bg-red-50/50 transition-colors">
        <Checkbox
          checked={accepted}
          onCheckedChange={(checked) => onAccept(checked === true)}
          className="mt-0.5 h-5 w-5 rounded border-red-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
        />
        <span className="text-sm text-red-900 font-medium">
          {REPEAT_RX_COPY.emergency.checkbox}
        </span>
      </label>
      
      {accepted && timestamp && (
        <p className="text-xs text-red-600/70 text-right">
          Confirmed at {new Date(timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}

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
              <Shield className="w-3.5 h-3.5 text-purple-600" />
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
            className="w-full h-12 rounded-xl"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
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
            className="w-full h-12 rounded-xl"
          >
            {REPEAT_RX_COPY.auth.guestButton}
          </Button>
        </div>
        
        <div className="p-4 rounded-xl bg-muted/50 space-y-2">
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
  gradient = "blue-purple",
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  gradient?: "blue-purple" | "purple-pink" | "teal-emerald" | "orange-red"
}) {
  return (
    <EnhancedSelectionButton
      variant="chip"
      selected={selected}
      onClick={onClick}
      gradient={gradient}
      className="rounded-full"
    >
      {children}
    </EnhancedSelectionButton>
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
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
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
  const { openSignIn } = useClerk()
  const { user, isSignedIn } = useUser()
  
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
  const [medication, setMedication] = useState<SelectedMedication | null>(null)
  const [_strengthConfirmed, _setStrengthConfirmed] = useState(false)
  
  // History answers
  const [lastPrescribed, setLastPrescribed] = useState<string | null>(null)
  const [stability, setStability] = useState<string | null>(null)
  const [prescriber, setPrescriber] = useState("")
  const [indication, setIndication] = useState("")
  const [currentDose, setCurrentDose] = useState("")
  const [doseChanged, setDoseChanged] = useState<boolean | null>(null)
  
  // Safety answers
  const [sideEffects, setSideEffects] = useState<string | null>(null)
  const [sideEffectsDetails, setSideEffectsDetails] = useState("")
  const [pregnantOrBreastfeeding, setPregnantOrBreastfeeding] = useState<boolean | null>(null)
  const [allergies, _setAllergies] = useState<string[]>([])
  const [allergyDetails, setAllergyDetails] = useState("")
  
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
  const [emergencyAccepted, setEmergencyAccepted] = useState(false)
  const [emergencyTimestamp, setEmergencyTimestamp] = useState<string | null>(null)
  const [gpAttestationAccepted, setGpAttestationAccepted] = useState(false)
  const [_gpAttestationTimestamp, setGpAttestationTimestamp] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  
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
    
    openSignIn({
      afterSignInUrl: `${window.location.origin}/prescriptions/repeat?auth_success=true`,
      afterSignUpUrl: `${window.location.origin}/prescriptions/repeat?auth_success=true`,
    })
    setIsLoading(false)
  }
  
  const handleGuestContinue = () => {
    setIsGuest(true)
    goToStep("medication")
  }
  
  const handleEmergencyAccept = (accepted: boolean) => {
    setEmergencyAccepted(accepted)
    if (accepted) {
      setEmergencyTimestamp(new Date().toISOString())
    } else {
      setEmergencyTimestamp(null)
    }
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
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentStep(step)
      setIsTransitioning(false)
    }, 150)
  }, [])
  
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
  
  // Check eligibility when moving to review
  const checkEligibility = async () => {
    if (!medication) return
    
    setIsCheckingEligibility(true)
    
    try {
      const response = await fetch("/api/repeat-rx/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medication,
          answers: {
            stabilityDuration: stability,
            doseChangedRecently: doseChanged,
            sideEffects,
            sideEffectsDetails,
            pregnantOrBreastfeeding,
            allergies,
            allergyDetails,
            pmhxFlags,
            gpAttestationAccepted,
          },
        }),
      })
      
      const result = await response.json()
      setEligibilityResult(result)
      
      if (result.passed) {
        goNext() // Go to review
      }
    } catch {
      setError("Failed to check eligibility. Please try again.")
    } finally {
      setIsCheckingEligibility(false)
    }
  }
  
  // Validate current step
  const canContinue = useCallback(() => {
    switch (currentStep) {
      case "auth":
        return true
      case "medication":
        return medication !== null && emergencyAccepted
      case "history":
        return lastPrescribed && stability && prescriber.trim() && indication.trim() && currentDose.trim() && doseChanged !== null
      case "safety":
        return sideEffects !== null && pregnantOrBreastfeeding !== null
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
  }, [currentStep, medication, emergencyAccepted, lastPrescribed, stability, prescriber, indication, currentDose, doseChanged, sideEffects, pregnantOrBreastfeeding, gpAttestationAccepted, termsAccepted])
  
  // Handle auth callback - now using Clerk's user state
  useEffect(() => {
    if (searchParams.get("auth_success") === "true") {
      // Clear the URL param
      window.history.replaceState({}, "", window.location.pathname)
    }
    
    // Use Clerk user for authentication check after OAuth redirect
    const setupProfile = async () => {
      if (user && !isSignedIn) {
        return // Wait for Clerk to fully load
      }
      
      if (user && isSignedIn) {
        const { profileId } = await createOrGetProfile(
          user.id,
          user.fullName || "",
          ""
        )
        
        if (profileId) {
          setPatientId(profileId)
          setIsAuthenticated(true)
          goToStep("medication")
        }
      }
    }
    
    if (user && isSignedIn) {
      setupProfile()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, goToStep, user, isSignedIn])
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Header */}
        {currentStep !== "auth" && currentStep !== "confirmation" && (
          <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
            <div className="max-w-lg mx-auto px-4 py-3">
              <div className="flex items-center gap-3 mb-3">
                {currentStep !== "medication" && (
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
                  <span className="text-sm font-medium">Repeat Prescription</span>
                </div>
                <Link href="/" className="p-2 -mr-2 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-5 h-5" />
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
            <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
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
                emoji="💊"
                title={REPEAT_RX_COPY.steps.medication.title}
                subtitle={REPEAT_RX_COPY.steps.medication.subtitle}
              />
              
              {/* Emergency Banner - Required */}
              <EmergencyBanner
                accepted={emergencyAccepted}
                onAccept={handleEmergencyAccept}
                timestamp={emergencyTimestamp}
              />
              
              {emergencyAccepted && (
                <div className="space-y-4 animate-fade-in">
                  <MedicationCombobox
                    value={medication}
                    onChange={setMedication}
                    placeholder={REPEAT_RX_COPY.steps.medication.placeholder}
                  />
                  
                  {medication && (
                    <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                      <p className="text-sm font-medium">{REPEAT_RX_COPY.steps.medication.strengthConfirm}</p>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-border">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{medication.medication_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {medication.strength} {medication.form}
                          </p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {REPEAT_RX_COPY.steps.medication.strengthHint}
                      </p>
                    </div>
                  )}
                </div>
              )}
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
                    {Object.entries(REPEAT_RX_COPY.steps.history.lastPrescribedOptions).map(([key, label], index) => (
                      <PillButton
                        key={key}
                        selected={lastPrescribed === key}
                        onClick={() => setLastPrescribed(key)}
                        gradient={index % 3 === 0 ? "blue-purple" : index % 3 === 1 ? "purple-pink" : "teal-emerald"}
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
                    {Object.entries(REPEAT_RX_COPY.steps.history.stabilityOptions).map(([key, label], index) => (
                      <PillButton
                        key={key}
                        selected={stability === key}
                        onClick={() => setStability(key)}
                        gradient={index % 3 === 0 ? "blue-purple" : index % 3 === 1 ? "purple-pink" : "teal-emerald"}
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
                >
                  <Input
                    value={prescriber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrescriber(e.target.value)}
                    placeholder={REPEAT_RX_COPY.steps.history.prescriberPlaceholder}
                    className="h-12 rounded-xl bg-[#F9FAFB] border-transparent focus:border-primary/10 focus:ring-2 focus:ring-primary/10"
                  />
                </FormInput>
                
                {/* Indication */}
                <FormInput
                  label={REPEAT_RX_COPY.steps.history.indication}
                  required
                >
                  <Input
                    value={indication}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIndication(e.target.value)}
                    placeholder={REPEAT_RX_COPY.steps.history.indicationPlaceholder}
                    className="h-12 rounded-xl bg-[#F9FAFB] border-transparent focus:border-primary/10 focus:ring-2 focus:ring-primary/10"
                  />
                </FormInput>
                
                {/* Current dose */}
                <FormInput
                  label={REPEAT_RX_COPY.steps.history.currentDose}
                  required
                >
                  <Input
                    value={currentDose}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentDose(e.target.value)}
                    placeholder={REPEAT_RX_COPY.steps.history.currentDosePlaceholder}
                    className="h-12 rounded-xl bg-[#F9FAFB] border-transparent focus:border-primary/10 focus:ring-2 focus:ring-primary/10"
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
          
          {/* Safety Step */}
          {currentStep === "safety" && (
            <div className="space-y-6 animate-step-enter">
              <StepHeader
                emoji="🛡️"
                title={REPEAT_RX_COPY.steps.safety.title}
                subtitle={REPEAT_RX_COPY.steps.safety.subtitle}
              />
              
              <div className="space-y-5">
                {/* Side effects */}
                <FormInput
                  label={REPEAT_RX_COPY.steps.safety.sideEffects}
                  required
                >
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(REPEAT_RX_COPY.steps.safety.sideEffectsOptions).map(([key, label]) => (
                      <PillButton
                        key={key}
                        selected={sideEffects === key}
                        onClick={() => setSideEffects(key)}
                      >
                        {label}
                      </PillButton>
                    ))}
                  </div>
                </FormInput>
                
                {sideEffects === "significant" && (
                  <FormInput
                    label={REPEAT_RX_COPY.steps.safety.sideEffectsDetails}
                  >
                    <Textarea
                      value={sideEffectsDetails}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSideEffectsDetails(e.target.value)}
                      placeholder={REPEAT_RX_COPY.steps.safety.sideEffectsPlaceholder}
                      className="min-h-[100px] rounded-xl bg-[#F9FAFB] border-transparent focus:border-primary/10 focus:ring-2 focus:ring-primary/10"
                    />
                  </FormInput>
                )}
                
                {/* Pregnancy */}
                <FormInput
                  label={REPEAT_RX_COPY.steps.safety.pregnancy}
                  required
                >
                  <div className="flex gap-3">
                    <PillButton
                      selected={pregnantOrBreastfeeding === false}
                      onClick={() => setPregnantOrBreastfeeding(false)}
                    >
                      No
                    </PillButton>
                    <PillButton
                      selected={pregnantOrBreastfeeding === true}
                      onClick={() => setPregnantOrBreastfeeding(true)}
                    >
                      Yes
                    </PillButton>
                  </div>
                </FormInput>
                
                {/* Allergies */}
                <FormInput
                  label={REPEAT_RX_COPY.steps.safety.allergies}
                >
                  <Input
                    value={allergyDetails}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAllergyDetails(e.target.value)}
                    placeholder={REPEAT_RX_COPY.steps.safety.allergyPlaceholder}
                    className="h-12 rounded-xl bg-[#F9FAFB] border-transparent focus:border-primary/10 focus:ring-2 focus:ring-primary/10"
                  />
                </FormInput>
              </div>
            </div>
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
                      "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                      pmhxFlags[key as keyof typeof pmhxFlags]
                        ? "border-primary bg-primary/5"
                        : "border-border/60 bg-white/50 hover:border-primary/40"
                    )}
                  >
                    <Checkbox
                      checked={pmhxFlags[key as keyof typeof pmhxFlags] as boolean}
                      onCheckedChange={(checked) => setPmhxFlags(prev => ({
                        ...prev,
                        [key]: checked === true,
                      }))}
                      className="h-5 w-5"
                    />
                    <span className="text-sm font-medium">{label}</span>
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
                    className="h-12 rounded-xl bg-[#F9FAFB] border-transparent focus:border-primary/10 focus:ring-2 focus:ring-primary/10"
                  />
                )}
              </div>
              
              <FormInput
                label={REPEAT_RX_COPY.steps.medical_history.otherMeds}
                hint={REPEAT_RX_COPY.steps.medical_history.otherMedsHint}
              >
                <Textarea
                  value={otherMedsInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtherMedsInput(e.target.value)}
                  placeholder={REPEAT_RX_COPY.steps.medical_history.otherMedsPlaceholder}
                  className="min-h-[100px] rounded-xl bg-[#F9FAFB] border-transparent focus:border-primary/10 focus:ring-2 focus:ring-primary/10"
                />
              </FormInput>
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
                    "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    gpAttestationAccepted
                      ? "border-primary bg-primary/5"
                      : "border-border/60 bg-white/50 hover:border-primary/40"
                  )}
                >
                  <Checkbox
                    checked={gpAttestationAccepted}
                    onCheckedChange={(checked) => handleGpAttestationAccept(checked === true)}
                    className="mt-0.5 h-5 w-5"
                  />
                  <div className="space-y-1">
                    <span className="text-sm font-medium block">
                      {REPEAT_RX_COPY.steps.attestation.gpAttestation}
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      {REPEAT_RX_COPY.steps.attestation.gpNote}
                    </span>
                  </div>
                </label>
                
                {/* Terms */}
                <label
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    termsAccepted
                      ? "border-primary bg-primary/5"
                      : "border-border/60 bg-white/50 hover:border-primary/40"
                  )}
                >
                  <Checkbox
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    className="mt-0.5 h-5 w-5"
                  />
                  <span className="text-sm">
                    {REPEAT_RX_COPY.steps.attestation.termsAccept}{" "}
                    <Link href="/terms" className="text-primary underline">
                      {REPEAT_RX_COPY.steps.attestation.termsLink}
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-primary underline">
                      {REPEAT_RX_COPY.steps.attestation.privacyLink}
                    </Link>
                  </span>
                </label>
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
              
              <div className="space-y-4">
                {/* Medication */}
                <div className="p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {REPEAT_RX_COPY.steps.review.medication}
                      </p>
                      <p className="font-medium">{medication?.display}</p>
                      <p className="text-sm text-muted-foreground">
                        {medication?.strength} {medication?.form}
                      </p>
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
                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
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
                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
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
              
              <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
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
              <div className="p-5 rounded-2xl border border-border bg-card">
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
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
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
              
              <div className="p-4 rounded-xl bg-muted/50 space-y-3">
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
                onClick={() => router.push("/patient/requests")}
                className="w-full h-12 rounded-xl"
              >
                {REPEAT_RX_COPY.confirmation.trackStatus}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </main>
        
        {/* Footer */}
        {currentStep !== "auth" && currentStep !== "confirmation" && (
          <footer className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-4 safe-area-pb">
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
                    className="flex-1 h-12 rounded-xl"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
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
                    className="flex-1 h-12 rounded-xl"
                  >
                    {isCheckingEligibility ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
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
                    className="flex-1 h-12 rounded-xl"
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
