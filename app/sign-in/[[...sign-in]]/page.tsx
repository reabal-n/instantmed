"use client"

import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'
import { Shield, Clock, CheckCircle } from 'lucide-react'
import { Suspense } from 'react'

export const dynamic = "force-dynamic"

function SignInForm() {
  return (
    <div className="w-full min-h-[400px] flex items-center justify-center">
      <SignIn 
        signUpUrl="/sign-up"
        routing="path"
        path="/sign-in"
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-xl border border-border/50 bg-card/95 backdrop-blur-sm rounded-2xl",
            headerTitle: "text-foreground",
            headerSubtitle: "text-muted-foreground",
            formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11",
            formFieldInput: "rounded-xl border-border focus:border-primary focus:ring-primary",
            footerActionLink: "text-primary hover:text-primary/80",
            dividerLine: "bg-border",
            dividerText: "text-muted-foreground",
            socialButtonsBlockButton: "border-border hover:bg-accent rounded-xl h-11 text-base",
            socialButtonsBlockButtonText: "text-foreground font-medium",
            identityPreviewEditButton: "text-primary",
            formFieldLabel: "text-foreground",
            footerActionText: "text-muted-foreground",
          },
          layout: {
            socialButtonsPlacement: "top",
            socialButtonsVariant: "blockButton",
          }
        }}
      />
    </div>
  )
}

function SignInLoading() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="shadow-xl border border-border/50 bg-card/95 backdrop-blur-sm rounded-2xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded-lg w-3/4"></div>
          <div className="h-4 bg-muted rounded-lg w-1/2"></div>
          <div className="space-y-3 pt-4">
            <div className="h-11 bg-muted rounded-xl"></div>
            <div className="h-11 bg-muted rounded-xl"></div>
            <div className="h-11 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
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
        
        {/* Right side - Sign In */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-8">
              <Link href="/" className="inline-flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <span className="text-xl font-bold text-white">I</span>
                </div>
                <span className="text-2xl font-bold text-foreground">InstantMed</span>
              </Link>
            </div>
            
            <Suspense fallback={<SignInLoading />}>
              <SignInForm />
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
