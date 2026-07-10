"use client"

import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, CheckCircle, Clock, Eye, EyeOff, Loader2, Lock, Mail, Shield, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from "react"

import { GoogleIcon } from "@/components/icons/google-icon"
import { BrandLogo } from "@/components/shared/brand-logo"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPostAuthRedirectParam } from '@/lib/auth/redirects'
import { type SignInFieldErrors, validateSignInCredentials } from '@/lib/auth/sign-in-validation'
import { buildPostSignInRedirectHref } from '@/lib/navigation/auth-handoff'
import { createClient } from '@/lib/supabase/client'

export const dynamic = "force-dynamic"

const LAST_MAGIC_LINK_EMAIL_KEY = "instantmed:last-magic-link-email"
const MAGIC_LINK_RESEND_COOLDOWN_MS = 30 * 1000
const MAGIC_LINK_COOLDOWN_MESSAGE = "Give it 30 seconds before sending another link."
const trustMarks = [
  { icon: Shield, className: "bg-primary/10 text-primary" },
  { icon: CheckCircle, className: "bg-success-light text-success" },
  { icon: Lock, className: "bg-brand-coral/10 text-brand-coral" },
] as const

// ─── Sign In Form ─────────────────────────────────────────────────────

type FormState = 'idle' | 'loading' | 'success' | 'error'

