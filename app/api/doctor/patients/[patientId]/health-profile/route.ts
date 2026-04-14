import { type NextRequest,NextResponse } from "next/server"

import { requireApiRole } from "@/lib/auth/helpers"
import { getHealthProfile } from "@/lib/data/health-profile"
import { applyRateLimit } from "@/lib/rate-limit/redis"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/doctor/patients/[patientId]/health-profile
 *
 * Returns the patient's health profile for doctor review.
 * Only accessible to authenticated doctors/admins.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request, "standard")
  if (rateLimitResponse) return rateLimitResponse

  const { patientId } = await params

  if (!UUID_RE.test(patientId)) {
    return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 })
  }

  // Require doctor or admin role
  const authResult = await requireApiRole(["doctor", "admin"])
  if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch health profile (decrypts PHI fields via data layer)
  const profile = await getHealthProfile(patientId)

  return NextResponse.json({ profile: profile ?? null })
}
