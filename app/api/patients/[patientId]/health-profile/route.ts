import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { auth } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"

/**
 * GET /api/patients/[patientId]/health-profile
 *
 * Returns the patient's health profile for doctor review.
 * Only accessible to authenticated doctors/admins.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params

  // Verify the caller is authenticated via Clerk
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Check caller has doctor or admin role
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("clerk_user_id", clerkUserId)
    .single()

  if (!callerProfile || !["doctor", "admin"].includes(callerProfile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Fetch health profile
  const { data: profile, error } = await supabase
    .from("patient_health_profiles")
    .select("allergies, conditions, current_medications, blood_type, emergency_contact_name, emergency_contact_phone, notes, updated_at")
    .eq("patient_id", patientId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ profile: null }, { status: 200 })
  }

  return NextResponse.json({ profile })
}
