"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { createOrGetProfile } from "@/app/actions/create-profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Shield, ArrowLeft, Mail, User, Calendar, CheckCircle } from "lucide-react"

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

interface InlineAuthStepProps {
  onBack: () => void
  onAuthComplete: (userId: string, profileId: string) => void
  serviceName: string
}

export function InlineAuthStep({ onBack, onAuthComplete, serviceName }: InlineAuthStepProps) {
  const router = useRouter()
  const [mode, setMode] = useState<"choose" | "signup" | "signin" | "check-email">("choose")

  // Signup fields
  const [fullName, setFullName] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  // Check for returning users who confirmed their email
  useEffect(() => {
    const checkSession = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const authSuccess = urlParams.get("auth_success")

      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user && authSuccess === "true") {
        // User just completed Google OAuth and came back
        const pendingName = sessionStorage.getItem("pending_profile_name")
        const pendingDob = sessionStorage.getItem("pending_profile_dob")

        const userName = pendingName || session.user.user_metadata?.full_name || ""
        const userDob = pendingDob || session.user.user_metadata?.date_of_birth || ""

        const { profileId, error: profileError } = await createOrGetProfile(session.user.id, userName, userDob)

        if (profileId) {
          sessionStorage.removeItem("pending_profile_name")
          sessionStorage.removeItem("pending_profile_dob")

          // Clear the auth_success param from URL
          window.history.replaceState({}, "", window.location.pathname)

          onAuthComplete(session.user.id, profileId)
          router.refresh()
        }
      }
    }

    checkSession()
  }, [onAuthComplete, router])

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      console.log("[v0] Starting Google OAuth from questionnaire")

      sessionStorage.setItem("questionnaire_flow", "true")
      sessionStorage.setItem("questionnaire_path", window.location.pathname)

      const callbackUrl = new URL("/auth/callback", window.location.origin)
      callbackUrl.searchParams.set("redirect", window.location.pathname)
      callbackUrl.searchParams.set("flow", "questionnaire")

      console.log("[v0] OAuth callback URL:", callbackUrl.toString())

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      })

      if (error) {
        console.error("[v0] OAuth error:", error)
        throw error
      }

      // User will be redirected to Google, then back to /auth/callback
    } catch (err) {
      console.error("[v0] Google OAuth failed:", err)
      setError(err instanceof Error ? err.message : "Failed to sign in with Google")
      setIsGoogleLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!termsAccepted) {
      setError("Please accept the terms and conditions")
      return
    }

    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      console.log("[v0] Starting signup process")

      // Store profile data for later - will be used after email confirmation or immediately
      sessionStorage.setItem("pending_profile_name", fullName)
      sessionStorage.setItem("pending_profile_dob", dateOfBirth)
      sessionStorage.setItem("questionnaire_flow", "true")
      sessionStorage.setItem("questionnaire_path", window.location.pathname)

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}${window.location.pathname}`,
          data: {
            full_name: fullName,
            date_of_birth: dateOfBirth,
            role: "patient",
          },
        },
      })

      if (signUpError) {
        console.error("[v0] Signup error:", signUpError)
        if (signUpError.message.includes("weak") || signUpError.message.includes("password")) {
          throw new Error("Please choose a password with at least 6 characters")
        }
        throw signUpError
      }

      if (!authData.user) {
        throw new Error("Failed to create account")
      }

      console.log("[v0] User created successfully, session:", !!authData.session)

      // Check if we have an active session (email confirmation disabled or auto-confirmed)
      if (authData.session) {
        console.log("[v0] User is auto-confirmed, creating profile")

        const { profileId, error: profileError } = await createOrGetProfile(authData.user.id, fullName, dateOfBirth)

        if (profileError) {
          console.error("[v0] Profile creation error:", profileError)
          throw new Error(profileError)
        }

        if (!profileId) {
          throw new Error("Failed to create profile. Please try again or contact support.")
        }

        console.log("[v0] Profile created successfully, completing flow")
        onAuthComplete(authData.user.id, profileId)
        router.refresh()
      } else {
        // The user doesn't exist in auth.users until they confirm
        console.log("[v0] Email confirmation required, showing check-email screen")
        setMode("check-email")
      }
    } catch (err) {
      console.error("[v0] Signup flow error:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      if (!authData.user) {
        throw new Error("Failed to sign in")
      }

      // Get or create profile - user is confirmed so this will work
      const pendingName = sessionStorage.getItem("pending_profile_name")
      const pendingDob = sessionStorage.getItem("pending_profile_dob")
      const userName = pendingName || authData.user.user_metadata?.full_name || ""
      const userDob = pendingDob || authData.user.user_metadata?.date_of_birth || ""

      const { profileId, error: profileError } = await createOrGetProfile(authData.user.id, userName, userDob)

      if (profileError || !profileId) {
        throw new Error(profileError || "Failed to create profile")
      }

      // Clear pending data
      sessionStorage.removeItem("pending_profile_name")
      sessionStorage.removeItem("pending_profile_dob")

      onAuthComplete(authData.user.id, profileId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  if (mode === "check-email") {
    return (
      <div className="space-y-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Click the link in your email to confirm your account, then come back here and sign in.
        </p>
        <div className="pt-4 space-y-3">
          <Button onClick={() => setMode("signin")} className="w-full h-12 rounded-xl btn-glow">
            I&apos;ve confirmed - Sign in
          </Button>
          <Button
            variant="ghost"
            onClick={() => setMode("signup")}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to signup
          </Button>
        </div>
      </div>
    )
  }

  if (mode === "choose") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-4 shadow-lg shadow-primary/20">
            <Shield className="h-7 w-7 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Almost there!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create an account or sign in to complete your {serviceName} request
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleGoogleAuth}
            disabled={isGoogleLoading}
            className="w-full h-12 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm"
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
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button onClick={() => setMode("signup")} className="w-full h-12 rounded-xl btn-glow">
            <Mail className="mr-2 h-4 w-4" />
            Sign up with email
          </Button>

          <Button
            variant="outline"
            onClick={() => setMode("signin")}
            className="w-full h-12 rounded-xl bg-white/50 hover:bg-white/80"
          >
            Already have an account? Sign in
          </Button>
        </div>

        <Button variant="ghost" onClick={onBack} className="w-full text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to questionnaire
        </Button>
      </div>
    )
  }

  if (mode === "signup") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Create your account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your answers are saved - just need your details</p>
        </div>

        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-name" className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Full name
            </Label>
            <Input
              id="signup-name"
              placeholder="John Smith"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
              className="h-11 rounded-xl bg-white/50 border-white/40 focus:border-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-dob" className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Date of birth
            </Label>
            <Input
              id="signup-dob"
              type="date"
              required
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              disabled={isLoading}
              className="h-11 rounded-xl bg-white/50 border-white/40 focus:border-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email" className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email
            </Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-11 rounded-xl bg-white/50 border-white/40 focus:border-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password" className="text-sm font-medium">
              Password
            </Label>
            <Input
              id="signup-password"
              type="password"
              placeholder="At least 6 characters"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-11 rounded-xl bg-white/50 border-white/40 focus:border-primary/50"
            />
          </div>

          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="signup-terms"
              className="mt-0.5 rounded"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              disabled={isLoading}
            />
            <label htmlFor="signup-terms" className="text-xs text-muted-foreground leading-relaxed">
              I agree to the{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl btn-glow">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account & continue"
            )}
          </Button>
        </form>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => setMode("choose")}
            className="flex-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            variant="ghost"
            onClick={() => setMode("signin")}
            className="flex-1 text-muted-foreground hover:text-foreground"
          >
            Have an account? Sign in
          </Button>
        </div>
      </div>
    )
  }

  // Sign in mode
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Welcome back</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to complete your request</p>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSignin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signin-email" className="text-sm font-medium">
            Email
          </Label>
          <Input
            id="signin-email"
            type="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="h-11 rounded-xl bg-white/50 border-white/40 focus:border-primary/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signin-password" className="text-sm font-medium">
            Password
          </Label>
          <Input
            id="signin-password"
            type="password"
            placeholder="Your password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="h-11 rounded-xl bg-white/50 border-white/40 focus:border-primary/50"
          />
        </div>

        <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl btn-glow">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in & continue"
          )}
        </Button>
      </form>

      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={() => setMode("choose")}
          className="flex-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          variant="ghost"
          onClick={() => setMode("signup")}
          className="flex-1 text-muted-foreground hover:text-foreground"
        >
          Need an account? Sign up
        </Button>
      </div>
    </div>
  )
}
