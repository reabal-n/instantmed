"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  Loader2,
  FileText,
  Pill,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  ExternalLink,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { createOrGetProfile } from "@/app/actions/create-profile"
import { createRequestAndCheckoutAction } from "@/lib/stripe/checkout"
import { COPY, isControlledSubstance } from "@/lib/microcopy/universal"
import { validateMedicareNumber } from "@/lib/validation/medicare"
import { isTestMode, TEST_DATA } from "@/lib/test-mode"
import { skipPaymentTestMode } from "@/app/actions/test-actions"
import { PriorityUpsell } from "@/components/checkout/priority-upsell"

// Types
type Service = "medcert" | "prescription"
type Step = "service" | "clinical" | "safety" | "medicare" | "account" | "review"

interface FormData {
  // Service
  service: Service
  // Clinical
  certType: string
  duration: string
  startDate: string
  endDate: string
  symptoms: string[]
  notes: string
  carerPatientName: string
  carerRelationship: string
  // Prescription specific
  medicationName: string
  isRepeat: boolean
  lastPrescribedDate: string
  prescribingDoctor: string
  // Referral specific
  testTypes: string[]
  clinicalReason: string
  urgency: string
  // Safety
  safetyAnswers: Record<string, boolean>
  // Medicare
  medicareNumber: string
  medicareIrn: number
  // Account
  email: string
  password: string
  fullName: string
  dob: string
  phone: string
  priorityReview: boolean
  agreedTerms: boolean
}

interface Props {
  initialService?: Service
  patientId: string | null
  isAuthenticated: boolean
  needsOnboarding: boolean
  userEmail?: string
  userName?: string
  medicareNumber?: string
  medicareIrn?: number
}

// Storage key for persistence
const STORAGE_KEY = "instantmed_request_draft"

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

