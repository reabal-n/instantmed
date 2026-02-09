"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Card } from "@/components/ui/card"
import { Check, Loader2 } from "lucide-react"
import { Confetti } from "@/components/ui/confetti"

export function CompleteAccountForm({
  intakeId,
  email,
}: {
  intakeId?: string
  email?: string
  /** @deprecated sessionId is kept for backwards compatibility but no longer used */
  sessionId?: string
}) {
  const router = useRouter()
  const { isSignedIn, isLoaded } = useUser()

  const [showConfetti, setShowConfetti] = useState(false)
  
  useEffect(() => {
    // If already signed in, redirect through post-signin to ensure profile is linked
    if (isLoaded && isSignedIn && intakeId) {
      // Use a timeout to avoid synchronous setState in effect
      const confettiTimer = setTimeout(() => {
        setShowConfetti(true)
      }, 0)

      const redirectTimer = setTimeout(() => {
        // Use post-signin handler to ensure profile linking is complete
        router.push(`/auth/post-signin?intake_id=${intakeId}`)
      }, 1000)

      return () => {
        clearTimeout(confettiTimer)
        clearTimeout(redirectTimer)
      }
    }
  }, [isLoaded, isSignedIn, intakeId, router])

  const handleCreateAccount = () => {
    // Redirect to Clerk Account Portal with post-signin handler
    // This prevents the redirect loop by ensuring profile is linked before accessing protected routes
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://instantmed.com.au'
    const clerkSignUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || 'https://accounts.instantmed.com.au/sign-up'
    const postSignInUrl = `${appUrl}/auth/post-signin?intake_id=${intakeId}`
    const signUpUrl = `${clerkSignUpUrl}?redirect_url=${encodeURIComponent(postSignInUrl)}`
    router.push(signUpUrl)
  }

  // If already signed in, show success message
  if (isLoaded && isSignedIn) {
    return (
      <>
        <Confetti trigger={showConfetti} />
        <div className="p-8 glass-card">
          <Card>
            <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground">Redirecting to your request...</p>
            <Loader2 className="w-6 h-6 animate-spin mx-auto mt-4 text-primary" />
            </div>
          </Card>
        </div>
      </>
    )
  }

  return (
    <div className="p-8 glass-card">
      <Card>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
          <Check className="w-8 h-8 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-muted-foreground">
          Create your account to access your medical certificate and track your request.
        </p>
      </div>

      <div className="space-y-4">
        {email && (
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground">Creating account for:</p>
            <p className="font-medium">{email}</p>
          </div>
        )}

        <button
          onClick={handleCreateAccount}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90"
        >
          Create Account & Access Certificate
        </button>

        <button
          onClick={() => router.push(`/patient/intakes/confirmed?intake_id=${intakeId}&email=${encodeURIComponent(email || '')}`)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/50"
        >
          Skip for now
        </button>
        <p className="text-xs text-center text-muted-foreground">
          Your certificate will be emailed to you. Create an account later to track requests.
        </p>
      </div>

      <p className="text-xs text-center text-muted-foreground mt-4">
        Already have an account?{" "}
        <a href={`${process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in'}?redirect_url=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL || ''}/auth/post-signin?intake_id=${intakeId}`)}`} className="text-primary hover:underline">
          Sign in
        </a>
      </p>
      </Card>
    </div>
  )
}
