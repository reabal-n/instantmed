"use client"

import { Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'
import { Shield, Clock, CheckCircle } from 'lucide-react'

export const dynamic = "force-dynamic"

function SignInContent() {
  const searchParams = useSearchParams()
  const redirectUrl = searchParams?.get('redirect_url') || searchParams?.get('redirect') || ''
  
  // Build redirect URL with current origin
  const afterSignInUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/auth/callback'
    const currentOrigin = window.location.origin
    
    // Always redirect to /auth/callback after sign-in, which handles role-based redirects
    // Pass the original redirect as a parameter so callback can use it
    return redirectUrl 
      ? `${currentOrigin}/auth/callback?redirect=${encodeURIComponent(redirectUrl)}`
      : `${currentOrigin}/auth/callback`
  }, [redirectUrl])

  const afterSignUpUrl = afterSignInUrl

  return (
    <SignIn
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl={afterSignInUrl}
      afterSignUpUrl={afterSignUpUrl}
      appearance={{
        elements: {
          rootBox: "mx-auto",
          card: "shadow-xl",
        },
      }}
    />
  )
}

export default function SignInPage() {

  // Show loading state while redirecting
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative min-h-screen flex">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
          <div className="max-w-md">
            <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-xl font-bold text-white">I</span>
              </div>
              <span className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                InstantMed
              </span>
            </Link>
            
            <h1 className="text-4xl font-bold text-foreground mb-4 leading-tight">
              Healthcare that actually works
              <span className="text-primary">.</span>
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
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <span>Average review time under 15 minutes</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-violet-500" />
                </div>
                <span>Bank-level encryption for all data</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Loading */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md text-center">
            <Suspense fallback={
              <div className="shadow-xl border border-border/50 bg-card/95 backdrop-blur-sm rounded-2xl p-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-muted rounded-lg w-3/4 mx-auto"></div>
                  <div className="h-4 bg-muted rounded-lg w-1/2 mx-auto"></div>
                  <p className="text-muted-foreground mt-4">Loading...</p>
                </div>
              </div>
            }>
              <SignInContent />
            </Suspense>
            
            {/* Mobile trust strip */}
            <div className="lg:hidden mt-8 flex items-center justify-center gap-4 text-xs text-muted-foreground">
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
    </div>
  )
}
