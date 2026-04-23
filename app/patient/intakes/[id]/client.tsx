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
  Shield,
  XCircle, 
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { cancelIntake } from "@/app/actions/cancel-intake"
import { requestDateCorrection } from "@/app/actions/request-date-correction"
import { resendCertificate } from "@/app/actions/resend-certificate"
import { resendVerificationEmail } from "@/app/actions/resend-verification"
import { CrossSellCard, DocumentReadyReveal, EmailVerificationGate, IntakeStatusListener,IntakeStatusTracker, SendToEmployerDialog } from "@/components/patient"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import { capture } from "@/lib/analytics/capture"
import type { IntakeStatus } from "@/lib/data/intake-lifecycle"
import { INTAKE_STATUS, type IntakeStatus as StatusKey } from "@/lib/data/status"
import { formatIntakeStatus } from "@/lib/format/intake"
import { COPY } from "@/lib/microcopy/universal"
import { retryPaymentForIntakeAction } from "@/lib/stripe/checkout"
import type { GeneratedDocument, IntakeDocument,IntakeWithPatient } from "@/types/db"

interface IntakeDetailClientProps {
  intake: IntakeWithPatient
  document?: GeneratedDocument | null
  intakeDocument?: IntakeDocument | null
  retryPayment?: boolean
  isEmailVerified?: boolean
  userEmail?: string
}

/**
 * Format field value for display
 */
function formatFieldValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (Array.isArray(value)) return value.join(", ")
  if (typeof value === "object") return null // Skip nested objects
  return String(value)
}

/**
 * Component to display submitted answers to patients
 * Filters out internal/sensitive fields and formats for readability
 */
