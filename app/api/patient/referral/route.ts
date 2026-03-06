import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextResponse } from "next/server"

/**
 * GET /api/patient/referral?patientId=<id>
 * Returns referral code and stats for the patient dashboard.
 *
 * Generates a deterministic referral code from the profile ID.
 * Stats are stub values — full referral tracking to be built post-launch.
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

  // Verify the requesting user owns this profile
  const supabase = createServiceRoleClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, clerk_user_id")
    .eq("id", patientId)
    .maybeSingle()

  if (!profile || profile.clerk_user_id !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Generate deterministic referral code from profile ID
  // Take first 8 chars of the UUID, uppercase
  const referralCode = patientId.replace(/-/g, "").slice(0, 8).toUpperCase()

  return NextResponse.json({
    referralCode,
    creditBalance: 0,
    totalReferrals: 0,
    completedReferrals: 0,
  })
}
