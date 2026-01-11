"use client"

import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface AnalyticsData {
  totalRequests?: number
  approvedRequests?: number
  pendingRequests?: number
  avgResponseTime?: string
  approvalRate?: number
  todayRequests?: number
  weeklyGrowth?: number
}

interface AnalyticsCardProps {
  data?: AnalyticsData
  className?: string
}

export function AnalyticsCard({ 
  data = {
    totalRequests: 1428,
    approvedRequests: 1356,
    pendingRequests: 42,
    avgResponseTime: "28 min",
    approvalRate: 95,
    todayRequests: 23,
    weeklyGrowth: 12.5
  },
  className 
}: AnalyticsCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "reports">("overview")

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const centerX = rect.width / 2
      const centerY = rect.height / 2

      const rotateY = ((x - centerX) / centerX) * 4
      const rotateX = ((y - centerY) / centerY) * -4

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
    }

    const handleMouseEnter = () => setIsHovered(true)
    const handleMouseLeave = () => {
      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)"
      setIsHovered(false)
    }

    card.addEventListener("mousemove", handleMouseMove)
    card.addEventListener("mouseenter", handleMouseEnter)
    card.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      card.removeEventListener("mousemove", handleMouseMove)
      card.removeEventListener("mouseenter", handleMouseEnter)
      card.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [])

  const circumference = 2 * Math.PI * 20
  const strokeDashoffset = circumference - (circumference * (data.approvalRate || 95)) / 100

  const tabs = ["overview", "analytics", "reports"] as const

  return (
    <div
      ref={cardRef}
      className={cn(
        "w-full rounded-2xl p-6 transition-all duration-300 ease-out",
        "bg-card/90 backdrop-blur-sm border border-border/50",
        "shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.08)]",
        "hover:shadow-[0_1px_3px_rgba(0,0,0,0.05),0_20px_60px_rgba(0,0,0,0.15)]",
        "dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_10px_40px_rgba(0,0,0,0.4)]",
        "dark:hover:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_20px_60px_rgba(0,0,0,0.6)]",
        className
      )}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">
            Analytics Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Performance metrics at a glance
          </p>
        </div>

        {/* Progress Ring */}
        <div className="relative">
          <svg width="56" height="56" className="animate-float-gentle">
            <defs>
              <linearGradient id="analytics-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <circle
              cx="28"
              cy="28"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-muted/30"
            />
            <circle
              cx="28"
              cy="28"
              r="20"
              fill="none"
              stroke="url(#analytics-gradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500 -rotate-90 origin-center"
              style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-foreground">{data.approvalRate}%</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5">
        <div className="flex space-x-1 relative border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-medium capitalize transition-colors relative z-10",
                activeTab === tab
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
          <div
            className="absolute bottom-0 h-0.5 bg-linear-to-r from-indigo-500 to-violet-500 transition-all duration-300 ease-in-out"
            style={{
              left: activeTab === "overview" ? "0px" : activeTab === "analytics" ? "96px" : "192px",
              width: "88px",
            }}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === "overview" && (
          <>
            {/* Main Stat */}
            <div className="rounded-xl p-4 bg-muted/50 border border-border/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Total Requests</span>
                <span className="text-xs px-2 py-1 rounded-full text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10">
                  +{data.weeklyGrowth}%
                </span>
              </div>
              <p className="text-2xl font-semibold text-foreground">{data.totalRequests?.toLocaleString()}</p>
              <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-muted">
                <div
                  className="h-full bg-linear-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: isHovered ? "92%" : "85%" }}
                />
              </div>
            </div>

            {/* Mini Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Approved", value: data.approvedRequests?.toLocaleString() },
                { label: "Pending", value: data.pendingRequests },
                { label: "Today", value: data.todayRequests },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl p-3 bg-muted/50 border border-border/50"
                >
                  <p className="text-xs mb-1 text-muted-foreground">{metric.label}</p>
                  <p className="text-lg font-semibold text-foreground">{metric.value}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-3">
            {[
              { color: "bg-indigo-500", label: "Medical Certificates", value: "847" },
              { color: "bg-violet-500", label: "Prescriptions", value: "423" },
              { color: "bg-emerald-500", label: "Approval Rate", value: `${data.approvalRate}%` },
              { color: "bg-dawn-500", label: "Avg. Response", value: data.avgResponseTime },
            ].map((item, index) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center justify-between py-3",
                  index < 3 && "border-b border-border/50"
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className={cn("w-2 h-2 rounded-full", item.color)} />
                  <span className="text-sm text-foreground">{item.label}</span>
                </div>
                <span className="text-sm font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-3">
            <div className="rounded-xl p-4 bg-linear-to-r from-indigo-500/10 to-violet-500/10 border border-border/50">
              <h3 className="text-sm font-medium mb-2 text-foreground">Weekly Summary</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Request volume increased by {data.weeklyGrowth}% compared to last week. Approval rates remain consistently high at {data.approvalRate}%.
              </p>
            </div>
            <div className="rounded-xl p-4 bg-muted/50 border border-border/50">
              <h3 className="text-sm font-medium mb-2 text-foreground">Key Insights</h3>
              <ul className="space-y-2">
                {[
                  "Peak hours: 9-11 AM AEST",
                  "Most requested: Medical certificates",
                  "Avg turnaround: Under 1 hour",
                ].map((insight) => (
                  <li key={insight} className="flex items-start space-x-2">
                    <span className="text-xs mt-0.5 text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        <button className="flex-1 py-2.5 px-4 bg-linear-to-r from-indigo-500 to-violet-500 text-white rounded-xl font-medium text-sm hover:from-indigo-600 hover:to-violet-600 transition-all duration-200 shadow-sm hover:shadow-md">
          View Full Report
        </button>
        <button className="flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all duration-200 border border-border bg-card text-foreground hover:bg-muted">
          Export Data
        </button>
      </div>
    </div>
  )
}
