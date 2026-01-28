"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  Eye,
  RotateCcw,
  Trash2,
  Webhook,
} from "lucide-react"
import { toast } from "sonner"
import { ScrollShadow } from "@/components/uix"

interface WebhookEvent {
  id: string
  event_type: string
  status: "pending" | "delivered" | "failed"
  endpoint: string
  payload: Record<string, unknown>
  response_status?: number
  response_body?: string
  attempts: number
  created_at: string
  delivered_at?: string
}

interface DLQItem {
  id: string
  event_type: string
  payload: Record<string, unknown>
  error_message: string
  original_event_id: string
  retry_count: number
  created_at: string
}

interface WebhookStats {
  total: number
  success: number
  failed: number
  pending: number
}

interface WebhookMonitoringClientProps {
  initialEvents: WebhookEvent[]
  initialStats: WebhookStats
  initialDLQ: DLQItem[]
}

export function WebhookMonitoringClient({
  initialEvents,
  initialStats,
  initialDLQ,
}: WebhookMonitoringClientProps) {
  const [events] = useState(initialEvents)
  const [stats] = useState(initialStats)
  const [dlqItems, setDlqItems] = useState(initialDLQ)
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null)
  const [selectedDLQ, setSelectedDLQ] = useState<DLQItem | null>(null)
  const [isRetrying, setIsRetrying] = useState<string | null>(null)

  const handleRetryDLQ = async (item: DLQItem) => {
    setIsRetrying(item.id)
    try {
      const response = await fetch("/api/admin/webhook-dlq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", id: item.id }),
      })
      
      if (response.ok) {
        toast.success("Webhook queued for retry")
        setDlqItems(prev => prev.filter(i => i.id !== item.id))
      } else {
        toast.error("Failed to retry webhook")
      }
    } catch {
      toast.error("Failed to retry webhook")
    } finally {
      setIsRetrying(null)
    }
  }

  const handleDeleteDLQ = async (item: DLQItem) => {
    try {
      const response = await fetch("/api/admin/webhook-dlq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: item.id }),
      })
      
      if (response.ok) {
        toast.success("DLQ item deleted")
        setDlqItems(prev => prev.filter(i => i.id !== item.id))
      } else {
        toast.error("Failed to delete DLQ item")
      }
    } catch {
      toast.error("Failed to delete DLQ item")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "pending":
        return <Clock className="h-4 w-4 text-amber-600" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Delivered</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Webhook className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold text-green-600">{stats.success}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">DLQ Items</p>
                <p className="text-2xl font-bold text-amber-600">{dlqItems.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-600/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
          <TabsTrigger value="dlq" className="relative">
            Dead Letter Queue
            {dlqItems.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {dlqItems.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Events</CardTitle>
              <CardDescription>Last 7 days of webhook deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No webhook events found
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(event.status)}
                            {getStatusBadge(event.status)}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {event.event_type}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {event.endpoint}
                        </TableCell>
                        <TableCell>{event.attempts}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(event.created_at).toLocaleString("en-AU", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEvent(event)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dlq" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dead Letter Queue</CardTitle>
              <CardDescription>
                Failed webhooks that exceeded retry attempts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dlqItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No items in dead letter queue
                      </TableCell>
                    </TableRow>
                  ) : (
                    dlqItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">
                          {item.event_type}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate text-xs text-red-600">
                          {item.error_message}
                        </TableCell>
                        <TableCell>{item.retry_count}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleString("en-AU", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedDLQ(item)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRetryDLQ(item)}
                              disabled={isRetrying === item.id}
                            >
                              {isRetrying === item.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCcw className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDLQ(item)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Webhook Event Details</DialogTitle>
            <DialogDescription>
              {selectedEvent?.event_type}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p>{getStatusBadge(selectedEvent.status)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Attempts</p>
                  <p>{selectedEvent.attempts}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Endpoint</p>
                  <p className="font-mono text-xs break-all">{selectedEvent.endpoint}</p>
                </div>
                {selectedEvent.response_status && (
                  <div>
                    <p className="text-muted-foreground">Response Status</p>
                    <p>{selectedEvent.response_status}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-2">Payload</p>
                <ScrollShadow className="p-3 rounded-lg bg-muted text-xs max-h-[200px]">
                  <pre>{JSON.stringify(selectedEvent.payload, null, 2)}</pre>
                </ScrollShadow>
              </div>
              {selectedEvent.response_body && (
                <div>
                  <p className="text-muted-foreground text-sm mb-2">Response</p>
                  <ScrollShadow className="p-3 rounded-lg bg-muted text-xs max-h-[100px]">
                    <pre>{selectedEvent.response_body}</pre>
                  </ScrollShadow>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DLQ Detail Dialog */}
      <Dialog open={!!selectedDLQ} onOpenChange={() => setSelectedDLQ(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>DLQ Item Details</DialogTitle>
            <DialogDescription>
              {selectedDLQ?.event_type}
            </DialogDescription>
          </DialogHeader>
          {selectedDLQ && (
            <div className="space-y-4">
              <div>
                <p className="text-muted-foreground text-sm">Error Message</p>
                <p className="text-red-600 text-sm mt-1">{selectedDLQ.error_message}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-2">Payload</p>
                <ScrollShadow className="p-3 rounded-lg bg-muted text-xs max-h-[200px]">
                  <pre>{JSON.stringify(selectedDLQ.payload, null, 2)}</pre>
                </ScrollShadow>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleRetryDLQ(selectedDLQ)} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Retry
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDeleteDLQ(selectedDLQ)
                    setSelectedDLQ(null)
                  }}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
