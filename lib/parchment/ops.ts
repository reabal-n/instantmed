import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { SYSTEM_AUTO_APPROVE_ID } from "@/lib/constants"

const PARCHMENT_PRESCRIPTION_EVENT = "parchment:prescription.created"

const RETRYABLE_REASONS = new Set([
  "prescription_sync_failed",
  "prescription_not_found",
  "prescription_upsert_failed",
  "prescriber_not_linked",
  "patient_not_found",
  "script_completion_failed",
  "script_completion_resume_failed",
])

const NON_ACTIONABLE_WEBHOOK_FAILURE_REASONS = new Set([
  "no_awaiting_script_intake",
])

type Metadata = Record<string, unknown> | null

interface AuditFailureRow {
  id: string
  action: string
  intake_id: string | null
  created_at: string
  description: string | null
  metadata: Metadata
}

interface PrescriptionRow {
  id: string
  patient_id: string
  prescriber_id: string | null
  intake_id: string | null
  medication_name: string
  status: string
  issued_date: string | null
  updated_at: string | null
  created_at: string | null
  parchment_reference: string | null
}

interface ProfileSummaryRow {
  id: string
  can_prescribe_s4?: boolean | null
  can_prescribe_s8?: boolean | null
  full_name: string | null
  email: string | null
  role: string
  parchment_user_id?: string | null
}

interface CronHeartbeatRow {
  last_duration_ms: number | null
  last_run_at: string | null
  last_status: string | null
}

interface StaleScriptHandoffRow {
  id: string
  patient_id: string | null
  reference_number: string | null
  status: string
  updated_at: string | null
  created_at: string | null
  paid_at: string | null
}

export interface ParchmentFailedWebhook {
  id: string
  eventId: string | null
  reason: string
  intakeId: string | null
  createdAt: string
  description: string
  scid: string | null
  parchmentPatientId: string | null
  partnerPatientId: string | null
  prescriberUserId: string | null
  patientProfileId: string | null
  prescriberProfileId: string | null
  retryable: boolean
}

export interface ParchmentHandoffRecoveryItem {
  id: string
  kind: "failed_webhook" | "stale_script_handoff"
  label: string
  reason: string
  detail: string
  createdAt: string
  intakeId: string | null
  patientProfileId: string | null
  retryable: boolean
}

export interface ParchmentOpsEvent {
  id: string
  status: "success" | "warning" | "destructive" | "info"
  label: string
  detail: string
  createdAt: string
  eventId: string | null
  scid: string | null
  intakeId: string | null
  patientProfileId: string | null
  prescriberProfileId: string | null
}

export interface ParchmentOpsDashboard {
  stats: {
    linkedPrescribers: number
    unlinkedPrescribers: number
    syncedPatients: number
    unsyncedPatients: number
    failedWebhooks7d: number
    retryableFailures: number
    historicalWebhookFailures7d: number
    syncedPrescriptions7d: number
    handoffRecovery: number
  }
  linkedPrescribers: Array<{
    id: string
    name: string
    email: string | null
    role: string
    parchmentUserId: string
  }>
  failedWebhooks: ParchmentFailedWebhook[]
  handoffRecovery: ParchmentHandoffRecoveryItem[]
  historicalWebhookFailures: ParchmentFailedWebhook[]
  productionSmoke: {
    lastDurationMs: number | null
    lastRunAt: string | null
    lastStatus: string | null
  } | null
  recentEvents: ParchmentOpsEvent[]
  recentPrescriptions: Array<{
    id: string
    patientId: string
    patientName: string
    prescriberName: string | null
    medicationName: string
    status: string
    issuedDate: string | null
    updatedAt: string | null
    parchmentReference: string | null
    intakeId: string | null
  }>
}

function mapFailedWebhookRecovery(failure: ParchmentFailedWebhook): ParchmentHandoffRecoveryItem {
  return {
    id: `webhook:${failure.id}`,
    kind: "failed_webhook",
    label: "Webhook retry",
    reason: failure.reason,
    detail: failure.retryable
      ? "Parchment sent the prescription event, but InstantMed needs a retry to sync or complete the script."
      : failure.description,
    createdAt: failure.createdAt,
    intakeId: failure.intakeId,
    patientProfileId: failure.patientProfileId,
    retryable: failure.retryable,
  }
}

