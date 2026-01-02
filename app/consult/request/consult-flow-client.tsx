"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Button,
  Input,
  Textarea,
} from "@heroui/react"
import confetti from "canvas-confetti"
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Pencil,
  Stethoscope,
} from "lucide-react"
import { createRequestAndCheckoutAction } from "@/lib/stripe/checkout"
import { useUser, useClerk } from "@clerk/nextjs"
import { createOrGetProfile } from "@/app/actions/create-profile"

// Flow steps for general consult
type FlowStep =
  | "reason"
  | "details"
  | "safety"
  | "medicare"
  | "signup"
  | "review"
  | "payment"

const CONSULT_STEPS: FlowStep[] = [
  "reason",
  "details",
  "safety",
  "medicare",
  "signup",
  "review",
  "payment",
]

// Consultation reasons
const CONSULT_REASONS = [
  { id: "new_medication", label: "New medication request" },
  { id: "dose_change", label: "Dose change for existing medication" },
  { id: "complex_condition", label: "Complex health concern" },
  { id: "second_opinion", label: "Second opinion" },
  { id: "referral", label: "Specialist referral" },
  { id: "other", label: "Other" },
] as const

// Safety questions
const SAFETY_QUESTIONS = [
  {
    id: "rf_chest_pain",
    question: "Are you experiencing chest pain or difficulty breathing?",
    knockout: true,
  },
  {
    id: "rf_suicidal",
    question: "Are you having thoughts of self-harm or suicide?",
    knockout: true,
  },
  {
    id: "rf_emergency",
    question: "Do you believe this is a medical emergency?",
    knockout: true,
  },
]

// Progress stages
const PROGRESS_STAGES = [
  { label: "Details", icon: "📋" },
  { label: "Medicare", icon: "💳" },
  { label: "Account", icon: "👤" },
  { label: "Review", icon: "✓" },
]

// Google icon component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
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

// Step header component with emoji support
function StepHeader({ title, subtitle, emoji }: { title: string; subtitle?: string; emoji?: string }) {
  return (
    <div className="text-center mb-4">
      {emoji && <div className="text-4xl mb-2 animate-bounce-gentle">{emoji}</div>}
      <h2 className="text-xl font-semibold">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  )
}

// Safety knockout component
function SafetyKnockout() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-b from-red-50 to-white">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-red-900">Please Seek Immediate Help</h1>
        <p className="text-red-700">
          Based on your responses, this service is not appropriate for your current situation.
        </p>
        <div className="bg-white rounded-2xl p-6 border border-red-200 space-y-4">
          <p className="font-medium">If this is a medical emergency:</p>
          <Button
            as="a"
            href="tel:000"
            className="w-full"
            color="danger"
          >
            Call 000
          </Button>
          <p className="text-sm text-muted-foreground">or go to your nearest emergency department</p>
          <hr className="border-red-100" />
          <p className="font-medium">For mental health crisis support:</p>
          <Button
            as="a"
            href="tel:131114"
            className="w-full"
            variant="bordered"
            color="danger"
          >
            Lifeline: 13 11 14
          </Button>
        </div>
        <Button
          as={Link}
          href="/"
          variant="light"
        >
          Return to home
        </Button>
      </div>
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

