import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { auth } from "@clerk/nextjs/server"
const logger = createLogger("amt-search")

// NCTS FHIR Terminology Server for Australian Medicines Terminology (AMT)
const NCTS_FHIR_BASE = "https://tx.ontoserver.csiro.au/fhir"
const AMT_VALUE_SET = "http://snomed.info/sct?fhir_vs=ecl/%5E929360071000036103" // AMT Medicinal Product Pack

// Request timeout for NCTS (5 seconds)
const NCTS_TIMEOUT_MS = 5000

// Cache TTL: 24 hours
const CACHE_TTL_HOURS = 24

// Initialize Supabase client for cache operations (service role for server-side)
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceKey) {
    logger.error("AMT Cache: Missing Supabase credentials")
    return null
  }
  
  return createClient(supabaseUrl, serviceKey)
}

// Normalize query for cache key
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim()
}

// Get cached result from Supabase
async function getCachedResult(queryNorm: string): Promise<{ results: unknown; stale: boolean } | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("amt_search_cache")
      .select("results, expires_at")
      .eq("query_norm", queryNorm)
      .single()

    if (error || !data) return null

    const isExpired = new Date(data.expires_at) < new Date()
    
    // Return cached data with stale flag if expired
    return {
      results: data.results,
      stale: isExpired,
    }
  } catch {
    return null
  }
}

