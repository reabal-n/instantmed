"use client"

import {
  ArrowRight,
  ClipboardList,
  Eye,
  type LucideIcon,
  Search,
  Stethoscope,
} from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserCard } from "@/components/uix"
import {
  ADMIN_STATUS_PRIORITY,
  compareAdminWorkItems,
  getAdminWorkLaneForStatus,
} from "@/lib/dashboard/admin-work-lanes"
import { buildAdminIntakeHref } from "@/lib/dashboard/routes"
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

function getPatient(intake: IntakeWithPatient) {
  return intake.patient as { full_name?: string; suburb?: string; state?: string } | undefined
}

function getService(intake: IntakeWithPatient) {
  return intake.service as { name?: string; short_name?: string; type?: string } | undefined
}

function sortByWorkPriority(intakes: IntakeWithPatient[]) {
  return [...intakes].sort(compareAdminWorkItems)
}

function WorkLane({
  title,
  subtitle,
  icon: Icon,
  intakes,
  empty,
  getStatusBadge,
}: {
  title: string
  subtitle: string
  icon: LucideIcon
  intakes: IntakeWithPatient[]
  empty: string
  getStatusBadge: (status: string) => string
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/15 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm shadow-primary/[0.04] dark:bg-card"
            aria-hidden
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <span className="rounded-full border border-border/50 bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground dark:bg-card">
          {intakes.length}
        </span>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-border/50 bg-white dark:bg-card">
        {intakes.length > 0 ? (
          <div className="divide-y divide-border/50">
            {intakes.slice(0, 5).map((intake) => {
              const patient = getPatient(intake)
              const service = getService(intake)

              return (
                <Link
                  key={intake.id}
                  href={buildAdminIntakeHref(intake.id)}
                  className="group flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-muted/35"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {patient?.full_name || "Unknown patient"}
                      </p>
                      <Badge className={cn("shrink-0 text-[11px]", getStatusBadge(intake.status))}>
                        {formatIntakeStatus(intake.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {service?.short_name || service?.name || "Request"} - {formatDate(intake.created_at)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-60 transition-[opacity,transform] group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">{empty}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Nothing waiting here. Take the win.
            </p>
          </div>
        )}
      </div>
    </div>
  )
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
          (ADMIN_STATUS_PRIORITY[a.status] ?? 99) - (ADMIN_STATUS_PRIORITY[b.status] ?? 99)
        if (priorityDelta !== 0) return priorityDelta
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [allIntakes, searchQuery, statusFilter, serviceFilter])

  const doctorWorkIntakes = useMemo(
    () => sortByWorkPriority(
      allIntakes.filter((intake) => getAdminWorkLaneForStatus(intake.status) === "doctor"),
    ),
    [allIntakes],
  )
  const adminWorkIntakes = useMemo(
    () => sortByWorkPriority(
      allIntakes.filter((intake) => getAdminWorkLaneForStatus(intake.status) === "admin"),
    ),
    [allIntakes],
  )

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
          <div className="mb-4 grid gap-3 lg:grid-cols-2">
            <WorkLane
              title="Doctor work"
              subtitle="Clinical review, prescriptions, and requests waiting on medical judgement."
              icon={Stethoscope}
              intakes={doctorWorkIntakes}
              empty="No clinical work waiting."
              getStatusBadge={getStatusBadge}
            />
            <WorkLane
              title="Admin work"
              subtitle="Payment friction, patient follow-up, disputes, and the small stuff that blocks flow."
              icon={ClipboardList}
              intakes={adminWorkIntakes}
              empty="No admin loose ends."
              getStatusBadge={getStatusBadge}
            />
          </div>

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
                      href={buildAdminIntakeHref(intake.id)}
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
                            <Link href={buildAdminIntakeHref(intake.id)}>
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