export function ConsultFlowClient({
  patientId: initialPatientId,
  isAuthenticated: initialIsAuthenticated,
  needsOnboarding: initialNeedsOnboarding,
  userEmail,
  userName,
}: Props) {
  const router = useRouter()
  const { isSignedIn, user: clerkUser } = useUser()
  const { openSignIn } = useClerk()

  // Auth state
  const [patientId, setPatientId] = useState<string | null>(initialPatientId)
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated)
  const [needsOnboarding, setNeedsOnboarding] = useState(initialNeedsOnboarding)

  // Flow state
  const [step, setStep] = useState<FlowStep>("reason")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [consultReason, setConsultReason] = useState<string | null>(null)
  const [consultDetails, setConsultDetails] = useState("")
  const [currentMedications, setCurrentMedications] = useState("")
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

  // Safety knockout
  const [isKnockedOut, setIsKnockedOut] = useState(false)

  const steps = CONSULT_STEPS
  const stepIndex = steps.indexOf(step)

  // Get progress stage index
  const getProgressIndex = () => {
    if (["reason", "details", "safety"].includes(step)) return 0
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
      let nextStep = steps[currentIndex + 1]

      // Skip signup if already authenticated
      if (nextStep === "signup" && isAuthenticated && !needsOnboarding) {
        nextStep = steps[currentIndex + 2]
      }

      goTo(nextStep)
    }
  }, [step, steps, isAuthenticated, needsOnboarding, goTo])

  const goBack = useCallback(() => {
    const currentIndex = steps.indexOf(step)
    if (currentIndex > 0) {
      let prevStep = steps[currentIndex - 1]

      // Skip signup if already authenticated
      if (prevStep === "signup" && isAuthenticated && !needsOnboarding) {
        prevStep = steps[currentIndex - 2]
      }

      goTo(prevStep)
    }
  }, [step, steps, isAuthenticated, needsOnboarding, goTo])

  // Check if can continue
  const canContinue = () => {
    switch (step) {
      case "reason":
        return !!consultReason
      case "details":
        return consultDetails.trim().length > 10
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

  // Handle Google auth - uses Clerk modal
  const handleGoogleAuth = () => {
    sessionStorage.setItem("pending_profile_name", fullName)
    sessionStorage.setItem("pending_profile_dob", dob)

    // Open Clerk sign-in modal
    openSignIn({
      afterSignInUrl: window.location.href,
      afterSignUpUrl: window.location.href,
    })
  }

  // Handle submit
  const handleSubmit = async () => {
    if (!patientId) {
      setError("Please sign in to continue")
      return
    }

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    })

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await createRequestAndCheckoutAction({
        category: "consult",
        subtype: "general",
        type: "script",
        answers: {
          consult_reason: consultReason,
          consult_reason_label: CONSULT_REASONS.find((r) => r.id === consultReason)?.label,
          consult_details: consultDetails,
          current_medications: currentMedications,
          safetyAnswers,
        },
      })

      if (result.success && result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      } else {
        setError(result.error || "Something went wrong. Please try again.")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Sync Clerk auth state
  useEffect(() => {
    const syncClerkAuth = async () => {
      if (isSignedIn && clerkUser && !isAuthenticated) {
        const pendingName = sessionStorage.getItem("pending_profile_name")
        const pendingDob = sessionStorage.getItem("pending_profile_dob")
        const userNameFromSession = pendingName || clerkUser.fullName || clerkUser.firstName || ""
        const userDob = pendingDob || ""

        const { profileId } = await createOrGetProfile(clerkUser.id, userNameFromSession, userDob)

        if (profileId) {
          sessionStorage.removeItem("pending_profile_name")
          sessionStorage.removeItem("pending_profile_dob")
          setPatientId(profileId)
          setIsAuthenticated(true)
          setNeedsOnboarding(false)

          // Auto-advance if on signup step
          if (step === "signup") {
            goNext()
          }
        }
      }
    }
    syncClerkAuth()
  }, [isSignedIn, clerkUser, isAuthenticated, step, goNext])

  // If knocked out by safety check
  if (isKnockedOut) {
    return <SafetyKnockout />
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-violet-50/50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={stepIndex > 0 ? goBack : () => router.push("/consult")}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-violet-600" />
            <span className="font-semibold text-sm">General Consult</span>
          </div>
          <div className="w-9" />
        </div>
      </header>

      {/* Progress - Animated Dots */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <nav aria-label="Progress" className="w-full mb-6">
          <div className="flex flex-col items-center gap-2">
            {/* Animated dots */}
            <div className="flex items-center gap-3 relative">
              {PROGRESS_STAGES.map((stage, i) => {
                const isComplete = i < getProgressIndex()
                const isCurrent = i === getProgressIndex()
                return (
                  <div
                    key={stage.label}
                    className={`w-2.5 h-2.5 rounded-full relative z-10 transition-all duration-300 ${
                      isComplete ? "bg-primary scale-100" : isCurrent ? "bg-primary/80 scale-110" : "bg-muted-foreground/30"
                    }`}
                    role="progressbar"
                    aria-valuenow={isComplete ? 100 : isCurrent ? 50 : 0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${stage.label}: ${isComplete ? "Complete" : isCurrent ? "In progress" : "Not started"}`}
                  />
                )
              })}
              {/* Animated progress line */}
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary/20 rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${Math.max(10, (getProgressIndex() / (PROGRESS_STAGES.length - 1)) * 100)}%`,
                }}
              />
            </div>
            {/* Step label */}
            <p className="text-xs text-muted-foreground">
              Step {getProgressIndex() + 1} of {PROGRESS_STAGES.length}: <span className="font-medium text-foreground">{PROGRESS_STAGES[getProgressIndex()]?.label}</span>
            </p>
          </div>
        </nav>
      </div>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 pb-32">
        <div
          className={`transition-all duration-150 ${
            isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          }`}
        >
          {/* Step: Reason */}
          {step === "reason" && (
            <div className="space-y-4 animate-step-enter">
              <StepHeader
                emoji="🩺"
                title="What brings you in today?"
                subtitle="Select the main reason for your consultation"
              />
              {/* S8 Disclaimer - shown upfront at consult intake */}
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <p className="text-xs text-red-800 leading-relaxed font-medium">
                  <strong className="text-red-900">No Schedule 8 / controlled medications.</strong>
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Requests for these will be declined: dexamphetamine, methylphenidate, lisdexamfetamine, oxycodone, morphine, fentanyl, buprenorphine, methadone, ketamine, alprazolam.
                </p>
              </div>
              <div className="space-y-2">
                {CONSULT_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => {
                      setConsultReason(reason.id)
                      setTimeout(goNext, 150)
                    }}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      consultReason === reason.id
                        ? "border-violet-500 bg-violet-50"
                        : "border-border/60 hover:border-border"
                    }`}
                  >
                    <span className="font-medium">{reason.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Details */}
          {step === "details" && (
            <div className="space-y-4 animate-step-enter">
              <StepHeader
                emoji="✍️"
                title="Tell us more"
                subtitle="Please provide details about your concern"
              />
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Describe your concern in detail
                  </label>
                  <Textarea
                    value={consultDetails}
                    onChange={(e) => setConsultDetails(e.target.value)}
                    placeholder="Please describe your symptoms, how long you&apos;ve had them, and any relevant medical history..."
                    className="min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum 10 characters ({consultDetails.length}/10)
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Current medications (optional)
                  </label>
                  <Textarea
                    value={currentMedications}
                    onChange={(e) => setCurrentMedications(e.target.value)}
                    placeholder="List any medications you&apos;re currently taking..."
                    className="min-h-20"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step: Safety */}
          {step === "safety" && (
            <div className="space-y-4 animate-step-enter">
              <StepHeader emoji="🛡️" title="Safety screening" subtitle="Please answer honestly" />
              <div className="space-y-3">
                {SAFETY_QUESTIONS.map((q) => (
                  <div key={q.id} className="p-4 rounded-xl border border-border/60 space-y-3">
                    <p className="text-sm font-medium">{q.question}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSafetyAnswers((prev) => ({ ...prev, [q.id]: true }))
                          if (q.knockout) {
                            setIsKnockedOut(true)
                          }
                        }}
                        className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                          safetyAnswers[q.id] === true
                            ? "border-red-500 bg-red-50 text-red-700"
                            : "border-border/60 hover:border-border"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setSafetyAnswers((prev) => ({ ...prev, [q.id]: false }))}
                        className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                          safetyAnswers[q.id] === false
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-border/60 hover:border-border"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Medicare */}
          {step === "medicare" && (
            <div className="space-y-4 animate-step-enter">
              <StepHeader emoji="💳" title="Medicare details" subtitle="For your records" />
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Medicare number</label>
                  <Input
                    value={medicareNumber}
                    onChange={(e) => setMedicareNumber(formatMedicare(e.target.value))}
                    placeholder="1234 56789 0"
                    className="h-12 text-lg tracking-wider"
                    maxLength={12}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">IRN (Reference number)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setIrn(n)}
                        className={`flex-1 h-12 rounded-xl border text-lg font-medium transition-all ${
                          irn === n
                            ? "border-violet-500 bg-violet-50 text-violet-700"
                            : "border-border/60 hover:border-border"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Date of birth</label>
                  <Input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="h-12"
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
                  <div className="w-16 h-16 mx-auto rounded-full bg-violet-100 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-violet-600" />
                  </div>
                  <h2 className="text-lg font-semibold">Check your email</h2>
                  <p className="text-sm text-muted-foreground">
                    We sent a confirmation link to {email}
                  </p>
                  <Button
                    variant="bordered"
                    onClick={() => {
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
                    title="Sign in to continue"
                    subtitle="Create an account or sign in to save your request"
                  />

                  <Button
                    variant="bordered"
                    className="w-full h-11"
                    onClick={handleGoogleAuth}
                  >
                    <GoogleIcon className="w-5 h-5 mr-2" />
                    Continue with Google
                  </Button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <Button
                    className="w-full h-11 bg-violet-600 hover:bg-violet-700"
                    onClick={handleGoogleAuth}
                  >
                    Sign in with email
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By continuing, you agree to our{" "}
                    <Link href="/terms" className="underline">Terms</Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="underline">Privacy Policy</Link>
                  </p>
                </>
              )}
            </div>
          )}

          {/* Step: Review */}
          {step === "review" && (
            <div className="space-y-4">
              <StepHeader title="Review your request" subtitle="Please confirm the details below" />
              <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-muted-foreground">Reason for consultation</p>
                    <p className="text-sm font-medium">
                      {CONSULT_REASONS.find((r) => r.id === consultReason)?.label}
                    </p>
                  </div>
                  <button onClick={() => goTo("reason")} className="p-1 hover:bg-muted rounded">
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
                <hr className="border-border/40" />
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-muted-foreground">Details</p>
                    <p className="text-sm font-medium line-clamp-2">{consultDetails}</p>
                  </div>
                  <button onClick={() => goTo("details")} className="p-1 hover:bg-muted rounded">
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step: Payment */}
          {step === "payment" && (
            <div className="space-y-4">
              <StepHeader title="Complete your booking" subtitle="Secure payment via Stripe" />
              {/* S8 Disclaimer - shown again before payment */}
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <p className="text-xs text-red-800 leading-relaxed font-medium">
                  <strong className="text-red-900">Reminder: No Schedule 8 / controlled medications.</strong>
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Requests for these will be declined: dexamphetamine, methylphenidate, lisdexamfetamine, oxycodone, morphine, fentanyl, buprenorphine, methadone, ketamine, alprazolam.
                </p>
              </div>
              <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total</span>
                  <span className="text-2xl font-bold">$49.95</span>
                </div>
                <hr className="border-border/40" />
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    Doctor review within 24 hours
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    Prescription or referral if appropriate
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    Follow-up messaging included
                  </li>
                </ul>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                If a prescription or referral isn&apos;t appropriate, you&apos;ll receive a full refund.
              </p>
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border/40 p-4">
        <div className="max-w-lg mx-auto">
          {step === "payment" ? (
            <Button
              className="w-full h-12 text-base bg-violet-600 hover:bg-violet-700"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Pay $49.95 & Submit"
              )}
            </Button>
          ) : step !== "signup" || !showEmailConfirm ? (
            <Button
              className="w-full h-12 text-base bg-violet-600 hover:bg-violet-700"
              disabled={!canContinue()}
              onClick={() => {
                if (step === "safety" && checkSafetyKnockout()) {
                  setIsKnockedOut(true)
                  return
                }
                goNext()
              }}
            >
              Continue
            </Button>
          ) : null}
        </div>
      </footer>
    </div>
  )
}
