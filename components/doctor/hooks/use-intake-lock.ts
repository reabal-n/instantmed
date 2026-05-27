"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { fetchWithCsrf } from "@/lib/security/csrf-client"

const LOCK_EXTEND_INTERVAL_MS = 5 * 60 * 1000

export interface IntakeLockState {
  status: "inactive" | "claiming" | "claimed" | "blocked"
  lockedAt: string | null
  lockedByName: string | null
}

const INACTIVE_LOCK_STATE: IntakeLockState = {
  status: "inactive",
  lockedAt: null,
  lockedByName: null,
}

/**
 * Manages the full lifecycle of an intake soft lock:
 * acquire on activation, extend on interval, release on deactivation/unmount.
 *
 * @param intakeId - The intake to lock
 * @param active - Whether the lock should be held (e.g. after data loads). Defaults to true.
 */
export function useIntakeLock(intakeId: string, active = true) {
  const [lockWarning, setLockWarning] = useState<string | null>(null)
  const [lockState, setLockState] = useState<IntakeLockState>(INACTIVE_LOCK_STATE)
  const lockedIntakeIdRef = useRef<string | null>(null)

  // Acquire lock + start extend interval when active
  useEffect(() => {
    if (!active) {
      setLockWarning(null)
      setLockState(INACTIVE_LOCK_STATE)
      return
    }
    if (lockedIntakeIdRef.current === intakeId) return
    lockedIntakeIdRef.current = intakeId
    setLockWarning(null)
    setLockState({
      status: "claiming",
      lockedAt: null,
      lockedByName: null,
    })
    let cancelled = false

    fetchWithCsrf(`/api/doctor/intakes/${intakeId}/lock`, {
      method: "POST",
      keepalive: true,
    })
      .then(async (response) => {
        if (!response.ok) {
          return {
            warning: "This case could not be claimed for review.",
            lockedByName: null,
          }
        }
        return response.json() as Promise<{ warning?: string | null; lockedByName?: string | null }>
      })
      .then((result) => {
        if (cancelled) return
        if (result?.warning) {
          setLockWarning(result.warning)
          setLockState({
            status: "blocked",
            lockedAt: null,
            lockedByName: result.lockedByName ?? null,
          })
          return
        }
        setLockState({
          status: "claimed",
          lockedAt: new Date().toISOString(),
          lockedByName: null,
        })
      })
      .catch(() => {
        if (!cancelled) {
          setLockState({
            status: "blocked",
            lockedAt: null,
            lockedByName: null,
          })
        }
      })

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
    setLockState(INACTIVE_LOCK_STATE)
    void fetchWithCsrf(`/api/doctor/intakes/${intakeId}/lock`, {
      method: "DELETE",
      keepalive: true,
    }).catch(() => undefined)
  }, [intakeId])

  return { lockWarning, releaseLock, lockState }
}
