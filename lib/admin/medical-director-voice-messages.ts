import "server-only"

import { z } from "zod"

import {
  VOICE_MESSAGE_RESOLUTION_REASONS,
  VOICE_MESSAGE_STATUSES,
  type VoiceMessageResolutionReason,
  type VoiceMessageStatus,
} from "@/lib/admin/medical-director-voice-message-types"
import { logAuditEvent } from "@/lib/security/audit-log"
import { decryptJSONB, isEncryptedPHI } from "@/lib/security/phi-encryption"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  MEDICAL_DIRECTOR_VOICE_CATEGORY_LABELS,
  MEDICAL_DIRECTOR_VOICE_MESSAGE_CATEGORIES,
  type MedicalDirectorVoiceMessageCategory,
  type MedicalDirectorVoiceMessagePayload,
  PATIENT_MATCH_STATES,
  type PatientMatchState,
} from "@/lib/twilio/medical-director-voice-message"

const listRowSchema = z.object({
  callback_requested: z.boolean(),
  category: z.enum(MEDICAL_DIRECTOR_VOICE_MESSAGE_CATEGORIES),
  created_at: z.string(),
  id: z.string().uuid(),
  patient_details_complete: z.boolean(),
  patient_match_state: z.enum(PATIENT_MATCH_STATES),
  status: z.enum(VOICE_MESSAGE_STATUSES),
})

interface VoiceMessageListItem {
  callbackRequested: boolean
  category: MedicalDirectorVoiceMessageCategory
  categoryLabel: string
  createdAt: string
  id: string
  patientDetailsComplete: boolean
  patientMatchState: PatientMatchState
  status: VoiceMessageStatus
}

export interface VoiceMessageInbox {
  counts: Record<VoiceMessageStatus, number>
  items: VoiceMessageListItem[]
  status: VoiceMessageStatus
}

export interface VoiceMessageDetail extends VoiceMessageListItem {
  claimedAt: string | null
  claimedBy: string | null
  payload: MedicalDirectorVoiceMessagePayload
  reopenedAt: string | null
  resolutionReason: VoiceMessageResolutionReason | null
  resolvedAt: string | null
  suggestedPatient: { id: string; fullName: string } | null
}

async function countStatus(status: VoiceMessageStatus): Promise<number> {
  const supabase = createServiceRoleClient()
  const { count, error } = await supabase
    .from("medical_director_voice_messages")
    .select("id", { count: "exact", head: true })
    .eq("status", status)
  if (error || count === null) throw new Error("Could not count voice messages")
  return count
}

export async function getMedicalDirectorVoiceMessageInbox(
  status: VoiceMessageStatus,
): Promise<VoiceMessageInbox> {
  const supabase = createServiceRoleClient()
  const [{ data, error }, newCount, inReviewCount, resolvedCount] =
    await Promise.all([
      supabase
        .from("medical_director_voice_messages")
        .select(
          "id, category, callback_requested, patient_details_complete, patient_match_state, status, created_at",
        )
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(100),
      countStatus("new"),
      countStatus("in_review"),
      countStatus("resolved"),
    ])

  if (error) throw new Error("Could not load Medical Director voice inbox")
  const items = (data ?? []).map((row) => {
    const parsed = listRowSchema.parse(row)
    return {
      callbackRequested: parsed.callback_requested,
      category: parsed.category,
      categoryLabel: MEDICAL_DIRECTOR_VOICE_CATEGORY_LABELS[parsed.category],
      createdAt: parsed.created_at,
      id: parsed.id,
      patientDetailsComplete: parsed.patient_details_complete,
      patientMatchState: parsed.patient_match_state,
      status: parsed.status,
    }
  })

  return {
    counts: {
      new: newCount,
      in_review: inReviewCount,
      resolved: resolvedCount,
    },
    items,
    status,
  }
}

