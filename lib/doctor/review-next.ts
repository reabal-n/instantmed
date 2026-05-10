import { getQueueEnteredAt } from "@/lib/doctor/queue-utils"
import type { IntakeWithPatient } from "@/types/db"

export function hasReviewNextRisk(intake: IntakeWithPatient): boolean {
  if (intake.flagged_for_followup) return true
  if (intake.risk_tier === "high") return true
  if (intake.risk_tier === "critical") return true
  if (Array.isArray(intake.risk_flags) && intake.risk_flags.length > 0) return true
  if (intake.risk_score >= 7) return true
  return Boolean(intake.requires_live_consult)
}

function getActionAgeTimestamp(intake: IntakeWithPatient): number {
  const timestamp = intake.status === "pending_info"
    ? intake.info_requested_at ?? intake.updated_at ?? intake.created_at
    : getQueueEnteredAt(intake)

  return new Date(timestamp).getTime()
}

function compareBooleanPriority(a: boolean, b: boolean): number {
  if (a === b) return 0
  return a ? -1 : 1
}

export function compareReviewNextIntakes(a: IntakeWithPatient, b: IntakeWithPatient): number {
  const riskDelta = compareBooleanPriority(hasReviewNextRisk(a), hasReviewNextRisk(b))
  if (riskDelta !== 0) return riskDelta

  const scriptDelta = compareBooleanPriority(a.status === "awaiting_script", b.status === "awaiting_script")
  if (scriptDelta !== 0) return scriptDelta

  const priorityDelta = compareBooleanPriority(Boolean(a.is_priority), Boolean(b.is_priority))
  if (priorityDelta !== 0) return priorityDelta

  const ageDelta = getActionAgeTimestamp(a) - getActionAgeTimestamp(b)
  if (ageDelta !== 0) return ageDelta

  return a.created_at.localeCompare(b.created_at)
}

export function sortForReviewNext<T extends IntakeWithPatient>(intakes: T[]): T[] {
  return [...intakes].sort(compareReviewNextIntakes)
}
