"use client"

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Clock, CheckCircle, Loader2, Mail, Lock, Eye, EyeOff, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/components/providers/supabase-auth-provider'
import { toast } from 'sonner'
import { GoogleIcon } from '@/components/icons/google-icon'
import { AUTH_ERROR_CODES, getAuthErrorMessage } from '@/lib/auth/error-codes'

export const dynamic = "force-dynamic"

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
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
    } catch {
      setIsGoogleLoading(false)
      toast.error('Failed to sign in with Google')
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter your email and password')
      return
    }

    // Rate limiting: max 5 attempts per minute
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
        setLoginAttempts(0) // Reset on success
        toast.success('Signed in successfully!')
        router.push(redirectUrl || '/patient')
        router.refresh()
      }
    } catch {
      toast.error('An error occurred during sign in')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md">
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

      <div className="shadow-xl border border-border/50 bg-card/95 backdrop-blur-sm rounded-2xl p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
          <p className="text-muted-foreground mt-1">Sign in to your account</p>
        </div>

        {/* Google Sign In */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 text-base font-medium gap-3 mb-6 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm hover:shadow-md transition-all"
          onClick={handleGoogleSignIn}
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
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
          </div>
        </div>

        {/* Email Sign In Form */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
                disabled={isSubmitting || isRateLimited}
                autoFocus
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/auth/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 text-base font-medium bg-primary hover:bg-primary-600 shadow-soft hover:shadow-soft-md" disabled={isSubmitting || isRateLimited}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{' '}
          <Link 
            href={redirectUrl ? `/auth/register?redirect=${encodeURIComponent(redirectUrl)}` : '/auth/register'} 
            className="text-primary-600 hover:text-primary-700 hover:underline font-medium"
          >
            Sign up
          </Link>
        </p>

        {/* Social proof */}
        <div className="mt-6 pt-6 border-t border-border/50">
          <div className="flex items-center justify-center gap-3">
            <div className="flex -space-x-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-linear-to-br from-dawn-400 to-teal-500 border-2 border-white" />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <div className="flex text-dawn-500">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-3 h-3 fill-current" />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">4.9 from 200+ reviews</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative min-h-screen flex">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
          <div className="max-w-md">
            <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-dawn-400 to-dawn-500 flex items-center justify-center shadow-[0_4px_14px_rgb(251,191,36,0.3)]">
                <span className="text-xl font-bold text-amber-950">L</span>
              </div>
              <span className="text-2xl font-bold text-foreground group-hover:text-dawn-600 transition-colors">
                InstantMed
              </span>
            </Link>
            
            <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
              Healthcare that actually works
              <span className="text-dawn-500">.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Medical certificates and prescriptions delivered in under an hour. 
              No waiting rooms, no phone calls.
            </p>
            
            {/* Trust indicators */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <span>AHPRA-registered Australian doctors</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-xl bg-dawn-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-dawn-500" />
                </div>
                <span>Average review time under 15 minutes</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-teal-500" />
                </div>
                <span>Bank-level encryption for all data</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <Suspense fallback={
            <div className="w-full max-w-md shadow-xl border border-border/50 bg-card/95 backdrop-blur-sm rounded-2xl p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-muted rounded-lg w-3/4 mx-auto"></div>
                <div className="h-4 bg-muted rounded-lg w-1/2 mx-auto"></div>
                <p className="text-muted-foreground mt-4 text-center">Loading...</p>
              </div>
            </div>
          }>
            <LoginForm />
          </Suspense>
          
          {/* Mobile trust strip */}
          <div className="lg:hidden absolute bottom-8 left-0 right-0 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" /> Secure
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> AHPRA Doctors
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
