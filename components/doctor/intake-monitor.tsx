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
  if (minutes === null) return "--"
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

function StatCell({ label, value, icon: Icon, variant = "default" }: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  variant?: "default" | "success" | "warning" | "danger"
}) {
  const colorMap = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-destructive",
  }

  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/40 border border-border/30">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={cn("text-xl font-semibold tabular-nums tracking-tight", colorMap[variant])}>
        {value}
      </div>
    </div>
  )
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
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Activity className="h-4 w-4 text-primary" />
            Live Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground tabular-nums">
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
      <CardContent className="space-y-3">
        {/* Primary Metrics */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCell
            label="Today"
            value={stats.todaySubmissions}
            icon={TrendingUp}
          />
          <StatCell
            label="Queue"
            value={stats.queueSize}
            icon={Users}
            variant={queueHealthy ? "default" : "warning"}
          />
          <StatCell
            label="Avg Time"
            value={formatDuration(stats.avgReviewTimeMinutes)}
            icon={Clock}
            variant={avgTimeHealthy ? "default" : "warning"}
          />
          <StatCell
            label="Oldest"
            value={formatDuration(stats.oldestInQueueMinutes)}
            icon={AlertCircle}
          />
        </div>

        {/* SLA Alerts */}
        {(stats.slaBreached ?? 0) > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
            <span className="text-[13px] font-medium text-destructive">
              {stats.slaBreached} case{stats.slaBreached !== 1 ? "s" : ""} past SLA deadline
            </span>
          </div>
        )}
        {(stats.slaApproaching ?? 0) > 0 && (stats.slaBreached ?? 0) === 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-[13px] font-medium text-amber-700 dark:text-amber-300">
              {stats.slaApproaching} case{stats.slaApproaching !== 1 ? "s" : ""} approaching deadline
            </span>
          </div>
        )}

        {/* Secondary Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/40">
          <div className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[13px] text-muted-foreground">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">{stats.paidCount}</span> paid
            </span>
            {stats.pendingCount > 0 && (
              <Badge variant="outline" className="text-[11px] h-5 px-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20">
                {stats.pendingCount} pending
              </Badge>
            )}
          </div>

          <div className="h-3.5 w-px bg-border/60" />

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">{stats.approvedToday}</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5 text-destructive/70" />
              <span className="text-[13px] font-medium text-destructive tabular-nums">{stats.declinedToday}</span>
            </div>
            {approvalRate !== null && (
              <span className="text-[11px] text-muted-foreground">
                ({approvalRate}%)
              </span>
            )}
          </div>

          {stats.queueSize === 0 && (
            <>
              <div className="h-3.5 w-px bg-border/60" />
              <Badge variant="outline" className="text-[11px] h-5 px-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20">
                Queue clear
              </Badge>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
