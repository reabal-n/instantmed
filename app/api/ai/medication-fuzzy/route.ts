import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createClient } from "@/lib/supabase/server"

export const runtime = "edge"

/**
 * AI-Powered Medication Fuzzy Search
 * 
 * Uses GPT to interpret typos, brand names, and colloquial medication names
 * and map them to proper search terms for the ARTG database.
 * 
 * This is REFERENCE ONLY for patient recall, NOT for prescribing.
 */

interface FuzzySearchRequest {
  query: string
}

// Common brand name to generic mappings for faster lookups
const BRAND_MAPPINGS: Record<string, string[]> = {
  "panadol": ["paracetamol"],
  "nurofen": ["ibuprofen"],
  "voltaren": ["diclofenac"],
  "lipitor": ["atorvastatin"],
  "norvasc": ["amlodipine"],
  "coversyl": ["perindopril"],
  "diabex": ["metformin"],
  "glucophage": ["metformin"],
  "nexium": ["esomeprazole"],
  "somac": ["pantoprazole"],
  "zoloft": ["sertraline"],
  "lexapro": ["escitalopram"],
  "effexor": ["venlafaxine"],
  "lyrica": ["pregabalin"],
  "ventolin": ["salbutamol"],
  "seretide": ["fluticasone", "salmeterol"],
  "symbicort": ["budesonide", "formoterol"],
  "spiriva": ["tiotropium"],
  "crestor": ["rosuvastatin"],
  "tritace": ["ramipril"],
  "micardis": ["telmisartan"],
  "avapro": ["irbesartan"],
  "atacand": ["candesartan"],
}

// Common typos to correct
const TYPO_CORRECTIONS: Record<string, string> = {
  "panadool": "panadol",
  "panado": "panadol",
  "paracetmol": "paracetamol",
  "paracetamole": "paracetamol",
  "ibuprofin": "ibuprofen",
  "iboprofen": "ibuprofen",
  "metforman": "metformin",
  "atorvastain": "atorvastatin",
  "omeprazol": "omeprazole",
  "amoxicilin": "amoxicillin",
  "amoxycillin": "amoxicillin",
  "penicilin": "penicillin",
  "ventolin": "ventolin",
  "ventalin": "ventolin",
  "salbutomol": "salbutamol",
}

export async function POST(req: NextRequest) {
  try {
    const body: FuzzySearchRequest = await req.json()
    const { query } = body

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [], correctedQuery: null })
    }

    const normalizedQuery = query.toLowerCase().trim()
    
    // Step 1: Check for known typos
    const correctedQuery = TYPO_CORRECTIONS[normalizedQuery] || normalizedQuery
    
    // Step 2: Check for brand name mappings
    const brandMatch = BRAND_MAPPINGS[correctedQuery]
    const searchTerms: string[] = brandMatch 
      ? [correctedQuery, ...brandMatch]
      : [correctedQuery]

    // Step 3: If no local match found and query looks like a typo, use AI
    let aiSuggestions: string[] = []
    const hasLocalMatch = correctedQuery !== normalizedQuery || brandMatch
    
    if (!hasLocalMatch && query.length >= 3) {
      try {
        const { text } = await generateText({
          model: "openai/gpt-4o-mini",
          prompt: `You are a medication name interpreter. The user typed: "${query}"

This might be:
- A misspelled medication name
- A brand name (Australian or international)
- A colloquial/informal medication name
- An active ingredient name

Return ONLY a JSON array of 1-3 possible correct medication names (generic names preferred).
If it's clearly not a medication or you're unsure, return an empty array.

Examples:
- "panadool" → ["paracetamol", "panadol"]
- "blood pressure pill" → ["antihypertensive"]
- "metforman" → ["metformin"]
- "the purple puffer" → ["seretide"]
- "random word" → []

Return ONLY the JSON array, nothing else:`,
        })

        // Parse AI response
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
        const parsed = JSON.parse(cleaned)
        if (Array.isArray(parsed)) {
          aiSuggestions = parsed.filter((s): s is string => typeof s === "string").slice(0, 3)
        }
      } catch {
        // AI failed, continue with original query
      }
    }

    // Step 4: Search the database with all terms
    const allSearchTerms = [...new Set([...searchTerms, ...aiSuggestions])]
    
    const supabase = await createClient()
    const results: Array<{
      artg_id: string
      product_name: string | null
      active_ingredients_raw: string | null
      dosage_form: string | null
      route: string | null
      match_type: string
    }> = []

    // Search for each term
    for (const term of allSearchTerms.slice(0, 3)) {
      const { data } = await supabase.rpc("search_artg_products", {
        search_query: term,
        result_limit: 5,
      })

      if (data) {
        for (const row of data) {
          // Avoid duplicates
          if (!results.find(r => r.artg_id === row.artg_id)) {
            results.push({
              ...row,
              match_type: term === normalizedQuery ? "exact" : "fuzzy",
            })
          }
        }
      }
    }

    return NextResponse.json({
      results: results.slice(0, 10),
      correctedQuery: correctedQuery !== normalizedQuery ? correctedQuery : null,
      searchTerms: allSearchTerms,
      aiAssisted: aiSuggestions.length > 0,
    })
  } catch (_error) {
    return NextResponse.json(
      { error: "Search temporarily unavailable", results: [] },
      { status: 500 }
    )
  }
}
