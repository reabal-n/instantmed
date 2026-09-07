import type { SupabaseClient } from "@supabase/supabase-js"

import { reportCheckoutPersistenceFailure } from "@/lib/observability/checkout-persistence-diagnostics"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("server-draft-conversion")

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type DraftConversionResult = {
  marked: boolean
  reason: "invalid_id" | "marked" | "not_found_or_already_converted" | "query_error"
}

interface ConvertedDraftCheckoutIntake {
  category: string | null
  checkoutError: string | null
  guestEmail: string | null
  id: string
  patientId: string | null
  paymentId: string | null
  paymentStatus: string | null
  status: string | null
  subtype: string | null
  growthExperienceVersion: string | null
}

export type ConvertedDraftCheckoutResult =
  | { kind: "reusable" | "service_changed"; intake: ConvertedDraftCheckoutIntake }
  | {
      kind: "blocked"
      reason: "discarded" | "identity_mismatch" | "query_error" | "request_mismatch" | "service_mismatch"
    }
  | {
      kind: "none"
      reason: "invalid_id" | "not_converted" | "not_found"
      growthExperienceVersion?: string | null
    }

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value)
}

function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ""
}

/**
 * Read attribution only from an unconverted, unexpired draft whose bearer,
 * flow id, and service all match. `undefined` means there is no authoritative
 * draft slot; `null` means the authoritative slot is unassigned or could not
 * be read safely, so a client-shaped candidate must not fill it.
 */
export async function readBoundPartialIntakeGrowthExperienceVersion(
  supabase: SupabaseClient,
  {
    flowInstanceId,
    serviceType,
    sessionId,
  }: {
    flowInstanceId: string | null | undefined
    serviceType: "consult"
    sessionId: string | null | undefined
  },
): Promise<string | null | undefined> {
  if (!isUuid(sessionId) || !isUuid(flowInstanceId)) return undefined

  const { data, error } = await supabase
    .from("partial_intakes")
    .select("growth_experience_version")
    .eq("session_id", sessionId)
    .eq("flow_instance_id", flowInstanceId)
    .eq("service_type", serviceType)
    .gt("expires_at", new Date().toISOString())
    .is("converted_to_intake_id", null)
    .maybeSingle<{ growth_experience_version: string | null }>()

  if (error) {
    reportCheckoutPersistenceFailure("bound_draft_growth_lookup", error.code)
    return null
  }

  return data ? data.growth_experience_version : undefined
}

/**
 * Resolve the intake already created from a saved draft before checkout tries
 * to insert another one. The draft session id is a bearer token, but we still
 * pin it to the captured email and request shape before exposing a payment
 * recovery path.
 */
