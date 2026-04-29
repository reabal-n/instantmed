"use client"

import {
  Eye,
  Search,
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
import { cn } from "@/lib/utils"
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

const STATUS_PRIORITY: Record<string, number> = {
  awaiting_script: 0,
  pending_info: 1,
  paid: 2,
  in_review: 3,
  pending_payment: 4,
  declined: 5,
  approved: 6,
  completed: 7,
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
}

export function AdminDashboardClient({
  allIntakes,
  stats,
}: AdminDashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [serviceFilter, setServiceFilter] = useState<string>("all")

  const filteredIntakes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return allIntakes
      .filter((intake) => {
        const patient = intake.patient as { full_name?: string; suburb?: string } | undefined
        const service = intake.service as { type?: string } | undefined

        const matchesSearch =
          !query ||
          patient?.full_name?.toLowerCase().includes(query) ||
          patient?.suburb?.toLowerCase().includes(query) ||
          intake.id.toLowerCase().includes(query)

        const matchesStatus = statusFilter === "all" || intake.status === statusFilter
        const matchesService = serviceFilter === "all" || service?.type === serviceFilter

        return matchesSearch && matchesStatus && matchesService
      })
      .sort((a, b) => {
        const priorityDelta =
          (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99)
        if (priorityDelta !== 0) return priorityDelta
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [allIntakes, searchQuery, statusFilter, serviceFilter])

  const getStatusBadge = (status: string) => {
    return INTAKE_STATUS[status as IntakeStatus]?.color ?? "bg-muted text-foreground"
  }

  const summary = [
    { label: "Total", value: stats.total },
    { label: "In queue", value: stats.in_queue },
    { label: "Scripts", value: stats.scripts_pending },
    { label: "Needs info", value: stats.pending_info },
    { label: "Approved", value: stats.approved },
    { label: "Declined", value: stats.declined },
  ]

  return (
    <div>
      <Card className="overflow-hidden rounded-xl border-border/60 shadow-sm shadow-primary/[0.03]">
        <CardHeader className="border-b border-border/40 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base font-semibold tracking-tight">
              Intake ledger ({filteredIntakes.length})
            </CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {summary.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/25 px-2 py-1 text-xs text-muted-foreground"
                >
                  <span className="font-semibold tabular-nums text-foreground">{item.value}</span>
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-4">
          <div className="mb-4 grid gap-3 md:flex md:flex-wrap">
            <div className="min-w-0 md:min-w-[200px] md:flex-1">
              <Input
                placeholder="Search by name, suburb, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startContent={<Search className="h-4 w-4 text-muted-foreground" />}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[160px]" aria-label="Filter intakes by status">
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
              <SelectTrigger className="w-full md:w-[180px]" aria-label="Filter intakes by service">
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

          <div className="overflow-hidden rounded-lg border border-border/50 md:hidden">
            {filteredIntakes.length > 0 ? (
              <div className="divide-y divide-border/50">
                {filteredIntakes.map((intake) => {
                  const patient = intake.patient as { full_name?: string; suburb?: string; state?: string } | undefined
                  const service = intake.service as { name?: string; short_name?: string } | undefined

                  return (
                    <Link
                      key={intake.id}
                      href={`/doctor/intakes/${intake.id}`}
                      className="block bg-card p-3 transition-colors hover:bg-muted/35"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <UserCard
                          name={patient?.full_name || "Unknown"}
                          description={`${patient?.suburb || ""}${patient?.state ? `, ${patient.state}` : ""}`}
                          size="sm"
                          className="min-w-0"
                        />
                        <Badge className={cn("shrink-0 text-xs", getStatusBadge(intake.status))}>
                          {formatIntakeStatus(intake.status)}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Service</p>
                          <p className="mt-0.5 font-medium text-foreground">
                            {service?.short_name || service?.name || "—"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">Date</p>
                          <p className="mt-0.5 font-medium text-foreground">
                            {formatDate(intake.created_at)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-muted-foreground">
                <Search className="h-5 w-5" aria-hidden />
                <p className="text-sm">No intakes match these filters</p>
                <p className="text-xs">
                  Try clearing the search or switching the status to All
                </p>
              </div>
            )}
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-border/50 md:block">
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
                        <Search className="h-5 w-5" aria-hidden />
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
