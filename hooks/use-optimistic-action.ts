"use client"

import { useState, useCallback, useTransition } from "react"

/**
 * Optimistic Action Hook
 * 
 * Provides optimistic UI updates for server actions with automatic
 * rollback on failure. Improves perceived performance.
 */

interface UseOptimisticActionOptions<T> {
  /** Initial state */
  initialState: T
  /** Called on successful action */
  onSuccess?: (result: unknown) => void
  /** Called on failed action */
  onError?: (error: Error) => void
}

interface UseOptimisticActionReturn<T> {
  /** Current state (optimistic or actual) */
  state: T
  /** Whether action is in progress */
  isPending: boolean
  /** Error from last action */
  error: Error | null
  /** Execute action with optimistic update */
  execute: (
    action: () => Promise<unknown>,
    optimisticState: T
  ) => Promise<void>
  /** Reset to initial state */
  reset: () => void
}

export function useOptimisticAction<T>(
  options: UseOptimisticActionOptions<T>
): UseOptimisticActionReturn<T> {
  const { initialState, onSuccess, onError } = options
  
  const [state, setState] = useState<T>(initialState)
  const [error, setError] = useState<Error | null>(null)
  const [isPending, startTransition] = useTransition()

  const execute = useCallback(
    async (action: () => Promise<unknown>, optimisticState: T) => {
      const previousState = state
      setError(null)
      
      // Apply optimistic update immediately
      setState(optimisticState)
      
      startTransition(async () => {
        try {
          const result = await action()
          onSuccess?.(result)
        } catch (err) {
          // Rollback on error
          setState(previousState)
          const error = err instanceof Error ? err : new Error(String(err))
          setError(error)
          onError?.(error)
        }
      })
    },
    [state, onSuccess, onError]
  )

  const reset = useCallback(() => {
    setState(initialState)
    setError(null)
  }, [initialState])

  return {
    state,
    isPending,
    error,
    execute,
    reset,
  }
}

/**
 * Simple loading state hook for async operations
 */
interface UseLoadingStateReturn {
  isLoading: boolean
  error: string | null
  startLoading: () => void
  stopLoading: () => void
  setError: (error: string | null) => void
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>
}

export function useLoadingState(): UseLoadingStateReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startLoading = useCallback(() => {
    setIsLoading(true)
    setError(null)
  }, [])

  const stopLoading = useCallback(() => {
    setIsLoading(false)
  }, [])

  const withLoading = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fn()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setError,
    withLoading,
  }
}

/**
 * Retry logic hook for failed operations
 */
interface UseRetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
}

interface UseRetryReturn {
  attempt: number
  isRetrying: boolean
  retry: <T>(fn: () => Promise<T>) => Promise<T>
  reset: () => void
}

export function useRetry(options: UseRetryOptions = {}): UseRetryReturn {
  const { maxAttempts = 3, baseDelayMs = 1000, maxDelayMs = 10000 } = options
  
  const [attempt, setAttempt] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  const retry = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      let lastError: Error | null = null
      
      for (let i = 0; i < maxAttempts; i++) {
        setAttempt(i + 1)
        
        try {
          const result = await fn()
          setIsRetrying(false)
          return result
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err))
          
          if (i < maxAttempts - 1) {
            setIsRetrying(true)
            // Exponential backoff with jitter
            const delay = Math.min(
              baseDelayMs * Math.pow(2, i) + Math.random() * 1000,
              maxDelayMs
            )
            await new Promise((resolve) => setTimeout(resolve, delay))
          }
        }
      }
      
      setIsRetrying(false)
      throw lastError
    },
    [maxAttempts, baseDelayMs, maxDelayMs]
  )

  const reset = useCallback(() => {
    setAttempt(0)
    setIsRetrying(false)
  }, [])

  return {
    attempt,
    isRetrying,
    retry,
    reset,
  }
}
