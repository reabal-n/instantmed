"use client"

import type React from "react"
import Link from "next/link"
import { useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { TiltCard } from "@/components/shared/tilt-card"
import { Loader2, Shield, Clock, CheckCircle, Eye, EyeOff, AlertCircle, Check, X } from "lucide-react"

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

// Password strength checker
function getPasswordStrength(password: string): { strength: number; label: string; color: string } {
  let strength = 0
  if (password.length >= 8) strength++
  if (password.length >= 12) strength++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
  if (/\d/.test(password)) strength++
  if (/[^a-zA-Z0-9]/.test(password)) strength++

  if (strength <= 1) return { strength, label: "Weak", color: "bg-red-500" }
  if (strength <= 2) return { strength, label: "Fair", color: "bg-orange-500" }
  if (strength <= 3) return { strength, label: "Good", color: "bg-yellow-500" }
  if (strength <= 4) return { strength, label: "Strong", color: "bg-green-500" }
  return { strength, label: "Excellent", color: "bg-emerald-500" }
}

// Password requirement checker
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${met ? "text-green-600" : "text-muted-foreground"}`}>
      {met ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <X className="w-3.5 h-3.5 text-muted-foreground/50" />
      )}
      <span>{text}</span>
    </div>
  )
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [dobError, setDobError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect")

  // Password validation
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])
  const passwordRequirements = useMemo(() => ({
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
  }), [password])
  const isPasswordValid = passwordRequirements.length && passwordRequirements.uppercase && 
                          passwordRequirements.lowercase && passwordRequirements.number

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) return null
    if (!emailRegex.test(email)) return "Please enter a valid email address"
    return null
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    setEmailError(validateEmail(value))
  }

  // Date of birth validation
  const validateDob = (dob: string) => {
    if (!dob) return null
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    if (age < 18) return "You must be at least 18 years old"
    if (age > 120) return "Please enter a valid date of birth"
    return null
  }

  const handleDobChange = (value: string) => {
    setDateOfBirth(value)
    setDobError(validateDob(value))
  }

  // Calculate max date for DOB (must be at least 18)
  const maxDobDate = useMemo(() => {
    const date = new Date()
    date.setFullYear(date.getFullYear() - 18)
    return date.toISOString().split('T')[0]
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!termsAccepted) {
      setError("Please accept the terms and conditions")
      return
    }

    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/patient`,
        },
      })

      if (signUpError) throw signUpError

      if (!authData.user) {
        throw new Error("Failed to create user account")
      }

      const { error: profileError } = await supabase.from("profiles").insert({
        auth_user_id: authData.user.id,
        full_name: fullName,
        date_of_birth: dateOfBirth,
        role: "patient",
      })

      if (profileError) {
        throw new Error("Failed to create profile. Please try again.")
      }

      const onboardingRedirect = redirectTo || "/patient"
      router.push(`/patient/onboarding?redirect=${encodeURIComponent(onboardingRedirect)}`)
      router.refresh()
    } catch (err) {
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
          redirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || callbackUrl.toString(),
        },
      })

      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up with Google")
      setIsGoogleLoading(false)
    }
  }

  const loginLink = redirectTo ? `/auth/login?redirect=${encodeURIComponent(redirectTo)}` : "/auth/login"

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

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
              variant="outline"
              onClick={handleGoogleSignUp}
              disabled={isGoogleLoading || isLoading}
              className="w-full h-11 rounded-xl bg-white hover:bg-gray-50 border-gray-200 text-gray-700 font-medium mb-4"
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
              <div className="space-y-2">
                <Label htmlFor="full-name" className="text-sm font-medium">
                  Full name
                </Label>
                <div className="relative">
                  <Input
                    id="full-name"
                    placeholder="John Smith"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading || isGoogleLoading}
                    className={`h-11 rounded-xl bg-white/50 backdrop-blur-sm border-white/40 focus:border-[#00E2B5] focus:ring-[#00E2B5]/20 pr-10 ${
                      fullName.trim().split(' ').length >= 2 ? "border-green-400" : ""
                    }`}
                  />
                  {fullName.trim().split(' ').length >= 2 && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
                {fullName && fullName.trim().split(' ').length < 2 && (
                  <p className="text-xs text-muted-foreground">Please enter your full name (first and last)</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob" className="text-sm font-medium">
                  Date of birth
                </Label>
                <div className="relative">
                  <Input
                    id="dob"
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => handleDobChange(e.target.value)}
                    disabled={isLoading || isGoogleLoading}
                    max={maxDobDate}
                    className={`h-11 rounded-xl bg-white/50 backdrop-blur-sm focus:ring-[#00E2B5]/20 pr-10 ${
                      dobError ? "border-red-400 focus:border-red-400" : dateOfBirth && !dobError ? "border-green-400 focus:border-green-400" : "border-white/40 focus:border-[#00E2B5]"
                    }`}
                  />
                  {dateOfBirth && !dobError && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                  {dobError && (
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                  )}
                </div>
                {dobError && <p className="text-xs text-red-500">{dobError}</p>}
                <p className="text-xs text-muted-foreground">Must be 18 or older to use this service</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    disabled={isLoading || isGoogleLoading}
                    className={`h-11 rounded-xl bg-white/50 backdrop-blur-sm focus:ring-[#00E2B5]/20 pr-10 ${
                      emailError ? "border-red-400 focus:border-red-400" : email && !emailError ? "border-green-400 focus:border-green-400" : "border-white/40 focus:border-[#00E2B5]"
                    }`}
                  />
                  {email && !emailError && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                  {emailError && (
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                  )}
                </div>
                {emailError && <p className="text-xs text-red-500">{emailError}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || isGoogleLoading}
                    className={`h-11 rounded-xl bg-white/50 backdrop-blur-sm focus:ring-[#00E2B5]/20 pr-20 ${
                      password && isPasswordValid ? "border-green-400 focus:border-green-400" : "border-white/40 focus:border-[#00E2B5]"
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {password && isPasswordValid && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 rounded hover:bg-muted transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Password strength indicator */}
                {password && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordStrength.strength <= 2 ? "text-red-500" : 
                        passwordStrength.strength <= 3 ? "text-yellow-600" : "text-green-600"
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <PasswordRequirement met={passwordRequirements.length} text="8+ characters" />
                      <PasswordRequirement met={passwordRequirements.uppercase} text="Uppercase letter" />
                      <PasswordRequirement met={passwordRequirements.lowercase} text="Lowercase letter" />
                      <PasswordRequirement met={passwordRequirements.number} text="Number" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id="terms"
                  className="mt-0.5 rounded"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  disabled={isLoading || isGoogleLoading}
                />
                <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed">
                  I agree to the{" "}
                  <Link href="/terms" className="text-[#00E2B5] hover:underline">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-[#00E2B5] hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || isGoogleLoading || !isPasswordValid || !!emailError || !!dobError}
                className="w-full h-11 rounded-xl btn-premium text-[#0A0F1C] font-semibold disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
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
