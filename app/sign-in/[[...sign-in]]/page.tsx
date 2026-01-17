"use client"

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Clock, CheckCircle } from 'lucide-react'

export const dynamic = "force-dynamic"

function SignInRedirect() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirectUrl = searchParams.get('redirect_url') || searchParams.get('redirect') || ''
  
  useEffect(() => {
    const next = redirectUrl || undefined
    const url = next ? `/auth/login?redirect=${encodeURIComponent(next)}` : '/auth/login'
    router.replace(url)
  }, [redirectUrl, router])

  return null
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
              <SignInRedirect />
              <div className="shadow-xl border border-border/50 bg-card/95 backdrop-blur-sm rounded-2xl p-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-muted rounded-lg w-3/4 mx-auto"></div>
                  <div className="h-4 bg-muted rounded-lg w-1/2 mx-auto"></div>
                  <p className="text-muted-foreground mt-4">Redirecting to sign in...</p>
                </div>
              </div>
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
