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
  if (minutes === null) return "—"
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function DoctorPerformance({ stats, doctorName }: DoctorPerformanceProps) {
  const firstName = doctorName.split(" ")[0]
  const avgTimeHealthy = stats.avgReviewTimeMinutes === null || stats.avgReviewTimeMinutes < 45

  return (
    <Card className="border-dusk-200/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Award className="h-4 w-4 text-lumen-500" />
          Your Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-dusk-50/50">
            <div className="text-2xl font-bold text-dusk-900">{stats.reviewedToday}</div>
            <div className="text-xs text-muted-foreground">Reviewed today</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-emerald-50/50">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-2xl font-bold text-emerald-700">{stats.approvedToday}</span>
            </div>
            <div className="text-xs text-muted-foreground">Approved</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-rose-50/50">
            <div className="flex items-center justify-center gap-1">
              <XCircle className="h-4 w-4 text-rose-500" />
              <span className="text-2xl font-bold text-rose-700">{stats.declinedToday}</span>
            </div>
            <div className="text-xs text-muted-foreground">Declined</div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="flex items-center justify-between pt-3 border-t border-dusk-100">
          <div className="flex items-center gap-4">
            {/* Avg Review Time */}
            <div className="flex items-center gap-2">
              <Clock className={cn(
                "h-4 w-4",
                avgTimeHealthy ? "text-muted-foreground" : "text-amber-500"
              )} />
              <div>
                <div className={cn(
                  "text-sm font-medium",
                  avgTimeHealthy ? "text-dusk-900" : "text-amber-700"
                )}>
                  {formatDuration(stats.avgReviewTimeMinutes)}
                </div>
                <div className="text-xs text-muted-foreground">avg time</div>
              </div>
            </div>

            {/* Approval Rate */}
            {stats.approvalRate !== null && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium text-dusk-900">
                    {stats.approvalRate}%
                  </div>
                  <div className="text-xs text-muted-foreground">approval</div>
                </div>
              </div>
            )}
          </div>

          {/* Period Summary */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Week: <span className="font-medium text-dusk-700">{stats.reviewedThisWeek}</span></span>
            </div>
            <div className="h-3 w-px bg-dusk-200" />
            <span>Month: <span className="font-medium text-dusk-700">{stats.reviewedThisMonth}</span></span>
          </div>
        </div>

        {/* Encouragement */}
        {stats.reviewedToday >= 10 && (
          <Badge className="bg-lumen-100 text-lumen-700 hover:bg-lumen-100">
            Great work today, {firstName}!
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}
