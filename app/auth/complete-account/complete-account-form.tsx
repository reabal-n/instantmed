"use client"

import { Check, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import type React from "react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Confetti } from "@/components/ui/confetti"
import { trackPurchase } from "@/lib/analytics/conversion-tracking"
import { useAuth } from "@/lib/supabase/auth-provider"

export function CompleteAccountForm({
  intakeId,
  email,
  amountCents,
  serviceSlug,
  serviceName,
}: {
  intakeId?: string
  email?: string
  amountCents?: number
  serviceSlug?: string
  serviceName?: string
}) {
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()

  const [showConfetti, setShowConfetti] = useState(false)
  const purchaseTrackedRef = useRef(false)

  // Fire Google Ads PURCHASE conversion as soon as the guest lands here.
  // Stripe only redirects to this page after a successful payment, so it is
  // safe to fire unconditionally. Without this fire, guest checkouts (most
  // pre-launch users) miss browser-side gtag attribution entirely because
  // they never reach /patient/intakes/success. The server-side CAPI fires
  // separately from the Stripe webhook; Google deduplicates on transactionId.
  useEffect(() => {
    if (!intakeId || purchaseTrackedRef.current) return
    purchaseTrackedRef.current = true
    const valueDollars = amountCents != null ? amountCents / 100 : 1
    void trackPurchase({
      transactionId: intakeId,
      value: valueDollars,
      service: serviceSlug || "unknown",
      serviceName: serviceName || "Request",
      email,
      isNewCustomer: true,
    })
  }, [intakeId, amountCents, serviceSlug, serviceName, email])

  useEffect(() => {
    // If already signed in, redirect through post-signin to ensure profile is linked
    if (isLoaded && isSignedIn && intakeId) {
      const confettiTimer = setTimeout(() => {
        setShowConfetti(true)
      }, 0)

      const redirectTimer = setTimeout(() => {
        router.push(`/auth/post-signin?intake_id=${intakeId}`)
      }, 1000)

      return () => {
        clearTimeout(confettiTimer)
        clearTimeout(redirectTimer)
      }
    }
  }, [isLoaded, isSignedIn, intakeId, router])

  const handleCreateAccount = () => {
    const returnUrl = encodeURIComponent(`/auth/post-signin?intake_id=${intakeId}`)
    const params = new URLSearchParams({ redirect: returnUrl })
    if (email) params.set("email", email)
    router.push(`/sign-up?${params.toString()}`)
  }

  // If already signed in, show success message
  if (isLoaded && isSignedIn) {
    return (
      <>
        <Confetti trigger={showConfetti} />
        <div className="p-8 rounded-2xl bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-light mb-4">
              <Check className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">Payment successful</h1>
            <p className="text-muted-foreground">Taking you to your request...</p>
            <Loader2 className="w-6 h-6 animate-spin mx-auto mt-4 text-primary" />
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="p-8 rounded-2xl bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-light mb-4">
          <Check className="w-8 h-8 text-success" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Payment successful</h1>
        <p className="text-muted-foreground">
          Create a free account to view and download your certificate, see the doctor&apos;s notes, and contact support - all in one place.
        </p>
      </div>

      <div className="space-y-4">
        {email && (
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground">Your account email:</p>
            <p className="font-medium">{email}</p>
          </div>
        )}

        <Button
          onClick={handleCreateAccount}
          className="w-full rounded-xl"
          size="lg"
        >
          Create Account & View Certificate
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Your certificate will be emailed to you regardless.{" "}
          <button
            type="button"
            onClick={() => router.push(`/patient/intakes/confirmed?intake_id=${intakeId}&email=${encodeURIComponent(email || '')}`)}
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </p>
      </div>

      <p className="text-xs text-center text-muted-foreground mt-4">
        Already have an account?{" "}
        <a href={`/sign-in?redirect=${encodeURIComponent(`/auth/post-signin?intake_id=${intakeId}`)}`} className="text-primary hover:underline">
          Sign in
        </a>
      </p>
    </div>
  )
}
