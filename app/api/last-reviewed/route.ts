import { NextResponse } from "next/server"

import { getLastReviewedAt } from "@/lib/brand/last-reviewed"

/**
 * Public, PHI-free freshness beacon for the homepage "Last reviewed N min ago"
 * signal: a single platform-wide timestamp of the most recent completed review
 * (seeded E2E and excluded rows filtered at the source). Cached 60s so the
 * signal stays honest without a per-visitor database read.
 */
export const revalidate = 60

export async function GET() {
  const lastReviewedAt = await getLastReviewedAt()
  return NextResponse.json(
    { lastReviewedAt },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  )
}