function SubmittedAnswers({
  answers,
  serviceType,
}: {
  answers: Record<string, unknown>
  serviceType: string
}) {
  // Field display order - curated list only (no "remaining fields" to avoid duplicates/irrelevant info)
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

  // Determine which fields to show based on service type
  const isMedCert = serviceType.toLowerCase().includes("cert") || answers.certificate_type || answers.cert_type
  const isScript = serviceType.toLowerCase().includes("script") || serviceType.toLowerCase().includes("prescription") || answers.medication_name
  const isConsult = serviceType.toLowerCase().includes("consult") || answers.consult_reason

  type DisplayField = { keys: string[]; label: string }
  const displayFields: DisplayField[] = isMedCert ? medCertFields : isScript ? scriptFields : isConsult ? consultFields : []

  // Build entries from curated fields only (no "remaining" - avoids duplicates and irrelevant consent/terms)
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
      // Human-readable symptom duration (e.g. 1_2_days → 1-2 days)
      const displayValue = field.label === "Symptom Duration" && typeof formatted === "string"
        ? formatted.replace(/_/g, "-").replace(/-days?$/i, " days")
        : formatted
      orderedEntries.push({ key: keys[0], label: field.label, value: displayValue })
    }
  }

  if (orderedEntries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No details available.</p>
    )
  }

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 divide-y divide-border overflow-hidden">
      {orderedEntries.map(({ key, label, value }) => (
        <div key={key} className="flex flex-col sm:flex-row sm:justify-between sm:items-center px-6 py-4 text-sm gap-1">
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
    <div className="flex items-center gap-3 py-2 text-sm">
      <Icon className={`h-4 w-4 shrink-0 ${color}`} />
      <span className="text-muted-foreground">{label}:</span>
      <span>{new Date(date).toLocaleDateString("en-AU", DATE_FORMAT)}</span>
    </div>
  )
}

/** #18 - One-click copy verification link for sharing with employer */
function CopyVerifyLinkButton({ verificationCode }: { verificationCode: string }) {
  const [copied, setCopied] = useState(false)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://instantmed.com.au"
  const url = `${baseUrl}/verify?code=${encodeURIComponent(verificationCode)}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    capture("verification_link_copied", { code: verificationCode })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4 text-success" /> : <Link2 className="h-4 w-4" />}
      {copied ? "Copied!" : "Copy Verify Link"}
    </Button>
  )
}

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

  // Handle status updates from IntakeStatusTracker (single realtime subscription)
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

  // Date correction request
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

  // Check if cancellation is allowed (only unpaid requests)
  const canCancel = ["draft", "pending_payment", "checkout_failed"].includes(intake.status)

  // Check if resend is available
  const canResend = ["approved", "completed"].includes(intake.status) && intakeDocument

  // Check if date correction is available (approved med certs)
  const canRequestCorrection = ["approved", "completed"].includes(intake.status) && isMedCert && !correctionSubmitted

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
      {/* Real-time status listener */}
      <IntakeStatusListener 
        intakeId={intake.id} 
        currentStatus={intake.status} 
      />

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
          {/* Pending Payment - Retry CTA */}
          {intake.status === "pending_payment" && (
            <Card className="border-warning-border bg-warning-light/50 dark:bg-warning/10">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="rounded-full bg-warning-light p-3 shrink-0">
                    <AlertCircle className="h-6 w-6 text-warning" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-base font-semibold text-warning">Payment Required</h3>
                      <p className="text-sm text-muted-foreground">
                        Your request is saved but hasn&apos;t been submitted yet. Complete payment to send it to a doctor for review.
                      </p>
                    </div>
                    <Button
                      onClick={handleRetryPayment}
                      disabled={isPending}
                      className="w-full sm:w-auto"
                    >
                      {isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Complete Payment
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Checkout Failed - Retry CTA */}
          {intake.status === "checkout_failed" && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="rounded-full bg-destructive/10 p-3 shrink-0">
                    <XCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-base font-semibold text-destructive">Payment didn&apos;t go through</h3>
                      <p className="text-sm text-muted-foreground">
                        Your information has been saved. Try again with the same or a different card - no need to re-enter your details.
                      </p>
                    </div>
                    <Button
                      onClick={handleRetryPayment}
                      disabled={isPending}
                      className="w-full sm:w-auto"
                    >
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
              </CardContent>
            </Card>
          )}

          {/* Status Message */}
          <div className="p-4 rounded-xl bg-muted/50">
            {intake.status === "paid" && (
              <div className="text-sm space-y-1">
                <p>
                  Your request has been received and is waiting for doctor review.
                </p>
                <p className="text-muted-foreground">
                  {COPY.global.slaPendingMessage}
                </p>
              </div>
            )}
            {intake.status === "in_review" && (
              <div className="text-sm space-y-1">
                <p>
                  A doctor is currently reviewing your request.
                </p>
                <p className="text-muted-foreground">
                  You&apos;ll be notified when a decision has been made.
                </p>
              </div>
            )}
            {intake.status === "approved" && (
              <div className="text-sm text-success space-y-1">
                <p>Your request has been approved!</p>
                {document?.pdf_url ? (
                  <p>Download your document below.</p>
                ) : (
                  <p className="flex items-center gap-2 text-info">
                    <Clock className="h-4 w-4 animate-pulse" />
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
                <div className="p-3 rounded-xl bg-destructive-light border border-destructive-border">
                  <p className="text-sm text-destructive">
                    <strong>Reason:</strong> {intake.decline_reason_note || "This request could not be fulfilled via our telehealth service. For your safety, we recommend consulting with your regular doctor who has access to your full medical history."}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  If you have questions, please <Link href="/contact" className="underline hover:text-foreground">contact support</Link>.
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
                Your prescription has been approved! The doctor is preparing your script. 
                You&apos;ll receive it via email or SMS shortly.
              </p>
            )}
            {intake.status === "completed" && (
              <div className="text-sm text-success space-y-1">
                <p>Your request has been completed.</p>
                {/* Special message for repeat prescriptions */}
                {intake.service?.type === "common_scripts" && (
                  <p>Your repeat prescription has been issued. You should receive the eScript via SMS shortly.</p>
                )}
                {document?.pdf_url && <p>Download your document below.</p>}
              </div>
            )}
            {intake.status === "cancelled" && (
              <p className="text-sm text-muted-foreground">
                This request has been cancelled.
              </p>
            )}
          </div>

          {/* Action Error Display */}
          {actionError && (
            <div className="p-3 rounded-xl bg-destructive-light border border-destructive-border text-sm text-destructive">
              {actionError}
            </div>
          )}

          {/* Resend Success Message */}
          {resendSuccess && (
            <div className="p-3 rounded-xl bg-success-light/30 border border-success-border text-sm text-success flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Certificate has been resent to your email.
            </div>
          )}

          {/* Refund Status Badge */}
          {intake.payment_status === "refunded" && (
            <div className="p-3 rounded-xl bg-warning-light/30 border border-warning-border">
              <div className="flex items-center gap-2 text-sm text-warning">
                <RefreshCw className="h-4 w-4" />
                <span><strong>Refund processed</strong> - Your payment has been refunded.</span>
              </div>
            </div>
          )}

          {/* Live Status Tracker - Show for in-progress requests */}
          {["paid", "in_review", "pending_info"].includes(intake.status) && (
            <IntakeStatusTracker
              intakeId={intake.id}
              initialStatus={intake.status as IntakeStatus}
              onStatusChange={handleStatusChange}
            />
          )}

          {/* Document Card - Prominent display for approved/completed intakes with documents */}
          {(intake.status === "approved" || intake.status === "completed") && document?.pdf_url && (
            <EmailVerificationGate
              email={userEmail || ""}
              isVerified={isEmailVerified}
              onResendVerification={resendVerificationEmail}
            >
              <DocumentReadyReveal intakeId={intake.id} approvedAt={intake.approved_at}>
              <Card className="border-success-border bg-success-light/50 dark:bg-success/10">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-success-light p-3">
                      <FileText className="h-6 w-6 text-success" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="text-base font-semibold text-success">Your Document is Ready</h3>
                        <p className="text-sm text-muted-foreground">
                          Download your {service?.short_name || service?.name || "document"} below.
                        </p>
                      </div>
                      <Button asChild size="lg" className="w-full sm:w-auto">
                        <a
                          href={document.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          onClick={() => capture("certificate_downloaded", {
                            intake_id: intake.id,
                            service_type: intake.service?.type,
                          })}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </a>
                      </Button>
                      {document.verification_code && (
                        <div className="flex items-center gap-2 text-sm text-success pt-2">
                          <Shield className="h-4 w-4" />
                          <span>
                            Verification Code: <code className="font-mono font-semibold bg-success-light px-2 py-0.5 rounded">{document.verification_code}</code>
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-success">
                        A copy has also been sent to your email.
                      </p>
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {/* Resend Email Button */}
                        {canResend && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleResendEmail}
                            disabled={isPending}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            {isPending ? "Sending..." : "Resend to email"}
                          </Button>
                        )}
                        
                        {/* Request Date Change */}
                        {canRequestCorrection && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDateCorrection(true)}
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Request Date Change
                          </Button>
                        )}
                        {correctionSubmitted && (
                          <p className="text-xs text-warning w-full">
                            Date correction submitted - your doctor will review and resend the updated certificate.
                          </p>
                        )}

                        {/* Send to Employer - Only for med_certs */}
                        {intake.service?.type === "med_certs" && (
                          <>
                            <SendToEmployerDialog
                              intakeId={intake.id}
                              trigger={
                                <Button variant="outline" size="sm" className="gap-2">
                                  <Mail className="h-4 w-4" />
                                  Email to Employer
                                </Button>
                              }
                            />
                            {/* #18 - Copy shareable verification link */}
                            {document.verification_code && (
                              <CopyVerifyLinkButton verificationCode={document.verification_code} />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </DocumentReadyReveal>
            </EmailVerificationGate>
          )}

          {/* Cross-sell - shown after approval, service-aware */}
          {(intake.status === "approved" || intake.status === "completed") && (
            <CrossSellCard serviceType={intake.service?.type} />
          )}

          {/* Action Buttons */}
          {canCancel && (
            <div className="p-4 rounded-lg border border-dashed border-muted-foreground/30">
              <div className="flex items-center justify-between">
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
                  className="text-destructive hover:text-destructive hover:bg-destructive-light"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {isPending ? "Cancelling..." : "Cancel request"}
                </Button>
              </div>
            </div>
          )}

          {/* Support Link for Error States */}
          {(intake.status === "declined" || intake.status === "pending_info") && (
            <div className="p-4 rounded-lg bg-muted/30 flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
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

          {/* Submitted Answers - Curated summary only (no consent/terms) */}
          {intake.answers && intake.answers.length > 0 && intake.answers[0]?.answers && (
            <div className="pt-6 border-t">
              <h3 className="text-base font-medium mb-4">Your Submitted Information</h3>
              <SubmittedAnswers
                answers={intake.answers[0].answers}
                serviceType={service?.short_name || service?.name || ""}
              />
            </div>
          )}

          {/* Timeline */}
          <div className="pt-2">
            <h3 className="text-base font-medium mb-4">Timeline</h3>
            <div className="space-y-4">
              <TimelineEntry icon={Calendar} label="Submitted" date={intake.created_at} />
              {intake.paid_at && <TimelineEntry icon={CheckCircle} label="Payment received" date={intake.paid_at} color="text-success" />}
              {intake.approved_at && <TimelineEntry icon={CheckCircle} label="Approved" date={intake.approved_at} color="text-success" />}
              {intake.declined_at && <TimelineEntry icon={XCircle} label="Declined" date={intake.declined_at} color="text-destructive" />}
              {intake.cancelled_at && <TimelineEntry icon={Ban} label="Cancelled" date={intake.cancelled_at} />}
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

      {/* Date Correction Dialog */}
      <Dialog open={showDateCorrection} onOpenChange={setShowDateCorrection}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Date Change</DialogTitle>
            <DialogDescription>
              Submit your corrected dates below. Your doctor will review and resend an updated certificate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="correction-start-date">Start Date</Label>
                <Input
                  id="correction-start-date"
                  type="date"
                  value={correctionStartDate}
                  onChange={(e) => setCorrectionStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="correction-end-date">End Date</Label>
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
              disabled={isPending || !correctionStartDate || !correctionEndDate || !correctionReason.trim()}
            >
              {isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
