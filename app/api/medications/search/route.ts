import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, incrementRateLimit, getClientIP } from "@/lib/rate-limit/limiter"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("artg-search")

/**
 * ARTG Medication Search - Reference Only
 * 
 * This endpoint provides read-only search against the TGA ARTG dataset
 * for patient medication recall purposes only.
 * 
 * NOT for: recommendations, prescribing, eligibility, clinical decisions
 * 
 * See: docs/MEDICATION_SEARCH_POLICY.md
 * See: docs/MEDICATION_SEARCH_SPEC.md
 */

interface ArtgSearchResult {
  artg_id: string
  product_name: string | null
  active_ingredients_raw: string | null
  dosage_form: string | null
  route: string | null
}

export async function GET(request: NextRequest) {
  const ip = await getClientIP()
  const rateLimitResult = await checkRateLimit(
    ip,
    "ip",
    "/api/medications/search",
    { maxRequests: 30, windowMs: 60 * 1000 }
  )

  if (!rateLimitResult.allowed) {
    log.warn("Rate limit exceeded for ARTG search", { ip })
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

  await incrementRateLimit(ip, "ip", "/api/medications/search", {
    maxRequests: 30,
    windowMs: 60 * 1000,
  })

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
    const supabase = await createClient()

    // Use ranked fuzzy search with pg_trgm similarity
    const { data, error } = await supabase.rpc("search_artg_products", {
      search_query: query,
      result_limit: limit,
    })

    if (error) {
      log.error("ARTG search RPC error", { error: error.message, query })
      // Fallback to simple ILIKE if RPC fails
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("artg_products")
        .select("artg_id, product_name, active_ingredients_raw, dosage_form, route")
        .or(`product_name.ilike.%${query}%,active_ingredients_raw.ilike.%${query}%`)
        .limit(limit)

      if (fallbackError) {
        log.error("ARTG search fallback error", { error: fallbackError.message, query })
        return NextResponse.json(
          { error: "Search temporarily unavailable" },
          { status: 500 }
        )
      }

      const results: ArtgSearchResult[] = (fallbackData || []).map((row) => ({
        artg_id: row.artg_id,
        product_name: row.product_name,
        active_ingredients_raw: row.active_ingredients_raw,
        dosage_form: row.dosage_form,
        route: row.route,
      }))

      return NextResponse.json({ results })
    }

    const results: ArtgSearchResult[] = (data || []).map((row: ArtgSearchResult) => ({
      artg_id: row.artg_id,
      product_name: row.product_name,
      active_ingredients_raw: row.active_ingredients_raw,
      dosage_form: row.dosage_form,
      route: row.route,
    }))

    return NextResponse.json({ results })
  } catch (error) {
    log.error("ARTG search exception", {
      error: error instanceof Error ? error.message : String(error),
      query,
    })
    return NextResponse.json(
      { error: "Search temporarily unavailable" },
      { status: 500 }
    )
  }
}
