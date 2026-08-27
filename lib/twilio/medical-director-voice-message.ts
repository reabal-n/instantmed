import "server-only"

import { createHmac } from "node:crypto"

import { z } from "zod"

import {
  sendMedicalDirectorVoiceMessageViaTelegram,
  sendMedicalDirectorVoiceReminderViaTelegram,
  type VoiceMessageAlertReceipt,
} from "@/lib/notifications/telegram"
import { decryptField } from "@/lib/security/encryption"
import { type EncryptedPHI, encryptJSONB } from "@/lib/security/phi-encryption"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const MEDICAL_DIRECTOR_VOICE_MESSAGE_CATEGORIES = [
  "medical_certificate",
  "prescription",
  "payment_refund",
  "account_technical",
  "complaint",
  "other",
] as const

export type MedicalDirectorVoiceMessageCategory =
  (typeof MEDICAL_DIRECTOR_VOICE_MESSAGE_CATEGORIES)[number]

export const MEDICAL_DIRECTOR_VOICE_CATEGORY_LABELS:
  Record<MedicalDirectorVoiceMessageCategory, string> = {
    medical_certificate: "Medical certificate",
    prescription: "Prescription",
    payment_refund: "Payment or refund",
    account_technical: "Account or technical",
    complaint: "Complaint",
    other: "Other",
  }

export const PATIENT_MATCH_STATES = [
  "suggested",
  "unmatched",
  "ambiguous",
  "incomplete",
] as const

export type PatientMatchState = (typeof PATIENT_MATCH_STATES)[number]

export interface MedicalDirectorVoiceMessagePayload {
  callbackNumber: string | null
  confirmedSummary: string
  dateOfBirth: string | null
  patientFullName: string | null
}

const optionalText = (max: number) =>
  z.string().trim().min(1).max(max).optional()

const voiceMessageInputSchema = z.object({
  callbackNumber: optionalText(64),
  callbackRequested: z.boolean(),
  callSid: z.string().regex(/^CA[a-fA-F0-9]{32}$/),
  category: z.enum(MEDICAL_DIRECTOR_VOICE_MESSAGE_CATEGORIES),
  confirmedAt: z.string().datetime(),
  confirmedSummary: z.string().trim().min(3).max(1_000),
  dateOfBirth: optionalText(10).refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Date of birth must use YYYY-MM-DD",
  ),
  patientFullName: optionalText(120),
}).superRefine((value, context) => {
  if (value.callbackRequested && !value.callbackNumber) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A callback number is required when a callback is requested",
      path: ["callbackNumber"],
    })
  }
  if (!value.callbackRequested && value.callbackNumber) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Do not retain a phone number when no callback was requested",
      path: ["callbackNumber"],
    })
  }
})

export type MedicalDirectorVoiceMessageInput = z.infer<typeof voiceMessageInputSchema>

interface PatientMatch {
  state: PatientMatchState
  suggestedPatientId: string | null
}

interface InsertResult {
  alertAlreadyDelivered?: boolean
  created: boolean
  createdAt: string
  id: string
}

type EncryptedPayload = EncryptedPHI | Record<string, unknown>

export interface MedicalDirectorVoiceMessageDependencies {
  claimAlert: (id: string) => Promise<boolean>
  encrypt: (payload: MedicalDirectorVoiceMessagePayload) => Promise<EncryptedPayload>
  fingerprintCallSid: (callSid: string) => string
  insert: (row: Record<string, unknown>) => Promise<InsertResult>
  markAlert: (id: string, receipt: VoiceMessageAlertReceipt) => Promise<void>
  matchPatient: (fullName?: string, dateOfBirth?: string) => Promise<PatientMatch>
  sendAlert: (
    id: string,
    category: MedicalDirectorVoiceMessageCategory,
    createdAt: string,
  ) => Promise<VoiceMessageAlertReceipt>
}

