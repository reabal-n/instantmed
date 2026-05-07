import { NextRequest, NextResponse } from "next/server"

import { searchPBSItemsEnhanced } from "@/lib/clinical/pbs-client"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"

const log = createLogger("pbs-search")

/**
 * PBS Medication Search - Reference Only
 *
 * This endpoint provides read-only search against the PBS (Pharmaceutical Benefits Scheme)
 * API for patient medication recall purposes only.
 *
 * NOT for: recommendations, prescribing, eligibility, clinical decisions
 *
 * See: CLINICAL.md → Medication Search Rules
 * See: ARCHITECTURE.md → Prescription Workflow
 */

interface MedicationSearchResult {
  pbs_code: string
  drug_name: string
  brand_name: string | null
  active_ingredient: string | null
  form: string | null
  strength: string | null
  manufacturer: string | null
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request, "standard")
  if (rateLimitResponse) return rateLimitResponse

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
      brand_name: item.brand_name,
      active_ingredient: item.active_ingredient,
      form: item.form,
      strength: item.strength,
      manufacturer: item.manufacturer,
    }))

    return NextResponse.json({ results })
  } catch (error) {
    log.error("PBS search exception", {
      error: error instanceof Error ? error.message : String(error),
      queryLength: query.length,
    })
    return NextResponse.json(
      { error: "Search temporarily unavailable" },
      { status: 500 }
    )
  }
}
