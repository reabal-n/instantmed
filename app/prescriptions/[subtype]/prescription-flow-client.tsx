"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import confetti from "canvas-confetti"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowRight,
  ArrowLeft,
  Pill,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ClipboardList,
  CreditCard,
  User,
} from "lucide-react"
import { createRequestAndCheckoutAction } from "@/lib/stripe/checkout"
import { InlineAuthStep } from "@/components/shared/inline-auth-step"
import { InlineOnboardingStep } from "@/components/shared/inline-onboarding-step"

interface PrescriptionFlowClientProps {
  category: string
  subtype: string
  title: string
  description: string
  patientId: string | null
  isAuthenticated: boolean
  needsOnboarding: boolean
  userEmail?: string
  userName?: string
}

// Red flags - same for all subtypes
const redFlags = [
  {
    id: "chest_pain",
    label: "Chest pain",
    description: "New or worsening chest pain or pressure",
  },
  {
    id: "shortness_of_breath",
    label: "Shortness of breath",
    description: "Difficulty breathing at rest or with minimal activity",
  },
  {
    id: "severe_headache",
    label: "Severe headache or neurological symptoms",
    description: "Sudden severe headache, vision changes, weakness, or numbness",
  },
  {
    id: "pregnancy",
    label: "Pregnancy or possible pregnancy",
    description: "Currently pregnant or possibility of pregnancy",
  },
  {
    id: "suicidal_thoughts",
    label: "Suicidal thoughts or self-harm",
    description: "Recent thoughts of suicide or self-harm",
  },
]

// ============================================
// REPEAT PRESCRIPTION OPTIONS
// ============================================
const repeatReasonOptions = [
  { id: "antidepressant_anxiety", label: "Antidepressant / anxiety" },
  { id: "blood_pressure_heart", label: "Blood pressure / heart" },
  { id: "diabetes", label: "Diabetes" },
  { id: "asthma_inhaler", label: "Asthma / inhaler" },
  { id: "contraceptive_hormonal", label: "Contraceptive pill / hormonal" },
  { id: "other", label: "Other" },
]

const repeatDurationOptions = [
  { id: "less_3_months", label: "< 3 months" },
  { id: "3_to_12_months", label: "3–12 months" },
  { id: "more_1_year", label: "> 1 year" },
]

const repeatControlOptions = [
  { id: "well_controlled", label: "Well controlled" },
  { id: "partially_controlled", label: "Partially controlled" },
  { id: "poorly_controlled", label: "Poorly controlled" },
]

const repeatSideEffectsOptions = [
  { id: "no", label: "No" },
  { id: "mild_tolerable", label: "Mild but tolerable" },
  { id: "significant_worrying", label: "Significant / worrying" },
]

// ============================================
// CHRONIC MEDICATION REVIEW OPTIONS
// ============================================
const chronicRequestOptions = [
  { id: "repeat_existing", label: "Repeat of existing medication(s)" },
  { id: "dose_adjustment", label: "Dose adjustment review" },
  { id: "side_effects_review", label: "Side effects review" },
  { id: "adding_medication", label: "Adding an extra medication (same condition)" },
]

const chronicConditionOptions = [
  { id: "depression_anxiety", label: "Depression / anxiety" },
  { id: "adhd_neurodivergent", label: "ADHD / neurodivergent" },
  { id: "cardiovascular_bp", label: "Cardiovascular / blood pressure" },
  { id: "metabolic", label: "Metabolic (diabetes, cholesterol)" },
  { id: "chronic_pain", label: "Chronic pain" },
  { id: "other", label: "Other" },
]

const chronicReviewOptions = [
  { id: "within_3_months", label: "Within 3 months" },
  { id: "3_to_12_months", label: "3–12 months ago" },
  { id: "more_12_months", label: "> 12 months / can't remember" },
]

const chronicControlOptions = [
  { id: "well_controlled", label: "Well controlled" },
  { id: "up_and_down", label: "Up and down" },
  { id: "poorly_controlled", label: "Poorly controlled" },
]

// Pill button component
const PillButton = ({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
      selected
        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
        : "bg-white/60 text-foreground hover:bg-white/80 border border-white/40"
    }`}
  >
    {children}
  </button>
)

// Multi-select pill button
const MultiPillButton = ({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
      selected
        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
        : "bg-white/60 text-foreground hover:bg-white/80 border border-white/40"
    }`}
  >
    {children}
  </button>
)

