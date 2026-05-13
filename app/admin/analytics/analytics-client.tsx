"use client"

import { ExternalLink } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { DashboardPageHeader } from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import { STAFF_DASHBOARD_HREF } from "@/lib/dashboard/routes"
import { cn } from "@/lib/utils"

import { AnalyticsFunnelTab } from "./analytics-funnel-tab"
import { type AnalyticsData, type TabKey } from "./analytics-helpers"
import { AnalyticsQueueTab } from "./analytics-queue-tab"
import { AnalyticsRevenueTab } from "./analytics-revenue-tab"

interface AnalyticsDashboardClientProps {
  analytics: AnalyticsData
}

const VALID_TABS: TabKey[] = [
  "revenue",
  "funnel",
  "queue",
]

function isValidTab(value: string | null): value is TabKey {
  return value !== null && (VALID_TABS as string[]).includes(value)
}

export function AnalyticsDashboardClient({
  analytics,
}: AnalyticsDashboardClientProps) {
  const searchParams = useSearchParams()
  const initial = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<TabKey>(
    isValidTab(initial) ? initial : "revenue",
  )

  // Sync state when the URL ?tab= changes (back/forward navigation).
  useEffect(() => {
    const next = searchParams.get("tab")
    if (isValidTab(next) && next !== activeTab) {
      setActiveTab(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const tabs: { key: TabKey; label: string }[] = [
    { key: "revenue", label: "Revenue" },
    { key: "funnel", label: "Conversion" },
    { key: "queue", label: "Queue Health" },
  ]

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <DashboardPageHeader
          title="Analytics"
          description="Revenue, conversion, and queue health only."
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
        {activeTab === "revenue" && <AnalyticsRevenueTab analytics={analytics} />}
        {activeTab === "funnel" && <AnalyticsFunnelTab analytics={analytics} />}
        {activeTab === "queue" && <AnalyticsQueueTab analytics={analytics} />}
      </div>
    </div>
  )
}
