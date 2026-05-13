"use client"

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  FileText,
  GitMerge,
  Loader2,
  type LucideIcon,
  Mail,
  MapPin,
  Phone,
  Pill,
  Plus,
  RefreshCw,
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
import { STAFF_DOCTOR_PATIENTS_HREF, STAFF_IDENTITY_HREF } from "@/lib/dashboard/routes"
import { buildPatientSnapshot } from "@/lib/doctor/patient-snapshot"
import { formatDate, formatDateLong } from "@/lib/format"
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

type PatientFileStatusTone = "success" | "warning" | "destructive" | "muted"

const PATIENT_FILE_STATUS_TONE_CLASS: Record<PatientFileStatusTone, string> = {
  success: "bg-success-light/55 text-success",
  warning: "bg-warning-light/60 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted/45 text-muted-foreground",
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
  const patientFileStatusItems: Array<{
    label: string
    value: string
    tone: PatientFileStatusTone
    icon: LucideIcon
  }> = [
    {
      label: "Identity",
      value: snapshot.completenessTone === "complete" ? "Ready" : snapshot.completenessLabel,
      tone: snapshot.completenessTone === "complete"
        ? "success"
        : snapshot.completenessTone === "partial"
          ? "warning"
          : "destructive",
      icon: snapshot.completenessTone === "complete" ? CheckCircle : AlertTriangle,
    },
    {
      label: "Duplicate",
      value: stats.linkedProfiles > 1
        ? `${stats.linkedProfiles} linked${canMergeLinkedProfiles ? " · merge available" : ""}`
        : "Single profile",
      tone: stats.linkedProfiles > 1 ? "warning" : "muted",
      icon: stats.linkedProfiles > 1 ? GitMerge : CheckCircle,
    },
    {
      label: "Parchment",
      value: patient.parchment_patient_id ? "Ready" : parchmentStatusLabel,
      tone: parchmentStatusTone,
      icon: patient.parchment_patient_id ? CheckCircle : Pill,
    },
    {
      label: "Last request",
      value: latestRequest
        ? `${latestRequest.service?.short_name || latestRequest.service?.name || latestRequest.category || "Request"} · ${formatIntakeStatus(latestRequest.status)}`
        : "No requests",
      tone: "muted",
      icon: FileText,
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" className="px-0 text-muted-foreground hover:bg-transparent hover:text-foreground" asChild>
            <Link href={STAFF_DOCTOR_PATIENTS_HREF}>
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

      <div
        className="grid gap-2 rounded-xl border border-border/50 bg-card p-2 text-sm sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Patient file status"
      >
        {patientFileStatusItems.map((item) => (
          <div key={item.label} className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/25 px-3 py-2">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${PATIENT_FILE_STATUS_TONE_CLASS[item.tone]}`}>
              <item.icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {item.label}
              </span>
              <span className="block truncate text-sm font-medium text-foreground">{item.value}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Prescribing workspace — Linear-tier strip. The old card carried four
          big metadata blocks that duplicated the patient-summary row below
          AND the timeline's Audit / Prescriptions tabs. Now a single bounded
          row: status chip, latest prescription/request as one inline line,
          and a primary "Prescribe" CTA. The rest of the parchment actions
          (sync, refresh, link prescriber) live in the Actions menu. */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-2.5 text-sm">
        <Pill className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span className="text-sm font-medium text-foreground">Prescribing</span>
        <Badge variant={parchmentStatusTone} size="sm">{parchmentStatusLabel}</Badge>
        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
          {parchmentEnabled && !parchmentUserLinked ? (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href={`${STAFF_IDENTITY_HREF}#parchment-account`}>Link prescriber</Link>
            </Button>
          ) : null}
          {canUseParchment && !patient.parchment_patient_id ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isParchmentSyncPending}
              onClick={handleSyncPatientToParchment}
              title="Sync this patient to Parchment"
            >
              {isParchmentSyncPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Sync
            </Button>
          ) : null}
          {canUseParchment ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPrescriptionRefreshPending}
              onClick={handleRefreshParchmentPrescriptions}
              title="Refresh prescriptions from Parchment"
            >
              {isPrescriptionRefreshPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Refresh
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={!canUseParchment}
            onClick={handleOpenParchmentPrescribe}
          >
            <Pill className="h-4 w-4" />
            Prescribe in Parchment
          </Button>
        </div>
      </div>

      {/* Phase 4 entity-page cleanup (2026-05-12): the standalone Delivery
          Evidence card was duplicate surface area. Every Parchment webhook
          and manual refresh event is rendered in `<PatientTimeline>` below
          under the Audit filter tab, with the same SCID + event-id + "View
          request" deep links. The "Verify delivery" action moves into the
          Prescribing strip's Refresh button (same RPC, same intent).
          Removing the card returns ~150 vertical pixels above the timeline. */}
      {/* Compact patient identity strip. Phase 4 entity-page pass: the
          previous summary card had a 3-column grid that triple-printed
          details already in the header (name/age/sex/address) and the
          prescribing strip above (parchment patient id). Compressed into
          one bounded row of label / value pairs grouped by purpose. Saves
          ~120 vertical px and pushes the timeline up into the fold. */}
      <div className="rounded-xl border border-border/50 bg-card">
        {stats.linkedProfiles > 1 ? (
          <div className="flex flex-col gap-2 border-b border-border/40 bg-info-light/40 px-4 py-2.5 text-xs text-info sm:flex-row sm:items-center sm:justify-between">
            <span>History from {stats.linkedProfiles} linked patient profiles.</span>
            {canMergeLinkedProfiles ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="self-start border-info text-info hover:bg-info/10"
                onClick={() => setShowMergeDialog(true)}
              >
                <GitMerge className="mr-1 h-3.5 w-3.5" />
                Merge
              </Button>
            ) : null}
          </div>
        ) : null}
        {snapshot.missingCriticalFields.length > 0 ? (
          <div className="border-b border-warning-border bg-warning-light/45 px-4 py-2 text-xs text-warning">
            <span className="inline-flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {snapshot.completenessLabel}. Check the active intake before relying on this profile.
            </span>
          </div>
        ) : null}
        <dl className="grid gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <div className="flex items-start gap-2 min-w-0">
            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Email</dt>
              <dd className="truncate text-sm">{snapshot.email.label}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Phone</dt>
              <dd className="text-sm tabular-nums">{snapshot.phone.label}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Address</dt>
              <dd className="truncate text-sm">{snapshot.address.label}</dd>
              {snapshot.address.verificationLabel ? (
                <Badge variant={addressVerificationVariant} size="sm" className="mt-1 w-fit text-[10px]">
                  {snapshot.address.verificationLabel}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">DOB</dt>
            <dd className="text-sm tabular-nums">
              {patient.date_of_birth ? formatDateLong(patient.date_of_birth) : "Not collected"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Medicare</dt>
            <dd className="font-mono text-sm tabular-nums">
              {snapshot.medicare.present ? snapshot.medicare.label : "Not collected"}
            </dd>
            {snapshot.medicare.detailsLabel ? (
              <p className="text-[11px] text-muted-foreground">{snapshot.medicare.detailsLabel}</p>
            ) : null}
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Member since</dt>
            <dd className="text-sm tabular-nums">{formatDate(patient.created_at)}</dd>
          </div>
        </dl>
      </div>

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
