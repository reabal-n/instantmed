"use client"

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  FileText,
  GitMerge,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Pill,
  Plus,
  RefreshCw,
  Trash2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { TypedConfirmDialog } from "@/components/ui/typed-confirm-dialog"
import type { AttributionClassificationInput } from "@/lib/analytics/source-classification"
import type { ClinicalProfileDifference } from "@/lib/clinical/case-summary"
import { STAFF_DOCTOR_PATIENTS_HREF, STAFF_IDENTITY_HREF, STAFF_PATIENTS_HREF } from "@/lib/dashboard/routes"
import { buildPatientSnapshot } from "@/lib/doctor/patient-snapshot"
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

interface PatientHealthProfile {
  allergies: string[]
  conditions: string[]
  current_medications: string[]
  blood_type: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  notes: string | null
  updated_at: string
}

type PatientRecordTab = "clinical" | "history" | "operations"

function formatSavedValues(values: string[]): string {
  return values.length > 0 ? values.join(" · ") : "None recorded in saved profile"
}

function renderClinicalProfileValue(
  values: string[],
  difference?: ClinicalProfileDifference,
) {
  const savedValue = formatSavedValues(values)
  if (!difference) return savedValue

  return (
    <div className="space-y-1.5">
      <p>
        <span className="mr-1 text-xs font-medium text-muted-foreground">Saved profile</span>
        <span>{savedValue}</span>
      </p>
      <p className="text-xs text-warning">
        <span className="mr-1 font-semibold">Current request</span>
        <span>{difference.currentRequest}</span>
      </p>
    </div>
  )
}

function joinDistinctValues(...values: Array<string | null | undefined>): string {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim())))).join(" · ")
}

