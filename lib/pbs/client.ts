/**
 * PBS (Pharmaceutical Benefits Scheme) API Client
 *
 * Provides access to the Department of Health PBS API for medication search.
 * Used for patient medication recall/reference only - NOT for prescribing.
 *
 * API Documentation: https://data-api.health.gov.au/pbs/api/v3/
 */

import { createLogger } from "@/lib/observability/logger"

const log = createLogger("pbs-client")

const PBS_API_BASE_URL = "https://data-api.health.gov.au/pbs/api/v3"
const PBS_API_KEY = process.env.PBS_API_KEY || "2384af7c667342ceb5a736fe29f1dc6b" // Public key from docs

// In-memory cache to reduce API calls and avoid rate limits
const searchCache = new Map<string, { results: PBSSearchResult[]; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getCachedResults(query: string): PBSSearchResult[] | null {
  const cached = searchCache.get(query.toLowerCase())
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.results
  }
  return null
}

function setCachedResults(query: string, results: PBSSearchResult[]): void {
  searchCache.set(query.toLowerCase(), { results, timestamp: Date.now() })
  // Clean old entries if cache gets too large
  if (searchCache.size > 500) {
    const now = Date.now()
    for (const [key, value] of searchCache.entries()) {
      if (now - value.timestamp > CACHE_TTL_MS) {
        searchCache.delete(key)
      }
    }
  }
}

export interface PBSItem {
  pbs_code: string
  drug_name: string
  li_drug_name: string | null
  li_form: string | null
  schedule_code: string | null
  program_code: string | null
  atc_code: string | null
  atc_name: string | null
  manufacturer_code: string | null
  manufacturer_name: string | null
  pack_size: string | null
  max_quantity: number | null
  number_of_repeats: number | null
  restriction_flag: string | null
}

export interface PBSSearchResult {
  pbs_code: string
  drug_name: string
  form: string | null
  strength: string | null
  manufacturer: string | null
}

export interface PBSApiResponse<T> {
  _meta: {
    total_records: number
    page: number
    limit: number
    count: number
  }
  _links: Array<{ href: string; rel: string }>
  data: T[]
}

interface _ItemOverviewResult {
  pbs_code: string
  li_item_id: number | null
  drug_name: string
  li_drug_name: string | null
  li_form: string | null
  brand_name: string | null
  manufacturer_code: string | null
  manufacturer_name: string | null
  pack_size: string | null
  number_of_repeats: number | null
  max_quantity: number | null
  tgm_indicator: string | null
  restriction_flag: string | null
}

/**
 * Search PBS items by drug name using the /items endpoint
 * Fetches items and filters by drug_name parameter
 */
export async function searchPBSItems(
  query: string,
  limit: number = 15
): Promise<PBSSearchResult[]> {
  if (!query || query.length < 2) {
    return []
  }

  try {
    // The PBS API supports drug_name as a direct query parameter (case-insensitive partial match)
    const url = new URL(`${PBS_API_BASE_URL}/items`)
    url.searchParams.set("limit", String(Math.min(limit * 3, 100))) // Fetch more to allow deduplication
    url.searchParams.set("drug_name", query)

    const response = await fetch(url.toString(), {
      headers: {
        "Subscription-Key": PBS_API_KEY,
        Accept: "application/json",
      },
      cache: "no-store", // Avoid caching issues in Edge runtime
    })

    if (!response.ok) {
      log.warn("PBS API items endpoint failed", { status: response.status })
      return await searchPBSItemsFallback(query, limit)
    }

    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch (parseError) {
      log.error("PBS API JSON parse error", { error: parseError instanceof Error ? parseError.message : String(parseError), textLength: text.length })
      return await searchPBSItemsFallback(query, limit)
    }
    
    if (!data.data || data.data.length === 0) {
      // Try brand_name search as fallback
      return await searchPBSByBrandName(query, limit)
    }

    // Deduplicate by drug_name + li_form combination
    const seen = new Set<string>()
    const results: PBSSearchResult[] = []
    
    for (const item of data.data) {
      const key = `${item.drug_name || item.li_drug_name}-${item.li_form || ""}`
      if (!seen.has(key)) {
        seen.add(key)
        results.push({
          pbs_code: item.pbs_code,
          drug_name: item.drug_name || item.li_drug_name || "",
          form: item.li_form || null,
          strength: item.li_form || null, // li_form contains strength info
          manufacturer: item.manufacturer_code || null,
        })
      }
      if (results.length >= limit) break
    }

    return results
  } catch (error) {
    log.error("PBS API search error", { error: error instanceof Error ? error.message : String(error) })
    return await searchPBSItemsFallback(query, limit)
  }
}

/**
 * Search PBS items by brand name
 */
