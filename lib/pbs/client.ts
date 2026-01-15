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

interface ItemOverviewResult {
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
 * Search PBS items by drug name using the /item-overview endpoint
 * This provides a comprehensive view of PBS items suitable for medication search
 */
export async function searchPBSItems(
  query: string,
  limit: number = 15
): Promise<PBSSearchResult[]> {
  if (!query || query.length < 2) {
    return []
  }

  try {
    // Use item-overview endpoint with filter for drug name
    // The filter uses ODATA expression format
    const filterExpression = `drug_name eq '*${encodeURIComponent(query)}*' or li_drug_name eq '*${encodeURIComponent(query)}*' or brand_name eq '*${encodeURIComponent(query)}*'`

    const url = new URL(`${PBS_API_BASE_URL}/item-overview`)
    url.searchParams.set("limit", String(limit))
    url.searchParams.set("filter", filterExpression)

    const response = await fetch(url.toString(), {
      headers: {
        "Subscription-Key": PBS_API_KEY,
        Accept: "application/json",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      // If filter fails, try simple items endpoint with broader search
      return await searchPBSItemsFallback(query, limit)
    }

    const data: PBSApiResponse<ItemOverviewResult> = await response.json()

    return data.data.map((item) => ({
      pbs_code: item.pbs_code,
      drug_name: item.drug_name || item.li_drug_name || "",
      form: item.li_form,
      strength: item.pack_size,
      manufacturer: item.manufacturer_name,
    }))
  } catch (error) {
    log.error("PBS API search error", { error: error instanceof Error ? error.message : String(error) })
    return await searchPBSItemsFallback(query, limit)
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
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
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
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

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

  // Strategy 1: Try exact prefix match first via API
  let results = await searchPBSItems(normalizedQuery, limit)

  if (results.length > 0) {
    return results
  }

  // Strategy 2: Try fetching all and filtering client-side for small datasets
  // This is a fallback for when API filtering doesn't work well
  results = await searchPBSItemsFallback(normalizedQuery, limit)

  return results
}
