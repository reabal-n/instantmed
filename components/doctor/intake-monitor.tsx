"use client"

import {
  Activity,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Clock,
  CreditCard,
  DollarSign,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react"
import { useCallback,useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMinutes } from "@/lib/format"
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
  // AI auto-approval metrics
  aiApprovedToday?: number
  aiRevokedToday?: number
  aiAttemptedToday?: number
  aiIneligibleToday?: number
  todayEarnings?: number
}

interface IntakeMonitorProps {
  initialStats: IntakeMonitorStats
  refreshInterval?: number
}

function StatCell({ label, value, icon: Icon, variant = "default" }: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  variant?: "default" | "success" | "warning" | "danger"
}) {
  const colorMap = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  }

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-card border border-border/50 shadow-sm" aria-label={`${label}: ${value}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <Icon className="h-3.5 w-3.5" />
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
  const [showDetails, setShowDetails] = useState(false)

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

  // AI auto-approval hit rate: approved / eligible (attempted - ineligible)
  const aiEligibleAttempts = (stats.aiAttemptedToday ?? 0) - (stats.aiIneligibleToday ?? 0)
  const aiHitRate = aiEligibleAttempts > 0
    ? Math.min(100, Math.round(((stats.aiApprovedToday ?? 0) / aiEligibleAttempts) * 100))
    : null

  const queueHealthy = stats.queueSize < 10
  const avgTimeHealthy = stats.avgReviewTimeMinutes === null || stats.avgReviewTimeMinutes < 60
  const oldestVariant = stats.oldestInQueueMinutes === null
    ? "default"
    : stats.oldestInQueueMinutes > 1440 // > 24h
      ? "danger"
      : stats.oldestInQueueMinutes > 60
        ? "warning"
        : "default"

  return (
    <Card className="border-border rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Activity className="h-4 w-4 text-primary" />
            Live Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">
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
      <CardContent className="space-y-4 pb-4">
        {/* Primary Metrics */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
            value={formatMinutes(stats.avgReviewTimeMinutes)}
            icon={Clock}
            variant={avgTimeHealthy ? "default" : "warning"}
          />
          <StatCell
            label="Oldest"
            value={formatMinutes(stats.oldestInQueueMinutes)}
            icon={AlertCircle}
            variant={oldestVariant}
          />
        </div>

        {/* SLA breach + approaching alerts now render at dashboard level
            (components/doctor/sla-breach-hero.tsx) so they appear above the
            stats grid and can't be missed. Phase 2 doctor portal rebuild. */}

        {/* Secondary Row — collapsed by default */}
        <div className="pt-2 border-t border-border/40">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            aria-expanded={showDetails}
          >
            <span className="flex items-center gap-2 flex-1 flex-wrap">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-emerald-500" />
                <span className="font-medium text-success tabular-nums">{stats.approvedToday}</span>
                <span>approved</span>
              </span>
              <span className="text-border/60">·</span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-destructive/70" />
                <span className="font-medium text-destructive tabular-nums">{stats.declinedToday}</span>
                <span>declined</span>
              </span>
              {approvalRate !== null && <span>({approvalRate}%)</span>}
            </span>
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", showDetails && "rotate-180")} />
          </button>

          {showDetails && (
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {stats.todayEarnings != null && stats.todayEarnings > 0 && (
                <>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-sm font-medium text-success tabular-nums">
                      ${(stats.todayEarnings / 100).toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">today</span>
                  </div>
                  <div className="h-3.5 w-px bg-border/60" />
                </>
              )}

              <div className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-medium text-success">{stats.paidCount}</span> paid
                </span>
                {stats.pendingCount > 0 && (
                  <Badge
                    variant="outline"
                    className="text-xs h-5 px-1.5 bg-warning-light text-warning border-warning-border"
                    title="Stripe payments awaiting webhook confirmation"
                  >
                    {stats.pendingCount} payment pending
                  </Badge>
                )}
              </div>

              {(stats.aiApprovedToday != null && (stats.aiAttemptedToday ?? 0) > 0) && (
                <>
                  <div className="h-3.5 w-px bg-border/60" />
                  <div className="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{stats.aiApprovedToday} AI approved</span>
                    {aiHitRate !== null && (
                      <span className="text-muted-foreground">({aiHitRate}% hit rate)</span>
                    )}
                    {stats.aiRevokedToday ? (
                      <span className="text-muted-foreground">· {stats.aiRevokedToday} revoked</span>
                    ) : null}
                  </div>
                </>
              )}

              {stats.queueSize === 0 && (
                <>
                  <div className="h-3.5 w-px bg-border/60" />
                  <Badge variant="outline" className="text-xs h-5 px-1.5 bg-success-light text-success border-success-border">
                    Queue clear
                  </Badge>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
