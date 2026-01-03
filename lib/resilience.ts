/**
 * Retry utility with exponential backoff
 * Handles network failures and transient errors gracefully
 */

interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  onRetry?: (attempt: number, error: Error) => void
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    onRetry,
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt),
        maxDelayMs
      )

      // Add jitter to prevent thundering herd
      const jitter = delay * Math.random() * 0.1
      const totalDelay = delay + jitter

      onRetry?.(attempt + 1, lastError)

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, totalDelay))
    }
  }

  throw lastError
}

/**
 * Wrapper for fetch with automatic retry on network failures
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return retryWithBackoff(
    async () => {
      const response = await fetch(url, init)

      // Retry on 5xx errors and timeouts
      if (response.status >= 500 || response.status === 408) {
        throw new Error(`HTTP ${response.status}`)
      }

      return response
    },
    {
      maxRetries: 2,
      initialDelayMs: 500,
      ...options,
    }
  )
}

/**
 * Local storage draft saver
 * Prevents data loss during form submissions
 */
export class DraftSaver {
  private storageKey: string

  constructor(key: string) {
    this.storageKey = `draft_${key}`
  }

  saveDraft(data: unknown): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    } catch (_error) {
      // Silently fail if localStorage is full or unavailable
    }
  }

  loadDraft<T>(): T | null {
    try {
      const draft = localStorage.getItem(this.storageKey)
      return draft ? JSON.parse(draft) : null
    } catch (_error) {
      return null
    }
  }

  clearDraft(): void {
    try {
      localStorage.removeItem(this.storageKey)
    } catch (_error) {
      // Silently fail
    }
  }

  hasDraft(): boolean {
    try {
      return localStorage.getItem(this.storageKey) !== null
    } catch (_error) {
      return false
    }
  }
}
