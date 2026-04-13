import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/helpers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"
import { requireValidCsrf } from "@/lib/security/csrf"
import { prepareIntakeDraftDataWrite, readIntakeDraftData } from "@/lib/security/phi-field-wrappers"
import { z } from "zod"

const logger = createLogger("flow-drafts-api")

const updateDraftSchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
  currentStep: z.string().optional(),
  currentGroupIndex: z.number().int().min(0).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
})

/**
 * Verify draft ownership: sessionId must match, and if user is authenticated
 * the draft's user_id (if set) must match the caller's profile.
 * Returns null if ownership is valid, or an error response.
 */
async function verifyDraftOwnership(
  supabase: ReturnType<typeof createServiceRoleClient>,
  draftId: string,
  sessionId: string,
  authUserId: string | null
): Promise<{ draft: Record<string, unknown> | null; error: NextResponse | null }> {
  const { data: draft, error } = await supabase
    .from("intake_drafts")
    .select("id, session_id, user_id")
    .eq("id", draftId)
    .eq("session_id", sessionId)
    .single()

  if (error || !draft) {
    return { draft: null, error: NextResponse.json({ error: "Draft not found" }, { status: 404 }) }
  }

  // If draft has a user_id and caller is authenticated, verify they match
  if (draft.user_id && authUserId) {
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .single()

    if (!callerProfile || callerProfile.id !== draft.user_id) {
      logger.warn("Draft ownership mismatch", { draftId, sessionId, draftUserId: draft.user_id })
      return { draft: null, error: NextResponse.json({ error: "Draft not found" }, { status: 404 }) }
    }
  }

  return { draft, error: null }
}

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
    const { userId: authUserId } = await auth()

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

    // Verify ownership (sessionId + user_id if authenticated)
    const ownership = await verifyDraftOwnership(supabase, draftId, sessionId, authUserId)
    if (ownership.error) return ownership.error

    const { data: draft, error } = await supabase
      .from("intake_drafts")
      .select("id, session_id, service_slug, current_step, current_group_index, data, data_encrypted, status, safety_outcome, safety_risk_tier, created_at, updated_at")
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

    // Decrypt data (prefer encrypted, fall back to plaintext)
    const decryptedData = await readIntakeDraftData(draft)

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
      data: decryptedData,
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
    const csrfError = await requireValidCsrf(request)
    if (csrfError) return csrfError

    const { draftId } = await context.params
    const { userId: authUserId } = await auth()

    if (!draftId) {
      return NextResponse.json(
        { error: "draftId is required" },
        { status: 400 }
      )
    }

    let rawBody
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    const parsed = updateDraftSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      )
    }

    const { sessionId, currentStep, currentGroupIndex, data } = parsed.data

    const supabase = createServiceRoleClient()

    // Verify ownership (sessionId + user_id if authenticated)
    const ownership = await verifyDraftOwnership(supabase, draftId, sessionId, authUserId)
    if (ownership.error) {
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
      // Encrypt draft data (dual-write: plaintext + encrypted)
      const dataFields = await prepareIntakeDraftDataWrite(data)
      Object.assign(updateData, dataFields)
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
    const { userId: authUserId } = await auth()

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

    // Verify ownership (sessionId + user_id if authenticated)
    const ownership = await verifyDraftOwnership(supabase, draftId, sessionId, authUserId)
    if (ownership.error) return ownership.error

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
