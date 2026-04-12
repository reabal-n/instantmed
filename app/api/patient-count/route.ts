import { NextResponse } from "next/server"
import { getPatientCountFromDB } from "@/lib/social-proof/server"

/**
 * GET /api/patient-count
 *
 * Returns the real patient count from the DB (approved + completed intakes).
 * Cached at the Next.js layer for 1 hour via getPatientCountFromDB().
 * Falls back to the interpolated count if the DB is unreachable.
 *
 * Used by usePatientCount() for client-side display.
 */
export async function GET() {
  const count = await getPatientCountFromDB()
  return NextResponse.json({ count }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300" } })
}
