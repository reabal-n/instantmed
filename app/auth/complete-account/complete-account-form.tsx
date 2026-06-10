"use client"

import { Check, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import type React from "react"
import { useEffect, useRef, useState } from "react"

import { HeardAboutUsCard } from "@/components/patient/heard-about-us-card"
import { RelatedServicesProbe } from "@/components/patient/related-services-probe"
import { usePostHog } from "@/components/providers/posthog-provider"
import { Button } from "@/components/ui/button"
import { Confetti } from "@/components/ui/confetti"
import { getAttribution } from "@/lib/analytics/attribution"
import { trackPurchase } from "@/lib/analytics/conversion-tracking"
import { buildPostSignInHref } from "@/lib/navigation/auth-handoff"
import { useAuth } from "@/lib/supabase/auth-provider"

export function CompleteAccountForm({
  intakeId,
  email,
  amountCents,
  serviceSlug,
  serviceName,
  isNewCustomer,
  heardToken,
}: {
  intakeId?: string
  email?: string
  amountCents?: number
  serviceSlug?: string
  serviceName?: string
  isNewCustomer?: boolean
  heardToken?: string
}) {
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()
  const posthog = usePostHog()
  const postSignInHref = buildPostSignInHref({ intake_id: intakeId })

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
    // Don't fire the Google Ads conversion until we have a real
    // amount_cents from the database. The complete-account-page query
    // filters on `payment_status = "paid"` so this should almost always
    // be present, but if a race still slips through, the old code
    // defaulted to $1 — that's worse than no conversion at all because
    // Smart Bidding trains on a fake low-value purchase. Skip the
    // browser fire when amount is unknown; the server-side Google Ads
    // CAPI fires separately from the Stripe webhook with the real
    // amount, so we don't lose attribution either way.
    if (amountCents == null) return
    purchaseTrackedRef.current = true
    const valueDollars = amountCents / 100
    void trackPurchase({
      transactionId: intakeId,
      value: valueDollars,
      service: serviceSlug || "unknown",
      serviceName: serviceName || "Request",
      email,
      isNewCustomer: isNewCustomer ?? true,
    })

    // PostHog parity with /patient/intakes/success. Guest checkouts land here,
    // not on the success page, so without this capture our funnel sees only
    // ~5% of real purchases. Cookie fallback covers cases where the Stripe
    // redirect dropped sessionStorage on mobile Safari.
    const attribution = getAttribution()
    posthog?.capture('purchase_completed', {
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
    <div className="space-y-4">
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
        <a href={`/sign-in?redirect=${encodeURIComponent(postSignInHref)}`} className="text-primary hover:underline">
          Sign in
        </a>
      </p>
    </div>
      {heardToken && <HeardAboutUsCard token={heardToken} />}
      {/* Cross-sell to the guest majority (most checkouts are guests who land
          here, not on /patient/intakes/success). 2026-06-11 review: the probe
          was success-page-only, so guests never saw it. */}
      <div className="mx-auto mt-4 w-full max-w-md px-4">
        <RelatedServicesProbe surface="complete_account" />
      </div>
    </div>
  )
}
