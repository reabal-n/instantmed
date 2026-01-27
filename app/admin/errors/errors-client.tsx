"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  AlertTriangle,
  Bug,
  ExternalLink,
  RefreshCw,
  Search,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react"

interface ErrorMonitoringClientProps {
  sentryOrgSlug: string
  sentryProjectSlug: string
}

// Mock data structure - in production, fetch from Sentry API
interface SentryIssue {
  id: string
  title: string
  culprit: string
  level: "error" | "warning" | "info"
  count: number
  userCount: number
  firstSeen: string
  lastSeen: string
  status: "unresolved" | "resolved" | "ignored"
  isRegression: boolean
}

const MOCK_ISSUES: SentryIssue[] = [
  {
    id: "1",
    title: "TypeError: Cannot read property 'id' of undefined",
    culprit: "app/patient/intakes/[id]/page.tsx",
    level: "error",
    count: 45,
    userCount: 12,
    firstSeen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: "unresolved",
    isRegression: false,
  },
  {
    id: "2",
    title: "NetworkError: Failed to fetch",
    culprit: "lib/supabase/client.ts",
    level: "warning",
    count: 23,
    userCount: 8,
    firstSeen: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: "unresolved",
    isRegression: true,
  },
  {
    id: "3",
    title: "Error: Payment intent creation failed",
    culprit: "lib/stripe/checkout.ts",
    level: "error",
    count: 5,
    userCount: 5,
    firstSeen: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    lastSeen: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    status: "unresolved",
    isRegression: false,
  },
]

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

function getLevelBadge(level: SentryIssue["level"]) {
  const styles = {
    error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  }
  return styles[level]
}

function getStatusIcon(status: SentryIssue["status"]) {
  switch (status) {
    case "resolved":
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case "ignored":
      return <XCircle className="h-4 w-4 text-gray-400" />
    default:
      return <AlertCircle className="h-4 w-4 text-red-500" />
  }
}

export function ErrorMonitoringClient({
  sentryOrgSlug,
  sentryProjectSlug,
}: ErrorMonitoringClientProps) {
  const [issues] = useState<SentryIssue[]>(MOCK_ISSUES)
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("unresolved")
  const [search, setSearch] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const filteredIssues = issues.filter((issue) => {
    if (filter !== "all" && issue.status !== filter) return false
    if (search && !issue.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    total: issues.length,
    unresolved: issues.filter((i) => i.status === "unresolved").length,
    regressions: issues.filter((i) => i.isRegression).length,
    usersAffected: issues.reduce((sum, i) => sum + i.userCount, 0),
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // In production: fetch latest from Sentry API
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  const getSentryIssueUrl = (issueId: string) => {
    return `https://sentry.io/organizations/${sentryOrgSlug}/issues/${issueId}/?project=${sentryProjectSlug}`
  }

  const getSentryDashboardUrl = () => {
    return `https://sentry.io/organizations/${sentryOrgSlug}/issues/?project=${sentryProjectSlug}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Bug className="h-6 w-6 text-red-500" />
              Error Monitoring
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track and resolve application errors from Sentry
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={getSentryDashboardUrl()} target="_blank" rel="noopener noreferrer">
              Open Sentry
              <ExternalLink className="h-4 w-4 ml-1.5" />
            </a>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Issues</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Bug className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card className={stats.unresolved > 0 ? "border-red-200 dark:border-red-800" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unresolved</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.unresolved}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className={stats.regressions > 0 ? "border-amber-200 dark:border-amber-800" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Regressions</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {stats.regressions}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Users Affected</p>
                <p className="text-2xl font-bold">{stats.usersAffected}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issues Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Issues</CardTitle>
          <CardDescription>Click any issue to view details in Sentry</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search errors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Issues</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Events</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.length > 0 ? (
                  filteredIssues.map((issue) => (
                    <TableRow key={issue.id} className="group">
                      <TableCell>{getStatusIcon(issue.status)}</TableCell>
                      <TableCell>
                        <div className="max-w-[400px]">
                          <p className="font-medium truncate flex items-center gap-2">
                            {issue.title}
                            {issue.isRegression && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300">
                                Regression
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {issue.culprit}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getLevelBadge(issue.level)}>
                          {issue.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {issue.count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {issue.userCount}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="text-sm">{formatTimeAgo(issue.lastSeen)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={getSentryIssueUrl(issue.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {search ? "No matching errors found" : "No errors to display"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <a
              href={`https://sentry.io/organizations/${sentryOrgSlug}/issues/?project=${sentryProjectSlug}&query=is:unresolved`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium">Unresolved Issues</p>
                <p className="text-sm text-muted-foreground">View all open errors</p>
              </div>
              <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
            </a>
            <a
              href={`https://sentry.io/organizations/${sentryOrgSlug}/issues/?project=${sentryProjectSlug}&query=is:regression`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <TrendingUp className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium">Regressions</p>
                <p className="text-sm text-muted-foreground">Previously fixed issues</p>
              </div>
              <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
            </a>
            <a
              href={`https://sentry.io/organizations/${sentryOrgSlug}/performance/?project=${sentryProjectSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Performance</p>
                <p className="text-sm text-muted-foreground">Trace slow transactions</p>
              </div>
              <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
