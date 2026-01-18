"use client"

/**
 * Payment Step - Repeat Prescription Intake
 * 
 * Handles payment initiation (redirects to Stripe).
 * ~60 lines - well under 200 line limit.
 */

import { CreditCard, Shield, Lock } from "lucide-react"
import { StepHeader } from "../shared"
import { PRICING_DISPLAY } from "@/lib/constants"

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

      {/* Security badges */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Lock className="w-4 h-4" />
          <span>SSL Encrypted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CreditCard className="w-4 h-4" />
          <span>Stripe Secure</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="w-4 h-4" />
          <span>PCI Compliant</span>
        </div>
      </div>

      {isProcessing && (
        <p className="text-center text-sm text-muted-foreground animate-pulse">
          Redirecting to secure checkout...
        </p>
      )}
    </div>
  )
}