function SignInForm() {
  const searchParams = useSearchParams()
  const redirectUrl = getPostAuthRedirectParam(
    searchParams,
    '',
    typeof window !== 'undefined' ? window.location.origin : undefined,
  )
  const authError = searchParams.get('auth_error')
  const linkExpired = authError === 'link_expired'
  const shouldReduceMotion = useReducedMotion()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formState, setFormState] = useState<FormState>('idle')
  const [fieldErrors, setFieldErrors] = useState<SignInFieldErrors>({ email: '', password: '' })
  const [authErrorMessage, setAuthErrorMessage] = useState('')
  const [googleErrorMessage, setGoogleErrorMessage] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [emailLinkLoading, setEmailLinkLoading] = useState(false)
  const [emailLinkSent, setEmailLinkSent] = useState(false)
  const [emailLinkErrorMessage, setEmailLinkErrorMessage] = useState('')
  const [lastMagicLinkSentAt, setLastMagicLinkSentAt] = useState<number | null>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  useEffect(() => {
    if (!linkExpired || email) return

    try {
      const lastMagicLinkEmail = sessionStorage.getItem(LAST_MAGIC_LINK_EMAIL_KEY)
      if (lastMagicLinkEmail) {
        setEmail(lastMagicLinkEmail)
      }
    } catch {
      // Browsers may block storage in private contexts. The field remains editable.
    }
  }, [email, linkExpired])

  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmed = email.trim().toLowerCase()
    const validationErrors = validateSignInCredentials(email, password)

    if (validationErrors.email || validationErrors.password) {
      setFieldErrors(validationErrors)
      setAuthErrorMessage('')
      setFormState('error')

      if (validationErrors.email) {
        emailInputRef.current?.focus()
      } else {
        passwordInputRef.current?.focus()
      }

      return
    }

    setFormState('loading')
    setFieldErrors({ email: '', password: '' })
    setAuthErrorMessage('')
    setEmailLinkErrorMessage('')
    setGoogleErrorMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    })

    if (error) {
      if (error.message?.includes('rate') || error.status === 429) {
        setAuthErrorMessage('Too many attempts. Please wait a few minutes.')
      } else if (error.message?.includes('Invalid login credentials')) {
        // Many accounts are Google-/link-only and have no password, so a flat
        // "incorrect password" dead-ends them. Point at the other options without
        // confirming whether the account exists (avoids account enumeration).
        setAuthErrorMessage('Incorrect email or password. If you signed up with Google or a sign-in link, use one of the options below.')
      } else {
        setAuthErrorMessage(error.message || 'Something went wrong. Please try again.')
      }
      setFormState('error')
      return
    }

    // Hard nav fires synchronously before Supabase's onAuthStateChange microtask
    // can deliver SIGNED_IN to SupabaseAuthProvider's router.refresh(). By the
    // time the auth event propagates the browser has already navigated away, so
    // the hard nav / soft nav conflict that affects PostSignInAuthWaiter cannot
    // occur here.
    window.location.assign(buildPostSignInRedirectHref(redirectUrl))
  }, [email, password, redirectUrl, supabase.auth])

  const handleGoogleSignIn = useCallback(async () => {
    setGoogleLoading(true)
    setAuthErrorMessage('')
    setEmailLinkErrorMessage('')
    setGoogleErrorMessage('')

    const redirectTo = `${window.location.origin}/auth/callback${redirectUrl ? `?next=${encodeURIComponent(redirectUrl)}` : ''}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (error) {
      setGoogleErrorMessage('Google sign-in failed. Try again.')
      setGoogleLoading(false)
    }
    // On success, browser redirects - no state update needed
  }, [redirectUrl, supabase.auth])

  const handleEmailLinkSignIn = useCallback(async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailLinkSent(false)
      setEmailLinkErrorMessage('Please enter a valid email address.')
      return
    }

    if (lastMagicLinkSentAt && Date.now() - lastMagicLinkSentAt < MAGIC_LINK_RESEND_COOLDOWN_MS) {
      setEmailLinkErrorMessage(MAGIC_LINK_COOLDOWN_MESSAGE)
      return
    }

    setEmailLinkLoading(true)
    setAuthErrorMessage('')
    setEmailLinkErrorMessage('')
    setGoogleErrorMessage('')

    const redirectTo = `${window.location.origin}/auth/callback${redirectUrl ? `?next=${encodeURIComponent(redirectUrl)}` : ''}`

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: false,
      },
    })

    if (error?.message?.includes('rate') || error?.status === 429) {
      setEmailLinkSent(false)
      setEmailLinkErrorMessage('Too many attempts. Please wait a few minutes.')
      setEmailLinkLoading(false)
      return
    }

    if (error) {
      setEmailLinkSent(false)
      setEmailLinkErrorMessage("We couldn't send that link. Try again.")
      setEmailLinkLoading(false)
      return
    }

    setFormState('idle')
    setEmailLinkSent(true)
    setLastMagicLinkSentAt(Date.now())
    setEmailLinkErrorMessage('')
    try {
      sessionStorage.setItem(LAST_MAGIC_LINK_EMAIL_KEY, trimmed)
    } catch {
      // Non-critical: expired-link recovery just falls back to manual entry.
    }
    setEmailLinkLoading(false)
  }, [email, lastMagicLinkSentAt, redirectUrl, supabase.auth])

  const handleChangeMagicLinkEmail = useCallback(() => {
    setEmailLinkSent(false)
    setEmailLinkErrorMessage('')
    setLastMagicLinkSentAt(null)
    requestAnimationFrame(() => {
      emailInputRef.current?.focus()
    })
  }, [])

  return (
    <div className="w-full max-w-md">
          <motion.div
            key="form"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-2xl p-8"
          >
            {/* Wordmark anchors the form to InstantMed so it doesn't read as a generic auth page. */}
            <div className="flex justify-center mb-5">
              <BrandLogo size="md" />
            </div>
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-1">
                Welcome back
              </h2>
              <p className="text-sm text-muted-foreground">
                Sign in to your account
              </p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-3">
              {linkExpired && (
                <div className="flex items-start gap-3 rounded-xl border border-warning-border bg-warning-light px-4 py-3 text-sm text-warning">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    That sign-in link expired. Enter your email and we&apos;ll send a fresh one.
                  </p>
                </div>
              )}
              <Input
                label="Email address"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setFieldErrors((current) => ({ ...current, email: '' }))
                  setAuthErrorMessage('')
                  setEmailLinkSent(false)
                  setEmailLinkErrorMessage('')
                  setLastMagicLinkSentAt(null)
                  setGoogleErrorMessage('')
                  if (formState === 'error') {
                    setFormState('idle')
                  }
                }}
                isInvalid={Boolean(fieldErrors.email)}
                errorMessage={fieldErrors.email}
                disabled={formState === 'loading'}
                autoComplete="email"
                autoFocus
                ref={emailInputRef}
                startContent={<Mail className="w-4 h-4" aria-hidden="true" />}
              />
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setFieldErrors((current) => ({ ...current, password: '' }))
                    setAuthErrorMessage('')
                    if (formState === 'error') {
                      setFormState('idle')
                    }
                  }}
                  isInvalid={Boolean(fieldErrors.password)}
                  errorMessage={fieldErrors.password}
                  disabled={formState === 'loading'}
                  autoComplete="current-password"
                  ref={passwordInputRef}
                  startContent={<Lock className="w-4 h-4" aria-hidden="true" />}
                  endContent={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  }
                />
              </div>
              {authErrorMessage && (
                <div
                  className="rounded-xl border border-destructive-border bg-destructive-light px-4 py-3 text-sm text-destructive"
                  role="alert"
                  aria-live="polite"
                >
                  {authErrorMessage}
                </div>
              )}
              <div className="flex justify-end pt-1">
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
                disabled={formState === 'loading' || emailLinkLoading}
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

            {emailLinkSent && (
              <div className="mb-3 rounded-xl border border-success-border bg-success-light px-4 py-3 text-sm text-success">
                <p className="font-medium">
                  Secure link sent{email.trim() ? ` to ${email.trim().toLowerCase()}` : ''}.
                </p>
                <p className="mt-1 text-xs text-success/80">
                  Use the newest link if a few arrive.
                </p>
                <button
                  type="button"
                  onClick={handleChangeMagicLinkEmail}
                  className="mt-2 text-xs font-medium text-success underline underline-offset-4 hover:text-success/80"
                >
                  Wrong email?
                </button>
              </div>
            )}

            {emailLinkErrorMessage && (
              <div
                className="mb-3 rounded-xl border border-destructive-border bg-destructive-light px-4 py-3 text-sm text-destructive"
                role="alert"
                aria-live="polite"
              >
                {emailLinkErrorMessage}
              </div>
            )}

            {googleErrorMessage && (
              <div
                className="mb-3 rounded-xl border border-destructive-border bg-destructive-light px-4 py-3 text-sm text-destructive"
                role="alert"
                aria-live="polite"
              >
                {googleErrorMessage}
              </div>
            )}

            {/* Google OAuth — kept as a button for the OAuth affordance.
                Magic-link demoted to a text link below: returning users want
                one obvious path (email + password), with a quiet escape hatch
                for the "I forgot my password and can't be bothered" case. */}
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

            <p className="mt-4 text-center text-xs text-muted-foreground">
              {emailLinkSent ? (
                <>
                  Sign-in link sent. Didn&apos;t arrive?{' '}
                  <button
                    type="button"
                    onClick={handleEmailLinkSignIn}
                    disabled={formState === 'loading' || emailLinkLoading || !email.trim()}
                    className="font-medium text-primary hover:text-primary/80 underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                  >
                    Resend
                  </button>
                </>
              ) : (
                <>
                  Prefer not to type a password?{' '}
                  <button
                    type="button"
                    onClick={handleEmailLinkSignIn}
                    disabled={formState === 'loading' || emailLinkLoading || !email.trim()}
                    className="font-medium text-primary hover:text-primary/80 underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                  >
                    Email me a sign-in link
                  </button>
                </>
              )}
            </p>

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
                <span>Review follows when a doctor is available</span>
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
                {trustMarks.map(({ icon: Icon, className }, index) => (
                  <span
                    key={index}
                    className={`grid h-8 w-8 place-items-center rounded-full border-2 border-white dark:border-card ${className}`}
                    aria-hidden="true"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 text-amber-500 mb-0.5" role="img" aria-label="Google star rating">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Reviewed by <span className="font-medium text-foreground">AHPRA-registered</span> Australian doctors
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
