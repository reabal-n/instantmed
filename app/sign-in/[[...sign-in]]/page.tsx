"use client"

import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, CheckCircle, Clock, Eye, EyeOff, Loader2, Lock, Mail, Shield, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from "react"

import { GoogleIcon } from "@/components/icons/google-icon"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPostAuthRedirectParam } from '@/lib/auth/redirects'
import { getPatientCount } from '@/lib/social-proof'
import { createClient } from '@/lib/supabase/client'

export const dynamic = "force-dynamic"

const LAST_MAGIC_LINK_EMAIL_KEY = "instantmed:last-magic-link-email"
const MAGIC_LINK_RESEND_COOLDOWN_MS = 30 * 1000
const MAGIC_LINK_COOLDOWN_MESSAGE = "Give it 30 seconds before sending another link."

// ─── Sign In Form ─────────────────────────────────────────────────────

type FormState = 'idle' | 'loading' | 'success' | 'error'

function buildPostSignInHref(redirectUrl: string) {
  if (redirectUrl.startsWith("/auth/post-signin") && !redirectUrl.startsWith("//")) {
    return redirectUrl
  }
  if (redirectUrl.startsWith("/") && !redirectUrl.startsWith("//")) {
    return `/auth/post-signin?redirect=${encodeURIComponent(redirectUrl)}`
  }
  return "/auth/post-signin"
}

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
  const [errorMessage, setErrorMessage] = useState('')
  const [googleErrorMessage, setGoogleErrorMessage] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [emailLinkLoading, setEmailLinkLoading] = useState(false)
  const [emailLinkSent, setEmailLinkSent] = useState(false)
  const [emailLinkErrorMessage, setEmailLinkErrorMessage] = useState('')
  const [lastMagicLinkSentAt, setLastMagicLinkSentAt] = useState<number | null>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)

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
    setEmailLinkErrorMessage('')
    setGoogleErrorMessage('')

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

    window.location.assign(buildPostSignInHref(redirectUrl))
  }, [email, password, redirectUrl, supabase.auth])

  const handleGoogleSignIn = useCallback(async () => {
    setGoogleLoading(true)
    setErrorMessage('')
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
    setErrorMessage('')
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
              {linkExpired && (
                <div className="flex items-start gap-3 rounded-xl border border-warning-border bg-warning-light px-4 py-3 text-sm text-warning">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    That sign-in link expired. Enter your email and we&apos;ll send a fresh one.
                  </p>
                </div>
              )}
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setEmailLinkSent(false)
                  setEmailLinkErrorMessage('')
                  setLastMagicLinkSentAt(null)
                  setGoogleErrorMessage('')
                  if (formState === 'error') {
                    setFormState('idle')
                    setErrorMessage('')
                  }
                }}
                disabled={formState === 'loading'}
                autoComplete="email"
                autoFocus
                ref={emailInputRef}
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
                disabled={formState === 'loading' || emailLinkLoading || !email.trim() || !password}
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

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full mb-3"
              onClick={handleEmailLinkSignIn}
              disabled={formState === 'loading' || emailLinkLoading || !email.trim()}
            >
              {emailLinkLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  {emailLinkSent ? 'Send another sign-in link' : 'Email me a sign-in link'}
                </>
              )}
            </Button>

            {googleErrorMessage && (
              <div
                className="mb-3 rounded-xl border border-destructive-border bg-destructive-light px-4 py-3 text-sm text-destructive"
                role="alert"
                aria-live="polite"
              >
                {googleErrorMessage}
              </div>
            )}

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
