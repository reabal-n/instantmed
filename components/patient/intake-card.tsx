"use client"

import { ChevronRight,FileText, Pill } from "lucide-react"

import { type Intake, resolveStatusConfig } from "@/components/patient/intake-types"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export function IntakeCard({
  intake,
  onClick,
}: {
  intake: Intake
  onClick: () => void
}) {
  const config = resolveStatusConfig(intake.status)
  const Icon = config.icon
  const isReady = ["approved", "completed"].includes(intake.status)

  const getServiceName = () => {
    if (intake.service?.name) return intake.service.name
    if (intake.service?.short_name) return intake.service.short_name
    if (intake.service?.type === "med_certs") return "Medical Certificate"
    if (intake.service?.type === "common_scripts") return "Prescription"
    return "Request"
  }

  const serviceName = getServiceName()

  return (
    <button
      onClick={onClick}
      aria-label={`View ${serviceName}, ${config.label}`}
      className={cn(
        "w-full text-left group cursor-pointer",
        "bg-white dark:bg-card border border-border/50 dark:border-white/15",
        "shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl p-4 sm:p-5",
        "transition-[transform,box-shadow,border-color] duration-300",
        "hover:border-primary/40 hover:shadow-md hover:shadow-primary/[0.06] hover:-translate-y-0.5",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 sm:items-center sm:gap-4 sm:flex-1">
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
              intake.service?.type === "common_scripts" ? "bg-info-light" : "bg-primary/10"
            )}>
            {intake.service?.type === "common_scripts" ? (
              <Pill className="w-5 h-5 text-info" aria-hidden="true" />
            ) : (
              <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground sm:truncate">
              {serviceName}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDate(intake.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3 sm:border-0 sm:pt-0">
          <Badge
            shape="pill"
            size="sm"
            className={cn("shrink-0 border-current/15 px-2.5 py-1", config.color)}
          >
            <Icon className="w-3 h-3" aria-hidden="true" />
            {config.label}
          </Badge>
          <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
            {isReady ? "View & download" : "View"}
          </span>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </button>
  )
}
