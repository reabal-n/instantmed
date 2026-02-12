"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Award,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface DoctorPerformanceStats {
  reviewedToday: number
  approvedToday: number
  declinedToday: number
  avgReviewTimeMinutes: number | null
  approvalRate: number | null
  reviewedThisWeek: number
  reviewedThisMonth: number
}

interface DoctorPerformanceProps {
  stats: DoctorPerformanceStats
  doctorName: string
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return "--"
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function DoctorPerformance({ stats, doctorName }: DoctorPerformanceProps) {
  const firstName = doctorName.split(" ")[0]
  const avgTimeHealthy = stats.avgReviewTimeMinutes === null || stats.avgReviewTimeMinutes < 45

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Award className="h-4 w-4 text-primary" />
          Your Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Today's Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 rounded-lg bg-muted/40 border border-border/30">
            <div className="text-xl font-semibold tabular-nums tracking-tight text-foreground">{stats.reviewedToday}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Reviewed</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xl font-semibold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-400">{stats.approvedToday}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Approved</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-rose-50/50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
            <div className="flex items-center justify-center gap-1">
              <XCircle className="h-3.5 w-3.5 text-destructive/70" />
              <span className="text-xl font-semibold tabular-nums tracking-tight text-rose-700 dark:text-rose-400">{stats.declinedToday}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Declined</div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Clock className={cn(
                "h-3.5 w-3.5",
                avgTimeHealthy ? "text-muted-foreground" : "text-amber-500"
              )} />
              <div>
                <div className={cn(
                  "text-[13px] font-medium tabular-nums",
                  avgTimeHealthy ? "text-foreground" : "text-amber-700 dark:text-amber-400"
                )}>
                  {formatDuration(stats.avgReviewTimeMinutes)}
                </div>
                <div className="text-xs text-muted-foreground leading-none">avg time</div>
              </div>
            </div>

            {stats.approvalRate !== null && (
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <div className="text-[13px] font-medium text-foreground tabular-nums">
                    {stats.approvalRate}%
                  </div>
                  <div className="text-xs text-muted-foreground leading-none">approval</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Wk <span className="font-medium text-foreground tabular-nums">{stats.reviewedThisWeek}</span></span>
            </div>
            <div className="h-3 w-px bg-border/60" />
            <span>Mo <span className="font-medium text-foreground tabular-nums">{stats.reviewedThisMonth}</span></span>
          </div>
        </div>

        {/* Encouragement */}
        {stats.reviewedToday >= 10 && (
          <Badge variant="outline" className="text-xs h-5 bg-primary/5 text-primary border-primary/20">
            Great work today, {firstName}!
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}
