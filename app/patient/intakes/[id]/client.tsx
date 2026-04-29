"use client"

import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Download,
  FileText,
  HelpCircle,
  Link2,
  Mail,
  RefreshCw,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { cancelIntake } from "@/app/actions/cancel-intake"
import { requestDateCorrection } from "@/app/actions/request-date-correction"
import { resendCertificate } from "@/app/actions/resend-certificate"
import { resendVerificationEmail } from "@/app/actions/resend-verification"
import { DashboardCard } from "@/components/dashboard"
import {
  CertificateCredentials,
  CrossSellCard,
  DocumentReadyReveal,
  EmailVerificationGate,
  IntakeStatusListener,
  IntakeStatusTracker,
  SendToEmployerDialog,
} from "@/components/patient"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Heading } from "@/components/ui/heading"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { capture } from "@/lib/analytics/capture"
import type { IntakeStatus } from "@/lib/data/intake-lifecycle"
import { INTAKE_STATUS, type IntakeStatus as StatusKey } from "@/lib/data/status"
import { formatIntakeStatus } from "@/lib/format/intake"
import { COPY } from "@/lib/microcopy/universal"
import { retryPaymentForIntakeAction } from "@/lib/stripe/checkout"
import { cn } from "@/lib/utils"
import type { GeneratedDocument, IntakeDocument, IntakeWithPatient } from "@/types/db"

interface IntakeDetailClientProps {
  intake: IntakeWithPatient
  document?: GeneratedDocument | null
  intakeDocument?: IntakeDocument | null
  retryPayment?: boolean
  isEmailVerified?: boolean
  userEmail?: string
}

// ─── Submitted answer helpers ──────────────────────────────────────────────

function formatFieldValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (Array.isArray(value)) return value.join(", ")
  if (typeof value === "object") return null
  return String(value)
}

function SubmittedAnswers({
  answers,
  serviceType,
}: {
  answers: Record<string, unknown>
  serviceType: string
}) {
  const medCertFields = [
    { keys: ["certificate_type", "cert_type"], label: "Certificate Type" },
    { keys: ["duration", "duration_days", "duration_requested"], label: "Duration (days)" },
    { keys: ["start_date", "specific_date_from"], label: "Start Date" },
    { keys: ["symptoms"], label: "Symptoms" },
    { keys: ["symptom_details", "other_symptom_details"], label: "Symptom Details" },
    { keys: ["symptom_duration"], label: "Symptom Duration" },
    { keys: ["employer_name"], label: "Employer Name" },
  ]

  const scriptFields = [
    { keys: ["medication_name", "medication_display"], label: "Medication" },
    { keys: ["medication_dosage", "dosage"], label: "Dosage" },
    { keys: ["last_prescribed"], label: "Last Prescribed" },
    { keys: ["pharmacy_preference"], label: "Preferred Pharmacy" },
    { keys: ["is_repeat"], label: "Repeat Prescription" },
  ]

  const consultFields = [
    { keys: ["consult_reason", "primary_concern", "concern"], label: "Reason for Consultation" },
  ]

  const isMedCert =
    serviceType.toLowerCase().includes("cert") || answers.certificate_type || answers.cert_type
  const isScript =
    serviceType.toLowerCase().includes("script") ||
    serviceType.toLowerCase().includes("prescription") ||
    answers.medication_name
  const isConsult =
    serviceType.toLowerCase().includes("consult") || answers.consult_reason

  type DisplayField = { keys: string[]; label: string }
  const displayFields: DisplayField[] = isMedCert
    ? medCertFields
    : isScript
      ? scriptFields
      : isConsult
        ? consultFields
        : []

  const orderedEntries: Array<{ key: string; label: string; value: string }> = []

  for (const field of displayFields) {
    const keys = field.keys
    let value: unknown
    for (const k of keys) {
      value = (answers as Record<string, unknown>)[k]
      if (value !== undefined && value !== null) break
    }
    const formatted = formatFieldValue(value)
    if (formatted) {
      const displayValue =
        field.label === "Symptom Duration" && typeof formatted === "string"
          ? formatted.replace(/_/g, "-").replace(/-days?$/i, " days")
          : formatted
      orderedEntries.push({ key: keys[0], label: field.label, value: displayValue })
    }
  }

  if (orderedEntries.length === 0) {
    return <p className="text-sm text-muted-foreground">No details available.</p>
  }

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 divide-y divide-border overflow-hidden">
      {orderedEntries.map(({ key, label, value }) => (
        <div
          key={key}
          className="flex flex-col sm:flex-row sm:justify-between sm:items-center px-6 py-4 text-sm gap-1"
        >
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium sm:text-right sm:max-w-[60%]">{value}</span>
        </div>
      ))}
    </div>
  )
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
}

