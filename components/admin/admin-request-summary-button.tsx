"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format"
import { formatIntakeStatus } from "@/lib/format/intake"

interface AdminSummaryIntake {
  id: string
  reference_number?: string | null
  status: string
  payment_status?: string | null
  refund_status?: string | null
  refund_error?: string | null
  amount_cents?: number | null
  created_at: string
}

function buildAdminRequestSummary({
  intake,
  serviceLabel,
  patientLabel,
  summaryTitle,
}: {
  intake: AdminSummaryIntake
  serviceLabel: string
  patientLabel: string
  summaryTitle: string
}) {
  return [
    summaryTitle,
    `Request ID: ${intake.id}`,
    `Reference: ${intake.reference_number || intake.id.slice(0, 8).toUpperCase()}`,
    `Patient: ${patientLabel}`,
    `Service: ${serviceLabel}`,
    `Request status: ${formatIntakeStatus(intake.status)}`,
    `Payment status: ${intake.payment_status || "unknown"}`,
    `Refund status: ${intake.refund_status || "not_applicable"}`,
    intake.refund_error ? `Refund error: ${intake.refund_error}` : null,
    typeof intake.amount_cents === "number" ? `Amount: ${formatCurrency(intake.amount_cents)}` : null,
    `Submitted: ${new Date(intake.created_at).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
  ].filter(Boolean).join("\n")
}

export function AdminRequestSummaryButton({
  intake,
  serviceLabel,
  patientLabel,
  buttonLabel = "Copy admin summary",
  summaryTitle = "Admin request summary",
}: {
  intake: AdminSummaryIntake
  serviceLabel: string
  patientLabel: string
  buttonLabel?: string
  summaryTitle?: string
}) {
  const [copied, setCopied] = useState(false)
  const summary = buildAdminRequestSummary({ intake, serviceLabel, patientLabel, summaryTitle })

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary)
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
    <Button type="button" variant="outline" onClick={handleCopy}>
      {copied ? (
        <Check className="mr-2 h-4 w-4 text-success" aria-hidden="true" />
      ) : (
        <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
      )}
      {copied ? "Copied" : buttonLabel}
    </Button>
  )
}
