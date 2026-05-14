import { AlertCircle, CheckCircle2, Clock, MailCheck, Send } from "lucide-react"
import Link from "next/link"

import { Badge, type BadgeProps } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { buildAdminEmailHubHref } from "@/lib/dashboard/routes"
import type { CertDeliveryStatus } from "@/lib/data/issued-certificates"
import { cn } from "@/lib/utils"

/**
 * CertHealthChip — at-a-glance certificate delivery state.
 *
 * Phase 3 of dashboard remaster (2026-05-12). Replaces the operator habit of
 * opening the audit log to confirm "did the cert email actually land?"
 *
 * State precedence (worst-first):
 *   - Bounced / failed: red `AlertCircle` + failure reason in tooltip.
 *   - Resent more than once with no open: yellow `Send` + resend count.
 *   - Sent + opened by patient: green `MailCheck` + when.
 *   - Sent (not yet opened): blue `Send` + when.
 *   - No cert / not yet issued: neutral `Clock`.
 *
 * The chip links to the Email delivery queue for the full email
 * audit if the operator needs the bounce reason / message id.
 */
export interface CertHealthChipProps {
  certificate: CertDeliveryStatus | null
  intakeId: string
  className?: string
}

interface ChipState {
  icon: typeof Send
  variant: BadgeProps["variant"]
  label: string
  tooltip: string
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "unknown"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "unknown"
  return date.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function computeChipState(certificate: CertDeliveryStatus | null): ChipState {
  if (!certificate) {
    return {
      icon: Clock,
      variant: "outline",
      label: "Not issued",
      tooltip: "No certificate has been issued for this intake yet.",
    }
  }

  const { emailSentAt, emailFailedAt, emailFailureReason, emailOpenedAt, resendCount } = certificate
  const resends = resendCount ?? 0

  if (emailFailedAt && !emailSentAt) {
    return {
      icon: AlertCircle,
      variant: "destructive",
      label: "Send failed",
      tooltip: emailFailureReason
        ? `Email failed at ${formatTimestamp(emailFailedAt)}: ${emailFailureReason}`
        : `Email failed at ${formatTimestamp(emailFailedAt)}.`,
    }
  }

  if (emailOpenedAt) {
    const resendNote = resends > 0 ? ` Resent ${resends} time${resends === 1 ? "" : "s"}.` : ""
    return {
      icon: MailCheck,
      variant: "success",
      label: "Opened",
      tooltip: `Patient opened the email at ${formatTimestamp(emailOpenedAt)}.${resendNote}`,
    }
  }

  if (resends >= 2) {
    return {
      icon: Send,
      variant: "warning",
      label: `Resent ${resends}×`,
      tooltip: `Sent ${formatTimestamp(emailSentAt)}, resent ${resends} times, still unopened.`,
    }
  }

  if (emailSentAt) {
    return {
      icon: Send,
      variant: "info",
      label: resends > 0 ? `Sent (${resends}× resent)` : "Sent",
      tooltip: resends > 0
        ? `Sent ${formatTimestamp(emailSentAt)} — resent ${resends} time${resends === 1 ? "" : "s"}, not yet opened.`
        : `Sent ${formatTimestamp(emailSentAt)} — not yet opened.`,
    }
  }

  return {
    icon: CheckCircle2,
    variant: "outline",
    label: "Issued",
    tooltip: "Certificate generated; email has not been sent yet.",
  }
}

export function CertHealthChip({ certificate, intakeId, className }: CertHealthChipProps) {
  const state = computeChipState(certificate)
  const Icon = state.icon
  const href = buildAdminEmailHubHref({ tab: "queue", intakeId })

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={href}
            className={cn("inline-flex items-center", className)}
            aria-label={`Certificate delivery: ${state.label}`}
          >
            <Badge variant={state.variant} className="gap-1 text-[11px] font-medium">
              <Icon className="h-3 w-3" aria-hidden />
              {state.label}
            </Badge>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-xs text-xs">
          {state.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
