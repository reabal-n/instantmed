"use client"

import type React from "react"
import Link from "next/link"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button, Checkbox } from "@heroui/react"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { TiltCard } from "@/components/shared/tilt-card"
import { PasswordStrength } from "@/components/ui/password-strength"
import { GlassInput } from "@/components/ui/glass-input"
import { GlassButton } from "@/components/ui/glass-button"
import { BlurFade } from "@/components/ui/blur-fade"
import { Loader2, Shield, Clock, CheckCircle, Mail, User, Calendar, Lock, Eye, EyeOff, PartyPopper, AlertCircle, X } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import confetti from "canvas-confetti"

const loadingSteps = [
  { message: "Creating your account...", icon: <Loader2 className="w-10 h-10 text-primary animate-spin" /> },
  { message: "Setting up your profile...", icon: <Loader2 className="w-10 h-10 text-primary animate-spin" /> },
  { message: "Almost there...", icon: <Loader2 className="w-10 h-10 text-primary animate-spin" /> },
  { message: "Welcome to InstantMed!", icon: <PartyPopper className="w-10 h-10 text-[#00E2B5]" /> },
]

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

export default function RegisterPage() {
  const [fullName, setFullName] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [modalStatus, setModalStatus] = useState<'closed' | 'loading' | 'success' | 'error'>('closed')
  const [loadingStep, setLoadingStep] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect")

  const fireConfetti = () => {
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 }
    confetti({ ...defaults, particleCount: 50, origin: { x: 0.2, y: 0.8 }, angle: 60 })
    confetti({ ...defaults, particleCount: 50, origin: { x: 0.8, y: 0.8 }, angle: 120 })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!termsAccepted) {
      setError("Please accept the terms and conditions")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)
    setModalStatus('loading')
    setLoadingStep(0)
    setError(null)

    const supabase = createClient()

    // Animate through loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, loadingSteps.length - 2))
    }, 1500)

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) throw signUpError

      if (!authData.user) {
        throw new Error("Failed to create user account")
      }

      // Profile creation MUST happen server-side only
      if (authData.session) {
        // User is auto-confirmed - create profile server-side
        const { ensureProfile } = await import("@/app/actions/ensure-profile")
        try {
          const result = await ensureProfile(
            authData.user.id,
            authData.user.email || "",
            {
              fullName,
              dateOfBirth,
            }
          )
          
          if (result.error || !result.profileId) {
            throw new Error(result.error || "Profile creation returned no profileId")
          }
        } catch (profileError) {
          console.error("[Register] Profile creation failed:", profileError)
          throw profileError instanceof Error ? profileError : new Error("Failed to create profile")
        }

        clearInterval(stepInterval)
        setLoadingStep(loadingSteps.length - 1)
        setModalStatus('success')
        fireConfetti()
        
        // Wait for confetti then redirect
        setTimeout(() => {
          const onboardingRedirect = redirectTo || "/patient"
          router.push(`/patient/onboarding?redirect=${encodeURIComponent(onboardingRedirect)}`)
          router.refresh()
        }, 2000)
      } else {
        clearInterval(stepInterval)
        setModalStatus('closed')
        router.push("/auth/check-email")
      }
    } catch (err) {
      clearInterval(stepInterval)
      setModalStatus('error')
      setError(err instanceof Error ? err.message : "An error occurred during registration")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin)
      if (redirectTo) {
        callbackUrl.searchParams.set("redirect", redirectTo)
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      })

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up with Google")
      setIsGoogleLoading(false)
    }
  }

  const loginLink = redirectTo ? `/auth/login?redirect=${encodeURIComponent(redirectTo)}` : "/auth/login"

  const LoadingModal = () => (
    <AnimatePresence>
      {modalStatus !== 'closed' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-card/95 dark:bg-card/95 border border-border rounded-2xl p-8 w-full max-w-sm flex flex-col items-center gap-4 mx-4 shadow-2xl"
          >
            {modalStatus === 'error' && (
              <button
                onClick={() => setModalStatus('closed')}
                className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            
            {modalStatus === 'loading' && (
              <div className="flex flex-col items-center gap-4">
                {loadingSteps[loadingStep]?.icon}
                <p className="text-lg font-medium text-foreground text-center">
                  {loadingSteps[loadingStep]?.message}
                </p>
              </div>
            )}
            
            {modalStatus === 'success' && (
              <div className="flex flex-col items-center gap-4">
                {loadingSteps[loadingSteps.length - 1].icon}
                <p className="text-lg font-medium text-foreground text-center">
                  {loadingSteps[loadingSteps.length - 1].message}
                </p>
                <p className="text-sm text-muted-foreground">Redirecting you now...</p>
              </div>
            )}
            
            {modalStatus === 'error' && (
              <div className="flex flex-col items-center gap-4">
                <AlertCircle className="w-10 h-10 text-destructive" />
                <p className="text-lg font-medium text-foreground text-center">Something went wrong</p>
                <p className="text-sm text-muted-foreground text-center">{error}</p>
                <GlassButton onClick={() => setModalStatus('closed')} size="sm">
                  Try Again
                </GlassButton>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />
      <LoadingModal />

      <main className="flex flex-1 items-center justify-center px-4 py-16 bg-gradient-hero relative overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-[#00E2B5]/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-[#00E2B5]/5 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />

        <div className="relative w-full max-w-md">
          {/* Trust badges above form */}
          <div
            className="flex flex-wrap justify-center gap-3 mb-6 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.05s", animationFillMode: "forwards" }}
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Shield className="h-3.5 w-3.5 text-[#00E2B5]" />
              <span>256-bit encryption</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Clock className="h-3.5 w-3.5 text-[#00E2B5]" />
              <span>2 min setup</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-[#00E2B5]" />
              <span>10,000+ patients</span>
            </div>
          </div>

          {/* Glass card register form */}
          <TiltCard
            className="p-8 animate-scale-in opacity-0"
            style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
          >
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">👋</div>
              <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Create your account
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">Join 10,000+ Aussies getting healthcare their way</p>
            </div>

            <Button
              type="button"
              variant="bordered"
              onPress={handleGoogleSignUp}
              isDisabled={isGoogleLoading || isLoading}
              className="w-full h-11 bg-white hover:bg-gray-50 border-gray-200 text-gray-700 font-medium mb-4"
              radius="lg"
            >
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon className="mr-2 h-5 w-5" />
              )}
              Continue with Google
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200/60" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white/60 text-muted-foreground">or sign up with email</span>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <BlurFade delay={0.1}>
                <GlassInput
                  placeholder="Full name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading || isGoogleLoading}
                  icon={<User className="h-5 w-5" />}
                />
              </BlurFade>
              <BlurFade delay={0.15}>
                <GlassInput
                  placeholder="Date of birth"
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  disabled={isLoading || isGoogleLoading}
                  icon={<Calendar className="h-5 w-5" />}
                />
              </BlurFade>
              <BlurFade delay={0.2}>
                <GlassInput
                  type="email"
                  placeholder="Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || isGoogleLoading}
                  icon={<Mail className="h-5 w-5" />}
                />
              </BlurFade>
              <BlurFade delay={0.25}>
                <div className="space-y-3">
                  <GlassInput
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || isGoogleLoading}
                    icon={<Lock className="h-5 w-5" />}
                    endContent={
                      password.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1.5 rounded-full hover:bg-foreground/10 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4 text-foreground/60" /> : <Eye className="h-4 w-4 text-foreground/60" />}
                        </button>
                      )
                    }
                  />
                  <PasswordStrength password={password} />
                  <GlassInput
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading || isGoogleLoading}
                    icon={<Lock className="h-5 w-5" />}
                    endContent={
                      confirmPassword.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="p-1.5 rounded-full hover:bg-foreground/10 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4 text-foreground/60" /> : <Eye className="h-4 w-4 text-foreground/60" />}
                        </button>
                      )
                    }
                  />
                  {password && confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Passwords don&apos;t match
                    </p>
                  )}
                  {password && confirmPassword && password === confirmPassword && (
                    <p className="text-xs text-[#00E2B5] flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Passwords match
                    </p>
                  )}
                </div>
              </BlurFade>
              <Checkbox
                isSelected={termsAccepted}
                onValueChange={setTermsAccepted}
                isDisabled={isLoading || isGoogleLoading}
                size="sm"
                classNames={{
                  label: "text-xs text-muted-foreground leading-relaxed",
                }}
              >
                I agree to the{" "}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </Checkbox>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              <Button
                type="submit"
                isDisabled={isLoading || isGoogleLoading}
                isLoading={isLoading}
                className="w-full h-11 btn-cta"
                radius="full"
                spinner={<Loader2 className="h-4 w-4 animate-spin" />}
              >
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href={loginLink} className="font-medium text-[#00E2B5] hover:underline">
                Sign in
              </Link>
            </p>
          </TiltCard>
        </div>
      </main>

      <Footer />
    </div>
  )
}
