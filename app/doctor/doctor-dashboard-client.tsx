"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Eye, Clock, CheckCircle, XCircle, FileText, StickyNote, Filter, CreditCard, Search } from "lucide-react"
import type { RequestWithPatient } from "@/types/db"

interface DoctorDashboardClientProps {
  pendingRequests: RequestWithPatient[]
  approvedRequests: RequestWithPatient[]
  declinedRequests: RequestWithPatient[]
  awaitingPaymentRequests?: RequestWithPatient[]
  stats: {
    total: number
    pending: number
    approved: number
    declined: number
    needs_follow_up: number
    awaiting_payment?: number
  }
  doctorName: string
  formatCategory: (category: string | null) => string
  formatSubtype: (subtype: string | null) => string
}

export function DoctorDashboardClient({
  pendingRequests,
  approvedRequests,
  declinedRequests,
  awaitingPaymentRequests = [],
  stats,
  doctorName,
  formatCategory,
  formatSubtype,
}: DoctorDashboardClientProps) {
  const [activeTab, setActiveTab] = useState("pending")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const categoryFilters = [
    { value: "all", label: "All" },
    { value: "medical_certificate", label: "Med Certs" },
    { value: "prescription", label: "Scripts" },
    { value: "referral", label: "Referrals" },
  ]

  const filterRequests = (requests: RequestWithPatient[]) => {
    let filtered = requests

    if (categoryFilter !== "all") {
      filtered = filtered.filter((r) => r.category === categoryFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (r) => r.patient.full_name.toLowerCase().includes(query) || r.patient.medicare_number?.includes(query),
      )
    }

    return filtered
  }

  const filteredPending = useMemo(() => filterRequests(pendingRequests), [pendingRequests, categoryFilter, searchQuery])
  const filteredApproved = useMemo(
    () => filterRequests(approvedRequests),
    [approvedRequests, categoryFilter, searchQuery],
  )
  const filteredDeclined = useMemo(
    () => filterRequests(declinedRequests),
    [declinedRequests, categoryFilter, searchQuery],
  )
  const filteredAwaitingPayment = useMemo(
    () => filterRequests(awaitingPaymentRequests),
    [awaitingPaymentRequests, categoryFilter, searchQuery],
  )

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

  const RequestCard = ({
    request,
    showActions = false,
    index = 0,
    isAwaitingPayment = false,
  }: {
    request: RequestWithPatient
    showActions?: boolean
    index?: number
    isAwaitingPayment?: boolean
  }) => {
    const patientAge = calculateAge(request.patient.date_of_birth)
    const notePreview = request.clinical_note
      ? request.clinical_note.slice(0, 80) + (request.clinical_note.length > 80 ? "..." : "")
      : null

    return (
      <div
        className={`flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between animate-fade-in opacity-0 ${isAwaitingPayment ? "opacity-60" : ""}`}
        style={{ animationDelay: `${0.1 + index * 0.05}s`, animationFillMode: "forwards" }}
      >
        <div className="flex items-start gap-3 min-w-0">
          <Avatar className="h-10 w-10 shrink-0 border-2 border-white/50 shadow-md">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs font-medium">
              {getInitials(request.patient.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground">{request.patient.full_name}</span>
              <span className="text-sm text-muted-foreground">{patientAge}y</span>
              <Badge variant="outline" className="text-xs font-normal bg-primary/10 border-primary/20 text-primary">
                {formatCategory(request.category)}
              </Badge>
              {request.subtype && (
                <Badge variant="outline" className="text-xs font-normal bg-white/50 border-white/40">
                  {formatSubtype(request.subtype)}
                </Badge>
              )}
              {isAwaitingPayment && (
                <Badge className="text-xs font-normal bg-orange-100/80 text-orange-700 border-0 gap-1">
                  <CreditCard className="h-3 w-3" />
                  Awaiting Payment
                </Badge>
              )}
              {notePreview && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <StickyNote className="h-3.5 w-3.5 text-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">{notePreview}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(request.created_at).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {isAwaitingPayment ? (
            <span className="text-xs text-muted-foreground italic">Waiting for patient to pay</span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="rounded-xl bg-white/50 hover:bg-white/80 border-white/40 transition-all hover:scale-105"
            >
              <Link href={`/doctor/requests/${request.id}`}>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Review
              </Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, Dr. {doctorName.split(" ")[1] || doctorName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Requests ready for your review</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          className="glass-card rounded-2xl p-5 hover-lift animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">All requests</span>
            <FileText className="h-4 w-4 text-muted-foreground/60" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-foreground">{stats.total}</div>
        </div>

        <div
          className="glass-card rounded-2xl p-5 hover-lift animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Ready for review</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-foreground">{stats.pending}</div>
        </div>

        <div
          className="glass-card rounded-2xl p-5 hover-lift animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.25s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Completed</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-foreground">{stats.approved}</div>
        </div>

        <div
          className="glass-card rounded-2xl p-5 hover-lift animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Unable to approve</span>
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-foreground">{stats.declined}</div>
        </div>
      </div>

      {/* Requests Tabs */}
      <div
        className="glass-card rounded-2xl overflow-hidden animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.35s", animationFillMode: "forwards" }}
      >
        <div className="p-6 pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Patient Requests</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Review and respond to submissions</p>
              </div>
              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-1 p-1 bg-white/50 rounded-xl">
                  {categoryFilters.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setCategoryFilter(filter.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                        categoryFilter === filter.value
                          ? "bg-white shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by patient name or Medicare number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-white/50 border-white/40 focus:border-primary/50"
              />
            </div>
          </div>
        </div>
        <div className="px-6 pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-5 bg-white/50 backdrop-blur-sm rounded-xl p-1">
              <TabsTrigger
                value="pending"
                className="gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Ready
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100/80 px-1.5 text-xs font-medium text-amber-700">
                  {filteredPending.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="approved"
                className="gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Completed
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-100/80 px-1.5 text-xs font-medium text-emerald-700">
                  {filteredApproved.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="declined"
                className="gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Unable to approve
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100/80 px-1.5 text-xs font-medium text-red-700">
                  {filteredDeclined.length}
                </span>
              </TabsTrigger>
              {filteredAwaitingPayment.length > 0 && (
                <TabsTrigger
                  value="awaiting_payment"
                  className="gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Unpaid
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-100/80 px-1.5 text-xs font-medium text-orange-700">
                    {filteredAwaitingPayment.length}
                  </span>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="pending" className="mt-0">
              <div className="divide-y divide-white/30">
                {filteredPending.length > 0 ? (
                  filteredPending.map((request, index) => (
                    <RequestCard key={request.id} request={request} showActions index={index} />
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {searchQuery ? "No matching requests found" : "No requests waiting for review"}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="approved" className="mt-0">
              <div className="divide-y divide-white/30">
                {filteredApproved.length > 0 ? (
                  filteredApproved.map((request, index) => (
                    <RequestCard key={request.id} request={request} index={index} />
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {searchQuery ? "No matching requests found" : "No completed requests"}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="declined" className="mt-0">
              <div className="divide-y divide-white/30">
                {filteredDeclined.length > 0 ? (
                  filteredDeclined.map((request, index) => (
                    <RequestCard key={request.id} request={request} index={index} />
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {searchQuery ? "No matching requests found" : "No requests marked unable to approve"}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="awaiting_payment" className="mt-0">
              <div className="divide-y divide-white/30">
                {filteredAwaitingPayment.length > 0 ? (
                  filteredAwaitingPayment.map((request, index) => (
                    <RequestCard key={request.id} request={request} index={index} isAwaitingPayment />
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {searchQuery ? "No matching requests found" : "No unpaid requests"}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
