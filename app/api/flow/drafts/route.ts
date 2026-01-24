import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("flow-drafts-api")

/**
 * POST /api/flow/drafts
 * Create a new intake draft
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }
    const { sessionId, serviceSlug, initialData } = body

    if (!sessionId || !serviceSlug) {
      return NextResponse.json(
        { error: "sessionId and serviceSlug are required" },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

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

    // Create new draft with upsert to handle race conditions
    const { data: draft, error } = await supabase
      .from("intake_drafts")
      .upsert(
        {
          session_id: sessionId,
          service_slug: serviceSlug,
          profile_id: clerkUserId,
          data: initialData || {},
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
    // Authenticate the request
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
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

    const { data: drafts, error } = await supabase
      .from("intake_drafts")
      .select("id, service_slug, current_step, current_group_index, status, created_at, updated_at")
      .eq("session_id", sessionId)
      .eq("profile_id", clerkUserId)
      .eq("status", "in_progress")
      .order("updated_at", { ascending: false })

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
