/**
 * AI Health Monitoring
 * 
 * OBSERVABILITY_AUDIT P0: AI Failure Rate Aggregation + Alert
 * 
 * Tracks AI request success/failure rates and latency for degradation detection.
 */

import * as Sentry from "@sentry/nextjs"

interface AIRequestRecord {
  success: boolean
  timestamp: number
  latencyMs: number
  endpoint: string
  errorType?: string
  inputTokens?: number
  outputTokens?: number
}

// In-memory sliding window for recent requests (last 5 minutes)
const recentRequests: AIRequestRecord[] = []
const WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const ALERT_THRESHOLD_FAILURE_RATE = 0.1 // 10%
const ALERT_THRESHOLD_LATENCY_MS = 5000 // 5 seconds
const MIN_SAMPLE_SIZE = 10

/**
 * Record an AI request result
 */
export function recordAIRequest(params: {
  endpoint: string
  success: boolean
  latencyMs: number
  errorType?: string
  inputTokens?: number
  outputTokens?: number
}): void {
  const now = Date.now()
  
  // Add new record
  recentRequests.push({
    ...params,
    timestamp: now,
  })
  
  // Prune old records
  pruneOldRecords()
  
  // Check for degradation
  checkAIHealth()
}

/**
 * Remove records older than the window
 */
function pruneOldRecords(): void {
  const cutoff = Date.now() - WINDOW_MS
  while (recentRequests.length > 0 && recentRequests[0].timestamp < cutoff) {
    recentRequests.shift()
  }
}

/**
 * Check AI health and alert if degraded
 */
function checkAIHealth(): void {
  if (recentRequests.length < MIN_SAMPLE_SIZE) return
  
  const failures = recentRequests.filter(r => !r.success)
  const failureRate = failures.length / recentRequests.length
  
  // Check failure rate
  if (failureRate > ALERT_THRESHOLD_FAILURE_RATE) {
    const errorDistribution = failures.reduce((acc, f) => {
      const type = f.errorType || "unknown"
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    Sentry.captureMessage("AI service degradation detected", {
      level: failureRate > 0.25 ? "error" : "warning",
      tags: { 
        alert_type: "ai_degradation",
        severity: failureRate > 0.25 ? "critical" : "warning",
      },
      extra: {
        failureRate: Math.round(failureRate * 100),
        sampleSize: recentRequests.length,
        windowMinutes: WINDOW_MS / 60000,
        errorDistribution,
        recentEndpoints: [...new Set(failures.slice(-5).map(f => f.endpoint))],
      },
    })
  }
  
  // Check latency (P95)
  const latencies = recentRequests
    .filter(r => r.success)
    .map(r => r.latencyMs)
    .sort((a, b) => a - b)
  
  if (latencies.length >= MIN_SAMPLE_SIZE) {
    const p95Index = Math.ceil(latencies.length * 0.95) - 1
    const p95Latency = latencies[p95Index]
    
    if (p95Latency > ALERT_THRESHOLD_LATENCY_MS) {
      Sentry.captureMessage("AI latency degradation detected", {
        level: "warning",
        tags: { alert_type: "ai_latency" },
        extra: {
          p95LatencyMs: p95Latency,
          p50LatencyMs: latencies[Math.floor(latencies.length * 0.5)],
          sampleSize: latencies.length,
          threshold: ALERT_THRESHOLD_LATENCY_MS,
        },
      })
    }
  }
}

/**
 * Get current AI health metrics
 */
export function getAIHealthMetrics(): {
  requestCount: number
  failureRate: number
  avgLatencyMs: number
  p50LatencyMs: number
  p95LatencyMs: number
  errorsByType: Record<string, number>
  requestsByEndpoint: Record<string, number>
  tokenUsage: { input: number; output: number }
  isHealthy: boolean
} {
  pruneOldRecords()
  
  if (recentRequests.length === 0) {
    return {
      requestCount: 0,
      failureRate: 0,
      avgLatencyMs: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      errorsByType: {},
      requestsByEndpoint: {},
      tokenUsage: { input: 0, output: 0 },
      isHealthy: true,
    }
  }
  
  const failures = recentRequests.filter(r => !r.success)
  const successes = recentRequests.filter(r => r.success)
  const latencies = successes.map(r => r.latencyMs).sort((a, b) => a - b)
  
  const failureRate = failures.length / recentRequests.length
  
  const errorsByType = failures.reduce((acc, f) => {
    const type = f.errorType || "unknown"
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const requestsByEndpoint = recentRequests.reduce((acc, r) => {
    acc[r.endpoint] = (acc[r.endpoint] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const tokenUsage = recentRequests.reduce(
    (acc, r) => ({
      input: acc.input + (r.inputTokens || 0),
      output: acc.output + (r.outputTokens || 0),
    }),
    { input: 0, output: 0 }
  )
  
  const avgLatency = latencies.length > 0
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
    : 0
  
  const p50 = latencies.length > 0
    ? latencies[Math.floor(latencies.length * 0.5)]
    : 0
    
  const p95 = latencies.length > 0
    ? latencies[Math.ceil(latencies.length * 0.95) - 1]
    : 0
  
  return {
    requestCount: recentRequests.length,
    failureRate,
    avgLatencyMs: Math.round(avgLatency),
    p50LatencyMs: p50,
    p95LatencyMs: p95,
    errorsByType,
    requestsByEndpoint,
    tokenUsage,
    isHealthy: failureRate < ALERT_THRESHOLD_FAILURE_RATE && p95 < ALERT_THRESHOLD_LATENCY_MS,
  }
}

/**
 * AI endpoints enum for consistency
 */
export const AI_ENDPOINTS = {
  CHAT_INTAKE: "chat-intake",
  REVIEW_SUMMARY: "review-summary",
  CLINICAL_NOTE: "clinical-note",
  MED_CERT_DRAFT: "med-cert-draft",
  REPEAT_RX_SUMMARY: "repeat-rx-summary",
} as const

export type AIEndpoint = typeof AI_ENDPOINTS[keyof typeof AI_ENDPOINTS]

/**
 * AI error types for categorization
 */
export const AI_ERROR_TYPES = {
  RATE_LIMIT: "rate_limit",
  TIMEOUT: "timeout",
  MODEL_ERROR: "model_error",
  SAFETY_BLOCK: "safety_block",
  NETWORK: "network",
  INVALID_RESPONSE: "invalid_response",
  TOKEN_LIMIT: "token_limit",
} as const

export type AIErrorType = typeof AI_ERROR_TYPES[keyof typeof AI_ERROR_TYPES]
