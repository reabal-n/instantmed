"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Activity,
  Zap,
  Clock,
  MousePointer,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Server,
  Globe,
} from "lucide-react"

interface WebVital {
  name: string
  value: number
  rating: "good" | "needs-improvement" | "poor"
  target: number
  unit: string
}

interface PerformanceData {
  webVitals: WebVital[]
  serverMetrics: {
    avgResponseTime: number
    p95ResponseTime: number
    requestsPerMinute: number
    errorRate: number
  }
  realtimeUsers: number
  pageViews24h: number
}

// Mock data - in production, fetch from analytics API
const mockPerformanceData: PerformanceData = {
  webVitals: [
    { name: "LCP", value: 2.1, rating: "good", target: 2.5, unit: "s" },
    { name: "FID", value: 85, rating: "good", target: 100, unit: "ms" },
    { name: "CLS", value: 0.08, rating: "good", target: 0.1, unit: "" },
    { name: "TTFB", value: 320, rating: "good", target: 500, unit: "ms" },
    { name: "FCP", value: 1.4, rating: "good", target: 1.8, unit: "s" },
    { name: "INP", value: 150, rating: "needs-improvement", target: 200, unit: "ms" },
  ],
  serverMetrics: {
    avgResponseTime: 145,
    p95ResponseTime: 320,
    requestsPerMinute: 42,
    errorRate: 0.3,
  },
  realtimeUsers: 23,
  pageViews24h: 1847,
}

export function PerformanceMonitoringClient() {
  const [data] = useState<PerformanceData>(mockPerformanceData)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "good":
        return "text-green-600 dark:text-green-400"
      case "needs-improvement":
        return "text-amber-600 dark:text-amber-400"
      case "poor":
        return "text-red-600 dark:text-red-400"
      default:
        return "text-muted-foreground"
    }
  }

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case "good":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Good</Badge>
      case "needs-improvement":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Needs Work</Badge>
      case "poor":
        return <Badge variant="destructive">Poor</Badge>
      default:
        return <Badge variant="outline">{rating}</Badge>
    }
  }

  const getVitalIcon = (name: string) => {
    switch (name) {
      case "LCP":
        return <Eye className="h-4 w-4" />
      case "FID":
      case "INP":
        return <MousePointer className="h-4 w-4" />
      case "CLS":
        return <Activity className="h-4 w-4" />
      case "TTFB":
        return <Server className="h-4 w-4" />
      case "FCP":
        return <Zap className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getVitalDescription = (name: string) => {
    const descriptions: Record<string, string> = {
      LCP: "Largest Contentful Paint - Loading performance",
      FID: "First Input Delay - Interactivity",
      CLS: "Cumulative Layout Shift - Visual stability",
      TTFB: "Time to First Byte - Server responsiveness",
      FCP: "First Contentful Paint - Initial render",
      INP: "Interaction to Next Paint - Responsiveness",
    }
    return descriptions[name] || ""
  }

  const getTrend = (current: number, target: number) => {
    const ratio = current / target
    if (ratio < 0.7) return <TrendingDown className="h-4 w-4 text-green-500" />
    if (ratio > 1) return <TrendingUp className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading metrics...</div>
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Realtime Users</p>
                <p className="text-2xl font-bold">{data.realtimeUsers}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Page Views (24h)</p>
                <p className="text-2xl font-bold">{data.pageViews24h.toLocaleString()}</p>
              </div>
              <Globe className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">{data.serverMetrics.avgResponseTime}ms</p>
              </div>
              <Server className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Error Rate</p>
                <p className="text-2xl font-bold">{data.serverMetrics.errorRate}%</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="vitals">
        <TabsList>
          <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="server">Server Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="vitals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Core Web Vitals</CardTitle>
              <CardDescription>
                Real user performance metrics from the field
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.webVitals.map((vital) => (
                  <div
                    key={vital.name}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-md bg-muted ${getRatingColor(vital.rating)}`}>
                          {getVitalIcon(vital.name)}
                        </div>
                        <div>
                          <h4 className="font-semibold">{vital.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {getVitalDescription(vital.name)}
                          </p>
                        </div>
                      </div>
                      {getTrend(vital.value, vital.target)}
                    </div>
                    
                    <div className="flex items-end justify-between mt-3">
                      <div>
                        <span className={`text-2xl font-bold ${getRatingColor(vital.rating)}`}>
                          {vital.value}
                        </span>
                        <span className="text-sm text-muted-foreground ml-1">
                          {vital.unit}
                        </span>
                      </div>
                      {getRatingBadge(vital.rating)}
                    </div>

                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Target: {vital.target}{vital.unit}</span>
                        <span>{Math.round((vital.value / vital.target) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            vital.rating === "good"
                              ? "bg-green-500"
                              : vital.rating === "needs-improvement"
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }`}
                          style={{
                            width: `${Math.min((vital.value / vital.target) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="server" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Server Metrics</CardTitle>
              <CardDescription>
                Backend performance and health indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Response Time</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average</span>
                      <span className="font-medium">{data.serverMetrics.avgResponseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">P95</span>
                      <span className="font-medium">{data.serverMetrics.p95ResponseTime}ms</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Throughput</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Requests/min</span>
                      <span className="font-medium">{data.serverMetrics.requestsPerMinute}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Error Rate</span>
                      <span className={`font-medium ${data.serverMetrics.errorRate > 1 ? "text-red-500" : "text-green-500"}`}>
                        {data.serverMetrics.errorRate}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
