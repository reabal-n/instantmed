"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Eye,
  Clock,
  CheckCircle,
  FileText,
  Search,
  Send,
  AlertTriangle,
  FlaskConical,
  Users,
  BarChart3,
  Settings,
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  Calendar,
  XCircle,
  Loader2,
} from "lucide-react"
import type { RequestWithPatient, DashboardAnalytics } from "@/types/db"
import { toast } from "sonner"
import { getIsTestMode, setTestModeOverride } from "@/lib/test-mode"
import { cn } from "@/lib/utils"
import { formatCategory, formatSubtype } from "@/lib/format-utils"
import { addCsrfHeaders } from "@/lib/security/csrf-client"
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface AdminClientProps {
  allRequests: RequestWithPatient[]
  stats: {
    total: number
    pending: number
    approved: number
    declined: number
    needs_follow_up: number
  }
  analytics: DashboardAnalytics | null
  doctorName: string
}

type Section = "queue" | "patients" | "analytics" | "settings"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

const formatCategoryLabel = (type: string) => {
  switch (type) {
    case "medical_certificate":
      return "Med Certs"
    case "prescription":
      return "Scripts"
    case "referral":
      return "Referrals"
    default:
      return type
  }
}

export function AdminClient({
  allRequests,
  stats,
  analytics,
  doctorName,
}: AdminClientProps) {
  const [activeSection, setActiveSection] = useState<Section>("queue")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [localRequests, setLocalRequests] = useState(allRequests)
  const [testMode, setTestMode] = useState(getIsTestMode())
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set())

  const sidebarItems = [
    { id: "queue" as Section, label: "Doctor Queue", icon: FileText, count: stats.pending },
    { id: "patients" as Section, label: "Patients", icon: Users },
    { id: "analytics" as Section, label: "Analytics", icon: BarChart3 },
    { id: "settings" as Section, label: "Settings", icon: Settings },
  ]

  // Filter requests
  const filteredRequests = localRequests.filter((request) => {
    const matchesSearch =
      request.patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.patient.suburb?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || request.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">Pending</Badge>
      case "approved":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Approved</Badge>
      case "declined":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Declined</Badge>
      case "needs_follow_up":
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Follow-up</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case "paid":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5">Paid</Badge>
      case "pending_payment":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5">Unpaid</Badge>
      case "failed":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] px-1.5">Failed</Badge>
      case "refunded":
        return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] px-1.5">Refunded</Badge>
      default:
        return null
    }
  }

  const handleScriptSentToggle = async (requestId: string, currentValue: boolean) => {
    setLocalRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, script_sent: !currentValue, script_sent_at: !currentValue ? new Date().toISOString() : null }
          : r,
      ),
    )

    try {
      const response = await fetch("/api/doctor/script-sent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, scriptSent: !currentValue }),
      })
      if (!response.ok) throw new Error("Failed to update")
      toast.success(!currentValue ? "Script marked as sent" : "Script marked as not sent")
    } catch {
      setLocalRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, script_sent: currentValue, script_sent_at: currentValue ? r.script_sent_at : null }
            : r,
        ),
      )
      toast.error("Failed to update script status")
    }
  }

  const pendingScripts = localRequests.filter((r) => r.status === "approved" && !r.script_sent).length

  const handleTestModeToggle = () => {
    const newValue = !testMode
    setTestModeOverride(newValue)
    setTestMode(newValue)
    toast.success(newValue ? "Test mode enabled" : "Test mode disabled")
  }

  // Handle approve request
  const handleApprove = async (requestId: string) => {
    // Check if already processing
    if (loadingActions.has(requestId)) {
      return
    }

    // Mark as loading
    setLoadingActions((prev) => new Set(prev).add(requestId))

    // Optimistic update
    setLocalRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: "approved" as const }
          : r
      )
    )

    try {
      const response = await fetch("/api/admin/approve", {
        method: "POST",
        headers: addCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ requestId }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to approve request")
      }

      toast.success("Request approved successfully")
    } catch (error) {
      // Revert on error
      setLocalRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: "pending" as const }
            : r
        )
      )
      toast.error(error instanceof Error ? error.message : "Failed to approve request")
    } finally {
      // Remove loading state
      setLoadingActions((prev) => {
        const next = new Set(prev)
        next.delete(requestId)
        return next
      })
    }
  }

  // Handle decline request
  const handleDecline = async (requestId: string) => {
    // Check if already processing
    if (loadingActions.has(requestId)) {
      return
    }

    // Mark as loading
    setLoadingActions((prev) => new Set(prev).add(requestId))

    // Optimistic update
    setLocalRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: "declined" as const }
          : r
      )
    )

    try {
      const response = await fetch("/api/admin/decline", {
        method: "POST",
        headers: addCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ requestId }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to decline request")
      }

      toast.success("Request declined")
    } catch (error) {
      // Revert on error
      setLocalRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: "pending" as const }
            : r
        )
      )
      toast.error(error instanceof Error ? error.message : "Failed to decline request")
    } finally {
      // Remove loading state
      setLoadingActions((prev) => {
        const next = new Set(prev)
        next.delete(requestId)
        return next
      })
    }
  }

  // Get unique patients from requests
  const uniquePatients = Array.from(
    new Map(localRequests.map((r) => [r.patient.id, r.patient])).values()
  )

  return (
    <div className="flex min-h-[calc(100vh-6rem)]">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-border/40 bg-background/50 backdrop-blur-sm">
        <div className="p-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Admin Panel</h2>
              <p className="text-xs text-muted-foreground">Dr. {doctorName.split(" ")[1] || doctorName}</p>
            </div>
          </div>
        </div>
        <nav className="p-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                activeSection === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
              {item.count !== undefined && item.count > 0 && (
                <Badge className="ml-auto bg-primary/20 text-primary text-xs">{item.count}</Badge>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 mt-auto border-t border-border/40">
          <Button
            variant={testMode ? "default" : "outline"}
            size="sm"
            onClick={handleTestModeToggle}
            className="w-full rounded-xl gap-2"
          >
            <FlaskConical className="h-4 w-4" />
            {testMode ? "Test Mode ON" : "Test Mode OFF"}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {/* Queue Section */}
        {activeSection === "queue" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Doctor Queue</h1>
              <p className="text-sm text-muted-foreground mt-1">Review and process patient requests</p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total</span>
                  <FileText className="h-4 w-4 text-muted-foreground/60" />
                </div>
                <div className="mt-2 text-3xl font-semibold text-foreground">{stats.total}</div>
              </div>
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Pending</span>
                  <Clock className="h-4 w-4 text-violet-500" />
                </div>
                <div className="mt-2 text-3xl font-semibold text-foreground">{stats.pending}</div>
              </div>
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Scripts to Send</span>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </div>
                <div className="mt-2 text-3xl font-semibold text-orange-600">{pendingScripts}</div>
              </div>
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Completed</span>
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="mt-2 text-3xl font-semibold text-foreground">{stats.approved}</div>
              </div>
            </div>

            {/* Filters */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, suburb, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-xl bg-white/50 border-white/40"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] rounded-xl bg-white/50 border-white/40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {filteredRequests.length} of {localRequests.length} requests
              </div>
            </div>

            {/* Table */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white/30 hover:bg-white/30">
                      <TableHead className="w-[50px]">Script</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.length > 0 ? (
                      filteredRequests.map((request) => {
                        const patientAge = calculateAge(request.patient.date_of_birth)
                        const showScriptCheckbox = request.status === "approved"

                        return (
                          <TableRow key={request.id} className="hover:bg-white/40 transition-colors">
                            <TableCell>
                              {showScriptCheckbox && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center justify-center">
                                        <Checkbox
                                          checked={request.script_sent}
                                          onCheckedChange={() => handleScriptSentToggle(request.id, request.script_sent)}
                                          className="data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                                        />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {request.script_sent ? "Script sent" : "Mark as sent"}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border-2 border-white/50 shadow-sm">
                                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs">
                                    {getInitials(request.patient.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-foreground">{request.patient.full_name}</p>
                                  <p className="text-xs text-muted-foreground">{patientAge}y</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs bg-indigo-50 border-indigo-200 text-indigo-700">
                                {formatCategory(request.category)}
                              </Badge>
                              {request.subtype && (
                                <span className="block text-xs text-muted-foreground mt-1">{formatSubtype(request.subtype)}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(request.status)}
                                  {request.script_sent && <Send className="h-3.5 w-3.5 text-indigo-500" />}
                                </div>
                                {request.payment_status && getPaymentBadge(request.payment_status)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {new Date(request.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* Only show quick approve/decline for non-medical-certificate requests that are paid and pending */}
                                {/* Medical certificates require going through the document builder */}
                                {request.status === "pending" && request.payment_status === "paid" && request.category !== "medical_certificate" && (
                                  <>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleApprove(request.id)}
                                            disabled={loadingActions.has(request.id)}
                                            className="h-8 w-8 p-0 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
                                          >
                                            {loadingActions.has(request.id) ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <CheckCircle className="h-4 w-4" />
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {loadingActions.has(request.id) ? "Processing..." : "Approve"}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDecline(request.id)}
                                            disabled={loadingActions.has(request.id)}
                                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                          >
                                            {loadingActions.has(request.id) ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <XCircle className="h-4 w-4" />
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {loadingActions.has(request.id) ? "Processing..." : "Decline"}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </>
                                )}
                                <Link 
                                  href={`/doctor/requests/${request.id}`}
                                  className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-sm font-medium border bg-white/50 hover:bg-white/80 border-border/40 transition-all"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Review
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <FileText className="h-8 w-8 opacity-50" />
                            <p>No requests found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* Patients Section */}
        {activeSection === "patients" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Patients</h1>
              <p className="text-sm text-muted-foreground mt-1">View and manage patient profiles</p>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search patients..." className="pl-10 rounded-xl bg-white/50 border-white/40" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {uniquePatients.slice(0, 12).map((patient) => (
                <div key={patient.id} className="glass-card rounded-2xl p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-white/50">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                        {getInitials(patient.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{patient.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {patient.date_of_birth ? `${calculateAge(patient.date_of_birth)}y` : "Age unknown"} • {patient.suburb || "Location unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/40 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {localRequests.filter((r) => r.patient.id === patient.id).length} requests
                    </span>
                    <Button variant="ghost" size="sm" className="text-xs h-7">
                      View Profile
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Section */}
        {activeSection === "analytics" && analytics && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics</h1>
              <p className="text-sm text-muted-foreground mt-1">Platform statistics and metrics</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { title: "Today", value: analytics.requests_today, icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
                { title: "This Week", value: analytics.requests_this_week, icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50" },
                { title: "Avg Time", value: `${analytics.avg_review_time_hours}h`, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                { title: "Approval", value: `${analytics.approval_rate}%`, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
                { title: "Today $", value: `$${analytics.revenue_today.toFixed(0)}`, icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
                { title: "Month $", value: `$${analytics.revenue_this_month.toFixed(0)}`, icon: TrendingUp, color: "text-pink-600", bg: "bg-pink-50" },
              ].map((stat) => (
                <Card key={stat.title}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${stat.bg}`}>
                        <stat.icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{stat.title}</p>
                        <p className="text-xl font-semibold">{stat.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Requests Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.requests_by_day.map((item) => ({
                        date: new Date(item.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
                        requests: item.count,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} allowDecimals={false} />
                        <RechartsTooltip />
                        <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Requests by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.requests_by_type.map((item) => ({
                            name: formatCategoryLabel(item.type),
                            value: item.count,
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {analytics.requests_by_type.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Settings Section */}
        {activeSection === "settings" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">Configure platform settings</p>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-medium text-foreground mb-4">Developer Tools</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/50">
                  <div>
                    <p className="font-medium">Test Mode</p>
                    <p className="text-sm text-muted-foreground">Enable test mode for development</p>
                  </div>
                  <Button
                    variant={testMode ? "default" : "outline"}
                    size="sm"
                    onClick={handleTestModeToggle}
                    className="rounded-xl gap-2"
                  >
                    <FlaskConical className="h-4 w-4" />
                    {testMode ? "Enabled" : "Disabled"}
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/50">
                  <div>
                    <p className="font-medium">Bootstrap Tools</p>
                    <p className="text-sm text-muted-foreground">Access database bootstrap utilities</p>
                  </div>
                  <Button variant="outline" size="sm" asChild className="rounded-xl">
                    <Link href="/admin/bootstrap">Open</Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-medium text-foreground mb-4">Platform Stats</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 rounded-xl bg-white/50">
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <p className="text-2xl font-semibold">{stats.total}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/50">
                  <p className="text-sm text-muted-foreground">Approval Rate</p>
                  <p className="text-2xl font-semibold">
                    {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/50">
                  <p className="text-sm text-muted-foreground">Decline Rate</p>
                  <p className="text-2xl font-semibold">
                    {stats.total > 0 ? Math.round((stats.declined / stats.total) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
