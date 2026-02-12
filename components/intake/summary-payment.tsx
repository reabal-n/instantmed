"use client"

import type * as React from "react"
import { useState } from "react"
import { Edit2, Lock, Loader2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { ConfettiButton } from "@/components/ui/confetti"
import {
  RefundGuaranteeBadge,
  AHPRAStatement,
  CheckoutSecurityFooter,
} from "@/components/checkout"
import { CheckoutActivityBadge } from "@/components/marketing/social-proof-notifications"
import type { FlowConfig } from "@/lib/intake/flow-engine"
import { generateDoctorSummary } from "@/lib/intake/flow-engine"

interface SummaryPaymentProps {
  config: FlowConfig
  data: Record<string, unknown>
  price: string
  medicare: { number: string; irn: number | null }
  onEdit: (sectionId: string) => void
  onSubmit: () => Promise<void>
  isSubmitting?: boolean
}

// Summary row
function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string
  value: React.ReactNode
  onEdit?: () => void
}) {
  return (
    <div className="flex items-start justify-between py-2">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium text-right">{value}</div>
        {onEdit && (
          <button type="button" onClick={onEdit} className="p-1 rounded hover:bg-muted transition-colors">
            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  )
}

export function SummaryPayment({
  config,
  data,
  price,
  medicare,
  onEdit,
  onSubmit,
  isSubmitting = false,
}: SummaryPaymentProps) {
  const [additionalNotes, setAdditionalNotes] = useState(typeof data.additionalNotes === 'string' ? data.additionalNotes : "")
  const [_showConfetti, _setShowConfetti] = useState(false)

  // Generate structured summary
  const summary = generateDoctorSummary(config, data)

  // Compute safety display value
  const safetyDisplayValue = (() => {
    if (data.emergency_symptoms && Array.isArray(data.emergency_symptoms)) {
      const symptoms = data.emergency_symptoms as string[]
      return symptoms.includes('none') ? 'None reported ✓' : symptoms.join(', ')
    }
    return null
  })()


  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">Review & pay</h3>
        <p className="text-sm text-muted-foreground mt-1">Double-check everything looks right</p>
      </div>

      {/* Summary card */}
      <div className="rounded-2xl border border-white/50 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-xl divide-y divide-border/50">
        {/* Request type */}
        <div className="p-4">
          <SummaryRow label="Request type" value={config.name} />
        </div>

        {/* Details */}
        <div className="p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Details</div>
          {Object.entries((summary.sections ?? {}) as Record<string, Record<string, unknown>>).map(([sectionName, sectionData]) => (
            <div key={sectionName}>
              {Object.entries(sectionData).map(([key, val]) => (
                <SummaryRow
                  key={key}
                  label={key}
                  value={Array.isArray(val) ? val.join(", ") : String(val)}
                  onEdit={() => onEdit(sectionName.toLowerCase())}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Safety confirmations - show relevant safety answers */}
        {(data.emergency_symptoms || data.safety_confirmed !== undefined) && (
          <div className="p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Safety Check</div>
            {safetyDisplayValue ? (
              <SummaryRow label="Emergency symptoms" value={safetyDisplayValue} />
            ) : data.safety_confirmed === true ? (
              <SummaryRow 
                label="Emergency symptoms" 
                value="None reported ✓" 
              />
            ) : null}
          </div>
        )}

        {/* Medicare */}
        <div className="p-4">
          <SummaryRow
            label="Medicare"
            value={`${medicare.number} (IRN ${medicare.irn})`}
            onEdit={() => onEdit("medicare")}
          />
        </div>

        {/* Price */}
        <div className="p-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Total</div>
            <div className="text-xl font-bold">{price}</div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Payment taken now. Full refund if your request is declined.
          </p>
        </div>
      </div>

      {/* Additional notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Anything else the doctor should know?</label>
        <Textarea
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Optional — add any extra details here..."
          className="min-h-20"
        />
      </div>

      {/* AI disclosure */}
      <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 border border-blue-100 dark:border-blue-900/50">
        <span className="font-medium text-blue-700 dark:text-blue-400">How we process your request:</span>{" "}
        Your information will be summarized by AI to help the doctor review your request efficiently. 
        The doctor makes all clinical decisions.
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
        A doctor will review your request. They may message you if they need more info. Most requests are completed
        within 1-2 hours (8am–10pm AEST). Review times may vary.
      </div>

      {/* Refund guarantee */}
      <RefundGuaranteeBadge variant="inline" />

      {/* AHPRA statement */}
      <AHPRAStatement variant="inline" />

      {/* Mobile social proof */}
      <CheckoutActivityBadge className="sm:hidden" />

      {/* Submit button - sticky on mobile */}
      <div className="sticky bottom-0 bg-background pt-2 pb-4 -mx-4 px-4 border-t mt-6">
        <ConfettiButton
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full h-12 text-base font-medium"
          options={{
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#2563EB", "#4f46e5", "#4f46e5", "#F59E0B", "#10B981"],
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Submit for review · {price}
            </>
          )}
        </ConfettiButton>
        <CheckoutSecurityFooter className="mt-4" />
      </div>
    </div>
  )
}