export async function findConvertedPartialIntakeForCheckout(
  supabase: SupabaseClient,
  {
    category,
    email,
    flowInstanceId,
    patientId,
    requireGuestProof = false,
    serviceType,
    sessionId,
    subtype,
  }: {
    category: string
    email?: string | null
    flowInstanceId: string | null | undefined
    patientId?: string
    // Guest profile matching is claimed identity, so it cannot relax the
    // captured-email or exact request-flow proof as authenticated ownership can.
    requireGuestProof?: boolean
    serviceType: "med-cert" | "prescription" | "consult"
    sessionId: string | null | undefined
    subtype: string
  },
): Promise<ConvertedDraftCheckoutResult> {
  if (!isUuid(sessionId) || !isUuid(flowInstanceId)) {
    return { kind: "none", reason: "invalid_id" }
  }

  // This RPC is the checkout trust boundary. It serializes by session then
  // flow, validates the draft service, and atomically claims a legacy null
  // flow before the bearer can influence idempotency or intake reuse.
  const claimDraft = (claimedServiceType: string) => supabase
    .rpc("claim_partial_intake_draft_for_checkout", {
      p_flow_instance_id: flowInstanceId,
      p_service_type: claimedServiceType,
      p_session_id: sessionId,
    })
    .maybeSingle<{
      converted_to_intake_id: string | null
      email: string | null
      flow_instance_id: string | null
      service_type: string
    }>()
  let { data: draft, error: draftError } = await claimDraft(serviceType)
  let serviceChanged = false

  if (draftError?.code === "23514" && draftError.message.includes("draft_session_service_mismatch")) {
    // A service change is not ownership proof. Read only the exact bearer AND
    // flow, then re-run the canonical claim with its stored service so expiry,
    // tombstones and concurrent changes still fail closed. Never search by email.
    const { data: boundDraft, error } = await supabase.from("partial_intakes")
      .select("service_type")
      .eq("session_id", sessionId).eq("flow_instance_id", flowInstanceId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle<{ service_type: string }>()
    if (error) {
      reportCheckoutPersistenceFailure("mismatched_draft_lookup", error.code)
      return { kind: "blocked", reason: "query_error" }
    }
    if (!boundDraft || !["med-cert", "prescription", "consult"].includes(boundDraft.service_type)) {
      return { kind: "blocked", reason: "request_mismatch" }
    }
    const originalClaim = await claimDraft(boundDraft.service_type)
    draft = originalClaim.data
    draftError = originalClaim.error
    serviceChanged = true
  }

  if (draftError) {
    if (
      draftError.code === "23514" &&
      draftError.message.includes("draft_checkout_tombstoned")
    ) {
      return { kind: "blocked", reason: "discarded" }
    }
    if (
      draftError.code === "23514" &&
      /draft_session_(flow|service)_mismatch/.test(draftError.message)
    ) {
      return { kind: "blocked", reason: "request_mismatch" }
    }
    reportCheckoutPersistenceFailure("draft_checkout_claim", draftError.code)
    return { kind: "blocked", reason: "query_error" }
  }
  if (!draft) {
    if (serviceChanged) return { kind: "blocked", reason: "request_mismatch" }
    return { kind: "none", reason: "not_found" }
  }

  if (
    draft.flow_instance_id !== flowInstanceId ||
    (!serviceChanged && draft.service_type !== serviceType)
  ) {
    return { kind: "blocked", reason: "request_mismatch" }
  }

  const expectedEmail = normalizeEmail(email)
  const draftEmail = normalizeEmail(draft.email)
  if (requireGuestProof && (!patientId || !expectedEmail || !draftEmail)) {
    return { kind: "blocked", reason: "identity_mismatch" }
  }
  if (expectedEmail && draftEmail && expectedEmail !== draftEmail) {
    return { kind: "blocked", reason: "identity_mismatch" }
  }
  if (!draft.converted_to_intake_id) {
    if (serviceChanged) return { kind: "blocked", reason: "service_mismatch" }
    // The established checkout-claim RPC has an explicit return table, so the
    // additive column is read immediately after the claim. Set-once database
    // enforcement makes this value stable after the RPC transaction releases
    // its row lock.
    const { data: growthRow, error: growthError } = await supabase
      .from("partial_intakes")
      .select("growth_experience_version")
      .eq("session_id", sessionId)
      .maybeSingle<{ growth_experience_version: string | null }>()
    if (growthError) {
      reportCheckoutPersistenceFailure("draft_growth_lookup", growthError.code)
      return { kind: "blocked", reason: "query_error" }
    }
    return {
      kind: "none",
      reason: "not_converted",
      growthExperienceVersion: growthRow?.growth_experience_version ?? null,
    }
  }

  let intakeQuery = supabase
    .from("intakes")
    .select("id, patient_id, status, payment_status, payment_id, checkout_error, guest_email, category, subtype, flow_instance_id, growth_experience_version")
    .eq("id", draft.converted_to_intake_id)
  if (patientId) intakeQuery = intakeQuery.eq("patient_id", patientId)
  const { data: intake, error: intakeError } = await intakeQuery.maybeSingle<{
      category: string | null
      checkout_error: string | null
      guest_email: string | null
      id: string
      flow_instance_id: string | null
      growth_experience_version: string | null
      patient_id: string | null
      payment_id: string | null
      payment_status: string | null
      status: string | null
      subtype: string | null
    }>()

  if (intakeError) {
    reportCheckoutPersistenceFailure("converted_intake_lookup", intakeError.code)
    return { kind: "blocked", reason: "query_error" }
  }
  if (!intake) {
    // A successful owner-scoped read with no matching request is an identity
    // boundary, distinct from an unexpected database failure above.
    return { kind: "blocked", reason: "request_mismatch" }
  }
  if ((requireGuestProof || intake.flow_instance_id) && intake.flow_instance_id !== flowInstanceId) {
    return { kind: "blocked", reason: "request_mismatch" }
  }
  if (requireGuestProof && (!intake.patient_id || normalizeEmail(intake.guest_email) !== expectedEmail)) {
    return { kind: "blocked", reason: "identity_mismatch" }
  }
  serviceChanged ||= intake.category !== category || (intake.subtype ?? "") !== subtype
  // A guest's captured email plus its converted bearer must match this exact
  // intake before even a service-change outcome may disclose its destination.
  if (serviceChanged && !patientId && (!expectedEmail || !draftEmail || !intake.patient_id || normalizeEmail(intake.guest_email) !== expectedEmail)) {
    return { kind: "blocked", reason: "identity_mismatch" }
  }

  return {
    kind: serviceChanged ? "service_changed" : "reusable",
    intake: {
      category: intake.category,
      checkoutError: intake.checkout_error ?? null,
      guestEmail: intake.guest_email,
      id: intake.id,
      patientId: intake.patient_id,
      paymentId: intake.payment_id,
      paymentStatus: intake.payment_status,
      status: intake.status,
      subtype: intake.subtype,
      growthExperienceVersion: intake.growth_experience_version,
    },
  }
}

export async function markPartialIntakeConverted(
  supabase: SupabaseClient,
  {
    intakeId,
    flowInstanceId,
    sessionId,
  }: {
    intakeId: string | null | undefined
    flowInstanceId: string | null | undefined
    sessionId: string | null | undefined
  },
): Promise<DraftConversionResult> {
  if (!isUuid(sessionId) || !isUuid(intakeId) || !isUuid(flowInstanceId)) {
    logger.warn("Skipped partial-intake conversion marker with invalid ids", {
      hasFlowInstanceId: Boolean(flowInstanceId),
      hasIntakeId: Boolean(intakeId),
      hasSessionId: Boolean(sessionId),
    })
    return { marked: false, reason: "invalid_id" }
  }

  const { data, error } = await supabase
    .from("partial_intakes")
    .update({ converted_to_intake_id: intakeId })
    .eq("session_id", sessionId)
    .eq("flow_instance_id", flowInstanceId)
    .is("converted_to_intake_id", null)
    .select("session_id")
    .maybeSingle()

  if (error) {
    reportCheckoutPersistenceFailure("draft_conversion_marker", error.code)
    return { marked: false, reason: "query_error" }
  }

  if (!data) {
    return { marked: false, reason: "not_found_or_already_converted" }
  }

  return { marked: true, reason: "marked" }
}
