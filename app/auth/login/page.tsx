"use client"

import type React from "react"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button, Input } from "@heroui/react"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { motion, useMotionValue, useTransform } from "framer-motion"
import { Loader2, ShieldCheck, Clock, Star } from "lucide-react"
import { logger } from "@/lib/logger"

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

  // 3D card tilt effect
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useTransform(mouseY, [-300, 300], [8, -8])
  const rotateY = useTransform(mouseX, [-300, 300], [-8, 8])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left - rect.width / 2)
    mouseY.set(e.clientY - rect.top - rect.height / 2)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

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
      logger.debug("Attempting login", { email })

      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        logger.error("Login error", { message: signInError.message })
        throw signInError
      }

      if (!authData.user) {
        throw new Error("Failed to get user after login")
      }

      logger.debug("Login successful, checking profile", {
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
        logger.debug("Profile not found, ensuring it exists")
        const { ensureProfile } = await import("@/app/actions/ensure-profile")
        const { profileId, error: ensureError } = await ensureProfile(
          authData.user.id,
          authData.user.email || ""
        )

        if (ensureError || !profileId) {
          logger.error("Failed to ensure profile", {
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
          logger.error("Failed to fetch profile after creation", { error: fetchError?.message })
          throw new Error("Profile created but could not be retrieved. Please try again.")
        }

        profile = newProfile
        logger.debug("Profile created and ready", {
          role: profile.role,
          onboardingCompleted: profile.onboarding_completed,
        })
      } else {
        profile = existingProfile
      }

      if (!profile) {
        throw new Error("Profile not found. Please contact support.")
      }

      logger.debug("Profile found, redirecting based on role", {
        role: profile.role,
        onboardingCompleted: profile.onboarding_completed,
      })

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
      logger.error("Login failed", { error: err instanceof Error ? err.message : "Unknown error" })
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
      logger.debug("Starting Google OAuth flow")

      const callbackUrl = new URL("/auth/callback", window.location.origin)
      if (redirectTo) {
        callbackUrl.searchParams.set("redirect", redirectTo)
      }

      logger.debug("OAuth callback URL", { url: callbackUrl.toString() })

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      })

      if (error) {
        logger.error("OAuth error", { message: error.message })
        throw error
      }

      // User will be redirected to Google, then back to /auth/callback
    } catch (err) {
      logger.error("Google OAuth failed", { error: err instanceof Error ? err.message : "Unknown error" })
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

          {/* 3D Glass card login form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{ perspective: 1500 }}
          >
            <motion.div
              style={{ rotateX, rotateY }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              whileHover={{ z: 10 }}
              className="relative group"
            >
              {/* Card glow effect */}
              <motion.div 
                className="absolute -inset-[1px] rounded-3xl opacity-0 group-hover:opacity-60 transition-opacity duration-700"
                animate={{
                  boxShadow: [
                    "0 0 15px 3px rgba(0, 226, 181, 0.1)",
                    "0 0 25px 8px rgba(0, 226, 181, 0.15)",
                    "0 0 15px 3px rgba(0, 226, 181, 0.1)"
                  ],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Traveling light beam border */}
              <div className="absolute -inset-[1px] rounded-3xl overflow-hidden">
                {/* Top beam */}
                <motion.div 
                  className="absolute top-0 left-0 h-[2px] w-[40%] bg-gradient-to-r from-transparent via-[#00E2B5] to-transparent opacity-60"
                  animate={{ left: ["-40%", "100%"] }}
                  transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.5 }}
                />
                {/* Right beam */}
                <motion.div 
                  className="absolute top-0 right-0 h-[40%] w-[2px] bg-gradient-to-b from-transparent via-[#06B6D4] to-transparent opacity-60"
                  animate={{ top: ["-40%", "100%"] }}
                  transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.5, delay: 0.75 }}
                />
                {/* Bottom beam */}
                <motion.div 
                  className="absolute bottom-0 right-0 h-[2px] w-[40%] bg-gradient-to-r from-transparent via-[#00E2B5] to-transparent opacity-60"
                  animate={{ right: ["-40%", "100%"] }}
                  transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.5, delay: 1.5 }}
                />
                {/* Left beam */}
                <motion.div 
                  className="absolute bottom-0 left-0 h-[40%] w-[2px] bg-gradient-to-b from-transparent via-[#06B6D4] to-transparent opacity-60"
                  animate={{ bottom: ["-40%", "100%"] }}
                  transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.5, delay: 2.25 }}
                />

                {/* Corner glow spots */}
                <motion.div 
                  className="absolute top-0 right-0 h-2 w-2 rounded-full bg-[#00E2B5]/50 blur-[2px]"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div 
                  className="absolute bottom-0 left-0 h-2 w-2 rounded-full bg-[#06B6D4]/50 blur-[2px]"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
                />
              </div>

              {/* Card border glow on hover */}
              <div className="absolute -inset-[0.5px] rounded-3xl bg-gradient-to-r from-[#00E2B5]/5 via-[#06B6D4]/10 to-[#00E2B5]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Glass card background */}
              <div className="relative glass-card rounded-3xl p-8 border border-white/20 overflow-hidden">
                {/* Subtle inner pattern */}
                <div 
                  className="absolute inset-0 opacity-[0.02]"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 1px)`,
                    backgroundSize: '24px 24px'
                  }}
                />

                <div className="relative z-10">
                  <div className="text-center mb-6">
                    <motion.h1 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-2xl font-bold" 
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Welcome back
                    </motion.h1>
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mt-1 text-sm text-muted-foreground"
                    >
                      Sign in to continue to InstantMed
                    </motion.p>
                  </div>

                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
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
                  </motion.div>

                  <div className="relative my-5 flex items-center">
                    <div className="flex-grow border-t border-foreground/5" />
                    <motion.span 
                      className="mx-3 text-xs text-muted-foreground"
                      animate={{ opacity: [0.6, 0.9, 0.6] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      or
                    </motion.span>
                    <div className="flex-grow border-t border-foreground/5" />
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
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
                        inputWrapper: "h-12 bg-white/50 backdrop-blur-sm border-default-200 hover:border-primary data-[focused=true]:border-primary transition-all duration-300",
                        input: "placeholder:text-default-500",
                      }}
                    />
                    <div className="space-y-2">
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
                          inputWrapper: "h-12 bg-white/50 backdrop-blur-sm border-default-200 hover:border-primary data-[focused=true]:border-primary transition-all duration-300",
                          input: "placeholder:text-default-500",
                        }}
                      />
                      <div className="flex justify-end">
                        <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline font-medium">
                          Forgot password?
                        </Link>
                      </div>
                    </div>

                    {error && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-100"
                      >
                        {error}
                      </motion.p>
                    )}

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="submit"
                        isDisabled={isLoading || isGoogleLoading}
                        isLoading={isLoading}
                        className="w-full h-12 btn-cta"
                        radius="full"
                        spinner={<Loader2 className="h-4 w-4 animate-spin" />}
                      >
                        {isLoading ? "Signing in..." : "Sign in"}
                      </Button>
                    </motion.div>
                  </form>

                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 text-center text-sm text-muted-foreground"
                  >
                    {"New to InstantMed? "}
                    <Link href={registerLink} className="relative inline-block group/signup">
                      <span className="font-semibold text-[#00E2B5] group-hover/signup:text-[#00E2B5]/80 transition-colors">
                        Create an account
                      </span>
                      <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#00E2B5] group-hover/signup:w-full transition-all duration-300" />
                    </Link>
                  </motion.p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