function TimelineEntry({
  icon: Icon,
  label,
  date,
  color = "text-muted-foreground",
}: {
  icon: React.ElementType
  label: string
  date: string
  color?: string
}) {
  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <Icon className={`h-4 w-4 shrink-0 ${color}`} aria-hidden="true" />
      <span className="text-muted-foreground">{label}:</span>
      <time dateTime={date}>
        {new Date(date).toLocaleDateString("en-AU", DATE_FORMAT)}
      </time>
    </li>
  )
}

function CopyVerifyLinkButton({ verificationCode }: { verificationCode: string }) {
  const [copied, setCopied] = useState(false)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"
  const url = `${baseUrl}/verify?code=${encodeURIComponent(verificationCode)}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      capture("verification_link_copied", { code: verificationCode })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.createElement("input")
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Button
      variant="outline"
      size="default"
      className="gap-2"
      onClick={handleCopy}
      aria-label={
        copied ? "Verification link copied to clipboard" : "Copy verification link to clipboard"
      }
      aria-live="polite"
      aria-atomic="true"
    >
      {copied ? (
        <Check className="h-4 w-4 text-success" aria-hidden="true" />
      ) : (
        <Link2 className="h-4 w-4" aria-hidden="true" />
      )}
      {copied ? "Copied!" : "Copy Verify Link"}
    </Button>
  )
}

// ─── Main client ───────────────────────────────────────────────────────────

export function IntakeDetailClient({
  intake: initialIntake,
  document,
  intakeDocument,
  isEmailVerified = true,
  userEmail,
}: IntakeDetailClientProps) {
  const router = useRouter()
  const [intake, setIntake] = useState(initialIntake)
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)
  const [resendSuccess, setResendSuccess] = useState(false)

  const service = intake.service as { name?: string; short_name?: string; type?: string } | undefined
  const isMedCert = (service?.type || "").toLowerCase().includes("cert")

  const handleStatusChange = (newStatus: IntakeStatus) => {
    setIntake((prev) => ({ ...prev, status: newStatus }))
    router.refresh()
  }

  const handleCancel = () => {
    setActionError(null)
    startTransition(async () => {
      const result = await cancelIntake(intake.id)
      if (!result.success) {
        setActionError(result.error || "Failed to cancel request")
      } else {
        router.refresh()
      }
    })
  }

  const handleResendEmail = () => {
    setActionError(null)
    setResendSuccess(false)
    startTransition(async () => {
      const result = await resendCertificate(intake.id)
      if (!result.success) {
        setActionError(result.error || "Failed to resend email")
      } else {
        setResendSuccess(true)
        setTimeout(() => setResendSuccess(false), 5000)
      }
    })
  }

  const handleRetryPayment = () => {
    setActionError(null)
    startTransition(async () => {
      const result = await retryPaymentForIntakeAction(intake.id)
      if (!result.success) {
        setActionError(result.error || "Failed to create checkout session")
      } else if (!result.checkoutUrl) {
        setActionError("No checkout URL received. Please try again.")
      } else {
        window.location.href = result.checkoutUrl
      }
    })
  }

  const [showDateCorrection, setShowDateCorrection] = useState(false)
  const [correctionStartDate, setCorrectionStartDate] = useState("")
  const [correctionEndDate, setCorrectionEndDate] = useState("")
  const [correctionReason, setCorrectionReason] = useState("")
  const [correctionSubmitted, setCorrectionSubmitted] = useState(false)

  const handleRequestDateCorrection = () => {
    setActionError(null)
    startTransition(async () => {
      const result = await requestDateCorrection({
        intakeId: intake.id,
        requestedStartDate: correctionStartDate,
        requestedEndDate: correctionEndDate,
        reason: correctionReason,
      })
      if (!result.success) {
        setActionError(result.error || "Failed to submit correction request")
      } else {
        setCorrectionSubmitted(true)
        setShowDateCorrection(false)
      }
    })
  }

  const canCancel = ["draft", "pending_payment", "checkout_failed"].includes(intake.status)
  const canResend = ["approved", "completed"].includes(intake.status) && intakeDocument
  const canRequestCorrection =
    ["approved", "completed"].includes(intake.status) && isMedCert && !correctionSubmitted

  const isReady =
    (intake.status === "approved" || intake.status === "completed") && document?.pdf_url
  const showSubmittedAnswers =
    intake.answers && intake.answers.length > 0 && intake.answers[0]?.answers
  const showSupportLink = intake.status === "declined" || intake.status === "pending_info"
  const showLiveTracker = ["paid", "in_review", "pending_info"].includes(intake.status)

  const getStatusIcon = (status: string) => {
    const config = INTAKE_STATUS[status as StatusKey]
    if (config) {
      const Icon = config.icon
      return <Icon className="h-5 w-5" />
    }
    return <Clock className="h-5 w-5 text-info" />
  }

  const getStatusColor = (status: string) => {
    const config = INTAKE_STATUS[status as StatusKey]
    return config?.color ?? "bg-muted text-muted-foreground"
  }

  return (
    <div className="space-y-6">
      <IntakeStatusListener intakeId={intake.id} currentStatus={intake.status} />

      <Button variant="ghost" asChild className="-ml-3">
        <Link href="/patient">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to dashboard
        </Link>
      </Button>

      {/* ─── Card 1 · Request status ───────────────────────────────────── */}
      <DashboardCard tier="elevated" padding="lg" className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
            <Heading level="h2" as="h1" className="!text-xl sm:!text-2xl">
              {service?.name || service?.short_name || "Request"}
            </Heading>
          </div>
          <Badge className={cn("shrink-0", getStatusColor(intake.status))}>
            {getStatusIcon(intake.status)}
            <span className="ml-1">{formatIntakeStatus(intake.status)}</span>
          </Badge>
        </div>

        {/* Pending payment retry */}
        {intake.status === "pending_payment" && (
          <div className="rounded-xl border border-warning-border bg-warning-light/40 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="rounded-full bg-warning-light p-3 shrink-0">
                <AlertCircle className="h-6 w-6 text-warning" />
              </div>
              <div className="flex-1 space-y-3 min-w-0">
                <div>
                  <h3 className="text-base font-semibold text-warning">Payment required</h3>
                  <p className="text-sm text-muted-foreground">
                    Your request is saved but hasn&apos;t been submitted yet. Complete payment to send it to a doctor for review.
                  </p>
                </div>
                <Button onClick={handleRetryPayment} disabled={isPending} className="w-full sm:w-auto">
                  {isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Complete payment"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Checkout failed retry */}
        {intake.status === "checkout_failed" && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="rounded-full bg-destructive/10 p-3 shrink-0">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1 space-y-3 min-w-0">
                <div>
                  <h3 className="text-base font-semibold text-destructive">
                    Payment didn&apos;t go through
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your information has been saved. Try again with the same or a different card, no need to re-enter your details.
                  </p>
                </div>
                <Button onClick={handleRetryPayment} disabled={isPending} className="w-full sm:w-auto">
                  {isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try payment again
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Status message */}
        <div className="rounded-xl bg-muted/50 p-4">
          {intake.status === "paid" && (
            <div className="text-sm space-y-1">
              <p>Your request has been received and is waiting for doctor review.</p>
              <p className="text-muted-foreground">{COPY.global.slaPendingMessage}</p>
            </div>
          )}
          {intake.status === "in_review" && (
            <div className="text-sm space-y-1">
              <p>A doctor is currently reviewing your request.</p>
              <p className="text-muted-foreground">
                You&apos;ll be notified when a decision has been made.
              </p>
            </div>
          )}
          {intake.status === "approved" && (
            <div className="text-sm text-success space-y-1">
              <p>Your request has been approved.</p>
              {document?.pdf_url ? (
                <p>Download your document below.</p>
              ) : (
                <p className="flex items-center gap-2 text-info">
                  <Clock className="h-4 w-4 motion-safe:animate-pulse" />
                  Your document is being generated. This usually takes a few minutes.
                </p>
              )}
            </div>
          )}
          {intake.status === "declined" && (
            <div className="space-y-2">
              <p className="text-sm text-destructive">
                Unfortunately, your request was declined.
              </p>
              <div className="rounded-xl bg-destructive-light border border-destructive-border p-3">
                <p className="text-sm text-destructive">
                  <strong>Reason:</strong>{" "}
                  {intake.decline_reason_note ||
                    "This request could not be fulfilled via our telehealth service. For your safety, we recommend consulting with your regular doctor who has access to your full medical history."}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                If you have questions, please{" "}
                <Link href="/contact" className="underline hover:text-foreground">
                  contact support
                </Link>
                .
              </p>
            </div>
          )}
          {intake.status === "pending_info" && (
            <p className="text-sm text-warning">
              The doctor needs more information. Please check your messages.
            </p>
          )}
          {intake.status === "awaiting_script" && (
            <p className="text-sm text-info">
              Your prescription has been approved. The doctor is preparing your script. You&apos;ll receive it via email or SMS shortly.
            </p>
          )}
          {intake.status === "completed" && (
            <div className="text-sm text-success space-y-1">
              <p>Your request has been completed.</p>
              {intake.service?.type === "common_scripts" && (
                <p>Your repeat prescription has been issued. You should receive the eScript via SMS shortly.</p>
              )}
              {document?.pdf_url && <p>Download your document below.</p>}
            </div>
          )}
          {intake.status === "cancelled" && (
            <p className="text-sm text-muted-foreground">This request has been cancelled.</p>
          )}
        </div>

        {/* Action error */}
        {actionError && (
          <div
            role="alert"
            className="rounded-xl bg-destructive-light border border-destructive-border p-3 text-sm text-destructive"
          >
            {actionError}
          </div>
        )}

        {/* Resend success */}
        {resendSuccess && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl bg-success-light/30 border border-success-border p-3 text-sm text-success flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
            Certificate has been resent to your email.
          </div>
        )}

        {/* Refund badge */}
        {intake.payment_status === "refunded" && (
          <div className="rounded-xl bg-warning-light/30 border border-warning-border p-3">
            <div className="flex items-center gap-2 text-sm text-warning">
              <RefreshCw className="h-4 w-4" />
              <span>
                <strong>Refund processed</strong> — your payment has been refunded.
              </span>
            </div>
          </div>
        )}

        {/* Live status tracker */}
        {showLiveTracker && (
          <IntakeStatusTracker
            intakeId={intake.id}
            initialStatus={intake.status as IntakeStatus}
            onStatusChange={handleStatusChange}
          />
        )}

        {/* Cancel control */}
        {canCancel && (
          <div className="rounded-xl border border-dashed border-muted-foreground/30 p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Cancel this request?</p>
                <p className="text-xs text-muted-foreground">
                  You can cancel before payment is processed.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isPending}
                className="text-destructive hover:text-destructive hover:bg-destructive-light shrink-0"
              >
                <Ban className="h-4 w-4 mr-2" />
                {isPending ? "Cancelling..." : "Cancel request"}
              </Button>
            </div>
          </div>
        )}

        {/* Support link */}
        {showSupportLink && (
          <div className="rounded-xl bg-muted/30 p-4 flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Need help?</p>
              <p className="text-xs text-muted-foreground">
                If you have questions about your request, our support team is here to help.
              </p>
              <Button variant="link" asChild className="h-auto p-0 mt-1">
                <Link href="/contact">Contact support</Link>
              </Button>
            </div>
          </div>
        )}
      </DashboardCard>

      {/* ─── Card 2 · Document delivery (only for approved/completed) ──── */}
      {isReady && (
        <EmailVerificationGate
          email={userEmail || ""}
          isVerified={isEmailVerified}
          onResendVerification={resendVerificationEmail}
        >
          <DocumentReadyReveal intakeId={intake.id} approvedAt={intake.approved_at}>
            <DashboardCard
              tier="highlighted"
              padding="lg"
              className="border-success-border ring-success/40 dark:ring-success/30 space-y-5"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-success-light p-3 shrink-0">
                  <FileText className="h-6 w-6 text-success" />
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <Heading level="h3" className="!text-base text-success">
                    Your document is ready
                  </Heading>
                  <p className="text-sm text-muted-foreground">
                    Download your {service?.short_name || service?.name || "document"} below.
                  </p>
                </div>
              </div>

              <Button asChild size="lg" className="w-full sm:w-auto">
                <a
                  href={document.pdf_url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  onClick={() =>
                    capture("certificate_downloaded", {
                      intake_id: intake.id,
                      service_type: intake.service?.type,
                    })
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </a>
              </Button>

              <CertificateCredentials
                verificationCode={document?.verification_code}
                referenceId={intake.id.slice(0, 8).toUpperCase()}
              />

              <p className="text-xs text-success">A copy has also been sent to your email.</p>

              <div className="flex flex-wrap gap-2 pt-1">
                {canResend && (
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleResendEmail}
                    disabled={isPending}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {isPending ? "Sending..." : "Resend to email"}
                  </Button>
                )}

                {canRequestCorrection && (
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => setShowDateCorrection(true)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Request date change
                  </Button>
                )}

                {intake.service?.type === "med_certs" && (
                  <>
                    <SendToEmployerDialog
                      intakeId={intake.id}
                      trigger={
                        <Button variant="outline" size="default" className="gap-2">
                          <Mail className="h-4 w-4" />
                          Email to employer
                        </Button>
                      }
                    />
                    {document?.verification_code && (
                      <CopyVerifyLinkButton verificationCode={document.verification_code} />
                    )}
                  </>
                )}
              </div>

              {correctionSubmitted && (
                <p className="text-xs text-warning">
                  Date correction submitted. Your doctor will review and resend the updated certificate.
                </p>
              )}
            </DashboardCard>
          </DocumentReadyReveal>
        </EmailVerificationGate>
      )}

      {/* ─── Cross-sell (after approval) ───────────────────────────────── */}
      {(intake.status === "approved" || intake.status === "completed") && (
        <CrossSellCard serviceType={intake.service?.type} />
      )}

      {/* ─── Card 3 · Submitted information ────────────────────────────── */}
      {showSubmittedAnswers && (
        <DashboardCard tier="standard" padding="lg" className="space-y-4">
          <Heading level="h3">Your submitted information</Heading>
          <SubmittedAnswers
            answers={intake.answers![0]!.answers}
            serviceType={service?.short_name || service?.name || ""}
          />
        </DashboardCard>
      )}

      {/* ─── Card 4 · Timeline + reference ─────────────────────────────── */}
      <DashboardCard tier="standard" padding="lg" className="space-y-4">
        <Heading level="h3" id="intake-timeline-heading">
          Timeline
        </Heading>
        <ol aria-labelledby="intake-timeline-heading" className="space-y-2">
          <TimelineEntry icon={Calendar} label="Submitted" date={intake.created_at} />
          {intake.paid_at && (
            <TimelineEntry
              icon={CheckCircle}
              label="Payment received"
              date={intake.paid_at}
              color="text-success"
            />
          )}
          {intake.approved_at && (
            <TimelineEntry
              icon={CheckCircle}
              label="Approved"
              date={intake.approved_at}
              color="text-success"
            />
          )}
          {intake.declined_at && (
            <TimelineEntry
              icon={XCircle}
              label="Declined"
              date={intake.declined_at}
              color="text-destructive"
            />
          )}
          {intake.cancelled_at && (
            <TimelineEntry icon={Ban} label="Cancelled" date={intake.cancelled_at} />
          )}
        </ol>
        <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">Reference</span>
          <span className="font-mono text-xs font-semibold text-foreground">
            {intake.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
      </DashboardCard>

      {/* Date Correction Dialog */}
      <Dialog open={showDateCorrection} onOpenChange={setShowDateCorrection}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request date change</DialogTitle>
            <DialogDescription>
              Submit your corrected dates below. Your doctor will review and resend an updated certificate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="correction-start-date">Start date</Label>
                <Input
                  id="correction-start-date"
                  type="date"
                  value={correctionStartDate}
                  onChange={(e) => setCorrectionStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="correction-end-date">End date</Label>
                <Input
                  id="correction-end-date"
                  type="date"
                  value={correctionEndDate}
                  onChange={(e) => setCorrectionEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="correction-reason">Reason for change</Label>
              <Textarea
                id="correction-reason"
                placeholder="e.g. I need the certificate for different dates..."
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDateCorrection(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestDateCorrection}
              disabled={
                isPending ||
                !correctionStartDate ||
                !correctionEndDate ||
                !correctionReason.trim()
              }
            >
              {isPending ? "Submitting..." : "Submit request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
