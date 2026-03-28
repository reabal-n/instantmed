import Link from "next/link"
import { Calendar, ChevronRight, Download, type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { INTAKE_STATUS, type IntakeStatus } from "@/lib/status"
import { formatDate } from "@/lib/format"

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
      <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                iconContainerClassName,
              )}>
                <Icon className={iconClassName} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {title}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    {formatDate(date)}
                  </span>
                  <span>Ref: {refId}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isReady && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-success">
                  <Download className="w-4 h-4" aria-hidden="true" />
                  Ready
                </span>
              )}
              <Badge className={cn("flex items-center gap-1", config.color)}>
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
