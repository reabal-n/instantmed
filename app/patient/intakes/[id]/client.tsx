"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ArrowLeft,
  FileText,
  Calendar,
} from "lucide-react"
import { formatIntakeStatus } from "@/lib/format-intake"
import type { IntakeWithPatient } from "@/types/db"

interface IntakeDetailClientProps {
  intake: IntakeWithPatient
  retryPayment?: boolean
}

export function IntakeDetailClient({ intake }: IntakeDetailClientProps) {
  const service = intake.service as { name?: string; short_name?: string } | undefined
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-emerald-500" />
      case "declined":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "pending_info":
        return <AlertCircle className="h-5 w-5 text-amber-500" />
      default:
        return <Clock className="h-5 w-5 text-blue-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-100 text-emerald-800"
      case "declined":
        return "bg-red-100 text-red-800"
      case "pending_info":
        return "bg-amber-100 text-amber-800"
      case "paid":
      case "in_review":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/patient">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to dashboard
        </Link>
      </Button>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {service?.name || service?.short_name || "Request"}
            </CardTitle>
            <Badge className={getStatusColor(intake.status)}>
              {getStatusIcon(intake.status)}
              <span className="ml-1">{formatIntakeStatus(intake.status)}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Message */}
          <div className="p-4 rounded-lg bg-muted/50">
            {intake.status === "paid" && (
              <p className="text-sm">
                Your request has been received and is waiting for doctor review. 
                You&apos;ll be notified when it&apos;s been processed.
              </p>
            )}
            {intake.status === "in_review" && (
              <p className="text-sm">
                A doctor is currently reviewing your request. 
                You&apos;ll be notified when a decision has been made.
              </p>
            )}
            {intake.status === "approved" && (
              <p className="text-sm text-emerald-700">
                Your request has been approved. Check your email for your documents.
              </p>
            )}
            {intake.status === "declined" && (
              <p className="text-sm text-red-700">
                Unfortunately, your request was declined. Please check your email for more information.
              </p>
            )}
            {intake.status === "pending_info" && (
              <p className="text-sm text-amber-700">
                The doctor needs more information. Please check your messages.
              </p>
            )}
          </div>

          {/* Timeline */}
          <div>
            <h3 className="font-medium mb-3">Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Submitted:</span>
                <span>{new Date(intake.created_at).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}</span>
              </div>
              {intake.paid_at && (
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-muted-foreground">Payment received:</span>
                  <span>{new Date(intake.paid_at).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}</span>
                </div>
              )}
              {intake.approved_at && (
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-muted-foreground">Approved:</span>
                  <span>{new Date(intake.approved_at).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Reference */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Reference: {intake.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
