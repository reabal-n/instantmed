"use client"

import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react"

import { EMPTY_STAFF_NAV_COUNTS, type StaffNavCounts } from "@/lib/dashboard/staff-navigation"

export const STAFF_NAV_POLL_INTERVAL_MS = 45_000

interface StaffNavPollingOptions<TIntervalHandle> {
  refreshCounts: () => void | Promise<void>
  getVisibilityState: () => DocumentVisibilityState
  setIntervalFn: (callback: () => void, delay: number) => TIntervalHandle
  clearIntervalFn: (handle: TIntervalHandle) => void
}

export function startStaffNavPolling<TIntervalHandle>({
  refreshCounts,
  getVisibilityState,
  setIntervalFn,
  clearIntervalFn,
}: StaffNavPollingOptions<TIntervalHandle>): () => void {
  const interval = setIntervalFn(() => {
    if (getVisibilityState() === "visible") {
      void refreshCounts()
    }
  }, STAFF_NAV_POLL_INTERVAL_MS)

  return () => clearIntervalFn(interval)
}

const StaffNavCountsContext = createContext<StaffNavCounts | null>(null)

function normalizeStaffNavCounts(counts: StaffNavCounts): StaffNavCounts {
  return {
    prescribingIdentityPatients: Number(counts.prescribingIdentityPatients) || 0,
    scriptsToWrite: Number(counts.scriptsToWrite) || 0,
    inQueue: Number(counts.inQueue) || 0,
  }
}

export function StaffNavCountsProvider({
  initialCounts,
  children,
}: {
  initialCounts?: StaffNavCounts
  children: ReactNode
}) {
  const [counts, setCounts] = useState<StaffNavCounts>(
    initialCounts ?? EMPTY_STAFF_NAV_COUNTS,
  )

  useEffect(() => {
    setCounts(initialCounts ?? EMPTY_STAFF_NAV_COUNTS)
  }, [initialCounts])

  useEffect(() => {
    return startStaffNavPolling({
      refreshCounts: async () => {
        try {
          const response = await fetch("/api/admin/staff-nav-counts", { cache: "no-store" })
          if (!response.ok) return
          const nextCounts = (await response.json()) as StaffNavCounts
          setCounts(normalizeStaffNavCounts(nextCounts))
        } catch {
          // Count badges are advisory; keep the last good values if polling fails.
        }
      },
      getVisibilityState: () => document.visibilityState,
      setIntervalFn: (callback, delay) => window.setInterval(callback, delay),
      clearIntervalFn: (handle) => window.clearInterval(handle),
    })
  }, [])

  return createElement(StaffNavCountsContext.Provider, { value: counts }, children)
}

/** Returns the single provider-owned count snapshot for every responsive staff nav. */
export function useLiveStaffNavCounts(initialCounts?: StaffNavCounts): StaffNavCounts {
  return useContext(StaffNavCountsContext) ?? initialCounts ?? EMPTY_STAFF_NAV_COUNTS
}
