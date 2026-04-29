"use client"

import {
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Search,
  Send,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useMemo,useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserCard } from "@/components/uix"
import { INTAKE_STATUS, type IntakeStatus } from "@/lib/data/status"
import { formatDate } from "@/lib/format"
import type { IntakeWithPatient } from "@/types/db"

// Format functions (inline to avoid server-only import)
function formatIntakeStatus(status: string): string {
  const labels: Record<string, string> = {
    pending_payment: "Awaiting Payment",
    paid: "In Queue",
    in_review: "Under Review",
    approved: "Approved",
    declined: "Declined",
    completed: "Completed",
    pending_info: "Needs Info",
    awaiting_script: "Awaiting Script",
  }
  return labels[status] || status
}

interface AdminDashboardClientProps {
  allIntakes: IntakeWithPatient[]
  totalIntakes?: number
  stats: {
    total: number
    in_queue: number
    approved: number
    declined: number
    pending_info: number
    scripts_pending: number
  }
  doctorName: string
}

export function AdminDashboardClient({
  allIntakes,
  stats,
  doctorName,
}: AdminDashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [serviceFilter, setServiceFilter] = useState<string>("all")

  // Filter intakes
  const filteredIntakes = useMemo(() => {
    return allIntakes.filter((intake) => {
      const patient = intake.patient as { full_name?: string; suburb?: string } | undefined
      const service = intake.service as { type?: string } | undefined
      
      // Search filter
      const matchesSearch =
        patient?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient?.suburb?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        intake.id.toLowerCase().includes(searchQuery.toLowerCase())

      // Status filter
      const matchesStatus = statusFilter === "all" || intake.status === statusFilter

      // Service filter
      const matchesService = serviceFilter === "all" || service?.type === serviceFilter

      return matchesSearch && matchesStatus && matchesService
    })
  }, [allIntakes, searchQuery, statusFilter, serviceFilter])

  const getStatusBadge = (status: string) => {
    return INTAKE_STATUS[status as IntakeStatus]?.color ?? "bg-muted text-foreground"
  }


  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground font-sans">Admin Dashboard</h1>
        <p className="text-base text-muted-foreground mt-2">
          <span className="mr-1.5" aria-hidden>👋</span>
          Welcome back, Dr. {doctorName} · Complete overview of all intakes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-info shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">In Queue</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5">{stats.in_queue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-success shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Approved</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-destructive shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Declined</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5">{stats.declined}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Send className="h-5 w-5 text-warning shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scripts Pending</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5">{stats.scripts_pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-warning shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Needs Info</p>
                <p className="text-2xl font-semibold tabular-nums mt-0.5">{stats.pending_info}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-xl border-border/50">
        <CardHeader className="px-6 py-6">
          <CardTitle className="text-lg font-semibold flex items-center gap-2.5">
            <Users className="h-5 w-5" />
            All Intakes ({filteredIntakes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-0">
          <div className="flex flex-wrap gap-4 mb-5">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by name, suburb, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startContent={<Search className="h-4 w-4 text-muted-foreground" />}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">In Queue</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="awaiting_script">Awaiting Script</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="med_certs">Medical Certificates</SelectItem>
                <SelectItem value="repeat_rx">Repeat Scripts</SelectItem>
                <SelectItem value="consults">Consultations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead scope="col">Patient</TableHead>
                  <TableHead scope="col">Service</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Date</TableHead>
                  <TableHead scope="col" className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIntakes.length > 0 ? (
                  filteredIntakes.map((intake) => {
                    const patient = intake.patient as { full_name?: string; suburb?: string; state?: string } | undefined
                    const service = intake.service as { name?: string; short_name?: string } | undefined
                    
                    return (
                      <TableRow key={intake.id}>
                        <TableCell>
                          <UserCard
                            name={patient?.full_name || "Unknown"}
                            description={`${patient?.suburb || ""}${patient?.state ? `, ${patient.state}` : ""}`}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{service?.short_name || service?.name || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(intake.status)}>
                            {formatIntakeStatus(intake.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(intake.created_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/doctor/intakes/${intake.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <span className="text-2xl" aria-hidden>🔎</span>
                        <p className="text-sm">No intakes match these filters</p>
                        <p className="text-xs">
                          Try clearing the search or switching the status to All
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
