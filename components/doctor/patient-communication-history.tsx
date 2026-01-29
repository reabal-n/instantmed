"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface EmailLog {
  id: string
  email_type: string
  recipient_email: string
  subject: string | null
  status: string
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  bounced_at: string | null
  error_message: string | null
  metadata: Record<string, unknown> | null
}

interface PatientCommunicationHistoryProps {
  emails: EmailLog[]
  patientName?: string
}

const emailTypeLabels: Record<string, string> = {
  med_cert_patient: "Medical Certificate",
  welcome: "Welcome Email",
  verification: "Email Verification",
  password_reset: "Password Reset",
  intake_confirmation: "Request Confirmation",
  intake_approved: "Request Approved",
  intake_declined: "Request Declined",
  needs_more_info: "Information Request",
  reminder: "Reminder",
}

export function PatientCommunicationHistory({ 
  emails, 
  patientName: _patientName 
}: PatientCommunicationHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const displayedEmails = showAll ? emails : emails.slice(0, 5)

  const getStatusIcon = (email: EmailLog) => {
    if (email.bounced_at) {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    if (email.delivered_at) {
      return <CheckCircle className="h-4 w-4 text-emerald-500" />
    }
    if (email.status === "failed") {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
    if (email.sent_at) {
      return <Clock className="h-4 w-4 text-amber-500" />
    }
    return <Clock className="h-4 w-4 text-gray-400" />
  }

  const getStatusBadge = (email: EmailLog) => {
    if (email.bounced_at) {
      return <Badge variant="destructive">Bounced</Badge>
    }
    if (email.opened_at) {
      return <Badge className="bg-emerald-100 text-emerald-700">Opened</Badge>
    }
    if (email.delivered_at) {
      return <Badge className="bg-blue-100 text-blue-700">Delivered</Badge>
    }
    if (email.status === "failed") {
      return <Badge variant="destructive">Failed</Badge>
    }
    if (email.sent_at) {
      return <Badge className="bg-amber-100 text-amber-700">Sent</Badge>
    }
    return <Badge variant="secondary">Pending</Badge>
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (emails.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-5 w-5" />
            Communication History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No emails sent to this patient yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-5 w-5" />
          Communication History
          <Badge variant="secondary" className="ml-2">{emails.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayedEmails.map((email) => (
          <div
            key={email.id}
            className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
          >
            <div 
              className="flex items-start justify-between cursor-pointer"
              onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(email)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {emailTypeLabels[email.email_type] || email.email_type}
                    </span>
                    {getStatusBadge(email)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {email.subject || "No subject"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(email.sent_at) || "Not sent"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {expandedId === email.id ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {expandedId === email.id && (
              <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Recipient:</span>
                    <span className="ml-2">{email.recipient_email}</span>
                  </div>
                  {email.delivered_at && (
                    <div>
                      <span className="text-muted-foreground">Delivered:</span>
                      <span className="ml-2">{formatDate(email.delivered_at)}</span>
                    </div>
                  )}
                  {email.opened_at && (
                    <div>
                      <span className="text-muted-foreground">Opened:</span>
                      <span className="ml-2">{formatDate(email.opened_at)}</span>
                    </div>
                  )}
                  {email.clicked_at && (
                    <div>
                      <span className="text-muted-foreground">Clicked:</span>
                      <span className="ml-2">{formatDate(email.clicked_at)}</span>
                    </div>
                  )}
                </div>

                {email.bounced_at && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-red-700 dark:text-red-300">
                    <span className="font-medium">Bounced:</span> {formatDate(email.bounced_at)}
                    {email.error_message && (
                      <p className="text-xs mt-1">{email.error_message}</p>
                    )}
                  </div>
                )}

                {email.status === "failed" && email.error_message && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-red-700 dark:text-red-300">
                    <span className="font-medium">Error:</span> {email.error_message}
                  </div>
                )}

                {email.metadata && Object.keys(email.metadata).length > 0 && (
                  <details className="text-xs">
                    <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                      View metadata
                    </summary>
                    <pre className="bg-muted p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(email.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        ))}

        {emails.length > 5 && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Show all {emails.length} emails
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
