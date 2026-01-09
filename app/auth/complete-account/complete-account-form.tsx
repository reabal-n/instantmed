"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Check, Loader2 } from "lucide-react"
import { Confetti } from "@/components/ui/confetti"

export function CompleteAccountForm({
  requestId,
  email,
}: {
  requestId?: string
  email?: string
  /** @deprecated sessionId is kept for backwards compatibility but no longer used */
  sessionId?: string
}) {
  const router = useRouter()
  const { openSignUp } = useAuth()
  const { isSignedIn, isLoaded } = useAuth()

  const [showConfetti, setShowConfetti] = useState(false)
  
  useEffect(() => {
    // If already signed in, redirect to success
    if (isLoaded && isSignedIn && requestId) {
      // Use a timeout to avoid synchronous setState in effect
      const confettiTimer = setTimeout(() => {
        setShowConfetti(true)
      }, 0)
      
      const redirectTimer = setTimeout(() => {
        router.push(`/patient/requests/success?request_id=${requestId}`)
      }, 1000)
      
      return () => {
        clearTimeout(confettiTimer)
        clearTimeout(redirectTimer)
      }
    }
  }, [isLoaded, isSignedIn, requestId, router])

  const handleCreateAccount = () => {
    // Open Clerk's sign-up modal with pre-filled email
    openSignUp({
      initialValues: {
        emailAddress: email,
      },
      redirectUrl: `/patient/requests/success?request_id=${requestId}`,
    })
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
      </div>

      <p className="text-xs text-center text-muted-foreground mt-4">
        Already have an account?{" "}
        <a href={`/sign-in?redirect_url=/patient/requests/${requestId}`} className="text-primary hover:underline">
          Sign in
        </a>
      </p>
      </Card>
    </div>
  )
}
