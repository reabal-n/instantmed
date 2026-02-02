"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Activity,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  CreditCard,
  AlertCircle,
  RefreshCw,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface IntakeMonitorStats {
  todaySubmissions: number
  queueSize: number
  paidCount: number
  pendingCount: number
  approvedToday: number
  declinedToday: number
  avgReviewTimeMinutes: number | null
  oldestInQueueMinutes: number | null
  slaBreached?: number
  slaApproaching?: number
}

interface IntakeMonitorProps {
  initialStats: IntakeMonitorStats
  refreshInterval?: number
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—"
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

export function IntakeMonitor({ initialStats, refreshInterval = 30000 }: IntakeMonitorProps) {
  const [stats, setStats] = useState<IntakeMonitorStats>(initialStats)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchStats = useCallback(async () => {
    try {
      setIsRefreshing(true)
      const response = await fetch("/api/doctor/monitoring-stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        setLastUpdated(new Date())
      }
    } catch {
      // Silently fail - keep showing last known stats
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(fetchStats, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchStats, refreshInterval])

  const approvalRate = stats.approvedToday + stats.declinedToday > 0
    ? Math.round((stats.approvedToday / (stats.approvedToday + stats.declinedToday)) * 100)
    : null

  const queueHealthy = stats.queueSize < 10
  const avgTimeHealthy = stats.avgReviewTimeMinutes === null || stats.avgReviewTimeMinutes < 60

  return (
    <Card className="border-dusk-200/50 bg-linear-to-br from-white to-dusk-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Activity className="h-4 w-4 text-lumen-500" />
            Live Queue Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={fetchStats}
              disabled={isRefreshing}
              aria-label="Refresh stats"
            >
              <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Metrics Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Today's Submissions */}
          <div className="rounded-lg bg-white/60 p-3 shadow-sm ring-1 ring-dusk-100">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Today
            </div>
            <div className="mt-1 text-2xl font-bold text-dusk-900">
              {stats.todaySubmissions}
            </div>
            <div className="text-xs text-muted-foreground">submissions</div>
          </div>

          {/* Queue Size */}
          <div className={cn(
            "rounded-lg p-3 shadow-sm ring-1",
            queueHealthy 
              ? "bg-emerald-50/60 ring-emerald-200" 
              : "bg-amber-50/60 ring-amber-200"
          )}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              Queue
            </div>
            <div className={cn(
              "mt-1 text-2xl font-bold",
              queueHealthy ? "text-emerald-700" : "text-amber-700"
            )}>
              {stats.queueSize}
            </div>
            <div className="text-xs text-muted-foreground">waiting</div>
          </div>

          {/* Avg Review Time */}
          <div className={cn(
            "rounded-lg p-3 shadow-sm ring-1",
            avgTimeHealthy 
              ? "bg-white/60 ring-dusk-100" 
              : "bg-amber-50/60 ring-amber-200"
          )}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Avg Time
            </div>
            <div className={cn(
              "mt-1 text-2xl font-bold",
              avgTimeHealthy ? "text-dusk-900" : "text-amber-700"
            )}>
              {formatDuration(stats.avgReviewTimeMinutes)}
            </div>
            <div className="text-xs text-muted-foreground">to review</div>
          </div>

          {/* Oldest in Queue */}
          <div className="rounded-lg bg-white/60 p-3 shadow-sm ring-1 ring-dusk-100">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              Oldest
            </div>
            <div className="mt-1 text-2xl font-bold text-dusk-900">
              {formatDuration(stats.oldestInQueueMinutes)}
            </div>
            <div className="text-xs text-muted-foreground">in queue</div>
          </div>
        </div>

        {/* SLA Alerts */}
        {(stats.slaBreached ?? 0) > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">
              {stats.slaBreached} case{stats.slaBreached !== 1 ? "s" : ""} past SLA deadline
            </span>
          </div>
        )}
        {(stats.slaApproaching ?? 0) > 0 && (stats.slaBreached ?? 0) === 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              {stats.slaApproaching} case{stats.slaApproaching !== 1 ? "s" : ""} approaching deadline
            </span>
          </div>
        )}

        {/* Secondary Metrics */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-dusk-100">
          {/* Payment Status */}
          <div className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-medium text-emerald-600">{stats.paidCount}</span>
              <span className="text-muted-foreground"> paid</span>
            </span>
            {stats.pendingCount > 0 && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                {stats.pendingCount} pending
              </Badge>
            )}
          </div>

          <div className="h-4 w-px bg-dusk-200" />

          {/* Decisions Today */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600">{stats.approvedToday}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-rose-500" />
              <span className="text-sm font-medium text-rose-600">{stats.declinedToday}</span>
            </div>
            {approvalRate !== null && (
              <span className="text-xs text-muted-foreground">
                ({approvalRate}% approved)
              </span>
            )}
          </div>

          {stats.queueSize === 0 && (
            <>
              <div className="h-4 w-px bg-dusk-200" />
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                Queue clear
              </Badge>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
