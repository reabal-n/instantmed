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
  ed_approved: "ED Consult Approved",
  hair_loss_approved: "Hair Loss Consult Approved",
  womens_health_approved: "Women's Health Approved",
  weight_loss_approved: "Weight Loss Consult Approved",
  script_sent: "Script Sent",
  repeat_script_approved: "Repeat Script Approved",
}

function getEmailTypeLabel(type: string): string {
  if (emailTypeLabels[type]) return emailTypeLabels[type]
  // Fallback: replace underscores with spaces and title-case each word
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function PatientCommunicationHistory({ 
  emails, 
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
    return <Clock className="h-4 w-4 text-muted-foreground/60" />
  }

  const getStatusBadge = (email: EmailLog) => {
    if (email.bounced_at) {
      return <Badge variant="destructive">Bounced</Badge>
    }
    if (email.opened_at) {
      return <Badge className="bg-success-light text-success border-success-border">Opened</Badge>
    }
    if (email.delivered_at) {
      return <Badge className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20">Delivered</Badge>
    }
    if (email.status === "failed") {
      return <Badge variant="destructive">Failed</Badge>
    }
    if (email.sent_at) {
      return <Badge className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20">Sent</Badge>
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
            className="border border-border/50 rounded-xl p-4 hover:bg-muted/50 transition-colors"
          >
            <div 
              role="button"
              tabIndex={0}
              aria-expanded={expandedId === email.id}
              className="flex items-start justify-between cursor-pointer"
              onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setExpandedId(expandedId === email.id ? null : email.id)
                }
              }}
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(email)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {getEmailTypeLabel(email.email_type)}
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
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" aria-label={expandedId === email.id ? "Collapse details" : "Expand details"}>
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
                  <div className="bg-destructive-light p-3 rounded-lg border border-destructive-border text-destructive">
                    <span className="font-medium">Bounced:</span> {formatDate(email.bounced_at)}
                    {email.error_message && (
                      <p className="text-xs mt-1">{email.error_message}</p>
                    )}
                  </div>
                )}

                {email.status === "failed" && email.error_message && (
                  <div className="bg-destructive-light p-3 rounded-lg border border-destructive-border text-destructive">
                    <span className="font-medium">Error:</span> {email.error_message}
                  </div>
                )}

                {email.metadata && Object.keys(email.metadata).length > 0 && (
                  <details className="text-xs">
                    <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                      View metadata
                    </summary>
                    <pre className="bg-muted/40 p-3 rounded-lg border border-border/30 mt-1 overflow-x-auto font-mono text-xs">
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
