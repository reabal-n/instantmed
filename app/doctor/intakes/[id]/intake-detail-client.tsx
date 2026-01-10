"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Calendar,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Save,
  User,
  Clock,
  Loader2,
  Send,
} from "lucide-react"
import { updateStatusAction, saveDoctorNotesAction, declineIntakeAction, markScriptSentAction } from "@/app/doctor/queue/actions"
import { formatIntakeStatus, formatServiceType } from "@/lib/format-intake"
import type { IntakeWithDetails, IntakeWithPatient, IntakeStatus, DeclineReasonCode } from "@/types/db"

interface IntakeDetailClientProps {
  intake: IntakeWithDetails
  patientAge: number
  maskedMedicare: string
  previousIntakes?: IntakeWithPatient[]
  initialAction?: string
}

const DECLINE_REASONS: { code: DeclineReasonCode; label: string }[] = [
  { code: "requires_examination", label: "Requires in-person examination" },
  { code: "not_telehealth_suitable", label: "Not suitable for telehealth" },
  { code: "prescribing_guidelines", label: "Against prescribing guidelines" },
  { code: "controlled_substance", label: "Controlled substance request" },
  { code: "urgent_care_needed", label: "Requires urgent care" },
  { code: "insufficient_info", label: "Insufficient information" },
  { code: "patient_not_eligible", label: "Patient not eligible" },
  { code: "outside_scope", label: "Outside scope of practice" },
  { code: "other", label: "Other reason" },
]

