import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { getModelWithConfig, isAIConfigured, AI_MODEL_CONFIG } from "@/lib/ai/provider"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { createLogger } from "@/lib/observability/logger"
import { requireRole } from "@/lib/auth"
import { REVIEW_SUMMARY_PROMPT, FALLBACK_RESPONSES, PROMPT_VERSION } from "@/lib/ai/prompts"
import { logAIAudit } from "@/lib/ai/audit"
import { getCachedResponse, setCachedResponse } from "@/lib/ai/cache"

const log = createLogger("ai-review-summary-batch")

/**
 * Batch Review Summary Generator
 * 
 * Generates summaries for multiple requests in parallel.
 * Reduces API calls when doctors load their review queue.
 */

interface BatchRequest {
  intakeIds: string[]
  requestIds?: string[] // backward compat
}

interface RequestData {
  id: string
  type: string
  answers: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Rate limiting
    const rateLimitResponse = await applyRateLimit(req, 'sensitive')
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    // Require doctor authentication
    const { profile } = await requireRole(["doctor", "admin"])
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: BatchRequest = await req.json()
    const intakeIds = body.intakeIds || body.requestIds // backward compat

    if (!intakeIds || !Array.isArray(intakeIds) || intakeIds.length === 0) {
      return NextResponse.json(
        { error: "intakeIds array required" },
        { status: 400 }
      )
    }

    // Limit batch size to prevent abuse
    const limitedIds = intakeIds.slice(0, 10)

    // Fetch intake data from database
    const supabase = createServiceRoleClient()
    const { data: requests, error: fetchError } = await supabase
      .from('intakes')
      .select('id, type, answers')
      .in('id', limitedIds)

    if (fetchError) {
      log.error("Failed to fetch intakes for batch summary", { error: fetchError })
      return NextResponse.json(
        { error: "Failed to fetch request data" },
        { status: 500 }
      )
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json({ summaries: {} })
    }

    // Check AI configuration
    if (!isAIConfigured()) {
      // Return fallback for all requests
      const summaries: Record<string, { summary: string; isFallback: boolean }> = {}
      for (const request of requests) {
        summaries[request.id] = {
          summary: FALLBACK_RESPONSES.reviewSummary,
          isFallback: true,
        }
      }
      return NextResponse.json({ summaries })
    }

    // Generate summaries in parallel
    const { model, temperature } = getModelWithConfig('clinical')
    
    const summaryPromises = requests.map(async (request: RequestData) => {
      // Check cache first
      const cached = await getCachedResponse<string>('reviewSummary', request.id)
      if (cached) {
        return { id: request.id, summary: cached, cached: true }
      }

      try {
        const context = formatRequestContext(request)
        
        const { text } = await generateText({
          model,
          system: REVIEW_SUMMARY_PROMPT,
          prompt: `Summarize this ${request.type} request:\n\n${context}`,
          temperature,
        })

        // Cache the result
        await setCachedResponse('reviewSummary', request.id, text)

        return { id: request.id, summary: text, cached: false }
      } catch (error) {
        log.warn("Failed to generate summary for request", { intakeId: request.id, error })
        return { id: request.id, summary: FALLBACK_RESPONSES.reviewSummary, error: true }
      }
    })

    const results = await Promise.all(summaryPromises)
    const responseTime = Date.now() - startTime

    // Build response object
    const summaries: Record<string, { summary: string; cached?: boolean; error?: boolean }> = {}
    for (const result of results) {
      summaries[result.id] = {
        summary: result.summary,
        cached: result.cached,
        error: result.error,
      }
    }

    // Log batch audit
    await logAIAudit({
      endpoint: 'review-summary-batch',
      userId: profile.id,
      requestType: 'batch_summary',
      inputPreview: `Batch of ${limitedIds.length} requests`,
      outputPreview: `Generated ${results.filter(r => !r.error).length} summaries`,
      responseTimeMs: responseTime,
      modelVersion: AI_MODEL_CONFIG.clinical.model,
      metadata: {
        requestCount: limitedIds.length,
        cachedCount: results.filter(r => r.cached).length,
        errorCount: results.filter(r => r.error).length,
        promptVersion: PROMPT_VERSION,
      },
    })

    log.info("Batch summaries generated", {
      doctorId: profile.id,
      requestCount: limitedIds.length,
      cachedCount: results.filter(r => r.cached).length,
      responseTimeMs: responseTime,
    })

    return NextResponse.json({
      summaries,
      meta: {
        total: limitedIds.length,
        generated: results.filter(r => !r.cached && !r.error).length,
        cached: results.filter(r => r.cached).length,
        errors: results.filter(r => r.error).length,
        responseTimeMs: responseTime,
      },
    })

  } catch (error) {
    log.error("Error in batch summary generation", { error })
    return NextResponse.json(
      { error: "Failed to generate summaries" },
      { status: 500 }
    )
  }
}

function formatRequestContext(request: RequestData): string {
  const lines: string[] = []
  lines.push(`Request Type: ${request.type}`)
  
  const answers = request.answers || {}
  
  // Include key fields based on type
  if (request.type === 'med_cert') {
    if (answers.certType) lines.push(`Certificate: ${answers.certType}`)
    if (answers.duration) lines.push(`Duration: ${answers.duration}`)
    if (answers.selectedSymptoms) {
      const symptoms = Array.isArray(answers.selectedSymptoms) 
        ? answers.selectedSymptoms.join(', ')
        : answers.selectedSymptoms
      lines.push(`Symptoms: ${symptoms}`)
    }
  } else if (request.type === 'script' || request.type === 'repeat_rx') {
    const med = answers.medication as Record<string, unknown> | undefined
    if (med?.product_name) lines.push(`Medication: ${med.product_name}`)
    if (answers.indication) lines.push(`Indication: ${answers.indication}`)
    if (answers.stability) lines.push(`Stability: ${answers.stability}`)
  } else {
    if (answers.consultReason) lines.push(`Reason: ${answers.consultReason}`)
    if (answers.consultDetails) lines.push(`Details: ${answers.consultDetails}`)
  }
  
  return lines.join('\n')
}
