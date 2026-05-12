"use client"

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  GitMerge,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Pill,
  Plus,
  RefreshCw,
  User,
  Webhook,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import {
  refreshPatientParchmentPrescriptionsAction,
  syncPatientParchmentProfileAction,
} from "@/app/actions/manual-patient"
import { addPatientNoteAction } from "@/app/actions/patient-notes"
import { mergePatientProfilesAction } from "@/app/actions/patient-profile-merge"
import { ParchmentPrescribePanel } from "@/components/doctor"
import { PatientTimeline } from "@/components/doctor/patient-timeline"
import { usePanel } from "@/components/panels/panel-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { TypedConfirmDialog } from "@/components/ui/typed-confirm-dialog"
import { buildPatientSnapshot } from "@/lib/doctor/patient-snapshot"
import { formatDate, formatDateLong, formatDateTime } from "@/lib/format"
import { formatIntakeStatus } from "@/lib/format/intake"
import type { Profile } from "@/types/db"

import { EditPatientDialog } from "./edit-patient-dialog"

interface IntakeWithService {
  id: string
  status: string
  category: string | null
  subtype: string | null
  created_at: string
  paid_at: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  payment_status: string | null
  service: { name: string; short_name: string; type: string } | null
}

interface EmailLog {
  id: string
  email_type: string
  to_email: string
  subject: string
  status: string
  delivery_status: string | null
  created_at: string
  sent_at: string | null
  intake_id: string | null
}

interface PatientNote {
  id: string
  content: string
  note_type: string
  created_at: string
  created_by: string
  created_by_name: string | null
}

interface PatientMedication {
  id: string
  source: "parchment" | "instantmed_request"
  medication_name: string
  medication_strength: string | null
  dosage_instructions: string | null
  quantity_prescribed: number | null
  repeats_allowed: number | null
  status: string
  recorded_at: string
  parchment_reference: string | null
  request_id: string | null
}

interface ParchmentActivity {
  id: string
  status: "success" | "warning" | "destructive" | "info"
  label: string
  detail: string
  occurred_at: string
  event_id: string | null
  scid: string | null
  request_id: string | null
}

type PatientDetailProfile = Profile & {
  duplicate_profile_ids?: string[]
}

interface PatientDetailClientProps {
  patient: PatientDetailProfile
  intakes: IntakeWithService[]
  medications: PatientMedication[]
  stats: {
    totalRequests: number
    approvedRequests: number
    certificatesIssued: number
    linkedProfiles: number
  }
  emailLogs: EmailLog[]
  patientNotes: PatientNote[]
  parchmentActivity: ParchmentActivity[]
  canMergePatientProfiles: boolean
  parchmentEnabled: boolean
  parchmentUserLinked: boolean
}

