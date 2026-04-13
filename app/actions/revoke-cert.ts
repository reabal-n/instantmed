"use server"

/**
 * Revoke Certificate Action
 *
 * Marks an issued certificate as revoked.
 * Revoked certificates are flagged as invalid on the public verify page.
 *
 * Flow:
 * 1. Validate doctor or admin role
 * 2. Fetch issued_certificates record by intakeId (or certificateId)
 * 3. Guard: already-revoked is idempotent
 * 4. Atomic status update → 'revoked'
 * 5. Log to certificate_audit_log
 * 6. Revalidate doctor/patient cache
 */

import { revalidatePath } from "next/cache"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("revoke-cert")

export interface RevokeCertInput {
  /** The intake ID linked to the certificate */
  intakeId: string
  /** Human-readable reason for revocation */
  reason: string
}

export interface RevokeCertResult {
  success: boolean
  error?: string
  alreadyRevoked?: boolean
}

export async function revokeCertificateAction(
  input: RevokeCertInput
): Promise<RevokeCertResult> {
  const { intakeId, reason } = input

  // 1. VALIDATE ACTOR
  const user = await requireRoleOrNull(["doctor", "admin"])
  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const supabase = createServiceRoleClient()
  const timestamp = new Date().toISOString()

  try {
    // 2. FETCH CERTIFICATE RECORD
    const { data: cert, error: fetchError } = await supabase
      .from("issued_certificates")
      .select("id, status, intake_id")
      .eq("intake_id", intakeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      logger.error("[RevokeCert] Failed to fetch certificate", { intakeId }, fetchError)
      return { success: false, error: "Failed to fetch certificate" }
    }

    if (!cert) {
      return { success: false, error: "No certificate found for this request" }
    }

    // 3. IDEMPOTENCY: already revoked
    if (cert.status === "revoked") {
      logger.info("[RevokeCert] Certificate already revoked", { certId: cert.id, intakeId })
      return { success: true, alreadyRevoked: true }
    }

    // 4. ATOMIC STATUS UPDATE
    const { error: updateError } = await supabase
      .from("issued_certificates")
      .update({
        status: "revoked",
        revoked_at: timestamp,
        revoked_by: user.profile.id,
        revocation_reason: reason,
        updated_at: timestamp,
      })
      .eq("id", cert.id)
      .eq("status", "valid") // Optimistic lock - only revoke if still valid

    if (updateError) {
      // Check for race condition (status changed between fetch and update)
      if (updateError.code === "PGRST116") {
        return {
          success: false,
          error: "Certificate status changed. Please refresh and try again.",
        }
      }
      logger.error("[RevokeCert] Failed to update certificate status", { certId: cert.id }, updateError)
      return { success: false, error: "Failed to revoke certificate" }
    }

    logger.info("[RevokeCert] Certificate revoked", {
      certId: cert.id,
      intakeId,
      actorId: user.profile.id,
      reason,
    })

    // 5. AUDIT LOG - fire-and-forget, non-blocking
    supabase
      .from("certificate_audit_log")
      .insert({
        certificate_id: cert.id,
        event_type: "revoked",
        actor_id: user.profile.id,
        actor_role: user.profile.role || "doctor",
        event_data: { reason, revoked_at: timestamp },
      })
      .then(() => {}, () => {})

    // 6. REVALIDATE
    revalidatePath("/doctor")
    revalidatePath(`/patient/intakes/${intakeId}`)
    revalidatePath(`/patient/documents`)

    return { success: true }
  } catch (error) {
    logger.error("[RevokeCert] Unexpected error", { intakeId }, error instanceof Error ? error : undefined)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to revoke certificate",
    }
  }
}
