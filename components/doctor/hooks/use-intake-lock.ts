"use client"

import { useCallback, useEffect, useRef,useState } from "react"

import {
  acquireIntakeLockAction,
  extendIntakeLockAction,
  releaseIntakeLockAction,
} from "@/app/actions/intake-lock"

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
  const hasAcquired = useRef(false)

  // Acquire lock + start extend interval when active
  useEffect(() => {
    if (!active || hasAcquired.current) return
    hasAcquired.current = true

    acquireIntakeLockAction(intakeId).then((result) => {
      if (result.data?.warning) {
        setLockWarning(result.data.warning)
      }
    })

    const lockInterval = setInterval(() => {
      extendIntakeLockAction(intakeId)
    }, LOCK_EXTEND_INTERVAL_MS)

    return () => {
      clearInterval(lockInterval)
      releaseIntakeLockAction(intakeId)
    }
  }, [intakeId, active])

  // Explicit release for use in close handlers (e.g. before sendBeacon)
  const releaseLock = useCallback(() => {
    releaseIntakeLockAction(intakeId)
  }, [intakeId])

  return { lockWarning, releaseLock }
}