// Progress bar component
function ProgressBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="w-full flex gap-1.5" role="progressbar" aria-valuenow={current + 1} aria-valuemax={steps.length}>
      {steps.map((label, i) => (
        <div key={label} className="flex-1">
          <div className={`h-1 rounded-full transition-all duration-300 ${i <= current ? "bg-primary" : "bg-muted"}`} />
          <span
            className={`text-[10px] mt-1 block text-center font-medium ${i <= current ? "text-foreground" : "text-muted-foreground"}`}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

// Selectable card component
function SelectCard({
  selected,
  onClick,
  children,
  className = "",
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative p-4 rounded-xl border-2 text-left transition-all duration-150
        ${selected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/50 hover:bg-muted/50"}
        active:scale-[0.98] ${className}
      `}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}
      {children}
    </button>
  )
}

// Chip component for multi-select
function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-3 py-2 rounded-full text-sm font-medium transition-all duration-150
        ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"}
        active:scale-95
      `}
    >
      {children}
    </button>
  )
}

function TestFillButton({ onFill }: { onFill: () => void }) {
  if (!isTestMode) return null

  return (
    <button
      type="button"
      onClick={onFill}
      className="mt-3 text-xs text-amber-600 hover:text-amber-700 underline underline-offset-2"
    >
      Fill with test details
    </button>
  )
}

function TestPaymentHint() {
  if (!isTestMode) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-4">
      <p className="text-xs font-medium text-amber-800 mb-1">Testing payments?</p>
      <p className="text-xs text-amber-700">
        Use Stripe's test card: <code className="bg-amber-100 px-1 rounded">4242 4242 4242 4242</code>, any future
        expiry, any CVC, any postcode.
      </p>
    </div>
  )
}

function SkipPaymentButton({
  requestId,
  onSuccess,
}: {
  requestId: string | null
  onSuccess: () => void
}) {
  const [isSkipping, setIsSkipping] = useState(false)

  if (!isTestMode || !requestId) return null

  const handleSkip = async () => {
    setIsSkipping(true)
    try {
      const result = await skipPaymentTestMode(requestId)
      if (result.success) {
        onSuccess()
      }
    } finally {
      setIsSkipping(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleSkip}
      disabled={isSkipping}
      className="mt-2 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
    >
      {isSkipping ? "Skipping..." : "Skip payment (test only)"}
    </button>
  )
}

export function UnifiedFlowClient({
  initialService,
  patientId: initialPatientId,
  isAuthenticated: initialIsAuth,
  needsOnboarding: initialNeedsOnboard,
  userEmail,
  userName,
  medicareNumber: savedMedicare,
  medicareIrn: savedIrn,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  // Auth state
  const [patientId, setPatientId] = useState(initialPatientId)
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuth)
  const [needsOnboarding, setNeedsOnboarding] = useState(initialNeedsOnboard)

  // Flow state
  const [step, setStep] = useState<Step>(initialService ? "clinical" : "service")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Service selection
  const [service, setService] = useState<Service | null>(initialService || null)

  // Medical certificate data
  const [certType, setCertType] = useState<"work" | "uni" | "carer">("work")
  const [duration, setDuration] = useState("2 days")
  const [customDates, setCustomDates] = useState({ from: "", to: "" })
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [otherSymptom, setOtherSymptom] = useState("")
  const [carerName, setCarerName] = useState("")
  const [carerRelation, setCarerRelation] = useState("")

  // Prescription data
  const [rxType, setRxType] = useState<"repeat" | "new">("repeat")
  const [medication, setMedication] = useState("")
  const [condition, setCondition] = useState("")
  const [rxDuration, setRxDuration] = useState("")
  const [rxControl, setRxControl] = useState("")
  const [rxSideEffects, setRxSideEffects] = useState("")

  // Referral data
  const [refType, setRefType] = useState<"blood" | "imaging">("blood")
  const [selectedTests, setSelectedTests] = useState<string[]>([])
  const [imagingType, setImagingType] = useState("")
  const [bodyRegion, setBodyRegion] = useState("")
  const [testReason, setTestReason] = useState("")

  // Common fields
  const [notes, setNotes] = useState("")

  // Safety
  const [safetyAnswers, setSafetyAnswers] = useState({
    pregnant: false,
    allergies: false,
    reactions: false,
    urgent: false,
  })
  const hasSafetyRisk = safetyAnswers.reactions || safetyAnswers.urgent

  // Medicare
  const [medicare, setMedicare] = useState(savedMedicare || "")
  const [irn, setIrn] = useState<number | null>(savedIrn || null)
  const [medicareError, setMedicareError] = useState<string | null>(null)
  const [medicareValid, setMedicareValid] = useState(!!savedMedicare)

  // Account
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup")
  const [fullName, setFullName] = useState(userName || "")
  const [email, setEmail] = useState(userEmail || "")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [agreedTerms, setAgreedTerms] = useState(false)

  // Initialize form state from props and saved draft
  const initialFormData = {
    service: initialService || "medcert", // Default to medcert if not provided
    certType: "work",
    duration: "2 days",
    startDate: "",
    endDate: "",
    symptoms: [],
    notes: "",
    carerPatientName: "",
    carerRelationship: "",
    medicationName: "",
    isRepeat: true,
    lastPrescribedDate: "",
    prescribingDoctor: "",
    testTypes: [],
    clinicalReason: "",
    urgency: "",
    safetyAnswers: { pregnant: false, allergies: false, reactions: false, urgent: false },
    medicareNumber: savedMedicare || "",
    medicareIrn: savedIrn || 0,
    email: userEmail || "",
    password: "",
    fullName: userName || "",
    dob: "",
    phone: "",
    priorityReview: false,
    agreedTerms: false,
  }

  const [form, setForm] = useState<FormData>(initialFormData)

  // Controlled substance check
  const isControlled = useMemo(
    () => service === "prescription" && isControlledSubstance(medication),
    [service, medication],
  )

  // Determine active steps
  const getSteps = useCallback((): Step[] => {
    const steps: Step[] = ["service", "clinical", "safety"]
    if (needsOnboarding || !savedMedicare) steps.push("medicare")
    if (!isAuthenticated) steps.push("account")
    steps.push("review")
    return steps
  }, [isAuthenticated, needsOnboarding, savedMedicare])

  const steps = getSteps()
  const currentIndex = steps.indexOf(step)
  const progressLabels = [
    "Details",
    savedMedicare ? null : "Medicare",
    !isAuthenticated ? "Account" : null,
    "Review",
  ].filter(Boolean) as string[]
  const progressIndex =
    step === "service" || step === "clinical"
      ? 0
      : step === "safety"
        ? 0
        : step === "medicare"
          ? 1
          : step === "account"
            ? 2
            : progressLabels.length - 1

  // Navigation
  const goTo = useCallback((next: Step) => {
    setIsTransitioning(true)
    setError(null)
    setTimeout(() => {
      setStep(next)
      setIsTransitioning(false)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }, 150)
  }, [])

  const goNext = useCallback(() => {
    const idx = steps.indexOf(step)
    if (idx < steps.length - 1) goTo(steps[idx + 1])
  }, [steps, step, goTo])

  const goBack = useCallback(() => {
    const idx = steps.indexOf(step)
    if (idx > 0) goTo(steps[idx - 1])
  }, [steps, step, goTo])

  // Auto-advance on service selection
  const selectService = (s: Service) => {
    setService(s)
    setForm({ ...form, service: s })
    setTimeout(() => goTo("clinical"), 200)
  }

  // Medicare validation
  const handleMedicareChange = (value: string) => {
    const digits = value.replace(/\D/g, "")
    // Format: XXXX XXXXX X
    let formatted = ""
    for (let i = 0; i < digits.length && i < 10; i++) {
      if (i === 4 || i === 9) formatted += " "
      formatted += digits[i]
    }
    setMedicare(formatted)
    setForm({ ...form, medicareNumber: formatted })

    if (digits.length === 0) {
      setMedicareError(null)
      setMedicareValid(false)
    } else if (digits.length < 10) {
      setMedicareError(COPY.medicare.errors.incomplete(10 - digits.length))
      setMedicareValid(false)
    } else {
      const result = validateMedicareNumber(digits)
      if (result.valid) {
        setMedicareError(null)
        setMedicareValid(true)
      } else {
        setMedicareError(COPY.medicare.errors.invalid)
        setMedicareValid(false)
      }
    }
  }

  // Save draft to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    const draft = {
      ...form,
      service,
      certType,
      duration,
      symptoms,
      otherSymptom,
      carerName,
      carerRelation,
      rxType,
      medication,
      condition,
      rxDuration,
      rxControl,
      rxSideEffects,
      refType,
      selectedTests,
      imagingType,
      bodyRegion,
      testReason,
      notes,
      medicare,
      irn,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  }, [
    service,
    certType,
    duration,
    symptoms,
    otherSymptom,
    carerName,
    carerRelation,
    rxType,
    medication,
    condition,
    rxDuration,
    rxControl,
    rxSideEffects,
    refType,
    selectedTests,
    imagingType,
    bodyRegion,
    testReason,
    notes,
    medicare,
    irn,
    form, // Include form in dependencies
  ])

  // Restore draft on mount
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const draft = JSON.parse(saved)
        if (draft.service) {
          setService(draft.service)
          setForm((prev) => ({ ...prev, service: draft.service }))
        }
        if (draft.certType) {
          setCertType(draft.certType)
          setForm((prev) => ({ ...prev, certType: draft.certType }))
        }
        if (draft.duration) {
          setDuration(draft.duration)
          setForm((prev) => ({ ...prev, duration: draft.duration }))
        }
        if (draft.symptoms) {
          setSymptoms(draft.symptoms)
          setForm((prev) => ({ ...prev, symptoms: draft.symptoms }))
        }
        if (draft.otherSymptom) {
          setOtherSymptom(draft.otherSymptom)
          setForm((prev) => ({ ...prev, otherSymptom: draft.otherSymptom }))
        }
        if (draft.carerName) {
          setCarerName(draft.carerName)
          setForm((prev) => ({ ...prev, carerPatientName: draft.carerName })) // Map to form field
        }
        if (draft.carerRelation) {
          setCarerRelation(draft.carerRelation)
          setForm((prev) => ({ ...prev, carerRelationship: draft.carerRelation })) // Map to form field
        }
        if (draft.rxType) {
          setRxType(draft.rxType)
          setForm((prev) => ({ ...prev, isRepeat: draft.rxType === "repeat" })) // Map to form field
        }
        if (draft.medication) {
          setMedication(draft.medication)
          setForm((prev) => ({ ...prev, medicationName: draft.medication })) // Map to form field
        }
        if (draft.condition) {
          setCondition(draft.condition)
          setForm((prev) => ({ ...prev, clinicalReason: draft.condition })) // Map to form field
        }
        if (draft.rxDuration) {
          setRxDuration(draft.rxDuration)
          setForm((prev) => ({ ...prev, duration: draft.rxDuration })) // Map to form field, may need adjustment
        }
        if (draft.rxControl) {
          setRxControl(draft.rxControl)
          setForm((prev) => ({ ...prev, urgency: draft.rxControl })) // Map to form field, may need adjustment
        }
        if (draft.rxSideEffects) {
          setRxSideEffects(draft.rxSideEffects)
          setForm((prev) => ({ ...prev, notes: draft.rxSideEffects })) // Map to form field, may need adjustment
        }
        if (draft.refType) {
          setRefType(draft.refType)
          setForm((prev) => ({ ...prev, testTypes: draft.refType === "blood" ? [] : [draft.refType] })) // Map to form field, may need adjustment
        }
        if (draft.selectedTests) {
          setSelectedTests(draft.selectedTests)
          setForm((prev) => ({ ...prev, testTypes: draft.selectedTests })) // Map to form field
        }
        if (draft.imagingType) {
          setImagingType(draft.imagingType)
          setForm((prev) => ({ ...prev, testTypes: [draft.imagingType] })) // Map to form field
        }
        if (draft.bodyRegion) {
          setBodyRegion(draft.bodyRegion)
          setForm((prev) => ({ ...prev, clinicalReason: draft.bodyRegion })) // Map to form field, may need adjustment
        }
        if (draft.testReason) {
          setTestReason(draft.testReason)
          setForm((prev) => ({ ...prev, clinicalReason: draft.testReason })) // Map to form field
        }
        if (draft.notes) {
          setNotes(draft.notes)
          setForm((prev) => ({ ...prev, notes: draft.notes }))
        }
        if (draft.medicare) {
          setMedicare(draft.medicare)
          handleMedicareChange(draft.medicare)
          setForm((prev) => ({ ...prev, medicareNumber: draft.medicare }))
        }
        if (draft.irn) {
          setIrn(draft.irn)
          setForm((prev) => ({ ...prev, medicareIrn: draft.irn }))
        }

        // Load other form fields if they exist in the draft
        setForm((prev) => ({ ...prev, ...draft }))
      }
    } catch {}
  }, [])

  // Auth handlers
  const handleGoogleAuth = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const redirectUrl = `${window.location.origin}/auth/callback?next=/request`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl },
      })
      if (error) throw error
    } catch (e: any) {
      setError(e.message || COPY.errors.auth)
      setIsSubmitting(false)
    }
  }

  const handleEmailAuth = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/request`,
          },
        })
        if (error) throw error
        if (data.session) {
          // Immediate login (no email confirmation)
          const result = await createOrGetProfile(
            data.user!.id,
            fullName,
            form.dob || ""
          )
          if (result.error) throw new Error(result.error || "Profile creation failed")
          setPatientId(result.profileId!)
          setIsAuthenticated(true)
          setNeedsOnboarding(false)
          goTo("review")
        } else {
          setError("Check your email to confirm, then sign in.")
          setAuthMode("signin")
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const result = await createOrGetProfile(
          data.user.id,
          fullName || data.user.user_metadata?.full_name || "",
          form.dob || ""
        )
        if (result.error) throw new Error(result.error || "Profile creation failed")
        setPatientId(result.profileId!)
        setIsAuthenticated(true)
        setNeedsOnboarding(false)
        goTo("review")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : COPY.errors.auth)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit request
  const handleSubmit = async () => {
    if (!patientId || !service) return
    setIsSubmitting(true)
    setError(null)
    try {
      // Build request details
      let category: "medical_certificate" | "prescription" = "medical_certificate"
      let subtype = ""
      let details: Record<string, unknown> = {}

      if (service === "medcert") {
        category = "medical_certificate"
        subtype = certType
        details = {
          duration,
          customDates: duration === "Custom" ? customDates : null,
          symptoms,
          otherSymptom: symptoms.includes("other") ? otherSymptom : null,
          carerName: certType === "carer" ? carerName : null,
          carerRelation: certType === "carer" ? carerRelation : null,
          notes,
          safetyAnswers,
        }
      } else {
        category = "prescription"
        subtype = rxType
        details = {
          medication,
          condition,
          duration: rxDuration,
          control: rxControl,
          sideEffects: rxSideEffects,
          notes,
          safetyAnswers,
        }
      }

      const result = await createRequestAndCheckoutAction({
        patientId,
        category,
        subtype,
        type: service,
        answers: { ...details, priorityReview: form.priorityReview },
      })

      if (result.error) throw new Error(result.error)
      if (result.checkoutUrl) {
        localStorage.removeItem(STORAGE_KEY)
        window.location.href = result.checkoutUrl
      }
    } catch (e: any) {
      setError(e.message || COPY.errors.payment)
      setIsSubmitting(false)
    }
  }

  // Get price
  const getPrice = () => {
    const basePrice = service === "medcert" ? 19.95 : 24.95
    return (basePrice + (form.priorityReview ? 10 : 0)).toFixed(2)
  }

  // Can continue from clinical step?
  const canContinueClinical = useMemo(() => {
    if (!service) return false
    if (service === "medcert") {
      return (
        symptoms.length > 0 &&
        (!symptoms.includes("other") || otherSymptom) &&
        (certType !== "carer" || (carerName && carerRelation))
      )
    }
    if (service === "prescription") {
      return medication && condition && (rxType === "repeat" || (rxDuration && rxControl && rxSideEffects))
    }
    return false
  }, [
    service,
    symptoms,
    otherSymptom,
    certType,
    carerName,
    carerRelation,
    medication,
    condition,
    rxType,
    rxDuration,
    rxControl,
    rxSideEffects,
  ])

  // Extract the ID for the skip button
  const [requestId, setRequestId] = useState<string | null>(null)

  // If the user is authenticated and the patientId exists, we can potentially get the request ID after submission
  useEffect(() => {
    if (isAuthenticated && patientId) {
      // This is a placeholder. In a real application, you would fetch the request ID
      // after the initial submission and before the payment step.
      // For now, we'll just use a dummy value for testing.
      if (isTestMode) {
        setRequestId("test-request-123")
      }
    }
  }, [isAuthenticated, patientId])

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex items-center gap-3">
            {step !== "service" && (
              <button
                onClick={goBack}
                className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{service ? COPY[service].heading : "New Request"}</h1>
              <p className="text-xs text-muted-foreground">{COPY.global.turnaround}</p>
            </div>
          </div>
          <ProgressBar steps={progressLabels} current={progressIndex} />
        </div>
      </header>

      {/* Content */}
      <div
        className={`max-w-lg mx-auto px-4 py-6 transition-opacity duration-150 ${isTransitioning ? "opacity-0" : "opacity-100"}`}
      >
        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Service Selection */}
        {step === "service" && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold">{COPY.services.heading}</h2>
              <p className="text-sm text-muted-foreground mt-1">{COPY.services.subtitle}</p>
            </div>
            <div className="grid gap-3">
              {[
                { id: "medcert" as Service, icon: FileText, label: COPY.services.options.medcert.label, description: COPY.services.options.medcert.description },
                { id: "prescription" as Service, icon: Pill, label: COPY.services.options.prescription.label, description: COPY.services.options.prescription.description },
              ].map((opt) => (
                <SelectCard
                  key={opt.id}
                  selected={service === opt.id}
                  onClick={() => selectService(opt.id)}
                  className="flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <opt.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-sm text-muted-foreground">{opt.description}</div>
                  </div>
                </SelectCard>
              ))}
            </div>
          </div>
        )}

        {/* Clinical Questionnaire */}
        {step === "clinical" && service === "medcert" && (
          <div className="space-y-6">
            {/* Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Certificate type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["work", "uni", "carer"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setCertType(t)
                      setForm({ ...form, certType: t })
                    }}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${certType === t ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                  >
                    <span className="text-lg">{COPY.medcert.types[t].emoji}</span>
                    <div className="text-sm font-medium mt-1">{COPY.medcert.types[t].label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{COPY.medcert.duration.heading}</Label>
              <div className="flex flex-wrap gap-2">
                {COPY.medcert.duration.options.map((opt) => (
                  <Chip
                    key={opt}
                    selected={duration === opt}
                    onClick={() => {
                      setDuration(opt)
                      setForm({ ...form, duration: opt })
                    }}
                  >
                    {opt}
                  </Chip>
                ))}
              </div>
              {duration === "Custom" && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Input
                    type="date"
                    value={customDates.from}
                    onChange={(e) => {
                      setCustomDates({ ...customDates, from: e.target.value })
                      setForm({ ...form, startDate: e.target.value })
                    }}
                  />
                  <Input
                    type="date"
                    value={customDates.to}
                    onChange={(e) => {
                      setCustomDates({ ...customDates, to: e.target.value })
                      setForm({ ...form, endDate: e.target.value })
                    }}
                  />
                </div>
              )}
            </div>

            {/* Carer fields */}
            {certType === "carer" && (
              <div className="space-y-3 p-4 rounded-xl bg-muted/50">
                <div className="space-y-1.5">
                  <Label className="text-sm">{COPY.medcert.carer.nameLabel}</Label>
                  <Input
                    value={carerName}
                    onChange={(e) => {
                      setCarerName(e.target.value)
                      setForm({ ...form, carerPatientName: e.target.value })
                    }}
                    placeholder={COPY.medcert.carer.namePlaceholder}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{COPY.medcert.carer.relationLabel}</Label>
                  <div className="flex flex-wrap gap-2">
                    {COPY.medcert.carer.relations.map((r) => (
                      <Chip
                        key={r}
                        selected={carerRelation === r}
                        onClick={() => {
                          setCarerRelation(r)
                          setForm({ ...form, carerRelationship: r })
                        }}
                      >
                        {r}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Symptoms */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {certType === "carer" ? COPY.medcert.symptoms.headingCarer : COPY.medcert.symptoms.heading}
              </Label>
              <p className="text-xs text-muted-foreground">{COPY.medcert.symptoms.subtitle}</p>
              <div className="flex flex-wrap gap-2">
                {COPY.medcert.symptoms.options.map((s) => (
                  <Chip
                    key={s.id}
                    selected={symptoms.includes(s.id)}
                    onClick={() => {
                      const newSymptoms = symptoms.includes(s.id)
                        ? symptoms.filter((x) => x !== s.id)
                        : [...symptoms, s.id]
                      setSymptoms(newSymptoms)
                      setForm({ ...form, symptoms: newSymptoms })
                    }}
                  >
                    {s.emoji} {s.label}
                  </Chip>
                ))}
              </div>
              {symptoms.includes("other") && (
                <Input
                  className="mt-2"
                  value={otherSymptom}
                  onChange={(e) => {
                    setOtherSymptom(e.target.value)
                    setForm({ ...form, symptoms: [...symptoms.filter((s) => s !== "other"), "other"] }) // Ensure 'other' is always present if described
                  }}
                  placeholder="Describe your symptoms..."
                />
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{COPY.notes.heading}</Label>
              <p className="text-xs text-muted-foreground">{COPY.notes.subtitle}</p>
              <Textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value)
                  setForm({ ...form, notes: e.target.value })
                }}
                placeholder={COPY.notes.placeholder}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        )}

        {step === "clinical" && service === "prescription" && (
          <div className="space-y-6">
            {/* Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Prescription type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["repeat", "new"] as const).map((t) => (
                  <SelectCard
                    key={t}
                    selected={rxType === t}
                    onClick={() => {
                      setRxType(t)
                      setForm({ ...form, isRepeat: t === "repeat" })
                    }}
                  >
                    <div className="font-medium">{COPY.prescription.types[t].label}</div>
                    <div className="text-xs text-muted-foreground">{COPY.prescription.types[t].description}</div>
                  </SelectCard>
                ))}
              </div>
            </div>

            {/* Medication */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{COPY.prescription.medication.heading}</Label>
              <Input
                value={medication}
                onChange={(e) => {
                  setMedication(e.target.value)
                  setForm({ ...form, medicationName: e.target.value })
                }}
                placeholder={COPY.prescription.medication.placeholder}
              />
              {isControlled && (
                <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  {COPY.prescription.medication.controlled}
                </p>
              )}
            </div>

            {/* Condition */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{COPY.prescription.condition.heading}</Label>
              <div className="flex flex-wrap gap-2">
                {COPY.prescription.condition.options.map((c) => (
                  <Chip
                    key={c.id}
                    selected={condition === c.id}
                    onClick={() => {
                      setCondition(c.id)
                      setForm({ ...form, clinicalReason: c.id })
                    }}
                  >
                    {c.label}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Repeat-specific questions */}
            {rxType === "repeat" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{COPY.prescription.duration.heading}</Label>
                  <div className="flex flex-wrap gap-2">
                    {COPY.prescription.duration.options.map((d) => (
                      <Chip
                        key={d.id}
                        selected={rxDuration === d.id}
                        onClick={() => {
                          setRxDuration(d.id)
                          setForm({ ...form, duration: d.id })
                        }}
                      >
                        {d.label}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{COPY.prescription.control.heading}</Label>
                  <div className="flex flex-wrap gap-2">
                    {COPY.prescription.control.options.map((c) => (
                      <Chip
                        key={c.id}
                        selected={rxControl === c.id}
                        onClick={() => {
                          setRxControl(c.id)
                          setForm({ ...form, urgency: c.id })
                        }}
                      >
                        {c.label}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{COPY.prescription.sideEffects.heading}</Label>
                  <div className="flex flex-wrap gap-2">
                    {COPY.prescription.sideEffects.options.map((s) => (
                      <Chip
                        key={s.id}
                        selected={rxSideEffects === s.id}
                        onClick={() => {
                          setRxSideEffects(s.id)
                          setForm({ ...form, notes: s.id }) // Mapping side effects to notes for now
                        }}
                      >
                        {s.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{COPY.notes.heading}</Label>
              <Textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value)
                  setForm({ ...form, notes: e.target.value })
                }}
                placeholder={COPY.notes.placeholder}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        )}


        {/* Safety Check */}
        {step === "safety" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">{COPY.safety.heading}</h2>
              <p className="text-sm text-muted-foreground mt-1">{COPY.safety.subtitle}</p>
            </div>

            {hasSafetyRisk ? (
              <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-4">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
                <h3 className="font-semibold text-lg">{COPY.safety.knockout.heading}</h3>
                <p className="text-sm text-muted-foreground">{COPY.safety.knockout.body}</p>
                <Button variant="outline" className="gap-2 bg-transparent" onClick={() => window.open("tel:000")}>
                  {COPY.safety.knockout.cta}
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(COPY.safety.questions).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between p-4 rounded-xl border bg-card">
                    <span className="text-sm font-medium pr-4">{label}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSafetyAnswers((prev) => ({ ...prev, [key]: false }))
                          setForm({ ...form, safetyAnswers: { ...form.safetyAnswers, [key]: false } })
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!safetyAnswers[key as keyof typeof safetyAnswers] ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                      >
                        {COPY.safety.labels.no}
                      </button>
                      <button
                        onClick={() => {
                          setSafetyAnswers((prev) => ({ ...prev, [key]: true }))
                          setForm({ ...form, safetyAnswers: { ...form.safetyAnswers, [key]: true } })
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${safetyAnswers[key as keyof typeof safetyAnswers] ? "bg-destructive text-destructive-foreground" : "bg-muted"}`}
                      >
                        {COPY.safety.labels.yes}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Medicare */}
        {step === "medicare" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">{COPY.medicare.heading}</h2>
              <p className="text-sm text-muted-foreground mt-1">{COPY.medicare.subtitle}</p>
            </div>

            <div className="p-5 rounded-xl border bg-card space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{COPY.medicare.number.label}</Label>
                <div className="relative">
                  <Input
                    value={medicare}
                    onChange={(e) => handleMedicareChange(e.target.value)}
                    placeholder={COPY.medicare.number.placeholder}
                    className={`text-lg tracking-widest font-mono ${medicareValid ? "border-green-500 pr-10" : medicareError ? "border-destructive" : ""}`}
                    maxLength={12}
                  />
                  {medicareValid && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                </div>
                {medicareError && <p className="text-xs text-destructive">{medicareError}</p>}
                <p className="text-xs text-muted-foreground">{COPY.medicare.number.help}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{COPY.medicare.irn.label}</Label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setIrn(n)
                        setForm({ ...form, medicareIrn: n })
                      }}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${irn === n ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{COPY.medicare.irn.help}</p>
              </div>
            </div>

            {/* Add TestFillButton inside the medicare step */}
            <TestFillButton
              onFill={() => {
                setMedicare(TEST_DATA.medicare.number)
                handleMedicareChange(TEST_DATA.medicare.number)
                setIrn(TEST_DATA.medicare.irn)
                setForm({ ...form, medicareNumber: TEST_DATA.medicare.number, medicareIrn: TEST_DATA.medicare.irn })
              }}
            />

            <button
              className="text-sm text-muted-foreground underline underline-offset-2 w-full text-center"
              onClick={goNext}
            >
              {COPY.medicare.skip}
            </button>
          </div>
        )}

        {/* Account */}
        {step === "account" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">
                {authMode === "signup" ? COPY.account.headingNew : COPY.account.headingExisting}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{COPY.account.subtitle}</p>
            </div>

            <Button
              variant="outline"
              className="w-full gap-3 h-12 bg-transparent"
              onClick={handleGoogleAuth}
              disabled={isSubmitting}
            >
              <GoogleIcon className="w-5 h-5" />
              {COPY.account.google}
            </Button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{COPY.account.divider}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-3">
              {authMode === "signup" && (
                <div className="space-y-1.5">
                  <Label className="text-sm">{COPY.account.name.label}</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value)
                      setForm({ ...form, fullName: e.target.value })
                    }}
                    placeholder={COPY.account.name.placeholder}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-sm">{COPY.account.email.label}</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setForm({ ...form, email: e.target.value })
                  }}
                  placeholder={COPY.account.email.placeholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">{COPY.account.password.label}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setForm({ ...form, password: e.target.value })
                    }}
                    placeholder={COPY.account.password.placeholder}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authMode === "signup" && (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => {
                      setAgreedTerms(e.target.checked)
                      setForm({ ...form, agreedTerms: e.target.checked })
                    }}
                    className="mt-1"
                  />
                  <span className="text-muted-foreground">
                    {COPY.account.terms.prefix}{" "}
                    <a href="/terms" className="text-primary underline">
                      {COPY.account.terms.terms}
                    </a>{" "}
                    {COPY.account.terms.and}{" "}
                    <a href="/privacy" className="text-primary underline">
                      {COPY.account.terms.privacy}
                    </a>
                  </span>
                </label>
              )}

              <Button
                className="w-full h-12"
                onClick={handleEmailAuth}
                disabled={isSubmitting || (authMode === "signup" && (!agreedTerms || !fullName)) || !email || !password}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : authMode === "signup" ? (
                  COPY.account.ctaNew
                ) : (
                  COPY.account.ctaExisting
                )}
              </Button>

              <div className="flex justify-between text-sm">
                <button
                  onClick={() => setAuthMode(authMode === "signup" ? "signin" : "signup")}
                  className="text-primary underline underline-offset-2"
                >
                  {authMode === "signup" ? COPY.account.switchExisting : COPY.account.switchNew}
                </button>
                {authMode === "signin" && (
                  <a href="/auth/forgot-password" className="text-muted-foreground underline underline-offset-2">
                    {COPY.account.forgot}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Review */}
        {step === "review" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">{COPY.review.heading}</h2>
              <p className="text-sm text-muted-foreground mt-1">{COPY.review.subtitle}</p>
            </div>

            {/* Add TestPaymentHint before the pay button */}
            <TestPaymentHint />

            <div className="p-5 rounded-xl border bg-card space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{COPY.review.sections.type}</span>
                <span className="font-medium capitalize">
                  {service === "medcert" ? `${certType} certificate` : service}
                </span>
              </div>
              <hr />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{COPY.review.sections.details}</span>
                  <button onClick={() => goTo("clinical")} className="text-primary text-xs underline">
                    {COPY.review.edit}
                  </button>
                </div>
                {service === "medcert" && (
                  <>
                    <p className="text-sm">
                      Duration: <span className="font-medium">{duration}</span>
                    </p>
                    <p className="text-sm">
                      Symptoms: <span className="font-medium">{symptoms.join(", ")}</span>
                    </p>
                  </>
                )}
                {service === "prescription" && (
                  <>
                    <p className="text-sm">
                      Medication: <span className="font-medium">{medication}</span>
                    </p>
                    <p className="text-sm">
                      Type: <span className="font-medium capitalize">{rxType}</span>
                    </p>
                  </>
                )}
              </div>
              <hr />

              {/* Add this in the review step, before the payment button */}
              <div className="pt-4 border-t">
                <PriorityUpsell
                  selected={form.priorityReview}
                  onToggle={(selected) => setForm({ ...form, priorityReview: selected })}
                  basePrice={service === "medcert" ? 19.95 : 24.95}
                />
              </div>

              {/* Price summary */}
              <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {service === "medcert" ? "Medical Certificate" : "Prescription"}
                  </span>
                  <span>${service === "medcert" ? "19.95" : "24.95"}</span>
                </div>
                {form.priorityReview && (
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>Priority Review</span>
                    <span>+$10.00</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span>${getPrice()}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">{COPY.review.disclaimer}</p>

            <Button className="w-full h-12 text-base" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {COPY.payment.processing}
                </>
              ) : (
                <>
                  {COPY.payment.cta} · ${getPrice()}
                </>
              )}
            </Button>

            {/* Add skip payment button in review step */}
            <SkipPaymentButton
              requestId={requestId}
              onSuccess={() => {
                localStorage.removeItem(STORAGE_KEY)
                window.location.href = "/success" // Or wherever your success page is
              }}
            />

            <p className="text-xs text-muted-foreground text-center">{COPY.payment.secure}</p>
          </div>
        )}
      </div>

      {/* Footer navigation */}
      {step !== "service" && step !== "account" && step !== "review" && !hasSafetyRisk && (
        <footer className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4">
          <div className="max-w-lg mx-auto">
            <Button
              className="w-full h-12"
              onClick={goNext}
              disabled={
                (step === "clinical" && !canContinueClinical) || (step === "medicare" && !medicareValid && !irn)
              }
            >
              {COPY.nav.next}
            </Button>
          </div>
        </footer>
      )}
    </div>
  )
}
