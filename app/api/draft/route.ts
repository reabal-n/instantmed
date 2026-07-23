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
import { type NextRequest, NextResponse } from "next/server"

import { normalizeFlowInstanceId } from "@/lib/analytics/flow-instance"
import { isMaintenanceModeStrict } from "@/lib/feature-flags"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { decryptJSONB, type EncryptedPHI, encryptJSONB } from "@/lib/security/phi-encryption"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("api-draft")
const DRAFT_CACHE_CONTROL = "private, no-store"

function withDraftPrivacyHeaders<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", DRAFT_CACHE_CONTROL)
  return response
}

function draftJson(body: unknown, init?: ResponseInit): NextResponse {
  return withDraftPrivacyHeaders(NextResponse.json(body, init))
}

async function draftMutationMaintenanceResponse(): Promise<NextResponse | null> {
  let mutationPaused = true
  try {
    const maintenance = await isMaintenanceModeStrict()
    mutationPaused = maintenance.enabled
  } catch (error) {
    // The migration safety gate must fail closed. Ordinary feature consumers
    // may use defaults during a transient read failure; PHI draft mutations
    // cannot distinguish that fallback from a confirmed maintenance-off value.
    logger.error("Draft maintenance gate read failed; pausing mutation", {
      error: error instanceof Error ? error.message : "Unknown feature flag error",
    })
    Sentry.captureException(error, {
      tags: { route: "api/draft", operation: "maintenance_gate" },
    })
  }

  if (!mutationPaused) return null

  const response = draftJson(
    {
      error: "Draft changes are briefly paused. Your progress remains on this device; please retry shortly.",
    },
    { status: 503 },
  )
  response.headers.set("Retry-After", "30")
  return response
}

const VALID_SERVICE_TYPES = ["med-cert", "prescription", "consult"] as const
type ValidServiceType = (typeof VALID_SERVICE_TYPES)[number]

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value)
}

interface DraftPayload {
  sessionId?: string
  flowInstanceId?: string
  serviceType: string
  currentStepId?: string
  answers?: Record<string, unknown>
  identity?: {
    email?: string
    firstName?: string
    lastName?: string
    phone?: string
    dob?: string
  }
}

interface DraftIdentity {
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  dob?: string
}

function normalizeIdentity(identity?: DraftPayload["identity"]): DraftIdentity {
  return {
    email: identity?.email?.toLowerCase().trim() || undefined,
    firstName: identity?.firstName?.trim() || undefined,
    lastName: identity?.lastName?.trim() || undefined,
    phone: identity?.phone?.trim() || undefined,
    dob: identity?.dob?.trim() || undefined,
  }
}

function isEncryptedPHI(value: unknown): value is EncryptedPHI {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<EncryptedPHI>
  return (
    typeof candidate.ciphertext === "string" &&
    typeof candidate.encryptedDataKey === "string" &&
    typeof candidate.iv === "string" &&
    typeof candidate.authTag === "string" &&
    typeof candidate.keyId === "string" &&
    typeof candidate.version === "number"
  )
}

async function encryptDraftJson<T extends object>(data: T, label: string): Promise<EncryptedPHI> {
  try {
    return await encryptJSONB(data)
  } catch (error) {
    logger.error("Failed to encrypt intake draft data", {
      label,
      error: error instanceof Error ? error.message : "Unknown encryption error",
    })
    Sentry.captureException(error, {
      tags: { route: "api/draft", operation: "encrypt", label },
    })
    throw new Error("Failed to secure draft data")
  }
}

async function decryptDraftJson<T extends object>(value: unknown, label: string): Promise<T | null> {
  if (!value) {
    return null
  }

  if (!isEncryptedPHI(value)) {
    return null
  }

  try {
    return await decryptJSONB<T>(value)
  } catch (error) {
    logger.error("Failed to decrypt intake draft data", {
      label,
      error: error instanceof Error ? error.message : "Unknown decryption error",
    })
    Sentry.captureException(error, {
      tags: { route: "api/draft", operation: "decrypt", label },
    })
    throw new Error("Failed to read secured draft data")
  }
}

