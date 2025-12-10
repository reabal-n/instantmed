"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  HelpCircle,
  Check,
  Pencil,
  Droplet,
  ScanLine,
} from "lucide-react"
import { createRequestAndCheckoutAction } from "@/lib/stripe/checkout"
import { createClient } from "@/lib/supabase/client"
import { createOrGetProfile } from "@/app/actions/create-profile"
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { REFERRAL_COPY } from "@/lib/microcopy/referral"

type FlowStep = "type" | "test" | "region" | "reason" | "safety" | "medicare" | "signup" | "review" | "payment"

const IRNS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

interface Props {
  patientId: string | null
  isAuthenticated: boolean
  needsOnboarding: boolean
  userEmail?: string
  userName?: string
}

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

// Progress bar
function ProgressBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex gap-1">
        {steps.map((label, i) => (
          <li key={label} className="flex-1">
            <div
              className={`h-1 rounded-full transition-colors ${
                i < current ? "bg-primary" : i === current ? "bg-primary/50" : "bg-muted"
              }`}
            />
            <span
              className={`text-[10px] mt-1 block text-center ${i <= current ? "text-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function PathologyImagingFlowClient({
  patientId: initialPatientId,
  isAuthenticated: initialIsAuthenticated,
  needsOnboarding: initialNeedsOnboarding,
  userEmail,
  userName,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  // Auth state
  const [patientId, setPatientId] = useState(initialPatientId)
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated)
  const [needsOnboarding, setNeedsOnboarding] = useState(initialNeedsOnboarding)

  // Flow state
  const [step, setStep] = useState<FlowStep>("type")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [testCategory, setTestCategory] = useState<"blood" | "imaging" | null>(null)
  const [selectedTest, setSelectedTest] = useState("")
  const [otherTest, setOtherTest] = useState("")
  const [imagingType, setImagingType] = useState("")
  const [bodyRegion, setBodyRegion] = useState("")
  const [otherRegion, setOtherRegion] = useState("")
  const [reason, setReason] = useState("")

  // Safety
  const [safetyAnswers, setSafetyAnswers] = useState({ headInjury: false, severeAbdo: false, chestPain: false })
  const hasSafetyRisk = Object.values(safetyAnswers).some(Boolean)

  // Medicare
  const [medicare, setMedicare] = useState("")
  const [irn, setIrn] = useState<number | null>(null)
  const [dob, setDob] = useState("")
  const [medicareError, setMedicareError] = useState<string | null>(null)
  const [medicareValid, setMedicareValid] = useState(false)

  // Signup
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup")
  const [fullName, setFullName] = useState(userName || "")
  const [email, setEmail] = useState(userEmail || "")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [agreedTerms, setAgreedTerms] = useState(false)

  // Derived steps
  const getSteps = useCallback((): FlowStep[] => {
    const base: FlowStep[] = ["type", "test"]
    if (testCategory === "imaging") base.push("region")
    base.push("reason", "safety")
    if (needsOnboarding || !isAuthenticated) base.push("medicare")
    if (!isAuthenticated) base.push("signup")
    base.push("review", "payment")
    return base
  }, [testCategory, isAuthenticated, needsOnboarding])

  const steps = getSteps()
  const currentIndex = steps.indexOf(step)
  const progressLabels = ["Details", "Medicare", "Account", "Pay"]
  const progressIndex =
    step === "type" || step === "test" || step === "region" || step === "reason" || step === "safety"
      ? 0
      : step === "medicare"
        ? 1
        : step === "signup"
          ? 2
          : 3

  // Navigate
  const goTo = useCallback((next: FlowStep) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setStep(next)
      setIsTransitioning(false)
      setError(null)
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

  // Medicare validation
  const validateMedicare = useCallback((value: string) => {
    const digits = value.replace(/\D/g, "")
    if (digits.length === 0) {
      setMedicareError(null)
      setMedicareValid(false)
      return
    }
    const first = digits[0]
    if (!["2", "3", "4", "5", "6"].includes(first)) {
      setMedicareError(REFERRAL_COPY.medicare.errors.startDigit)
      setMedicareValid(false)
      return
    }
    if (digits.length < 10) {
      setMedicareError(REFERRAL_COPY.medicare.errors.incomplete(10 - digits.length))
      setMedicareValid(false)
      return
    }
    // Checksum
    const weights = [1, 3, 7, 9, 1, 3, 7, 9]
    let sum = 0
    for (let i = 0; i < 8; i++) sum += Number.parseInt(digits[i]) * weights[i]
    if (sum % 10 !== Number.parseInt(digits[8])) {
      setMedicareError(REFERRAL_COPY.medicare.errors.checksum)
      setMedicareValid(false)
      return
    }
    setMedicareError(null)
    setMedicareValid(true)
  }, [])

  const handleMedicareChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10)
    let formatted = ""
    if (raw.length > 0) formatted = raw.slice(0, 4)
    if (raw.length > 4) formatted += " " + raw.slice(4, 9)
    if (raw.length > 9) formatted += " " + raw.slice(9, 10)
    setMedicare(formatted)
    validateMedicare(raw)
  }

  // Auth handlers
  const handleGoogleSignIn = async () => {
    const redirectUrl =
      process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
      `${window.location.origin}/auth/callback?flow=referral-pathology`
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl },
    })
  }

  const handleEmailAuth = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      if (authMode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
          },
        })
        if (signUpError) throw signUpError
        if (data.session) {
          const result = await createOrGetProfile({
            userId: data.user!.id,
            email,
            fullName,
            dateOfBirth: dob,
            medicareNumber: medicare.replace(/\s/g, ""),
            medicareIrn: irn || undefined,
          })
          if (result.error) throw new Error(result.error)
          setPatientId(result.profileId!)
          setIsAuthenticated(true)
          setNeedsOnboarding(false)
          goTo("review")
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        const result = await createOrGetProfile({
          userId: data.user.id,
          email,
          fullName: fullName || data.user.user_metadata?.full_name,
          dateOfBirth: dob,
          medicareNumber: medicare.replace(/\s/g, ""),
          medicareIrn: irn || undefined,
        })
        if (result.error) throw new Error(result.error)
        setPatientId(result.profileId!)
        setIsAuthenticated(true)
        setNeedsOnboarding(false)
        goTo("review")
      }
    } catch (err: any) {
      setError(err.message || REFERRAL_COPY.errors.generic)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit
  const handleSubmit = async () => {
    if (!patientId) return
    setIsSubmitting(true)
    setError(null)
    try {
      const testLabel =
        testCategory === "blood"
          ? selectedTest === "other"
            ? otherTest
            : REFERRAL_COPY.bloodTests.options.find((o) => o.id === selectedTest)?.label || selectedTest
          : imagingType
      const regionLabel =
        bodyRegion === "other"
          ? otherRegion
          : REFERRAL_COPY.imaging.region.options.find((o) => o.id === bodyRegion)?.label || bodyRegion

      const formData = {
        test_category: testCategory,
        test_type: testLabel,
        body_region: testCategory === "imaging" ? regionLabel : null,
        clinical_reason: reason,
        medicare_number: medicare.replace(/\s/g, ""),
        medicare_irn: irn,
        date_of_birth: dob,
      }

      const result = await createRequestAndCheckoutAction({
        category: "referral",
        subtype: "pathology-imaging",
        type: "referral",
        answers: formData,
      })

      if (result.error) throw new Error(result.error)
      if (result.checkoutUrl) router.push(result.checkoutUrl)
    } catch (err: any) {
      setError(err.message || REFERRAL_COPY.errors.payment)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Can continue
  const canContinue = useCallback((): boolean => {
    switch (step) {
      case "type":
        return testCategory !== null
      case "test":
        return testCategory === "blood"
          ? selectedTest !== "" && (selectedTest !== "other" || otherTest.trim() !== "")
          : imagingType !== ""
      case "region":
        return bodyRegion !== "" && (bodyRegion !== "other" || otherRegion.trim() !== "")
      case "reason":
        return reason.trim().length >= 10
      case "safety":
        return !hasSafetyRisk
      case "medicare":
        return medicareValid && irn !== null && dob !== ""
      case "signup":
        return email !== "" && password.length >= 6 && (authMode === "signin" || (fullName !== "" && agreedTerms))
      case "review":
        return true
      case "payment":
        return true
      default:
        return false
    }
  }, [
    step,
    testCategory,
    selectedTest,
    otherTest,
    imagingType,
    bodyRegion,
    otherRegion,
    reason,
    hasSafetyRisk,
    medicareValid,
    irn,
    dob,
    email,
    password,
    authMode,
    fullName,
    agreedTerms,
  ])

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b px-4 py-3">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
              <Link href="/referrals" className="text-sm text-muted-foreground hover:text-foreground">
                ← Back
              </Link>
              <span className="text-xs text-muted-foreground">{REFERRAL_COPY.turnaround}</span>
            </div>
            <ProgressBar steps={progressLabels} current={progressIndex} />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-6">
          <div
            className={`max-w-md mx-auto transition-opacity duration-150 ${isTransitioning ? "opacity-0" : "opacity-100"}`}
          >
            {/* Type step */}
            {step === "type" && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold">{REFERRAL_COPY.type.heading}</h1>
                  <p className="text-sm text-muted-foreground">{REFERRAL_COPY.type.subtitle}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "blood", icon: Droplet, ...REFERRAL_COPY.type.blood },
                    { id: "imaging", icon: ScanLine, ...REFERRAL_COPY.type.imaging },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setTestCategory(opt.id as "blood" | "imaging")
                        setTimeout(() => goTo("test"), 150)
                      }}
                      className={`p-4 rounded-xl border text-left transition-all active:scale-95 ${
                        testCategory === opt.id
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50 bg-card"
                      }`}
                    >
                      <opt.icon className="h-6 w-6 text-primary mb-2" />
                      <div className="font-medium text-sm">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Test step */}
            {step === "test" && testCategory === "blood" && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold">{REFERRAL_COPY.bloodTests.heading}</h1>
                  <p className="text-sm text-muted-foreground">{REFERRAL_COPY.bloodTests.subtitle}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {REFERRAL_COPY.bloodTests.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSelectedTest(opt.id)
                        if (opt.id !== "other") setTimeout(goNext, 150)
                      }}
                      className={`p-3 rounded-lg border text-left text-sm transition-all active:scale-95 ${
                        selectedTest === opt.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {selectedTest === "other" && (
                  <Input
                    placeholder={REFERRAL_COPY.bloodTests.otherPlaceholder}
                    value={otherTest}
                    onChange={(e) => setOtherTest(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
            )}

            {step === "test" && testCategory === "imaging" && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold">{REFERRAL_COPY.imaging.heading}</h1>
                  <p className="text-sm text-muted-foreground">{REFERRAL_COPY.imaging.subtitle}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {REFERRAL_COPY.imaging.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setImagingType(opt.id)
                        setTimeout(goNext, 150)
                      }}
                      className={`p-3 rounded-lg border text-left text-sm transition-all active:scale-95 ${
                        imagingType === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Region step */}
            {step === "region" && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold">{REFERRAL_COPY.imaging.region.heading}</h1>
                  <p className="text-sm text-muted-foreground">{REFERRAL_COPY.imaging.region.subtitle}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {REFERRAL_COPY.imaging.region.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setBodyRegion(opt.id)
                        if (opt.id !== "other") setTimeout(goNext, 150)
                      }}
                      className={`p-3 rounded-lg border text-left text-sm transition-all active:scale-95 ${
                        bodyRegion === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {bodyRegion === "other" && (
                  <Input
                    placeholder={REFERRAL_COPY.imaging.region.otherPlaceholder}
                    value={otherRegion}
                    onChange={(e) => setOtherRegion(e.target.value)}
                  />
                )}
              </div>
            )}

            {/* Reason step */}
            {step === "reason" && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold">{REFERRAL_COPY.reason.heading}</h1>
                  <p className="text-sm text-muted-foreground">{REFERRAL_COPY.reason.subtitle}</p>
                </div>
                <div>
                  <Textarea
                    placeholder={REFERRAL_COPY.reason.placeholder}
                    value={reason}
                    onChange={(e) => setReason(e.target.value.slice(0, 300))}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right mt-1">
                    {REFERRAL_COPY.reason.charCount(reason.length)}
                  </p>
                </div>
                {(imagingType === "ct" || imagingType === "mri") && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">{REFERRAL_COPY.safety.ctAdvice}</p>
                )}
              </div>
            )}

            {/* Safety step */}
            {step === "safety" && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold">{REFERRAL_COPY.safety.heading}</h1>
                  <p className="text-sm text-muted-foreground">{REFERRAL_COPY.safety.subtitle}</p>
                </div>
                {hasSafetyRisk ? (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center space-y-3">
                    <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
                    <h2 className="font-semibold text-red-800">{REFERRAL_COPY.safety.alert.heading}</h2>
                    <p className="text-sm text-red-700">{REFERRAL_COPY.safety.alert.body}</p>
                    <Button asChild variant="destructive">
                      <a href="tel:000">{REFERRAL_COPY.safety.alert.cta}</a>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(REFERRAL_COPY.safety.questions).map(([key, question]) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-card border">
                        <span className="text-sm">{question}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSafetyAnswers((p) => ({ ...p, [key]: false }))}
                            className={`px-3 py-1 rounded text-sm ${
                              !safetyAnswers[key as keyof typeof safetyAnswers]
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {REFERRAL_COPY.safety.no}
                          </button>
                          <button
                            onClick={() => setSafetyAnswers((p) => ({ ...p, [key]: true }))}
                            className={`px-3 py-1 rounded text-sm ${
                              safetyAnswers[key as keyof typeof safetyAnswers] ? "bg-red-500 text-white" : "bg-muted"
                            }`}
                          >
                            {REFERRAL_COPY.safety.yes}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Medicare step */}
            {step === "medicare" && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold">{REFERRAL_COPY.medicare.heading}</h1>
                  <p className="text-sm text-muted-foreground">{REFERRAL_COPY.medicare.subtitle}</p>
                </div>
                <div className="p-4 rounded-xl bg-card border space-y-4">
                  <div>
                    <Label className="text-sm">{REFERRAL_COPY.medicare.numberLabel}</Label>
                    <div className="relative mt-1">
                      <Input
                        value={medicare}
                        onChange={handleMedicareChange}
                        placeholder={REFERRAL_COPY.medicare.numberPlaceholder}
                        className={`text-lg tracking-widest font-mono ${
                          medicareError ? "border-red-500" : medicareValid ? "border-green-500" : ""
                        }`}
                      />
                      {medicareValid && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                      )}
                    </div>
                    {medicareError && <p className="text-xs text-red-500 mt-1">{medicareError}</p>}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Label className="text-sm">{REFERRAL_COPY.medicare.irnLabel}</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>{REFERRAL_COPY.medicare.irnTooltip}</TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex gap-1">
                      {IRNS.map((n) => (
                        <button
                          key={n}
                          onClick={() => setIrn(n)}
                          className={`w-8 h-8 rounded text-sm font-medium transition-all ${
                            irn === n ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm">{REFERRAL_COPY.medicare.dobLabel}</Label>
                    <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="mt-1" />
                  </div>
                </div>
              </div>
            )}

            {/* Signup step */}
            {step === "signup" && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold">
                    {authMode === "signup" ? REFERRAL_COPY.signup.headingNew : REFERRAL_COPY.signup.headingExisting}
                  </h1>
                  <p className="text-sm text-muted-foreground">{REFERRAL_COPY.signup.subtitle}</p>
                </div>
                <Button variant="outline" className="w-full bg-transparent" onClick={handleGoogleSignIn}>
                  <GoogleIcon className="h-4 w-4 mr-2" />
                  {REFERRAL_COPY.signup.google}
                </Button>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex-1 h-px bg-border" />
                  {REFERRAL_COPY.signup.or}
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-3">
                  {authMode === "signup" && (
                    <Input
                      placeholder={REFERRAL_COPY.signup.nameLabel}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  )}
                  <Input
                    type="email"
                    placeholder={REFERRAL_COPY.signup.emailLabel}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={REFERRAL_COPY.signup.passwordLabel}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {authMode === "signup" && (
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={agreedTerms}
                        onChange={(e) => setAgreedTerms(e.target.checked)}
                        className="rounded"
                      />
                      <span>
                        {REFERRAL_COPY.signup.terms.prefix}{" "}
                        <Link href="/terms" className="underline">
                          {REFERRAL_COPY.signup.terms.termsLink}
                        </Link>{" "}
                        {REFERRAL_COPY.signup.terms.and}{" "}
                        <Link href="/privacy" className="underline">
                          {REFERRAL_COPY.signup.terms.privacyLink}
                        </Link>
                      </span>
                    </label>
                  )}
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  {authMode === "signup" ? REFERRAL_COPY.signup.switchToExisting : REFERRAL_COPY.signup.switchToNew}{" "}
                  <button
                    onClick={() => setAuthMode(authMode === "signup" ? "signin" : "signup")}
                    className="underline"
                  >
                    {authMode === "signup" ? REFERRAL_COPY.signup.signIn : REFERRAL_COPY.signup.createAccount}
                  </button>
                </p>
              </div>
            )}

            {/* Review step */}
            {step === "review" && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold">{REFERRAL_COPY.review.heading}</h1>
                  <p className="text-sm text-muted-foreground">{REFERRAL_COPY.review.subtitle}</p>
                </div>
                <div className="p-4 rounded-xl bg-card border space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{REFERRAL_COPY.review.testType}</span>
                    <span className="font-medium capitalize">{testCategory}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{REFERRAL_COPY.review.specificTest}</span>
                    <span className="font-medium">
                      {testCategory === "blood"
                        ? selectedTest === "other"
                          ? otherTest
                          : REFERRAL_COPY.bloodTests.options.find((o) => o.id === selectedTest)?.label
                        : imagingType.toUpperCase()}
                    </span>
                  </div>
                  {testCategory === "imaging" && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{REFERRAL_COPY.review.region}</span>
                      <span className="font-medium">
                        {bodyRegion === "other"
                          ? otherRegion
                          : REFERRAL_COPY.imaging.region.options.find((o) => o.id === bodyRegion)?.label}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{REFERRAL_COPY.review.reason}</span>
                    <span className="font-medium max-w-[200px] text-right truncate">
                      {reason || REFERRAL_COPY.review.none}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{REFERRAL_COPY.review.medicare}</span>
                    <span className="font-medium font-mono">{medicare}</span>
                  </div>
                </div>
                <button onClick={() => goTo("type")} className="text-xs text-primary flex items-center gap-1 mx-auto">
                  <Pencil className="h-3 w-3" /> {REFERRAL_COPY.review.edit}
                </button>
              </div>
            )}

            {/* Payment step */}
            {step === "payment" && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold">{REFERRAL_COPY.payment.heading}</h1>
                  <p className="text-sm text-muted-foreground">{REFERRAL_COPY.payment.subtitle}</p>
                </div>
                <div className="p-4 rounded-xl bg-card border space-y-3">
                  <div className="text-center">
                    <span className="text-3xl font-bold">{REFERRAL_COPY.payment.price}</span>
                  </div>
                  <ul className="space-y-2">
                    {REFERRAL_COPY.payment.includes.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground">{REFERRAL_COPY.payment.disclaimer}</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mt-4">{error}</div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="sticky bottom-0 bg-background/80 backdrop-blur border-t px-4 py-3">
          <div className="max-w-md mx-auto flex gap-2">
            {step !== "type" && (
              <Button variant="ghost" onClick={goBack} disabled={isSubmitting}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                {REFERRAL_COPY.nav.back}
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={step === "signup" ? handleEmailAuth : step === "payment" ? handleSubmit : goNext}
              disabled={!canContinue() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {REFERRAL_COPY.payment.processing}
                </>
              ) : step === "payment" ? (
                <>
                  {REFERRAL_COPY.payment.cta}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              ) : step === "signup" ? (
                authMode === "signup" ? (
                  REFERRAL_COPY.signup.ctaNew
                ) : (
                  REFERRAL_COPY.signup.ctaExisting
                )
              ) : (
                <>
                  {REFERRAL_COPY.nav.continue}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}
