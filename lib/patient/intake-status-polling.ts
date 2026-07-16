import type { PatientPaymentRecoveryReason } from "@/lib/patient/payment-recovery"

export const PATIENT_INTAKE_POLL_INTERVAL_MS = 20_000
export const PATIENT_INTAKE_POLL_LIMIT = 100
export const PATIENT_SUCCESS_VERIFICATION_DEADLINE_MS = 90_000

export interface PatientIntakePollingProjection {
  id: string
  status: string
  updated_at: string
  payment_recovery_reason: PatientPaymentRecoveryReason
}

interface PatientIntakePollingState {
  status: string
  payment_recovery_reason: PatientPaymentRecoveryReason
}

export type PatientIntakePollingSnapshot = Record<string, PatientIntakePollingState>

export interface PatientIntakePollingChange {
  previous: PatientIntakePollingState
  current: PatientIntakePollingProjection
}

export interface PatientSuccessVerificationState {
  status: string | undefined
  isVerifying: boolean
  verificationFailed: boolean
  pollingError: boolean
  resolvedAmountCents: number | undefined
}

/**
 * Reconcile a refreshed server render into the success-page verification
 * state. A confirmed non-pending status wins over stale local timeout/error
 * state, while an absent amount never erases a value already learned by the
 * exact-status poll.
 */
export function derivePatientSuccessVerificationState(
  current: PatientSuccessVerificationState,
  fresh: { amountCents?: number; initialStatus?: string },
): PatientSuccessVerificationState {
  const nextStatus =
    fresh.initialStatus === "pending_payment" &&
    current.status &&
    current.status !== "pending_payment"
      ? current.status
      : fresh.initialStatus ?? current.status
  const next: PatientSuccessVerificationState = {
    ...current,
    resolvedAmountCents:
      typeof fresh.amountCents === "number"
        ? fresh.amountCents
        : current.resolvedAmountCents,
    status: nextStatus,
  }

  if (nextStatus && nextStatus !== "pending_payment") {
    next.isVerifying = false
    next.pollingError = false
    next.verificationFailed = false
  }

  return next
}

function hasSamePatientState(
  previous: PatientIntakePollingState,
  current: PatientIntakePollingProjection,
): boolean {
  return previous.status === current.status &&
    previous.payment_recovery_reason === current.payment_recovery_reason
}

/**
 * Reconcile a server-projected patient status list without treating the first
 * successful response as a change. `updated_at` is transported for recency and
 * debugging, but patient behavior changes only when status or the safe recovery
 * reason changes.
 */
export function reconcilePatientIntakePollingSnapshot(
  previousSnapshot: PatientIntakePollingSnapshot | null,
  currentRows: PatientIntakePollingProjection[],
): {
  snapshot: PatientIntakePollingSnapshot
  changes: PatientIntakePollingChange[]
  hasStructuralChanges: boolean
} {
  const snapshot: PatientIntakePollingSnapshot = {}
  const changes: PatientIntakePollingChange[] = []

  for (const current of currentRows) {
    snapshot[current.id] = {
      payment_recovery_reason: current.payment_recovery_reason,
      status: current.status,
    }

    if (!previousSnapshot) continue
    const previous = previousSnapshot[current.id]
    if (!previous || hasSamePatientState(previous, current)) continue
    changes.push({ current, previous })
  }

  const hasStructuralChanges = previousSnapshot !== null && (
    Object.keys(previousSnapshot).length !== Object.keys(snapshot).length ||
    Object.keys(snapshot).some((id) => !(id in previousSnapshot))
  )

  return { changes, hasStructuralChanges, snapshot }
}
