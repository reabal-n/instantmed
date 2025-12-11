import { createClient } from "@/lib/supabase/server"
import { nanoid } from "nanoid"

export async function generateReferralCode(profileId: string): Promise<string> {
  const supabase = await createClient()

  // Check if user already has a referral code
  const { data: existing } = await supabase
    .from("referrals")
    .select("referral_code")
    .eq("referrer_id", profileId)
    .eq("status", "pending")
    .limit(1)
    .single()

  if (existing) return existing.referral_code

  // Generate unique code
  const code = nanoid(8).toUpperCase()

  await supabase.from("referrals").insert({
    referrer_id: profileId,
    referral_code: code,
  })

  return code
}

export async function getReferralStats(profileId: string) {
  const supabase = await createClient()

  // Get all referrals by this user
  const { data: referrals } = await supabase
    .from("referrals")
    .select("status, referrer_credited")
    .eq("referrer_id", profileId)

  // Get credit balance
  const { data: credits } = await supabase.from("credits").select("amount, type").eq("profile_id", profileId)

  const totalEarned = credits?.filter((c) => c.type === "referral_bonus").reduce((sum, c) => sum + c.amount, 0) || 0
  const totalUsed = credits?.filter((c) => c.type === "used").reduce((sum, c) => sum + Math.abs(c.amount), 0) || 0
  const balance = totalEarned - totalUsed

  return {
    totalReferrals: referrals?.length || 0,
    completedReferrals: referrals?.filter((r) => r.status === "completed").length || 0,
    pendingReferrals: referrals?.filter((r) => r.status === "pending" || r.status === "signed_up").length || 0,
    creditBalance: balance, // in cents
    totalEarned,
  }
}

export async function applyReferralCode(
  refereeProfileId: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Find the referral
  const { data: referral, error } = await supabase
    .from("referrals")
    .select("*")
    .eq("referral_code", code.toUpperCase())
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .single()

  if (error || !referral) {
    return { success: false, error: "Invalid or expired referral code" }
  }

  // Can't refer yourself
  if (referral.referrer_id === refereeProfileId) {
    return { success: false, error: "You can't use your own referral code" }
  }

  // Update referral status
  await supabase
    .from("referrals")
    .update({
      referee_id: refereeProfileId,
      status: "signed_up",
    })
    .eq("id", referral.id)

  // Credit the referee immediately ($5)
  await supabase.from("credits").insert({
    profile_id: refereeProfileId,
    amount: referral.referee_credit_amount,
    type: "referral_bonus",
    description: "Welcome bonus from referral",
    referral_id: referral.id,
  })

  // Mark referee as credited
  await supabase.from("referrals").update({ referee_credited: true }).eq("id", referral.id)

  return { success: true }
}

export async function completeReferral(referralId: string): Promise<void> {
  const supabase = await createClient()

  const { data: referral } = await supabase.from("referrals").select("*").eq("id", referralId).single()

  if (!referral || referral.referrer_credited) return

  // Credit the referrer
  await supabase.from("credits").insert({
    profile_id: referral.referrer_id,
    amount: referral.referrer_credit_amount,
    type: "referral_bonus",
    description: "Referral bonus - friend completed first request",
    referral_id: referral.id,
  })

  // Update referral status
  await supabase
    .from("referrals")
    .update({
      status: "completed",
      referrer_credited: true,
      completed_at: new Date().toISOString(),
    })
    .eq("id", referral.id)
}

export async function getCreditBalance(profileId: string): Promise<number> {
  const supabase = await createClient()

  const { data: credits } = await supabase.from("credits").select("amount, type").eq("profile_id", profileId)

  if (!credits) return 0

  return credits.reduce((balance, credit) => {
    return credit.type === "used" ? balance - Math.abs(credit.amount) : balance + credit.amount
  }, 0)
}

export async function useCredits(profileId: string, amount: number, description: string): Promise<boolean> {
  const balance = await getCreditBalance(profileId)
  if (balance < amount) return false

  const supabase = await createClient()

  await supabase.from("credits").insert({
    profile_id: profileId,
    amount: -amount,
    type: "used",
    description,
  })

  return true
}
