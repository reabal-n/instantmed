import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { logAdminAction } from "@/lib/security/audit-log"

const logger = createLogger("admin-webhook-dlq")

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/webhook-dlq
 * Fetch webhook dead letter queue entries for admin review
 */
export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireAuth("doctor")
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const showResolved = searchParams.get("resolved") === "true"
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

    const supabase = createServiceRoleClient()

    let query = supabase
      .from("stripe_webhook_dead_letter")
      .select(`
        id,
        event_id,
        event_type,
        intake_id,
        error_message,
        retry_count,
        payload,
        created_at,
        resolved_at,
        resolved_by,
        resolution_notes
      `)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (!showResolved) {
      query = query.is("resolved_at", null)
    }

    const { data, error } = await query

    if (error) {
      logger.error("Failed to fetch webhook DLQ", {}, error)
      return NextResponse.json({ error: "Failed to fetch DLQ" }, { status: 500 })
    }

    // Get counts
    const { count: unresolvedCount } = await supabase
      .from("stripe_webhook_dead_letter")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null)

    const { count: totalCount } = await supabase
      .from("stripe_webhook_dead_letter")
      .select("id", { count: "exact", head: true })

    return NextResponse.json({
      entries: data || [],
      counts: {
        unresolved: unresolvedCount ?? 0,
        total: totalCount ?? 0,
      },
    })
  } catch (error) {
    logger.error("Webhook DLQ fetch error", {}, error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * POST /api/admin/webhook-dlq
 * Retry or resolve a webhook DLQ entry
 */
export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireAuth("doctor")
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 403 })
    }

    const body = await request.json()
    const { action, entryId, notes } = body as {
      action: "retry" | "resolve" | "resolve_all"
      entryId?: string
      notes?: string
    }

    const supabase = createServiceRoleClient()

    if (action === "resolve" && entryId) {
      const { error } = await supabase
        .from("stripe_webhook_dead_letter")
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: profile.id,
          resolution_notes: notes || "Manually resolved by admin",
        })
        .eq("id", entryId)

      if (error) {
        return NextResponse.json({ error: "Failed to resolve entry" }, { status: 500 })
      }

      await logAdminAction(profile.id, "Resolved webhook DLQ entry", { entryId, notes })
      logger.info("Webhook DLQ entry resolved", { entryId, adminId: profile.id })

      return NextResponse.json({ success: true, action: "resolved" })
    }

    if (action === "resolve_all") {
      const { error } = await supabase
        .from("stripe_webhook_dead_letter")
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: profile.id,
          resolution_notes: notes || "Bulk resolved by admin",
        })
        .is("resolved_at", null)

      // Get count of updated rows
      const { count } = await supabase
        .from("stripe_webhook_dead_letter")
        .select("id", { count: "exact", head: true })
        .eq("resolved_by", profile.id)
        .gte("resolved_at", new Date(Date.now() - 5000).toISOString())

      if (error) {
        return NextResponse.json({ error: "Failed to resolve entries" }, { status: 500 })
      }

      await logAdminAction(profile.id, "Bulk resolved webhook DLQ entries", { count, notes })
      logger.info("Webhook DLQ bulk resolved", { count, adminId: profile.id })

      return NextResponse.json({ success: true, action: "resolved_all", count })
    }

    if (action === "retry" && entryId) {
      // Fetch the entry to retry
      const { data: entry, error: fetchError } = await supabase
        .from("stripe_webhook_dead_letter")
        .select("*")
        .eq("id", entryId)
        .single()

      if (fetchError || !entry) {
        return NextResponse.json({ error: "Entry not found" }, { status: 404 })
      }

      // Increment retry count
      await supabase
        .from("stripe_webhook_dead_letter")
        .update({ retry_count: (entry.retry_count || 0) + 1 })
        .eq("id", entryId)

      // Re-process the webhook by calling the main webhook handler
      // Pass special header to indicate this is an admin replay (bypass signature verification)
      try {
        const webhookResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/webhook`,
          {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "X-Admin-Replay": "true",
              "X-Admin-Replay-Secret": process.env.INTERNAL_API_SECRET || "",
              "X-Original-Event-Id": entry.event_id,
            },
            body: typeof entry.payload === "string" ? entry.payload : JSON.stringify(entry.payload),
          }
        )

        if (webhookResponse.ok) {
          // Mark as resolved on successful retry
          await supabase
            .from("stripe_webhook_dead_letter")
            .update({
              resolved_at: new Date().toISOString(),
              resolved_by: profile.id,
              resolution_notes: "Successfully retried",
            })
            .eq("id", entryId)

          await logAdminAction(profile.id, "Retried webhook DLQ entry - success", { entryId })
          return NextResponse.json({ success: true, action: "retried", status: "success" })
        } else {
          await logAdminAction(profile.id, "Retried webhook DLQ entry - failed", { entryId })
          return NextResponse.json({ success: true, action: "retried", status: "failed" })
        }
      } catch (retryError) {
        logger.error("Webhook retry failed", { entryId }, retryError instanceof Error ? retryError : new Error(String(retryError)))
        return NextResponse.json({ success: true, action: "retried", status: "error" })
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    logger.error("Webhook DLQ action error", {}, error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
