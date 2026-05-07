import "server-only"

import { createHash } from "node:crypto"

import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("auth-email-events")

export type AuthEmailActionType =
  | "magiclink"
  | "signup"
  | "recovery"
  | "invite"
  | "email_change"
  | "reauthentication"

export type AuthEmailEventStatus = "sent" | "failed"

export interface AuthEmailEventInput {
  actionType: AuthEmailActionType
  to: string
  status: AuthEmailEventStatus
  providerMessageId?: string | null
  httpStatus?: number | null
  errorMessage?: string | null
  metadata?: Record<string, unknown>
}

export interface AuthEmailFailureSummary {
  id: string
  createdAt: string
  actionType: AuthEmailActionType
  recipientDomain: string | null
  httpStatus: number | null
  errorMessage: string | null
}

export interface AuthEmailHealth {
  total: number
  sent: number
  failed: number
  successRate: number
  recentFailures: AuthEmailFailureSummary[]
  unavailable: boolean
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

export async function getAuthEmailHealth(since: Date): Promise<AuthEmailHealth> {
  try {
    const supabase = createServiceRoleClient()
    const sinceIso = since.toISOString()
    const [totalResult, sentResult, failedResult, failuresResult] = await Promise.all([
      supabase
        .from("auth_email_events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sinceIso),
      supabase
        .from("auth_email_events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sinceIso)
        .eq("status", "sent"),
      supabase
        .from("auth_email_events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sinceIso)
        .eq("status", "failed"),
      supabase
        .from("auth_email_events")
        .select("id, created_at, action_type, recipient_domain, http_status, error_message")
        .gte("created_at", sinceIso)
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(5),
    ])

    const queryError = totalResult.error ?? sentResult.error ?? failedResult.error ?? failuresResult.error
    if (queryError) {
      log.error("Failed to load auth email health", {}, toError(queryError))
      return {
        total: 0,
        sent: 0,
        failed: 0,
        successRate: 100,
        recentFailures: [],
        unavailable: true,
      }
    }

    const failureRows = (failuresResult.data ?? []) as Array<{
      id: string
      created_at: string
      action_type: AuthEmailActionType
      recipient_domain: string | null
      http_status: number | null
      error_message: string | null
    }>

    const total = totalResult.count ?? 0
    const sent = sentResult.count ?? 0
    const failed = failedResult.count ?? 0

    return {
      total,
      sent,
      failed,
      successRate: total > 0 ? Number(((sent / total) * 100).toFixed(1)) : 100,
      recentFailures: failureRows.map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        actionType: row.action_type,
        recipientDomain: row.recipient_domain,
        httpStatus: row.http_status,
        errorMessage: row.error_message,
      })),
      unavailable: false,
    }
  } catch (err) {
    log.error("Auth email health query threw", {}, toError(err))
    return {
      total: 0,
      sent: 0,
      failed: 0,
      successRate: 100,
      recentFailures: [],
      unavailable: true,
    }
  }
}
