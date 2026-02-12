import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

/**
 * GET /api/patients/[patientId]/health-profile
 * 
 * Returns the patient's health profile for doctor review.
 * Only accessible to authenticated doctors.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params

  // Verify the caller is an authenticated doctor
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check doctor role
  const serviceClient = createServiceRoleClient()
  const { data: doctor } = await serviceClient
    .from("doctors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!doctor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Fetch health profile
  const { data: profile, error } = await serviceClient
    .from("patient_health_profiles")
    .select("allergies, conditions, current_medications, blood_type, emergency_contact_name, emergency_contact_phone, notes, updated_at")
    .eq("patient_id", patientId)
    .maybeSingle()

  if (error) {
    // Profile not found or fetch failed - return null gracefully
    return NextResponse.json({ profile: null }, { status: 200 })
  }

  return NextResponse.json({ profile })
}
