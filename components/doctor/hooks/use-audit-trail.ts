"use client"

import { useEffect, useRef } from "react"
import {
  logViewedIntakeAnswersAction,
  logViewedSafetyFlagsAction,
} from "@/app/actions/clinician-audit"

interface UseAuditTrailOptions {
  /** Service type string (e.g. "med_certs", "repeat_rx") for audit categorization. */
  serviceType?: string
  /** Intake answers record -- used to detect whether safety flags should be logged. */
  answers?: Record<string, unknown>
}

/**
 * Fires one-shot audit events when a clinician views an intake.
 *
 * Logs:
 * - Viewed intake answers (always, on first activation)
 * - Viewed safety flags (if red/yellow flags or emergency symptoms are present)
 *
 * @param intakeId - The intake being reviewed
 * @param active - Whether the hook should fire (pass `true` once data has loaded)
 * @param options - Service type and answers for conditional logging
 */
export function useAuditTrail(
  intakeId: string,
  active: boolean,
  options: UseAuditTrailOptions = {}
) {
  const hasFired = useRef(false)

  useEffect(() => {
    if (!active || hasFired.current) return
    hasFired.current = true

    const { serviceType, answers } = options

    // Log clinician viewed intake answers
    logViewedIntakeAnswersAction(intakeId, serviceType)

    // Log safety flags view if present
    if (
      answers?.red_flags_detected ||
      answers?.yellow_flags_detected ||
      answers?.emergency_symptoms
    ) {
      logViewedSafetyFlagsAction(intakeId, serviceType)
    }
  }, [intakeId, active, options])
}
