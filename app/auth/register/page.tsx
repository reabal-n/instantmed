"use client"

import type React from "react"
import Link from "next/link"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button, Input, Checkbox } from "@heroui/react"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { TiltCard } from "@/components/shared/tilt-card"
import { PasswordStrength } from "@/components/ui/password-strength"
import { PasswordConfirmation } from "@/components/ui/password-confirmation"
import { Loader2, Shield, Clock, CheckCircle } from "lucide-react"

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
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect")

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
    setError(null)

    const supabase = createClient()

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
        let profileId: string
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
          
          profileId = result.profileId
        } catch (profileError) {
          console.error("[Register] Profile creation failed:", profileError)
          throw profileError instanceof Error ? profileError : new Error("Failed to create profile")
        }

        const onboardingRedirect = redirectTo || "/patient"
        router.push(`/patient/onboarding?redirect=${encodeURIComponent(onboardingRedirect)}`)
        router.refresh()
      } else {
        // Email confirmation required - profile will be created after confirmation
        router.push("/auth/check-email")
      }
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
              <Input
                placeholder="Full name"
                isRequired
                value={fullName}
                onValueChange={setFullName}
                isDisabled={isLoading || isGoogleLoading}
                variant="bordered"
                radius="lg"
                classNames={{
                  inputWrapper: "h-11 bg-white/50 backdrop-blur-sm border-default-200 hover:border-primary data-[focused=true]:border-primary",
                  input: "placeholder:text-default-500",
                }}
              />
              <Input
                placeholder="Date of birth"
                type="date"
                isRequired
                value={dateOfBirth}
                onValueChange={setDateOfBirth}
                isDisabled={isLoading || isGoogleLoading}
                variant="bordered"
                radius="lg"
                classNames={{
                  inputWrapper: "h-11 bg-white/50 backdrop-blur-sm border-default-200 hover:border-primary data-[focused=true]:border-primary",
                  input: "placeholder:text-default-500",
                }}
              />
              <Input
                type="email"
                placeholder="Email"
                isRequired
                value={email}
                onValueChange={setEmail}
                isDisabled={isLoading || isGoogleLoading}
                variant="bordered"
                radius="lg"
                classNames={{
                  inputWrapper: "h-11 bg-white/50 backdrop-blur-sm border-default-200 hover:border-primary data-[focused=true]:border-primary",
                  input: "placeholder:text-default-500",
                }}
              />
              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="Password"
                  isRequired
                  value={password}
                  onValueChange={setPassword}
                  isDisabled={isLoading || isGoogleLoading}
                  variant="bordered"
                  radius="lg"
                  classNames={{
                    inputWrapper: "h-11 bg-white/50 backdrop-blur-sm border-default-200 hover:border-primary data-[focused=true]:border-primary",
                    input: "placeholder:text-default-500",
                  }}
                />
                <PasswordStrength password={password} />
                <PasswordConfirmation
                  password={password}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                />
              </div>
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
