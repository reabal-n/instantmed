import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { processCertReactivations, sendTestCertReactivation } from "@/lib/email/cert-reactivation"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { captureCronError } from "@/lib/observability/sentry"

const logger = createLogger("cron-cert-reactivation")

/**
 * Daily cron: one med-cert reactivation nudge per patient whose most recent
 * certificate is 35-120 days old (lib/email/cert-reactivation.ts). Ships
 * disabled; no-ops until CERT_REACTIVATION_EMAILS_ENABLED=true. Marketing-consent
 * gated per patient; reactivation_email_sent_at dedups. NOT a subscription.
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request)
  if (authError) return authError

  // Pre-flight: `?testEmail=you@example.com` sends ONE sample to that address
  // (deliverability check before the first real wave). Bypasses window/consent/DB;
  // still CRON_SECRET-gated above and works before the feature flag is flipped.
  const testEmail = request.nextUrl.searchParams.get("testEmail")
  if (testEmail) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(testEmail)) {
      return NextResponse.json({ error: "Invalid testEmail" }, { status: 400 })
    }
    const sent = await sendTestCertReactivation(testEmail)
    return NextResponse.json({ test: true, sent, to: testEmail, timestamp: new Date().toISOString() })
  }

  try {
    const result = await processCertReactivations()

    logger.info("Cron: cert reactivations processed", result)

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    Sentry.captureException(error)
    const err = toError(error)
    logger.error("Cron: cert reactivations failed", { error: err.message })
    captureCronError(err, { jobName: "cert-reactivation" })

    return NextResponse.json(
      { error: "Failed to process cert reactivations" },
      { status: 500 },
    )
  }
}
