"use client"

import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, CheckCircle, Clock, Eye, EyeOff,Loader2, Lock, Mail, Shield, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback,useState } from "react"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PATIENT_DASHBOARD_HREF } from '@/lib/dashboard/routes'
import { getPatientCount } from '@/lib/social-proof'
import { createClient } from '@/lib/supabase/client'

export const dynamic = "force-dynamic"

// ─── Google Icon SVG ──────────────────────────────────────────────────
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

// ─── Sign In Form ─────────────────────────────────────────────────────

type FormState = 'idle' | 'loading' | 'success' | 'error'

function SignInForm() {
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect_url') || searchParams.get('redirect') || ''
  const shouldReduceMotion = useReducedMotion()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)

  const supabase = createClient()

  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMessage('Please enter a valid email address.')
      setFormState('error')
      return
    }

    if (!password) {
      setErrorMessage('Please enter your password.')
      setFormState('error')
      return
    }

    setFormState('loading')
    setErrorMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    })

    if (error) {
      if (error.message?.includes('rate') || error.status === 429) {
        setErrorMessage('Too many attempts. Please wait a few minutes.')
      } else if (error.message?.includes('Invalid login credentials')) {
        setErrorMessage('Incorrect email or password.')
      } else {
        setErrorMessage(error.message || 'Something went wrong. Please try again.')
      }
      setFormState('error')
      return
    }

    // Redirect on success
    const next = redirectUrl || PATIENT_DASHBOARD_HREF
    window.location.href = next
  }, [email, password, redirectUrl, supabase.auth])

  const handleGoogleSignIn = useCallback(async () => {
    setGoogleLoading(true)
    setErrorMessage('')

    const redirectTo = `${window.location.origin}/auth/callback${redirectUrl ? `?next=${encodeURIComponent(redirectUrl)}` : ''}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (error) {
      setErrorMessage(error.message || 'Google sign-in failed. Please try again.')
      setFormState('error')
      setGoogleLoading(false)
    }
    // On success, browser redirects - no state update needed
  }, [redirectUrl, supabase.auth])

  return (
    <div className="w-full max-w-md">
      {/* Mobile logo */}
      <div className="lg:hidden text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <Image src="/branding/logo-192.png" alt="InstantMed" width={36} height={36} className="rounded-xl" unoptimized />
          <span className="text-xl font-semibold text-foreground tracking-tight">InstantMed</span>
        </Link>
      </div>

          <motion.div
            key="form"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-2xl p-8"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-1">
                Welcome back
              </h2>
              <p className="text-sm text-muted-foreground">
                Sign in to your account
              </p>
              {/* Mobile-only social proof */}
              <div className="lg:hidden flex items-center justify-center gap-2 mt-3">
                <div className="flex -space-x-1.5">
                  {["SophiaChen", "MarcusWilliams", "AishaPatel"].map((seed) => (
                    <Image
                      key={seed}
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`}
                      alt=""
                      width={22}
                      height={22}
                      className="rounded-full border-2 border-white dark:border-card bg-muted"
                      unoptimized
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {getPatientCount().toLocaleString()}+ Australians
                </span>
                <div className="flex items-center gap-0.5 text-amber-500">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-2.5 h-2.5 fill-current" />)}
                </div>
              </div>
            </div>

            <form onSubmit={handleSignIn} className="space-y-3">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (formState === 'error') {
                    setFormState('idle')
                    setErrorMessage('')
                  }
                }}
                disabled={formState === 'loading'}
                autoComplete="email"
                autoFocus
                startContent={<Mail className="w-4 h-4" />}
              />
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (formState === 'error') {
                      setFormState('idle')
                      setErrorMessage('')
                    }
                  }}
                  isInvalid={formState === 'error' && !!errorMessage}
                  errorMessage={errorMessage}
                  disabled={formState === 'loading'}
                  autoComplete="current-password"
                  startContent={<Lock className="w-4 h-4" />}
                  endContent={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>
              <div className="flex justify-end">
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={formState === 'loading' || !email.trim() || !password}
              >
                {formState === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-card px-3 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Google OAuth */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || formState === 'loading'}
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <GoogleIcon className="w-5 h-5" />
                  Continue with Google
                </>
              )}
            </Button>

          </motion.div>

      {/* Sign up link */}
      <p className="text-sm text-muted-foreground text-center mt-6">
        Don&apos;t have an account?{' '}
        <Link
          href={`/sign-up${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
          className="text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Sign up
        </Link>
      </p>

      {/* Mobile trust strip */}
      <div className="lg:hidden mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" />
        <span>Encrypted &amp; private</span>
        <span>·</span>
        <CheckCircle className="w-3 h-3 text-success" />
        <span>AHPRA-registered doctors</span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function SignInPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <div className="relative min-h-screen flex">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 bg-linear-to-br from-primary/5 to-transparent">
          <div className="max-w-md">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-8 group">
              <Image src="/branding/logo-192.png" alt="InstantMed" width={40} height={40} className="rounded-xl" unoptimized />
              <span className="text-2xl font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
                InstantMed
              </span>
            </Link>

            <h1 className="text-4xl font-semibold text-foreground mb-4 leading-tight">
              Good to have you back<span className="text-primary">.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Medical certificates, prescriptions, and consultations reviewed by Australian doctors - no waiting rooms.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-xl bg-success-light flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <span>AHPRA-registered Australian doctors</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <span>Average review time under 15 minutes</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <span>Your data is always secure and private</span>
              </div>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-card border border-border/50">
              <div className="flex -space-x-2 shrink-0">
                {["SophiaChen", "MarcusWilliams", "AishaPatel", "TomBrennan"].map((seed) => (
                  <Image
                    key={seed}
                    src={`https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`}
                    alt=""
                    width={32}
                    height={32}
                    className="rounded-full border-2 border-white dark:border-card bg-muted"
                    unoptimized
                  />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 text-amber-500 mb-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                  <span className="text-xs font-medium text-foreground ml-1">4.8</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Trusted by <span className="font-medium text-foreground">{getPatientCount().toLocaleString()}+</span> Australians
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Sign-in form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <Suspense fallback={
            <div className="w-full max-w-md">
              <div className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-2xl p-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-muted rounded-lg w-3/4 mx-auto" />
                  <div className="h-4 bg-muted rounded-lg w-1/2 mx-auto" />
                  <div className="h-11 bg-muted rounded-md w-full mt-6" />
                  <div className="h-11 bg-muted rounded-md w-full" />
                </div>
              </div>
            </div>
          }>
            <SignInForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
