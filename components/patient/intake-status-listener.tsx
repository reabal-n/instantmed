"use client"

import { useEffect, useRef } from "react"

import {
  PATIENT_INTAKE_POLL_INTERVAL_MS,
  type PatientIntakePollingChange,
  type PatientIntakePollingProjection,
  reconcilePatientIntakePollingSnapshot,
} from "@/lib/patient/intake-status-polling"

interface UsePatientIntakeStatusPollingOptions {
  onChanges: (changes: PatientIntakePollingChange[]) => void
}

function parsePollingProjection(value: unknown): PatientIntakePollingProjection[] | null {
  if (!value || typeof value !== "object" || !("intakes" in value)) return null
  const intakes = value.intakes
  if (!Array.isArray(intakes)) return null

  const projected: PatientIntakePollingProjection[] = []
  for (const intake of intakes) {
    if (!intake || typeof intake !== "object") return null
    const row = intake as Record<string, unknown>
    if (
      typeof row.id !== "string" ||
      typeof row.status !== "string" ||
      typeof row.updated_at !== "string" ||
      (row.payment_recovery_reason !== null &&
        row.payment_recovery_reason !== "more_information_required")
    ) {
      return null
    }

    projected.push({
      id: row.id,
      status: row.status,
      updated_at: row.updated_at,
      payment_recovery_reason: row.payment_recovery_reason,
    })
  }

  return projected
}

/**
 * Sole authenticated patient request-status poll owner. The route derives the
 * caller and ownership from the server session; the browser supplies no row or
 * profile filters.
 */
export function usePatientIntakeStatusPolling({
  onChanges,
}: UsePatientIntakeStatusPollingOptions): void {
  const onChangesRef = useRef(onChanges)

  useEffect(() => {
    onChangesRef.current = onChanges
  }, [onChanges])

  useEffect(() => {
    let snapshot: ReturnType<typeof reconcilePatientIntakePollingSnapshot>["snapshot"] | null = null
    let intervalId: ReturnType<typeof setInterval> | null = null
    let activeController: AbortController | null = null
    let disposed = false

    const poll = async () => {
      if (disposed || document.hidden || activeController) return

      const controller = new AbortController()
      activeController = controller

      try {
        const response = await fetch("/api/patient/intake-status?scope=list", {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        })
        if (!response.ok) return

        const currentRows = parsePollingProjection(await response.json())
        if (disposed || controller.signal.aborted || !currentRows) return

        const reconciled = reconcilePatientIntakePollingSnapshot(snapshot, currentRows)
        snapshot = reconciled.snapshot
        if (
          reconciled.changes.length > 0 ||
          reconciled.hasStructuralChanges
        ) {
          onChangesRef.current(reconciled.changes)
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          // A later bounded poll or focus return will retry transient failures.
        }
      } finally {
        if (activeController === controller) activeController = null
      }
    }

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
      activeController?.abort()
      activeController = null
    }

    const startPolling = () => {
      if (disposed || document.hidden) return
      void poll()
      if (!intervalId) {
        intervalId = setInterval(() => {
          void poll()
        }, PATIENT_INTAKE_POLL_INTERVAL_MS)
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        startPolling()
      }
    }
    const handleFocus = () => {
      void poll()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    startPolling()

    return () => {
      disposed = true
      stopPolling()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [])
}
