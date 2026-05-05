"use client"

import {
  AlertTriangle,
  CheckCircle,
  Mail,
  RefreshCw,
  ShieldAlert,
} from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import {
  clearBounceFlag,
  getSuppressedEmails,
  type SuppressedEmail,
} from "@/app/actions/email-suppression"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Heading } from "@/components/ui/heading"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/format"

interface EmailSuppressionClientProps {
  initialData: SuppressedEmail[]
  error?: string
}

export function EmailSuppressionClient({
  initialData,
  error,
}: EmailSuppressionClientProps) {
  const [data, setData] = useState(initialData)
  const [isPending, startTransition] = useTransition()
  const [clearingId, setClearingId] = useState<string | null>(null)

  function handleRefresh() {
    startTransition(async () => {
      const result = await getSuppressedEmails()
      if (result.error) {
        toast.error(result.error)
        return
      }

      setData(result.data)
      toast.success("Refreshed")
    })
  }

  function handleClear(profileId: string, email: string) {
    setClearingId(profileId)
    startTransition(async () => {
      const result = await clearBounceFlag(profileId)
      if (result.success) {
        setData((prev) => prev.filter((row) => row.profileId !== profileId))
        toast.success(`Cleared bounce for ${email}`)
      } else {
        toast.error(result.error || "Failed to clear bounce")
      }

      setClearingId(null)
    })
  }

  const hardBounces = data.filter((row) => row.source === "bounce").length
  const complaints = data.filter((row) => row.source === "complaint").length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Heading level="h2" className="!text-xl">
            Suppression
          </Heading>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Addresses blocked from patient email delivery after bounces or spam complaints.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isPending}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
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
            <CardTitle className="text-3xl">{hardBounces}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Spam Complaints</CardDescription>
            <CardTitle className="text-3xl">{complaints}</CardTitle>
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
            Clear a bounce flag only after the recipient confirms their mailbox is working.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="mb-3 h-12 w-12 text-green-500" />
              <p className="text-sm font-medium">No suppressed emails</p>
              <p className="mt-1 text-xs text-muted-foreground">
                All recipient addresses are deliverable.
              </p>
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
                    <TableCell className="text-sm">
                      {row.fullName || "No patient"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={row.source === "complaint" ? "destructive" : "secondary"}
                        >
                          {row.source === "complaint" ? (
                            <>
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Complaint
                            </>
                          ) : (
                            <>
                              <Mail className="mr-1 h-3 w-3" />
                              Bounce
                            </>
                          )}
                        </Badge>
                        {row.bounceReason && (
                          <span
                            className="max-w-[200px] truncate text-xs text-muted-foreground"
                            title={row.bounceReason}
                          >
                            {row.bounceReason}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{row.deliveryFailures}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.bouncedAt ? formatDateTime(row.bouncedAt) : "Unknown"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleClear(row.profileId, row.email)}
                        disabled={isPending || clearingId === row.profileId}
                      >
                        {clearingId === row.profileId ? (
                          <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
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
