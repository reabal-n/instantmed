"use client"

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Clock, CheckCircle, Loader2, Mail, Lock, Eye, EyeOff, User, Star, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/components/providers/supabase-auth-provider'
import { toast } from 'sonner'
import { GoogleIcon } from '@/components/icons/google-icon'

export const dynamic = "force-dynamic"

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

  // Password strength calculation
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
      // Note: If OAuth redirect succeeds, this line won't execute
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
    <div className="w-full max-w-md">
      {/* Mobile logo */}
      <div className="lg:hidden text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-dawn-400 to-dawn-500 flex items-center justify-center shadow-[0_4px_14px_rgb(251,191,36,0.3)]">
            <span className="text-xl font-bold text-amber-950">L</span>
          </div>
          <span className="text-2xl font-bold text-foreground">InstantMed</span>
        </Link>
      </div>

      <div className="shadow-xl border border-border/50 bg-card/95 backdrop-blur-sm rounded-2xl p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground">Create an account</h2>
          <p className="text-muted-foreground mt-1">Get started with InstantMed</p>
        </div>

        {/* Google Sign Up */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 text-base font-medium gap-3 mb-6 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm hover:shadow-md transition-all"
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
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
          </div>
        </div>

        {/* Email Sign Up Form */}
        <form onSubmit={handleEmailSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name (optional)</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="fullName"
                type="text"
                placeholder="John Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 h-12"
                disabled={isSubmitting}
                autoFocus
                autoComplete="name"
              />
            </div>
          </div>

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
                disabled={isSubmitting}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
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
                required
                minLength={6}
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
            {/* Password strength indicator */}
            {password && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= passwordStrength.score ? passwordStrength.color : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{passwordStrength.label}</span>
                  <div className="flex gap-2 text-muted-foreground">
                    <span className={password.length >= 6 ? 'text-emerald-600' : ''}>
                      {password.length >= 6 ? <Check className="w-3 h-3 inline" /> : <X className="w-3 h-3 inline" />} 6+ chars
                    </span>
                  </div>
                </div>
              </div>
            )}
            {!password && <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>}
          </div>

          <Button type="submit" className="w-full h-12 text-base font-medium bg-primary hover:bg-primary-600 shadow-soft hover:shadow-soft-md" disabled={isSubmitting}>
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
            className="text-primary-600 hover:text-primary-700 hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-primary-600 hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-background to-secondary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,var(--tw-gradient-stops))] from-secondary/10 via-transparent to-transparent" />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />
      
      <div className="relative min-h-screen flex">
        {/* Left side - Sign Up */}
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
            <RegisterForm />
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
        
        {/* Right side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 bg-linear-to-br from-primary/5 to-transparent">
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
              Join thousands of Australians
              <span className="text-dawn-500">.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Create your free account and get your first medical certificate 
              or prescription in under an hour.
            </p>
            
            {/* Benefits */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <span>Free account, pay only when you need care</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-xl bg-dawn-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-dawn-500" />
                </div>
                <span>Get reviewed in under 15 minutes</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-teal-500" />
                </div>
                <span>Your data is always secure and private</span>
              </div>
            </div>
            
            {/* Social proof */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card/50 border border-border/50">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-linear-to-br from-dawn-400 to-teal-500 border-2 border-white" />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 text-dawn-500">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Trusted by 10,000+ Australians</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
