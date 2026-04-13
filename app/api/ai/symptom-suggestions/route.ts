import { generateText } from "ai"
import { NextRequest, NextResponse } from "next/server"

import { getCachedResponse, setCachedResponse } from "@/lib/ai/cache"
import { checkAndSanitize } from "@/lib/ai/prompt-safety"
import { CONTEXT_PROMPTS, FALLBACK_RESPONSES,SYMPTOM_SUGGESTIONS_PROMPT } from "@/lib/ai/prompts"
import { getModelWithConfig, isAIConfigured } from "@/lib/ai/provider"
import { recordAIRequest } from "@/lib/monitoring/ai-health"
import { applyRateLimit, getClientIdentifier } from "@/lib/rate-limit/redis"

export const runtime = "edge"

interface SuggestionRequest {
  input: string
  context: "med_cert" | "repeat_rx" | "consult"
  isCarer?: boolean
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting (IP-based for unauthenticated)
    const clientId = getClientIdentifier(req)
    const rateLimitResponse = await applyRateLimit(req, "ai", clientId)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body: SuggestionRequest = await req.json()
    const { input, context, isCarer } = body

    if (!input || input.length < 3) {
      return NextResponse.json({ suggestions: [] })
    }

    // Prompt safety: sanitize user input before including in AI prompt
    const safety = checkAndSanitize(input, { endpoint: "symptom-suggestions" })
    if (safety.blocked) {
      return NextResponse.json({ suggestions: FALLBACK_RESPONSES.symptomSuggestions, fallback: true })
    }
    const sanitizedInput = safety.output

    // Normalize input for caching (lowercase, trim)
    const normalizedInput = sanitizedInput.toLowerCase().trim()
    const cacheContext = `${context}:${isCarer ? 'carer' : 'self'}`

    // Check cache first
    const cached = await getCachedResponse<string[]>(
      'symptomSuggestions',
      normalizedInput,
      cacheContext
    )
    if (cached) {
      return NextResponse.json({ suggestions: cached, cached: true })
    }

    // Check AI configuration - return fallback if not configured
    if (!isAIConfigured()) {
      return NextResponse.json({ 
        suggestions: FALLBACK_RESPONSES.symptomSuggestions,
        fallback: true 
      })
    }

    // Build context-aware prompt
    const contextPrompt = context === 'med_cert' 
      ? (isCarer ? CONTEXT_PROMPTS.medCert.carer : CONTEXT_PROMPTS.medCert.personal)
      : context === 'repeat_rx' 
        ? CONTEXT_PROMPTS.repeatRx 
        : CONTEXT_PROMPTS.consult

    const prompt = `${SYMPTOM_SUGGESTIONS_PROMPT}

Context: ${contextPrompt}

The patient has started typing: "${sanitizedInput}"`

    // Get model with creative configuration (higher temperature for variety)
    const { model, temperature } = getModelWithConfig('creative')

    const aiStartTime = Date.now()
    const { text } = await generateText({
      model,
      prompt,
      temperature,
    })

    // Parse the response
    let suggestions: string[] = []
    try {
      const cleaned = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim()
      suggestions = JSON.parse(cleaned)
      
      if (!Array.isArray(suggestions)) {
        suggestions = []
      }
      suggestions = suggestions
        .filter((s): s is string => typeof s === "string")
        .slice(0, 3)
    } catch {
      suggestions = FALLBACK_RESPONSES.symptomSuggestions
    }

    // Record successful AI request
    recordAIRequest({ endpoint: "symptom-suggestions", success: true, latencyMs: Date.now() - aiStartTime })

    // Cache successful response
    if (suggestions.length > 0) {
      await setCachedResponse('symptomSuggestions', normalizedInput, suggestions, cacheContext)
    }

    return NextResponse.json({ suggestions })
  } catch {
    recordAIRequest({ endpoint: "symptom-suggestions", success: false, latencyMs: 0, errorType: "model_error" })
    // Return fallback suggestions on error
    return NextResponse.json({
      suggestions: FALLBACK_RESPONSES.symptomSuggestions,
      fallback: true
    })
  }
}