export interface MedicalDirectorVoiceMessageResult {
  alertDelivered: boolean
  created: boolean
  id: string
}

function normalizeName(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ")
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

function readCandidateDateOfBirth(row: Record<string, unknown>): string | null {
  if (typeof row.date_of_birth_encrypted === "string") {
    try {
      return decryptField<string>(row.date_of_birth_encrypted)
    } catch {
      return null
    }
  }
  return typeof row.date_of_birth === "string" ? row.date_of_birth : null
}

export function fingerprintTwilioCallSid(callSid: string): string {
  const secret = process.env.TWILIO_VOICE_SESSION_SECRET?.trim()
  if (!secret) throw new Error("TWILIO_VOICE_SESSION_SECRET is not configured")
  return createHmac("sha256", secret)
    .update(`medical-director-voice-message:${callSid}`)
    .digest("hex")
}

async function findSuggestedPatient(
  fullName?: string,
  dateOfBirth?: string,
): Promise<PatientMatch> {
  if (!fullName || !dateOfBirth) {
    return { state: "incomplete", suggestedPatientId: null }
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, date_of_birth, date_of_birth_encrypted")
    .eq("role", "patient")
    .ilike("full_name", escapeIlike(fullName.trim()))
    .is("merged_into_profile_id", null)
    .limit(25)

  if (error) {
    return { state: "unmatched", suggestedPatientId: null }
  }

  const target = normalizeName(fullName)
  const matches = (data ?? []).filter((row) =>
    typeof row.full_name === "string" &&
      normalizeName(row.full_name) === target &&
      readCandidateDateOfBirth(row) === dateOfBirth,
  )

  if (matches.length === 1) {
    return { state: "suggested", suggestedPatientId: matches[0].id as string }
  }
  return {
    state: matches.length > 1 ? "ambiguous" : "unmatched",
    suggestedPatientId: null,
  }
}

async function insertVoiceMessage(row: Record<string, unknown>): Promise<InsertResult> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("medical_director_voice_messages")
    .insert(row)
    .select("id, created_at, telegram_notification_sent_at")
    .single()

  if (!error && data) {
    return {
      alertAlreadyDelivered: Boolean(data.telegram_notification_sent_at),
      created: true,
      createdAt: data.created_at as string,
      id: data.id as string,
    }
  }

  if (error?.code !== "23505") {
    throw new Error("Could not create Medical Director voice message")
  }

  const { data: existing, error: existingError } = await supabase
    .from("medical_director_voice_messages")
    .select("id, created_at, telegram_notification_sent_at")
    .eq("call_sid_fingerprint", row.call_sid_fingerprint)
    .single()

  if (existingError || !existing) {
    throw new Error("Could not recover existing Medical Director voice message")
  }

  return {
    alertAlreadyDelivered: Boolean(existing.telegram_notification_sent_at),
    created: false,
    createdAt: existing.created_at as string,
    id: existing.id as string,
  }
}

async function claimAlertAttempt(id: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc(
    "claim_medical_director_voice_notification_attempt",
    { p_message_id: id, p_max_attempts: 6 },
  )
  if (error) throw new Error("Could not claim Medical Director voice alert")
  return data === true
}

async function markAlertReceipt(
  id: string,
  receipt: VoiceMessageAlertReceipt,
): Promise<void> {
  if (!receipt.delivered) return
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from("medical_director_voice_messages")
    .update({
      telegram_message_id: receipt.messageId,
      telegram_notification_sent_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw new Error("Could not record Medical Director voice alert receipt")
}

function defaultDependencies(): MedicalDirectorVoiceMessageDependencies {
  return {
    claimAlert: claimAlertAttempt,
    encrypt: encryptJSONB,
    fingerprintCallSid: fingerprintTwilioCallSid,
    insert: insertVoiceMessage,
    markAlert: markAlertReceipt,
    matchPatient: findSuggestedPatient,
    sendAlert: async (id, category, createdAt) =>
      sendMedicalDirectorVoiceMessageViaTelegram({
        categoryLabel: MEDICAL_DIRECTOR_VOICE_CATEGORY_LABELS[category],
        messageId: id,
        receivedAt: new Intl.DateTimeFormat("en-AU", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Australia/Sydney",
        }).format(new Date(createdAt)),
      }),
  }
}

export async function createMedicalDirectorVoiceMessage(
  input: MedicalDirectorVoiceMessageInput,
  dependencies: MedicalDirectorVoiceMessageDependencies = defaultDependencies(),
): Promise<MedicalDirectorVoiceMessageResult> {
  const message = voiceMessageInputSchema.parse(input)
  const patientDetailsComplete = Boolean(message.patientFullName && message.dateOfBirth)
  const patientMatch = await dependencies.matchPatient(
    message.patientFullName,
    message.dateOfBirth,
  )
  const payload: MedicalDirectorVoiceMessagePayload = {
    callbackNumber: message.callbackRequested ? message.callbackNumber ?? null : null,
    confirmedSummary: message.confirmedSummary,
    dateOfBirth: message.dateOfBirth ?? null,
    patientFullName: message.patientFullName ?? null,
  }
  const encryptedPayload = await dependencies.encrypt(payload)

  const inserted = await dependencies.insert({
    callback_requested: message.callbackRequested,
    call_sid_fingerprint: dependencies.fingerprintCallSid(message.callSid),
    category: message.category,
    patient_details_complete: patientDetailsComplete,
    patient_match_state: patientMatch.state,
    payload_enc: encryptedPayload,
    status: "new",
    suggested_patient_id: patientMatch.suggestedPatientId,
  })

  if (inserted.alertAlreadyDelivered) {
    return { alertDelivered: true, created: inserted.created, id: inserted.id }
  }

  let claimed = false
  try {
    claimed = await dependencies.claimAlert(inserted.id)
  } catch {
    claimed = false
  }
  if (!claimed) {
    return { alertDelivered: false, created: inserted.created, id: inserted.id }
  }

  let receipt: VoiceMessageAlertReceipt
  try {
    receipt = await dependencies.sendAlert(
      inserted.id,
      message.category,
      inserted.createdAt,
    )
    await dependencies.markAlert(inserted.id, receipt)
  } catch {
    receipt = { delivered: false, messageId: null }
  }

  return {
    alertDelivered: receipt.delivered,
    created: inserted.created,
    id: inserted.id,
  }
}

export async function deliverMedicalDirectorVoiceMessageAlert(id: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("medical_director_voice_messages")
    .select("category, created_at")
    .eq("id", id)
    .single()
  if (error || !data) return false

  const category = z.enum(MEDICAL_DIRECTOR_VOICE_MESSAGE_CATEGORIES)
    .safeParse(data.category)
  if (!category.success) return false

  const dependencies = defaultDependencies()
  const claimed = await dependencies.claimAlert(id)
  if (!claimed) return false
  const receipt = await dependencies.sendAlert(id, category.data, data.created_at as string)
  if (!receipt.delivered) return false
  await dependencies.markAlert(id, receipt)
  return true
}

export async function deliverMedicalDirectorVoiceUnresolvedReminder(): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc(
    "claim_medical_director_voice_unresolved_reminder",
  )
  if (error) throw new Error("Could not claim Medical Director voice reminder")

  const row = Array.isArray(data) ? data[0] : data
  const waitingCount = Number(row?.waiting_count ?? 0)
  const oldestCreatedAt = typeof row?.oldest_created_at === "string"
    ? Date.parse(row.oldest_created_at)
    : Number.NaN
  if (!waitingCount || !Number.isFinite(oldestCreatedAt)) return false

  return sendMedicalDirectorVoiceReminderViaTelegram({
    waitingCount,
    oldestWaitingMinutes: Math.max(
      0,
      Math.floor((Date.now() - oldestCreatedAt) / 60_000),
    ),
  })
}
