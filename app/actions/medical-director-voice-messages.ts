"use server"

import { z } from "zod"

import { VOICE_MESSAGE_RESOLUTION_REASONS } from "@/lib/admin/medical-director-voice-message-types"
import {
  claimMedicalDirectorVoiceMessage,
  reopenMedicalDirectorVoiceMessage,
  resolveMedicalDirectorVoiceMessage,
  updateMedicalDirectorVoiceMessageMatch,
} from "@/lib/admin/medical-director-voice-messages"
import { requireRoleOrNull } from "@/lib/auth/helpers"
import { revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import {
  ADMIN_VOICE_MESSAGES_HREF,
  buildAdminVoiceMessageHref,
} from "@/lib/dashboard/routes"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"

const idSchema = z.string().uuid()
const matchSchema = z.object({
  messageId: idSchema,
  patientId: z.string().uuid().nullable(),
})

export interface VoiceMessageActionResult {
  success: boolean
  error?: string
}

async function authorize(): Promise<
  | { actorId: string }
  | { error: string }
> {
  const auth = await requireRoleOrNull(["admin"])
  if (!auth) return { error: "Unauthorized" }
  const limit = await checkServerActionRateLimit(
    `voice-message:${auth.profile.id}`,
    "admin",
  )
  if (!limit.success) return { error: limit.error || "Please wait and try again." }
  return { actorId: auth.profile.id }
}

function revalidate(messageId: string): void {
  revalidateStaff({
    ops: true,
    paths: [
      ADMIN_VOICE_MESSAGES_HREF,
      buildAdminVoiceMessageHref(messageId),
    ],
  })
}

export async function claimVoiceMessageAction(
  messageId: string,
): Promise<VoiceMessageActionResult> {
  const parsed = idSchema.safeParse(messageId)
  if (!parsed.success) return { success: false, error: "Invalid message." }
  const auth = await authorize()
  if ("error" in auth) return { success: false, error: auth.error }
  try {
    const changed = await claimMedicalDirectorVoiceMessage(parsed.data, auth.actorId)
    if (!changed) return { success: false, error: "This message is no longer new." }
    revalidate(parsed.data)
    return { success: true }
  } catch {
    return { success: false, error: "Could not take ownership of this message." }
  }
}

export async function resolveVoiceMessageAction(
  messageId: string,
  reason: string,
): Promise<VoiceMessageActionResult> {
  const parsed = z.object({
    id: idSchema,
    reason: z.enum(VOICE_MESSAGE_RESOLUTION_REASONS),
  }).safeParse({ id: messageId, reason })
  if (!parsed.success) return { success: false, error: "Choose a valid resolution." }
  const auth = await authorize()
  if ("error" in auth) return { success: false, error: auth.error }
  try {
    const changed = await resolveMedicalDirectorVoiceMessage(
      parsed.data.id,
      auth.actorId,
      parsed.data.reason,
    )
    if (!changed) return { success: false, error: "Take ownership before resolving." }
    revalidate(parsed.data.id)
    return { success: true }
  } catch {
    return { success: false, error: "Could not resolve this message." }
  }
}

export async function reopenVoiceMessageAction(
  messageId: string,
): Promise<VoiceMessageActionResult> {
  const parsed = idSchema.safeParse(messageId)
  if (!parsed.success) return { success: false, error: "Invalid message." }
  const auth = await authorize()
  if ("error" in auth) return { success: false, error: auth.error }
  try {
    const changed = await reopenMedicalDirectorVoiceMessage(parsed.data, auth.actorId)
    if (!changed) return { success: false, error: "This message is not resolved." }
    revalidate(parsed.data)
    return { success: true }
  } catch {
    return { success: false, error: "Could not reopen this message." }
  }
}

export async function updateVoiceMessageMatchAction(
  messageId: string,
  patientId: string | null,
): Promise<VoiceMessageActionResult> {
  const parsed = matchSchema.safeParse({
    messageId,
    patientId: patientId?.trim() || null,
  })
  if (!parsed.success) {
    return { success: false, error: "Enter a valid patient profile ID or clear it." }
  }
  const auth = await authorize()
  if ("error" in auth) return { success: false, error: auth.error }
  try {
    const changed = await updateMedicalDirectorVoiceMessageMatch(
      parsed.data.messageId,
      auth.actorId,
      parsed.data.patientId,
    )
    if (!changed) return { success: false, error: "Message not found." }
    revalidate(parsed.data.messageId)
    return { success: true }
  } catch {
    return { success: false, error: "Could not update the suggested patient match." }
  }
}
