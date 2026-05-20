"use client"

import { useCallback, useEffect, useState } from "react"

export interface PatientNavCounts {
  unreadMessages: number
}

export const EMPTY_PATIENT_NAV_COUNTS: PatientNavCounts = {
  unreadMessages: 0,
}

/**
 * Polls /api/patient/nav-counts every 45s and returns live counts for the
 * patient mobile nav. Falls back to the last good values if a poll fails.
 * Badges are advisory and never block the UI.
 */
export function usePatientNavCounts(initialCounts?: PatientNavCounts): PatientNavCounts {
  const [counts, setCounts] = useState<PatientNavCounts>(initialCounts ?? EMPTY_PATIENT_NAV_COUNTS)

  const refreshCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/patient/nav-counts", { cache: "no-store" })
      if (!response.ok) return
      const next = (await response.json()) as PatientNavCounts
      setCounts({ unreadMessages: Number(next.unreadMessages) || 0 })
    } catch {
      // Advisory polling; keep last good values on failure.
    }
  }, [])

  useEffect(() => {
    setCounts(initialCounts ?? EMPTY_PATIENT_NAV_COUNTS)
  }, [initialCounts])

  useEffect(() => {
    refreshCounts()
    const interval = window.setInterval(refreshCounts, 45_000)
    return () => window.clearInterval(interval)
  }, [refreshCounts])

  return counts
}
