"use client"

import { useEffect, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton, Snippet } from "@/components/uix"
import {
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Loader2,
  Mail,
  MoreHorizontal,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getFailedEmails, retryEmail, markEmailResolved } from "@/app/actions/email-retry"

interface FailedEmail {
  id: string
  certificateNumber: string
  patientName: string
  patientId: string
  intakeId: string
  failureReason: string | null
  failedAt: string | null
  retryCount: number
  createdAt: string
}

export function EmailQueueClient() {
  const [failures, setFailures] = useState<FailedEmail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [resolveDialog, setResolveDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  })
  const [resolveNote, setResolveNote] = useState("")

  useEffect(() => {
    let mounted = true
    
    async function loadData() {
      const result = await getFailedEmails()
      if (!mounted) return
      
      if (result.success) {
        setFailures(result.failures || [])
      } else {
        setError(result.error || "Failed to load")
      }
      setIsLoading(false)
    }
    
    loadData()
    
    return () => {
      mounted = false
    }
  }, [])

  const loadFailures = async () => {
    setIsLoading(true)
    setError(null)
    const result = await getFailedEmails()
    if (result.success) {
      setFailures(result.failures || [])
    } else {
      setError(result.error || "Failed to load")
    }
    setIsLoading(false)
  }

  const handleRetry = (id: string) => {
    setRetryingId(id)
    startTransition(async () => {
      const result = await retryEmail(id)
      if (result.success) {
        setFailures((prev) => prev.filter((f) => f.id !== id))
      } else {
        setError(result.error || "Retry failed")
      }
      setRetryingId(null)
    })
  }

  const handleMarkResolved = () => {
    if (!resolveDialog.id) return
    
    const id = resolveDialog.id
    startTransition(async () => {
      const result = await markEmailResolved(id, resolveNote)
      if (result.success) {
        setFailures((prev) => prev.filter((f) => f.id !== id))
        setResolveDialog({ open: false, id: null })
        setResolveNote("")
      } else {
        setError(result.error || "Failed to mark resolved")
      }
    })
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Failed Deliveries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Certificate</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Failed At</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Failed Deliveries ({failures.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadFailures} disabled={isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {failures.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
              <p>No failed email deliveries</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certificate</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Failed At</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failures.map((failure) => (
                  <TableRow key={failure.id}>
                    <TableCell>
                      <Snippet symbol="" size="sm" variant="flat" className="bg-transparent">
                        {failure.certificateNumber}
                      </Snippet>
                    </TableCell>
                    <TableCell>{failure.patientName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(failure.failedAt)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-red-600">
                      {failure.failureReason || "Unknown"}
                    </TableCell>
                    <TableCell>{failure.retryCount}/3</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {retryingId === failure.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleRetry(failure.id)}
                            disabled={failure.retryCount >= 3 || isPending}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry Send
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setResolveDialog({ open: true, id: failure.id })}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Resolved
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog
        open={resolveDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setResolveDialog({ open: false, id: null })
            setResolveNote("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Resolved</DialogTitle>
            <DialogDescription>
              Mark this email as manually resolved. Add a note about how it was resolved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution Note</Label>
              <Input
                id="resolution"
                placeholder="e.g., Sent manually via support email"
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveDialog({ open: false, id: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkResolved} disabled={!resolveNote || isPending}>
              {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
