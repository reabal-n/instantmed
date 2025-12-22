import "server-only"
import { createClient } from "@/lib/supabase/server"

/**
 * Generate or retrieve a referral code for a patient
 */
export async function generateReferralCode(patientId: string): Promise<string> {
  const supabase = await createClient()

  // Check if patient already has a referral code
  const { data: existing } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", patientId)
    .single()

  if (existing?.referral_code) {
    return existing.referral_code
  }

  // Generate a new referral code
  const code = `IM${patientId.slice(0, 6).toUpperCase()}${Date.now().toString(36).toUpperCase()}`

  // Save the referral code
  await supabase
    .from("profiles")
    .update({ referral_code: code })
    .eq("id", patientId)

  return code
}

/**
 * Get referral statistics for a patient
 */
export async function getReferralStats(_patientId: string): Promise<{
  totalReferrals: number
  successfulReferrals: number
  pendingReferrals: number
}> {
  // TODO: Implement when referrals tracking table is created
  // For now, return empty stats
  return {
    totalReferrals: 0,
    successfulReferrals: 0,
    pendingReferrals: 0,
  }
}
