"use client"

import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  RotateCcw,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { OperatorSplitPane } from "@/components/operator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/uix"
import { fetchWithCsrf } from "@/lib/security/csrf-client"
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getEventTypeBadge(eventType: string) {
  if (eventType.includes("payment")) return "bg-success-light text-success"
  if (eventType.includes("refund")) return "bg-warning-light text-warning"
  if (eventType.includes("failed")) return "bg-destructive-light text-destructive"
  return "bg-muted text-foreground"
}

function EntrySkeleton() {
  return (
    <div className="space-y-2 border-b border-border/50 px-4 py-3">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

export function WebhookDlqClient() {
  const [entries, setEntries] = useState<DlqEntry[]>([])
  const [counts, setCounts] = useState<DlqCounts>({ unresolved: 0, total: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [showResolved, setShowResolved] = useState(false)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [resolveNotes, setResolveNotes] = useState("")

  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) || entries[0] || null

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
      setEntries([])
    } finally {
      setIsLoading(false)
    }
  }, [showResolved])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  useEffect(() => {
    if (!entries.length) {
      setSelectedEntryId(null)
      return
    }

    if (!selectedEntryId || !entries.some((entry) => entry.id === selectedEntryId)) {
      setSelectedEntryId(entries[0].id)
    }
  }, [entries, selectedEntryId])

  const handleAction = async (action: "retry" | "resolve" | "resolve_all", entryId?: string) => {
    setActionLoading(entryId || action)
    try {
      const response = await fetchWithCsrf("/api/admin/webhook-dlq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, entryId, notes: resolveNotes }),
      })

      if (response.ok) {
        await fetchEntries()
        setResolveNotes("")
      }
    } finally {
      setActionLoading(null)
    }
  }

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Failed webhooks</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {counts.unresolved > 0 ? "Open events need review." : "No open webhook failures."}
            </p>
          </div>
          <Badge variant={counts.unresolved > 0 ? "warning" : "success"} className="shrink-0">
            {counts.unresolved > 0 ? "Open" : "Clear"}
          </Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={!showResolved ? "default" : "outline"}
            onClick={() => setShowResolved(false)}
          >
            Open
          </Button>
          <Button
            type="button"
            size="sm"
            variant={showResolved ? "default" : "outline"}
            onClick={() => setShowResolved(true)}
          >
            All
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={fetchEntries} disabled={isLoading}>
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => <EntrySkeleton key={index} />)
        ) : entries.length === 0 ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center px-6 text-center">
            <CheckCircle className="h-8 w-8 text-success" />
            <p className="mt-3 text-sm font-medium text-foreground">Webhook queue clear</p>
            <p className="mt-1 text-xs text-muted-foreground">Payment failures will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {entries.map((entry) => {
              const active = selectedEntry?.id === entry.id
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedEntryId(entry.id)}
                  className={cn(
                    "block w-full px-4 py-3 text-left transition-colors",
                    active ? "bg-primary/5" : "hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn("text-[11px]", getEventTypeBadge(entry.event_type))}>
                          {entry.event_type}
                        </Badge>
                        {entry.resolved_at ? (
                          <Badge variant="success" className="text-[11px]">Resolved</Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-medium text-foreground">
                        {entry.error_message}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.intake_id ? `Intake ${entry.intake_id.slice(0, 8)}` : "No linked intake"} - {formatDate(entry.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full border border-border/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                      {entry.retry_count} retry
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  const detail = (
    <div className="flex h-full min-h-0 flex-col">
      {selectedEntry ? (
        <>
          <div className="shrink-0 border-b border-border/50 px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-foreground">
                  {selectedEntry.event_type}
                </h2>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                  {selectedEntry.event_id}
                </p>
              </div>
              {!selectedEntry.resolved_at ? (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction("retry", selectedEntry.id)}
                    disabled={actionLoading === selectedEntry.id}
                  >
                    <RotateCcw className={cn("mr-1.5 h-3.5 w-3.5", actionLoading === selectedEntry.id && "animate-spin")} />
                    Retry
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAction("resolve", selectedEntry.id)}
                    disabled={actionLoading === selectedEntry.id}
                  >
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                    Mark resolved
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Intake</p>
                <p className="mt-1 break-all font-mono text-xs text-foreground">
                  {selectedEntry.intake_id || "No linked intake"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Created</p>
                <p className="mt-1 text-sm text-foreground">{formatDate(selectedEntry.created_at)}</p>
              </div>
            </div>

            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{selectedEntry.error_message}</p>
              </div>
            </div>

            {!selectedEntry.resolved_at ? (
              <div className="space-y-2">
                <label htmlFor="webhook-resolution-notes" className="text-xs font-medium text-muted-foreground">
                  Resolution notes
                </label>
                <Input
                  id="webhook-resolution-notes"
                  value={resolveNotes}
                  onChange={(event) => setResolveNotes(event.target.value)}
                  placeholder="Optional internal note"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-success-border bg-success-light p-3 text-sm">
                <p className="font-medium text-success">Resolved {formatDate(selectedEntry.resolved_at)}</p>
                {selectedEntry.resolution_notes ? (
                  <p className="mt-1 text-muted-foreground">{selectedEntry.resolution_notes}</p>
                ) : null}
              </div>
            )}

            <details className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                Payload
              </summary>
              <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-background p-3 text-xs">
                {JSON.stringify(selectedEntry.payload, null, 2)}
              </pre>
            </details>
          </div>
        </>
      ) : (
        <div className="flex h-full min-h-48 flex-col items-center justify-center px-6 text-center">
          <CheckCircle className="h-8 w-8 text-success" />
          <p className="mt-3 text-sm font-medium text-foreground">Nothing to inspect</p>
          <p className="mt-1 text-xs text-muted-foreground">Webhook failures will appear in the list.</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {counts.unresolved > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-warning-border bg-warning-light px-4 py-3 text-sm">
          <p className="text-warning">Clear open payment webhook failures before closing the shift.</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleAction("resolve_all")}
            disabled={actionLoading === "resolve_all"}
          >
            Resolve all
          </Button>
        </div>
      )}
      <OperatorSplitPane list={list} detail={detail} />
    </div>
  )
}
