"use client"

import type React from "react"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button, Input } from "@heroui/react"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { TiltCard } from "@/components/shared/tilt-card"
import { Loader2, ShieldCheck, Clock, Star } from "lucide-react"

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

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect")
  const errorParam = searchParams.get("error")

  // Handle URL error params (from OAuth callback)
  useEffect(() => {
    if (errorParam) {
      const details = searchParams.get("details")
      if (errorParam === "profile_creation_failed" && details) {
        setError(`Profile error: ${details}`)
      } else {
        const errorMessages: Record<string, string> = {
          oauth_failed: "Unable to sign in with Google. Please try again.",
          profile_creation_failed: "Unable to create your account. Please try again or contact support.",
          session_expired: "Your session has expired. Please sign in again.",
        }
        setError(errorMessages[errorParam] || "An error occurred. Please try again.")
      }
    }
  }, [errorParam, searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      console.log("[v0] Attempting login for:", email)

      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        console.error("[v0] Login error:", signInError)
        throw signInError
      }

      if (!authData.user) {
        throw new Error("Failed to get user after login")
      }

      console.log("[Login Page] Login successful, checking profile", {
        userId: authData.user.id,
        email: authData.user.email,
      })

      // Check if profile exists, create if missing
      let profile = null
      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("auth_user_id", authData.user.id)
        .single()

      if (profileError || !existingProfile) {
        console.log("[Login Page] Profile not found, ensuring it exists")
        const { ensureProfile } = await import("@/app/actions/ensure-profile")
        const { profileId, error: ensureError } = await ensureProfile(
          authData.user.id,
          authData.user.email || ""
        )

        if (ensureError || !profileId) {
          console.error("[Login Page] Failed to ensure profile:", {
            error: ensureError,
            profileId,
          })
          throw new Error(ensureError || "Profile not found. Please contact support.")
        }

        // Fetch the newly created profile
        const { data: newProfile, error: fetchError } = await supabase
          .from("profiles")
          .select("role, onboarding_completed")
          .eq("auth_user_id", authData.user.id)
          .single()

        if (fetchError || !newProfile) {
          console.error("[Login Page] Failed to fetch profile after creation:", fetchError)
          throw new Error("Profile created but could not be retrieved. Please try again.")
        }

        profile = newProfile
        console.log("[Login Page] Profile created and ready", {
          role: profile.role,
          onboardingCompleted: profile.onboarding_completed,
        })
      } else {
        profile = existingProfile
      }

      if (!profile) {
        throw new Error("Profile not found. Please contact support.")
      }

      console.log("[Login Page] Profile found", {
        role: profile.role,
        onboardingCompleted: profile.onboarding_completed,
      })

      console.log("[v0] Profile found, redirecting based on role:", profile.role)

      if (profile.role === "patient") {
        if (!profile.onboarding_completed) {
          const onboardingRedirect = redirectTo || "/patient"
          router.push(`/patient/onboarding?redirect=${encodeURIComponent(onboardingRedirect)}`)
        } else if (redirectTo) {
          router.push(redirectTo)
        } else {
          router.push("/patient")
        }
      } else if (profile.role === "doctor") {
        router.push("/doctor")
      } else {
        router.push("/")
      }

      router.refresh()
    } catch (err) {
      console.error("[v0] Login failed:", err)
      setError(err instanceof Error ? err.message : "An error occurred during login")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      console.log("[v0] Starting Google OAuth flow")

      const callbackUrl = new URL("/auth/callback", window.location.origin)
      if (redirectTo) {
        callbackUrl.searchParams.set("redirect", redirectTo)
      }

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

  const registerLink = redirectTo ? `/auth/register?redirect=${encodeURIComponent(redirectTo)}` : "/auth/register"

  return (
    <div className="flex min-h-screen flex-col bg-hero">
      <Navbar variant="marketing" />

      <main className="flex flex-1 items-center justify-center px-4 py-16 pt-32">
        {/* Decorative orbs */}
        <div className="hero-orb hero-orb-mint w-[400px] h-[400px] top-1/4 left-1/4 opacity-40" />
        <div className="hero-orb hero-orb-cyan w-[300px] h-[300px] bottom-1/4 right-1/4 opacity-30" />

        <div className="relative w-full max-w-md">
          {/* Trust indicators above form */}
          <div
            className="flex items-center justify-center gap-4 mb-6 text-xs text-muted-foreground animate-fade-in-up opacity-0"
            style={{ animationDelay: "0s", animationFillMode: "forwards" }}
          >
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[#00E2B5]" />
              Secure
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-[#06B6D4]" />
              2min setup
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-[#F59E0B] fill-[#F59E0B]" />
              4.9/5
            </span>
          </div>

          {/* Glass card login form */}
          <TiltCard
            className="glass-card rounded-3xl p-8 animate-scale-in opacity-0"
            style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
          >
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">Sign in to continue to InstantMed</p>
            </div>

            <Button
              type="button"
              variant="bordered"
              onPress={handleGoogleLogin}
              isDisabled={isGoogleLoading || isLoading}
              className="w-full h-12 bg-white hover:bg-gray-50 border-gray-200 text-gray-700 font-medium mb-4 shadow-sm"
              radius="lg"
            >
              {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon className="mr-2 h-5 w-5" />
              )}
              Continue with Google
            </Button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#0A0F1C]/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white/80 text-muted-foreground rounded-full">or use email</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                isRequired
                value={email}
                onValueChange={setEmail}
                isDisabled={isLoading || isGoogleLoading}
                variant="bordered"
                radius="lg"
                classNames={{
                  inputWrapper: "h-12 bg-white/50 backdrop-blur-sm border-default-200 hover:border-primary data-[focused=true]:border-primary",
                }}
              />
              <div className="space-y-2">
                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  isRequired
                  value={password}
                  onValueChange={setPassword}
                  isDisabled={isLoading || isGoogleLoading}
                  variant="bordered"
                  radius="lg"
                  classNames={{
                    inputWrapper: "h-12 bg-white/50 backdrop-blur-sm border-default-200 hover:border-primary data-[focused=true]:border-primary",
                  }}
                />
                <div className="flex justify-end">
                  <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100">{error}</p>
              )}

              <Button
                type="submit"
                isDisabled={isLoading || isGoogleLoading}
                isLoading={isLoading}
                color="primary"
                className="w-full h-12 font-semibold"
                radius="lg"
                spinner={<Loader2 className="h-4 w-4 animate-spin" />}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {"New to InstantMed? "}
              <Link href={registerLink} className="font-semibold text-[#00E2B5] hover:underline">
                Create an account
              </Link>
            </p>
          </TiltCard>
        </div>
      </main>

      <Footer />
    </div>
  )
}
