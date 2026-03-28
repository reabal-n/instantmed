"use client"

import { CheckCircle } from "lucide-react"
import { MED_CERT_COPY } from "@/lib/microcopy/med-cert-v2"
import { StepHeader } from "@/components/med-cert/med-cert-shared"

interface PaymentStepProps {
  requiresCall: boolean
}

export function PaymentStep({ requiresCall }: PaymentStepProps) {
  return (
    <div className="space-y-6 animate-step-enter">
      <StepHeader
        emoji="💳"
        title={MED_CERT_COPY.payment.heading}
        subtitle={MED_CERT_COPY.payment.subtitle}
      />

      <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">Total</span>
          <span className="text-2xl font-semibold text-primary">
            {requiresCall ? MED_CERT_COPY.payment.priceExtended : MED_CERT_COPY.payment.price}
          </span>
        </div>

        <hr className="border-border" />

        <ul className="space-y-2">
          {MED_CERT_COPY.payment.includes.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        {MED_CERT_COPY.payment.disclaimer}
      </p>
    </div>
  )
}
