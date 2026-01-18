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
// Public API key - rate limited to 1 req/20s shared globally
// TODO: Register for dedicated API key at https://data-api.health.gov.au/ for production
const PBS_API_KEY = process.env.PBS_API_KEY || "2384af7c667342ceb5a736fe29f1dc6b"
const API_TIMEOUT_MS = 5000 // 5 second timeout to prevent hanging

// Circuit breaker state - prevents cascading failures when PBS API is down
let circuitOpen = false
let circuitOpenedAt = 0
let consecutiveFailures = 0
const CIRCUIT_RESET_MS = 30000 // 30 seconds before retry
const CIRCUIT_FAILURE_THRESHOLD = 3 // Open circuit after 3 consecutive failures

function isCircuitOpen(): boolean {
  if (!circuitOpen) return false
  // Check if enough time has passed to try again (half-open state)
  if (Date.now() - circuitOpenedAt >= CIRCUIT_RESET_MS) {
    log.info("Circuit breaker half-open, allowing test request")
    return false
  }
  return true
}

function recordSuccess(): void {
  if (circuitOpen) {
    log.info("Circuit breaker closed after successful request")
  }
  circuitOpen = false
  consecutiveFailures = 0
}

function recordFailure(): void {
  consecutiveFailures++
  if (consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD && !circuitOpen) {
    circuitOpen = true
    circuitOpenedAt = Date.now()
    log.warn("Circuit breaker opened due to consecutive failures", { consecutiveFailures })
  }
}

// In-memory cache to reduce API calls and avoid rate limits
const searchCache = new Map<string, { results: PBSSearchResult[]; timestamp: number }>()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes - longer cache for better UX

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
 * Fetch with timeout wrapper to prevent hanging requests
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Parse PBS API response data into PBSSearchResult array
 */
function parseItemsToResults(
  items: Record<string, unknown>[],
  limit: number
): PBSSearchResult[] {
  const seen = new Set<string>()
  const results: PBSSearchResult[] = []

  for (const item of items) {
    const drugName = String(item.drug_name || item.li_drug_name || "")
    const form = item.li_form ? String(item.li_form) : null
    const key = `${drugName.toLowerCase()}-${form || ""}`
    
    if (drugName && !seen.has(key)) {
      seen.add(key)
      results.push({
        pbs_code: String(item.pbs_code || ""),
        drug_name: drugName,
        form: form,
        strength: form, // li_form contains strength info
        manufacturer: item.manufacturer_code ? String(item.manufacturer_code) : null,
      })
    }
    if (results.length >= limit) break
  }

  return results
}

/**
 * Search PBS items by a specific field (drug_name or brand_name)
 */
async function searchPBSByField(
  field: "drug_name" | "brand_name",
  query: string,
  limit: number
): Promise<PBSSearchResult[]> {
  // Circuit breaker - fast fail if API is known to be down
  if (isCircuitOpen()) {
    log.debug("PBS API circuit open, skipping request", { field, query })
    return []
  }

  const startTime = Date.now()
  try {
    const url = new URL(`${PBS_API_BASE_URL}/items`)
    url.searchParams.set("limit", String(Math.min(limit * 2, 50)))
    url.searchParams.set(field, query)

    const response = await fetchWithTimeout(url.toString(), {
      headers: {
        "Subscription-Key": PBS_API_KEY,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      log.warn("PBS API error response", { field, query, status: response.status, duration })
      recordFailure()
      return []
    }

    const text = await response.text()
    const data = JSON.parse(text)

    // Log latency for monitoring
    log.info("PBS API response", { field, query, duration, resultCount: data.data?.length || 0 })
    recordSuccess()

    if (!data.data || data.data.length === 0) {
      return []
    }

    return parseItemsToResults(data.data, limit)
  } catch (error) {
    const duration = Date.now() - startTime
    if (error instanceof Error && error.name === "AbortError") {
      log.warn(`PBS API ${field} search timeout`, { query, duration })
    } else {
      log.error(`PBS API ${field} search error`, { query, duration, error: error instanceof Error ? error.message : String(error) })
    }
    recordFailure()
    return []
  }
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
  return searchPBSByField("drug_name", query, limit)
}


/**
 * Get detailed information about a specific PBS item
 */
export async function getPBSItem(pbsCode: string): Promise<PBSItem | null> {
  // Circuit breaker check
  if (isCircuitOpen()) {
    log.debug("PBS API circuit open, skipping getPBSItem")
    return null
  }

  const startTime = Date.now()
  try {
    const url = new URL(`${PBS_API_BASE_URL}/items`)
    url.searchParams.set("filter", `pbs_code eq '${pbsCode}'`)
    url.searchParams.set("limit", "1")

    const response = await fetchWithTimeout(url.toString(), {
      headers: {
        "Subscription-Key": PBS_API_KEY,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      log.warn("PBS API getPBSItem error", { pbsCode, status: response.status, duration })
      recordFailure()
      return null
    }

    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      return null
    }

    log.info("PBS API getPBSItem response", { pbsCode, duration, found: !!data.data?.length })
    recordSuccess()

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
    const duration = Date.now() - startTime
    log.error("PBS API get item error", { pbsCode, duration, error: error instanceof Error ? error.message : String(error) })
    recordFailure()
    return null
  }
}

/**
 * Search PBS items with improved matching using PARALLEL search strategies
 * Searches both drug_name and brand_name simultaneously for faster results
 */
export async function searchPBSItemsEnhanced(
  query: string,
  limit: number = 15
): Promise<PBSSearchResult[]> {
  const normalizedQuery = query.toLowerCase().trim()

  if (!normalizedQuery || normalizedQuery.length < 2) {
    return []
  }

  // Check cache first to avoid rate limits
  const cached = getCachedResults(normalizedQuery)
  if (cached) {
    return cached.slice(0, limit)
  }

  // PARALLEL search: drug_name and brand_name at the same time
  const [drugResults, brandResults] = await Promise.all([
    searchPBSByField("drug_name", normalizedQuery, limit),
    searchPBSByField("brand_name", normalizedQuery, limit),
  ])

  // Merge and deduplicate results, prioritizing drug_name matches
  const seen = new Set<string>()
  const merged: PBSSearchResult[] = []

  for (const result of [...drugResults, ...brandResults]) {
    const key = `${result.drug_name.toLowerCase()}-${result.form || ""}`
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(result)
    }
    if (merged.length >= limit) break
  }

  // Cache results even if empty to avoid repeated failed searches
  setCachedResults(normalizedQuery, merged)

  return merged
}
