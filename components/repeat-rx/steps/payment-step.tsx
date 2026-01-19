"use client"

/**
 * Payment Step - Repeat Prescription Intake
 * 
 * Handles payment initiation (redirects to Stripe).
 * ~60 lines - well under 200 line limit.
 */

import { StepHeader } from "../shared"
import { PRICING_DISPLAY } from "@/lib/constants"
import { AvailabilityIndicator } from "@/components/shared/availability-indicator"
import { 
  PaymentMethodIcons, 
  StripeBadge,
  CheckoutTrustStrip,
  AHPRAStatement
} from "@/components/checkout/trust-badges"
import { RefundGuaranteeBadge } from "@/components/checkout/refund-guarantee-badge"

interface PaymentStepProps {
  price: string
  isProcessing: boolean
}

export function PaymentStep({ price, isProcessing }: PaymentStepProps) {
  return (
    <div className="space-y-6 animate-step-enter">
      <StepHeader
        title="Complete your request"
        subtitle="Secure payment via Stripe"
        emoji="💳"
      />

      {/* Price summary */}
      <div className="p-6 rounded-2xl border-2 border-primary/20 bg-primary/5 text-center">
        <p className="text-sm text-muted-foreground mb-1">Total</p>
        <p className="text-3xl font-bold text-primary">{price || PRICING_DISPLAY.REPEAT_SCRIPT}</p>
        <p className="text-xs text-muted-foreground mt-2">One-time payment • No subscription</p>
      </div>

      {/* Refund guarantee */}
      <RefundGuaranteeBadge variant="inline" />

      {/* Availability status */}
      <div className="flex justify-center">
        <AvailabilityIndicator variant="badge" />
      </div>

      {/* Payment methods */}
      <div className="flex flex-col items-center gap-3">
        <PaymentMethodIcons />
        <StripeBadge variant="powered-by" />
      </div>

      {/* Security & Trust badges */}
      <CheckoutTrustStrip variant="compact" />

      {/* AHPRA statement */}
      <AHPRAStatement variant="inline" className="justify-center" />

      {isProcessing && (
        <p className="text-center text-sm text-muted-foreground animate-pulse">
          Redirecting to secure checkout...
        </p>
      )}
    </div>
  )
}
