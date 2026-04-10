"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, CheckCircle, RefreshCw, ShieldAlert, Mail } from "lucide-react"
import { clearBounceFlag, getSuppressedEmails, type SuppressedEmail } from "@/app/actions/email-suppression"
import { toast } from "sonner"
import { formatDateTime } from "@/lib/format"

interface EmailSuppressionClientProps {
  initialData: SuppressedEmail[]
  error?: string
}

export function EmailSuppressionClient({ initialData, error }: EmailSuppressionClientProps) {
  const [data, setData] = useState(initialData)
  const [isPending, startTransition] = useTransition()
  const [clearingId, setClearingId] = useState<string | null>(null)

  function handleRefresh() {
    startTransition(async () => {
      const result = await getSuppressedEmails()
      if (result.error) {
        toast.error(result.error)
      } else {
        setData(result.data)
        toast.success("Refreshed")
      }
    })
  }

  function handleClear(profileId: string, email: string) {
    setClearingId(profileId)
    startTransition(async () => {
      const result = await clearBounceFlag(profileId)
      if (result.success) {
        setData((prev) => prev.filter((d) => d.profileId !== profileId))
        toast.success(`Cleared bounce for ${email}`)
      } else {
        toast.error(result.error || "Failed to clear bounce")
      }
      setClearingId(null)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Email Suppression List</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Emails blocked from delivery due to bounces or spam complaints.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Suppressed</CardDescription>
            <CardTitle className="text-3xl">{data.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hard Bounces</CardDescription>
            <CardTitle className="text-3xl">
              {data.filter((d) => d.source === "bounce").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Spam Complaints</CardDescription>
            <CardTitle className="text-3xl">
              {data.filter((d) => d.source === "complaint").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Suppressed Addresses
          </CardTitle>
          <CardDescription>
            Clear a bounce flag to re-enable delivery. Only do this if the recipient has confirmed their mailbox is working.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
              <p className="text-sm font-medium">No suppressed emails</p>
              <p className="text-xs text-muted-foreground mt-1">All recipient addresses are deliverable.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Failures</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.profileId}>
                    <TableCell className="font-mono text-xs">{row.email}</TableCell>
                    <TableCell className="text-sm">{row.fullName || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={row.source === "complaint" ? "destructive" : "secondary"}>
                          {row.source === "complaint" ? (
                            <><AlertTriangle className="h-3 w-3 mr-1" />Complaint</>
                          ) : (
                            <><Mail className="h-3 w-3 mr-1" />Bounce</>
                          )}
                        </Badge>
                        {row.bounceReason && (
                          <span className="text-xs text-muted-foreground max-w-[200px] truncate" title={row.bounceReason}>
                            {row.bounceReason}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{row.deliveryFailures}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.bouncedAt ? formatDateTime(row.bouncedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleClear(row.profileId, row.email)}
                        disabled={isPending || clearingId === row.profileId}
                      >
                        {clearingId === row.profileId ? (
                          <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                        ) : null}
                        Clear
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
