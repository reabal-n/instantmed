import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

/**
 * DEBUG ROUTE: Check email environment variables
 * 
 * Protected by OPS_CRON_SECRET header.
 * Returns booleans only - NO secrets exposed.
 * 
 * Usage: GET /api/debug/email-env
 * Header: x-ops-cron-secret: <secret>
 * 
 * TODO: Remove after debugging complete
 */
export async function GET(request: NextRequest) {
  // Protect with OPS_CRON_SECRET
  const cronSecret = process.env.OPS_CRON_SECRET
  const providedSecret = request.headers.get("x-ops-cron-secret")
  
  if (!cronSecret || providedSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    hasResendKey: !!env.resendApiKey,
    hasFrom: !!env.resendFromEmail,
    hasSupabaseService: !!env.supabaseServiceRoleKey,
    hasAppUrl: !!env.appUrl,
    // Also check for empty strings (common misconfiguration)
    resendKeyLength: env.resendApiKey?.length || 0,
    fromEmailLength: env.resendFromEmail?.length || 0,
  })
}
