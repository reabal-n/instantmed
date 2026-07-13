import "server-only"

import { createHash } from "node:crypto"

import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("auth-email-events")

type AuthEmailActionType =
  | "magiclink"
  | "signup"
  | "recovery"
  | "invite"
  | "email_change"
  | "reauthentication"

type AuthEmailEventStatus = "sent" | "failed"

interface AuthEmailEventInput {
  actionType: AuthEmailActionType
  to: string
  status: AuthEmailEventStatus
  providerMessageId?: string | null
  httpStatus?: number | null
  errorMessage?: string | null
  metadata?: Record<string, unknown>
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase()
}

function hashRecipient(value: string): string {
  return createHash("sha256").update(normalizeAddress(value)).digest("hex")
}

function getRecipientDomain(value: string): string | null {
  const domain = normalizeAddress(value).split("@")[1]
  return domain || null
}

function truncateError(message: string | null | undefined): string | null {
  if (!message) return null
  return message.slice(0, 500)
}

export async function recordAuthEmailEvent(input: AuthEmailEventInput): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from("auth_email_events").insert({
      action_type: input.actionType,
      status: input.status,
      recipient_hash: hashRecipient(input.to),
      recipient_domain: getRecipientDomain(input.to),
      provider: "resend",
      provider_message_id: input.providerMessageId ?? null,
      http_status: input.httpStatus ?? null,
      error_message: truncateError(input.errorMessage),
      metadata: input.metadata ?? {},
    })

    if (error) {
      log.error("Failed to record auth email event", { action: input.actionType, status: input.status }, toError(error))
    }
  } catch (err) {
    log.error("Auth email event recording threw", { action: input.actionType, status: input.status }, toError(err))
  }
}

export async function getAuthEmailFailureCount(since: Date): Promise<number> {
  const supabase = createServiceRoleClient()
  const { count, error } = await supabase
    .from("auth_email_events")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("created_at", since.toISOString())

  if (error) throw new Error(`Auth email failure count failed: ${error.message}`)
  return count ?? 0
}