function mapStaleScriptHandoff(row: StaleScriptHandoffRow): ParchmentHandoffRecoveryItem {
  const reference = row.reference_number ? ` ${row.reference_number}` : ""
  return {
    id: `stale:${row.id}`,
    kind: "stale_script_handoff",
    label: "Script handoff pending",
    reason: `Awaiting script${reference}`,
    detail: "The case is in awaiting_script without a Parchment reference or sent-script timestamp. Open it and complete the embedded prescribing handoff.",
    createdAt: row.updated_at || row.paid_at || row.created_at || new Date(0).toISOString(),
    intakeId: row.id,
    patientProfileId: row.patient_id,
    retryable: false,
  }
}

function getString(metadata: Metadata, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function isParchmentPrescriptionFailure(metadata: Metadata): boolean {
  return getString(metadata, "eventType") === PARCHMENT_PRESCRIPTION_EVENT
}

function buildFailureDescription(row: AuditFailureRow, reason: string, eventId: string | null): string {
  if (row.description?.trim()) return row.description.trim()
  return [
    `Parchment prescription webhook failed: ${reason}`,
    eventId ? `(${eventId})` : null,
  ].filter(Boolean).join(" ")
}

function isRetryableParchmentFailure(failure: {
  reason: string
  scid: string | null
  parchmentPatientId: string | null
  prescriberUserId: string | null
  patientProfileId: string | null
  partnerPatientId: string | null
}): boolean {
  return RETRYABLE_REASONS.has(failure.reason)
    && Boolean(failure.scid)
    && Boolean(failure.parchmentPatientId)
    && Boolean(failure.prescriberUserId)
    && Boolean(failure.patientProfileId || failure.partnerPatientId)
}

function isNonActionableWebhookFailure(failure: ParchmentFailedWebhook): boolean {
  return NON_ACTIONABLE_WEBHOOK_FAILURE_REASONS.has(failure.reason) && !failure.intakeId
}

export function mapParchmentFailedWebhook(row: AuditFailureRow): ParchmentFailedWebhook | null {
  if (row.action !== "webhook_failed" || !isParchmentPrescriptionFailure(row.metadata)) {
    return null
  }

  const reason = getString(row.metadata, "error") || "unknown_error"
  const eventId = getString(row.metadata, "eventId")
  const failure = {
    id: row.id,
    eventId,
    reason,
    intakeId: row.intake_id,
    createdAt: row.created_at,
    description: buildFailureDescription(row, reason, eventId),
    scid: getString(row.metadata, "scid"),
    parchmentPatientId: getString(row.metadata, "parchment_patient_id"),
    partnerPatientId: getString(row.metadata, "partner_patient_id"),
    prescriberUserId: getString(row.metadata, "prescriber_user_id"),
    patientProfileId: getString(row.metadata, "patient_profile_id"),
    prescriberProfileId: getString(row.metadata, "prescriber_profile_id"),
    retryable: false,
  }

  return {
    ...failure,
    retryable: isRetryableParchmentFailure(failure),
  }
}

function mapParchmentOpsEvent(row: AuditFailureRow): ParchmentOpsEvent | null {
  const actionType = getString(row.metadata, "action_type")
  const eventId = getString(row.metadata, "event_id") || getString(row.metadata, "eventId")
  const scid = getString(row.metadata, "scid") || getString(row.metadata, "parchmentReference")
  const patientProfileId = getString(row.metadata, "patient_profile_id") || getString(row.metadata, "partner_patient_id")
  const prescriberProfileId = getString(row.metadata, "prescriber_profile_id")

  if (row.action === "webhook_failed" && isParchmentPrescriptionFailure(row.metadata)) {
    const reason = getString(row.metadata, "error") || "unknown_error"
    return {
      id: row.id,
      status: "destructive",
      label: "Webhook failed",
      detail: buildFailureDescription(row, reason, eventId),
      createdAt: row.created_at,
      eventId,
      scid,
      intakeId: row.intake_id,
      patientProfileId,
      prescriberProfileId,
    }
  }

  if (actionType === "parchment_webhook_script_sent") {
    return {
      id: row.id,
      status: "success",
      label: "Webhook confirmed script sent",
      detail: "Parchment fired prescription.created, InstantMed synced the script, and the PMS marked it sent.",
      createdAt: row.created_at,
      eventId,
      scid,
      intakeId: row.intake_id,
      patientProfileId,
      prescriberProfileId,
    }
  }

  if (actionType === "parchment_webhook_prescription_synced") {
    return {
      id: row.id,
      status: "success",
      label: "Webhook synced prescription",
      detail: "Parchment fired prescription.created and InstantMed stored the prescription on the patient profile.",
      createdAt: row.created_at,
      eventId,
      scid,
      intakeId: row.intake_id,
      patientProfileId,
      prescriberProfileId,
    }
  }

  if (actionType === "parchment_webhook_already_processed") {
    return {
      id: row.id,
      status: "info",
      label: "Duplicate webhook ignored",
      detail: "InstantMed received a duplicate Parchment event and kept the existing synced record.",
      createdAt: row.created_at,
      eventId,
      scid,
      intakeId: row.intake_id,
      patientProfileId,
      prescriberProfileId,
    }
  }

  if (actionType === "parchment_webhook_retry") {
    const result = getString(row.metadata, "result") || "unknown"
    return {
      id: row.id,
      status: result === "success" ? "success" : "warning",
      label: result === "success" ? "Manual retry succeeded" : "Manual retry failed",
      detail: result === "success"
        ? "An admin manually re-fetched the Parchment prescription and synced it to the PMS."
        : `Manual Parchment retry did not complete: ${getString(row.metadata, "reason") || "unknown reason"}.`,
      createdAt: row.created_at,
      eventId,
      scid,
      intakeId: row.intake_id,
      patientProfileId,
      prescriberProfileId,
    }
  }

  if (actionType === "patient_profile_parchment_prescriptions_refreshed") {
    return {
      id: row.id,
      status: "info",
      label: "Patient prescriptions refreshed",
      detail: "A doctor manually refreshed this patient's Parchment prescription list from the PMS.",
      createdAt: row.created_at,
      eventId,
      scid,
      intakeId: row.intake_id,
      patientProfileId,
      prescriberProfileId,
    }
  }

  return null
}

function compactIds(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function isPrescribingCapableProfile(profile: ProfileSummaryRow): boolean {
  if (profile.id === SYSTEM_AUTO_APPROVE_ID) return false

  return profile.role === "admin"
    || profile.can_prescribe_s4 === true
    || profile.can_prescribe_s8 === true
}

async function getProfilesById(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, { full_name: string | null; email: string | null }>> {
  if (ids.length === 0) return new Map()

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids)

  return new Map(
    ((data || []) as Array<{ id: string; full_name: string | null; email: string | null }>)
      .map((profile) => [profile.id, { full_name: profile.full_name, email: profile.email }]),
  )
}

export async function getParchmentOpsDashboard(
  supabase: SupabaseClient,
): Promise<ParchmentOpsDashboard> {
  const now = Date.now()
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    prescriberProfilesResult,
    syncedPatientsResult,
    unsyncedPatientsResult,
    failedWebhooksResult,
    recentEventsResult,
    recentPrescriptionsResult,
    syncedPrescriptions7dResult,
    staleScriptHandoffsResult,
    productionSmokeResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, parchment_user_id, can_prescribe_s4, can_prescribe_s8")
      .in("role", ["doctor", "admin"])
      .order("full_name", { ascending: true }),

    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "patient")
      .is("merged_into_profile_id", null)
      .not("parchment_patient_id", "is", null),

    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "patient")
      .is("merged_into_profile_id", null)
      .is("parchment_patient_id", null),

    supabase
      .from("audit_logs")
      .select("id, action, intake_id, created_at, description, metadata")
      .eq("action", "webhook_failed")
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: false })
      .limit(50),

    supabase
      .from("audit_logs")
      .select("id, action, intake_id, created_at, description, metadata")
      .in("action", ["admin_action", "webhook_failed"])
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: false })
      .limit(50),

    supabase
      .from("prescriptions")
      .select("id, patient_id, prescriber_id, intake_id, medication_name, status, issued_date, updated_at, created_at, parchment_reference")
      .not("parchment_reference", "is", null)
      .order("updated_at", { ascending: false })
      .limit(10),

    supabase
      .from("prescriptions")
      .select("id", { count: "exact", head: true })
      .not("parchment_reference", "is", null)
      .gte("updated_at", weekAgo),

    supabase
      .from("intakes")
      .select("id, patient_id, reference_number, status, updated_at, created_at, paid_at")
      .eq("status", "awaiting_script")
      .eq("script_sent", false)
      .is("parchment_reference", null)
      .lt("updated_at", new Date(now - 45 * 60 * 1000).toISOString())
      .order("updated_at", { ascending: true })
      .limit(20),

    supabase
      .from("cron_heartbeats")
      .select("last_run_at, last_status, last_duration_ms")
      .eq("job_name", "parchment-smoke")
      .maybeSingle(),
  ])

  const failedWebhooks = ((failedWebhooksResult.data || []) as AuditFailureRow[])
    .map(mapParchmentFailedWebhook)
    .filter((failure): failure is ParchmentFailedWebhook => failure !== null)
  const historicalWebhookFailures = failedWebhooks.filter(isNonActionableWebhookFailure)
  const actionableFailures = failedWebhooks.filter((failure) => !isNonActionableWebhookFailure(failure))
  const staleScriptHandoffs = ((staleScriptHandoffsResult.data || []) as StaleScriptHandoffRow[])
    .map(mapStaleScriptHandoff)
  const handoffRecovery = [
    ...actionableFailures.map(mapFailedWebhookRecovery),
    ...staleScriptHandoffs,
  ].slice(0, 20)
  const recentEvents = ((recentEventsResult.data || []) as AuditFailureRow[])
    .map(mapParchmentOpsEvent)
    .filter((event): event is ParchmentOpsEvent => event !== null && event.status !== "destructive")
    .slice(0, 12)

  const prescriptions = (recentPrescriptionsResult.data || []) as PrescriptionRow[]
  const profileNames = await getProfilesById(
    supabase,
    compactIds([
      ...prescriptions.map((prescription) => prescription.patient_id),
      ...prescriptions.map((prescription) => prescription.prescriber_id),
    ]),
  )

  const prescribingCapableProfiles = ((prescriberProfilesResult.data || []) as ProfileSummaryRow[])
    .filter(isPrescribingCapableProfile)
  const linkedPrescribers = prescribingCapableProfiles
    .filter((profile) => typeof profile.parchment_user_id === "string" && profile.parchment_user_id.trim())
    .map((profile) => ({
      id: profile.id,
      name: profile.full_name || "Unnamed prescriber",
      email: profile.email,
      role: profile.role,
      parchmentUserId: profile.parchment_user_id!.trim(),
    }))

  return {
    stats: {
      linkedPrescribers: linkedPrescribers.length,
      unlinkedPrescribers: prescribingCapableProfiles.length - linkedPrescribers.length,
      syncedPatients: syncedPatientsResult.count || 0,
      unsyncedPatients: unsyncedPatientsResult.count || 0,
      failedWebhooks7d: actionableFailures.length,
      retryableFailures: actionableFailures.filter((failure) => failure.retryable).length,
      historicalWebhookFailures7d: historicalWebhookFailures.length,
      syncedPrescriptions7d: syncedPrescriptions7dResult.count || 0,
      handoffRecovery: handoffRecovery.length,
    },
    linkedPrescribers,
    failedWebhooks: actionableFailures,
    handoffRecovery,
    historicalWebhookFailures,
    productionSmoke: productionSmokeResult.data
      ? {
          lastDurationMs: (productionSmokeResult.data as CronHeartbeatRow).last_duration_ms,
          lastRunAt: (productionSmokeResult.data as CronHeartbeatRow).last_run_at,
          lastStatus: (productionSmokeResult.data as CronHeartbeatRow).last_status,
        }
      : null,
    recentEvents,
    recentPrescriptions: prescriptions.map((prescription) => ({
      id: prescription.id,
      patientId: prescription.patient_id,
      patientName: profileNames.get(prescription.patient_id)?.full_name || "Unknown patient",
      prescriberName: prescription.prescriber_id
        ? profileNames.get(prescription.prescriber_id)?.full_name || "Unknown prescriber"
        : null,
      medicationName: prescription.medication_name,
      status: prescription.status,
      issuedDate: prescription.issued_date,
      updatedAt: prescription.updated_at || prescription.created_at,
      parchmentReference: prescription.parchment_reference,
      intakeId: prescription.intake_id,
    })),
  }
}
