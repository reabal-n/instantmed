"use client"

import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import type { IssuedCertificate } from "@/lib/data/issued-certificates"
import { formatDate } from "@/lib/format"

interface CertificatesListClientProps {
  certificates: IssuedCertificate[]
  currentPage: number
  totalPages: number
  total: number
  initialStatus: string
  initialType: string
  initialSearch: string
}

const STATUS_META: Record<
  string,
  { label: string; className: string; icon: typeof CheckCircle }
> = {
  valid: {
    label: "Valid",
    className: "bg-success-light text-success border-success-border",
    icon: CheckCircle,
  },
  expired: {
    label: "Expired",
    className: "bg-muted text-muted-foreground border-border",
    icon: Clock,
  },
  revoked: {
    label: "Revoked",
    className: "bg-destructive/10 text-destructive border-destructive/30",
    icon: ShieldAlert,
  },
  superseded: {
    label: "Superseded",
    className: "bg-warning-light text-warning border-warning-border",
    icon: XCircle,
  },
}

const TYPE_LABELS: Record<string, string> = {
  work: "Work",
  study: "Study",
  carer: "Carer",
}

export function CertificatesListClient({
  certificates,
  currentPage,
  totalPages,
  total,
  initialStatus,
  initialType,
  initialSearch,
}: CertificatesListClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [typeFilter, setTypeFilter] = useState(initialType)

  const updateQuery = (next: {
    page?: number
    status?: string
    type?: string
    q?: string
  }) => {
    const params = new URLSearchParams()
    const page = next.page ?? 1
    if (page > 1) params.set("page", String(page))
    const status = next.status ?? statusFilter
    if (status && status !== "all") params.set("status", status)
    const type = next.type ?? typeFilter
    if (type && type !== "all") params.set("type", type)
    const q = next.q ?? searchQuery
    if (q && q.trim().length > 0) params.set("q", q.trim())
    const qs = params.toString()
    startTransition(() => {
      router.push(`/doctor/certificates${qs ? `?${qs}` : ""}`)
    })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateQuery({ page: 1, q: searchQuery })
  }

  const validCount = certificates.filter((c) => c.status === "valid").length
  const revokedCount = certificates.filter((c) => c.status === "revoked").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground font-sans">
          Certificates
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          All issued medical certificates - search, filter, download.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Issued
              </span>
              <FileText className="h-5 w-5 text-primary shrink-0" />
            </div>
            <div className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">
              {total}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Valid (this page)
              </span>
              <CheckCircle className="h-5 w-5 text-success shrink-0" />
            </div>
            <div className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">
              {validCount}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Revoked (this page)
              </span>
              <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
            </div>
            <div className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">
              {revokedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-xl border-border/50">
        <CardContent className="p-5">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Search by reference, number, or patient name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startContent={<Search className="h-4 w-4 text-muted-foreground" />}
              />
            </div>

            <div className="flex gap-3">
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v)
                  updateQuery({ page: 1, status: v })
                }}
              >
                <SelectTrigger className="w-[140px] rounded-xl bg-white dark:bg-card border-border/50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="valid">Valid</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                  <SelectItem value="superseded">Superseded</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={typeFilter}
                onValueChange={(v) => {
                  setTypeFilter(v)
                  updateQuery({ page: 1, type: v })
                }}
              >
                <SelectTrigger className="w-[130px] rounded-xl bg-white dark:bg-card border-border/50">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="study">Study</SelectItem>
                  <SelectItem value="carer">Carer</SelectItem>
                </SelectContent>
              </Select>

              <Button type="submit" variant="outline" size="sm" disabled={isPending}>
                Search
              </Button>
            </div>
          </form>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {certificates.length} of {total.toLocaleString()} certificates
            {isPending && <span className="ml-2 opacity-60">(loading...)</span>}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-xl border-border/50 overflow-hidden">
        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead scope="col">Reference</TableHead>
                  <TableHead scope="col">Patient</TableHead>
                  <TableHead scope="col">Type</TableHead>
                  <TableHead scope="col">Period</TableHead>
                  <TableHead scope="col">Issued</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col" className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.length > 0 ? (
                  certificates.map((cert) => {
                    const meta = STATUS_META[cert.status] || STATUS_META.valid
                    const StatusIcon = meta.icon
                    const href = `/doctor/intakes/${cert.intake_id}`
                    return (
                      <TableRow
                        key={cert.id}
                        className="hover:bg-muted/50 transition-colors duration-200 cursor-pointer group"
                      >
                        <TableCell>
                          <Link href={href} className="block">
                            <span className="text-sm font-mono text-foreground">
                              {cert.certificate_ref || cert.certificate_number}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium text-foreground">
                            {cert.patient_name || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {TYPE_LABELS[cert.certificate_type] || cert.certificate_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(cert.start_date)}
                            {cert.start_date !== cert.end_date && (
                              <> → {formatDate(cert.end_date)}</>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(cert.created_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={meta.className}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={href}>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="h-8 w-8 opacity-50" />
                        <p>No certificates found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isPending}
              onClick={() => updateQuery({ page: currentPage - 1 })}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || isPending}
              onClick={() => updateQuery({ page: currentPage + 1 })}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
