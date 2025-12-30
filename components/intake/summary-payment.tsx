"use client"

import type * as React from "react"
import { useState } from "react"
import { Edit2, Lock, Shield, Loader2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { ConfettiButton } from "@/components/ui/confetti"
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
  const [additionalNotes, setAdditionalNotes] = useState<string>(
    typeof data.additionalNotes === 'string' ? data.additionalNotes : ""
  )
  const [showConfetti, setShowConfetti] = useState(false)

  // Generate structured summary
  const summary = generateDoctorSummary(config, data)

  // Trust badges
  const badges = [
    { icon: Shield, label: "AHPRA registered doctors" },
    { icon: Lock, label: "Secure payment via Stripe" },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">Review & pay</h3>
        <p className="text-sm text-muted-foreground mt-1">Double-check everything looks right</p>
      </div>

      {/* Summary card */}
      <div className="rounded-2xl border bg-card divide-y">
        {/* Request type */}
        <div className="p-4">
          <SummaryRow label="Request type" value={config.name} />
        </div>

        {/* Details */}
        <div className="p-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Details</div>
          {summary.sections && typeof summary.sections === 'object' ? Object.entries(summary.sections as Record<string, Record<string, unknown>>).map(([sectionName, sectionData]) => (
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
          )) : null}
        </div>

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
          <p className="text-xs text-muted-foreground mt-1">Only charged if approved by a doctor</p>
        </div>
      </div>

      {/* Additional notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Anything else the doctor should know?</label>
        <Textarea
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="Optional — add any extra details here..."
          className="min-h-[80px]"
        />
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
        A doctor will review your request. They may message you if they need more info. Most requests are completed
        within 1 hour (8am–10pm AEST).
      </div>

      {/* Trust badges */}
      <div className="flex justify-center gap-4">
        {badges.map((badge) => (
          <div key={badge.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <badge.icon className="w-3.5 h-3.5" />
            <span>{badge.label}</span>
          </div>
        ))}
      </div>

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
            colors: ["#00E2B5", "#06B6D4", "#8B5CF6", "#F59E0B", "#10B981"],
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
              Pay {price} & submit
            </>
          )}
        </ConfettiButton>
        <p className="text-xs text-center text-muted-foreground mt-2">Secure payment via Stripe</p>
      </div>
    </div>
  )
}
