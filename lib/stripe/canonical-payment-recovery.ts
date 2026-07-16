import type { SupabaseClient } from "@supabase/supabase-js"

import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("canonical-payment-recovery")

const SUPERSEDED_DUPLICATE_CHECKOUT_ERROR = "superseded_duplicate_unpaid"

interface PaymentRecoveryCandidate {
  createdAt: string
  id: string
}

export interface PaymentRecoveryIntakeIdentity extends PaymentRecoveryCandidate {
  category: string | null
  email?: string | null
  patientId?: string | null
  subtype: string | null
}

export type PaymentRecoveryCanonicality =
  | { kind: "canonical" }
  | { canonicalIntakeId: string; kind: "superseded" }
  | { kind: "unresolved" }

interface CandidateQueryResult {
  candidate: PaymentRecoveryCandidate | null
  failed: boolean
}

function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ""
}

function candidateTimestamp(candidate: PaymentRecoveryCandidate): number {
  const timestamp = new Date(candidate.createdAt).getTime()
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY
}

function chooseCanonicalPaymentRecoveryIntake(
  candidates: PaymentRecoveryCandidate[],
): PaymentRecoveryCandidate | null {
  let canonical: PaymentRecoveryCandidate | null = null

  for (const candidate of candidates) {
    if (!canonical) {
      canonical = candidate
      continue
    }

    const candidateTime = candidateTimestamp(candidate)
    const canonicalTime = candidateTimestamp(canonical)
    if (
      candidateTime > canonicalTime ||
      (candidateTime === canonicalTime && candidate.id > canonical.id)
    ) {
      canonical = candidate
    }
  }

  return canonical
}

export function isSupersededDuplicateCheckoutError(
  checkoutError: string | null | undefined,
): boolean {
  return checkoutError?.includes(SUPERSEDED_DUPLICATE_CHECKOUT_ERROR) ?? false
}

function toCandidate(value: unknown): PaymentRecoveryCandidate | null {
  if (!value || typeof value !== "object") return null

  const row = value as { created_at?: unknown; id?: unknown }
  if (typeof row.id !== "string" || typeof row.created_at !== "string") return null

  return { createdAt: row.created_at, id: row.id }
}

async function loadNewestGuestLaneCandidate(
  supabase: SupabaseClient,
  target: PaymentRecoveryIntakeIdentity,
  normalizedEmail: string,
): Promise<CandidateQueryResult> {
  let query = supabase
    .from("intakes")
    .select("id, created_at")
    .eq("guest_email", normalizedEmail)
    .or("exclude_from_reporting.is.null,exclude_from_reporting.eq.false")

  query = target.category === null
    ? query.is("category", null)
    : query.eq("category", target.category)
  query = target.subtype === null
    ? query.is("subtype", null)
    : query.eq("subtype", target.subtype)

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)

  return {
    candidate: toCandidate(data?.[0]),
    failed: Boolean(error),
  }
}

async function loadNewestPatientLaneCandidate(
  supabase: SupabaseClient,
  target: PaymentRecoveryIntakeIdentity,
  patientIds: string[],
): Promise<CandidateQueryResult> {
  let query = supabase
    .from("intakes")
    .select("id, created_at")
    .in("patient_id", patientIds)
    .or("exclude_from_reporting.is.null,exclude_from_reporting.eq.false")

  query = target.category === null
    ? query.is("category", null)
    : query.eq("category", target.category)
  query = target.subtype === null
    ? query.is("subtype", null)
    : query.eq("subtype", target.subtype)

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)

  return {
    candidate: toCandidate(data?.[0]),
    failed: Boolean(error),
  }
}

/**
 * Resolve the one intake allowed to create or expose payment recovery for an
 * email + category + subtype lane. Both guest and authenticated rows are
 * considered so signing in cannot make an older guest request actionable.
 */
export async function resolvePaymentRecoveryCanonicality(
  supabase: SupabaseClient,
  target: PaymentRecoveryIntakeIdentity,
): Promise<PaymentRecoveryCanonicality> {
  if (!Number.isFinite(new Date(target.createdAt).getTime())) {
    logger.warn("Payment recovery canonicality has an invalid target timestamp", {
      intakeId: target.id,
    })
    return { kind: "unresolved" }
  }

  const normalizedEmail = normalizeEmail(target.email)
  const patientIds = new Set<string>()
  if (target.patientId) patientIds.add(target.patientId)

  if (normalizedEmail) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("normalized_email", normalizedEmail)
      .eq("role", "patient")

    if (profileError) {
      logger.warn("Failed to resolve payment recovery identity", {
        intakeId: target.id,
      })
      return { kind: "unresolved" }
    }

    for (const profile of profiles ?? []) {
      if (typeof profile.id === "string") patientIds.add(profile.id)
    }
  }

  if (!normalizedEmail && patientIds.size === 0) {
    logger.warn("Payment recovery canonicality has no usable identity", {
      intakeId: target.id,
    })
    return { kind: "unresolved" }
  }

  const [guestResult, patientResult] = await Promise.all([
    normalizedEmail
      ? loadNewestGuestLaneCandidate(supabase, target, normalizedEmail)
      : Promise.resolve({ candidate: null, failed: false }),
    patientIds.size > 0
      ? loadNewestPatientLaneCandidate(supabase, target, [...patientIds])
      : Promise.resolve({ candidate: null, failed: false }),
  ])

  if (guestResult.failed || patientResult.failed) {
    logger.warn("Failed to resolve newest payment recovery request", {
      intakeId: target.id,
    })
    return { kind: "unresolved" }
  }

  const canonical = chooseCanonicalPaymentRecoveryIntake([
    target,
    ...(guestResult.candidate ? [guestResult.candidate] : []),
    ...(patientResult.candidate ? [patientResult.candidate] : []),
  ])

  if (!canonical) return { kind: "unresolved" }
  if (canonical.id === target.id) return { kind: "canonical" }

  return { canonicalIntakeId: canonical.id, kind: "superseded" }
}
