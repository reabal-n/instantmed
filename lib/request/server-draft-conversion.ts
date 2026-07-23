import type { SupabaseClient } from "@supabase/supabase-js"

import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("server-draft-conversion")

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type DraftConversionResult = {
  marked: boolean
  reason: "invalid_id" | "marked" | "not_found_or_already_converted" | "query_error"
}

interface ConvertedDraftCheckoutIntake {
  category: string | null
  guestEmail: string | null
  id: string
  patientId: string | null
  paymentId: string | null
  paymentStatus: string | null
  status: string | null
  subtype: string | null
}

export type ConvertedDraftCheckoutResult =
  | { kind: "reusable"; intake: ConvertedDraftCheckoutIntake }
  | {
      kind: "blocked"
      reason: "discarded" | "identity_mismatch" | "query_error" | "request_mismatch"
    }
  | { kind: "none"; reason: "invalid_id" | "not_converted" | "not_found" }

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value)
}

function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ""
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
    serviceType,
    sessionId,
    subtype,
  }: {
    category: string
    email?: string | null
    flowInstanceId: string | null | undefined
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
  const { data: draft, error: draftError } = await supabase
    .rpc("claim_partial_intake_draft_for_checkout", {
      p_flow_instance_id: flowInstanceId,
      p_service_type: serviceType,
      p_session_id: sessionId,
    })
    .maybeSingle<{
      converted_to_intake_id: string | null
      email: string | null
      flow_instance_id: string | null
      service_type: string
    }>()

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
    logger.warn("Failed to resolve converted partial intake", { error: draftError.message })
    return { kind: "blocked", reason: "query_error" }
  }
  if (!draft) {
    return { kind: "none", reason: "not_found" }
  }

  if (
    draft.flow_instance_id !== flowInstanceId ||
    draft.service_type !== serviceType
  ) {
    return { kind: "blocked", reason: "request_mismatch" }
  }

  const expectedEmail = normalizeEmail(email)
  const draftEmail = normalizeEmail(draft.email)
  if (expectedEmail && draftEmail && expectedEmail !== draftEmail) {
    return { kind: "blocked", reason: "identity_mismatch" }
  }
  if (!draft.converted_to_intake_id) {
    return { kind: "none", reason: "not_converted" }
  }

  const { data: intake, error: intakeError } = await supabase
    .from("intakes")
    .select("id, patient_id, status, payment_status, payment_id, guest_email, category, subtype, flow_instance_id")
    .eq("id", draft.converted_to_intake_id)
    .maybeSingle<{
      category: string | null
      guest_email: string | null
      id: string
      flow_instance_id: string | null
      patient_id: string | null
      payment_id: string | null
      payment_status: string | null
      status: string | null
      subtype: string | null
    }>()

  if (intakeError) {
    logger.warn("Failed to load intake for converted partial intake", {
      error: intakeError.message,
      intakeId: draft.converted_to_intake_id,
    })
    return { kind: "blocked", reason: "query_error" }
  }
  if (!intake) {
    return { kind: "blocked", reason: "query_error" }
  }
  if (
    (intake.flow_instance_id && intake.flow_instance_id !== flowInstanceId) ||
    intake.category !== category ||
    (intake.subtype ?? "") !== subtype
  ) {
    return { kind: "blocked", reason: "request_mismatch" }
  }

  return {
    kind: "reusable",
    intake: {
      category: intake.category,
      guestEmail: intake.guest_email,
      id: intake.id,
      patientId: intake.patient_id,
      paymentId: intake.payment_id,
      paymentStatus: intake.payment_status,
      status: intake.status,
      subtype: intake.subtype,
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
    logger.warn("Failed to mark partial intake converted", { error: error.message })
    return { marked: false, reason: "query_error" }
  }

  if (!data) {
    return { marked: false, reason: "not_found_or_already_converted" }
  }

  return { marked: true, reason: "marked" }
}
