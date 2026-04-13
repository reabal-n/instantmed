import { ExternalLink } from "lucide-react"
import Link from "next/link"

import { type Intake, resolveStatusConfig } from "@/components/patient/intake-types"
import { Button } from "@/components/ui/button"
import { formatDate, formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"

/** What's Next guidance - moved from card to drawer for cleaner list view */
const WHATS_NEXT: Record<string, { message: string; actionLabel?: string }> = {
  paid: { message: "A doctor will review your request shortly. We'll email you when it's done." },
  in_review: { message: "A doctor is reviewing your request now. Hang tight, shouldn't be long." },
  pending_info: { message: "The doctor has a question for you. Please respond so we can keep things moving.", actionLabel: "Respond now" },
  approved: { message: "All approved. Your document is ready to download.", actionLabel: "View & download" },
  declined: { message: "This request wasn't approved. You can view the reason below.", actionLabel: "View details" },
  awaiting_script: { message: "Your prescription is being prepared. We'll let you know when it's ready." },
  completed: { message: "This request is complete. Your documents are available.", actionLabel: "View documents" },
  cancelled: { message: "This request was cancelled. No charge was made." },
}

export function IntakeDetailDrawer({ intake }: { intake: Intake }) {
  const config = resolveStatusConfig(intake.status)
  const Icon = config.icon

  const serviceName = intake.service?.name || intake.service?.short_name || "Request"
  const refId = intake.id.slice(0, 8).toUpperCase()
  const whatsNext = WHATS_NEXT[intake.status]

  return (
    <div className="p-6 space-y-6">
      {/* Service & Ref */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">{serviceName}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Ref: {refId}</p>
      </div>

      {/* Status */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">Status</p>
        <div className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium", config.color)}>
          <Icon className="w-4 h-4" />
          {config.label}
        </div>
      </div>

      {/* What's Next */}
      {whatsNext && (
        <div className="p-4 rounded-xl bg-muted/50 border border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">What happens next</p>
          <p className="text-sm text-foreground">{whatsNext.message}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Submitted</p>
          <p className="font-medium text-foreground">{formatDate(intake.created_at)}</p>
          <p className="text-xs text-muted-foreground">{formatRelative(intake.created_at)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Last updated</p>
          <p className="font-medium text-foreground">{formatDate(intake.updated_at)}</p>
          <p className="text-xs text-muted-foreground">{formatRelative(intake.updated_at)}</p>
        </div>
      </div>

      {/* Action */}
      <div className="pt-4 border-t border-border">
        <Button asChild className="w-full">
          <Link href={`/patient/intakes/${intake.id}`}>
            <ExternalLink className="w-4 h-4 mr-2" />
            {whatsNext?.actionLabel || "View full details"}
          </Link>
        </Button>
      </div>
    </div>
  )
}
