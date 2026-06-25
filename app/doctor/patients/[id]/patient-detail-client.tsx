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
  Trash2,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import {
  refreshPatientParchmentPrescriptionsAction,
  syncPatientParchmentProfileAction,
} from "@/app/actions/manual-patient"
import { addPatientNoteAction } from "@/app/actions/patient-notes"
import {
  deletePatientProfileAction,
  mergePatientProfilesAction,
} from "@/app/actions/patient-profile-merge"
import { AttributionChip, ParchmentPrescribePanel } from "@/components/doctor"
import { PatientTimeline } from "@/components/doctor/patient-timeline"
import { usePanel } from "@/components/panels/panel-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { TypedConfirmDialog } from "@/components/ui/typed-confirm-dialog"
import {
  type AttributionClassificationInput,
  classifyAttributionSource,
} from "@/lib/analytics/source-classification"
import { STAFF_DOCTOR_PATIENTS_HREF, STAFF_IDENTITY_HREF, STAFF_PATIENTS_HREF } from "@/lib/dashboard/routes"
import { buildPatientSnapshot } from "@/lib/doctor/patient-snapshot"
import { formatIntakeStatus } from "@/lib/format/intake"
import { cn } from "@/lib/utils"
import { validateMedicareNumber } from "@/lib/validation/medicare"
import { normalizeIdentifierDigits, normalizeValidIhiNumber } from "@/lib/validation/prescribing-identifier"
import type { Profile } from "@/types/db"

import { EditPatientDialog } from "./edit-patient-dialog"

export type PatientTouchAttribution = AttributionClassificationInput & {
  created_at: string | null
}

interface IntakeWithService {
  id: string
  reference_number: string | null
  status: string
  category: string | null
  subtype: string | null
  created_at: string
  paid_at: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  payment_status: string | null
  amount_cents: number | null
  refund_amount_cents: number | null
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

interface PatientDuplicateCandidate {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  parchment_patient_id: string | null
  hasAuthUser: boolean
  matchReason: "strict" | "email" | "phone" | "name_dob"
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

function formatParchmentActivityTime(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

interface PatientDetailClientProps {
  patient: PatientDetailProfile
  duplicateCandidates: PatientDuplicateCandidate[]
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
  firstTouchAttribution: PatientTouchAttribution | null
  lastTouchAttribution: PatientTouchAttribution | null
}

export function PatientDetailClient({
  patient,
  duplicateCandidates,
  intakes,
  medications,
  stats,
  emailLogs,
  patientNotes,
  parchmentActivity,
  canMergePatientProfiles,
  parchmentEnabled,
  parchmentUserLinked,
  firstTouchAttribution,
  lastTouchAttribution,
}: PatientDetailClientProps) {
  const router = useRouter()
  const { openPanel } = usePanel()
  const [isNotePending, startNoteTransition] = useTransition()
  const [isMergePending, startMergeTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()
  const [isParchmentSyncPending, startParchmentSyncTransition] = useTransition()
  const [isPrescriptionRefreshPending, startPrescriptionRefreshTransition] = useTransition()
  const [newNote, setNewNote] = useState("")
  const [notes, setNotes] = useState<PatientNote[]>(patientNotes)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const noteFormRef = useRef<HTMLDivElement | null>(null)
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!showNoteForm) return
    // Scroll into view + focus the textarea so the operator doesn't have
    // to hunt for the form when they click "Add note" from the header.
    requestAnimationFrame(() => {
      noteFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      noteTextareaRef.current?.focus()
    })
  }, [showNoteForm])
  const [showMergeDialog, setShowMergeDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const duplicateProfileIds = patient.duplicate_profile_ids ?? []
  const reconcileDuplicateProfileIds = Array.from(new Set([
    ...duplicateProfileIds,
    ...duplicateCandidates.map((candidate) => candidate.id),
  ]))
  const canMergeLinkedProfiles = canMergePatientProfiles && reconcileDuplicateProfileIds.length > 0
  const signedInDuplicateCandidateCount = duplicateCandidates.filter((candidate) => candidate.hasAuthUser).length
  const duplicateCandidateNames = duplicateCandidates
    .slice(0, 3)
    .map((candidate) => candidate.full_name)
    .join(", ")
  const duplicateDialogSubject = duplicateCandidateNames
    ? `${reconcileDuplicateProfileIds.length} duplicate profile${reconcileDuplicateProfileIds.length === 1 ? "" : "s"} (${duplicateCandidateNames}${duplicateCandidates.length > 3 ? ", ..." : ""})`
    : `${reconcileDuplicateProfileIds.length} duplicate profile${reconcileDuplicateProfileIds.length === 1 ? "" : "s"}`

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
        toast.success(patient.parchment_patient_id ? "Patient identity resynced to Parchment" : "Patient synced to Parchment")
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
        reconcileDuplicateProfileIds,
        "Reconciled duplicate patient profiles from patient file",
        true,
      )
      const mergedCount = result.mergedProfileCount ?? reconcileDuplicateProfileIds.length

