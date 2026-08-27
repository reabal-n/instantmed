import "server-only"

import { createHmac } from "node:crypto"

import { z } from "zod"

import {
  sendVoiceCallbackRequestViaTelegram,
  type VoiceCallbackAlertReceipt,
} from "@/lib/notifications/telegram"
import { type EncryptedPHI, encryptPHI } from "@/lib/security/phi-encryption"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const callbackRequestSchema = z.object({
  callbackNumber: z.string().trim().min(3).max(64),
  callerName: z.string().trim().min(1).max(100).optional(),
  callSid: z.string().regex(/^CA[a-fA-F0-9]{32}$/),
  category: z.enum([
    "account_or_payment",
    "document_adjustment",
    "prescription_or_clinical",
    "technical_support",
    "other",
  ]),
  consentedAt: z.string().datetime(),
  summary: z.string().trim().min(3).max(1_000),
})

export type VoiceCallbackRequestInput = z.infer<typeof callbackRequestSchema>

type InsertResult = {
  alertAlreadyDelivered?: boolean
  created: boolean
  id: string
}

type EncryptedPayload = EncryptedPHI | Record<string, unknown>

export interface VoiceCallbackRequestDependencies {
  claimAlert: (id: string) => Promise<boolean>
  encrypt: (plaintext: string) => Promise<EncryptedPayload>
  hashCallSid: (callSid: string) => string
  insert: (row: Record<string, unknown>) => Promise<InsertResult>
  markAlert: (id: string, receipt: VoiceCallbackAlertReceipt) => Promise<void>
  sendAlert: (id: string) => Promise<VoiceCallbackAlertReceipt>
}

export interface VoiceCallbackRequestResult {
  alertDelivered: boolean
  created: boolean
  id: string
}

function hashCallSid(callSid: string): string {
  const secret = process.env.TWILIO_VOICE_SESSION_SECRET?.trim()
  if (!secret) throw new Error("TWILIO_VOICE_SESSION_SECRET is not configured")
  return createHmac("sha256", secret).update(callSid).digest("hex")
}

async function insertCallbackRequest(row: Record<string, unknown>): Promise<InsertResult> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("voice_callback_requests")
    .insert(row)
    .select("id, telegram_notification_sent_at")
    .single()

  if (!error && data) {
    return {
      alertAlreadyDelivered: Boolean(data.telegram_notification_sent_at),
      created: true,
      id: data.id as string,
    }
  }

  if (error?.code !== "23505") {
    throw new Error("Could not create voice callback request")
  }

  const { data: existing, error: existingError } = await supabase
    .from("voice_callback_requests")
    .select("id, telegram_notification_sent_at")
    .eq("call_sid_hash", row.call_sid_hash)
    .single()

  if (existingError || !existing) {
    throw new Error("Could not recover existing voice callback request")
  }

  return {
    alertAlreadyDelivered: Boolean(existing.telegram_notification_sent_at),
    created: false,
    id: existing.id as string,
  }
}

async function markAlertReceipt(id: string, receipt: VoiceCallbackAlertReceipt): Promise<void> {
  if (!receipt.delivered) return
  const supabase = createServiceRoleClient()
  const update: Record<string, unknown> = {
    telegram_notification_sent_at: new Date().toISOString(),
    telegram_message_id: receipt.messageId,
  }

  const { error } = await supabase
    .from("voice_callback_requests")
    .update(update)
    .eq("id", id)

  if (error) throw new Error("Could not record voice callback notification receipt")
}

async function claimAlertAttempt(id: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc(
    "claim_voice_callback_notification_attempt",
    { p_request_id: id, p_max_attempts: 6 },
  )
  if (error) throw new Error("Could not claim voice callback notification attempt")
  return data === true
}

function defaultDependencies(): VoiceCallbackRequestDependencies {
  return {
    claimAlert: claimAlertAttempt,
    encrypt: encryptPHI,
    hashCallSid,
    insert: insertCallbackRequest,
    markAlert: markAlertReceipt,
    sendAlert: sendVoiceCallbackRequestViaTelegram,
  }
}

export async function createVoiceCallbackRequest(
  input: VoiceCallbackRequestInput,
  dependencies: VoiceCallbackRequestDependencies = defaultDependencies(),
): Promise<VoiceCallbackRequestResult> {
  const request = callbackRequestSchema.parse(input)
  const encryptedPayload = await dependencies.encrypt(JSON.stringify({
    callbackNumber: request.callbackNumber,
    callerName: request.callerName ?? null,
    category: request.category,
    summary: request.summary,
  }))

  const inserted = await dependencies.insert({
    call_sid_hash: dependencies.hashCallSid(request.callSid),
    consented_at: request.consentedAt,
    payload_enc: encryptedPayload,
    status: "pending",
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

  let receipt: VoiceCallbackAlertReceipt
  try {
    receipt = await dependencies.sendAlert(inserted.id)
  } catch {
    receipt = { delivered: false, messageId: null }
  }

  try {
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

export async function deliverVoiceCallbackAlert(id: string): Promise<boolean> {
  const dependencies = defaultDependencies()
  const claimed = await dependencies.claimAlert(id)
  if (!claimed) return false

  let receipt: VoiceCallbackAlertReceipt
  try {
    receipt = await dependencies.sendAlert(id)
  } catch {
    return false
  }
  if (!receipt.delivered) return false

  await dependencies.markAlert(id, receipt)
  return true
}
