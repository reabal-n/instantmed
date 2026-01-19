"use client"

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Shield, Clock, CheckCircle, Loader2, Eye, EyeOff, Star, Check, X, BadgeCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/supabase-auth-provider'
import { toast } from 'sonner'
import { GoogleIcon } from '@/components/icons/google-icon'
import { BrandLogo } from '@/components/shared/brand-logo'
import { getFeaturedTestimonials, PLATFORM_STATS } from '@/lib/data/testimonials'

export const dynamic = "force-dynamic"

const featuredReviews = getFeaturedTestimonials().slice(0, 4)

function RegisterForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirectUrl = searchParams?.get('redirect_url') || searchParams?.get('redirect') || ''
  
  const { signInWithGoogle, signUpWithEmail, isLoading } = useAuth()
  
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: '' }
    let score = 0
    if (pass.length >= 6) score++
    if (pass.length >= 8) score++
    if (/[A-Z]/.test(pass)) score++
    if (/[0-9]/.test(pass)) score++
    if (/[^A-Za-z0-9]/.test(pass)) score++
    
    if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' }
    if (score <= 2) return { score, label: 'Fair', color: 'bg-orange-500' }
    if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-500' }
    return { score, label: 'Strong', color: 'bg-emerald-500' }
  }

  const passwordStrength = getPasswordStrength(password)

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle(redirectUrl || undefined)
    } catch (err) {
      setIsGoogleLoading(false)
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign up with Google'
      // eslint-disable-next-line no-console -- Intentional: auth errors need visibility for debugging
      console.error('[Auth] Google sign-up error:', err)
      toast.error(errorMessage)
    }
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter your email and password')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await signUpWithEmail(email, password, { full_name: fullName || undefined })
      if (error) {
        toast.error(error.message || 'Failed to create account')
      } else {
        toast.success('Account created! Please check your email to verify.')
        router.push('/auth/login?message=check_email')
      }
    } catch {
      toast.error('An error occurred during registration')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-[420px]">
      <div className="bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Create an account</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Get started in under 2 minutes</p>
        </div>

        {/* Google Sign Up - Primary CTA */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 text-base font-medium gap-3 mb-6 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-foreground rounded-xl shadow-sm hover:shadow transition-all"
          onClick={handleGoogleSignUp}
          disabled={isLoading || isSubmitting || isGoogleLoading}
        >
          {isGoogleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <GoogleIcon className="w-5 h-5" />
          )}
          {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
        </Button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200 dark:border-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-3 text-muted-foreground font-medium">or</span>
          </div>
        </div>

        {/* Email Sign Up Form */}
        <form onSubmit={handleEmailSignUp} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-sm font-medium text-foreground">
              Full name <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="fullName"
              type="text"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              disabled={isSubmitting}
              autoFocus
              autoComplete="name"
            />
          </div>

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
              disabled={isSubmitting}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                disabled={isSubmitting}
                required
                minLength={6}
                autoComplete="new-password"
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
            {/* Password strength indicator */}
            {password && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= passwordStrength.score ? passwordStrength.color : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{passwordStrength.label}</span>
                  <span className={password.length >= 6 ? 'text-emerald-600' : 'text-muted-foreground'}>
                    {password.length >= 6 ? <Check className="w-3 h-3 inline mr-1" /> : <X className="w-3 h-3 inline mr-1" />}
                    6+ characters
                  </span>
                </div>
              </div>
            )}
            {!password && <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>}
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-medium rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link 
            href={redirectUrl ? `/auth/login?redirect=${encodeURIComponent(redirectUrl)}` : '/auth/login'} 
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-primary hover:underline">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="min-h-screen flex">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-[45%] bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 max-w-lg">
            <BrandLogo size="lg" className="mb-10" href="/" />
            
            <h1 className="text-4xl font-semibold text-white mb-4 leading-tight tracking-tight">
              Join thousands of Australians.
            </h1>
            <p className="text-lg text-slate-300 mb-10 leading-relaxed">
              Create your free account and get your first medical certificate 
              or repeat prescription reviewed within the hour.
            </p>
            
            {/* Benefits */}
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <span className="text-white font-medium">Free to sign up</span>
                  <p className="text-slate-400 text-sm">Pay only when you need care</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <span className="text-white font-medium">Fast turnaround</span>
                  <p className="text-slate-400 text-sm">Most requests reviewed under {PLATFORM_STATS.averageResponseMinutes} minutes</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <span className="text-white font-medium">Your data is protected</span>
                  <p className="text-slate-400 text-sm">Bank-grade encryption on all health information</p>
                </div>
              </div>
            </div>

            {/* Social proof with real avatars */}
            <div className="mt-12 p-5 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {featuredReviews.map((review, i) => (
                    <div key={review.id} className="relative">
                      {review.image ? (
                        <Image
                          src={review.image}
                          alt={review.name}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full border-2 border-slate-800 object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full border-2 border-slate-800 bg-linear-to-br from-primary to-primary/70 flex items-center justify-center text-xs font-medium text-white">
                          {review.name.charAt(0)}
                        </div>
                      )}
                      {i === 0 && (
                        <BadgeCheck className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 text-emerald-400 fill-slate-800" />
                      )}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-300">
                    Trusted by {Math.floor(PLATFORM_STATS.totalPatientsHelped / 1000)}k+ Australians
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Sign Up Form */}
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
            <RegisterForm />
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
            <span>Free to join</span>
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
