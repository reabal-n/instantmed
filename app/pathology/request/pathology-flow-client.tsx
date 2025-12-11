"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { GoogleIcon } from "@/components/icons/google-icon"
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
  TestTube,
  Activity,
  Droplet,
  Zap,
  Shield,
  Heart,
  Baby,
  Pill,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react"
import { createRequestAndCheckoutAction } from "@/lib/stripe/checkout"
import { createClient } from "@/lib/supabase/client"
import { createOrGetProfile } from "@/app/actions/create-profile"

type FlowStep = "tests" | "reason" | "medicare" | "signup" | "review"

const TEST_PANELS = [
  {
    id: "general-health",
    title: "General Health Check",
    icon: Activity,
    tests: ["FBC", "UEC", "LFT", "Lipids", "HbA1c"],
  },
  { id: "thyroid", title: "Thyroid Panel", icon: Zap, tests: ["TSH", "Free T4", "Free T3"] },
  { id: "iron", title: "Iron Studies", icon: Droplet, tests: ["Serum Iron", "Ferritin", "Transferrin"] },
  { id: "vitamin-d", title: "Vitamin D", icon: TestTube, tests: ["25-OH Vitamin D"] },
  { id: "sti", title: "STI Screening", icon: Shield, tests: ["Chlamydia", "Gonorrhoea", "Syphilis", "HIV"] },
  { id: "hormone-female", title: "Women's Hormones", icon: Baby, tests: ["FSH", "LH", "Oestradiol"] },
  { id: "hormone-male", title: "Men's Hormones", icon: Heart, tests: ["Testosterone", "SHBG", "LH"] },
  { id: "diabetes", title: "Diabetes Check", icon: Pill, tests: ["Fasting Glucose", "HbA1c"] },
]

interface Props {
  initialPatientId: string | null
  initialIsAuthenticated: boolean
  initialNeedsOnboarding: boolean
  userEmail?: string
  userName?: string
}