async function searchPBSByBrandName(
  query: string,
  limit: number
): Promise<PBSSearchResult[]> {
  try {
    const url = new URL(`${PBS_API_BASE_URL}/items`)
    url.searchParams.set("limit", String(Math.min(limit * 2, 50)))
    url.searchParams.set("brand_name", query)

    const response = await fetch(url.toString(), {
      headers: {
        "Subscription-Key": PBS_API_KEY,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      return []
    }

    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      return []
    }

    if (!data.data || data.data.length === 0) {
      return []
    }

    // Deduplicate by drug_name + li_form combination
    const seen = new Set<string>()
    const results: PBSSearchResult[] = []

    for (const item of data.data) {
      const key = `${item.drug_name || item.li_drug_name}-${item.li_form || ""}`
      if (!seen.has(key)) {
        seen.add(key)
        results.push({
          pbs_code: item.pbs_code,
          drug_name: item.drug_name || item.li_drug_name || "",
          form: item.li_form || null,
          strength: item.li_form || null,
          manufacturer: item.manufacturer_code || null,
        })
      }
      if (results.length >= limit) break
    }

    return results
  } catch (error) {
    log.error("PBS API brand search error", { error: error instanceof Error ? error.message : String(error) })
    return []
  }
}

/**
 * Fallback search using /items endpoint with simpler query
 */
async function searchPBSItemsFallback(
  query: string,
  limit: number
): Promise<PBSSearchResult[]> {
  try {
    const url = new URL(`${PBS_API_BASE_URL}/items`)
    url.searchParams.set("limit", String(limit))

    const response = await fetch(url.toString(), {
      headers: {
        "Subscription-Key": PBS_API_KEY,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      return []
    }

    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      return []
    }
    const queryLower = query.toLowerCase()

    // Client-side filter since direct filtering may not work
    const filtered = (data.data || [])
      .filter((item: Record<string, unknown>) => {
        const drugName = String(item.drug_name || "").toLowerCase()
        const liDrugName = String(item.li_drug_name || "").toLowerCase()
        return drugName.includes(queryLower) || liDrugName.includes(queryLower)
      })
      .slice(0, limit)

    return filtered.map((item: Record<string, unknown>) => ({
      pbs_code: String(item.pbs_code || ""),
      drug_name: String(item.drug_name || item.li_drug_name || ""),
      form: item.li_form ? String(item.li_form) : null,
      strength: item.pack_size ? String(item.pack_size) : null,
      manufacturer: item.manufacturer_name ? String(item.manufacturer_name) : null,
    }))
  } catch (error) {
    log.error("PBS API fallback search error", { error: error instanceof Error ? error.message : String(error) })
    return []
  }
}

/**
 * Get detailed information about a specific PBS item
 */
export async function getPBSItem(pbsCode: string): Promise<PBSItem | null> {
  try {
    const url = new URL(`${PBS_API_BASE_URL}/items`)
    url.searchParams.set("filter", `pbs_code eq '${pbsCode}'`)
    url.searchParams.set("limit", "1")

    const response = await fetch(url.toString(), {
      headers: {
        "Subscription-Key": PBS_API_KEY,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      return null
    }

    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      return null
    }

    if (!data.data || data.data.length === 0) {
      return null
    }

    const item = data.data[0]
    return {
      pbs_code: item.pbs_code,
      drug_name: item.drug_name,
      li_drug_name: item.li_drug_name,
      li_form: item.li_form,
      schedule_code: item.schedule_code,
      program_code: item.program_code,
      atc_code: item.atc_code,
      atc_name: item.atc_name,
      manufacturer_code: item.manufacturer_code,
      manufacturer_name: item.manufacturer_name,
      pack_size: item.pack_size,
      max_quantity: item.max_quantity,
      number_of_repeats: item.number_of_repeats,
      restriction_flag: item.restriction_flag,
    }
  } catch (error) {
    log.error("PBS API get item error", { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

/**
 * Search PBS items with improved matching using multiple search strategies
 */
export async function searchPBSItemsEnhanced(
  query: string,
  limit: number = 15
): Promise<PBSSearchResult[]> {
  const normalizedQuery = query.toLowerCase().trim()

  // Check cache first to avoid rate limits
  const cached = getCachedResults(normalizedQuery)
  if (cached) {
    return cached.slice(0, limit)
  }

  // Strategy 1: Try exact prefix match first via API
  let results = await searchPBSItems(normalizedQuery, limit)

  if (results.length > 0) {
    setCachedResults(normalizedQuery, results)
    return results
  }

  // Strategy 2: Try fetching all and filtering client-side for small datasets
  // This is a fallback for when API filtering doesn't work well
  results = await searchPBSItemsFallback(normalizedQuery, limit)
  
  if (results.length > 0) {
    setCachedResults(normalizedQuery, results)
  }

  return results
}
