"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { UserCard } from "@/components/uix"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle,
  FileText, 
  Search, 
  Send, 
  Users,
  TrendingUp,
} from "lucide-react"
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
    const variants: Record<string, string> = {
      paid: "bg-blue-100 text-blue-800",
      in_review: "bg-amber-100 text-amber-800",
      approved: "bg-emerald-100 text-emerald-800",
      declined: "bg-red-100 text-red-800",
      completed: "bg-gray-100 text-gray-800",
      awaiting_script: "bg-dawn-100 text-dawn-800",
      pending_info: "bg-orange-100 text-orange-800",
    }
    return variants[status] || "bg-gray-100 text-gray-800"
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete overview of all intakes • Dr. {doctorName}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">In Queue</p>
                <p className="text-2xl font-bold">{stats.in_queue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Declined</p>
                <p className="text-2xl font-bold">{stats.declined}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Send className="h-5 w-5 text-dawn-500" />
              <div>
                <p className="text-xs text-muted-foreground">Scripts Pending</p>
                <p className="text-2xl font-bold">{stats.scripts_pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-dawn-500" />
              <div>
                <p className="text-xs text-muted-foreground">Needs Info</p>
                <p className="text-2xl font-bold">{stats.pending_info}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Intakes ({filteredIntakes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by name, suburb, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startContent={<Search className="h-4 w-4 text-muted-foreground" />}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="paid">In Queue</option>
              <option value="in_review">In Review</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
              <option value="awaiting_script">Awaiting Script</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">All Services</option>
              <option value="med_certs">Medical Certificates</option>
              <option value="repeat_rx">Repeat Scripts</option>
              <option value="consults">Consultations</option>
            </select>
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Patient</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                            {new Date(intake.created_at).toLocaleDateString("en-AU", {
                              day: "numeric",
                              month: "short",
                            })}
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
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No intakes found matching your filters
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
