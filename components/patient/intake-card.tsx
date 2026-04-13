"use client"

import { ChevronRight,FileText, Pill } from "lucide-react"

import { type Intake, resolveStatusConfig } from "@/components/patient/intake-types"
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
      className="w-full bg-card rounded-xl border border-border p-5 hover:border-primary/60 hover:shadow-lg transition-all text-left group hover-lift"
    >
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
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
            <h3 className="font-semibold text-foreground mb-1">
              {serviceName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {formatDate(intake.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center gap-1.5 text-xs font-medium", config.color)}>
            <Icon className="w-3 h-3" />
            {config.label}
          </div>
          <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
            {isReady ? "View & download" : "View"}
          </span>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </button>
  )
}
