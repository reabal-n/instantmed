"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import confetti from "canvas-confetti"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  ArrowRight,
  ArrowLeft,
  Stethoscope,
  CheckCircle,
  AlertTriangle,
  Loader2,
  FileSearch,
  CreditCard,
  User,
} from "lucide-react"
import { createRequestAndCheckoutAction } from "@/lib/stripe/checkout"
import { InlineAuthStep } from "@/components/shared/inline-auth-step"
import { InlineOnboardingStep } from "@/components/shared/inline-onboarding-step"
import { MinimalToggle } from "@/components/ui/toggle"

function Pill({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
        selected
          ? "bg-primary text-primary-foreground shadow-md"
          : "bg-white/60 text-foreground hover:bg-white/80 border border-white/40"
      }`}
    >
      {children}
    </button>
  )
}

function MultiPill({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
        selected
          ? "bg-primary text-primary-foreground shadow-md"
          : "bg-white/60 text-foreground hover:bg-white/80 border border-white/40"
      }`}
    >
      {children}
    </button>
  )
}

function RedFlagToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/40 hover:bg-white/60 transition-colors">
      <MinimalToggle
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm text-foreground cursor-pointer" onClick={() => onChange(!checked)}>{label}</span>
    </div>
  )
}

const specialistTypes = [
  { value: "dermatologist", label: "Dermatologist" },
  { value: "cardiologist", label: "Cardiologist" },
  { value: "gastroenterologist", label: "Gastroenterologist" },
  { value: "neurologist", label: "Neurologist" },
  { value: "orthopedic", label: "Orthopedic Surgeon" },
  { value: "psychiatrist", label: "Psychiatrist" },
  { value: "endocrinologist", label: "Endocrinologist" },
  { value: "rheumatologist", label: "Rheumatologist" },
  { value: "pulmonologist", label: "Pulmonologist" },
  { value: "urologist", label: "Urologist" },
  { value: "other", label: "Other" },
]

const diagnosisOptions = [
  "Suspected condition requiring specialist assessment",
  "Ongoing management of chronic condition",
  "Second opinion requested",
  "Diagnostic workup required",
  "Follow-up from previous treatment",
  "Other",
]

const durationOptions = ["Less than 1 week", "1-4 weeks", "1-3 months", "3-6 months", "More than 6 months"]

const impactOptions = [
  "Minimal - can manage daily activities",
  "Moderate - some limitations",
  "Significant - major impact on daily life",
  "Severe - unable to perform normal activities",
]

const testTypeOptions = [
  { value: "blood", label: "Blood Tests" },
  { value: "imaging", label: "Imaging (X-ray, CT, MRI, Ultrasound)" },
]

const recommendationOptions = [
  "Routine screening",
  "Diagnostic investigation",
  "Monitoring of known condition",
  "Pre-operative assessment",
  "Post-treatment follow-up",
]

const symptomDurationOptions = [
  "New symptom (< 1 week)",
  "Recent (1-4 weeks)",
  "Ongoing (1-3 months)",
  "Chronic (> 3 months)",
]

const severityOptions = ["Mild", "Moderate", "Severe"]

interface ReferralFlowClientProps {
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

export function ReferralFlowClient({
  category,
  subtype,
  title,
  description,
  patientId: initialPatientId,
  isAuthenticated: initialIsAuthenticated,
  needsOnboarding: initialNeedsOnboarding,
  userEmail,
  userName,
}: ReferralFlowClientProps) {
  const router = useRouter()

  const [patientId, setPatientId] = useState<string | null>(initialPatientId)
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated)
  const [needsOnboarding, setNeedsOnboarding] = useState(initialNeedsOnboarding)
  const [currentUserName, setCurrentUserName] = useState(userName || "")

  const [step, setStep] = useState<"intro" | "form" | "auth" | "onboarding">("intro")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // Specialist form state
  const [specialistType, setSpecialistType] = useState("")
  const [diagnosisStatus, setDiagnosisStatus] = useState("")
  const [duration, setDuration] = useState("")
  const [impact, setImpact] = useState("")
  const [reason, setReason] = useState("")
  const [existingSpecialist, setExistingSpecialist] = useState("")

