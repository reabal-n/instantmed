"use client"

/**
 * Checkout Step - Review and payment
 * Uses shared CheckoutButton and integrates with Stripe checkout
 */

import { useState, useEffect } from "react"
import { usePostHog } from "posthog-js/react"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { stagger } from "@/lib/motion"
import { Check, Shield, Clock, Smartphone, MessageSquare, Lock, ShieldCheck, UserX, Zap, RefreshCw } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckoutButton } from "@/components/shared/checkout-button"
import { getConsultSubtypePrice } from "@/lib/stripe/price-mapping"
import { useRequestStore } from "../store"
import { createCheckoutFromUnifiedFlow } from "@/app/actions/unified-checkout"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { getQueueEstimate } from "@/lib/data/queue-availability"
import { PRICING as APP_PRICING, MED_CERT_DURATIONS, PRICING_DISPLAY } from "@/lib/constants"
import { trackFunnelStep } from "@/lib/analytics/conversion-tracking"

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

const CONSULT_SUBTYPE_LABELS: Record<string, string> = {
  general: 'General Consultation',
  ed: 'ED Consultation',
  hair_loss: 'Hair Loss Consultation',
  womens_health: "Women's Health Consultation",
  weight_loss: 'Weight Management Consultation',
}

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
  const { answers, getIdentity, setConsent, chatSessionId, authContext } = useRequestStore()
  const posthog = usePostHog()
  const prefersReducedMotion = useReducedMotion()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estimatedWait, setEstimatedWait] = useState(serviceType === 'med-cert' ? "~30 min" : "1–2 hours")
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  const [isPriority, setIsPriority] = useState(false)
  const isRepeatScript = serviceType === 'prescription' || serviceType === 'repeat-script'
  const [subscribeAndSave, setSubscribeAndSave] = useState(isRepeatScript) // Default ON for repeat scripts

  useEffect(() => {
    getQueueEstimate().then((est) => setEstimatedWait(est.estimatedWait)).catch(() => {})
  }, [])

  const pricing = PRICING[serviceType] || PRICING['med-cert']

  // Get dynamic price based on service type and subtype
  const duration = answers.duration as string | undefined
  const consultSubtype = answers.consultSubtype as string | undefined

  let price = pricing.base
  if (serviceType === 'med-cert' && duration) {
    const durationNum = Number(duration) as keyof typeof MED_CERT_DURATIONS.prices
    price = MED_CERT_DURATIONS.prices[durationNum] ?? pricing.base
  } else if (serviceType === 'consult') {
    price = getConsultSubtypePrice(consultSubtype)
  }

  const displayLabel = serviceType === 'consult' && consultSubtype
    ? CONSULT_SUBTYPE_LABELS[consultSubtype] || pricing.label
    : pricing.label

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
    trackFunnelStep('checkout', serviceType)

    try {
      const identity = getIdentity()
      const answersWithConsents = {
        ...answers,
        agreedToTerms: true,
        confirmedAccuracy: true,
        telehealthConsentGiven: true,
        isPriority,
        subscribeAndSave: subscribeAndSave && isRepeatScript,
      }
      // Capture UTM params + referrer for payment attribution
      const params = new URLSearchParams(window.location.search)
      const attribution = {
        utm_source: params.get('utm_source') || undefined,
        utm_medium: params.get('utm_medium') || undefined,
        utm_campaign: params.get('utm_campaign') || undefined,
        referrer: document.referrer || undefined,
      }

      const result = await createCheckoutFromUnifiedFlow({
        serviceType,
        answers: answersWithConsents,
        identity,
        chatSessionId: chatSessionId || undefined,
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
      {/* Guest badge — only for unauthenticated users */}
      {!authContext.isAuthenticated && (
        <motion.div variants={stagger.item} className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <UserX className="w-4 h-4 text-primary" />
          <span>No account required — pay as a guest</span>
        </motion.div>
      )}

      {/* Summary card */}
      <motion.div variants={stagger.item} className="p-4 rounded-xl border bg-card space-y-3">
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
                  $19.95
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
                ${((subscribeAndSave ? 19.95 : price) + (isPriority ? APP_PRICING.PRIORITY_FEE : 0)).toFixed(2)}
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

      {/* Trust badges */}
      <motion.div variants={stagger.item} className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-primary" />
          AHPRA-registered doctors
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-primary" />
          {estimatedWait} review
        </span>
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
            Take your phone to any pharmacy — they&apos;ll scan your eScript QR code.
            If your medication requires a new prescription or has never been prescribed to you before,
            our doctor will contact you to arrange a consultation.
          </p>
        </div>
      )}

      {/* Subscribe & Save toggle — repeat scripts only */}
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
              />
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Subscribe & save</span>
                <Badge variant="secondary" className="text-xs font-semibold text-primary bg-primary/10">
                  Save ${(price - 19.95).toFixed(2)}/mo
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                $19.95/mo instead of ${price.toFixed(2)} per script. Includes 1 repeat per month. Cancel anytime.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Express review toggle */}
      <motion.div variants={stagger.item}>
        <div
          className={`w-full p-3.5 rounded-xl border-2 text-left transition-all duration-200 flex items-start gap-3 cursor-pointer ${
            isPriority
              ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-500/60"
              : "border-border hover:border-amber-300/60"
          }`}
          onClick={() => setIsPriority(!isPriority)}
        >
          <span onClick={(e) => e.stopPropagation()} className="mt-1 shrink-0">
            <Switch
              checked={isPriority}
              onCheckedChange={setIsPriority}
            />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">Express Review</span>
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">+{PRICING_DISPLAY.PRIORITY_FEE}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Jump to the front of the queue. Your request gets priority review by our doctors.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Single combined consent */}
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
            <Switch
              checked={consentGiven}
              onCheckedChange={(checked) => handleConsentChange(checked)}
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
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Spacer for sticky CTA on mobile */}
      <div className="h-36 sm:hidden" />

      {/* Checkout button — sticky on mobile, inline on desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:z-auto">
        <div className="max-w-lg mx-auto space-y-2">
          <CheckoutButton
            onClick={handleCheckout}
            isLoading={isProcessing}
            disabled={!canCheckout}
            price={`$${((subscribeAndSave ? 19.95 : price) + (isPriority ? APP_PRICING.PRIORITY_FEE : 0)).toFixed(2)}${subscribeAndSave ? "/mo" : ""}`}
            label="Continue to payment"
            loadingLabel="Processing..."
            variant="prominent"
          />

          {/* Refund guarantee */}
          <div className="flex items-center justify-center gap-2 text-xs text-primary">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-medium">Full refund if we can&apos;t help</span>
          </div>

          {/* Stripe + payment methods — single trust line */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
            <Lock className="h-3 w-3" />
            <span>Secured by Stripe</span>
            <span className="mx-1">·</span>
            {PAYMENT_METHODS.map((method) => (
              <span key={method} className="px-1.5 py-0.5 rounded bg-muted/30 border border-border/30">
                {method}
              </span>
            ))}
          </div>
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