export function PatientDetailClient({
  patient,
  intakes,
  medications,
  stats,
  emailLogs,
  patientNotes,
  parchmentActivity,
  canMergePatientProfiles,
  parchmentEnabled,
  parchmentUserLinked,
}: PatientDetailClientProps) {
  const router = useRouter()
  const { openPanel } = usePanel()
  const [isNotePending, startNoteTransition] = useTransition()
  const [isMergePending, startMergeTransition] = useTransition()
  const [isParchmentSyncPending, startParchmentSyncTransition] = useTransition()
  const [isPrescriptionRefreshPending, startPrescriptionRefreshTransition] = useTransition()
  const [newNote, setNewNote] = useState("")
  const [notes, setNotes] = useState<PatientNote[]>(patientNotes)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [showMergeDialog, setShowMergeDialog] = useState(false)
  const duplicateProfileIds = patient.duplicate_profile_ids ?? []
  const canMergeLinkedProfiles = canMergePatientProfiles && duplicateProfileIds.length > 0

  const handleOpenParchmentPrescribe = () => {
    openPanel({
      id: `patient-parchment-${patient.id}`,
      type: "sheet",
      component: (
        <ParchmentPrescribePanel
          patientId={patient.id}
          patientName={patient.full_name}
          onPrescriptionsRefresh={handleRefreshParchmentPrescriptions}
          prescriptionsRefreshPending={isPrescriptionRefreshPending}
        />
      ),
    })
  }

  const handleSyncPatientToParchment = () => {
    startParchmentSyncTransition(async () => {
      const result = await syncPatientParchmentProfileAction(patient.id)
      if (result.success) {
        toast.success("Patient synced to Parchment")
        router.refresh()
        return
      }

      toast.error(result.error || "Could not sync patient to Parchment")
    })
  }

  const refreshParchmentDeliveryEvidence = (mode: "refresh" | "verify" = "refresh") => {
    startPrescriptionRefreshTransition(async () => {
      const result = await refreshPatientParchmentPrescriptionsAction(patient.id)
      if (result.success) {
        const syncedCount = result.syncedCount ?? 0
        toast.success(
          syncedCount === 0
            ? mode === "verify"
              ? "Parchment delivery evidence refreshed. No new prescription yet."
              : "No Parchment prescriptions found"
            : mode === "verify"
              ? `Verified ${syncedCount} Parchment prescription${syncedCount === 1 ? "" : "s"} in the PMS`
              : `Refreshed ${syncedCount} Parchment prescription${syncedCount === 1 ? "" : "s"}`,
        )
        router.refresh()
        return
      }

      if ((result.syncedCount ?? 0) > 0) router.refresh()
      toast.error(result.error || "Could not refresh prescriptions from Parchment")
    })
  }

  const handleRefreshParchmentPrescriptions = () => {
    refreshParchmentDeliveryEvidence("refresh")
  }

  const handleVerifyParchmentDelivery = () => {
    refreshParchmentDeliveryEvidence("verify")
  }

  const handleAddNote = () => {
    if (!newNote.trim()) return
    startNoteTransition(async () => {
      const result = await addPatientNoteAction(patient.id, newNote.trim())
      if (result.success && result.note) {
        setNotes(prev => [result.note as PatientNote, ...prev])
        setNewNote("")
        setShowNoteForm(false)
      }
    })
  }

  const handleMergeLinkedProfiles = () => {
    if (!canMergeLinkedProfiles) return

    startMergeTransition(async () => {
      const result = await mergePatientProfilesAction(
        patient.id,
        duplicateProfileIds,
        "Merged from linked duplicate profile review",
      )
      const mergedCount = result.mergedProfileCount ?? duplicateProfileIds.length

      if (result.success) {
        toast.success(`Merged ${mergedCount} linked profile${mergedCount === 1 ? "" : "s"}`)
        setShowMergeDialog(false)
        router.refresh()
        return
      }

      toast.error(result.error || "Could not merge linked profiles")
    })
  }

  const snapshot = buildPatientSnapshot(patient, {
    requireStructuredAddress: true,
    requireSex: true,
    requireMedicareDetails: true,
    validateMedicare: true,
  })
  const addressVerificationVariant = snapshot.address.verificationTone === "success"
    ? "success"
    : snapshot.address.verificationTone === "warning"
      ? "warning"
      : "outline"

  const canUseParchment = parchmentEnabled && parchmentUserLinked
  const latestMedication = medications[0] ?? null
  const latestRequest = intakes[0] ?? null
  const parchmentStatusLabel = !parchmentEnabled
    ? "Parchment integration disabled"
    : !parchmentUserLinked
      ? "Prescriber not linked"
      : patient.parchment_patient_id
        ? "Ready in Parchment"
        : "Sync required"
  const parchmentStatusTone = canUseParchment
    ? patient.parchment_patient_id ? "success" : "warning"
    : "destructive"
  const latestMedicationName = latestMedication
    ? [latestMedication.medication_name, latestMedication.medication_strength].filter(Boolean).join(" ")
    : "No prescriptions yet"
  const latestParchmentActivity = parchmentActivity[0] ?? null
  const secondaryParchmentActivity = parchmentActivity
    .slice(1)
    .filter((activity, index, activities) => {
      if (latestParchmentActivity && activity.label === latestParchmentActivity.label && activity.detail === latestParchmentActivity.detail) {
        return false
      }

      return activities.findIndex((candidate) => (
        candidate.label === activity.label &&
        candidate.detail === activity.detail &&
        candidate.status === activity.status
      )) === index
    })
    .slice(0, 4)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" className="px-0 text-muted-foreground hover:bg-transparent hover:text-foreground" asChild>
            <Link href="/doctor/patients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Patients
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {snapshot.name}
              </h1>
              <Badge
                variant={snapshot.completenessTone === "complete" ? "success" : snapshot.completenessTone === "partial" ? "warning" : "destructive"}
                size="sm"
              >
                {snapshot.completenessTone === "complete" ? "Details complete" : snapshot.completenessLabel}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {snapshot.ageDobLabel} · {snapshot.sex.label} · {snapshot.address.label}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <EditPatientDialog patient={patient} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowNoteForm((value) => !value)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add note
          </Button>
          {patient.onboarding_completed ? (
            <Badge variant="outline" className="bg-success-light text-success border-success-border">
              <CheckCircle className="mr-1 h-3 w-3" />
              Onboarded
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-warning-light text-warning border-warning-border">
              <XCircle className="mr-1 h-3 w-3" />
              Incomplete Profile
            </Badge>
          )}
        </div>
      </div>

      <Card className="rounded-xl border-primary/15 bg-primary/5 shadow-sm shadow-primary/[0.04]">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">Prescribing workspace</p>
                <Badge variant={parchmentStatusTone} size="sm">
                  {parchmentStatusLabel}
                </Badge>
              </div>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Create the prescription in Parchment from this patient profile. InstantMed keeps the patient record, Parchment handles prescribing, and prescriptions sync back into medication history.
              </p>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Parchment patient</p>
                  <p className="mt-1 truncate font-mono text-xs text-foreground">
                    {patient.parchment_patient_id || "Not synced yet"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last prescription</p>
                  <p className="mt-1 truncate text-foreground">{latestMedicationName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last request</p>
                  <p className="mt-1 truncate text-foreground">
                    {latestRequest
                      ? `${latestRequest.service?.short_name || latestRequest.service?.name || latestRequest.category || "Request"} · ${formatIntakeStatus(latestRequest.status)}`
                      : "No InstantMed requests"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row xl:items-center">
              <Button
                type="button"
                disabled={!canUseParchment}
                onClick={handleOpenParchmentPrescribe}
                className="sm:min-w-[190px]"
              >
                <Pill className="h-4 w-4" />
                Prescribe in Parchment
              </Button>
              {parchmentEnabled && !parchmentUserLinked && (
                <Button type="button" variant="outline" asChild>
                  <Link href="/doctor/settings/identity#parchment-account">Link prescriber</Link>
                </Button>
              )}
              {canUseParchment && !patient.parchment_patient_id && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isParchmentSyncPending}
                  onClick={handleSyncPatientToParchment}
                >
                  {isParchmentSyncPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sync patient
                </Button>
              )}
              {canUseParchment && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPrescriptionRefreshPending}
                  onClick={handleRefreshParchmentPrescriptions}
                >
                  {isPrescriptionRefreshPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh prescriptions
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/50">
        <CardHeader className="px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Webhook className="h-4 w-4" />
                Delivery evidence
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Latest Parchment webhook or manual prescription refresh.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={latestParchmentActivity?.status ?? "warning"} size="sm">
                {latestParchmentActivity ? latestParchmentActivity.label : "Waiting for webhook"}
              </Badge>
              {canUseParchment && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPrescriptionRefreshPending}
                  onClick={handleVerifyParchmentDelivery}
                >
                  {isPrescriptionRefreshPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {isPrescriptionRefreshPending ? "Verifying Parchment delivery evidence" : "Verify delivery"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 py-3">
          {latestParchmentActivity ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Latest delivery update</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{latestParchmentActivity.label}</p>
                    <p className="mt-1 max-w-4xl text-sm text-muted-foreground">{latestParchmentActivity.detail}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(latestParchmentActivity.occurred_at)}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {latestParchmentActivity.scid && (
                    <span className="font-mono">SCID {latestParchmentActivity.scid}</span>
                  )}
                  {latestParchmentActivity.event_id && (
                    <span className="font-mono">Event {latestParchmentActivity.event_id}</span>
                  )}
                  {latestParchmentActivity.request_id && (
                    <Link href={`/doctor/intakes/${latestParchmentActivity.request_id}`} className="text-primary hover:underline">
                      View request
                    </Link>
                  )}
                </div>
              </div>
              {secondaryParchmentActivity.length > 0 && (
                <details className="rounded-lg border border-border/60 bg-background px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                    Show {secondaryParchmentActivity.length} earlier delivery event{secondaryParchmentActivity.length === 1 ? "" : "s"}
                  </summary>
                  <div className="mt-3 grid gap-2 lg:grid-cols-2">
                    {secondaryParchmentActivity.map((activity) => (
                      <div key={activity.id} className="rounded-lg border border-border/60 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-foreground">{activity.label}</p>
                          <Badge variant={activity.status} size="sm">{activity.status}</Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{activity.detail}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-warning-border bg-warning-light px-3 py-3 text-sm text-warning">
              No Parchment webhook has been recorded for this patient yet. After you submit a prescription in the iframe, this panel should change to “Webhook confirmed script sent” or “Webhook synced prescription”.
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="rounded-xl border-border/50">
        <CardHeader className="py-3 px-4">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Patient summary
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-3">
          {stats.linkedProfiles > 1 && (
            <div className="mb-4 rounded-lg border border-info-border bg-info-light px-3 py-2 text-sm text-info">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>This view includes request history from {stats.linkedProfiles} linked patient profiles.</span>
                {canMergeLinkedProfiles && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full border-info text-info hover:bg-info/10 sm:w-auto"
                    onClick={() => setShowMergeDialog(true)}
                  >
                    <GitMerge className="mr-1 h-3.5 w-3.5" />
                    Merge
                  </Button>
                )}
              </div>
            </div>
          )}
          {snapshot.missingCriticalFields.length > 0 && (
            <div className="mb-4 rounded-lg border border-warning-border bg-warning-light px-3 py-2 text-sm text-warning">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{snapshot.completenessLabel}. Check the active intake before relying on this profile.</span>
              </div>
            </div>
          )}
          {parchmentEnabled && !parchmentUserLinked && (
            <div className="mb-4 rounded-lg border border-warning-border bg-warning-light px-3 py-2 text-sm text-warning">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Prescriber account not linked. Link your Parchment user once, then synced patients can be prescribed from this profile.</span>
                </div>
                <Button type="button" size="sm" variant="outline" asChild>
                  <Link href="/doctor/settings/identity#parchment-account">Link prescriber</Link>
                </Button>
              </div>
            </div>
          )}
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="space-y-3 rounded-lg bg-muted/35 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Identity</p>
              <div>
                <p className="text-sm font-medium text-foreground">{snapshot.name}</p>
                <p className="text-sm text-muted-foreground">{snapshot.ageDobLabel}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{snapshot.email.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{snapshot.phone.label}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span>{snapshot.address.label}</span>
                </div>
                {snapshot.address.verificationLabel && (
                  <Badge variant={addressVerificationVariant} size="sm" className="w-fit">
                    {snapshot.address.verificationLabel}
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-lg bg-muted/35 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Prescribing identity</p>
              <div className="grid grid-cols-2 gap-3 text-sm xl:grid-cols-1">
                <div>
                  <p className="text-xs text-muted-foreground">Date of birth</p>
                  <p className="font-medium text-foreground">
                    {patient.date_of_birth ? formatDateLong(patient.date_of_birth) : "Not collected"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sex</p>
                  <p className="font-medium text-foreground">{snapshot.sex.label}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Medicare</p>
                  <p className="font-mono text-sm font-medium text-foreground">
                    {snapshot.medicare.present ? snapshot.medicare.label : "Not collected"}
                  </p>
                  {snapshot.medicare.detailsLabel && (
                    <p className="text-xs text-muted-foreground">{snapshot.medicare.detailsLabel}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-lg bg-muted/35 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Parchment</p>
              <div className="space-y-2">
                <Badge variant={parchmentStatusTone} size="sm">
                  {parchmentStatusLabel}
                </Badge>
                <div>
                  <p className="text-xs text-muted-foreground">Patient ID</p>
                  <p className="break-all font-mono text-xs text-foreground">
                    {patient.parchment_patient_id || "Will be created on sync"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Member since {formatDate(patient.created_at)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/*
        Phase 4b of dashboard remaster (2026-05-12): the patient profile used
        to render four separate scroll-heavy cards under the patient summary
        (Active Prescriptions, PatientTimeline-requests-only, an inline note
        composer, and PatientCommunicationHistory). They are now all folded
        into one chronological `PatientTimeline` with channel filter tabs so
        the doctor reads the patient's history top-to-bottom in one stream.
      */}
      <PatientTimeline
        requests={intakes}
        prescriptions={medications}
        notes={notes}
        emails={emailLogs}
        audit={parchmentActivity}
        admin={canMergePatientProfiles}
        title="Patient timeline"
        emptyLabel="No requests, prescriptions, notes, emails, or webhook events recorded for this patient yet."
      />

      {showNoteForm && (
        <Card className="rounded-xl border-border/50">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">Add patient note</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Internal only. Not visible to the patient.
            </p>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className="space-y-3 rounded-lg bg-muted/50 p-4">
              <Textarea
                placeholder="Add a note about this patient..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowNoteForm(false); setNewNote("") }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddNote} disabled={isNotePending || !newNote.trim()}>
                  {isNotePending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Save note
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <TypedConfirmDialog
        open={showMergeDialog}
        onOpenChange={setShowMergeDialog}
        title="Merge linked patient profiles"
        description={`This moves request history, certificates, email logs, notes, consents, follow-ups, repeat Rx requests, and referral credits from ${duplicateProfileIds.length} guest duplicate profile${duplicateProfileIds.length === 1 ? "" : "s"} into this canonical patient profile. The duplicate profile row${duplicateProfileIds.length === 1 ? "" : "s"} stays archived for audit history. This action cannot be undone.`}
        requiredText="MERGE"
        confirmLabel="Merge profiles"
        onConfirm={handleMergeLinkedProfiles}
        isPending={isMergePending}
      />
    </div>
  )
}
