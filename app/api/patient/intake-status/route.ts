import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * Lightweight endpoint for polling intake status from the success page.
 * Uses service-role to bypass RLS (client Supabase has no auth session).
 * Ownership verified via auth session + patient_id check.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const intakeId = req.nextUrl.searchParams.get("id")
  if (!intakeId) {
    return NextResponse.json({ error: "Missing intake ID" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // Look up profile by auth user ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", userId)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  // Fetch intake with ownership check
  const { data: intake } = await supabase
    .from("intakes")
    .select("status")
    .eq("id", intakeId)
    .eq("patient_id", profile.id)
    .maybeSingle()

  if (!intake) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ status: intake.status })
}
