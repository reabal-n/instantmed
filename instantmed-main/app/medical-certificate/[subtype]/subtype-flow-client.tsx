"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  FileText,
  AlertTriangle,
  CreditCard,
  Loader2,
  Calendar,
  Clock,
  User,
} from "lucide-react"
import { createRequestAndCheckoutAction } from "@/lib/stripe/checkout"
import { InlineAuthStep } from "@/components/shared/inline-auth-step"
import { InlineOnboardingStep } from "@/components/shared/inline-onboarding-step"

interface SubtypeFlowClientProps {
  category: "medical_certificate"
  subtype: string
  title: string
  description: string
  patientId: string | null
  isAuthenticated: boolean
  needsOnboarding: boolean
  userEmail?: string
  userName?: string
}

const PERIODS = [
  { value: "1", label: "1 day" },
  { value: "2", label: "2 days" },
  { value: "3", label: "3 days" },
  { value: "4-7", label: "4-7 days" },
  { value: "1-2weeks", label: "1-2 weeks" },
]

const SYMPTOMS = [
  "Headache",
  "Fever",
  "Nausea / Vomiting",
  "Fatigue",
  "Body aches",
  "Cough / Cold",
  "Stomach pain",
  "Other",
]

export function SubtypeFlowClient({
  category,
  subtype,
  title,
  description,
  patientId: initialPatientId,
  isAuthenticated: initialIsAuthenticated,
  needsOnboarding: initialNeedsOnboarding,
  userEmail,
  userName,
}: SubtypeFlowClientProps) {
  const router = useRouter()

  const [patientId, setPatientId] = useState<string | null>(initialPatientId)
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated)
  const [needsOnboarding, setNeedsOnboarding] = useState(initialNeedsOnboarding)
  const [currentUserName, setCurrentUserName] = useState(userName || "")

  const [step, setStep] = useState<"intro" | "form" | "auth" | "onboarding">("intro")

  // Form state
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [period, setPeriod] = useState<string | null>(null)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [otherSymptom, setOtherSymptom] = useState("")
  const [additionalNotes, setAdditionalNotes] = useState("")

  // Safety screening
  const [hasChestPain, setHasChestPain] = useState<boolean | null>(null)
  const [hasSevereSymptoms, setHasSevereSymptoms] = useState<boolean | null>(null)
  const [hasEmergency, setHasEmergency] = useState<boolean | null>(null)

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) => (prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]))
  }

  const isRedFlag = hasChestPain === true || hasSevereSymptoms === true || hasEmergency === true

  const isFormValid =
    dateFrom &&
    dateTo &&
    period &&
    selectedSymptoms.length > 0 &&
    hasChestPain !== null &&
    hasSevereSymptoms !== null &&
    hasEmergency !== null &&
    !isRedFlag

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
    // New users always need onboarding
    setNeedsOnboarding(true)
    setStep("onboarding")
  }

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false)
    handleSubmit()
  }

  const handleSubmit = async () => {
    if (!patientId) {
      setError("Authentication required")
      setStep("auth")
      return
    }

    setIsSubmitting(true)
    setHasSubmitted(true)
    setError(null)

    const answers = {
      date_from: dateFrom,
      date_to: dateTo,
      period,
      symptoms: selectedSymptoms,
      other_symptom: otherSymptom || null,
      additional_notes: additionalNotes || null,
      safety_chest_pain: hasChestPain,
      safety_severe_symptoms: hasSevereSymptoms,
      safety_emergency: hasEmergency,
    }

    const result = await createRequestAndCheckoutAction({
      category,
      subtype,
      type: `${category}_${subtype}`,
      answers,
    })

    if (result.success && result.checkoutUrl) {
      window.location.href = result.checkoutUrl
    } else {
      setError(result.error || "Failed to create request")
      setIsSubmitting(false)
      setHasSubmitted(false)
    }
  }

  // Intro step
  if (step === "intro") {
    return (
      <div className="space-y-8">
        <div
          className="text-center animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm text-primary mb-4">
            <FileText className="h-4 w-4" />
            Medical Certificate
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
                <p className="text-sm font-medium text-foreground">Complete a short questionnaire</p>
                <p className="text-sm text-muted-foreground">
                  Tell us about your situation and why you need this certificate.
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
                <p className="text-sm font-medium text-foreground">Receive your certificate</p>
                <p className="text-sm text-muted-foreground">
                  Your certificate will be available in your dashboard, usually within 1 hour (8am-10pm AEST).
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => setStep("form")} className="flex-1 rounded-xl btn-glow">
              Continue to questionnaire
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" asChild className="flex-1 rounded-xl bg-white/50 hover:bg-white/80">
              <Link href="/medical-certificate">Back to options</Link>
            </Button>
          </div>
        </div>

        <div
          className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>AHPRA-registered GPs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>Same-day response</span>
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
            serviceName="medical certificate"
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
      <div
        className="text-center animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm text-primary mb-4">
          <FileText className="h-4 w-4" />
          {title}
        </div>
        <p className="text-sm text-muted-foreground">Fill out the details below. This takes about 2 minutes.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 animate-fade-in-up">
          {error}
        </div>
      )}

      {/* Date Range */}
      <div
        className="glass-card rounded-2xl p-6 animate-scale-in opacity-0"
        style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Certificate dates</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">From date</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-11 rounded-xl bg-white/50 border-white/40 focus:border-primary/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">To date</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-11 rounded-xl bg-white/50 border-white/40 focus:border-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Period */}
      <div
        className="glass-card rounded-2xl p-6 animate-scale-in opacity-0"
        style={{ animationDelay: "0.18s", animationFillMode: "forwards" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">How long do you need off?</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                period === p.value
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "bg-white/50 text-foreground hover:bg-white/80 border border-white/40"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Symptoms */}
      <div
        className="glass-card rounded-2xl p-6 animate-scale-in opacity-0"
        style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
      >
        <h3 className="font-semibold text-foreground mb-4">What symptoms are you experiencing?</h3>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map((symptom) => (
            <button
              key={symptom}
              type="button"
              onClick={() => toggleSymptom(symptom)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                selectedSymptoms.includes(symptom)
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "bg-white/50 text-foreground hover:bg-white/80 border border-white/40"
              }`}
            >
              {symptom}
            </button>
          ))}
        </div>
        {selectedSymptoms.includes("Other") && (
          <div className="mt-4">
            <Input
              placeholder="Please describe your symptoms..."
              value={otherSymptom}
              onChange={(e) => setOtherSymptom(e.target.value)}
              className="h-11 rounded-xl bg-white/50 border-white/40"
            />
          </div>
        )}
      </div>

      {/* Additional Notes */}
      <div
        className="glass-card rounded-2xl p-6 animate-scale-in opacity-0"
        style={{ animationDelay: "0.22s", animationFillMode: "forwards" }}
      >
        <h3 className="font-semibold text-foreground mb-4">Additional notes (optional)</h3>
        <Textarea
          placeholder="Any other information the doctor should know..."
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          className="min-h-[100px] rounded-xl bg-white/50 border-white/40 resize-none"
        />
      </div>

      {/* Safety Screening */}
      <div
        className="glass-card rounded-2xl p-6 border-amber-200/50 bg-amber-50/30 animate-scale-in opacity-0"
        style={{ animationDelay: "0.24s", animationFillMode: "forwards" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-foreground">Safety screening</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Please answer honestly - this helps us ensure your safety.</p>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">
              Do you have chest pain, difficulty breathing, or severe dizziness?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHasChestPain(false)}
                className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                  hasChestPain === false
                    ? "bg-emerald-500 text-white shadow-md"
                    : "bg-white/50 text-foreground hover:bg-white/80 border border-white/40"
                }`}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setHasChestPain(true)}
                className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                  hasChestPain === true
                    ? "bg-red-500 text-white shadow-md"
                    : "bg-white/50 text-foreground hover:bg-white/80 border border-white/40"
                }`}
              >
                Yes
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">
              Have you had severe vomiting, blood in stool/urine, or loss of consciousness?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHasSevereSymptoms(false)}
                className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                  hasSevereSymptoms === false
                    ? "bg-emerald-500 text-white shadow-md"
                    : "bg-white/50 text-foreground hover:bg-white/80 border border-white/40"
                }`}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setHasSevereSymptoms(true)}
                className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                  hasSevereSymptoms === true
                    ? "bg-red-500 text-white shadow-md"
                    : "bg-white/50 text-foreground hover:bg-white/80 border border-white/40"
                }`}
              >
                Yes
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Do you feel this is a medical emergency?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHasEmergency(false)}
                className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                  hasEmergency === false
                    ? "bg-emerald-500 text-white shadow-md"
                    : "bg-white/50 text-foreground hover:bg-white/80 border border-white/40"
                }`}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => setHasEmergency(true)}
                className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                  hasEmergency === true
                    ? "bg-red-500 text-white shadow-md"
                    : "bg-white/50 text-foreground hover:bg-white/80 border border-white/40"
                }`}
              >
                Yes
              </button>
            </div>
          </div>
        </div>

        {isRedFlag && (
          <div className="mt-4 p-4 rounded-xl bg-red-100 border border-red-300">
            <p className="text-sm font-medium text-red-800">
              Based on your answers, please seek immediate medical attention. Call 000 for emergencies or visit your
              nearest emergency department.
            </p>
          </div>
        )}
      </div>

      {/* Submit buttons */}
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
              Pay & Submit - $19.95
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
