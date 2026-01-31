import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * DEBUG ROUTE: Check email_outbox table schema and recent rows
 * 
 * Protected by OPS_CRON_SECRET header.
 * Returns column presence info and status values.
 * 
 * Usage: GET /api/debug/email-outbox-schema
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

  const supabase = createServiceRoleClient()

  try {
    // Query one recent row to check schema
    const { data: row, error: queryError } = await supabase
      .from("email_outbox")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (queryError) {
      return NextResponse.json({
        success: false,
        error: queryError.message,
        code: queryError.code,
      })
    }

    if (!row) {
      return NextResponse.json({
        success: true,
        message: "No rows in email_outbox",
        columns: null,
      })
    }

    // Return column presence info (not values)
    const columns = Object.keys(row)
    
    return NextResponse.json({
      success: true,
      rowCount: 1,
      columns,
      hasLastAttemptAt: "last_attempt_at" in row,
      hasRetryCount: "retry_count" in row,
      hasStatus: "status" in row,
      hasCertificateId: "certificate_id" in row,
      hasIntakeId: "intake_id" in row,
      // Status value of most recent row (useful for debugging)
      recentRowStatus: row.status,
      recentRowEmailType: row.email_type,
      recentRowCreatedAt: row.created_at,
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
