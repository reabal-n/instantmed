import { MIN_CLINICAL_NOTES_LENGTH } from "@/lib/doctor/clinical-notes"
import {
  buildPatientSnapshot,
  getPatientSnapshotOptionsForCase,
  type PatientSnapshot,
} from "@/lib/doctor/patient-snapshot"
import { formatDate } from "@/lib/format"
import { formatIntakeStatus, formatServiceType } from "@/lib/format/intake"
import type { IntakeWithDetails, IntakeWithPatient } from "@/types/db"

export type StaffCaseIntake = IntakeWithDetails | IntakeWithPatient

export interface StaffCaseService {
  name?: string | null
  type?: string | null
  short_name?: string | null
}

export interface StaffCaseSummary {
  patientName: string
  serviceLabel: string
  serviceShortLabel: string
  statusLabel: string
  actionLabel: string
  notesLength: number
  notesReady: boolean
  notesLabel: string
  previousLabel: string
  profileHref: string
  adminProfileHref: string
  snapshot: PatientSnapshot
  isDone: boolean
  isLowPriority: boolean
}

export interface BuildStaffCaseSummaryInput {
  intake: StaffCaseIntake
  answers?: Record<string, unknown>
  previousIntakes?: IntakeWithPatient[]
  service?: StaffCaseService
  doctorNotes?: string | null
}

const DONE_STATUSES = new Set(["completed", "declined", "cancelled", "expired"])

export function resolveStaffCaseActionLabel(
  intake: Pick<StaffCaseIntake, "status">,
  serviceType?: string | null,
): string {
  if (intake.status === "pending_info") return "Waiting on patient"
  if (intake.status === "awaiting_script") return "Send script"
  if (intake.status === "approved") return "Finish delivery"
  if (intake.status === "completed") return "Complete"
  if (intake.status === "declined") return "Declined"
  if (serviceType === "med_certs") return "Approve certificate"
  if (serviceType === "common_scripts" || serviceType === "repeat_rx") return "Prescribe"
  return "Approve or decline"
}

export function getStaffCaseServiceLabel(service?: StaffCaseService): string {
  return service?.short_name || service?.name || formatServiceType(service?.type || "")
}

export function buildStaffCaseSummary({
  intake,
  answers = {},
  previousIntakes = [],
  service: serviceProp,
  doctorNotes,
}: BuildStaffCaseSummaryInput): StaffCaseSummary {
  const service = serviceProp ?? (intake.service as StaffCaseService | undefined)
  const serviceLabel = getStaffCaseServiceLabel(service)
  const snapshotContext = {
    answers,
    category: intake.category,
    serviceType: service?.type,
    subtype: intake.subtype,
  }
  const snapshot = buildPatientSnapshot(intake.patient, {
    ...getPatientSnapshotOptionsForCase(snapshotContext),
    answers,
  })
  const previous = previousIntakes[0]
  const previousService = previous?.service as StaffCaseService | undefined
  const previousLabel = previous
    ? [
        getStaffCaseServiceLabel(previousService),
        formatIntakeStatus(previous.status),
        formatDate(previous.created_at),
      ]
        .filter(Boolean)
        .join(" · ")
    : "First request"
  const notesLength = (doctorNotes ?? intake.doctor_notes ?? "").trim().length
  const notesReady =
    notesLength >= MIN_CLINICAL_NOTES_LENGTH ||
    ["approved", "awaiting_script", "completed", "declined"].includes(intake.status)

  return {
    patientName: snapshot.name,
    serviceLabel,
    serviceShortLabel: service?.short_name || service?.name || serviceLabel,
    statusLabel: formatIntakeStatus(intake.status),
    actionLabel: resolveStaffCaseActionLabel(intake, service?.type),
    notesLength,
    notesReady,
    notesLabel: notesReady ? "Notes ready" : `${notesLength}/${MIN_CLINICAL_NOTES_LENGTH} notes`,
    previousLabel,
    profileHref: snapshot.profileHref,
    adminProfileHref: `/admin/patients/${snapshot.id}`,
    snapshot,
    isDone: DONE_STATUSES.has(intake.status),
    isLowPriority: !intake.is_priority && intake.risk_tier === "low",
  }
}
