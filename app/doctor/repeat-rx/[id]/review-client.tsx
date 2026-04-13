"use client"

import {
  ArrowLeft,
  Check,
  CheckCircle,
  Copy,
  FileText,
  Loader2,
  Mail,
  Pill,
  User,
  XCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/format"

// ============================================================================
// TYPES
// ============================================================================

interface PatientData {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  date_of_birth: string | null
  address: string | null
  medicare_number: string | null
  medicare_irn: string | null
  ihi_number: string | null
}

interface RequestData {
  id: string
  patient_id: string | null
  is_guest: boolean
  guest_email: string | null
  medication_code: string
  medication_display: string
  medication_strength: string
  medication_form: string
  status: string
  eligibility_passed: boolean
  clinical_summary: {
    medication?: {
      display?: string
      medication_name?: string
      strength?: string
      form?: string
    }
    answers?: Record<string, unknown>
    patientNotes?: string
    // Legacy fields (may exist on older requests)
    patientReported?: {
      indication?: string
      currentDose?: string
    }
  }
  emergency_consent_at: string
  gp_attestation_at: string
  created_at: string
  patient: PatientData | null
  answers: Array<{
    id: string
    version: number
    answers: Record<string, unknown>
    created_at: string
  }>
  decisions: Array<{
    id: string
    decision: string
    decision_reason: string
    clinician_id: string
    created_at: string
  }>
}

interface RepeatRxReviewClientProps {
  request: RequestData
  clinicianId: string
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-info-light text-info" },
    approved: { label: "Script Sent", className: "bg-success-light text-success" },
    script_sent: { label: "Script Sent", className: "bg-success-light text-success" },
    declined: { label: "Declined", className: "bg-destructive-light text-destructive" },
    requires_consult: { label: "Requires Consult", className: "bg-warning-light text-warning" },
  }

  const config = statusConfig[status] || { label: status, className: "bg-muted" }

  return (
    <Badge className={config.className}>{config.label}</Badge>
  )
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className="h-5 w-5 text-muted-foreground hover:text-primary"
      title={`Copy ${label || "text"}`}
    >
      {copied ? (
        <Check className="w-3 h-3 text-success" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </Button>
  )
}

function DataRow({
  label,
  value,
  copyable,
}: {
  label: string
  value: React.ReactNode
  copyable?: boolean
}) {
  const stringValue = typeof value === "string" ? value : ""
  return (
    <div className="flex items-start justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-right max-w-[60%] flex items-center gap-1">
        {value || "\u2014"}
        {copyable && stringValue && <CopyButton text={stringValue} label={label} />}
      </span>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RepeatRxReviewClient({ request, clinicianId: _clinicianId }: RepeatRxReviewClientProps) {
  const router = useRouter()
  const patient = request.patient

  // Extract patient notes from answers or clinical summary
  const latestAnswers = request.answers?.[0]?.answers || {}
  const patientNotes = (
    request.clinical_summary?.patientNotes ||
    latestAnswers.patientNotes ||
    latestAnswers.reason ||
    request.clinical_summary?.patientReported?.indication ||
    ""
  ) as string

  // Decision form state
  const [declineReason, setDeclineReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDecline, setShowDecline] = useState(false)

  const handleMarkScriptSent = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/repeat-rx/${request.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "approved",
          decisionReason: "Script sent via Parchment",
        }),
      })

      if (response.ok) {
        toast.success("Script marked as sent")
        router.push("/doctor/repeat-rx")
        router.refresh()
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error || "Failed to mark script as sent")
      }
    } catch {
      toast.error("Network error - please try again")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDecline = async () => {
    if (!declineReason.trim()) return
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/repeat-rx/${request.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "declined",
          decisionReason: declineReason,
        }),
      })

      if (response.ok) {
        toast.success("Request declined")
        router.push("/doctor/repeat-rx")
        router.refresh()
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error || "Failed to decline request")
      }
    } catch {
      toast.error("Network error - please try again")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isActionable = request.status === "pending" || request.status === "requires_consult"

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="-ml-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold">Prescription Request</h1>
                  <StatusBadge status={request.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  #{request.id.slice(0, 8)} &middot; {formatDate(request.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content - two-column request card */}
      <main className="px-6 py-4">
        <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Left: Patient details (copy-ready for Parchment) */}
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Patient Details</h3>
              </div>

              {patient ? (
                <div className="space-y-0">
                  <DataRow label="Name" value={patient.full_name} copyable />
                  <DataRow
                    label="DOB"
                    value={patient.date_of_birth ? formatDate(patient.date_of_birth) : null}
                    copyable
                  />
                  <DataRow label="Medicare" value={
                    patient.medicare_number
                      ? `${patient.medicare_number}${patient.medicare_irn ? ` / ${patient.medicare_irn}` : ""}`
                      : null
                  } copyable />
                  <DataRow label="IHI" value={patient.ihi_number} copyable />
                  <DataRow label="Address" value={patient.address} copyable />
                  <DataRow label="Phone" value={patient.phone} copyable />
                  <DataRow label="Email" value={patient.email} copyable />
                </div>
              ) : (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Guest patient</p>
                  {request.guest_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{request.guest_email}</span>
                      <CopyButton text={request.guest_email} label="email" />
                    </div>
                  )}
                </div>
              )}

              {/* Quick copy all button */}
              {patient && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const lines = [
                      patient.full_name,
                      patient.date_of_birth ? `DOB: ${formatDate(patient.date_of_birth)}` : null,
                      patient.medicare_number ? `Medicare: ${patient.medicare_number}${patient.medicare_irn ? ` / ${patient.medicare_irn}` : ""}` : null,
                      patient.ihi_number ? `IHI: ${patient.ihi_number}` : null,
                      patient.address,
                      patient.phone,
                      patient.email,
                    ].filter(Boolean).join("\n")
                    try {
                      await navigator.clipboard.writeText(lines)
                      toast.success("Patient details copied")
                    } catch { /* ignore */ }
                  }}
                  className="mt-2 h-auto px-0 text-xs text-primary hover:underline gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy all patient details
                </Button>
              )}
            </div>

            {/* Right: Medication requested + patient notes */}
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Pill className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Medication Requested</h3>
              </div>

              <div className="space-y-0">
                <DataRow label="Name" value={request.medication_display} copyable />
                <DataRow label="Strength" value={request.medication_strength} copyable />
                <DataRow label="Form" value={request.medication_form} copyable />
              </div>

              {/* Patient notes */}
              {patientNotes && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Patient Notes</span>
                  </div>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    {patientNotes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Actions */}
          {isActionable ? (
            <div className="border-t border-border px-6 py-4 bg-muted/20">
              {!showDecline ? (
                <div className="flex items-center gap-3">
                  {/* Primary action: Mark Script Sent */}
                  <Button
                    onClick={handleMarkScriptSent}
                    disabled={isSubmitting}
                    className="h-12 px-8 gap-2"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Mark Script Sent
                      </>
                    )}
                  </Button>

                  {/* Secondary action: Decline */}
                  <Button
                    variant="outline"
                    onClick={() => setShowDecline(true)}
                    disabled={isSubmitting}
                    className="h-12 gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                  >
                    <XCircle className="w-4 h-4" />
                    Decline
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-w-lg">
                  <Label className="text-sm font-medium">Reason for declining *</Label>
                  <Textarea
                    value={declineReason}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDeclineReason(e.target.value)}
                    placeholder="Explain why this request is being declined..."
                    className="min-h-[80px]"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleDecline}
                      disabled={!declineReason.trim() || isSubmitting}
                      variant="destructive"
                      className="gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Declining...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          Confirm Decline
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowDecline(false)
                        setDeclineReason("")
                      }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="border-t border-border px-6 py-4 bg-muted/20">
              <div className="flex items-center gap-2">
                <StatusBadge status={request.status} />
                {request.decisions?.[0] && (
                  <span className="text-sm text-muted-foreground">
                    - {request.decisions[0].decision_reason}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
