/**
 * Form State Utilities
 * 
 * Consistent form state management patterns.
 */

import { useState, useCallback, useTransition } from "react"
import { toastError, toastSuccess } from "./toast-helpers"

export type FormStatus = "idle" | "submitting" | "success" | "error"

export interface FormState<T = unknown> {
  status: FormStatus
  data: T | null
  error: string | null
}

/**
 * Hook for managing form submission state
 * 
 * @example
 * const { submit, isSubmitting, isSuccess, error } = useFormSubmit({
 *   onSubmit: async (data) => await saveProfile(data),
 *   onSuccess: () => router.push('/dashboard'),
 *   successMessage: "Profile saved",
 * })
 */
export function useFormSubmit<TData, TResult = void>(options: {
  onSubmit: (data: TData) => Promise<TResult>
  onSuccess?: (result: TResult) => void
  onError?: (error: Error) => void
  successMessage?: string
  errorMessage?: string
}) {
  const [status, setStatus] = useState<FormStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const submit = useCallback(
    async (data: TData) => {
      setStatus("submitting")
      setError(null)

      try {
        const result = await options.onSubmit(data)
        
        startTransition(() => {
          setStatus("success")
          if (options.successMessage) {
            toastSuccess.custom(options.successMessage)
          }
          options.onSuccess?.(result)
        })
        
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong"
        
        startTransition(() => {
          setStatus("error")
          setError(message)
          toastError.custom(options.errorMessage || message)
          options.onError?.(err instanceof Error ? err : new Error(message))
        })
        
        throw err
      }
    },
    [options]
  )

  const reset = useCallback(() => {
    setStatus("idle")
    setError(null)
  }, [])

  return {
    submit,
    reset,
    status,
    error,
    isIdle: status === "idle",
    isSubmitting: status === "submitting" || isPending,
    isSuccess: status === "success",
    isError: status === "error",
  }
}

/**
 * Hook for managing async data loading
 * 
 * @example
 * const { data, isLoading, error, refetch } = useAsyncData(
 *   () => fetchUserProfile(userId),
 *   [userId]
 * )
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await fetcher()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  // Initial fetch
  useState(() => {
    fetch()
  })

  return {
    data,
    isLoading,
    error,
    refetch: fetch,
    isEmpty: !isLoading && !error && data === null,
  }
}

/**
 * Create a stable form state object
 */
export function createFormState<T>(initial?: Partial<FormState<T>>): FormState<T> {
  return {
    status: "idle",
    data: null,
    error: null,
    ...initial,
  }
}
