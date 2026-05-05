import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

const PARCHMENT_PRESCRIPTION_EVENT = "parchment:prescription.created"

const RETRYABLE_REASONS = new Set([
  "prescription_sync_failed",
  "prescription_not_found",
  "prescription_upsert_failed",
  "prescriber_not_linked",
  "patient_not_found",
  "no_awaiting_script_intake",
  "script_completion_failed",
  "script_completion_resume_failed",
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
  full_name: string | null
  email: string | null
  role: string
  parchment_user_id?: string | null
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

export interface ParchmentOpsDashboard {
  stats: {
    linkedPrescribers: number
    unlinkedPrescribers: number
    syncedPatients: number
    unsyncedPatients: number
    failedWebhooks7d: number
    retryableFailures: number
    syncedPrescriptions7d: number
  }
  linkedPrescribers: Array<{
    id: string
    name: string
    email: string | null
    role: string
    parchmentUserId: string
  }>
  failedWebhooks: ParchmentFailedWebhook[]
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

function compactIds(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
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
    linkedPrescribersResult,
    unlinkedPrescribersResult,
    syncedPatientsResult,
    unsyncedPatientsResult,
    failedWebhooksResult,
    recentPrescriptionsResult,
    syncedPrescriptions7dResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, parchment_user_id")
      .in("role", ["doctor", "admin"])
      .not("parchment_user_id", "is", null)
      .order("full_name", { ascending: true }),

    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("role", ["doctor", "admin"])
      .is("parchment_user_id", null),

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
  ])

  const failedWebhooks = ((failedWebhooksResult.data || []) as AuditFailureRow[])
    .map(mapParchmentFailedWebhook)
    .filter((failure): failure is ParchmentFailedWebhook => failure !== null)

  const prescriptions = (recentPrescriptionsResult.data || []) as PrescriptionRow[]
  const profileNames = await getProfilesById(
    supabase,
    compactIds([
      ...prescriptions.map((prescription) => prescription.patient_id),
      ...prescriptions.map((prescription) => prescription.prescriber_id),
    ]),
  )

  const linkedPrescribers = ((linkedPrescribersResult.data || []) as ProfileSummaryRow[])
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
      unlinkedPrescribers: unlinkedPrescribersResult.count || 0,
      syncedPatients: syncedPatientsResult.count || 0,
      unsyncedPatients: unsyncedPatientsResult.count || 0,
      failedWebhooks7d: failedWebhooks.length,
      retryableFailures: failedWebhooks.filter((failure) => failure.retryable).length,
      syncedPrescriptions7d: syncedPrescriptions7dResult.count || 0,
    },
    linkedPrescribers,
    failedWebhooks,
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
