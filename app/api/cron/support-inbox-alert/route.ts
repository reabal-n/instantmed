import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { readSupportInboxUnreadThreadCount } from "@/lib/integrations/gmail/support-inbox-count"
import { recordCronHeartbeat } from "@/lib/monitoring/cron-heartbeat"
import { processSupportInboxUnreadCount } from "@/lib/notifications/support-inbox-alert-processor"
import { captureCronError } from "@/lib/observability/sentry"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  if (
    process.env.GMAIL_SUPPORT_INBOX_POLL_ENABLED !== "1" ||
    process.env.TELEGRAM_SUPPORT_INBOX_ALERTS_ENABLED !== "1"
  ) {
    return NextResponse.json({ success: true, skipped: "disabled" })
  }

  await recordCronHeartbeat("support-inbox-alert")

  let unreadCount: number
  try {
    unreadCount = await readSupportInboxUnreadThreadCount()
  } catch (error) {
    captureCronError(error instanceof Error ? error : new Error(String(error)), {
      jobName: "support-inbox-alert-gmail",
    })
    return NextResponse.json(
      { error: "Support inbox aggregate check failed", success: false },
      { status: 502 },
    )
  }

  try {
    const result = await processSupportInboxUnreadCount(unreadCount)
    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    captureCronError(error instanceof Error ? error : new Error(String(error)), {
      jobName: "support-inbox-alert",
    })
    return NextResponse.json(
      { error: "Support inbox alert failed", success: false },
      { status: 500 },
    )
  }
}
