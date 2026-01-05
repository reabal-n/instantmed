"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
  Download,
  CreditCard,
  Printer,
  Mail,
  Loader2,
  Check,
} from "lucide-react"
import { RetryPaymentButton } from "./retry-payment-button"
import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/shared/copy-button"
import { resendCertificateEmailAction } from "@/app/actions/resend-certificate"
import { PDFPreviewInline } from "@/components/ui/pdf-preview"
import { AmendmentForm } from "@/components/patient/amendment-form"
import type { Request, GeneratedDocument } from "@/types/db"
import { formatRequestType } from "@/lib/format-utils"
import posthog from "posthog-js"

interface PatientRequestDetailPageProps {
  request: Request
  document: GeneratedDocument | null
  retryPayment?: boolean
}

export default function PatientRequestDetailPageClient({ 
  request,
  document,
}: PatientRequestDetailPageProps) {
  const [isPending, startTransition] = useTransition()
  const [resendStatus, setResendStatus] = useState<"idle" | "success" | "error">("idle")
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  const handleResendEmail = () => {
    setResendStatus("idle")
    setResendMessage(null)
    startTransition(async () => {
      const result = await resendCertificateEmailAction(request.id)
      if (result.success) {
        setResendStatus("success")
        setResendMessage(`Email sent! ${result.remainingResends} resends remaining today.`)
      } else {
        setResendStatus("error")
        setResendMessage(result.error || "Failed to send email")
      }
    })
  }

  const isPendingPayment = request.payment_status === "pending_payment"

  const getStatusConfig = (status: string, paymentStatus?: string) => {
    if (paymentStatus === "pending_payment") {
      return {
        badge: (
          <Badge className="bg-orange-100/80 text-orange-700 border-0 font-medium px-3 py-1 gap-1">
            <CreditCard className="h-3 w-3" />
            Payment needed
          </Badge>
        ),
        icon: CreditCard,
        color: "text-orange-500",
        bgColor: "bg-orange-500",
      }
    }

    switch (status) {
      case "pending":
        return {
          badge: (
            <Badge className="bg-amber-100/80 text-amber-700 border-0 font-medium px-3 py-1">In review by doctor</Badge>
          ),
          icon: Clock,
          color: "text-amber-500",
          bgColor: "bg-amber-500",
        }
      case "approved":
        return {
          badge: <Badge className="bg-emerald-100/80 text-emerald-700 border-0 font-medium px-3 py-1">Completed</Badge>,
          icon: CheckCircle2,
          color: "text-emerald-500",
          bgColor: "bg-emerald-500",
        }
      case "declined":
        return {
          badge: <Badge className="bg-red-100/80 text-red-700 border-0 font-medium px-3 py-1">Unable to approve</Badge>,
          icon: XCircle,
          color: "text-red-500",
          bgColor: "bg-red-500",
        }
      case "needs_follow_up":
        return {
          badge: (
            <Badge className="bg-blue-100/80 text-primary border-0 font-medium px-3 py-1">More info needed</Badge>
          ),
          icon: AlertCircle,
          color: "text-blue-500",
          bgColor: "bg-primary",
        }
      default:
        return {
          badge: <Badge variant="secondary">Unknown</Badge>,
          icon: Clock,
          color: "text-gray-500",
          bgColor: "bg-gray-500",
        }
    }
  }

  const statusConfig = getStatusConfig(request.status, (request as { payment_status?: string }).payment_status)
  const StatusIcon = statusConfig.icon

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Calculate estimated time remaining for pending requests
  const getEstimatedTime = () => {
    if (request.status !== "pending") return null
    
    const created = new Date(request.created_at)
    const now = new Date()
    const hoursSinceCreated = (now.getTime() - created.getTime()) / (1000 * 60 * 60)
    const currentHour = now.getHours()
    
    // Operating hours: 8am-10pm AEST
    const isWithinOperatingHours = currentHour >= 8 && currentHour < 22
    
    if (hoursSinceCreated < 1) {
      return { text: "Usually within 1 hour", urgent: false }
    } else if (hoursSinceCreated < 2) {
      return { text: "Should be reviewed soon", urgent: false }
    } else if (!isWithinOperatingHours) {
      // Calculate when operating hours resume
      const hoursUntilOpen = currentHour >= 22 ? (24 - currentHour + 8) : (8 - currentHour)
      return { text: `Doctors available in ~${hoursUntilOpen} hours (8am AEST)`, urgent: false }
    } else {
      return { text: "Being reviewed - check back shortly", urgent: true }
    }
  }

  const estimatedTime = getEstimatedTime()

  // Timeline steps
  const timelineSteps = isPendingPayment
    ? [
        { label: "Request created", completed: true, date: request.created_at },
        { label: "Awaiting payment", completed: false, date: null },
        { label: "Doctor review", completed: false, date: null },
      ]
    : [
        { label: "Submitted securely", completed: true, date: request.created_at },
        {
          label: "Doctor reviewing",
          completed: request.status !== "pending",
          date: request.status !== "pending" ? request.updated_at : null,
        },
        {
          label:
            request.status === "approved"
              ? "Document ready"
              : request.status === "declined"
                ? "Unable to approve"
                : "Awaiting decision",
          completed: ["approved", "declined"].includes(request.status),
          date: ["approved", "declined"].includes(request.status) ? request.updated_at : null,
        },
        ...(request.status === "approved" && document
          ? [{ label: "Available for download", completed: true, date: document.created_at }]
          : []),
      ]

  const isPathologyDocument = document && document.type === "referral" && document.subtype?.startsWith("pathology_")
  const isMedCertDocument = document && document.type === "med_cert"

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-muted-foreground hover:text-foreground rounded-lg -ml-2"
        >
          <Link href="/patient/requests">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to requests
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{formatRequestType(request.type)}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Submitted {formatDate(request.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusConfig.badge}
          {/* Added reference ID copy button */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-white/50 rounded-lg px-2 py-1">
            <span>Ref: {request.id.slice(0, 8)}</span>
            <CopyButton value={request.id} className="h-6 w-6" />
          </div>
        </div>
      </div>

      {isPendingPayment && (
        <div
          className="glass-card rounded-2xl p-6 border-2 border-orange-300/50 bg-orange-50/50 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.18s", animationFillMode: "forwards" }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100">
                <CreditCard className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Complete payment to submit</h3>
                <p className="text-sm text-muted-foreground">
                  Your answers are saved. Once paid, a doctor will review your request.
                </p>
              </div>
            </div>
            <RetryPaymentButton requestId={request.id} />
          </div>
        </div>
      )}

      {/* Estimated Time for Pending Requests */}
      {estimatedTime && request.status === "pending" && (
        <div
          className="glass-card rounded-2xl p-6 border-2 border-violet-200/50 bg-violet-50/30 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.18s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100">
              <Clock className={cn("h-6 w-6 text-violet-600", estimatedTime.urgent && "animate-pulse")} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Estimated review time</h3>
              <p className="text-sm text-muted-foreground">{estimatedTime.text}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Doctors available 8am–10pm AEST, 7 days a week
              </p>
            </div>
          </div>
        </div>
      )}

      {request.status === "approved" && document && (
        <div
          className="glass-card rounded-2xl p-6 border-2 border-[#2563EB]/30 bg-[#2563EB]/5 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.18s", animationFillMode: "forwards" }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/20">
                <FileText className="h-6 w-6 text-[#2563EB]" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {isPathologyDocument
                    ? "Your pathology/imaging form is ready!"
                    : isMedCertDocument
                      ? "Your certificate is ready!"
                      : "Your document is ready!"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isPathologyDocument
                    ? "Click below to download your pathology/imaging request form PDF"
                    : isMedCertDocument
                      ? "Click below to download your medical certificate PDF"
                      : "Click below to download your document PDF"}
                </p>
              </div>
            </div>
            {/* Download, Print, and Resend buttons */}
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <div className="flex gap-2">
                <Button asChild className="rounded-xl btn-glow flex-1 sm:flex-none">
                  <a
                    href={`/api/patient/documents/${request.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      // Track document download in PostHog
                      posthog.capture('document_downloaded', {
                        request_id: request.id,
                        request_type: request.type,
                        document_type: document?.type,
                        document_subtype: document?.subtype,
                      })
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl bg-transparent"
                  onClick={() => {
                    window.open(`/api/patient/documents/${request.id}/download`, "_blank")
                  }}
                  asChild
                >
                  <a
                    href={`/api/patient/documents/${request.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Printer className="h-4 w-4" />
                    <span className="sr-only">Print</span>
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl bg-transparent"
                  onClick={handleResendEmail}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : resendStatus === "success" ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  <span className="sr-only">Resend to email</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {resendMessage ? (
                  <span className={resendStatus === "success" ? "text-green-600" : "text-red-600"}>
                    {resendMessage}
                  </span>
                ) : (
                  "You can resend up to 3 times per day"
                )}
              </p>
            </div>
          </div>
          {/* Inline PDF Preview */}
          <div className="mt-4">
            <PDFPreviewInline url={document.pdf_url} className="max-w-sm mx-auto" />
          </div>
        </div>
      )}

      {/* Amendment Form - only for pending requests */}
      {request.status === "pending" && request.payment_status !== "pending_payment" && (
        <div
          className="animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.19s", animationFillMode: "forwards" }}
        >
          <AmendmentForm requestId={request.id} canAmend={true} />
        </div>
      )}

      {/* Status Timeline */}
      <div
        className="glass-card rounded-2xl p-6 animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
      >
        <h2 className="text-lg font-semibold text-foreground mb-6">Request Timeline</h2>
        <div className="relative">
          {timelineSteps.map((step, index) => (
            <div key={index} className="flex gap-4 pb-6 last:pb-0">
              {/* Line */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                    step.completed ? "border-[#2563EB] bg-[#2563EB]" : "border-[#0A0F1C]/20 bg-white",
                  )}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-[#0A0F1C]" />
                  ) : (
                    <Clock className="h-4 w-4 text-[#0A0F1C]/30" />
                  )}
                </div>
                {index < timelineSteps.length - 1 && (
                  <div className={cn("w-0.5 flex-1 mt-2", step.completed ? "bg-[#2563EB]" : "bg-[#0A0F1C]/10")} />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 pb-2">
                <p className={cn("font-medium", step.completed ? "text-foreground" : "text-muted-foreground")}>
                  {step.label}
                </p>
                {step.date && <p className="text-xs text-muted-foreground mt-0.5">{formatDate(step.date)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Request details card */}
      <div
        className="glass-card rounded-2xl p-6 animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.25s", animationFillMode: "forwards" }}
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">Request Details</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Request Type</p>
              <p className="text-sm text-muted-foreground">{formatRequestType(request.type)}</p>
            </div>
          </div>
          {request.category && (
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Category</p>
                <p className="text-sm text-muted-foreground capitalize">{request.category.replace("_", " ")}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Last Updated</p>
              <p className="text-sm text-muted-foreground">{formatDate(request.updated_at)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status message card */}
      <div
        className="glass-card rounded-2xl p-6 animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              statusConfig.color.replace("text-", "bg-") + "/10",
            )}
          >
            <StatusIcon className={cn("h-6 w-6", statusConfig.color)} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">What happens next</h2>
            {isPendingPayment && (
              <p className="text-sm text-muted-foreground">
                Your request is saved but hasn&apos;t been submitted yet. Complete payment above and a registered doctor will
                review your information — usually within 1 hour (8am–10pm AEST).
              </p>
            )}
            {!isPendingPayment && request.status === "pending" && (
              <p className="text-sm text-muted-foreground">
                Your request has been securely sent to a registered doctor. Most reviews are completed within 1 hour
                (8am–10pm AEST). We&apos;ll email you as soon as there&apos;s an update.
              </p>
            )}
            {request.status === "approved" && (
              <p className="text-sm text-muted-foreground">
                Good news — your document is ready. You can download it above. If you requested a prescription, your
                eScript has been sent to your email and phone.
              </p>
            )}
            {request.status === "declined" && (
              <p className="text-sm text-muted-foreground">
                The doctor wasn&apos;t able to approve this request. This can happen when more information is needed or an
                in-person visit is recommended. Please check your email for the doctor&apos;s notes and next steps.
              </p>
            )}
            {request.status === "needs_follow_up" && (
              <p className="text-sm text-muted-foreground">
                The doctor needs a bit more information before making a decision. Please check your email for details on
                what&apos;s needed — it&apos;s usually something quick to provide.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Help card */}
      <div
        className="glass-card rounded-2xl p-6 animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.35s", animationFillMode: "forwards" }}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/10">
            <MessageSquare className="h-6 w-6 text-[#2563EB]" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Need help?</h3>
            <p className="text-sm text-muted-foreground">Questions about your request? We&apos;re here to help.</p>
          </div>
          <Button variant="outline" asChild className="rounded-full shrink-0 bg-transparent">
            <Link href="/contact">Contact Us</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