      if (result.success) {
        toast.success(
          result.syncWarning
            ? `Reconciled ${mergedCount} profile${mergedCount === 1 ? "" : "s"}. ${result.syncWarning}`
            : result.syncedToParchment
              ? `Reconciled ${mergedCount} profile${mergedCount === 1 ? "" : "s"} and synced Parchment`
              : `Reconciled ${mergedCount} profile${mergedCount === 1 ? "" : "s"}`,
        )
        setShowMergeDialog(false)
        router.refresh()
        return
      }

      toast.error(result.error || "Could not merge linked profiles")
    })
  }

  const handleDeletePatientProfile = () => {
    startDeleteTransition(async () => {
      const result = await deletePatientProfileAction(patient.id)
      if (result.success) {
        toast.success("Empty patient profile deleted")
        setShowDeleteDialog(false)
        router.push(STAFF_PATIENTS_HREF)
        return
      }

      toast.error(result.error || "Could not delete patient profile")
    })
  }

  const snapshot = buildPatientSnapshot(patient, {
    requireStructuredAddress: true,
    requireSex: true,
    requireMedicareDetails: true,
    validateMedicare: true,
  })

  // Acquisition source: first-touch and last-touch. If the patient has only
  // one request, render a single chip. If the two intakes resolved to the
  // same group, also render a single chip. Otherwise render both labelled
  // so the operator can see how acquisition has evolved.
  const firstGroup = firstTouchAttribution
    ? classifyAttributionSource(firstTouchAttribution).group
    : null
  const lastGroup = lastTouchAttribution
    ? classifyAttributionSource(lastTouchAttribution).group
    : null
  const isSameTouch =
    Boolean(firstTouchAttribution) &&
    Boolean(lastTouchAttribution) &&
    firstTouchAttribution?.created_at === lastTouchAttribution?.created_at
  const showSeparateTouches =
    Boolean(firstTouchAttribution) &&
    Boolean(lastTouchAttribution) &&
    !isSameTouch &&
    firstGroup !== lastGroup
  const addressVerificationVariant = snapshot.address.verificationTone === "success"
    ? "success"
    : snapshot.address.verificationTone === "warning"
      ? "warning"
      : "outline"

  const missingPrescribingIdentityFields = Array.from(new Set(snapshot.missingCriticalFields))
  const hasPrescribingIdentityBlocker = missingPrescribingIdentityFields.length > 0
  const prescribingIdentityBlockerTitle = hasPrescribingIdentityBlocker
    ? `Complete prescribing identity: ${missingPrescribingIdentityFields.join(", ")}`
    : undefined
  const canUseParchment = parchmentEnabled && parchmentUserLinked && !hasPrescribingIdentityBlocker
  const hasParchmentBlocker = !parchmentEnabled || !parchmentUserLinked || hasPrescribingIdentityBlocker || !patient.parchment_patient_id
  const validIhiNumber = normalizeValidIhiNumber(patient.ihi_number)
  const medicareDigits = normalizeIdentifierDigits(patient.medicare_number)
  const hasInvalidMedicareNumber = Boolean(medicareDigits && !validateMedicareNumber(medicareDigits).valid)
  const usingIhiForPrescribing = Boolean(validIhiNumber && (!medicareDigits || hasInvalidMedicareNumber))
  const prescribingIdentifierHeading = usingIhiForPrescribing
    ? "IHI"
    : validIhiNumber
      ? "Medicare / IHI"
      : "Medicare"
  const latestIdentitySync = parchmentActivity.find((item) => item.label === "Patient synced") ?? null
  const latestIdentitySyncLabel = formatParchmentActivityTime(latestIdentitySync?.occurred_at)
  const syncButtonLabel = patient.parchment_patient_id ? "Resync identity" : "Sync identity"
  const syncButtonTitle = prescribingIdentityBlockerTitle ?? "Push current Medicare/IHI, address, DOB, phone, and sex to Parchment"
  const latestRequest = intakes[0] ?? null
  const parchmentStatusLabel = !parchmentEnabled
    ? "Parchment integration disabled"
      : !parchmentUserLinked
        ? "Prescriber not linked"
      : hasPrescribingIdentityBlocker
        ? `Verify identity: ${missingPrescribingIdentityFields.join(", ")}`
      : patient.parchment_patient_id
        ? "Synced in Parchment"
        : "Sync required"
  const parchmentStatusTone = canUseParchment
    ? patient.parchment_patient_id ? "outline" : "warning"
    : "destructive"
  const patientFileStatusItems: Array<{
    label: string
    value: string
    tone: PatientFileStatusTone
    icon: LucideIcon
  }> = [
    {
      label: "Identity",
      value: snapshot.completenessTone === "complete"
        ? "Details complete"
        : `${snapshot.missingCriticalFields.length} ${snapshot.missingCriticalFields.length === 1 ? "field" : "fields"} missing`,
      tone: snapshot.completenessTone === "complete"
        ? "muted"
        : snapshot.completenessTone === "partial"
          ? "warning"
          : "destructive",
      icon: snapshot.completenessTone === "complete" ? CheckCircle : AlertTriangle,
    },
    {
      label: "Prescribing",
      value: hasPrescribingIdentityBlocker
        ? "Verify identity"
        : patient.parchment_patient_id ? "Ready" : parchmentStatusLabel,
      tone: hasPrescribingIdentityBlocker ? "warning" : patient.parchment_patient_id ? "muted" : parchmentStatusTone === "warning" ? "warning" : "destructive",
      icon: hasPrescribingIdentityBlocker ? AlertTriangle : patient.parchment_patient_id ? CheckCircle : Pill,
    },
    {
      label: "Latest request",
      value: latestRequest
        ? `${latestRequest.service?.short_name || latestRequest.service?.name || latestRequest.category || "Request"} · ${formatIntakeStatus(latestRequest.status)}`
        : "No requests",
      tone: "muted",
      icon: FileText,
    },
    {
      label: "Duplicate",
      value: reconcileDuplicateProfileIds.length > 0
        ? `${reconcileDuplicateProfileIds.length} candidate${reconcileDuplicateProfileIds.length === 1 ? "" : "s"}${canMergeLinkedProfiles ? " · reconcile available" : ""}`
        : stats.linkedProfiles > 1
          ? `${stats.linkedProfiles} linked${canMergeLinkedProfiles ? " · reconcile available" : ""}`
          : "Single profile",
      tone: stats.linkedProfiles > 1 || reconcileDuplicateProfileIds.length > 0 ? "warning" : "muted",
      icon: stats.linkedProfiles > 1 || reconcileDuplicateProfileIds.length > 0 ? GitMerge : CheckCircle,
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
                variant={snapshot.completenessTone === "complete" ? "outline" : snapshot.completenessTone === "partial" ? "warning" : "destructive"}
                size="sm"
                className={snapshot.completenessTone === "complete" ? "text-muted-foreground" : undefined}
              >
                {snapshot.completenessTone === "complete"
                  ? "Details complete"
                  : `Identity incomplete · ${snapshot.missingCriticalFields.length} ${snapshot.missingCriticalFields.length === 1 ? "field" : "fields"}`}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {snapshot.ageDobLabel} · {snapshot.sex.label} · {snapshot.address.label}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {canMergePatientProfiles ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete patient
            </Button>
          ) : null}
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
            <Badge variant="outline" className="text-muted-foreground">
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
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors duration-150",
          hasParchmentBlocker
            ? "border-warning-border bg-warning-light/45"
            : "border-border/50 bg-card",
        )}
      >
        <Pill className={cn("h-4 w-4 shrink-0", hasParchmentBlocker ? "text-warning" : "text-muted-foreground")} aria-hidden />
        <span className="text-sm font-medium text-foreground">Prescribing</span>
        <Badge variant={parchmentStatusTone} size="sm">{parchmentStatusLabel}</Badge>
        {canUseParchment && patient.parchment_patient_id ? (
          <span className="text-xs text-muted-foreground">
            {latestIdentitySyncLabel ? `Last identity sync ${latestIdentitySyncLabel}` : "Resync after Medicare/IHI edits."}
          </span>
        ) : null}
        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
          {parchmentEnabled && !parchmentUserLinked ? (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href={`${STAFF_IDENTITY_HREF}#parchment-account`}>Link prescriber</Link>
            </Button>
          ) : null}
          {canUseParchment ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isParchmentSyncPending || hasPrescribingIdentityBlocker}
              onClick={handleSyncPatientToParchment}
              title={syncButtonTitle}
            >
              {isParchmentSyncPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {syncButtonLabel}
            </Button>
          ) : null}
          {canUseParchment ? (
            <Button
              type="button"
            variant="outline"
            size="sm"
            disabled={isPrescriptionRefreshPending || hasPrescribingIdentityBlocker}
            onClick={handleRefreshParchmentPrescriptions}
            title={prescribingIdentityBlockerTitle ?? "Refresh prescriptions from Parchment"}
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
            title={prescribingIdentityBlockerTitle}
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
        {stats.linkedProfiles > 1 || reconcileDuplicateProfileIds.length > 0 ? (
          <div className="flex flex-col gap-2 border-b border-border/40 bg-info-light/40 px-4 py-2.5 text-xs text-info sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <span className="block">
                {stats.linkedProfiles > 1
                  ? `History from ${stats.linkedProfiles} linked patient profiles.`
                  : "Potential duplicate patient profiles found."}
              </span>
              {duplicateCandidates.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {duplicateCandidates.slice(0, 4).map((candidate) => (
                    <Badge key={candidate.id} variant="outline" size="sm" className="bg-card/80 text-[10px] text-info">
                      {candidate.full_name} · {candidate.matchReason === "name_dob" ? "name + DOB" : candidate.matchReason}
                    </Badge>
                  ))}
                  {signedInDuplicateCandidateCount > 0 ? (
                    <Badge variant="warning" size="sm" className="text-[10px]">
                      {signedInDuplicateCandidateCount} signed-in duplicate{signedInDuplicateCandidateCount === 1 ? "" : "s"} need manual review
                    </Badge>
                  ) : null}
                </span>
              ) : null}
            </div>
            {canMergeLinkedProfiles ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="self-start border-info text-info hover:bg-info/10"
                onClick={() => setShowMergeDialog(true)}
              >
                <GitMerge className="mr-1 h-3.5 w-3.5" />
                Reconcile & sync
              </Button>
            ) : null}
          </div>
        ) : null}
        {/*
          2-row identity grid (compressed 2026-05-21).
          Row 1: Email + Phone. Row 2: Address + Medicare.
          DOB is shown in the identity strip header (line ~337); Member
          since was dropped because it doesn't earn its place above the
          clinical timeline. Saves ~120px of vertical above the timeline
          on the longest operator page.
        */}
        <dl className="grid gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-2">
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
            <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{prescribingIdentifierHeading}</dt>
            <dd className="font-mono text-sm tabular-nums">
              {snapshot.medicare.present ? snapshot.medicare.label : "Not provided"}
            </dd>
            {usingIhiForPrescribing && hasInvalidMedicareNumber ? (
              <p className="text-[11px] text-success">IHI used for prescribing. Invalid Medicare is ignored.</p>
            ) : null}
            {snapshot.medicare.error ? (
              <p className="text-[11px] text-warning">{snapshot.medicare.error}</p>
            ) : null}
            {snapshot.medicare.detailsLabel ? (
              <p className="text-[11px] text-muted-foreground">{snapshot.medicare.detailsLabel}</p>
            ) : null}
          </div>
          {/* Acquisition source: first-touch and last-touch when they differ.
              Staff-only signal; never rendered on patient-facing surfaces. */}
          {firstTouchAttribution ? (
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Source</dt>
              <dd className="mt-1 flex flex-wrap items-start gap-x-6 gap-y-2">
                {showSeparateTouches ? (
                  <>
                    <AttributionChip
                      variant="block"
                      attribution={firstTouchAttribution}
                      contextLabel="First touch"
                    />
                    {lastTouchAttribution ? (
                      <AttributionChip
                        variant="block"
                        attribution={lastTouchAttribution}
                        contextLabel="Most recent"
                      />
                    ) : null}
                  </>
                ) : (
                  <AttributionChip
                    variant="block"
                    attribution={lastTouchAttribution ?? firstTouchAttribution}
                  />
                )}
              </dd>
            </div>
          ) : null}
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
      {intakes.length === 0 && medications.length === 0 && notes.length === 0 ? (
        <Card className="rounded-xl border-dashed border-border/60 bg-card/50">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                No clinical history yet
              </p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                The first request, prescription, or doctor note from this
                patient will appear in the timeline here.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNoteForm(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add a doctor note
            </Button>
          </CardContent>
        </Card>
      ) : (
        <PatientTimeline
          requests={intakes}
          prescriptions={medications}
          notes={notes}
          emails={emailLogs}
          audit={parchmentActivity}
          admin={canMergePatientProfiles}
          title="Patient timeline"
          emptyLabel="No requests, prescriptions, notes, emails, or webhook events recorded for this patient yet."
          initialPageSize={10}
          pageStep={20}
        />
      )}

      {showNoteForm && (
        <Card ref={noteFormRef} className="rounded-xl border-border/50">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">Add patient note</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Internal only. Not visible to the patient.
            </p>
          </CardHeader>
          <CardContent className="px-4 py-3">
            <div className="space-y-3 rounded-lg bg-muted/50 p-4">
              <Textarea
                ref={noteTextareaRef}
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
        title="Reconcile duplicate patient profiles"
        description={`This moves request history, prescriptions, certificates, email logs, notes, consents, follow-ups, repeat Rx requests, and referral credits from ${duplicateDialogSubject} into this canonical patient profile. The duplicate profile row${reconcileDuplicateProfileIds.length === 1 ? "" : "s"} stays archived for audit history, then InstantMed syncs the canonical identity to Parchment. This action cannot be undone.`}
        requiredText="RECONCILE"
        confirmLabel="Reconcile and sync"
        onConfirm={handleMergeLinkedProfiles}
        isPending={isMergePending}
      />
      <TypedConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete empty patient profile"
        description="This permanently deletes only an empty guest/manual patient profile. The server blocks deletion when the profile has a sign-in account, requests, prescriptions, certificates, notes, emails, consents, follow-ups, referral credits, merge audit, or any retained clinical/payment record. This action cannot be undone."
        requiredText="DELETE"
        confirmLabel="Delete patient"
        onConfirm={handleDeletePatientProfile}
        isPending={isDeletePending}
      />
    </div>
  )
}
