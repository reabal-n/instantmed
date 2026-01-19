"use client"

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Shield, Clock, CheckCircle, Loader2, Eye, EyeOff, Star, BadgeCheck } from 'lucide-react'
// Native buttons used for reliable form handling
import { useAuth } from '@/components/providers/supabase-auth-provider'
import { toast } from 'sonner'
import { GoogleIcon } from '@/components/icons/google-icon'
import { AUTH_ERROR_CODES, getAuthErrorMessage } from '@/lib/auth/error-codes'
import { BrandLogo } from '@/components/shared/brand-logo'
import { getFeaturedTestimonials, PLATFORM_STATS } from '@/lib/data/testimonials'

export const dynamic = "force-dynamic"

const featuredReviews = getFeaturedTestimonials().slice(0, 3)

function LoginForm() {
  const searchParams = useSearchParams()
  const redirectUrl = searchParams?.get('redirect_url') || searchParams?.get('redirect') || ''
  const error = searchParams?.get('error')
  const errorDetails = searchParams?.get('details')
  
  const { signInWithGoogle, signInWithEmail, isLoading } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [isRateLimited, setIsRateLimited] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle(redirectUrl || undefined)
    } catch (err) {
      setIsGoogleLoading(false)
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google'
      // eslint-disable-next-line no-console -- Intentional: auth errors need visibility for debugging
      console.error('[Auth] Google sign-in error:', err)
      toast.error(errorMessage)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter your email and password')
      return
    }

    if (isRateLimited) {
      toast.error('Too many attempts. Please wait a moment.')
      return
    }

    if (loginAttempts >= 5) {
      setIsRateLimited(true)
      toast.error('Too many login attempts. Please wait 60 seconds.')
      setTimeout(() => {
        setLoginAttempts(0)
        setIsRateLimited(false)
      }, 60000)
      return
    }

    setIsSubmitting(true)
    setLoginAttempts(prev => prev + 1)
    try {
      const { error } = await signInWithEmail(email, password)
      if (error) {
        toast.error(error.message || 'Invalid email or password')
      } else {
        setLoginAttempts(0)
        toast.success('Signed in successfully!')
        window.location.href = redirectUrl || '/patient'
      }
    } catch {
      toast.error('An error occurred during sign in')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-[420px]">
      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error === AUTH_ERROR_CODES.PROFILE_CREATION_FAILED && errorDetails ? (
            <div>
              <p>{getAuthErrorMessage(error)}</p>
              <p className="mt-2 text-xs opacity-75">Details: {decodeURIComponent(errorDetails)}</p>
            </div>
          ) : (
            getAuthErrorMessage(error)
          )}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Sign in to continue to your account</p>
        </div>

        {/* Google Sign In - Primary CTA */}
        <button
          type="button"
          className="w-full h-12 text-base font-medium gap-3 mb-6 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-foreground rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleGoogleSignIn}
          disabled={isLoading || isSubmitting || isGoogleLoading}
        >
          {isGoogleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <GoogleIcon className="w-5 h-5" />
          )}
          <span className="ml-3">{isGoogleLoading ? 'Connecting...' : 'Continue with Google'}</span>
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200 dark:border-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-3 text-muted-foreground font-medium">or</span>
          </div>
        </div>

        {/* Email Sign In Form */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              disabled={isSubmitting || isRateLimited}
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Link href="/auth/forgot-password" className="text-sm text-primary hover:text-primary/80 transition-colors">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                disabled={isSubmitting}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center" 
            disabled={isSubmitting || isRateLimited}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{' '}
          <Link 
            href={redirectUrl ? `/auth/register?redirect=${encodeURIComponent(redirectUrl)}` : '/auth/register'} 
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Create account
          </Link>
        </p>

        {/* Social proof with real avatars */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {featuredReviews.map((review, i) => (
                <div key={review.id} className="relative">
                  {review.image ? (
                    <Image
                      src={review.image}
                      alt={review.name}
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 bg-linear-to-br from-primary to-primary/70 flex items-center justify-center text-[10px] font-medium text-white">
                      {review.name.charAt(0)}
                    </div>
                  )}
                  {i === 0 && (
                    <BadgeCheck className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-emerald-500 fill-white" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {PLATFORM_STATS.averageRating} from {PLATFORM_STATS.totalReviews.toLocaleString()}+ reviews
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="min-h-screen flex">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-[45%] bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 items-center justify-center p-12 relative overflow-hidden">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 max-w-lg">
            <BrandLogo size="lg" className="mb-10" href="/" />
            
            <h1 className="text-4xl font-semibold text-white mb-4 leading-tight tracking-tight">
              Your health, on your schedule.
            </h1>
            <p className="text-lg text-slate-300 mb-10 leading-relaxed">
              Medical certificates and repeat prescriptions reviewed by Australian doctors. 
              Most requests completed within the hour.
            </p>
            
            {/* Trust indicators */}
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <span className="text-white font-medium">AHPRA-registered doctors</span>
                  <p className="text-slate-400 text-sm">Every request reviewed by a licensed Australian GP</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <span className="text-white font-medium">Fast turnaround</span>
                  <p className="text-slate-400 text-sm">Average review time under {PLATFORM_STATS.averageResponseMinutes} minutes</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <span className="text-white font-medium">Bank-grade security</span>
                  <p className="text-slate-400 text-sm">Your health data is encrypted and protected</p>
                </div>
              </div>
            </div>

            {/* Featured testimonial */}
            {featuredReviews[0] && (
              <div className="mt-12 p-5 rounded-xl bg-white/5 border border-white/10">
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  &ldquo;{featuredReviews[0].text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  {featuredReviews[0].image && (
                    <Image
                      src={featuredReviews[0].image}
                      alt={featuredReviews[0].name}
                      width={36}
                      height={36}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="text-white text-sm font-medium">{featuredReviews[0].name}</p>
                    <p className="text-slate-400 text-xs">{featuredReviews[0].location}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          {/* Mobile logo */}
          <div className="lg:hidden absolute top-6 left-6">
            <BrandLogo size="sm" href="/" />
          </div>
          
          <Suspense fallback={
            <div className="w-full max-w-[420px] bg-white dark:bg-slate-900 shadow-2xl rounded-2xl p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-muted rounded-lg w-3/4 mx-auto"></div>
                <div className="h-4 bg-muted rounded-lg w-1/2 mx-auto"></div>
              </div>
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>
      </div>
      
      {/* Mobile trust strip */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 py-3 px-4">
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-500" /> 
            <span>Secure</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> 
            <span>AHPRA Doctors</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" /> 
            <span>Fast</span>
          </span>
        </div>
      </div>
    </div>
  )
}
