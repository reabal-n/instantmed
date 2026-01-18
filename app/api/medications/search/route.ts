import { NextRequest, NextResponse } from "next/server"
import { checkAndIncrementRateLimit, getClientIP } from "@/lib/rate-limit/limiter"
import { createLogger } from "@/lib/observability/logger"
import { searchPBSItemsEnhanced } from "@/lib/pbs/client"

const log = createLogger("pbs-search")

/**
 * PBS Medication Search - Reference Only
 * 
 * This endpoint provides read-only search against the PBS (Pharmaceutical Benefits Scheme)
 * API for patient medication recall purposes only.
 * 
 * NOT for: recommendations, prescribing, eligibility, clinical decisions
 * 
 * See: docs/MEDICATION_SEARCH_POLICY.md
 * See: docs/MEDICATION_SEARCH_SPEC.md
 */

interface MedicationSearchResult {
  pbs_code: string
  drug_name: string
  form: string | null
  strength: string | null
  manufacturer: string | null
}

export async function GET(request: NextRequest) {
  const ip = await getClientIP()
  
  // Atomic check-and-increment to prevent race conditions
  const rateLimitResult = await checkAndIncrementRateLimit(
    ip,
    "ip",
    "/api/medications/search",
    { maxRequests: 30, windowMs: 60 * 1000 }
  )

  if (!rateLimitResult.allowed) {
    log.warn("Rate limit exceeded for PBS search", { ip })
    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        retryAfter: rateLimitResult.retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitResult.retryAfter || 60),
        },
      }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")?.trim()
  const limitParam = searchParams.get("limit")
  const limit = Math.min(Math.max(parseInt(limitParam || "15", 10) || 15, 1), 50)

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  if (query.length > 100) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 })
  }

  try {
    // Search PBS API directly
    const pbsResults = await searchPBSItemsEnhanced(query, limit)

    // Map to consistent response format
    const results: MedicationSearchResult[] = pbsResults.map((item) => ({
      pbs_code: item.pbs_code,
      drug_name: item.drug_name,
      form: item.form,
      strength: item.strength,
      manufacturer: item.manufacturer,
    }))

    return NextResponse.json({ results })
  } catch (error) {
    log.error("PBS search exception", {
      error: error instanceof Error ? error.message : String(error),
      query,
    })
    return NextResponse.json(
      { error: "Search temporarily unavailable" },
      { status: 500 }
    )
  }
}
