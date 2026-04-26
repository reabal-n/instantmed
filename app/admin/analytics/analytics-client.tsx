"use client"

import { ExternalLink } from "lucide-react"
import { useState } from "react"

import { DashboardHeader } from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { AnalyticsFunnelTab } from "./analytics-funnel-tab"
import { type AnalyticsData, type TabKey } from "./analytics-helpers"
import { AnalyticsOverviewTab } from "./analytics-overview-tab"
import { AnalyticsQueueTab } from "./analytics-queue-tab"
import { AnalyticsRevenueTab } from "./analytics-revenue-tab"

interface AnalyticsDashboardClientProps {
  analytics: AnalyticsData
}

export function AnalyticsDashboardClient({ analytics }: AnalyticsDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview")

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "funnel", label: "Conversion Funnel" },
    { key: "revenue", label: "Revenue" },
    { key: "queue", label: "Queue Health" },
  ]

  return (
    <div className="min-h-screen dashboard-bg">
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
      </div>
    </div>
  )
}