export function IntakeDetailClient({
  intake,
  patientAge,
  maskedMedicare,
  previousIntakes = [],
  initialAction,
}: IntakeDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [doctorNotes, setDoctorNotes] = useState(intake.doctor_notes || "")
  const [noteSaved, setNoteSaved] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(initialAction === "decline")
  const [showScriptDialog, setShowScriptDialog] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [declineReason, setDeclineReason] = useState("")
  const [declineReasonCode, setDeclineReasonCode] = useState<DeclineReasonCode>("requires_examination")
  const [parchmentReference, setParchmentReference] = useState("")

  const service = intake.service as { name?: string; type?: string; short_name?: string } | undefined

  const handleStatusChange = async (status: IntakeStatus) => {
    startTransition(async () => {
      const result = await updateStatusAction(intake.id, status, intake.patient_id)
      if (result.success) {
        setActionMessage({
          type: "success",
          text: `Case ${status === "approved" ? "approved" : "updated"}`,
        })
        setTimeout(() => router.push("/doctor/queue"), 2000)
      } else {
        setActionMessage({ type: "error", text: result.error || "Failed to update status" })
      }
    })
  }

  const handleDecline = async () => {
    if (!declineReason.trim()) return
    startTransition(async () => {
      const result = await declineIntakeAction(intake.id, declineReasonCode, declineReason)
      if (result.success) {
        setShowDeclineDialog(false)
        setActionMessage({ type: "success", text: "Case declined" })
        setTimeout(() => router.push("/doctor/queue"), 2000)
      } else {
        setActionMessage({ type: "error", text: result.error || "Failed to decline" })
      }
    })
  }

  const handleSaveNotes = async () => {
    startTransition(async () => {
      const result = await saveDoctorNotesAction(intake.id, doctorNotes)
      if (result.success) {
        setNoteSaved(true)
        setTimeout(() => setNoteSaved(false), 3000)
      } else {
        setActionMessage({ type: "error", text: result.error || "Failed to save notes" })
      }
    })
  }

  const handleMarkScriptSent = async () => {
    startTransition(async () => {
      const result = await markScriptSentAction(intake.id, parchmentReference || undefined)
      if (result.success) {
        setShowScriptDialog(false)
        setActionMessage({ type: "success", text: "Script marked as sent" })
        setTimeout(() => router.push("/doctor/queue"), 2000)
      } else {
        setActionMessage({ type: "error", text: result.error || "Failed to mark script sent" })
      }
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
      case "completed":
        return "bg-emerald-100 text-emerald-800"
      case "declined":
        return "bg-red-100 text-red-800"
      case "pending_info":
        return "bg-amber-100 text-amber-800"
      case "awaiting_script":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-blue-100 text-blue-800"
    }
  }

  // Parse answers for display
  const answers = intake.answers?.answers || {}

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/doctor/queue">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Queue
          </Link>
        </Button>
        <Badge className={getStatusColor(intake.status)}>
          {formatIntakeStatus(intake.status)}
        </Badge>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div
          className={`p-4 rounded-lg ${
            actionMessage.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Patient Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-medium">{intake.patient.full_name}</p>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Age / DOB</p>
                <p className="font-medium">{patientAge}y • {new Date(intake.patient.date_of_birth).toLocaleDateString("en-AU")}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Medicare</p>
                <p className="font-medium font-mono">{maskedMedicare}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium">{intake.patient.phone || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 col-span-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium">
                  {intake.patient.suburb || "N/A"}, {intake.patient.state || ""}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {service?.name || formatServiceType(service?.type || "")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Submitted: {formatDate(intake.created_at)}
            </div>
            {intake.paid_at && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Paid: {formatDate(intake.paid_at)}
              </div>
            )}
          </div>

          {/* Questionnaire Answers */}
          {Object.keys(answers).length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Questionnaire Responses</h4>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                {Object.entries(answers).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Doctor Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Clinical Notes (Private)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Add your clinical notes here..."
            value={doctorNotes}
            onChange={(e) => setDoctorNotes(e.target.value)}
            className="min-h-[120px]"
          />
          <div className="flex items-center gap-2">
            <Button onClick={handleSaveNotes} disabled={isPending} variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Save Notes
            </Button>
            {noteSaved && <span className="text-sm text-emerald-600">Saved!</span>}
          </div>
        </CardContent>
      </Card>

      {/* Patient History */}
      {previousIntakes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {previousIntakes.map((prev) => {
                const prevService = prev.service as { short_name?: string } | undefined
                return (
                  <div key={prev.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm">{prevService?.short_name || "Request"}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {formatIntakeStatus(prev.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(prev.created_at).toLocaleDateString("en-AU")}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            {/* For med certs - go to document builder */}
            {service?.type === "med_certs" && intake.status !== "approved" && (
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                <Link href={`/doctor/intakes/${intake.id}/document`}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Generate Certificate
                </Link>
              </Button>
            )}

            {/* For repeat scripts - approve then mark sent externally */}
            {(service?.type === "repeat_rx" || service?.type === "common_scripts") && intake.status === "paid" && (
              <Button onClick={() => handleStatusChange("awaiting_script")} className="bg-emerald-600 hover:bg-emerald-700" disabled={isPending}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Script
              </Button>
            )}

            {/* Mark script as sent (for awaiting_script status) */}
            {intake.status === "awaiting_script" && (
              <Button onClick={() => setShowScriptDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                <Send className="h-4 w-4 mr-2" />
                Mark Script Sent
              </Button>
            )}

            {/* For consults - approve after call with notes */}
            {service?.type === "consults" && intake.status === "paid" && (
              <Button onClick={() => handleStatusChange("approved")} className="bg-emerald-600 hover:bg-emerald-700" disabled={isPending}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Consultation
              </Button>
            )}

            {/* Generic approve for other services */}
            {!["med_certs", "repeat_rx", "common_scripts", "consults"].includes(service?.type || "") && intake.status === "paid" && (
              <Button onClick={() => handleStatusChange("approved")} className="bg-emerald-600 hover:bg-emerald-700" disabled={isPending}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            )}

            {/* Decline */}
            {!["approved", "declined", "completed"].includes(intake.status) && (
              <Button variant="destructive" onClick={() => setShowDeclineDialog(true)} disabled={isPending}>
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Decline Dialog */}
      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Request</AlertDialogTitle>
            <AlertDialogDescription>
              Please select a reason and provide details for declining this request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={declineReasonCode} onValueChange={(v) => setDeclineReasonCode(v as DeclineReasonCode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DECLINE_REASONS.map((r) => (
                    <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Details</Label>
              <Textarea
                placeholder="Provide additional details..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDecline} disabled={!declineReason.trim() || isPending} className="bg-red-600">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Decline Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Script Sent Dialog */}
      <AlertDialog open={showScriptDialog} onOpenChange={setShowScriptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Script as Sent</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that you have sent the prescription via Parchment or other means.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Parchment Reference (optional)</Label>
              <Input
                placeholder="e.g., PAR-12345"
                value={parchmentReference}
                onChange={(e) => setParchmentReference(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkScriptSent} disabled={isPending} className="bg-purple-600">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Sent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
