"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { capture } from "@/lib/analytics/capture"
import { formatIntakeStatus } from "@/lib/format/intake"
import { cn } from "@/lib/utils"

export interface SupportSummaryIntake {
  id: string
  status: string
  payment_status?: string | null
  created_at: string
}

export function buildSupportSummary({
  intake,
  serviceLabel,
}: {
  intake: SupportSummaryIntake
  serviceLabel: string
}) {
  return [
    "InstantMed support summary",
    `Request ID: ${intake.id}`,
    `Reference: ${intake.id.slice(0, 8).toUpperCase()}`,
    `Service: ${serviceLabel}`,
    `Request status: ${formatIntakeStatus(intake.status)}`,
    `Payment status: ${intake.payment_status || "unknown"}`,
    `Submitted: ${new Date(intake.created_at).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
  ].join("\n")
}

export function CopySupportSummaryButton({
  intake,
  serviceLabel,
  reason,
  className,
}: {
  intake: SupportSummaryIntake
  serviceLabel: string
  reason: "payment" | "refund"
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const summary = buildSupportSummary({ intake, serviceLabel })

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      capture("support_summary_copied", { intake_id: intake.id, reason })
    } catch {
      const input = document.createElement("textarea")
      input.value = summary
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
    }

    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={cn("w-full sm:w-auto", className)}
    >
      {copied ? (
        <Check className="mr-2 h-4 w-4 text-success" aria-hidden="true" />
      ) : (
        <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
      )}
      {copied ? "Copied" : "Copy support summary"}
    </Button>
  )
}