// Set cached result in Supabase (upsert)
async function setCachedResult(queryNorm: string, results: unknown): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return

  try {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS)

    await supabase
      .from("amt_search_cache")
      .upsert(
        {
          query_norm: queryNorm,
          results,
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: "query_norm" }
      )
  } catch (err) {
    logger.error("AMT Cache: Error setting cache", {
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

// S8 controlled substances - block these from repeat script flow
const BLOCKED_S8_TERMS = [
  "oxycodone", "oxycontin", "endone", "targin",
  "morphine", "ms contin", "kapanol",
  "fentanyl", "durogesic", "abstral",
  "hydromorphone", "dilaudid", "jurnista",
  "methadone", "physeptone",
  "buprenorphine", "suboxone", "subutex", "temgesic",
  "dexamphetamine", "dexedrine",
  "lisdexamfetamine", "vyvanse",
  "methylphenidate", "ritalin", "concerta",
  "ketamine",
  "alprazolam", "xanax",
  "diazepam", "valium",
  "clonazepam", "rivotril",
  "temazepam", "temaze", "normison",
  "oxazepam", "serepax",
  "lorazepam", "ativan",
  "nitrazepam", "mogadon",
  "zolpidem", "stilnox",
  "zopiclone", "imovane",
  "codeine phosphate", "codeine linctus",
]

function isBlockedSubstance(display: string): boolean {
  const lower = display.toLowerCase()
  return BLOCKED_S8_TERMS.some(term => lower.includes(term))
}

interface AMTResult {
  code: string
  display: string
  medicationName: string
  strength: string
  form: string
}

// Parse AMT display string to extract medication name, strength, and form
// AMT format is typically: "Brand Name strength form" or "Generic Name strength form"
function parseAMTDisplay(display: string): { medicationName: string; strength: string; form: string } {
  // Common form patterns
  const formPatterns = [
    /\b(tablet|capsule|injection|solution|suspension|cream|ointment|gel|patch|inhaler|spray|drops|syrup|powder|suppository|pessary|lozenge|wafer|film|granules|sachet|ampoule|vial|pen|cartridge|prefilled syringe)\b/i,
  ]
  
  // Common strength patterns
  const strengthPatterns = [
    /(\d+(?:\.\d+)?\s*(?:mg|g|mcg|µg|ml|mL|IU|units?|mmol)(?:\/\d+(?:\.\d+)?\s*(?:mg|g|mcg|µg|ml|mL|dose|actuation|spray|puff))?)/gi,
  ]

  let form = ""
  let strength = ""
  let medicationName = display

  // Extract form
  for (const pattern of formPatterns) {
    const match = display.match(pattern)
    if (match) {
      form = match[1]
      break
    }
  }

  // Extract strength
  const strengthMatches = display.match(strengthPatterns[0])
  if (strengthMatches && strengthMatches.length > 0) {
    strength = strengthMatches[0]
  }

  // Extract medication name (everything before strength/form)
  if (strength) {
    const strengthIndex = display.toLowerCase().indexOf(strength.toLowerCase())
    if (strengthIndex > 0) {
      medicationName = display.substring(0, strengthIndex).trim()
    }
  }

  // Clean up medication name
  medicationName = medicationName.replace(/[,\s]+$/, "").trim()

  return {
    medicationName: medicationName || display,
    strength: strength || "",
    form: form || "",
  }
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const { userId } = await auth()
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"
  const rateLimitKey = userId || `ip:${ip}`
  
  const rateLimitResponse = await applyRateLimit(request, 'standard', rateLimitKey)
  if (rateLimitResponse) {
    return rateLimitResponse
  }
  
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")?.trim()

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], message: "Query must be at least 2 characters" })
  }

  // Block S8 searches at the query level
  if (isBlockedSubstance(query)) {
    return NextResponse.json({
      results: [],
      blocked: true,
      message: "Schedule 8 medications cannot be prescribed via repeat script. Please book a General Consult.",
    })
  }

  // Normalize query for cache key
  const queryNorm = normalizeQuery(query)

  // Check Supabase cache first
  const cached = await getCachedResult(queryNorm)
  if (cached && !cached.stale) {
    // Fresh cache hit
    return NextResponse.json({ ...(cached.results as object), cached: true })
  }

  try {
    // Use NCTS FHIR ValueSet $expand operation to search AMT
    const fhirUrl = new URL(`${NCTS_FHIR_BASE}/ValueSet/$expand`)
    fhirUrl.searchParams.set("url", AMT_VALUE_SET)
    fhirUrl.searchParams.set("filter", query)
    fhirUrl.searchParams.set("count", "20")
    fhirUrl.searchParams.set("includeDesignations", "true")

    // Add timeout using AbortController
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), NCTS_TIMEOUT_MS)

    const response = await fetch(fhirUrl.toString(), {
      headers: {
        Accept: "application/fhir+json",
      },
      signal: controller.signal,
      next: { revalidate: 300 }, // Next.js cache for 5 minutes
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      logger.error("AMT Search: NCTS FHIR error", {
        status: response.status,
        query,
      })
      // If we have stale cache, return it as fallback
      if (cached) {
        return NextResponse.json({ ...(cached.results as object), stale: true })
      }
      return NextResponse.json({
        results: [],
        serviceUnavailable: true,
        message: "Medication search is temporarily unavailable. Please try again in a moment.",
      })
    }

    const data = await response.json()
    
    // Extract results from FHIR ValueSet expansion
    const contains = data.expansion?.contains || []
    
    const results: AMTResult[] = contains
      .filter((item: { display?: string }) => {
        // Filter out S8 substances from results
        return item.display && !isBlockedSubstance(item.display)
      })
      .map((item: { code: string; display: string }) => {
        const parsed = parseAMTDisplay(item.display)
        return {
          code: item.code,
          display: item.display,
          medicationName: parsed.medicationName,
          strength: parsed.strength,
          form: parsed.form,
        }
      })
      .slice(0, 15) // Limit to 15 results

    const responseData = {
      results,
      total: results.length,
    }

    // Cache successful results in Supabase (async, don't await)
    setCachedResult(queryNorm, responseData)

    return NextResponse.json(responseData)
  } catch (error) {
    // Handle timeout specifically
    if (error instanceof Error && error.name === "AbortError") {
      logger.error("AMT Search: NCTS timeout", {
        timeoutMs: NCTS_TIMEOUT_MS,
        query,
      })
      // If we have stale cache, return it as fallback
      if (cached) {
        return NextResponse.json({ ...(cached.results as object), stale: true })
      }
      return NextResponse.json({
        results: [],
        serviceUnavailable: true,
        message: "Medication search timed out. Please try again.",
      })
    }

    logger.error("AMT Search: Error", {
      query,
    }, error instanceof Error ? error : new Error(String(error)))
    // If we have stale cache, return it as fallback
    if (cached) {
      return NextResponse.json({ ...(cached.results as object), stale: true })
    }
    return NextResponse.json({
      results: [],
      serviceUnavailable: true,
      message: "Medication search is temporarily unavailable. Please try again.",
    })
  }
}
