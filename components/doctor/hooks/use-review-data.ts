"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
  type ReloadReviewData,
  type ReloadReviewDataOptions,
  type ReviewData,
} from "@/components/doctor/review/intake-review-context"
import { getPrescriptionRecordedEvidenceKey } from "@/lib/doctor/review-data-refresh"

interface UseReviewDataOptions {
  intakeId: string
  initialData?: ReviewData | null
  initialLoadDelayMs?: number
}

function getReviewLoadError(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Review details took too long to load. Retry before making a decision."
  }
  return error instanceof Error ? error.message : "Failed to load intake data"
}

export function useReviewData({
  intakeId,
  initialData = null,
  initialLoadDelayMs = 0,
}: UseReviewDataOptions) {
  const [data, setDataState] = useState<ReviewData | null>(initialData)
  const [isLoading, setIsLoading] = useState(initialData === null)
  const [error, setError] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const dataRef = useRef<ReviewData | null>(initialData)
  const loadSequenceRef = useRef(0)
  const announcedEvidenceRef = useRef<string | null>(null)

  const setData = useCallback((next: ReviewData) => {
    dataRef.current = next
    setDataState(next)
  }, [])

  const reloadReviewData = useCallback<ReloadReviewData>(async (
    options: ReloadReviewDataOptions = {},
  ) => {
    const { background = true, signal } = options
    const loadSequence = loadSequenceRef.current + 1
    loadSequenceRef.current = loadSequence
    const controller = new AbortController()
    const abortFromCaller = () => controller.abort()
    signal?.addEventListener("abort", abortFromCaller, { once: true })
    const timeout = window.setTimeout(() => controller.abort(), 12_000)

    if (background) {
      setIsRefreshing(true)
      setRefreshError(null)
    } else {
      setIsLoading(true)
      setError(null)
    }

    try {
      const response = await fetch(`/api/doctor/intakes/${intakeId}/review-data`, {
        cache: "no-store",
        signal: controller.signal,
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Failed to load" }))
        throw new Error(body.error || `HTTP ${response.status}`)
      }

      const next: ReviewData = await response.json()
      if (loadSequenceRef.current !== loadSequence) return null

      const evidenceKey = getPrescriptionRecordedEvidenceKey(dataRef.current, next)
      setData(next)
      setError(null)
      setRefreshError(null)

      if (evidenceKey && announcedEvidenceRef.current !== evidenceKey) {
        announcedEvidenceRef.current = evidenceKey
        toast.success("Prescription recorded — complete when ready")
      }

      return next
    } catch (caught) {
      if (loadSequenceRef.current !== loadSequence) return null
      if (controller.signal.aborted && signal?.aborted) return null

      const message = getReviewLoadError(caught)
      if (background && dataRef.current) {
        setRefreshError(message)
      } else {
        setError(message)
      }
      return null
    } finally {
      window.clearTimeout(timeout)
      signal?.removeEventListener("abort", abortFromCaller)
      if (loadSequenceRef.current === loadSequence) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [intakeId, setData])

  useEffect(() => {
    if (initialData) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void reloadReviewData({ background: false, signal: controller.signal })
    }, initialLoadDelayMs)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [initialData, initialLoadDelayMs, reloadReviewData])

  return {
    data,
    setData,
    isLoading,
    error,
    refreshError,
    isRefreshing,
    reloadReviewData,
  }
}
