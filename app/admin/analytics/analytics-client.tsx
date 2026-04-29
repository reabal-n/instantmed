"use client"

import { ExternalLink } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { DashboardHeader } from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import type { BusinessKPIData } from "@/lib/data/business-kpi"
import { cn } from "@/lib/utils"

import { AnalyticsBusinessKPIsTab } from "./analytics-business-kpis-tab"
import { AnalyticsFunnelTab } from "./analytics-funnel-tab"
import { type AnalyticsData, type TabKey } from "./analytics-helpers"
import { AnalyticsOverviewTab } from "./analytics-overview-tab"
import { AnalyticsQueueTab } from "./analytics-queue-tab"
import { AnalyticsRevenueTab } from "./analytics-revenue-tab"

interface AnalyticsDashboardClientProps {
  analytics: AnalyticsData
  /** Optional KPI data; lets the Business KPIs tab degrade gracefully on fetch failure. */
  businessKpis: BusinessKPIData | null
}

const VALID_TABS: TabKey[] = [
  "overview",
  "funnel",
  "revenue",
  "queue",
  "business-kpis",
]

function isValidTab(value: string | null): value is TabKey {
  return value !== null && (VALID_TABS as string[]).includes(value)
}

export function AnalyticsDashboardClient({
  analytics,
  businessKpis,
}: AnalyticsDashboardClientProps) {
  const searchParams = useSearchParams()
  const initial = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<TabKey>(
    isValidTab(initial) ? initial : "overview",
  )

  // Sync state when the URL ?tab= changes (back/forward navigation,
  // /admin/business-kpi redirect landing here with ?tab=business-kpis).
  useEffect(() => {
    const next = searchParams.get("tab")
    if (isValidTab(next) && next !== activeTab) {
      setActiveTab(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "funnel", label: "Conversion Funnel" },
    { key: "revenue", label: "Revenue" },
    { key: "queue", label: "Queue Health" },
    { key: "business-kpis", label: "Business KPIs" },
  ]

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <DashboardHeader
          title="Analytics Hub"
          description="Comprehensive business intelligence and operational metrics"
          backHref="/admin"
          backLabel="Admin"
          actions={
            <Button variant="outline" asChild>
              <a href="https://app.posthog.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open PostHog
              </a>
            </Button>
          }
        />

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-[background-color,color]",
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && <AnalyticsOverviewTab analytics={analytics} />}
        {activeTab === "funnel" && <AnalyticsFunnelTab analytics={analytics} />}
        {activeTab === "revenue" && <AnalyticsRevenueTab analytics={analytics} />}
        {activeTab === "queue" && <AnalyticsQueueTab analytics={analytics} />}
        {activeTab === "business-kpis" && (
          businessKpis ? (
            <AnalyticsBusinessKPIsTab data={businessKpis} />
          ) : (
            <div className="rounded-xl border border-border/50 bg-muted/20 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Business KPIs are temporarily unavailable. Refresh in a moment.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
