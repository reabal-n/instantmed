import { Calendar, ChevronRight, Download, type LucideIcon } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { INTAKE_STATUS, type IntakeStatus } from "@/lib/data/status"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

interface RequestCardProps {
  href: string
  title: string
  date: string
  refId: string
  status: string
  icon: LucideIcon
  iconClassName?: string
  iconContainerClassName?: string
}

export function RequestCard({
  href,
  title,
  date,
  refId,
  status,
  icon: Icon,
  iconClassName = "w-5 h-5 text-primary",
  iconContainerClassName = "bg-primary/10",
}: RequestCardProps) {
  const config = INTAKE_STATUS[status as IntakeStatus] || INTAKE_STATUS.pending
  const StatusIcon = config.icon
  const isReady = status === "approved" || status === "completed"

  return (
    <Link href={href}>
      <Card className="hover:border-primary/50 hover:shadow-md transition-[border-color,box-shadow] cursor-pointer group">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 sm:items-center sm:gap-4 sm:flex-1">
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                iconContainerClassName,
              )}>
                <Icon className={iconClassName} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground sm:truncate">
                  {title}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    {formatDate(date)}
                  </span>
                  <span className="whitespace-nowrap">Ref: {refId}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3 sm:border-0 sm:pt-0">
              {isReady && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-success">
                  <Download className="w-4 h-4" aria-hidden="true" />
                  Ready
                </span>
              )}
              <Badge className={cn("flex shrink-0 items-center gap-1", config.color)}>
                <StatusIcon className="w-3.5 h-3.5" aria-hidden="true" />
                {config.label}
              </Badge>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