  // Pathology/imaging form state
  const [testTypes, setTestTypes] = useState<string[]>([])
  const [recommendation, setRecommendation] = useState("")
  const [symptomDuration, setSymptomDuration] = useState("")
  const [severity, setSeverity] = useState("")
  const [symptoms, setSymptoms] = useState("")
  const [previousTests, setPreviousTests] = useState("")

  // Red flags state
  const [redFlags, setRedFlags] = useState({
    chest_pain: false,
    shortness_of_breath: false,
    severe_headache: false,
    pregnancy: false,
    suicidal_thoughts: false,
  })

  const hasRedFlags = Object.values(redFlags).some((v) => v)

  const isSpecialist = subtype === "specialist"
  const isPathology = subtype === "pathology-imaging"

  const toggleTestType = (value: string) => {
    setTestTypes((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]))
  }

  // Form validation
  const isFormValid = isSpecialist
    ? specialistType && diagnosisStatus && duration && impact && reason.trim().length > 0
    : testTypes.length > 0 && recommendation && symptomDuration && severity && symptoms.trim().length > 0

  const handleFormComplete = () => {
    if (hasRedFlags) return

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
    if (!isFormValid || hasRedFlags || hasSubmitted) return

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

    setError(null)
    setIsSubmitting(true)
    setHasSubmitted(true)

    const answers = isSpecialist
      ? {
          specialist_type: specialistType,
          specialist_type_label: specialistTypes.find((s) => s.value === specialistType)?.label || specialistType,
          diagnosis_status: diagnosisStatus,
          duration,
          impact,
          reason_for_referral: reason,
          existing_specialist: existingSpecialist || null,
          red_flags: redFlags,
        }
      : {
          test_types: testTypes,
          test_types_labels: testTypes.map((t) => testTypeOptions.find((o) => o.value === t)?.label || t),
          recommendation,
          symptom_duration: symptomDuration,
          severity,
          symptoms_concern: symptoms,
          previous_tests: previousTests || null,
          red_flags: redFlags,
        }

    try {
      const result = await createRequestAndCheckoutAction({
        category: "referral",
        subtype,
        type: "referral",
        answers,
      })

      if (result.success && result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      } else {
        setError(result.error || "Failed to create checkout session. Please try again.")
        setIsSubmitting(false)
        setHasSubmitted(false)
      }
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setIsSubmitting(false)
      setHasSubmitted(false)
    }
  }

  // Intro screen - unchanged except for timing text
  if (step === "intro") {
    return (
      <div className="space-y-8">
        <div
          className="text-center animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm text-primary mb-4">
            {isSpecialist ? <Stethoscope className="h-4 w-4" /> : <FileSearch className="h-4 w-4" />}
            Referral
          </div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
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
                <p className="text-sm font-medium text-foreground">Answer a few quick questions</p>
                <p className="text-sm text-muted-foreground">
                  {isSpecialist
                    ? "Tell us which specialist you need and why."
                    : "Tell us what tests you need and your symptoms."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                2
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">A GP reviews your request</p>
                <p className="text-sm text-muted-foreground">An Australian-registered GP will assess your case.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                3
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isSpecialist ? "Receive your referral" : "Receive your request form"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isSpecialist
                    ? "Your referral will be available usually within 1 hour (8am-10pm AEST)."
                    : "Your pathology/imaging request will be available usually within 1 hour (8am-10pm AEST)."}
                </p>
              </div>
            </div>
          </div>

          {isPathology && (
            <div className="mt-6 p-4 rounded-xl bg-amber-50/50 border border-amber-200/50">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Not all requests can be approved without appropriate clinical indication. Our GP
                will assess whether the requested tests are medically appropriate.
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => setStep("form")} className="flex-1 rounded-xl btn-glow">
              Continue to questionnaire
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" asChild className="flex-1 rounded-xl bg-white/50 hover:bg-white/80">
              <Link href="/referrals">Back to options</Link>
            </Button>
          </div>
        </div>

        <div
          className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>Valid for Medicare rebates</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>Digital delivery</span>
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
            serviceName={isSpecialist ? "specialist referral" : "pathology request"}
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

  // Form screen - Specialist
  if (isSpecialist) {
    return (
      <div className="space-y-6">
        <div
          className="flex items-center gap-3 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setStep("intro")}
            className="h-10 w-10 rounded-xl hover:bg-white/60"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Specialist Referral</h1>
            <p className="text-sm text-muted-foreground">Answer a few questions to help the GP</p>
          </div>
        </div>

        {error && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

        <div
          className="glass-card rounded-2xl p-6 space-y-6 animate-scale-in opacity-0"
          style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
        >
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Which type of specialist do you think you need?
            </Label>
            <div className="flex flex-wrap gap-2">
              {specialistTypes.map((opt) => (
                <Pill
                  key={opt.value}
                  selected={specialistType === opt.value}
                  onClick={() => setSpecialistType(opt.value)}
                >
                  {opt.label}
                </Pill>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Reason for referral</Label>
            <div className="flex flex-wrap gap-2">
              {diagnosisOptions.map((opt, index) => (
                <Pill key={index} selected={diagnosisStatus === opt} onClick={() => setDiagnosisStatus(opt)}>
                  {opt}
                </Pill>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">How long has this issue been going on?</Label>
            <div className="flex flex-wrap gap-2">
              {durationOptions.map((opt, index) => (
                <Pill key={index} selected={duration === opt} onClick={() => setDuration(opt)}>
                  {opt}
                </Pill>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Impact on daily life</Label>
            <div className="flex flex-wrap gap-2">
              {impactOptions.map((opt, index) => (
                <Pill key={index} selected={impact === opt} onClick={() => setImpact(opt)}>
                  {opt}
                </Pill>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Main reason for referral (1-2 sentences)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe why you need this referral..."
              className="rounded-xl bg-white/50 border-white/40 focus:border-primary/40 min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Existing specialist or clinic (optional)</Label>
            <Textarea
              value={existingSpecialist}
              onChange={(e) => setExistingSpecialist(e.target.value)}
              placeholder="If you have a specific specialist in mind..."
              className="rounded-xl bg-white/50 border-white/40 focus:border-primary/40 min-h-[60px] resize-none"
            />
          </div>
        </div>

        {/* Safety screening */}
        <div
          className="glass-card rounded-2xl p-6 border-amber-200/50 bg-amber-50/30 animate-scale-in opacity-0"
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
        >
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Safety Screening
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Please answer honestly. These help us identify if you need urgent care.
          </p>

          <div className="space-y-1">
            <RedFlagToggle
              label="Are you experiencing chest pain or pressure?"
              checked={redFlags.chest_pain}
              onChange={(val) => setRedFlags((prev) => ({ ...prev, chest_pain: val }))}
            />
            <RedFlagToggle
              label="Are you having difficulty breathing?"
              checked={redFlags.shortness_of_breath}
              onChange={(val) => setRedFlags((prev) => ({ ...prev, shortness_of_breath: val }))}
            />
            <RedFlagToggle
              label="Do you have a sudden severe headache or neurological symptoms?"
              checked={redFlags.severe_headache}
              onChange={(val) => setRedFlags((prev) => ({ ...prev, severe_headache: val }))}
            />
            <RedFlagToggle
              label="Are you pregnant or possibly pregnant?"
              checked={redFlags.pregnancy}
              onChange={(val) => setRedFlags((prev) => ({ ...prev, pregnancy: val }))}
            />
            <RedFlagToggle
              label="Are you having thoughts of suicide or self-harm?"
              checked={redFlags.suicidal_thoughts}
              onChange={(val) => setRedFlags((prev) => ({ ...prev, suicidal_thoughts: val }))}
            />
          </div>

          {hasRedFlags && (
            <div className="mt-4 p-4 rounded-xl bg-red-100 border border-red-300">
              <p className="text-sm font-medium text-red-800">
                Based on your answers, please seek immediate medical attention. Call 000 for emergencies or visit your
                nearest emergency department.
              </p>
            </div>
          )}
        </div>

        {/* Submit - Updated to call handleFormComplete */}
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
            disabled={!isFormValid || hasRedFlags || isSubmitting || hasSubmitted}
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
                Pay & Submit - $29.95
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Form screen - Pathology/Imaging
  return (
    <div className="space-y-6">
      <div
        className="flex items-center gap-3 animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setStep("intro")}
          className="h-10 w-10 rounded-xl hover:bg-white/60"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Pathology / Imaging Request</h1>
          <p className="text-sm text-muted-foreground">Tell us what tests you need</p>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      <div
        className="glass-card rounded-2xl p-6 space-y-6 animate-scale-in opacity-0"
        style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
      >
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">What type of test(s) do you need?</Label>
          <div className="flex flex-wrap gap-2">
            {testTypeOptions.map((opt) => (
              <MultiPill
                key={opt.value}
                selected={testTypes.includes(opt.value)}
                onClick={() => toggleTestType(opt.value)}
              >
                {opt.label}
              </MultiPill>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Reason for requesting tests</Label>
          <div className="flex flex-wrap gap-2">
            {recommendationOptions.map((opt, index) => (
              <Pill key={index} selected={recommendation === opt} onClick={() => setRecommendation(opt)}>
                {opt}
              </Pill>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">How long have you had symptoms?</Label>
          <div className="flex flex-wrap gap-2">
            {symptomDurationOptions.map((opt, index) => (
              <Pill key={index} selected={symptomDuration === opt} onClick={() => setSymptomDuration(opt)}>
                {opt}
              </Pill>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Symptom severity</Label>
          <div className="flex flex-wrap gap-2">
            {severityOptions.map((opt, index) => (
              <Pill key={index} selected={severity === opt} onClick={() => setSeverity(opt)}>
                {opt}
              </Pill>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Describe your symptoms or concerns</Label>
          <Textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="What symptoms are you experiencing? Why do you think you need this test?"
            className="rounded-xl bg-white/50 border-white/40 focus:border-primary/40 min-h-[80px] resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Previous relevant tests (optional)</Label>
          <Textarea
            value={previousTests}
            onChange={(e) => setPreviousTests(e.target.value)}
            placeholder="Any previous tests related to this issue..."
            className="rounded-xl bg-white/50 border-white/40 focus:border-primary/40 min-h-[60px] resize-none"
          />
        </div>
      </div>

      {/* Safety screening */}
      <div
        className="glass-card rounded-2xl p-6 border-amber-200/50 bg-amber-50/30 animate-scale-in opacity-0"
        style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
      >
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Safety Screening
        </h3>

        <div className="space-y-1">
          <RedFlagToggle
            label="Are you experiencing chest pain or pressure?"
            checked={redFlags.chest_pain}
            onChange={(val) => setRedFlags((prev) => ({ ...prev, chest_pain: val }))}
          />
          <RedFlagToggle
            label="Are you having difficulty breathing?"
            checked={redFlags.shortness_of_breath}
            onChange={(val) => setRedFlags((prev) => ({ ...prev, shortness_of_breath: val }))}
          />
          <RedFlagToggle
            label="Do you have a sudden severe headache or neurological symptoms?"
            checked={redFlags.severe_headache}
            onChange={(val) => setRedFlags((prev) => ({ ...prev, severe_headache: val }))}
          />
          <RedFlagToggle
            label="Are you pregnant or possibly pregnant?"
            checked={redFlags.pregnancy}
            onChange={(val) => setRedFlags((prev) => ({ ...prev, pregnancy: val }))}
          />
          <RedFlagToggle
            label="Are you having thoughts of suicide or self-harm?"
            checked={redFlags.suicidal_thoughts}
            onChange={(val) => setRedFlags((prev) => ({ ...prev, suicidal_thoughts: val }))}
          />
        </div>

        {hasRedFlags && (
          <div className="mt-4 p-4 rounded-xl bg-red-100 border border-red-300">
            <p className="text-sm font-medium text-red-800">
              Based on your answers, please seek immediate medical attention. Call 000 for emergencies or visit your
              nearest emergency department.
            </p>
          </div>
        )}
      </div>

      {/* Submit - Updated to call handleFormComplete */}
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
          disabled={!isFormValid || hasRedFlags || isSubmitting || hasSubmitted}
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
              Pay & Submit - $29.95
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
