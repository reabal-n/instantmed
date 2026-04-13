import { requireApiRole } from "@/lib/auth/helpers"
import { getHealthProfile } from "@/lib/data/health-profile"
import { NextResponse, type NextRequest } from "next/server"

/**
 * GET /api/doctor/patients/[patientId]/health-profile
 *
 * Returns the patient's health profile for doctor review.
 * Only accessible to authenticated doctors/admins.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params

  // Require doctor or admin role
  const authResult = await requireApiRole(["doctor", "admin"])
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch health profile (decrypts PHI fields via data layer)
  const profile = await getHealthProfile(patientId)

  return NextResponse.json({ profile: profile ?? null })
}
