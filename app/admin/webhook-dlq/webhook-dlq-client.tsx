"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/uix"
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Eye,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DlqEntry {
  id: string
  event_id: string
  event_type: string
  intake_id: string | null
  error_message: string
  retry_count: number
  payload: Record<string, unknown>
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
  resolution_notes: string | null
}

interface DlqCounts {
  unresolved: number
  total: number
}

export function WebhookDlqClient() {
  const [entries, setEntries] = useState<DlqEntry[]>([])
  const [counts, setCounts] = useState<DlqCounts>({ unresolved: 0, total: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [showResolved, setShowResolved] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<DlqEntry | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [resolveNotes, setResolveNotes] = useState("")

  const fetchEntries = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/webhook-dlq?resolved=${showResolved}`)
      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries || [])
        setCounts(data.counts || { unresolved: 0, total: 0 })
      }
    } catch {
      // Silently fail - UI will show empty state
    } finally {
      setIsLoading(false)
    }
  }, [showResolved])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleAction = async (action: "retry" | "resolve" | "resolve_all", entryId?: string) => {
    setActionLoading(entryId || action)
    try {
      const response = await fetch("/api/admin/webhook-dlq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, entryId, notes: resolveNotes }),
      })
      
      if (response.ok) {
        await fetchEntries()
        setSelectedEntry(null)
        setResolveNotes("")
      }
    } catch {
      // Action failed - UI state unchanged
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-AU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getEventTypeBadge = (eventType: string) => {
    if (eventType.includes("payment")) return "bg-emerald-100 text-emerald-700"
    if (eventType.includes("refund")) return "bg-amber-100 text-amber-700"
    if (eventType.includes("failed")) return "bg-red-100 text-red-700"
    return "bg-dusk-100 text-dusk-700"
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unresolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {counts.unresolved > 0 ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              )}
              <span className={cn(
                "text-2xl font-bold",
                counts.unresolved > 0 ? "text-amber-600" : "text-emerald-600"
              )}>
                {counts.unresolved}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{counts.total}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchEntries}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
              Refresh
            </Button>
            {counts.unresolved > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction("resolve_all")}
                disabled={actionLoading === "resolve_all"}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Resolve All
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Button
          variant={showResolved ? "outline" : "default"}
          size="sm"
          onClick={() => setShowResolved(false)}
        >
          Unresolved Only
        </Button>
        <Button
          variant={showResolved ? "default" : "outline"}
          size="sm"
          onClick={() => setShowResolved(true)}
        >
          Show All
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Intake</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /><Skeleton className="h-3 w-32 mt-1" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    <p className="text-muted-foreground">No failed webhooks</p>
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge className={getEventTypeBadge(entry.event_type)}>
                          {entry.event_type}
                        </Badge>
                        <p className="text-xs text-muted-foreground font-mono">
                          {entry.event_id.slice(0, 20)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm text-red-600 truncate" title={entry.error_message}>
                        {entry.error_message}
                      </p>
                    </TableCell>
                    <TableCell>
                      {entry.intake_id ? (
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {entry.intake_id.slice(0, 8)}...
                        </code>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.retry_count}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(entry.created_at)}
                    </TableCell>
                    <TableCell>
                      {entry.resolved_at ? (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolved
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700">
                          <XCircle className="h-3 w-3 mr-1" />
                          Open
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!entry.resolved_at && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAction("retry", entry.id)}
                              disabled={actionLoading === entry.id}
                            >
                              <RotateCcw className={cn(
                                "h-4 w-4",
                                actionLoading === entry.id && "animate-spin"
                              )} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAction("resolve", entry.id)}
                              disabled={actionLoading === entry.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Webhook Event Details</DialogTitle>
            <DialogDescription>
              {selectedEntry?.event_type} - {selectedEntry?.event_id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Event ID</p>
                  <code className="text-xs">{selectedEntry.event_id}</code>
                </div>
                <div>
                  <p className="text-muted-foreground">Intake ID</p>
                  <code className="text-xs">{selectedEntry.intake_id || "N/A"}</code>
                </div>
                <div>
                  <p className="text-muted-foreground">Retry Count</p>
                  <p>{selectedEntry.retry_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{formatDate(selectedEntry.created_at)}</p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-1">Error Message</p>
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {selectedEntry.error_message}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-1">Payload</p>
                <pre className="p-3 bg-muted rounded text-xs overflow-x-auto max-h-[200px]">
                  {JSON.stringify(selectedEntry.payload, null, 2)}
                </pre>
              </div>

              {selectedEntry.resolved_at && (
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Resolution</p>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-sm">
                    <p>Resolved: {formatDate(selectedEntry.resolved_at)}</p>
                    {selectedEntry.resolution_notes && (
                      <p className="mt-1 text-muted-foreground">{selectedEntry.resolution_notes}</p>
                    )}
                  </div>
                </div>
              )}

              {!selectedEntry.resolved_at && (
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Resolution Notes (optional)</p>
                  <Input
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    placeholder="Add notes about resolution..."
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedEntry && !selectedEntry.resolved_at && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleAction("retry", selectedEntry.id)}
                  disabled={actionLoading === selectedEntry.id}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button
                  onClick={() => handleAction("resolve", selectedEntry.id)}
                  disabled={actionLoading === selectedEntry.id}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Resolved
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