export default function PathologyFlowClient({
  initialPatientId,
  initialIsAuthenticated,
  initialNeedsOnboarding,
  userEmail,
  userName,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPanel = searchParams.get("panel")

  const [patientId, setPatientId] = useState<string | null>(initialPatientId)
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated)
  const [needsOnboarding, setNeedsOnboarding] = useState(initialNeedsOnboarding)

  // Form state
  const [selectedPanels, setSelectedPanels] = useState<string[]>(preselectedPanel ? [preselectedPanel] : [])
  const [customTests, setCustomTests] = useState("")
  const [reason, setReason] = useState("")
  const [medicareNumber, setMedicareNumber] = useState("")
  const [medicareIrn, setMedicareIrn] = useState("1")
  const [email, setEmail] = useState(userEmail || "")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState(userName || "")
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  // Flow state
  const [step, setStep] = useState<FlowStep>("tests")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user && !isAuthenticated) {
        const pendingName = sessionStorage.getItem("pending_profile_name")
        const userNameFromSession = pendingName || session.user.user_metadata?.full_name || ""

        const { profileId } = await createOrGetProfile(session.user.id, userNameFromSession, "")

        if (profileId) {
          sessionStorage.removeItem("pending_profile_name")
          setPatientId(profileId)
          setIsAuthenticated(true)
          setNeedsOnboarding(false)

          const urlParams = new URLSearchParams(window.location.search)
          if (urlParams.get("auth_success") === "true") {
            window.history.replaceState({}, "", window.location.pathname)
            if (step === "signup") {
              goNext()
            }
          }
        }
      }
    }
    checkSession()
  }, [isAuthenticated, step])

  const togglePanel = (id: string) => {
    setSelectedPanels((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  const canProceed = () => {
    switch (step) {
      case "tests":
        return selectedPanels.length > 0 || customTests.trim().length > 0
      case "reason":
        return reason.trim().length >= 10
      case "medicare":
        return medicareNumber.length === 10
      case "signup":
        return email && password.length >= 6 && fullName && agreedToTerms
      case "review":
        return true
      default:
        return false
    }
  }

  const goNext = () => {
    const nextIndex = steps.indexOf(step) + 1
    if (nextIndex < steps.length) setStep(steps[nextIndex])
  }

  const goBack = () => {
    const prevIndex = steps.indexOf(step) - 1
    if (prevIndex >= 0) setStep(steps[prevIndex])
  }

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true)
    setError("")

    const supabase = createClient()

    try {
      sessionStorage.setItem("questionnaire_flow", "true")
      sessionStorage.setItem("questionnaire_path", window.location.pathname)
      sessionStorage.setItem("pending_profile_name", fullName)

      const callbackUrl = new URL("/auth/callback", window.location.origin)
      callbackUrl.searchParams.set("redirect", window.location.pathname)
      callbackUrl.searchParams.set("flow", "questionnaire")
      callbackUrl.searchParams.set("auth_success", "true")

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || callbackUrl.toString(),
        },
      })

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed")
      setIsGoogleLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!isAuthenticated || !patientId) {
      setError("Please complete the signup step before submitting.")
      setStep("signup")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const supabase = createClient()

      // Build questionnaire data
      const selectedTestNames = selectedPanels.flatMap((id) => TEST_PANELS.find((p) => p.id === id)?.tests || [])
      const answers = {
        panels: selectedPanels,
        tests: [
          ...selectedTestNames,
          ...customTests
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        ],
        reason,
        medicare_number: medicareNumber,
        medicare_irn: medicareIrn,
      }

      // Create request and checkout
      const result = await createRequestAndCheckoutAction({
        category: "referral",
        subtype: "pathology",
        type: "pathology",
        answers,
      })

      if (!result.success) {
        throw new Error(result.error || "Failed to create request")
      }

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Determine steps based on auth state
  const getSteps = (): FlowStep[] => {
    if (isAuthenticated && !needsOnboarding) return ["tests", "reason", "review"]
    if (isAuthenticated && needsOnboarding) return ["tests", "reason", "medicare", "review"]
    return ["tests", "reason", "medicare", "signup", "review"]
  }
  const steps = getSteps()
  const currentIndex = steps.indexOf(step)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <Link href="/pathology" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back
        </Link>
        <div className="flex items-center gap-2">
          <TestTube className="w-5 h-5 text-blue-600" />
          <span className="font-semibold">Pathology Request</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1}/{steps.length}
        </span>
      </header>

      {/* Progress */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex gap-1 max-w-md mx-auto">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= currentIndex ? "bg-blue-600" : "bg-muted"}`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Tests step */}
        {step === "tests" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-semibold">What tests do you need?</h1>
              <p className="text-sm text-muted-foreground mt-1">Select panels or add specific tests</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {TEST_PANELS.map((panel) => {
                const selected = selectedPanels.includes(panel.id)
                return (
                  <button
                    key={panel.id}
                    type="button"
                    onClick={() => togglePanel(panel.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selected
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
                        : "border-border hover:border-blue-300"
                    }`}
                  >
                    <panel.icon className={`w-5 h-5 mb-2 ${selected ? "text-blue-600" : "text-muted-foreground"}`} />
                    <p className={`font-medium text-sm ${selected ? "text-blue-600" : "text-foreground"}`}>
                      {panel.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{panel.tests.length} tests</p>
                    {selected && <CheckCircle className="w-4 h-4 text-blue-600 absolute top-2 right-2" />}
                  </button>
                )
              })}
            </div>

            <div>
              <Label className="text-sm font-medium">Other tests (optional)</Label>
              <Input
                value={customTests}
                onChange={(e) => setCustomTests(e.target.value)}
                placeholder="e.g. B12, folate, cortisol"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Separate multiple tests with commas</p>
            </div>
          </div>
        )}

        {/* Reason step */}
        {step === "reason" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-semibold">Why do you need these tests?</h1>
              <p className="text-sm text-muted-foreground mt-1">This helps the GP assess your request</p>
            </div>

            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Feeling tired lately and want to check my iron levels. Haven't had a general health check in over a year."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">Minimum 10 characters</p>
          </div>
        )}

        {/* Medicare step */}
        {step === "medicare" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-semibold">Medicare details</h1>
              <p className="text-sm text-muted-foreground mt-1">For bulk billing eligibility</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Medicare number</Label>
                <Input
                  value={medicareNumber}
                  onChange={(e) => setMedicareNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10 digit number"
                  inputMode="numeric"
                  className="mt-1 text-lg tracking-widest"
                />
              </div>
              <div>
                <Label>IRN (line number on card)</Label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMedicareIrn(String(n))}
                      className={`w-10 h-10 rounded-lg border font-medium transition-colors ${
                        medicareIrn === String(n)
                          ? "border-blue-600 bg-blue-50 text-blue-600"
                          : "border-border hover:border-blue-300"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Signup step */}
        {step === "signup" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-semibold">Create your account</h1>
              <p className="text-sm text-muted-foreground mt-1">Quick and secure</p>
            </div>

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleAuth}
                disabled={isGoogleLoading}
                className="w-full h-12 rounded-xl gap-3 bg-transparent"
              >
                {isGoogleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon className="w-5 h-5" />}
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground">or</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Full name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Password</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(c) => setAgreedToTerms(c === true)} />
                  <Label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                    I agree to the terms of service and privacy policy
                  </Label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Review step */}
        {step === "review" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-semibold">Review your request</h1>
              <p className="text-sm text-muted-foreground mt-1">Make sure everything looks right</p>
            </div>

            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-sm font-medium mb-2">Tests requested:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPanels.map((id) => {
                    const panel = TEST_PANELS.find((p) => p.id === id)
                    return (
                      <span key={id} className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                        {panel?.title}
                      </span>
                    )
                  })}
                  {customTests && (
                    <span className="bg-muted text-foreground text-xs px-2 py-1 rounded-full">+ custom tests</span>
                  )}
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-sm font-medium mb-1">Reason:</p>
                <p className="text-sm text-muted-foreground">{reason}</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold">$29.95</span>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                You'll only be charged if the GP approves your referral request.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-4 bg-card/80 backdrop-blur-sm sticky bottom-0">
        <div className="max-w-lg mx-auto flex gap-3">
          {currentIndex > 0 && (
            <Button variant="ghost" onClick={goBack} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          {step === "review" ? (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Pay $29.95
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!canProceed()} className="flex-1">
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
