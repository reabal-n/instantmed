"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Activity, 
  Clock, 
  Zap, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Server,
  Database,
  Globe,
  Users,
  RefreshCw
} from "lucide-react"
import { OptimizedStatCard } from "@/components/performance/optimized-components"
import { OptimizedChart } from "@/components/performance/optimized-components"
import { useUserBehaviorTracking } from "@/lib/analytics/user-behavior-tracking"

interface PerformanceMetrics {
  timestamp: Date
  pageLoadTime: number
  timeToInteractive: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  firstInputDelay: number
  serverResponseTime: number
  databaseQueryTime: number
  errorRate: number
  activeUsers: number
  requestsPerMinute: number
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  cpu: number
  memory: number
  disk: number
  uptime: number
  lastRestart: Date
}

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([])
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const { trackPageView, trackFeatureUse } = useUserBehaviorTracking()

  useEffect(() => {
    trackPageView('performance_dashboard')
    fetchMetrics()
    fetchSystemHealth()
    
    const interval = setInterval(fetchMetrics, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [selectedTimeRange])

  const fetchMetrics = async () => {
    setIsLoading(true)
    try {
      // Mock data - in production, this would fetch from your monitoring service
      const mockMetrics: PerformanceMetrics[] = Array.from({ length: 50 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 60000),
        pageLoadTime: 800 + Math.random() * 400,
        timeToInteractive: 1200 + Math.random() * 600,
        firstContentfulPaint: 600 + Math.random() * 300,
        largestContentfulPaint: 1500 + Math.random() * 800,
        cumulativeLayoutShift: Math.random() * 0.1,
        firstInputDelay: 50 + Math.random() * 50,
        serverResponseTime: 200 + Math.random() * 300,
        databaseQueryTime: 50 + Math.random() * 100,
        errorRate: Math.random() * 5,
        activeUsers: 100 + Math.floor(Math.random() * 500),
        requestsPerMinute: 20 + Math.floor(Math.random() * 100)
      }))
      
      setMetrics(mockMetrics)
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSystemHealth = async () => {
    try {
      // Mock system health data
      const health: SystemHealth = {
        status: 'healthy',
        cpu: 35 + Math.random() * 30,
        memory: 40 + Math.random() * 25,
        disk: 60 + Math.random() * 20,
        uptime: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days ago
        lastRestart: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000))
      }
      setSystemHealth(health)
    } catch (error) {
      console.error('Failed to fetch system health:', error)
    }
  }

  const getLatestMetrics = () => metrics[0] || {} as PerformanceMetrics

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500'
      case 'warning': return 'bg-yellow-500'
      case 'critical': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const formatUptime = (ms: number) => {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000))
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    return `${days}d ${hours}h`
  }

  const latest = getLatestMetrics()

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">Real-time system performance and user experience metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={selectedTimeRange} onValueChange={(value) => setSelectedTimeRange(value as any)}>
            <TabsList>
              <TabsTrigger value="1h">1H</TabsTrigger>
              <TabsTrigger value="24h">24H</TabsTrigger>
              <TabsTrigger value="7d">7D</TabsTrigger>
              <TabsTrigger value="30d">30D</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => {
            fetchMetrics()
            fetchSystemHealth()
            trackFeatureUse('refresh_metrics')
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Status */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Health
              <div className={`w-3 h-3 rounded-full ${getHealthStatusColor(systemHealth.status)}`} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">CPU</span>
                  <span className="text-sm font-medium">{systemHealth.cpu.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      systemHealth.cpu > 80 ? 'bg-red-500' : 
                      systemHealth.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${systemHealth.cpu}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Memory</span>
                  <span className="text-sm font-medium">{systemHealth.memory.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      systemHealth.memory > 80 ? 'bg-red-500' : 
                      systemHealth.memory > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${systemHealth.memory}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Disk</span>
                  <span className="text-sm font-medium">{systemHealth.disk.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      systemHealth.disk > 80 ? 'bg-red-500' : 
                      systemHealth.disk > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${systemHealth.disk}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Uptime</span>
                <span className="text-sm font-medium">{formatUptime(systemHealth.uptime)}</span>
              </div>
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Last Restart</span>
                <span className="text-sm font-medium">{systemHealth.lastRestart.toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <OptimizedStatCard
          label="Page Load Time"
          value={`${latest.pageLoadTime?.toFixed(0) || 0}ms`}
          trend={{
            value: -12,
            direction: latest.pageLoadTime < 1000 ? 'up' : 'down'
          }}
          status={latest.pageLoadTime < 1000 ? 'success' : latest.pageLoadTime < 2000 ? 'warning' : 'error'}
        />
        <OptimizedStatCard
          label="Active Users"
          value={latest.activeUsers || 0}
          trend={{
            value: 8,
            direction: 'up'
          }}
          status="info"
        />
        <OptimizedStatCard
          label="Error Rate"
          value={`${latest.errorRate?.toFixed(2) || 0}%`}
          trend={{
            value: -2,
            direction: latest.errorRate < 1 ? 'up' : 'down'
          }}
          status={latest.errorRate < 1 ? 'success' : latest.errorRate < 3 ? 'warning' : 'error'}
        />
        <OptimizedStatCard
          label="Requests/min"
          value={latest.requestsPerMinute || 0}
          trend={{
            value: 15,
            direction: 'up'
          }}
          status="neutral"
        />
      </div>

      {/* Performance Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Page Load Time
            </CardTitle>
            <CardDescription>Average page load time over time</CardDescription>
          </CardHeader>
          <CardContent>
            <OptimizedChart 
              data={metrics.slice(0, 20).map(m => ({
                time: m.timestamp,
                value: m.pageLoadTime
              }))}
              type="line"
              loading={isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Users
            </CardTitle>
            <CardDescription>Number of active users over time</CardDescription>
          </CardHeader>
          <CardContent>
            <OptimizedChart 
              data={metrics.slice(0, 20).map(m => ({
                time: m.timestamp,
                value: m.activeUsers
              }))}
              type="line"
              loading={isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Performance
            </CardTitle>
            <CardDescription>Average database query response time</CardDescription>
          </CardHeader>
          <CardContent>
            <OptimizedChart 
              data={metrics.slice(0, 20).map(m => ({
                time: m.timestamp,
                value: m.databaseQueryTime
              }))}
              type="bar"
              loading={isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Rate
            </CardTitle>
            <CardDescription>System error rate over time</CardDescription>
          </CardHeader>
          <CardContent>
            <OptimizedChart 
              data={metrics.slice(0, 20).map(m => ({
                time: m.timestamp,
                value: m.errorRate
              }))}
              type="line"
              loading={isLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Detailed Metrics
          </CardTitle>
          <CardDescription>Core Web Vitals and performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-medium">Core Web Vitals</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">First Contentful Paint</span>
                    <span className="text-sm font-medium">{latest.firstContentfulPaint?.toFixed(0) || 0}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Largest Contentful Paint</span>
                    <span className="text-sm font-medium">{latest.largestContentfulPaint?.toFixed(0) || 0}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">First Input Delay</span>
                    <span className="text-sm font-medium">{latest.firstInputDelay?.toFixed(0) || 0}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Cumulative Layout Shift</span>
                    <span className="text-sm font-medium">{latest.cumulativeLayoutShift?.toFixed(3) || 0}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium">Server Performance</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Server Response Time</span>
                    <span className="text-sm font-medium">{latest.serverResponseTime?.toFixed(0) || 0}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Database Query Time</span>
                    <span className="text-sm font-medium">{latest.databaseQueryTime?.toFixed(0) || 0}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Time to Interactive</span>
                    <span className="text-sm font-medium">{latest.timeToInteractive?.toFixed(0) || 0}ms</span>
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
