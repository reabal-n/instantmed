import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("flow-drafts-api")

interface RouteContext {
  params: Promise<{ draftId: string }>
}

/**
 * GET /api/flow/drafts/[draftId]
 * Get a specific draft by ID.
 * Requires sessionId for ownership verification (both guests and authenticated users).
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { draftId } = await context.params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!draftId) {
      return NextResponse.json(
        { error: "draftId is required" },
        { status: 400 }
      )
    }

    // sessionId is required for draft ownership verification
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const { data: draft, error } = await supabase
      .from("intake_drafts")
      .select("id, session_id, service_slug, current_step, current_group_index, data, status, safety_outcome, safety_risk_tier, created_at, updated_at")
      .eq("id", draftId)
      .eq("session_id", sessionId)
      .single()

    if (error || !draft) {
      logger.warn("Draft not found", { draftId, sessionId, error: error?.message })
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404 }
      )
    }

    // Update last accessed timestamp
    await supabase
      .from("intake_drafts")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", draftId)

    return NextResponse.json({
      id: draft.id,
      sessionId: draft.session_id,
      serviceSlug: draft.service_slug,
      currentStep: draft.current_step,
      currentGroupIndex: draft.current_group_index,
      data: draft.data,
      status: draft.status,
      safetyOutcome: draft.safety_outcome,
      safetyRiskTier: draft.safety_risk_tier,
      createdAt: draft.created_at,
      updatedAt: draft.updated_at,
      serverVersion: draft.updated_at ? new Date(draft.updated_at).getTime() : 0,
    })
  } catch (error) {
    logger.error("Error in GET /api/flow/drafts/[draftId]", { error })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/flow/drafts/[draftId]
 * Update an existing draft.
 * Requires sessionId for ownership verification.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { draftId } = await context.params
    const body = await request.json()
    const { sessionId, currentStep, currentGroupIndex, data } = body

    if (!draftId) {
      return NextResponse.json(
        { error: "draftId is required" },
        { status: 400 }
      )
    }

    // sessionId is required for draft ownership verification
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Verify ownership via sessionId
    const { data: existingDraft, error: checkError } = await supabase
      .from("intake_drafts")
      .select("id, session_id")
      .eq("id", draftId)
      .eq("session_id", sessionId)
      .single()

    if (checkError || !existingDraft) {
      logger.warn("Draft not found or access denied", { draftId, sessionId })
      return NextResponse.json(
        { error: "Draft not found or access denied" },
        { status: 404 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
    }

    if (currentStep !== undefined) {
      updateData.current_step = currentStep
    }

    if (currentGroupIndex !== undefined) {
      updateData.current_group_index = currentGroupIndex
    }

    if (data !== undefined) {
      updateData.data = data
    }

    const { data: updatedDraft, error } = await supabase
      .from("intake_drafts")
      .update(updateData)
      .eq("id", draftId)
      .select("id, updated_at")
      .single()

    if (error) {
      logger.error("Failed to update draft", { draftId, error: error.message })
      return NextResponse.json(
        { error: "Failed to update draft" },
        { status: 500 }
      )
    }

    logger.info("Draft updated", { draftId, currentStep })

    return NextResponse.json({
      success: true,
      draftId: updatedDraft.id,
      serverVersion: new Date(updatedDraft.updated_at).getTime(),
    })
  } catch (error) {
    logger.error("Error in PATCH /api/flow/drafts/[draftId]", { error })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/flow/drafts/[draftId]
 * Delete a draft (mark as abandoned).
 * Requires sessionId for ownership verification.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { draftId } = await context.params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!draftId) {
      return NextResponse.json(
        { error: "draftId is required" },
        { status: 400 }
      )
    }

    // sessionId is required for draft ownership verification
    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from("intake_drafts")
      .update({
        status: "abandoned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId)
      .eq("session_id", sessionId)

    if (error) {
      logger.error("Failed to delete draft", { draftId, error: error.message })
      return NextResponse.json(
        { error: "Failed to delete draft" },
        { status: 500 }
      )
    }

    logger.info("Draft marked as abandoned", { draftId })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Error in DELETE /api/flow/drafts/[draftId]", { error })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
