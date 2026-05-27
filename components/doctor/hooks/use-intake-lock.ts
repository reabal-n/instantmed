"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { fetchWithCsrf } from "@/lib/security/csrf-client"

const LOCK_EXTEND_INTERVAL_MS = 5 * 60 * 1000

/**
 * Manages the full lifecycle of an intake soft lock:
 * acquire on activation, extend on interval, release on deactivation/unmount.
 *
 * @param intakeId - The intake to lock
 * @param active - Whether the lock should be held (e.g. after data loads). Defaults to true.
 */
export function useIntakeLock(intakeId: string, active = true) {
  const [lockWarning, setLockWarning] = useState<string | null>(null)
  const lockedIntakeIdRef = useRef<string | null>(null)

  // Acquire lock + start extend interval when active
  useEffect(() => {
    if (!active || lockedIntakeIdRef.current === intakeId) return
    lockedIntakeIdRef.current = intakeId
    setLockWarning(null)
    let cancelled = false

    fetchWithCsrf(`/api/doctor/intakes/${intakeId}/lock`, {
      method: "POST",
      keepalive: true,
    })
      .then(async (response) => {
        if (!response.ok) return null
        return response.json() as Promise<{ warning?: string | null }>
      })
      .then((result) => {
        if (!cancelled && result?.warning) {
          setLockWarning(result.warning)
        }
      })
      .catch(() => undefined)

    const lockInterval = setInterval(() => {
      void fetchWithCsrf(`/api/doctor/intakes/${intakeId}/lock`, {
        method: "PATCH",
        keepalive: true,
      }).catch(() => undefined)
    }, LOCK_EXTEND_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(lockInterval)
      if (lockedIntakeIdRef.current === intakeId) {
        lockedIntakeIdRef.current = null
      }
      void fetchWithCsrf(`/api/doctor/intakes/${intakeId}/lock`, {
        method: "DELETE",
        keepalive: true,
      }).catch(() => undefined)
    }
  }, [intakeId, active])

  // Explicit release for use in close handlers (e.g. before sendBeacon)
  const releaseLock = useCallback(() => {
    if (lockedIntakeIdRef.current !== intakeId) return
    lockedIntakeIdRef.current = null
    void fetchWithCsrf(`/api/doctor/intakes/${intakeId}/lock`, {
      method: "DELETE",
      keepalive: true,
    }).catch(() => undefined)
  }, [intakeId])

  return { lockWarning, releaseLock }
}
