import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import {
  acquireSupportInboxAlertLock,
  decideSupportInboxAlert,
  sendSupportInboxTelegramAlert,
  SUPPORT_INBOX_AUDIT_ACTION,
  type SupportInboxAlertOutcome,
  type SupportInboxObservation,
} from "@/lib/notifications/support-inbox-alert"
import { captureCronError } from "@/lib/observability/sentry"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

const supportInboxAlertSchema = z.object({
  unreadCount: z.number().int().min(0).max(10_000),
}).strict()

const observationMetadataSchema = z.object({
  outcome: z.enum(["delivered", "delivery_failed", "suppressed", "zero"]),
  unread_count: z.number().int().min(0).max(10_000),
}).strict()

async function readObservations(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<SupportInboxObservation[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("created_at, metadata")
    .eq("action", SUPPORT_INBOX_AUDIT_ACTION)
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) throw new Error(`Support inbox audit read failed: ${error.message}`)

  const observations: SupportInboxObservation[] = []
  for (const row of data ?? []) {
    if (typeof row.created_at !== "string") continue
    const parsed = observationMetadataSchema.safeParse(row.metadata)
    if (!parsed.success) continue
    observations.push({
      createdAt: row.created_at,
      outcome: parsed.data.outcome,
      unreadCount: parsed.data.unread_count,
    })
  }
  return observations
}

async function recordObservation(
  supabase: ReturnType<typeof createServiceRoleClient>,
  unreadCount: number,
  outcome: SupportInboxAlertOutcome,
  createdAt: string,
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    action: SUPPORT_INBOX_AUDIT_ACTION,
    actor_type: "system",
    metadata: {
      outcome,
      unread_count: unreadCount,
    },
    created_at: createdAt,
  })
  if (error) throw new Error(`Support inbox audit write failed: ${error.message}`)
}

export async function POST(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  if (request.headers.get("content-type")?.split(";", 1)[0]?.trim() !== "application/json") {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 })
  }

  const rawBody = await request.json().catch(() => null)
  const parsed = supportInboxAlertSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (process.env.TELEGRAM_SUPPORT_INBOX_ALERTS_ENABLED !== "1") {
    return NextResponse.json({ success: true, skipped: "disabled" })
  }

  const { unreadCount } = parsed.data
  try {
    const now = new Date()
    if (unreadCount === 0) {
      const supabase = createServiceRoleClient()
      await recordObservation(supabase, unreadCount, "zero", now.toISOString())
      return NextResponse.json({ outcome: "zero", success: true, unreadCount })
    }

    const lockStatus = await acquireSupportInboxAlertLock()
    if (lockStatus === "held") {
      return NextResponse.json(
        { success: true, skipped: "locked" },
        { status: 202 },
      )
    }
    if (lockStatus === "unavailable") {
      const error = new Error("Support inbox alert concurrency protection unavailable")
      captureCronError(error, { jobName: "support-inbox-alert" })
      return NextResponse.json(
        { error: "Support inbox alert temporarily unavailable", success: false },
        { status: 503 },
      )
    }

    const supabase = createServiceRoleClient()
    const observations = await readObservations(supabase)
    const decision = decideSupportInboxAlert({ now, observations, unreadCount })
    if (decision === "suppressed") {
      await recordObservation(supabase, unreadCount, "suppressed", now.toISOString())
      return NextResponse.json({ outcome: "suppressed", success: true, unreadCount })
    }

    const delivered = await sendSupportInboxTelegramAlert(unreadCount)
    const outcome = delivered ? "delivered" : "delivery_failed"
    await recordObservation(supabase, unreadCount, outcome, now.toISOString())
    return NextResponse.json(
      { outcome, success: delivered, unreadCount },
      { status: delivered ? 200 : 502 },
    )
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    captureCronError(err, { jobName: "support-inbox-alert" })
    return NextResponse.json({ error: "Support inbox alert failed", success: false }, { status: 500 })
  }
}
