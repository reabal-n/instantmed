"use client"

import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { Shield, Clock, CheckCircle, Star } from 'lucide-react'

export const dynamic = "force-dynamic"

export default function SignUpPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-secondary/10 via-transparent to-transparent" />
      
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
            
            <SignUp 
              signInUrl="/sign-in"
              routing="path"
              path="/sign-up"
              forceRedirectUrl="/"
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
        
        {/* Right side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 bg-gradient-to-br from-primary/5 to-transparent">
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
              Join thousands of Australians
              <span className="text-primary">.</span>
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
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <span>Get reviewed in under 15 minutes</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-violet-500" />
                </div>
                <span>Your data is always secure and private</span>
              </div>
            </div>
            
            {/* Social proof */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card/50 border border-border/50">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary border-2 border-white" />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 text-amber-500">
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
