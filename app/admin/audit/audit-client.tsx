"use client"

import {
  Activity,
  Bot,
  Eye,
  Search,
  Stethoscope,
  User,
  Webhook,
} from "lucide-react"
import { useCallback, useState } from "react"

import { getAuditLogsAction } from "@/app/actions/admin-config"
import { OperatorPage, OperatorPageHeader, OperatorScrollArea } from "@/components/operator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Pagination, ScrollShadow, Skeleton, Tooltip } from "@/components/uix"
import { STAFF_OPS_HREF } from "@/lib/dashboard/routes"
import type { AuditLog, AuditLogFilters } from "@/lib/data/types/audit-logs"
import { formatActorType, formatEventType, getAuditEventTypes } from "@/lib/data/types/audit-logs"

interface AuditLogClientProps {
  initialLogs: AuditLog[]
  initialTotal: number
  stats: {
    total: number
    today: number
    byType: { type: string; count: number }[]
    byActor: { actor_type: string; count: number }[]
  }
}

const EVENT_TYPES = getAuditEventTypes()

export function AuditLogClient({ initialLogs, initialTotal, stats }: AuditLogClientProps) {
  const [logs, setLogs] = useState(initialLogs)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const pageSize = 50

  const [filters, setFilters] = useState<AuditLogFilters>({
    eventType: undefined,
    actorType: undefined,
    search: undefined,
  })

  const fetchLogs = useCallback(async (newFilters: AuditLogFilters, newPage: number) => {
    setIsLoading(true)
    try {
      const result = await getAuditLogsAction(newFilters, newPage, pageSize)
      setLogs(result.data)
      setTotal(result.total)
      setPage(newPage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleFilterChange = (key: keyof AuditLogFilters, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value === "all" ? undefined : value }
    setFilters(newFilters)
    fetchLogs(newFilters, 1)
  }

  const handleSearch = (search: string) => {
    const newFilters = { ...filters, search: search || undefined }
    setFilters(newFilters)
    fetchLogs(newFilters, 1)
  }

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log)
    setIsDetailOpen(true)
  }

  const totalPages = Math.ceil(total / pageSize)

  const getActorIcon = (type: string) => {
    switch (type) {
      case "patient":
        return <User className="h-3 w-3" />
      case "doctor":
        return <Stethoscope className="h-3 w-3" />
      case "admin":
        return <User className="h-3 w-3" />
      case "system":
        return <Bot className="h-3 w-3" />
      case "webhook":
        return <Webhook className="h-3 w-3" />
      default:
        return <Activity className="h-3 w-3" />
    }
  }

  const getActorColor = (type: string) => {
    switch (type) {
      case "patient":
        return "bg-info-light text-info"
      case "doctor":
        return "bg-success-light text-success"
      case "admin":
        return "bg-warning-light text-warning"
      case "system":
        return "bg-muted text-foreground"
      case "webhook":
        return "bg-warning-light text-warning"
      default:
        return "bg-muted text-foreground"
    }
  }

  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Audit history"
        description="Compliance and security evidence for Ops investigations."
        backHref={STAFF_OPS_HREF}
        backLabel="Ops"
      />

      <OperatorScrollArea>
        <Card aria-label="Audit summary">
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total events</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{stats.total.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Today</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-primary">{stats.today}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Top events</p>
              <p className="mt-1 truncate text-sm text-foreground">
                {stats.byType.slice(0, 3).map(({ type }) => formatEventType(type)).join(", ") || "None"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Actor mix</p>
              <p className="mt-1 truncate text-sm text-foreground">
                {stats.byActor.map(({ actor_type, count }) => `${formatActorType(actor_type)} ${count}`).join(", ") || "None"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance history</CardTitle>
            <CardDescription>
              Search audit events when Ops needs incident, merge, or security evidence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={filters.eventType || "all"}
                onValueChange={(v) => handleFilterChange("eventType", v)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.actorType || "all"}
                onValueChange={(v) => handleFilterChange("actorType", v)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Actor type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actors</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ScrollShadow className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : logs.length > 0 ? (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("en-AU", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {formatEventType(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`gap-1 ${getActorColor(log.actor_type)}`}>
                            {getActorIcon(log.actor_type)}
                            {formatActorType(log.actor_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          {log.description ? (
                            log.description.length > 50 ? (
                              <Tooltip content={log.description}>
                                <span className="truncate block cursor-help">
                                  {log.description.substring(0, 50)}...
                                </span>
                              </Tooltip>
                            ) : (
                              log.description
                            )
                          ) : (
                            <span className="text-muted-foreground italic">No description</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No events found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollShadow>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} of {total}
                </p>
                <Pagination
                  total={totalPages}
                  page={page}
                  onChange={(newPage) => fetchLogs(filters, newPage)}
                  showControls
                  size="sm"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </OperatorScrollArea>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <DialogDescription>
              {selectedLog && formatEventType(selectedLog.action)}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Timestamp</Label>
                  <p className="font-mono">
                    {new Date(selectedLog.created_at).toLocaleString("en-AU")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Actor Type</Label>
                  <p>{formatActorType(selectedLog.actor_type)}</p>
                </div>
                {selectedLog.actor && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Actor</Label>
                    <p>{selectedLog.actor.full_name} ({selectedLog.actor.email})</p>
                  </div>
                )}
                {selectedLog.intake_id && (
                  <div>
                    <Label className="text-muted-foreground">Intake ID</Label>
                    <p className="font-mono text-xs">{selectedLog.intake_id}</p>
                  </div>
                )}
                {selectedLog.client_ip && (
                  <div>
                    <Label className="text-muted-foreground">IP Address</Label>
                    <p className="font-mono">{selectedLog.client_ip}</p>
                  </div>
                )}
              </div>

              {selectedLog.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1">{selectedLog.description}</p>
                </div>
              )}

              {selectedLog.previous_state && (
                <div>
                  <Label className="text-muted-foreground">Previous State</Label>
                  <pre className="mt-1 p-2 rounded bg-muted text-xs overflow-auto max-h-[100px]">
                    {JSON.stringify(selectedLog.previous_state, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_state && (
                <div>
                  <Label className="text-muted-foreground">New State</Label>
                  <pre className="mt-1 p-2 rounded bg-muted text-xs overflow-auto max-h-[100px]">
                    {JSON.stringify(selectedLog.new_state, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Metadata</Label>
                  <pre className="mt-1 p-2 rounded bg-muted text-xs overflow-auto max-h-[100px]">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </OperatorPage>
  )
}
