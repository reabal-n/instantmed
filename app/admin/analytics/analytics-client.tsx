"use client"

import {
  Activity,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  ExternalLink,
  Receipt,
  TrendingUp,
} from "lucide-react"

import { DashboardGrid, DashboardPageHeader, StatCard } from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import { STAFF_DASHBOARD_HREF } from "@/lib/dashboard/routes"
import { formatAUD, formatMinutes } from "@/lib/format"

import { type AnalyticsData } from "./analytics-helpers"

interface AnalyticsDashboardClientProps {
  analytics: AnalyticsData
}

export function AnalyticsDashboardClient({
  analytics,
}: AnalyticsDashboardClientProps) {
  const { funnel, revenue, queueHealth } = analytics
  const payRate = funnel.started > 0 ? Math.round((funnel.paid / funnel.started) * 100) : 0
  const completeRate = funnel.paid > 0 ? Math.round((funnel.completed / funnel.paid) * 100) : 0

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <DashboardPageHeader
          title="Analytics"
          description="Revenue, conversion, and queue health. Deeper product analysis stays in PostHog."
          backHref={STAFF_DASHBOARD_HREF}
          backLabel="Staff cockpit"
          actions={
            <Button variant="outline" asChild>
              <a href="https://app.posthog.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open PostHog
              </a>
            </Button>
          }
        />

        <section aria-labelledby="revenue-heading" className="space-y-3">
          <h2 id="revenue-heading" className="text-sm font-semibold text-foreground">Revenue</h2>
          <DashboardGrid columns={3} gap="md">
            <StatCard
              label="Today"
              value={formatAUD(revenue.today)}
              icon={<DollarSign className="h-5 w-5" />}
              status="success"
            />
            <StatCard
              label="7 days"
              value={formatAUD(revenue.thisWeek)}
              icon={<TrendingUp className="h-5 w-5" />}
              status="info"
            />
            <StatCard
              label="30 days"
              value={formatAUD(revenue.thisMonth)}
              icon={<Receipt className="h-5 w-5" />}
              status="info"
            />
          </DashboardGrid>
        </section>

        <section aria-labelledby="conversion-heading" className="space-y-3">
          <h2 id="conversion-heading" className="text-sm font-semibold text-foreground">Conversion</h2>
          <DashboardGrid columns={3} gap="md">
            <StatCard
              label="Started"
              value={funnel.started}
              icon={<Activity className="h-5 w-5" />}
              status="info"
            />
            <StatCard
              label="Paid"
              value={funnel.paid}
              icon={<CreditCard className="h-5 w-5" />}
              status="warning"
              trend={{ value: payRate, label: "of started" }}
            />
            <StatCard
              label="Approved"
              value={funnel.completed}
              icon={<CheckCircle className="h-5 w-5" />}
              status="success"
              trend={{ value: completeRate, label: "of paid" }}
            />
          </DashboardGrid>
        </section>

        <section aria-labelledby="queue-heading" className="space-y-3">
          <h2 id="queue-heading" className="text-sm font-semibold text-foreground">Queue health</h2>
          <DashboardGrid columns={3} gap="md">
            <StatCard
              label="Queue size"
              value={queueHealth.queueSize}
              icon={<Activity className="h-5 w-5" />}
              status={queueHealth.queueSize > 10 ? "error" : queueHealth.queueSize > 5 ? "warning" : "success"}
            />
            <StatCard
              label="Avg review"
              value={formatMinutes(queueHealth.avgReviewTimeMinutes)}
              icon={<Clock className="h-5 w-5" />}
              status={
                queueHealth.avgReviewTimeMinutes && queueHealth.avgReviewTimeMinutes > 120
                  ? "error"
                  : "info"
              }
            />
            <StatCard
              label="Oldest waiting"
              value={formatMinutes(queueHealth.oldestInQueueMinutes)}
              icon={<Clock className="h-5 w-5" />}
              status={
                queueHealth.oldestInQueueMinutes && queueHealth.oldestInQueueMinutes > 240
                  ? "error"
                  : queueHealth.oldestInQueueMinutes && queueHealth.oldestInQueueMinutes > 120
                    ? "warning"
                    : "success"
              }
            />
          </DashboardGrid>
        </section>
      </div>
    </div>
  )
}
