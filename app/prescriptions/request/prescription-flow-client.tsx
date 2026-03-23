"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/uix"
import {
  ArrowLeft,
  Pill,
  X,
  RefreshCw,
  Phone,
  Save,
} from "lucide-react"
import { createIntakeAndCheckoutAction } from "@/lib/stripe/checkout"
import { useUser } from "@clerk/nextjs"
import { TooltipProvider } from "@/components/ui/tooltip"
import { RX_MICROCOPY } from "@/lib/microcopy/prescription"
import type { SelectedPBSProduct } from "@/components/shared/medication-search"
import { ButtonSpinner } from "@/components/ui/skeleton"
import { createLogger } from "@/lib/observability/logger"
import { TrustStrip, Progress, SafetyKnockout, ControlledWarning } from "./prescription-flow-ui"
import {
  TypeSelectionStep,
  MedicationStep,
  GatingStep,
  ConditionStep,
  DurationStep,
  ControlStep,
  SideEffectsStep,
  NotesStep,
  SafetyStep,
  MedicareStep,
  SignupStep,
  ReviewStep,
  PaymentStep,
  SAFETY_QUESTIONS,
} from "./prescription-steps"

const log = createLogger("prescription-flow-client")

// Draft persistence constants
const STORAGE_KEY = "instantmed_rx_draft"
const DRAFT_EXPIRY_HOURS = 24

// Flow steps
type FlowStep =
  | "type"
  | "medication"
  | "gating"
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
  "gating",
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

// Progress stages
const PROGRESS_STAGES = ["Details", "Medicare", "Account", "Pay"] as const

interface Props {
  patientId: string | null
  isAuthenticated: boolean
  needsOnboarding: boolean
  userEmail?: string
  userName?: string
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
      // Safety check: ensure we don't go out of bounds
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
        return selectedMedication !== null
      case "gating":
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
          {step === "type" && (
            <TypeSelectionStep rxType={rxType} selectType={selectType} />
          )}

          {step === "medication" && (
            <MedicationStep
              selectedMedication={selectedMedication}
              setSelectedMedication={setSelectedMedication}
            />
          )}

          {step === "gating" && (
            <GatingStep
              prescribedBefore={prescribedBefore}
              setPrescribedBefore={setPrescribedBefore}
              doseChanged={doseChanged}
              setDoseChanged={setDoseChanged}
              isGatingBlocked={isGatingBlocked}
              setIsGatingBlocked={setIsGatingBlocked}
            />
          )}

          {step === "condition" && (
            <ConditionStep
              rxType={rxType}
              condition={condition}
              setCondition={setCondition}
              otherCondition={otherCondition}
              setOtherCondition={setOtherCondition}
            />
          )}

          {step === "duration" && (
            <DurationStep duration={duration} setDuration={setDuration} goNext={goNext} />
          )}

          {step === "control" && (
            <ControlStep control={control} setControl={setControl} goNext={goNext} />
          )}

          {step === "sideEffects" && (
            <SideEffectsStep sideEffects={sideEffects} setSideEffects={setSideEffects} goNext={goNext} />
          )}

          {step === "notes" && (
            <NotesStep notes={notes} setNotes={setNotes} />
          )}

          {step === "safety" && (
            <SafetyStep
              safetyAnswers={safetyAnswers}
              setSafetyAnswers={setSafetyAnswers}
              checkSafetyKnockout={checkSafetyKnockout}
            />
          )}

          {step === "medicare" && (
            <MedicareStep
              medicareNumber={medicareNumber}
              setMedicareNumber={setMedicareNumber}
              irn={irn}
              setIrn={setIrn}
              dob={dob}
              setDob={setDob}
              formatMedicare={formatMedicare}
              validateMedicare={validateMedicare}
            />
          )}

          {step === "signup" && (
            <SignupStep goTo={goTo} onAuthComplete={handleAuthComplete} />
          )}

          {step === "review" && (
            <ReviewStep
              selectedMedication={selectedMedication}
              condition={condition}
              otherCondition={otherCondition}
              rxType={rxType}
              duration={duration}
              goTo={goTo}
            />
          )}

          {step === "payment" && (
            <PaymentStep error={error} isSubmitting={isSubmitting} handleSubmit={handleSubmit} />
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
