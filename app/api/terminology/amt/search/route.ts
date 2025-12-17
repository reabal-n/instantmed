import { NextRequest, NextResponse } from "next/server"

// NCTS FHIR Terminology Server for Australian Medicines Terminology (AMT)
const NCTS_FHIR_BASE = "https://tx.ontoserver.csiro.au/fhir"
const AMT_VALUE_SET = "http://snomed.info/sct?fhir_vs=ecl/%5E929360071000036103" // AMT Medicinal Product Pack

// Request timeout for NCTS (5 seconds)
const NCTS_TIMEOUT_MS = 5000

// In-memory cache for AMT results (short TTL for reliability)
const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getCachedResult(key: string): unknown | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }
  cache.delete(key)
  return null
}

function setCachedResult(key: string, data: unknown): void {
  // Limit cache size to prevent memory issues
  if (cache.size > 1000) {
    const oldestKey = cache.keys().next().value
    if (oldestKey) cache.delete(oldestKey)
  }
  cache.set(key, { data, timestamp: Date.now() })
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

  // Check cache first
  const cacheKey = `amt:${query.toLowerCase()}`
  const cached = getCachedResult(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
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
      console.error("[AMT Search] NCTS FHIR error:", response.status)
      // Return graceful error - don't show "no results" for service issues
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

    // Cache successful results
    setCachedResult(cacheKey, responseData)

    return NextResponse.json(responseData)
  } catch (error) {
    // Handle timeout specifically
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[AMT Search] NCTS timeout after", NCTS_TIMEOUT_MS, "ms")
      return NextResponse.json({
        results: [],
        serviceUnavailable: true,
        message: "Medication search timed out. Please try again.",
      })
    }

    console.error("[AMT Search] Error:", error)
    return NextResponse.json({
      results: [],
      serviceUnavailable: true,
      message: "Medication search is temporarily unavailable. Please try again.",
    })
  }
}
