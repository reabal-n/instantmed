"use client"

/**
 * Checkout Step - Review and payment
 * Uses shared CheckoutButton and integrates with Stripe checkout
 */

import { motion } from "framer-motion"
import { Check, Clock, Lock, MessageSquare, RefreshCw,ShieldCheck, Smartphone, UserX } from "lucide-react"
import { useEffect,useState } from "react"

import { createCheckoutFromUnifiedFlow } from "@/app/actions/unified-checkout"
import { usePostHog } from "@/components/providers/posthog-provider"
import { CheckoutButton, TrustBadgeRow } from "@/components/shared"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useReducedMotion } from "@/components/ui/motion"
import { Switch } from "@/components/ui/switch"
import { getAttribution } from "@/lib/analytics/attribution"
import { trackFunnelStep } from "@/lib/analytics/conversion-tracking"
import { PRICING as APP_PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { getQueueEstimate } from "@/lib/data/queue-availability"
import { stagger } from "@/lib/motion"
import { getDisplayPrice, getServiceDisplayLabel } from "@/lib/request/display-helpers"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

// getConsultSubtypePrice from @/lib/stripe/price-mapping available if needed
import { useRequestStore } from "../store"

// Prices sourced from lib/constants.ts (single source of truth)
const PRICING: Record<UnifiedServiceType, { base: number; label: string }> = {
  'med-cert': {
    base: APP_PRICING.MED_CERT,
    label: 'Medical Certificate'
  },
  'prescription': {
    base: APP_PRICING.REPEAT_SCRIPT,
    label: 'Prescription Request'
  },
  'repeat-script': {
    base: APP_PRICING.REPEAT_SCRIPT,
    label: 'Repeat Prescription'
  },
  'consult': {
    base: APP_PRICING.CONSULT,
    label: 'Doctor Consultation'
  },
}

// Use CONSULT_SUBTYPE_DISPLAY_LABELS from display-helpers (single source of truth)

const PAYMENT_METHODS = ['Visa', 'Mastercard', 'Amex', 'Apple Pay', 'Google Pay']

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export default function CheckoutStep({ serviceType }: { serviceType: UnifiedServiceType }) {
  const { answers, getIdentity, setConsent, authContext } = useRequestStore()
  const posthog = usePostHog()
  const prefersReducedMotion = useReducedMotion()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [_estimatedWait, setEstimatedWait] = useState(serviceType === 'med-cert' ? "~30 min" : "1–2 hours")
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  // Express Review defaults OFF - patient opts in consciously
  const [isPriority, setIsPriority] = useState(false)
  const isRepeatScript = serviceType === 'prescription' || serviceType === 'repeat-script'
  const [subscribeAndSave, setSubscribeAndSave] = useState(isRepeatScript) // Default ON for repeat scripts

  const duration = answers.duration as string | undefined
  const consultSubtype = answers.consultSubtype as string | undefined

  // Fetch queue estimate on mount
  useEffect(() => {
    getQueueEstimate()
      .then((est) => setEstimatedWait(est.estimatedWait))
      .catch(() => setEstimatedWait("within hours"))
  }, [])

  // Track checkout view once on mount
  useEffect(() => {
    posthog?.capture('checkout_viewed', { service_type: serviceType, consult_subtype: consultSubtype })
  }, [posthog, serviceType, consultSubtype])

  const _pricing = PRICING[serviceType] || PRICING['med-cert']

  const price = getDisplayPrice(serviceType, answers)
  const displayLabel = getServiceDisplayLabel(serviceType, consultSubtype)

  // Single consent controls both toggles
  const handleConsentChange = (checked: boolean) => {
    setConsentGiven(checked)
    setConsent('agreedToTerms', checked)
    setConsent('confirmedAccuracy', checked)
  }

  const canCheckout = consentGiven

  const handleCheckout = async () => {
    if (!canCheckout) return

    setIsProcessing(true)
    setError(null)

    posthog?.capture('checkout_initiated', {
      service_type: serviceType,
      price_dollars: price + (isPriority ? APP_PRICING.PRIORITY_FEE : 0),
      consult_subtype: consultSubtype,
      is_priority: isPriority,
    })
    // Pass email for Enhanced Conversions cross-device attribution
    const identity = getIdentity()
    void trackFunnelStep('checkout', serviceType, identity.email)

    try {
      const answersWithConsents = {
        ...answers,
        agreedToTerms: true,
        confirmedAccuracy: true,
        telehealthConsentGiven: true,
        isPriority,
        subscribeAndSave: subscribeAndSave && isRepeatScript,
      }
      // Retrieve persisted attribution (captured on landing page load)
      const attribution = getAttribution()

      const result = await createCheckoutFromUnifiedFlow({
        serviceType,
        answers: answersWithConsents,
        identity,
        attribution,
        posthogDistinctId: posthog?.get_distinct_id() || undefined,
      })

      if (!result.success) {
        posthog?.capture('checkout_failed', {
          service_type: serviceType,
          error: result.error,
          stage: 'session_creation',
        })
        setError(result.error || 'Failed to create checkout session')
        return
      }

      if (result.checkoutUrl) {
        posthog?.capture('checkout_redirecting', {
          service_type: serviceType,
          intake_id: result.intakeId,
          price_dollars: price,
        })
        setShowCheckmark(true)
        setTimeout(() => {
          window.location.href = result.checkoutUrl!
        }, 600)
      } else {
        posthog?.capture('checkout_failed', {
          service_type: serviceType,
          error: 'no_checkout_url',
          stage: 'session_creation',
        })
        setError('Unable to create payment session. Please try again.')
      }
    } catch (err) {
      posthog?.capture('checkout_failed', {
        service_type: serviceType,
        error: err instanceof Error ? err.message : 'unknown',
        stage: 'exception',
      })
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <motion.div
      className="space-y-5"
      variants={stagger.containerFast}
      initial="initial"
      animate="animate"
    >
      {/* Guest badge - only for unauthenticated users */}
      {!authContext.isAuthenticated && (
        <motion.div variants={stagger.item} className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <UserX className="w-4 h-4 text-primary" />
          <span>No account required - pay as a guest</span>
        </motion.div>
      )}

      {/* Summary card */}
      <motion.div variants={stagger.item} className="p-4 rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-primary" />
          Request Summary
        </h3>

        <div className="space-y-2 pt-2 border-t">
          <ReviewItem label="Service" value={displayLabel} />

          {serviceType === 'med-cert' && (
            <>
              {answers.certType && (
                <ReviewItem
                  label="Certificate type"
                  value={String(answers.certType).charAt(0).toUpperCase() + String(answers.certType).slice(1)}
                />
              )}
              {duration && (
                <ReviewItem label="Duration" value={`${duration} day${duration !== '1' ? 's' : ''}`} />
              )}
            </>
          )}

          {(serviceType === 'prescription' || serviceType === 'repeat-script') && (() => {
            const meds = answers.medications as Array<{ name: string }> | undefined
            if (meds && meds.length > 1) {
              return meds.map((med, i) => (
                <ReviewItem key={i} label={`Medication ${i + 1}`} value={med.name} />
              ))
            }
            return answers.medicationName ? (
              <ReviewItem label="Medication" value={String(answers.medicationName)} />
            ) : null
          })()}
        </div>

        {/* Price section */}
        <div className="pt-3 border-t space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{displayLabel}</span>
            <span className="font-medium">
              {subscribeAndSave ? (
                <>
                  <span className="line-through text-muted-foreground/60 mr-1">${price.toFixed(2)}</span>
                  ${APP_PRICING.REPEAT_RX_MONTHLY.toFixed(2)}
                </>
              ) : (
                `$${price.toFixed(2)}`
              )}
            </span>
          </div>
          {isPriority && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Express Review</span>
              <span className="font-medium">${APP_PRICING.PRIORITY_FEE.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-2 border-t border-dashed">
            <div>
              <span className="font-medium">Total</span>
              <span className="text-xs text-muted-foreground ml-2">
                {subscribeAndSave ? "/month" : "one-time fee"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-semibold text-primary">
                ${((subscribeAndSave ? APP_PRICING.REPEAT_RX_MONTHLY : price) + (isPriority ? APP_PRICING.PRIORITY_FEE : 0)).toFixed(2)}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {subscribeAndSave
              ? "First script processed immediately. Cancel anytime."
              : "Pay after your request is created."}
          </p>
        </div>
      </motion.div>


      {/* What you'll get - prescription specific */}
      {(serviceType === 'prescription' || serviceType === 'repeat-script') && (
        <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" />
            What you&apos;ll get
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>eScript sent directly to your phone via SMS</span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Typically reviewed within 1–2 hours during business hours</span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
            Take your phone to any pharmacy - they&apos;ll scan your eScript QR code.
            If your medication requires a new prescription or has never been prescribed to you before,
            our doctor will contact you to arrange a consultation.
          </p>
        </div>
      )}

      {/* Subscribe & Save toggle - repeat scripts only */}
      {isRepeatScript && (
        <motion.div variants={stagger.item}>
          <div
            className={`w-full p-3.5 rounded-xl border-2 text-left transition-all duration-200 flex items-start gap-3 cursor-pointer ${
              subscribeAndSave
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
            onClick={() => setSubscribeAndSave(!subscribeAndSave)}
          >
            <span onClick={(e) => e.stopPropagation()} className="mt-1 shrink-0">
              <Switch
                checked={subscribeAndSave}
                onCheckedChange={setSubscribeAndSave}
                aria-label="Subscribe and save on repeat prescriptions"
              />
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Subscribe & save</span>
                <Badge variant="secondary" className="text-xs font-semibold text-primary bg-primary/10">
                  Save ${(price - APP_PRICING.REPEAT_RX_MONTHLY).toFixed(2)}/mo
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                ${APP_PRICING.REPEAT_RX_MONTHLY.toFixed(2)}/mo instead of ${price.toFixed(2)} per script. Includes 1 repeat per month. Cancel anytime.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Express review toggle - opt-in, understated */}
      <motion.div variants={stagger.item}>
        <div
          className={`w-full px-3.5 py-3 rounded-xl border text-left transition-all duration-200 flex items-center gap-3 cursor-pointer ${
            isPriority
              ? "border-primary/30 bg-primary/[0.03]"
              : "border-border/40 hover:border-border/60"
          }`}
          onClick={() => {
            const next = !isPriority
            setIsPriority(next)
            if (next) posthog?.capture('express_review_opted_in', { service_type: serviceType })
          }}
        >
          <span onClick={(e) => e.stopPropagation()} className="shrink-0">
            <Switch
              checked={isPriority}
              onCheckedChange={(val) => {
                setIsPriority(val)
                if (val) posthog?.capture('express_review_opted_in', { service_type: serviceType })
              }}
              aria-label="Enable express review"
            />
          </span>
          <div className="flex-1 flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              Express Review
            </span>
            <span className="text-xs text-muted-foreground/70">+{PRICING_DISPLAY.PRIORITY_FEE}</span>
          </div>
        </div>
      </motion.div>

      {/* Single combined consent - Checkbox (not Switch) for legal acknowledgment semantics */}
      <motion.div variants={stagger.item}>
        <div
          className={`w-full p-3.5 rounded-xl border-2 text-left transition-all duration-200 flex items-start gap-3 cursor-pointer ${
            consentGiven
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40"
          }`}
          onClick={() => handleConsentChange(!consentGiven)}
        >
          <span onClick={(e) => e.stopPropagation()} className="mt-1 shrink-0">
            <Checkbox
              checked={consentGiven}
              onCheckedChange={(checked) => handleConsentChange(checked === true)}
              aria-label="Agree to Terms of Service and Privacy Policy"
            />
          </span>
          <p className="text-sm leading-relaxed cursor-pointer">
            By paying, I confirm the information I&apos;ve provided is accurate and I agree to the{' '}
            <a href="/terms" className="text-primary underline" target="_blank" onClick={(e) => e.stopPropagation()}>
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="/privacy" className="text-primary underline" target="_blank" onClick={(e) => e.stopPropagation()}>
              Privacy Policy
            </a>
          </p>
        </div>
      </motion.div>

      {/* Error message */}
      <div aria-live="polite">
        {error && (
          error.toLowerCase().includes("account already exists") ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription className="space-y-2">
                <p>An account already exists with this email address.</p>
                <p>
                  <a
                    href={`/sign-in?redirect_url=${encodeURIComponent('/request' + window.location.search)}`}
                    className="underline font-medium hover:opacity-80"
                  >
                    Sign in to continue →
                  </a>
                </p>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )
        )}
      </div>

      {/* Spacer for sticky CTA on mobile */}
      <div className="h-36 sm:hidden" />

      {/* Checkout button - sticky on mobile, inline on desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:z-auto">
        <div className="max-w-lg mx-auto space-y-2">
          <CheckoutButton
            onClick={handleCheckout}
            isLoading={isProcessing}
            disabled={!canCheckout}
            price={`$${((subscribeAndSave ? APP_PRICING.REPEAT_RX_MONTHLY : price) + (isPriority ? APP_PRICING.PRIORITY_FEE : 0)).toFixed(2)}${subscribeAndSave ? "/mo" : ""}`}
            label={`Pay $${((subscribeAndSave ? APP_PRICING.REPEAT_RX_MONTHLY : price) + (isPriority ? APP_PRICING.PRIORITY_FEE : 0)).toFixed(2)}${subscribeAndSave ? "/mo" : ""}`}
            loadingLabel="Processing..."
            variant="prominent"
          />

          {/* Refund guarantee - full for med cert/Rx, partial for consults */}
          <div className="flex items-center justify-center gap-2 text-xs text-primary">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-medium">
              {serviceType === 'consult'
                ? "Money-back guarantee if we can't help"
                : "Full refund if we can't help"}
            </span>
          </div>

          {/* Stripe + payment methods - single trust line */}
          <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground/60">
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Secured by Stripe
            </span>
            <span aria-hidden="true">·</span>
            {PAYMENT_METHODS.map((method) => (
              <span key={method} className="px-1.5 py-0.5 rounded bg-muted/30 border border-border/30">
                {method}
              </span>
            ))}
          </div>

          {/* AHPRA + LegitScript certification badges */}
          <TrustBadgeRow
            badges={[
              { id: "ahpra", variant: "styled" },
              { id: "legitscript", variant: "styled" },
            ]}
            className="mt-2 justify-center gap-3"
          />
        </div>
      </div>

      {/* Checkmark overlay on successful checkout creation */}
      {showCheckmark && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
        >
          <motion.div
            className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
            initial={prefersReducedMotion ? {} : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: "easeOut" }}
          >
            <Check className="w-8 h-8 text-primary" />
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  )
}
