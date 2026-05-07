import { ExternalLink } from "lucide-react"
import Link from "next/link"

import { type Intake, resolveStatusConfig } from "@/components/patient/intake-types"
import { Button } from "@/components/ui/button"
import { getPatientStatusNextStep } from "@/lib/data/status"
import { formatDate, formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"

export function IntakeDetailDrawer({ intake }: { intake: Intake }) {
  const config = resolveStatusConfig(intake.status)
  const Icon = config.icon

  const serviceName = intake.service?.name || intake.service?.short_name || "Request"
  const refId = intake.id.slice(0, 8).toUpperCase()
  const whatsNext = getPatientStatusNextStep(intake.status)

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