export function PrescriptionFlowClient({
  category,
  subtype,
  title,
  description,
  patientId: initialPatientId,
  isAuthenticated: initialIsAuthenticated,
  needsOnboarding: initialNeedsOnboarding,
  userEmail,
  userName,
}: PrescriptionFlowClientProps) {
  const router = useRouter()

  const [patientId, setPatientId] = useState<string | null>(initialPatientId)
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated)
  const [needsOnboarding, setNeedsOnboarding] = useState(initialNeedsOnboarding)
  const [currentUserName, setCurrentUserName] = useState(userName || "")

  const [step, setStep] = useState<"intro" | "form" | "auth" | "onboarding">("intro")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // Common form state
  const [medicationName, setMedicationName] = useState("")
  const [additionalNotes, setAdditionalNotes] = useState("")
  const [redFlagValues, setRedFlagValues] = useState<Record<string, boolean>>(
    Object.fromEntries(redFlags.map((rf) => [rf.id, false])),
  )

  // Repeat prescription state
  const [repeatReason, setRepeatReason] = useState<string | null>(null)
  const [repeatDuration, setRepeatDuration] = useState<string | null>(null)
  const [repeatControl, setRepeatControl] = useState<string | null>(null)
  const [repeatSideEffects, setRepeatSideEffects] = useState<string | null>(null)

  // Chronic review state (multi-select for request type)
  const [chronicRequests, setChronicRequests] = useState<string[]>([])
  const [chronicCondition, setChronicCondition] = useState<string | null>(null)
  const [chronicReview, setChronicReview] = useState<string | null>(null)
  const [chronicControl, setChronicControl] = useState<string | null>(null)

  const hasRedFlags = Object.values(redFlagValues).some((v) => v)

  // Validation based on subtype
  const isFormValid = (() => {
    if (hasRedFlags) return false
    if (!medicationName.trim()) return false
    switch (subtype) {
      case "repeat":
        return repeatReason && repeatDuration && repeatControl && repeatSideEffects
      case "chronic":
        return chronicRequests.length > 0 && chronicCondition && chronicReview && chronicControl
      default:
        return false
    }
  })()

  const handleRedFlagChange = (id: string, value: boolean) => {
    setRedFlagValues((prev) => ({ ...prev, [id]: value }))
  }

  const toggleChronicRequest = (id: string) => {
    setChronicRequests((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
  }

  const buildAnswers = (): Record<string, unknown> => {
    const baseAnswers = {
      medication_name: medicationName,
      additional_notes: additionalNotes,
      red_flags: redFlagValues,
    }

    switch (subtype) {
      case "repeat":
        return {
          ...baseAnswers,
          reason: repeatReason,
          reason_label: repeatReasonOptions.find((r) => r.id === repeatReason)?.label,
          duration_on_medication: repeatDuration,
          duration_label: repeatDurationOptions.find((d) => d.id === repeatDuration)?.label,
          symptom_control: repeatControl,
          control_label: repeatControlOptions.find((c) => c.id === repeatControl)?.label,
          side_effects: repeatSideEffects,
          side_effects_label: repeatSideEffectsOptions.find((s) => s.id === repeatSideEffects)?.label,
        }
      case "chronic":
        return {
          ...baseAnswers,
          request_types: chronicRequests,
          request_types_labels: chronicRequests.map((r) => chronicRequestOptions.find((o) => o.id === r)?.label),
          primary_condition: chronicCondition,
          condition_label: chronicConditionOptions.find((c) => c.id === chronicCondition)?.label,
          recent_review: chronicReview,
          review_label: chronicReviewOptions.find((r) => r.id === chronicReview)?.label,
          current_control: chronicControl,
          control_label: chronicControlOptions.find((c) => c.id === chronicControl)?.label,
        }
      default:
        return baseAnswers
    }
  }

  const handleFormComplete = () => {
    if (!isAuthenticated) {
      setStep("auth")
    } else if (needsOnboarding) {
      setStep("onboarding")
    } else {
      handleSubmit()
    }
  }

  const handleAuthComplete = (userId: string, profileId: string) => {
    setPatientId(profileId)
    setIsAuthenticated(true)
    setNeedsOnboarding(true)
    setStep("onboarding")
  }

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false)
    handleSubmit()
  }

  const handleSubmit = async () => {
    if (!isFormValid || hasSubmitted) return

    if (!patientId) {
      setError("Authentication required")
      setStep("auth")
      return
    }

    // Trigger confetti on submission
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#00E2B5", "#06B6D4", "#8B5CF6", "#F59E0B", "#10B981"],
    })

    setIsSubmitting(true)
    setHasSubmitted(true) // Prevent double-click
    setError(null)

    try {
      const answers = buildAnswers()
      const result = await createRequestAndCheckoutAction({
        category: "prescription",
        subtype,
        type: "script",
        answers,
      })

      if (result.success && result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      } else {
        setError(result.error || "Failed to create checkout session. Please try again.")
        setIsSubmitting(false)
        setHasSubmitted(false) // Allow retry on error
      }
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setIsSubmitting(false)
      setHasSubmitted(false) // Allow retry on error
    }
  }

  // Get icon based on subtype
  const getIcon = () => {
    switch (subtype) {
      case "repeat":
        return <RefreshCw className="h-5 w-5 text-primary-foreground" />
      case "chronic":
        return <ClipboardList className="h-5 w-5 text-primary-foreground" />
      default:
        return <Pill className="h-5 w-5 text-primary-foreground" />
    }
  }

  const getFormTitle = () => {
    switch (subtype) {
      case "repeat":
        return "Repeat Prescription Details"
      case "chronic":
        return "Medication Review Details"
      default:
        return "Prescription Details"
    }
  }

  const getIntroText = () => {
    switch (subtype) {
      case "repeat":
        return "Quick repeat for stable, existing medications. New or high-risk meds may need a full consult."
      case "chronic":
        return "For chronic or ongoing medications where you may need more context, dose adjustments, or side effect review."
      default:
        return "Tell us about your prescription needs."
    }
  }

  // Intro step - unchanged
  if (step === "intro") {
    return (
      <div className="space-y-8">
        <div
          className="text-center animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm text-primary mb-4">
            <Pill className="h-4 w-4" />
            Prescription
          </div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
          <p className="mt-2 text-muted-foreground">{getIntroText()}</p>
        </div>

        <div
          className="glass-card rounded-2xl p-6 sm:p-8 animate-scale-in opacity-0"
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">What happens next?</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                1
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Tell us about your medication</p>
                <p className="text-sm text-muted-foreground">
                  Provide details about the medication you need, including name and strength.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                2
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">A GP reviews your request</p>
                <p className="text-sm text-muted-foreground">
                  An Australian-registered GP will verify your prescription history.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                3
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Receive your e-script</p>
                <p className="text-sm text-muted-foreground">
                  Your e-script will be sent to your phone via SMS, usually within 1 hour (8am-10pm AEST).
                </p>
              </div>
            </div>

            {/* Removed step 4 about payment as it's handled after auth/onboarding */}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => setStep("form")} className="flex-1 rounded-xl btn-glow">
              Continue to questionnaire
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" asChild className="flex-1 rounded-xl bg-white/50 hover:bg-white/80">
              <Link href="/prescriptions">Back to options</Link>
            </Button>
          </div>
        </div>

        {/* Trust indicators */}
        <div
          className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>E-script to your phone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>Any pharmacy Australia-wide</span>
          </div>
        </div>
      </div>
    )
  }

  if (step === "auth") {
    return (
      <div className="space-y-6">
        <div
          className="text-center animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm text-primary mb-4">
            <User className="h-4 w-4" />
            Step 2 of 3
          </div>
        </div>

        <div
          className="glass-card rounded-2xl p-6 sm:p-8 animate-scale-in opacity-0"
          style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
        >
          <InlineAuthStep
            serviceName="prescription"
            onBack={() => setStep("form")}
            onAuthComplete={handleAuthComplete}
          />
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
          <span>Your answers are saved and will not be lost</span>
        </div>
      </div>
    )
  }

  if (step === "onboarding") {
    return (
      <div className="space-y-6">
        <div
          className="text-center animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm text-primary mb-4">
            <CreditCard className="h-4 w-4" />
            Step 3 of 3
          </div>
        </div>

        <div
          className="glass-card rounded-2xl p-6 sm:p-8 animate-scale-in opacity-0"
          style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
        >
          <InlineOnboardingStep
            profileId={patientId!}
            userName={currentUserName}
            onBack={() => setStep("auth")}
            onComplete={handleOnboardingComplete}
          />
        </div>
      </div>
    )
  }

  // Form step
  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="flex items-center gap-4 animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl hover:bg-white/60"
          onClick={() => setStep("intro")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Quick, async assessment</p>
        </div>
      </div>

      {/* Red Flags Warning Banner */}
      {hasRedFlags && (
        <div
          className="rounded-2xl border-2 border-red-300 bg-red-50/80 backdrop-blur-sm p-5 animate-fade-in-up"
          style={{ animationFillMode: "forwards" }}
        >
          <div className="flex gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-red-800">Immediate attention required</h3>
              <p className="mt-1 text-sm text-red-700 leading-relaxed">
                Based on your responses, we strongly recommend seeking immediate in-person medical care. Please visit
                your nearest emergency department or call emergency services.
              </p>
              <p className="mt-2 text-sm text-red-700 font-medium">
                This online service is not suitable for urgent medical concerns.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 animate-fade-in-up">
          {error}
        </div>
      )}

      {/* Main Form */}
      <div
        className="glass-card rounded-2xl p-6 space-y-6 animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
            {getIcon()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{getFormTitle()}</h2>
            <p className="text-sm text-muted-foreground">Select the options that apply to you</p>
          </div>
        </div>

        {/* Medication name - common for all subtypes */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Medication name and strength <span className="text-red-500">*</span>
          </Label>
          <Input
            value={medicationName}
            onChange={(e) => setMedicationName(e.target.value)}
            placeholder="e.g., Lexapro 10mg, Metformin 500mg"
            className="h-11 rounded-xl bg-white/50 border-white/40 focus:border-primary/50"
          />
        </div>

        {/* REPEAT PRESCRIPTION FORM */}
        {subtype === "repeat" && (
          <>
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                What is this repeat for? <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {repeatReasonOptions.map((option) => (
                  <PillButton
                    key={option.id}
                    selected={repeatReason === option.id}
                    onClick={() => setRepeatReason(option.id)}
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                How long have you been on this medication? <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {repeatDurationOptions.map((option) => (
                  <PillButton
                    key={option.id}
                    selected={repeatDuration === option.id}
                    onClick={() => setRepeatDuration(option.id)}
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                How are your symptoms on this current medication? <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {repeatControlOptions.map((option) => (
                  <PillButton
                    key={option.id}
                    selected={repeatControl === option.id}
                    onClick={() => setRepeatControl(option.id)}
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Any recent changes or side effects? <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {repeatSideEffectsOptions.map((option) => (
                  <PillButton
                    key={option.id}
                    selected={repeatSideEffects === option.id}
                    onClick={() => setRepeatSideEffects(option.id)}
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>
            </div>
          </>
        )}

        {/* CHRONIC MEDICATION REVIEW FORM */}
        {subtype === "chronic" && (
          <>
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                What do you need? (select all that apply) <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {chronicRequestOptions.map((option) => (
                  <MultiPillButton
                    key={option.id}
                    selected={chronicRequests.includes(option.id)}
                    onClick={() => toggleChronicRequest(option.id)}
                  >
                    {option.label}
                  </MultiPillButton>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Primary condition being treated <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {chronicConditionOptions.map((option) => (
                  <PillButton
                    key={option.id}
                    selected={chronicCondition === option.id}
                    onClick={() => setChronicCondition(option.id)}
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                When was your last medication review? <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {chronicReviewOptions.map((option) => (
                  <PillButton
                    key={option.id}
                    selected={chronicReview === option.id}
                    onClick={() => setChronicReview(option.id)}
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Current symptom control <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {chronicControlOptions.map((option) => (
                  <PillButton
                    key={option.id}
                    selected={chronicControl === option.id}
                    onClick={() => setChronicControl(option.id)}
                  >
                    {option.label}
                  </PillButton>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Additional notes */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Additional notes (optional)</Label>
          <Textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Any other relevant information for the doctor..."
            className="rounded-xl bg-white/50 border-white/40 focus:border-primary/40 min-h-[80px] resize-none"
          />
        </div>
      </div>

      {/* Safety screening */}
      <div
        className="glass-card rounded-2xl p-6 border-amber-200/50 bg-amber-50/30 animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-foreground">Safety screening</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Please answer honestly - this helps us ensure your safety.</p>

        <div className="space-y-3">
          {redFlags.map((rf) => (
            <div
              key={rf.id}
              className="flex items-center justify-between py-2 border-b border-white/20 last:border-b-0"
            >
              <span className="text-sm text-foreground pr-4">{rf.label}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleRedFlagChange(rf.id, false)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    redFlagValues[rf.id] === false
                      ? "bg-emerald-500 text-white shadow-md"
                      : "bg-white/60 text-muted-foreground hover:bg-white/80"
                  }`}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => handleRedFlagChange(rf.id, true)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    redFlagValues[rf.id] === true
                      ? "bg-red-500 text-white shadow-md"
                      : "bg-white/60 text-muted-foreground hover:bg-white/80"
                  }`}
                >
                  Yes
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit buttons - Updated to call handleFormComplete */}
      <div
        className="flex flex-col sm:flex-row gap-3 animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.25s", animationFillMode: "forwards" }}
      >
        <Button
          variant="outline"
          onClick={() => setStep("intro")}
          className="rounded-xl border-white/40 bg-white/50 hover:bg-white/70"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleFormComplete}
          disabled={!isFormValid || isSubmitting || hasSubmitted}
          className="w-full rounded-xl btn-glow py-6 text-base"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : !isAuthenticated ? (
            <>
              Continue to sign up
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          ) : needsOnboarding ? (
            <>
              Continue to details
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay & Submit - $24.95
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
