/**
 * Generic retry with exponential backoff.
 *
 * Used to wrap @google/genai Files API operations which are flaky on
 * upload + ACTIVE polling (network blips, quota throttles, transient
 * 5xx). The Vercel AI SDK has its own retry; this helper covers the
 * Gemini side which does NOT.
 *
 * Defaults: 3 attempts, 1s -> 2s -> 4s backoff. Override per call.
 *
 * Errors thrown by the inner fn are surfaced after the final attempt
 * with the original cause preserved.
 */

export interface RetryOptions {
  attempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  /** Human label for the operation, used in log lines on retry. */
  label?: string
  /** Decide whether an error is worth retrying. Default: retry everything. */
  shouldRetry?: (err: unknown) => boolean
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3)
  const initial = Math.max(100, opts.initialDelayMs ?? 1000)
  const max = Math.max(initial, opts.maxDelayMs ?? 10_000)
  const label = opts.label ?? "operation"
  const shouldRetry = opts.shouldRetry ?? (() => true)

  let lastErr: unknown
  let delay = initial
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const isLast = i === attempts - 1
      if (isLast || !shouldRetry(err)) break
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(
        `[retry] ${label} attempt ${i + 1}/${attempts} failed: ${msg}. Retrying in ${delay}ms...`,
      )
      await new Promise((r) => setTimeout(r, delay))
      delay = Math.min(delay * 2, max)
    }
  }
  throw lastErr
}

/**
 * Wrap a promise with a hard timeout. If the promise has not settled by
 * the time the timeout fires, throw with a clear label so the caller
 * knows which stage hung.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} exceeded ${timeoutMs}ms timeout`))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
