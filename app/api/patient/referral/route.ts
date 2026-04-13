import { auth } from "@/lib/auth/helpers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextResponse } from "next/server"

/**
 * GET /api/patient/referral?patientId=<id>
 * Returns referral code, credit balance, and referral stats for the patient dashboard.
 */
export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get("patientId")

  if (!patientId) {
    return NextResponse.json({ error: "Missing patientId" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // Verify ownership
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, auth_user_id, referral_code")
    .eq("id", patientId)
    .maybeSingle()

  if (!profile || profile.auth_user_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Ensure referral_code exists (backfill for accounts created before this feature)
  let referralCode = profile.referral_code
  if (!referralCode) {
    referralCode = patientId.replace(/-/g, "").slice(0, 8).toUpperCase()
    await supabase
      .from("profiles")
      .update({ referral_code: referralCode })
      .eq("id", patientId)
  }

  // Fetch referral events where this user is the referrer
  const { data: events } = await supabase
    .from("referral_events")
    .select("id, status")
    .eq("referrer_id", patientId)

  const totalReferrals = events?.length ?? 0
  const completedReferrals = events?.filter(e => e.status === "credited" || e.status === "completed").length ?? 0

  // Fetch unapplied credit balance
  const { data: credits } = await supabase
    .from("referral_credits")
    .select("credit_cents")
    .eq("profile_id", patientId)
    .is("applied_at", null)

  const creditBalance = credits?.reduce((sum, c) => sum + c.credit_cents, 0) ?? 0

  return NextResponse.json({
    referralCode,
    creditBalance,
    totalReferrals,
    completedReferrals,
  })
}
