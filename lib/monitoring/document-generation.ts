/**
 * Document Generation Metrics
 * 
 * OBSERVABILITY_AUDIT P2: PDF Certificate Generation Tracking
 * 
 * Tracks success/failure rates for document generation.
 */

import { createClient } from "@/lib/supabase/server"
import * as Sentry from "@sentry/nextjs"

export interface DocumentGenerationMetrics {
  requestId: string
  documentType: "med_cert" | "referral" | "pathology" | "repeat_rx"
  success: boolean
  latencyMs: number
  pageCount?: number
  fileSizeKb?: number
  errorType?: "template_error" | "api_error" | "storage_error" | "timeout"
  errorMessage?: string
}

/**
 * Record document generation attempt
 */
export async function recordDocumentGeneration(
  metrics: DocumentGenerationMetrics
): Promise<void> {
  const supabase = await createClient()
  
  await supabase.from("document_generation_metrics").insert({
    request_id: metrics.requestId,
    document_type: metrics.documentType,
    success: metrics.success,
    latency_ms: metrics.latencyMs,
    page_count: metrics.pageCount,
    file_size_kb: metrics.fileSizeKb,
    error_type: metrics.errorType,
    error_message: metrics.errorMessage,
    created_at: new Date().toISOString(),
  })
  
  // Alert on failure
  if (!metrics.success) {
    Sentry.captureMessage("Document generation failed", {
      level: "warning",
      tags: {
        alert_type: "document_generation",
        document_type: metrics.documentType,
        error_type: metrics.errorType || "unknown",
      },
      extra: {
        requestId: metrics.requestId,
        latencyMs: metrics.latencyMs,
        errorMessage: metrics.errorMessage,
      },
    })
  }
}

/**
 * Get document generation metrics for a time period
 */
export async function getDocumentGenerationMetrics(
  periodHours: number = 24
): Promise<{
  totalGenerated: number
  successCount: number
  failureCount: number
  successRate: number
  avgLatencyMs: number
  byType: Record<string, { success: number; failed: number; avgLatencyMs: number }>
  errorsByType: Record<string, number>
}> {
  const supabase = await createClient()
  const since = new Date(Date.now() - periodHours * 60 * 60 * 1000).toISOString()
  
  const { data } = await supabase
    .from("document_generation_metrics")
    .select("*")
    .gte("created_at", since)
  
  if (!data || data.length === 0) {
    return {
      totalGenerated: 0,
      successCount: 0,
      failureCount: 0,
      successRate: 1,
      avgLatencyMs: 0,
      byType: {},
      errorsByType: {},
    }
  }
  
  const successes = data.filter(d => d.success)
  const failures = data.filter(d => !d.success)
  
  const avgLatency = successes.length > 0
    ? successes.reduce((sum, d) => sum + (d.latency_ms || 0), 0) / successes.length
    : 0
  
  const byType = data.reduce((acc, d) => {
    if (!acc[d.document_type]) {
      acc[d.document_type] = { success: 0, failed: 0, totalLatency: 0, count: 0 }
    }
    if (d.success) {
      acc[d.document_type].success++
      acc[d.document_type].totalLatency += d.latency_ms || 0
      acc[d.document_type].count++
    } else {
      acc[d.document_type].failed++
    }
    return acc
  }, {} as Record<string, { success: number; failed: number; totalLatency: number; count: number }>)
  
  const byTypeFormatted: Record<string, { success: number; failed: number; avgLatencyMs: number }> = {}
  for (const type of Object.keys(byType)) {
    const stats = byType[type]
    byTypeFormatted[type] = {
      success: stats.success,
      failed: stats.failed,
      avgLatencyMs: stats.count > 0 ? Math.round(stats.totalLatency / stats.count) : 0,
    }
  }
  
  const errorsByType = failures.reduce((acc, d) => {
    const errorType = d.error_type || "unknown"
    acc[errorType] = (acc[errorType] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return {
    totalGenerated: data.length,
    successCount: successes.length,
    failureCount: failures.length,
    successRate: data.length > 0 ? successes.length / data.length : 1,
    avgLatencyMs: Math.round(avgLatency),
    byType: byTypeFormatted,
    errorsByType,
  }
}

/**
 * Wrapper to track document generation with metrics
 */
export async function withDocumentMetrics<T>(
  requestId: string,
  documentType: DocumentGenerationMetrics["documentType"],
  generateFn: () => Promise<{ pageCount?: number; fileSizeKb?: number; result: T }>
): Promise<T> {
  const startTime = Date.now()
  
  try {
    const { pageCount, fileSizeKb, result } = await generateFn()
    
    await recordDocumentGeneration({
      requestId,
      documentType,
      success: true,
      latencyMs: Date.now() - startTime,
      pageCount,
      fileSizeKb,
    })
    
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    let errorType: DocumentGenerationMetrics["errorType"] = "api_error"
    
    if (errorMessage.includes("template")) errorType = "template_error"
    else if (errorMessage.includes("storage") || errorMessage.includes("upload")) errorType = "storage_error"
    else if (errorMessage.includes("timeout")) errorType = "timeout"
    
    await recordDocumentGeneration({
      requestId,
      documentType,
      success: false,
      latencyMs: Date.now() - startTime,
      errorType,
      errorMessage: errorMessage.substring(0, 500),
    })
    
    throw error
  }
}
