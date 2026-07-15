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
  | { kind: "blocked"; reason: "identity_mismatch" | "request_mismatch" }
  | { kind: "none"; reason: "invalid_id" | "not_converted" | "query_error" }

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
    sessionId,
    subtype,
  }: {
    category: string
    email?: string | null
    sessionId: string | null | undefined
    subtype: string
  },
): Promise<ConvertedDraftCheckoutResult> {
  if (!isUuid(sessionId)) {
    return { kind: "none", reason: "invalid_id" }
  }

  const { data: draft, error: draftError } = await supabase
    .from("partial_intakes")
    .select("converted_to_intake_id, email")
    .eq("session_id", sessionId)
    .gt("expires_at", new Date().toISOString())
    .not("converted_to_intake_id", "is", null)
    .maybeSingle<{ converted_to_intake_id: string | null; email: string | null }>()

  if (draftError) {
    logger.warn("Failed to resolve converted partial intake", { error: draftError.message })
    return { kind: "none", reason: "query_error" }
  }
  if (!draft?.converted_to_intake_id) {
    return { kind: "none", reason: "not_converted" }
  }

  const expectedEmail = normalizeEmail(email)
  const draftEmail = normalizeEmail(draft.email)
  if (expectedEmail && draftEmail && expectedEmail !== draftEmail) {
    return { kind: "blocked", reason: "identity_mismatch" }
  }

  const { data: intake, error: intakeError } = await supabase
    .from("intakes")
    .select("id, patient_id, status, payment_status, payment_id, guest_email, category, subtype")
    .eq("id", draft.converted_to_intake_id)
    .maybeSingle<{
      category: string | null
      guest_email: string | null
      id: string
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
    return { kind: "none", reason: "query_error" }
  }
  if (!intake) {
    return { kind: "none", reason: "not_converted" }
  }
  if (intake.category !== category || (intake.subtype ?? "") !== subtype) {
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
    sessionId,
  }: {
    intakeId: string | null | undefined
    sessionId: string | null | undefined
  },
): Promise<DraftConversionResult> {
  if (!isUuid(sessionId) || !isUuid(intakeId)) {
    logger.warn("Skipped partial-intake conversion marker with invalid ids", {
      hasIntakeId: Boolean(intakeId),
      hasSessionId: Boolean(sessionId),
    })
    return { marked: false, reason: "invalid_id" }
  }

  const { data, error } = await supabase
    .from("partial_intakes")
    .update({ converted_to_intake_id: intakeId })
    .eq("session_id", sessionId)
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
