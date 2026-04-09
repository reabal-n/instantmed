import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { requireValidCsrf } from "@/lib/security/csrf"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { prepareIntakeDraftDataWrite } from "@/lib/security/phi-field-wrappers"
import { z } from "zod"

const logger = createLogger("flow-drafts-api")

const createDraftSchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
  serviceSlug: z.string().min(1, "serviceSlug is required"),
  initialData: z.record(z.string(), z.unknown()).optional(),
})

/**
 * POST /api/flow/drafts
 * Create a new intake draft
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(request, "sensitive")
    if (rateLimitResponse) return rateLimitResponse

    // Authenticate the request
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const csrfError = await requireValidCsrf(request)
    if (csrfError) return csrfError

    let rawBody
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    const parsed = createDraftSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      )
    }

    const { sessionId, serviceSlug, initialData } = parsed.data

    const supabase = createServiceRoleClient()

    // Resolve profile ID from Clerk user for ownership tracking
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", userId)
      .single()

    // Check if draft already exists for this session + service
    const { data: existingDraft } = await supabase
      .from("intake_drafts")
      .select("id")
      .eq("session_id", sessionId)
      .eq("service_slug", serviceSlug)
      .eq("status", "in_progress")
      .single()

    if (existingDraft) {
      // Return existing draft ID instead of creating duplicate
      return NextResponse.json({
        draftId: existingDraft.id,
        isExisting: true,
      })
    }

    // Encrypt draft data (dual-write: plaintext + encrypted)
    const dataFields = await prepareIntakeDraftDataWrite(initialData || {})

    // Create new draft with upsert to handle race conditions
    const { data: draft, error } = await supabase
      .from("intake_drafts")
      .upsert(
        {
          session_id: sessionId,
          service_slug: serviceSlug,
          user_id: callerProfile?.id || null,
          ...dataFields,
          current_step: "safety",
          current_group_index: 0,
          status: "in_progress",
        },
        {
          onConflict: "session_id,service_slug",
          ignoreDuplicates: true,
        }
      )
      .select("id")
      .single()

    if (error) {
      logger.error("Failed to create draft", { error: error.message, sessionId })
      return NextResponse.json(
        { error: "Failed to create draft" },
        { status: 500 }
      )
    }

    logger.info("Draft created", { draftId: draft.id, sessionId, serviceSlug })

    return NextResponse.json({
      draftId: draft.id,
      isExisting: false,
    })
  } catch (error) {
    logger.error("Error in POST /api/flow/drafts", { error })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/flow/drafts
 * List drafts for a session
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(request, "standard")
    if (rateLimitResponse) return rateLimitResponse

    // Authenticate the request
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Resolve profile ID to enforce ownership
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", userId)
      .single()

    let query = supabase
      .from("intake_drafts")
      .select("id, service_slug, current_step, current_group_index, status, created_at, updated_at")
      .eq("session_id", sessionId)
      .eq("status", "in_progress")
      .order("updated_at", { ascending: false })

    // If we have a profile, also filter by user_id for ownership
    if (callerProfile) {
      query = query.eq("user_id", callerProfile.id)
    }

    const { data: drafts, error } = await query

    if (error) {
      logger.error("Failed to list drafts", { error: error.message, sessionId })
      return NextResponse.json(
        { error: "Failed to list drafts" },
        { status: 500 }
      )
    }

    return NextResponse.json({ drafts })
  } catch (error) {
    logger.error("Error in GET /api/flow/drafts", { error })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
