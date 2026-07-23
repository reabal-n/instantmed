"use client"

import { Check, Clock3, Loader2, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type React from "react"
import { useEffect, useRef, useState } from "react"

import { HeardAboutUsCard } from "@/components/patient/heard-about-us-card"
import { RelatedServicesProbe } from "@/components/patient/related-services-probe"
import { Button } from "@/components/ui/button"
import { Confetti } from "@/components/ui/confetti"
import { Heading } from "@/components/ui/heading"
import { buildCompleteAccountPostSignInHref } from "@/lib/auth/complete-account-handoff"
import { CONTACT_EMAIL } from "@/lib/constants"
import { clearDraftAfterPayment } from "@/lib/request/draft-storage"
import type { CompleteAccountPaymentState } from "@/lib/stripe/payment-integrity"
import { useAuth } from "@/lib/supabase/auth-provider"
import { detectRelayEmail, getRelayEmailMessage } from "@/lib/validation/email-relay"

export function CompleteAccountForm({
  intakeId,
  email,
  paidServiceCategory,
  paidFlowInstanceId,
  paymentState = "unconfirmed",
  heardToken,
}: {
  intakeId?: string
  email?: string
  /** Set by the page ONLY when payment was server-confirmed (session match + paid). */
  paidServiceCategory?: string
  /** Flow id paired with the paid service so stale success tabs cannot clear fresh work. */
  paidFlowInstanceId?: string
  /** Public-route payment proof. Non-paid states must never render success UI. */
  paymentState?: CompleteAccountPaymentState
  heardToken?: string
}) {
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()
  const postSignInHref = buildCompleteAccountPostSignInHref({
    intakeId,
  })
  const relayEmailNote = email ? getRelayEmailMessage(detectRelayEmail(email)) : null

  const [showConfetti, setShowConfetti] = useState(false)

  // Guest checkouts land here (never on /patient/intakes/success) — retire the
  // paid service's local draft so a return to /request can't restore straight
  // to Pay and double-charge past the checkout idempotency bucket. The page
  // only passes paidServiceCategory after server-confirming payment.
  const draftClearedRef = useRef(false)
  useEffect(() => {
    if (
      draftClearedRef.current ||
      paymentState !== "paid" ||
      !paidServiceCategory ||
      !paidFlowInstanceId
    ) return
    draftClearedRef.current = true
    clearDraftAfterPayment(
      paidServiceCategory,
      paidFlowInstanceId,
      paymentState,
    )
  }, [paidFlowInstanceId, paidServiceCategory, paymentState])

  useEffect(() => {
    if (paymentState !== "paid") return
    // If already signed in, redirect through post-signin to ensure profile is linked
    if (isLoaded && isSignedIn && intakeId) {
      const confettiTimer = setTimeout(() => {
        setShowConfetti(true)
      }, 0)

      const redirectTimer = setTimeout(() => {
        router.push(postSignInHref)
      }, 1000)

      return () => {
        clearTimeout(confettiTimer)
        clearTimeout(redirectTimer)
      }
    }
  }, [isLoaded, isSignedIn, intakeId, paymentState, postSignInHref, router])

  const handleCreateAccount = () => {
    const returnUrl = encodeURIComponent(postSignInHref)
    const params = new URLSearchParams({ redirect: returnUrl })
    router.push(`/sign-up?${params.toString()}`)
  }

  const handleSkipAccount = () => {
    const params = new URLSearchParams()
    if (intakeId) params.set("intake_id", intakeId)
    const query = params.toString()
    router.push(query ? `/patient/intakes/confirmed?${query}` : "/patient/intakes/confirmed")
  }

  if (paymentState !== "paid") {
    const isProcessing = paymentState === "processing"
    const RecoveryIcon = isProcessing ? Clock3 : ShieldAlert

    return (
      <div
        className="rounded-2xl border border-border/50 bg-white p-8 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none"
        role="status"
      >
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30">
            <RecoveryIcon
              aria-hidden="true"
              className="h-8 w-8 text-amber-700 dark:text-amber-300"
            />
          </div>
          <Heading as="h1" level="h2">
            {isProcessing
              ? "Payment is still processing"
              : "We can’t confirm payment yet"}
          </Heading>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {isProcessing
              ? "Stripe has not confirmed the payment yet. Please don’t try payment again. We’ll update your request when the result arrives."
              : "We could not verify this payment. Please don’t try payment again. Contact support so we can check it before another charge is attempted."}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <Button asChild className="w-full rounded-xl" size="lg">
            <a href={`mailto:${CONTACT_EMAIL}`}>Contact support</a>
          </Button>
          <Button asChild className="w-full rounded-xl" size="lg" variant="outline">
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </div>
    )
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
    <div className="space-y-4">
      <div className="p-8 rounded-2xl bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]">
        <div className="text-center mb-6">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-success-light">
            <Check className="h-8 w-8 text-success" aria-hidden="true" />
          </div>
          <h1 className="mb-2 text-2xl font-semibold">Payment successful</h1>
          <p className="text-muted-foreground">
            Create a free account to track your request, see the doctor&apos;s notes, and contact support - all in one place.
          </p>
        </div>

        <div className="space-y-4">
          {email && (
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">Your account email:</p>
              <p className="font-medium">{email}</p>
              {/* Relay users (Apple Hide My Email) read forwarded copies in the
                  inbox behind the relay — without this line, "we'll email you"
                  reads as a broken promise (2026-07-02 support incident). */}
              {relayEmailNote && (
                <p className="text-xs text-muted-foreground mt-1.5">{relayEmailNote}</p>
              )}
            </div>
          )}

          <Button
            onClick={handleCreateAccount}
            className="w-full rounded-xl"
            size="lg"
          >
            Create Account & Track Request
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            We&apos;ll email you when the doctor has finished.{" "}
            <button
              type="button"
              onClick={handleSkipAccount}
              className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
              Skip for now
            </button>
          </p>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Already have an account?{" "}
          <a href={`/sign-in?redirect=${encodeURIComponent(postSignInHref)}`} className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
      {heardToken && <HeardAboutUsCard token={heardToken} />}
      <div className="mx-auto mt-4 w-full max-w-md px-4">
        {/* Cross-sell to the guest majority (most checkouts are guests who land
            here, not on /patient/intakes/success). 2026-06-11 review: the probe
            was success-page-only, so guests never saw it. */}
        <RelatedServicesProbe surface="complete_account" />
      </div>
    </div>
  )
}
