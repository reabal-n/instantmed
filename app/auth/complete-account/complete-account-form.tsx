"use client"

import { Check, Loader2, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import type React from "react"
import { useEffect, useRef, useState } from "react"

import { HeardAboutUsCard } from "@/components/patient/heard-about-us-card"
import { RelatedServicesProbe } from "@/components/patient/related-services-probe"
import { usePostHog } from "@/components/providers/posthog-provider"
import { Button } from "@/components/ui/button"
import { Confetti } from "@/components/ui/confetti"
import { getAttribution } from "@/lib/analytics/attribution"
import {
  claimBrowserPurchaseCompleted,
  getBrowserPurchaseCompletedInsertId,
} from "@/lib/analytics/browser-purchase-dedup"
import { trackPurchase } from "@/lib/analytics/conversion-tracking"
import { buildCompleteAccountPostSignInHref } from "@/lib/auth/complete-account-handoff"
import { clearDraftAfterPayment } from "@/lib/request/draft-storage"
import { useAuth } from "@/lib/supabase/auth-provider"
import { detectRelayEmail, getRelayEmailMessage } from "@/lib/validation/email-relay"

export function CompleteAccountForm({
  intakeId,
  email,
  amountCents,
  serviceSlug,
  serviceName,
  paidServiceCategory,
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

  // Fire Google Ads PURCHASE conversion as soon as the guest lands here.
  // Stripe only redirects to this page after a successful payment, so it is
  // safe to fire unconditionally. Without this fire, guest checkouts (most
  // pre-launch users) miss browser-side gtag attribution entirely because
  // they never reach /patient/intakes/success. The server-side CAPI fires
  // separately from the Stripe webhook; Google deduplicates on transactionId.
  useEffect(() => {
    if (!intakeId) return
    // Don't fire the Google Ads conversion until we have a real
    // amount_cents from the database. The complete-account page now
    // confirms payment via the Stripe session (not just the lagging
    // payment_status column), so amount_cents is present even during a
    // webhook race; if it's still unknown the old code defaulted to $1 —
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
          $insert_id: getBrowserPurchaseCompletedInsertId(intakeId),
          intake_id: intakeId,
          service: serviceSlug || "unknown",
          value: valueDollars,
          currency: 'AUD',
          guest_checkout: true,
          utm_source: attribution.utm_source,
          utm_medium: attribution.utm_medium,
          utm_campaign: attribution.utm_campaign,
          utm_content: attribution.utm_content,
          gclid: attribution.gclid,
          gbraid: attribution.gbraid,
          wbraid: attribution.wbraid,
          campaignid: attribution.campaignid,
          keyword: attribution.keyword,
          landing_page: attribution.landing_page,
          has_gclid: Boolean(attribution.gclid),
          has_utm_source: Boolean(attribution.utm_source),
          has_campaignid: Boolean(attribution.campaignid),
        })
      }
    }
  }, [intakeId, amountCents, serviceSlug, serviceName, email, isNewCustomer, posthog])

  useEffect(() => {
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
  }, [isLoaded, isSignedIn, intakeId, postSignInHref, router])

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
