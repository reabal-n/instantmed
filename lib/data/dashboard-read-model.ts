import { toError } from "@/lib/errors"
import {
  type DashboardDegradedReadEvent,
  reportDashboardDegradedRead,
} from "@/lib/observability/dashboard-fallbacks"
import { withRetry } from "@/lib/utils/error-handling"

type DashboardReadResult<T> = {
  data: T | null
  error?: unknown
}

interface ReadDashboardQueryOptions<T> {
  label: string
  fallback: T
  operation: () => Promise<DashboardReadResult<T>>
  maxAttempts?: number
  baseDelayMs?: number
  context?: Record<string, unknown>
  onDegradedRead?: (event: DashboardDegradedReadEvent) => void
}

export async function readDashboardQuery<T>({
  label,
  fallback,
  operation,
  maxAttempts = 2,
  baseDelayMs = 250,
  context,
  onDegradedRead = reportDashboardDegradedRead,
}: ReadDashboardQueryOptions<T>): Promise<T> {
  try {
    const result = await withRetry(operation, maxAttempts, baseDelayMs)

    if (result.error) {
      onDegradedRead({
        label,
        attempts: 1,
        error: toError(result.error),
        context,
      })
      return fallback
    }

    return result.data ?? fallback
  } catch (error) {
    onDegradedRead({
      label,
      attempts: maxAttempts,
      error: toError(error),
      context,
    })
    return fallback
  }
}