export async function getMedicalDirectorVoiceMessageDetail(
  id: string,
  actorId: string,
): Promise<VoiceMessageDetail | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("medical_director_voice_messages")
    .select(
      "id, payload_enc, category, callback_requested, patient_details_complete, patient_match_state, suggested_patient_id, status, claimed_at, claimed_by, resolved_at, resolution_reason, reopened_at, created_at",
    )
    .eq("id", id)
    .maybeSingle()

  if (error) throw new Error("Could not load Medical Director voice message")
  if (!data) return null
  if (!isEncryptedPHI(data.payload_enc)) {
    throw new Error("Medical Director voice message payload is not encrypted")
  }

  const payload = await decryptJSONB<MedicalDirectorVoiceMessagePayload>(
    data.payload_enc,
  )
  const category = z.enum(MEDICAL_DIRECTOR_VOICE_MESSAGE_CATEGORIES)
    .parse(data.category)
  const status = z.enum(VOICE_MESSAGE_STATUSES).parse(data.status)
  const patientMatchState = z.enum(PATIENT_MATCH_STATES)
    .parse(data.patient_match_state)
  const resolutionReason = data.resolution_reason
    ? z.enum(VOICE_MESSAGE_RESOLUTION_REASONS).parse(data.resolution_reason)
    : null

  let suggestedPatient: VoiceMessageDetail["suggestedPatient"] = null
  if (data.suggested_patient_id) {
    const { data: patient } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", data.suggested_patient_id)
      .eq("role", "patient")
      .maybeSingle()
    if (patient) {
      suggestedPatient = {
        id: patient.id as string,
        fullName: (patient.full_name as string | null) || "Patient",
      }
    }
  }

  await logAuditEvent({
    action: "admin_action",
    actorId,
    actorType: "admin",
    metadata: {
      action_type: "medical_director_voice_message_viewed",
      voice_record_id: id,
    },
  })

  return {
    callbackRequested: Boolean(data.callback_requested),
    category,
    categoryLabel: MEDICAL_DIRECTOR_VOICE_CATEGORY_LABELS[category],
    claimedAt: (data.claimed_at as string | null) ?? null,
    claimedBy: (data.claimed_by as string | null) ?? null,
    createdAt: data.created_at as string,
    id: data.id as string,
    patientDetailsComplete: Boolean(data.patient_details_complete),
    patientMatchState,
    payload,
    reopenedAt: (data.reopened_at as string | null) ?? null,
    resolutionReason,
    resolvedAt: (data.resolved_at as string | null) ?? null,
    status,
    suggestedPatient,
  }
}

export async function claimMedicalDirectorVoiceMessage(
  id: string,
  actorId: string,
): Promise<boolean> {
  const now = new Date().toISOString()
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("medical_director_voice_messages")
    .update({
      claimed_at: now,
      claimed_by: actorId,
      status: "in_review",
    })
    .eq("id", id)
    .eq("status", "new")
    .select("id")
    .maybeSingle()
  if (error) throw new Error("Could not take ownership of voice message")
  if (!data) return false

  await logAuditEvent({
    action: "admin_action",
    actorId,
    actorType: "admin",
    metadata: {
      action_type: "medical_director_voice_message_claimed",
      voice_record_id: id,
    },
  })
  return true
}

export async function resolveMedicalDirectorVoiceMessage(
  id: string,
  actorId: string,
  reason: VoiceMessageResolutionReason,
): Promise<boolean> {
  const now = new Date().toISOString()
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("medical_director_voice_messages")
    .update({
      resolution_reason: reason,
      resolved_at: now,
      resolved_by: actorId,
      status: "resolved",
    })
    .eq("id", id)
    .eq("status", "in_review")
    .select("id")
    .maybeSingle()
  if (error) throw new Error("Could not resolve voice message")
  if (!data) return false

  await logAuditEvent({
    action: "admin_action",
    actorId,
    actorType: "admin",
    metadata: {
      action_type: "medical_director_voice_message_resolved",
      resolution_reason: reason,
      voice_record_id: id,
    },
  })
  return true
}

export async function reopenMedicalDirectorVoiceMessage(
  id: string,
  actorId: string,
): Promise<boolean> {
  const now = new Date().toISOString()
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("medical_director_voice_messages")
    .update({
      claimed_at: now,
      claimed_by: actorId,
      reopened_at: now,
      reopened_by: actorId,
      resolution_reason: null,
      resolved_at: null,
      resolved_by: null,
      status: "in_review",
    })
    .eq("id", id)
    .eq("status", "resolved")
    .select("id")
    .maybeSingle()
  if (error) throw new Error("Could not reopen voice message")
  if (!data) return false

  await logAuditEvent({
    action: "admin_action",
    actorId,
    actorType: "admin",
    metadata: {
      action_type: "medical_director_voice_message_reopened",
      voice_record_id: id,
    },
  })
  return true
}

export async function updateMedicalDirectorVoiceMessageMatch(
  id: string,
  actorId: string,
  patientId: string | null,
): Promise<boolean> {
  const supabase = createServiceRoleClient()
  if (patientId) {
    const { data: patient } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", patientId)
      .eq("role", "patient")
      .is("merged_into_profile_id", null)
      .maybeSingle()
    if (!patient) throw new Error("Patient profile not found")
  }

  const { data, error } = await supabase
    .from("medical_director_voice_messages")
    .update({
      patient_match_state: patientId ? "suggested" : "unmatched",
      suggested_patient_id: patientId,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle()
  if (error) throw new Error("Could not update suggested patient match")
  if (!data) return false

  await logAuditEvent({
    action: "admin_action",
    actorId,
    actorType: "admin",
    metadata: {
      action_type: "medical_director_voice_message_match_updated",
      match_set: Boolean(patientId),
      voice_record_id: id,
    },
  })
  return true
}