/**
 * POST /api/draft - upsert a draft.
 *
 * Body: DraftPayload. If sessionId is omitted, a new one is generated.
 * Returns: { sessionId, expiresAt, updatedAt }
 */
export async function POST(req: NextRequest) {
  const rateLimitResponse = await applyRateLimit(req, "standard")
  if (rateLimitResponse) {
    return withDraftPrivacyHeaders(rateLimitResponse)
  }
  const maintenanceResponse = await draftMutationMaintenanceResponse()
  if (maintenanceResponse) return maintenanceResponse

  let body: DraftPayload
  try {
    body = (await req.json()) as DraftPayload
  } catch {
    return draftJson({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!VALID_SERVICE_TYPES.includes(body.serviceType as ValidServiceType)) {
    return draftJson(
      { error: `serviceType must be one of: ${VALID_SERVICE_TYPES.join(", ")}` },
      { status: 400 },
    )
  }

  if (body.sessionId !== undefined && !isUuid(body.sessionId)) {
    return draftJson({ error: "sessionId must be a valid UUID" }, { status: 400 })
  }

  const flowInstanceId = normalizeFlowInstanceId(body.flowInstanceId)
  if (body.flowInstanceId !== undefined && !flowInstanceId) {
    return draftJson({ error: "flowInstanceId must be a valid UUID v4" }, { status: 400 })
  }

  // Sanity-cap answer payload size at 256KB to prevent abuse
  const answersJson = JSON.stringify(body.answers ?? {})
  if (answersJson.length > 256 * 1024) {
    return draftJson({ error: "Draft answers payload too large" }, { status: 413 })
  }

  const identity = normalizeIdentity(body.identity)
  let answersEncrypted: EncryptedPHI
  let identityEncrypted: EncryptedPHI

  try {
    answersEncrypted = await encryptDraftJson(body.answers ?? {}, "answers")
    identityEncrypted = await encryptDraftJson(identity, "identity")
  } catch {
    return draftJson({ error: "Failed to secure draft data" }, { status: 500 })
  }

  const supabase = createServiceRoleClient()
  const row = {
    ...(body.sessionId ? { session_id: body.sessionId } : {}),
    ...(flowInstanceId ? { flow_instance_id: flowInstanceId } : {}),
    service_type: body.serviceType,
    current_step_id: body.currentStepId ?? null,
    answers: {},
    answers_encrypted: answersEncrypted,
    identity_encrypted: identityEncrypted,
    encryption_metadata: {
      answersKeyId: answersEncrypted.keyId,
      identityKeyId: identityEncrypted.keyId,
      version: answersEncrypted.version,
      encryptedAt: new Date().toISOString(),
    },
    email: identity.email || null,
    first_name: identity.firstName || null,
    last_name: null,
    phone: null,
  }

  const { data, error } = await supabase
    .from("partial_intakes")
    .upsert(row, { onConflict: "session_id" })
    .select("session_id, expires_at, updated_at")
    .maybeSingle()

  if (error) {
    const message = error.message || "Failed to save draft"
    if (
      error.code === "23514" &&
      /draft_session_(?:flow|service)_mismatch/.test(message)
    ) {
      return draftJson(
        { error: "Draft session belongs to another flow or service" },
        { status: 409 },
      )
    }
    logger.error("Failed to upsert intake draft", { error: message })
    Sentry.captureException(error, {
      tags: { route: "api/draft", method: "POST" },
      extra: { serviceType: body.serviceType },
    })
    return draftJson({ error: message }, { status: 500 })
  }

  // The database discard fence deliberately cancels a stale POST by returning
  // no row. This is an expected terminal lifecycle result, not an incident.
  if (!data) {
    return draftJson({ error: "Draft was discarded" }, { status: 410 })
  }

  return draftJson({
    sessionId: data.session_id,
    expiresAt: data.expires_at,
    updatedAt: data.updated_at,
  })
}

/**
 * GET /api/draft?id=<sessionId> - retrieve a draft.
 */
export async function GET(req: NextRequest) {
  const rateLimitResponse = await applyRateLimit(req, "standard")
  if (rateLimitResponse) {
    return withDraftPrivacyHeaders(rateLimitResponse)
  }

  const sessionId = req.nextUrl.searchParams.get("id")

  if (!sessionId || !isUuid(sessionId)) {
    return draftJson({ error: "Valid id query param required" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("partial_intakes")
    .select(
      "session_id, flow_instance_id, service_type, current_step_id, answers, answers_encrypted, identity_encrypted, email, first_name, last_name, phone, updated_at, expires_at, converted_to_intake_id",
    )
    .eq("session_id", sessionId)
    .gt("expires_at", new Date().toISOString())
    .is("converted_to_intake_id", null)
    .maybeSingle()

  if (error) {
    logger.error("Failed to fetch intake draft", { error: error.message })
    Sentry.captureException(error, {
      tags: { route: "api/draft", method: "GET" },
    })
    return draftJson({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return draftJson({ error: "Draft not found or expired" }, { status: 404 })
  }

  let answers = data.answers ?? {}
  let identity: DraftIdentity = {
    email: data.email ?? undefined,
    firstName: data.first_name ?? undefined,
    lastName: data.last_name ?? undefined,
    phone: data.phone ?? undefined,
  }

  try {
    answers = (await decryptDraftJson<Record<string, unknown>>(data.answers_encrypted, "answers")) ?? answers
    identity = (await decryptDraftJson<DraftIdentity>(data.identity_encrypted, "identity")) ?? identity
  } catch {
    return draftJson({ error: "Failed to read secured draft data" }, { status: 500 })
  }

  return draftJson({
    sessionId: data.session_id,
    flowInstanceId: normalizeFlowInstanceId(data.flow_instance_id),
    serviceType: data.service_type,
    currentStepId: data.current_step_id,
    answers,
    identity: {
      email: identity.email ?? null,
      firstName: identity.firstName ?? null,
      lastName: identity.lastName ?? null,
      phone: identity.phone ?? null,
      dob: identity.dob ?? null,
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
  const rateLimitResponse = await applyRateLimit(req, "standard")
  if (rateLimitResponse) {
    return withDraftPrivacyHeaders(rateLimitResponse)
  }
  const maintenanceResponse = await draftMutationMaintenanceResponse()
  if (maintenanceResponse) return maintenanceResponse

  const sessionId = req.nextUrl.searchParams.get("id")
  const flowInstanceIdParam = req.nextUrl.searchParams.get("flow")
  const flowInstanceId = normalizeFlowInstanceId(flowInstanceIdParam)

  if (!sessionId || !isUuid(sessionId)) {
    return draftJson({ error: "Valid id query param required" }, { status: 400 })
  }
  if (flowInstanceIdParam !== null && !flowInstanceId) {
    return draftJson({ error: "flow must be a valid UUID v4" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { error } = await supabase.rpc("discard_partial_intake_draft", {
    p_session_id: sessionId,
    p_flow_instance_id: flowInstanceId,
  })

  if (error) {
    if (
      error.code === "23514" &&
      error.message.includes("draft_session_flow_mismatch")
    ) {
      return draftJson({ error: "Draft session belongs to another flow" }, { status: 409 })
    }
    logger.error("Failed to delete intake draft", { error: error.message })
    Sentry.captureException(error, {
      tags: { route: "api/draft", method: "DELETE" },
    })
    return draftJson({ error: error.message }, { status: 500 })
  }

  return draftJson({ ok: true })
}
