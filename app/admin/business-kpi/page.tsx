"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  FileText, 
  Calendar,
  Target,
  Activity,
  RefreshCw,
  Download,
  BarChart3
} from "lucide-react"
import { OptimizedStatCard } from "@/components/performance/optimized-components"
import { OptimizedChart } from "@/components/performance/optimized-components"
import { useUserBehaviorTracking } from "@/lib/analytics/user-behavior-tracking"

interface BusinessKPI {
  period: string
  revenue: number
  conversions: number
  conversionRate: number
  activeUsers: number
  newUsers: number
  retentionRate: number
  averageOrderValue: number
  customerLifetimeValue: number
  churnRate: number
  netPromoterScore: number
}

interface FunnelMetrics {
  step: string
  visitors: number
  conversionRate: number
  dropOffRate: number
  revenue: number
}

export default function BusinessKPIDashboard() {
  const [kpiData, setKpiData] = useState<BusinessKPI[]>([])
  const [funnelData, setFunnelData] = useState<FunnelMetrics[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const { trackPageView, trackFeatureUse } = useUserBehaviorTracking()

  useEffect(() => {
    trackPageView('business_kpi_dashboard')
    fetchKPIData()
    fetchFunnelData()
  }, [selectedPeriod])

  const fetchKPIData = async () => {
    setIsLoading(true)
    try {
      // Mock KPI data - in production, this would fetch from your analytics service
      const mockKPIData: BusinessKPI[] = [
        {
          period: 'Current',
          revenue: 45678,
          conversions: 234,
          conversionRate: 15.2,
          activeUsers: 1234,
          newUsers: 89,
          retentionRate: 78.5,
          averageOrderValue: 195.20,
          customerLifetimeValue: 892.50,
          churnRate: 3.2,
          netPromoterScore: 72
        },
        {
          period: 'Previous',
          revenue: 42156,
          conversions: 198,
          conversionRate: 13.8,
          activeUsers: 1156,
          newUsers: 76,
          retentionRate: 75.2,
          averageOrderValue: 212.90,
          customerLifetimeValue: 856.30,
          churnRate: 4.1,
          netPromoterScore: 68
        }
      ]
      
      setKpiData(mockKPIData)
    } catch (error) {
      console.error('Failed to fetch KPI data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFunnelData = async () => {
    try {
      // Mock funnel data
      const mockFunnelData: FunnelMetrics[] = [
        { step: 'Landing Page', visitors: 10000, conversionRate: 100, dropOffRate: 0, revenue: 0 },
        { step: 'Intake Start', visitors: 3500, conversionRate: 35, dropOffRate: 65, revenue: 0 },
        { step: 'Personal Info', visitors: 2800, conversionRate: 28, dropOffRate: 20, revenue: 0 },
        { step: 'Symptoms Info', visitors: 2200, conversionRate: 22, dropOffRate: 21.4, revenue: 0 },
        { step: 'Payment Page', visitors: 1800, conversionRate: 18, dropOffRate: 18.2, revenue: 0 },
        { step: 'Payment Complete', visitors: 456, conversionRate: 4.56, dropOffRate: 74.7, revenue: 45678 },
        { step: 'Certificate Issued', visitors: 445, conversionRate: 4.45, dropOffRate: 2.4, revenue: 45678 }
      ]
      
      setFunnelData(mockFunnelData)
    } catch (error) {
      console.error('Failed to fetch funnel data:', error)
    }
  }

  const getCurrentKPI = () => kpiData[0] || {} as BusinessKPI
  const getPreviousKPI = () => kpiData[1] || {} as BusinessKPI

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, direction: 'up' as const }
    const change = ((current - previous) / previous) * 100
    return {
      value: Math.abs(change),
      direction: change >= 0 ? 'up' as const : 'down' as const
    }
  }

  const current = getCurrentKPI()
  const previous = getPreviousKPI()

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Business KPI Dashboard</h1>
          <p className="text-muted-foreground">Key business metrics and performance indicators</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)}>
            <TabsList>
              <TabsTrigger value="7d">7D</TabsTrigger>
              <TabsTrigger value="30d">30D</TabsTrigger>
              <TabsTrigger value="90d">90D</TabsTrigger>
              <TabsTrigger value="1y">1Y</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => {
            fetchKPIData()
            fetchFunnelData()
            trackFeatureUse('refresh_kpi')
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => trackFeatureUse('export_kpi')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Business Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <OptimizedStatCard
          label="Revenue"
          value={`$${current.revenue?.toLocaleString() || 0}`}
          trend={calculateTrend(current.revenue || 0, previous.revenue || 0)}
          status={current.revenue > previous.revenue ? 'success' : 'warning'}
        />
        <OptimizedStatCard
          label="Conversions"
          value={current.conversions || 0}
          trend={calculateTrend(current.conversions || 0, previous.conversions || 0)}
          status={current.conversions > previous.conversions ? 'success' : 'warning'}
        />
        <OptimizedStatCard
          label="Conversion Rate"
          value={`${current.conversionRate?.toFixed(1) || 0}%`}
          trend={calculateTrend(current.conversionRate || 0, previous.conversionRate || 0)}
          status={current.conversionRate > previous.conversionRate ? 'success' : 'warning'}
        />
        <OptimizedStatCard
          label="Active Users"
          value={current.activeUsers?.toLocaleString() || 0}
          trend={calculateTrend(current.activeUsers || 0, previous.activeUsers || 0)}
          status={current.activeUsers > previous.activeUsers ? 'success' : 'warning'}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <OptimizedStatCard
          label="New Users"
          value={current.newUsers || 0}
          trend={calculateTrend(current.newUsers || 0, previous.newUsers || 0)}
          status="info"
        />
        <OptimizedStatCard
          label="Retention Rate"
          value={`${current.retentionRate?.toFixed(1) || 0}%`}
          trend={calculateTrend(current.retentionRate || 0, previous.retentionRate || 0)}
          status={current.retentionRate > 75 ? 'success' : current.retentionRate > 60 ? 'warning' : 'error'}
        />
        <OptimizedStatCard
          label="Avg Order Value"
          value={`$${current.averageOrderValue?.toFixed(2) || 0}`}
          trend={calculateTrend(current.averageOrderValue || 0, previous.averageOrderValue || 0)}
          status="neutral"
        />
        <OptimizedStatCard
          label="NPS Score"
          value={current.netPromoterScore || 0}
          trend={calculateTrend(current.netPromoterScore || 0, previous.netPromoterScore || 0)}
          status={current.netPromoterScore > 70 ? 'success' : current.netPromoterScore > 50 ? 'warning' : 'error'}
        />
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Conversion Funnel
          </CardTitle>
          <CardDescription>User journey from landing to conversion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {funnelData.map((step, index) => (
              <div key={step.step} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{step.step}</span>
                    <span className="text-sm text-muted-foreground">
                      {step.visitors.toLocaleString()} visitors
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                      {step.conversionRate.toFixed(1)}%
                    </span>
                    {step.dropOffRate > 0 && (
                      <span className="text-sm text-red-500">
                        -{step.dropOffRate.toFixed(1)}%
                      </span>
                    )}
                    {step.revenue > 0 && (
                      <span className="text-sm font-medium text-green-600">
                        ${step.revenue.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-linear-to-r from-blue-500 to-green-500"
                    style={{ width: `${step.conversionRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <OptimizedChart 
              data={[
                { time: 'Week 1', value: 42000 },
                { time: 'Week 2', value: 45000 },
                { time: 'Week 3', value: 43500 },
                { time: 'Week 4', value: 45678 }
              ]}
              type="line"
              loading={isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Growth
            </CardTitle>
            <CardDescription>New user acquisition over time</CardDescription>
          </CardHeader>
          <CardContent>
            <OptimizedChart 
              data={[
                { time: 'Week 1', value: 65 },
                { time: 'Week 2', value: 78 },
                { time: 'Week 3', value: 82 },
                { time: 'Week 4', value: 89 }
              ]}
              type="bar"
              loading={isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Conversion Rate
            </CardTitle>
            <CardDescription>Conversion rate trends</CardDescription>
          </CardHeader>
          <CardContent>
            <OptimizedChart 
              data={[
                { time: 'Week 1', value: 12.5 },
                { time: 'Week 2', value: 13.8 },
                { time: 'Week 3', value: 14.2 },
                { time: 'Week 4', value: 15.2 }
              ]}
              type="line"
              loading={isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Customer Retention
            </CardTitle>
            <CardDescription>Customer retention trends</CardDescription>
          </CardHeader>
          <CardContent>
            <OptimizedChart 
              data={[
                { time: 'Month 1', value: 72.5 },
                { time: 'Month 2', value: 75.2 },
                { time: 'Month 3', value: 78.5 }
              ]}
              type="line"
              loading={isLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed KPI Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Detailed KPI Analysis
          </CardTitle>
          <CardDescription>Comprehensive business metrics breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h4 className="font-medium">Revenue Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Revenue</span>
                    <span className="text-sm font-medium">${current.revenue?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Order Value</span>
                    <span className="text-sm font-medium">${current.averageOrderValue?.toFixed(2) || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Customer Lifetime Value</span>
                    <span className="text-sm font-medium">${current.customerLifetimeValue?.toFixed(2) || 0}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">User Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active Users</span>
                    <span className="text-sm font-medium">{current.activeUsers?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">New Users</span>
                    <span className="text-sm font-medium">{current.newUsers || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Retention Rate</span>
                    <span className="text-sm font-medium">{current.retentionRate?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Churn Rate</span>
                    <span className="text-sm font-medium">{current.churnRate?.toFixed(1) || 0}%</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">Performance Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Conversions</span>
                    <span className="text-sm font-medium">{current.conversions || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Conversion Rate</span>
                    <span className="text-sm font-medium">{current.conversionRate?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Net Promoter Score</span>
                    <span className="text-sm font-medium">{current.netPromoterScore || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
