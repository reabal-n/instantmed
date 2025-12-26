import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, incrementRateLimit, getClientIP } from "@/lib/rate-limit/limiter"
import { logger } from "@/lib/logger"

export async function GET(request: NextRequest) {
  // Rate limiting using database
  const ip = await getClientIP()
  const rateLimitResult = await checkRateLimit(
    ip,
    "ip",
    "/api/medications",
    { maxRequests: 30, windowMs: 60 * 1000 } // 30 requests per minute
  )

  if (!rateLimitResult.allowed) {
    logger.warn('Rate limit exceeded for medications search', { ip })
    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        retryAfter: rateLimitResult.retryAfter
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60)
        }
      }
    )
  }

  // Increment rate limit
  await incrementRateLimit(
    ip,
    "ip",
    "/api/medications",
    { maxRequests: 30, windowMs: 60 * 1000 }
  )

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")?.trim()

  if (!query || query.length < 2) {
    return NextResponse.json({ medications: [] })
  }

  // Validate query length to prevent abuse
  if (query.length > 100) {
    return NextResponse.json(
      { error: "Query too long" },
      { status: 400 }
    )
  }

  // Block S8/controlled substance searches
  const blockedTerms = [
    "oxycodone", "oxycontin", "endone",
    "morphine", "ms contin",
    "fentanyl", "durogesic",
    "codeine", // when searching for codeine-only products
    "tramadol",
    "tapentadol", "palexia",
    "hydromorphone", "dilaudid",
    "methadone",
    "buprenorphine", "suboxone", "subutex",
    "dexamphetamine", "dextroamphetamine",
    "methylphenidate", "ritalin", "concerta",
    "lisdexamfetamine", "vyvanse",
    "alprazolam", "xanax",
    "diazepam", "valium",
    "clonazepam", "rivotril",
    "temazepam", "temaze", "normison",
    "oxazepam", "serepax",
    "lorazepam", "ativan",
    "nitrazepam", "mogadon",
    "zolpidem", "stilnox",
    "zopiclone", "imovane",
  ]
  
  const lowerQuery = query.toLowerCase()
  if (blockedTerms.some(term => lowerQuery.includes(term))) {
    return NextResponse.json({ 
      medications: [],
      blocked: true,
      message: "Schedule 8 and controlled substances cannot be prescribed through this service."
    })
  }

  try {
    const supabase = await createClient()

    // Use the search_medications function we already have in the database
    const { data, error } = await supabase.rpc("search_medications", {
      search_query: query,
      limit_results: 15
    })

    if (error) {
      logger.error("Medication search RPC error", { error, query })
      // Fallback to direct query if RPC fails
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("medications")
        .select("id, name, brand_names, category, category_label, schedule, forms, default_form, default_strength, is_common")
        .eq("is_active", true)
        .or(`name.ilike.%${query}%,category_label.ilike.%${query}%`)
        .order("is_common", { ascending: false })
        .order("display_order", { ascending: true })
        .limit(15)

      if (fallbackError) {
        logger.error("Medication search fallback error", { error: fallbackError, query })
        throw fallbackError
      }

      // Transform to match expected format
      const medications = (fallbackData || []).map(med => transformMedication(med))
      return NextResponse.json({ medications })
    }

    // Transform results to include form/strength combinations
    const medications = (data || []).map((med: MedicationRow) => transformMedication(med))

    return NextResponse.json({ medications })
  } catch (error) {
    logger.error("Medication search error", {
      error: error instanceof Error ? error.message : String(error),
      query
    })
    return NextResponse.json(
      { error: "Failed to search medications" },
      { status: 500 }
    )
  }
}

interface MedicationRow {
  id: string
  name: string
  brand_names: string[]
  category: string
  category_label: string
  schedule: string | null
  forms: Array<{ form: string; strengths: string[] }> | string
  default_form: string | null
  default_strength: string | null
  is_common: boolean
}

interface MedicationOption {
  id: string
  medication_id: string
  label: string
  generic: string
  brand_names: string[]
  form: string
  strength: string
  category: string
  schedule: string | null
  is_common: boolean
}

function transformMedication(med: MedicationRow): MedicationOption[] {
  const results: MedicationOption[] = []
  
  // Parse forms if it's a string (JSONB comes as object, but just in case)
  let forms: Array<{ form: string; strengths: string[] }> = []
  if (typeof med.forms === "string") {
    try {
      forms = JSON.parse(med.forms)
    } catch {
      forms = []
    }
  } else if (Array.isArray(med.forms)) {
    forms = med.forms
  }
  
  // Generate options for each form/strength combination
  for (const formData of forms) {
    for (const strength of formData.strengths) {
      const brandDisplay = med.brand_names?.length > 0 ? ` (${med.brand_names[0]})` : ""
      results.push({
        id: `${med.id}_${formData.form}_${strength}`.replace(/[^a-zA-Z0-9_]/g, "_"),
        medication_id: med.id,
        label: `${med.name} ${strength} ${formData.form}${brandDisplay}`,
        generic: med.name,
        brand_names: med.brand_names || [],
        form: formData.form,
        strength: strength,
        category: med.category_label,
        schedule: med.schedule,
        is_common: med.is_common
      })
    }
  }
  
  // If no forms/strengths, return a basic entry
  if (results.length === 0 && med.default_form && med.default_strength) {
    const brandDisplay = med.brand_names?.length > 0 ? ` (${med.brand_names[0]})` : ""
    results.push({
      id: `${med.id}_default`,
      medication_id: med.id,
      label: `${med.name} ${med.default_strength} ${med.default_form}${brandDisplay}`,
      generic: med.name,
      brand_names: med.brand_names || [],
      form: med.default_form,
      strength: med.default_strength,
      category: med.category_label,
      schedule: med.schedule,
      is_common: med.is_common
    })
  }
  
  return results
}
