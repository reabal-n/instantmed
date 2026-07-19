"use client"

import { Check, Clock3, Loader2, ShieldAlert, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type React from "react"
import { useEffect, useRef, useState } from "react"

import { HeardAboutUsCard } from "@/components/patient/heard-about-us-card"
import { RelatedServicesProbe } from "@/components/patient/related-services-probe"
import { usePostHog } from "@/components/providers/posthog-provider"
import { Button } from "@/components/ui/button"
import { Confetti } from "@/components/ui/confetti"
import { Heading } from "@/components/ui/heading"
import { getAttribution } from "@/lib/analytics/attribution"
import {
  claimBrowserPurchaseCompleted,
  getBrowserPurchaseCompletedInsertId,
} from "@/lib/analytics/browser-purchase-dedup"
import { trackPurchase } from "@/lib/analytics/conversion-tracking"
import { buildCompleteAccountPostSignInHref } from "@/lib/auth/complete-account-handoff"
import { CONTACT_EMAIL } from "@/lib/constants"
import { clearDraftAfterPayment } from "@/lib/request/draft-storage"
import type { CompleteAccountPaymentState } from "@/lib/stripe/payment-integrity"
import { useAuth } from "@/lib/supabase/auth-provider"
import { detectRelayEmail, getRelayEmailMessage } from "@/lib/validation/email-relay"

export function CompleteAccountForm({
  intakeId,
  email,
  amountCents,
  serviceSlug,
  serviceName,
  paidServiceCategory,
  paymentState = "unconfirmed",
  isNewCustomer,
  heardToken,
  certificateAccess = false,
}: {
  intakeId?: string
  email?: string
  amountCents?: number
  serviceSlug?: string
  serviceName?: string
  /** Set by the page ONLY when payment was server-confirmed (session match + paid). */
  paidServiceCategory?: string
  /** Public-route payment proof. Non-paid states must never render success UI. */
  paymentState?: CompleteAccountPaymentState
  isNewCustomer?: boolean
  heardToken?: string
  certificateAccess?: boolean
}) {
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()
  const posthog = usePostHog()
  const postSignInHref = buildCompleteAccountPostSignInHref({
    intakeId,
    certificateAccess,
  })
  const relayEmailNote = email ? getRelayEmailMessage(detectRelayEmail(email)) : null

  const [showConfetti, setShowConfetti] = useState(false)
  const purchaseTrackedRef = useRef(false)

  // Guest checkouts land here (never on /patient/intakes/success) — retire the
  // paid service's local draft so a return to /request can't restore straight
  // to Pay and double-charge past the checkout idempotency bucket. The page
  // only passes paidServiceCategory after server-confirming payment.
  const draftClearedRef = useRef(false)
  useEffect(() => {
    if (draftClearedRef.current || !paidServiceCategory) return
    draftClearedRef.current = true
    clearDraftAfterPayment(paidServiceCategory)
  }, [paidServiceCategory])
  // Separate latch for the PostHog purchase event so it can wait for posthog to
  // hydrate without blocking (or being blocked by) the one-shot gtag fire.
  const posthogPurchaseFiredRef = useRef(false)

  // Fire the Google Ads PURCHASE conversion only after the server has supplied
  // exact current-session payment proof. Guest checkouts land here rather than
  // /patient/intakes/success, so this is their browser-side attribution point.
  // The server-side CAPI fires separately from the Stripe webhook; Google
  // deduplicates on transactionId.
  useEffect(() => {
    if (paymentState !== "paid") return
    if (!intakeId) return
    // Don't fire the Google Ads conversion until we have a real
    // amount_cents from the database. The complete-account page can confirm
    // payment from the persisted state or the exact owned Stripe Session, so
    // amount_cents is present even during a webhook race; if it's still
    // unknown the old code defaulted to $1 —
    // worse than nothing because Smart Bidding trains on a fake low-value
    // purchase. Skip the browser fire when amount is unknown; the
    // server-side Google Ads CAPI fires separately from the Stripe webhook
    // with the real amount, so we don't lose attribution either way.
    if (amountCents == null) return
    const valueDollars = amountCents / 100

    // Google Ads / gtag conversion — fire exactly once. Google dedups on
    // transactionId against the server-side CAPI fire.
    if (!purchaseTrackedRef.current) {
      purchaseTrackedRef.current = true
      void trackPurchase({
        transactionId: intakeId,
        value: valueDollars,
        service: serviceSlug || "unknown",
        serviceName: serviceName || "Request",
        email,
        isNewCustomer: isNewCustomer ?? true,
      })
    }

    // PostHog parity with /patient/intakes/success. Guest checkouts land here,
    // not on the success page, so without this capture our funnel sees only a
    // fraction of real purchases. Latched separately and gated on `posthog` so
    // a null-on-first-render instance no longer drops the event (the ~3x
    // undercount). Cookie fallback covers cases where the Stripe redirect
    // dropped sessionStorage on mobile Safari.
    if (!posthogPurchaseFiredRef.current && posthog) {
      posthogPurchaseFiredRef.current = true
      if (claimBrowserPurchaseCompleted(intakeId)) {
        const attribution = getAttribution()
        posthog.capture('purchase_completed', {
          $insert_id: getBrowserPurchaseCompletedInsertId(),
          service: serviceSlug || "unknown",
          value: valueDollars,
          currency: 'AUD',
          guest_checkout: true,
          utm_source: attribution.utm_source,
          utm_medium: attribution.utm_medium,
          utm_campaign: attribution.utm_campaign,
          utm_content: attribution.utm_content,
          campaignid: attribution.campaignid,
          has_gclid: Boolean(attribution.gclid),
          has_utm_source: Boolean(attribution.utm_source),
          has_campaignid: Boolean(attribution.campaignid),
        })
      }
    }
  }, [intakeId, amountCents, serviceSlug, serviceName, email, isNewCustomer, paymentState, posthog])

  useEffect(() => {
    if (!certificateAccess && paymentState !== "paid") return
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
  }, [certificateAccess, isLoaded, isSignedIn, intakeId, paymentState, postSignInHref, router])

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

  if (!certificateAccess && paymentState !== "paid") {
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
        <div
          className={`inline-flex h-16 w-16 items-center justify-center rounded-full mb-4 ${
            certificateAccess ? "bg-primary/10" : "bg-success-light"
          }`}
        >
          {certificateAccess ? (
            <ShieldCheck className="h-8 w-8 text-primary" aria-hidden="true" />
          ) : (
            <Check className="h-8 w-8 text-success" aria-hidden="true" />
          )}
        </div>
        <h1 className="text-2xl font-semibold mb-2">
          {certificateAccess ? "Secure certificate access" : "Payment successful"}
        </h1>
        <p className="text-muted-foreground">
          {certificateAccess
            ? "Create a free account to view this request and download any current certificate securely."
            : "Create a free account to track your request, see the doctor's notes, and contact support - all in one place."}
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
          {certificateAccess ? "Create Account & View Request" : "Create Account & Track Request"}
        </Button>

        {certificateAccess ? (
          <p className="text-xs text-center text-muted-foreground">
            Certificate downloads open through a secure account link so access stays private and audit-logged.
          </p>
        ) : (
          <p className="text-xs text-center text-muted-foreground">
            We&apos;ll email you when the doctor has finished.{" "}
            <button
              type="button"
              onClick={handleSkipAccount}
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </p>
        )}
      </div>

      <p className="text-xs text-center text-muted-foreground mt-4">
        Already have an account?{" "}
        <a href={`/sign-in?redirect=${encodeURIComponent(postSignInHref)}`} className="text-primary hover:underline">
          Sign in
        </a>
      </p>
    </div>
      {!certificateAccess && heardToken && <HeardAboutUsCard token={heardToken} />}
      {!certificateAccess && (
        <div className="mx-auto mt-4 w-full max-w-md px-4">
          {/* Cross-sell to the guest majority (most checkouts are guests who land
              here, not on /patient/intakes/success). 2026-06-11 review: the probe
              was success-page-only, so guests never saw it. */}
          <RelatedServicesProbe surface="complete_account" />
        </div>
      )}
    </div>
  )
}
