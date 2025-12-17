"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Eye, Clock, CheckCircle, FileText, Search, Send, Calendar, AlertTriangle, FlaskConical } from "lucide-react"
import type { RequestWithPatient } from "@/types/db"
import { toast } from "sonner"
import { getIsTestMode, setTestModeOverride } from "@/lib/test-mode"

interface AdminDashboardClientProps {
  allRequests: RequestWithPatient[]
  stats: {
    total: number
    pending: number
    approved: number
    declined: number
    needs_follow_up: number
  }
  /** @deprecated doctorName is passed but not used in the current implementation */
  doctorName?: string
  formatCategory: (category: string | null) => string
  formatSubtype: (subtype: string | null) => string
}

export function AdminDashboardClient({
  allRequests,
  stats,
  formatCategory,
  formatSubtype,
}: AdminDashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [scriptSentFilter, setScriptSentFilter] = useState<string>("all")
  const [localRequests, setLocalRequests] = useState(allRequests)
  const [testMode, setTestMode] = useState(getIsTestMode())

  // Filter requests
  const filteredRequests = useMemo(() => {
    return localRequests.filter((request) => {
      // Search filter
      const matchesSearch =
        request.patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.patient.suburb?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.id.toLowerCase().includes(searchQuery.toLowerCase())

      // Status filter
      const matchesStatus = statusFilter === "all" || request.status === statusFilter

      // Category filter
      const matchesCategory = categoryFilter === "all" || request.category === categoryFilter

      // Script sent filter
      const matchesScriptSent =
        scriptSentFilter === "all" ||
        (scriptSentFilter === "sent" && request.script_sent) ||
        (scriptSentFilter === "pending" && !request.script_sent && request.status === "approved")

      return matchesSearch && matchesStatus && matchesCategory && matchesScriptSent
    })
  }, [localRequests, searchQuery, statusFilter, categoryFilter, scriptSentFilter])

  // Calculate age from DOB
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
        return (
          <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            Approved
          </Badge>
        )
      case "declined":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Declined
          </Badge>
        )
      case "needs_follow_up":
        return (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
            Follow-up
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleScriptSentToggle = async (requestId: string, currentValue: boolean) => {
    // Optimistic update
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
      // Revert on error
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

  // Stats for approved requests without script sent
  const pendingScripts = localRequests.filter((r) => r.status === "approved" && !r.script_sent).length
  const todayRequests = localRequests.filter((r) => {
    const today = new Date().toDateString()
    return new Date(r.created_at).toDateString() === today
  }).length

  const handleTestModeToggle = () => {
    const newValue = !testMode
    setTestModeOverride(newValue)
    setTestMode(newValue)
    toast.success(newValue ? "Test mode enabled" : "Test mode disabled")
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete overview of all patient requests and fulfillment status
            </p>
          </div>
          <Button
            variant={testMode ? "default" : "outline"}
            size="sm"
            onClick={handleTestModeToggle}
            className="rounded-xl gap-2"
          >
            <FlaskConical className="h-4 w-4" />
            {testMode ? "Test Mode ON" : "Test Mode OFF"}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div
          className="glass-card rounded-2xl p-5 hover-lift animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <FileText className="h-4 w-4 text-muted-foreground/60" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-foreground">{stats.total}</div>
        </div>

        <div
          className="glass-card rounded-2xl p-5 hover-lift animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Pending Review</span>
            <Clock className="h-4 w-4 text-violet-500" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-foreground">{stats.pending}</div>
        </div>

        <div
          className="glass-card rounded-2xl p-5 hover-lift animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.25s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Scripts to Send</span>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-orange-600">{pendingScripts}</div>
        </div>

        <div
          className="glass-card rounded-2xl p-5 hover-lift animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Today</span>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-foreground">{todayRequests}</div>
        </div>

        <div
          className="glass-card rounded-2xl p-5 hover-lift animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.35s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Completed</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-foreground">{stats.approved}</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div
        className="glass-card rounded-2xl p-6 animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
      >
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

          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] rounded-xl bg-white/50 border-white/40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="needs_follow_up">Follow-up</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px] rounded-xl bg-white/50 border-white/40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="medical_certificate">Med Cert</SelectItem>
                <SelectItem value="prescription">Prescription</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
              </SelectContent>
            </Select>

            <Select value={scriptSentFilter} onValueChange={setScriptSentFilter}>
              <SelectTrigger className="w-[150px] rounded-xl bg-white/50 border-white/40">
                <SelectValue placeholder="Script Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scripts</SelectItem>
                <SelectItem value="pending">Pending Send</SelectItem>
                <SelectItem value="sent">Already Sent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredRequests.length} of {localRequests.length} requests
        </div>
      </div>

      {/* Requests Table */}
      <div
        className="glass-card rounded-2xl overflow-hidden animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.45s", animationFillMode: "forwards" }}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-white/30 hover:bg-white/30">
                <TableHead className="w-[50px]">Script</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map((request, index) => {
                  const patientAge = calculateAge(request.patient.date_of_birth)
                  const showScriptCheckbox = request.status === "approved"

                  return (
                    <TableRow
                      key={request.id}
                      className="animate-fade-in opacity-0 hover:bg-white/40 transition-colors"
                      style={{ animationDelay: `${0.05 * index}s`, animationFillMode: "forwards" }}
                    >
                      <TableCell>
                        {showScriptCheckbox && (
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
                              {request.script_sent ? "Script sent via external platform" : "Mark as sent"}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border-2 border-white/50 shadow-sm">
                            <AvatarFallback className="bg-linear-to-br from-primary to-primary/80 text-primary-foreground text-xs">
                              {getInitials(request.patient.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{request.patient.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {patientAge}y • {request.patient.phone || "No phone"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant="outline"
                            className="w-fit text-xs bg-indigo-50 border-indigo-200 text-indigo-700"
                          >
                            {formatCategory(request.category)}
                          </Badge>
                          {request.subtype && (
                            <span className="text-xs text-muted-foreground">{formatSubtype(request.subtype)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(request.status)}
                          {request.script_sent && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Send className="h-3.5 w-3.5 text-indigo-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Sent{" "}
                                  {request.script_sent_at
                                    ? new Date(request.script_sent_at).toLocaleDateString("en-AU")
                                    : ""}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {request.patient.suburb}, {request.patient.state}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="rounded-xl bg-white/50 hover:bg-white/80 border-white/40"
                        >
                          <Link href={`/doctor/requests/${request.id}`}>
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileText className="h-8 w-8 opacity-50" />
                      <p>No requests found matching your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