function formatLandingPath(value: string | null | undefined): string {
  if (!value?.trim()) return "Not captured"
  try {
    const url = value.startsWith("http")
      ? new URL(value)
      : new URL(value, "https://instantmed.com.au")
    return url.pathname || "/"
  } catch {
    return value
  }
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
  healthProfile: PatientHealthProfile | null
  clinicalDifferences: ClinicalProfileDifference[]
  comparisonRequestCreatedAt: string | null
  linkedProfileCount: number
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
  healthProfile,
  clinicalDifferences,
  comparisonRequestCreatedAt,
  linkedProfileCount,
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
  const [activeTab, setActiveTab] = useState<PatientRecordTab>("clinical")
  const clinicalDifferenceByKey = new Map(
    clinicalDifferences.map((difference) => [difference.key, difference]),
  )
  const comparisonRequestDate = formatParchmentActivityTime(comparisonRequestCreatedAt)
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

  const handleRefreshParchmentPrescriptions = () => {
    startPrescriptionRefreshTransition(async () => {
      const result = await refreshPatientParchmentPrescriptionsAction(patient.id)
      if (result.success) {
        const syncedCount = result.syncedCount ?? 0
        toast.success(
          syncedCount === 0
            ? "No Parchment prescriptions found"
            : `Refreshed ${syncedCount} Parchment prescription${syncedCount === 1 ? "" : "s"}`,
        )
        router.refresh()
        return
      }

      if ((result.syncedCount ?? 0) > 0) router.refresh()
      toast.error(result.error || "Could not refresh prescriptions from Parchment")
    })
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

  const isSameTouch =
    Boolean(firstTouchAttribution) &&
    Boolean(lastTouchAttribution) &&
    firstTouchAttribution?.created_at === lastTouchAttribution?.created_at
  const attributionTouches = [
    firstTouchAttribution
      ? { label: "First touch", attribution: firstTouchAttribution }
      : null,
    lastTouchAttribution && !isSameTouch
      ? { label: "Most recent", attribution: lastTouchAttribution }
      : null,
  ].filter((touch): touch is { label: string; attribution: PatientTouchAttribution } => touch !== null)
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

  const openNoteComposer = () => {
    setActiveTab("clinical")
    setShowNoteForm(true)
  }

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openNoteComposer}
          >
            <Plus className="h-3.5 w-3.5" />
            Add note
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as PatientRecordTab)}
      >
        <TabsList aria-label="Patient record sections" className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="clinical" className="space-y-4">
          <Card aria-label="Saved clinical profile" className="rounded-xl border-border/50">
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-base">Saved clinical profile</CardTitle>
              <p className="text-xs text-muted-foreground">
                Longitudinal patient-entered history. Read-only in the staff record.
              </p>
            </CardHeader>
            <CardContent className="border-t border-border/40 p-4">
              {healthProfile ? (
                <div className="space-y-4">
                  {clinicalDifferences.length > 0 ? (
                    <div className="rounded-lg border border-warning-border bg-warning-light px-3 py-2">
                      <p className="flex items-center gap-2 text-xs font-semibold text-warning">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Review differences
                      </p>
                      <p className="mt-1 text-xs text-warning/90">
                        Current request answers{comparisonRequestDate ? ` from ${comparisonRequestDate}` : ""} differ from the patient-entered saved profile.
                      </p>
                    </div>
                  ) : null}
                  <dl className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Allergies</dt>
                      <dd className="mt-1 text-sm leading-relaxed text-foreground">
                        {renderClinicalProfileValue(
                          healthProfile.allergies,
                          clinicalDifferenceByKey.get("allergies"),
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Conditions</dt>
                      <dd className="mt-1 text-sm leading-relaxed text-foreground">
                        {renderClinicalProfileValue(
                          healthProfile.conditions,
                          clinicalDifferenceByKey.get("conditions"),
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Current medicines</dt>
                      <dd className="mt-1 text-sm leading-relaxed text-foreground">
                        {renderClinicalProfileValue(
                          healthProfile.current_medications,
                          clinicalDifferenceByKey.get("current_medications"),
                        )}
                      </dd>
                    </div>
                  </dl>
                  {healthProfile.blood_type || healthProfile.notes || healthProfile.emergency_contact_name || healthProfile.emergency_contact_phone ? (
                    <dl className="grid gap-4 border-t border-border/40 pt-4 sm:grid-cols-3">
                      {healthProfile.blood_type ? (
                        <div>
                          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Blood type</dt>
                          <dd className="mt-1 text-sm text-foreground">{healthProfile.blood_type}</dd>
                        </div>
                      ) : null}
                      {healthProfile.emergency_contact_name || healthProfile.emergency_contact_phone ? (
                        <div>
                          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Emergency contact</dt>
                          <dd className="mt-1 text-sm text-foreground">
                            {joinDistinctValues(healthProfile.emergency_contact_name, healthProfile.emergency_contact_phone)}
                          </dd>
                        </div>
                      ) : null}
                      {healthProfile.notes ? (
                        <div>
                          <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Health notes</dt>
                          <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{healthProfile.notes}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                  <p className="text-[11px] text-muted-foreground">
                    Updated {formatParchmentActivityTime(healthProfile.updated_at) ?? "date unavailable"}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No saved allergies, conditions, or medicines recorded.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border/50">
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-base">Identity and contact</CardTitle>
              <p className="text-xs text-muted-foreground">Current details used for prescribing and patient contact.</p>
            </CardHeader>
            <CardContent className="border-t border-border/40 p-4">
              <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                <div className="flex min-w-0 items-start gap-2">
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Email</dt>
                    <dd className="truncate">{snapshot.email.label}</dd>
                  </div>
                </div>
                <div className="flex min-w-0 items-start gap-2">
                  <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Phone</dt>
                    <dd className="tabular-nums">{snapshot.phone.label}</dd>
                  </div>
                </div>
                <div className="flex min-w-0 items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Address</dt>
                    <dd>{snapshot.address.label}</dd>
                    {snapshot.address.verificationLabel ? (
                      <Badge variant={addressVerificationVariant} size="sm" className="mt-1 w-fit text-[10px]">
                        {snapshot.address.verificationLabel}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{prescribingIdentifierHeading}</dt>
                  <dd className="font-mono tabular-nums">
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
              </dl>
            </CardContent>
          </Card>

          {medications.length > 0 || notes.length > 0 ? (
            <PatientTimeline
              prescriptions={medications}
              notes={notes}
              admin={canMergePatientProfiles}
              compact
              maxItems={3}
              title="Recent clinical activity"
              emptyLabel="No recent prescriptions or notes recorded."
            />
          ) : null}

          {showNoteForm ? (
            <Card ref={noteFormRef} className="rounded-xl border-border/50">
              <CardHeader className="px-4 py-3">
                <CardTitle className="text-base">Add patient note</CardTitle>
                <p className="text-xs text-muted-foreground">Internal only. Not visible to the patient.</p>
              </CardHeader>
              <CardContent className="border-t border-border/40 p-4">
                <Textarea
                  ref={noteTextareaRef}
                  placeholder="Add a note about this patient..."
                  value={newNote}
                  onChange={(event) => setNewNote(event.target.value)}
                  className="min-h-[80px]"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setShowNoteForm(false); setNewNote("") }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddNote} disabled={isNotePending || !newNote.trim()}>
                    {isNotePending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                    Save note
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="history">
          {intakes.length === 0 && medications.length === 0 && notes.length === 0 ? (
            <Card className="rounded-xl border-dashed border-border/60 bg-card/50">
              <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">No clinical history yet</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    Requests, prescriptions, and doctor notes will appear here.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={openNoteComposer}>
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
              admin={canMergePatientProfiles}
              title="Clinical history"
              emptyLabel="No requests, prescriptions, or notes recorded for this patient yet."
              initialPageSize={10}
              pageStep={20}
            />
          )}
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
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

          <Card aria-label="Acquisition attribution" className="rounded-xl border-border/50">
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-base">Acquisition</CardTitle>
              <p className="text-xs text-muted-foreground">Where this patient first arrived and their most recent source.</p>
            </CardHeader>
            <CardContent className="border-t border-border/40 p-4">
              {attributionTouches.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {attributionTouches.map(({ label, attribution }) => (
                    <div key={`${label}-${attribution.created_at ?? "unknown"}`} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                      <AttributionChip
                        variant="block"
                        attribution={attribution}
                        contextLabel={label}
                      />
                      <dl className="mt-3 grid gap-2 text-xs">
                        <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-2">
                          <dt className="text-muted-foreground">Landing page</dt>
                          <dd className="break-words text-foreground">{formatLandingPath(attribution.landing_page)}</dd>
                        </div>
                        <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-2">
                          <dt className="text-muted-foreground">Campaign</dt>
                          <dd className="break-words text-foreground">
                            {joinDistinctValues(attribution.utm_campaign, attribution.campaignid) || "Not captured"}
                          </dd>
                        </div>
                        <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-2">
                          <dt className="text-muted-foreground">Keyword</dt>
                          <dd className="break-words text-foreground">
                            {joinDistinctValues(attribution.keyword, attribution.utm_term) || "Not captured"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No acquisition attribution was captured.</p>
              )}
            </CardContent>
          </Card>

          <PatientTimeline
            emails={emailLogs}
            audit={parchmentActivity}
            admin={canMergePatientProfiles}
            title="Operational activity"
            emptyLabel="No email or integration activity recorded for this patient yet."
            initialPageSize={10}
            pageStep={20}
          />

          <Card className="rounded-xl border-border/50">
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-base">Profile administration</CardTitle>
              <p className="text-xs text-muted-foreground">Account state, linked profiles, and protected maintenance actions.</p>
            </CardHeader>
            <CardContent className="space-y-4 border-t border-border/40 p-4">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Account setup</dt>
                  <dd className="mt-1 flex items-center gap-2 text-foreground">
                    {patient.onboarding_completed ? (
                      <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-hidden />
                    )}
                    {patient.onboarding_completed ? "Onboarded" : "Profile setup incomplete"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Linked profiles</dt>
                  <dd className="mt-1 text-foreground">{linkedProfileCount}</dd>
                </div>
              </dl>

              {linkedProfileCount > 1 || reconcileDuplicateProfileIds.length > 0 ? (
                <div className="rounded-lg border border-info/20 bg-info-light/35 p-3 text-xs text-info">
                  <p>
                    {linkedProfileCount > 1
                      ? `History includes ${linkedProfileCount} linked patient profiles.`
                      : "Potential duplicate patient profiles found."}
                  </p>
                  {duplicateCandidates.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
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
                    </div>
                  ) : null}
                  {canMergeLinkedProfiles ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-3 border-info text-info hover:bg-info/10"
                      onClick={() => setShowMergeDialog(true)}
                    >
                      <GitMerge className="mr-1 h-3.5 w-3.5" />
                      Reconcile & sync
                    </Button>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2 border-t border-border/40 pt-4">
                <EditPatientDialog patient={patient} />
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
