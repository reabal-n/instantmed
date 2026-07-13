import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { processSupportInboxUnreadCount } from "@/lib/notifications/support-inbox-alert-processor"
import { captureCronError } from "@/lib/observability/sentry"

export const dynamic = "force-dynamic"

const supportInboxAlertSchema = z.object({
  unreadCount: z.number().int().min(0).max(10_000),
}).strict()

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
    const result = await processSupportInboxUnreadCount(unreadCount)
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    captureCronError(err, { jobName: "support-inbox-alert" })
    return NextResponse.json({ error: "Support inbox alert failed", success: false }, { status: 500 })
  }
}
