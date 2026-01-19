"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  ScrollText,
  ArrowLeft,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Activity,
  User,
  Bot,
  Webhook,
} from "lucide-react"
import { getAuditLogsAction } from "@/app/actions/admin-config"
import type { AuditLog, AuditLogFilters } from "@/lib/data/types/audit-logs"
import { getAuditEventTypes, formatEventType, formatActorType } from "@/lib/data/types/audit-logs"

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
        return "bg-blue-100 text-blue-800"
      case "admin":
        return "bg-purple-100 text-purple-800"
      case "system":
        return "bg-gray-100 text-gray-800"
      case "webhook":
        return "bg-amber-100 text-amber-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
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
              <ScrollText className="h-6 w-6 text-primary" />
              Audit Log
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Compliance and security event history
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
              </div>
              <ScrollText className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold text-primary">{stats.today}</p>
              </div>
              <Activity className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Top Events (7d)</p>
              <div className="space-y-1">
                {stats.byType.slice(0, 3).map(({ type, count }) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate">{formatEventType(type)}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">By Actor (7d)</p>
              <div className="space-y-1">
                {stats.byActor.map(({ actor_type, count }) => (
                  <div key={actor_type} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{formatActorType(actor_type)}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event History</CardTitle>
          <CardDescription>
            Searchable audit trail of all platform events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search events..."
                onChange={(e) => handleSearch(e.target.value)}
                startContent={<Search className="h-4 w-4 text-muted-foreground" />}
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
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-hidden">
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
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
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
                          {formatEventType(log.event_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`gap-1 ${getActorColor(log.actor_type)}`}>
                          {getActorIcon(log.actor_type)}
                          {formatActorType(log.actor_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {log.description}
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
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLogs(filters, page - 1)}
                  disabled={page === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchLogs(filters, page + 1)}
                  disabled={page === totalPages || isLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <DialogDescription>
              {selectedLog && formatEventType(selectedLog.event_type)}
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

              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1">{selectedLog.description}</p>
              </div>

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
    </div>
  )
}
