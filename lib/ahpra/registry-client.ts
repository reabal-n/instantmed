import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("ahpra-verification")

/**
 * AHPRA doesn't provide a public API. Verification is a manual process:
 * 1. Admin checks the AHPRA public register
 * 2. Admin marks the doctor as verified in the system
 * 3. Yearly re-verification reminders are set
 */

export async function markDoctorVerified(
  doctorId: string,
  verifiedById: string,
  notes?: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const nextReview = new Date()
  nextReview.setFullYear(nextReview.getFullYear() + 1)

  const { error } = await supabase
    .from("profiles")
    .update({
      ahpra_verified: true,
      ahpra_verified_at: new Date().toISOString(),
      ahpra_verified_by: verifiedById,
      ahpra_verification_notes: notes || null,
      ahpra_next_review_at: nextReview.toISOString(),
    })
    .eq("id", doctorId)

  if (error) {
    log.error("Failed to verify doctor", { doctorId, error: error.message })
    return false
  }

  log.info("Doctor AHPRA verified", { doctorId, verifiedBy: verifiedById })
  return true
}

export async function revokeDoctorVerification(
  doctorId: string,
  revokedById: string,
  reason: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("profiles")
    .update({
      ahpra_verified: false,
      ahpra_verification_notes: `Revoked: ${reason}`,
    })
    .eq("id", doctorId)

  if (error) {
    log.error("Failed to revoke verification", { doctorId, error: error.message })
    return false
  }

  log.info("Doctor AHPRA verification revoked", { doctorId, revokedBy: revokedById, reason })
  return true
}

export async function getDoctorsNeedingReVerification(): Promise<Array<{ id: string; full_name: string; ahpra_number: string; ahpra_next_review_at: string }>> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, ahpra_number, ahpra_next_review_at")
    .eq("role", "doctor")
    .eq("ahpra_verified", true)
    .lt("ahpra_next_review_at", new Date().toISOString())

  if (error) {
    log.error("Failed to query re-verification list", { error: error.message })
    return []
  }

  return data || []
}
