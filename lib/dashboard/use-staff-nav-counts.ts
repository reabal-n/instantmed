"use client"

import { useCallback, useEffect, useState } from "react"

import { EMPTY_STAFF_NAV_COUNTS, type StaffNavCounts } from "@/lib/dashboard/staff-navigation"

/**
 * Polls /api/admin/staff-nav-counts every 45s and returns live nav counts.
 * Falls back to the last good values if a poll fails. Used by both the
 * desktop sidebar and the mobile bottom-tab nav so badges stay consistent.
 */
export function useLiveStaffNavCounts(initialCounts?: StaffNavCounts): StaffNavCounts {
  const [counts, setCounts] = useState<StaffNavCounts>(initialCounts ?? EMPTY_STAFF_NAV_COUNTS)

  const refreshCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/staff-nav-counts", { cache: "no-store" })
      if (!response.ok) return
      const nextCounts = (await response.json()) as StaffNavCounts
      setCounts({
        prescribingIdentityPatients: Number(nextCounts.prescribingIdentityPatients) || 0,
        scriptsToWrite: Number(nextCounts.scriptsToWrite) || 0,
        inQueue: Number(nextCounts.inQueue) || 0,
      })
    } catch {
      // Count badges are advisory; keep the last good values if polling fails.
    }
  }, [])

  useEffect(() => {
    setCounts(initialCounts ?? EMPTY_STAFF_NAV_COUNTS)
  }, [initialCounts])

  useEffect(() => {
    refreshCounts()
    const interval = window.setInterval(refreshCounts, 45_000)
    return () => window.clearInterval(interval)
  }, [refreshCounts])

  return counts
}
