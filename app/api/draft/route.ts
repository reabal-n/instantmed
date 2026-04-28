/**
 * Server-side intake draft persistence.
 *
 * Anonymous (no auth required). The session_id is the authorization token -
 * anyone holding it can read/write the draft. The partial_intakes table is
 * RLS-locked, so all access goes through this service-role route.
 *
 * Used by:
 *   - Client store: writes drafts on every step change (debounced)
 *   - IntakeResumeChip: reads draft to populate the resume option
 *   - Recovery cron (PR4): scans table for stale drafts with email captured
 *   - Intake submit flow: deletes the draft once the intake is realised
 */

import * as Sentry from "@sentry/nextjs"
import { type NextRequest,NextResponse } from "next/server"

import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("api-draft")

const VALID_SERVICE_TYPES = ["med-cert", "prescription", "consult"] as const
type ValidServiceType = (typeof VALID_SERVICE_TYPES)[number]

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value)
}

interface DraftPayload {
  sessionId?: string
  serviceType: string
  currentStepId?: string
  answers?: Record<string, unknown>
  identity?: {
    email?: string
    firstName?: string
    lastName?: string
    phone?: string
  }
}

/**
 * POST /api/draft - upsert a draft.
 *
 * Body: DraftPayload. If sessionId is omitted, a new one is generated.
 * Returns: { sessionId, expiresAt, updatedAt }
 */
export async function POST(req: NextRequest) {
  let body: DraftPayload
  try {
    body = (await req.json()) as DraftPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!VALID_SERVICE_TYPES.includes(body.serviceType as ValidServiceType)) {
    return NextResponse.json(
      { error: `serviceType must be one of: ${VALID_SERVICE_TYPES.join(", ")}` },
      { status: 400 },
    )
  }

  if (body.sessionId !== undefined && !isUuid(body.sessionId)) {
    return NextResponse.json({ error: "sessionId must be a valid UUID" }, { status: 400 })
  }

  // Sanity-cap answer payload size at 256KB to prevent abuse
  const answersJson = JSON.stringify(body.answers ?? {})
  if (answersJson.length > 256 * 1024) {
    return NextResponse.json({ error: "Draft answers payload too large" }, { status: 413 })
  }

  const supabase = createServiceRoleClient()

  const row = {
    ...(body.sessionId ? { session_id: body.sessionId } : {}),
    service_type: body.serviceType,
    current_step_id: body.currentStepId ?? null,
    answers: body.answers ?? {},
    email: body.identity?.email?.toLowerCase().trim() || null,
    first_name: body.identity?.firstName?.trim() || null,
    last_name: body.identity?.lastName?.trim() || null,
    phone: body.identity?.phone?.trim() || null,
  }

  const { data, error } = await supabase
    .from("partial_intakes")
    .upsert(row, { onConflict: "session_id" })
    .select("session_id, expires_at, updated_at")
    .single()

  if (error || !data) {
    const message = error?.message || "Failed to save draft"
    logger.error("Failed to upsert intake draft", { error: message })
    Sentry.captureException(error || new Error(message), {
      tags: { route: "api/draft", method: "POST" },
      extra: { serviceType: body.serviceType },
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({
    sessionId: data.session_id,
    expiresAt: data.expires_at,
    updatedAt: data.updated_at,
  })
}

/**
 * GET /api/draft?id=<sessionId> - retrieve a draft.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("id")

  if (!sessionId || !isUuid(sessionId)) {
    return NextResponse.json({ error: "Valid id query param required" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("partial_intakes")
    .select("session_id, service_type, current_step_id, answers, email, first_name, last_name, phone, updated_at, expires_at, converted_to_intake_id")
    .eq("session_id", sessionId)
    .gt("expires_at", new Date().toISOString())
    .is("converted_to_intake_id", null)
    .maybeSingle()

  if (error) {
    logger.error("Failed to fetch intake draft", { error: error.message })
    Sentry.captureException(error, {
      tags: { route: "api/draft", method: "GET" },
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Draft not found or expired" }, { status: 404 })
  }

  return NextResponse.json({
    sessionId: data.session_id,
    serviceType: data.service_type,
    currentStepId: data.current_step_id,
    answers: data.answers,
    identity: {
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      phone: data.phone,
    },
    updatedAt: data.updated_at,
    expiresAt: data.expires_at,
  })
}

/**
 * DELETE /api/draft?id=<sessionId> - delete a draft.
 *
 * Called when the intake is submitted (we don't need the draft anymore) or
 * when the user explicitly abandons.
 */
export async function DELETE(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("id")

  if (!sessionId || !isUuid(sessionId)) {
    return NextResponse.json({ error: "Valid id query param required" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { error } = await supabase.from("partial_intakes").delete().eq("session_id", sessionId)

  if (error) {
    logger.error("Failed to delete intake draft", { error: error.message })
    Sentry.captureException(error, {
      tags: { route: "api/draft", method: "DELETE" },
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
