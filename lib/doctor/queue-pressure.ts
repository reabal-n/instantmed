import { formatMinutes } from "@/lib/format/dates"

export const QUEUE_WAIT_TARGET_MINUTES = 120

export type QueuePressureSeverity = "idle" | "clear" | "watch" | "urgent"

export interface QueuePressureState {
  severity: QueuePressureSeverity
  ratio: number | null
  value: string
  label: string
  title: string
}

export function getQueuePressureSeverity(
  oldestWaitingMinutes: number | null | undefined,
  targetMinutes = QUEUE_WAIT_TARGET_MINUTES,
): QueuePressureSeverity {
  if (typeof oldestWaitingMinutes !== "number" || oldestWaitingMinutes < 0) return "idle"
  if (targetMinutes <= 0) return "idle"

  const ratio = oldestWaitingMinutes / targetMinutes
  if (ratio >= 0.9) return "urgent"
  if (ratio >= 0.6) return "watch"
  return "clear"
}

export function getQueuePressureState(
  oldestWaitingMinutes: number | null | undefined,
  targetMinutes = QUEUE_WAIT_TARGET_MINUTES,
): QueuePressureState {
  const severity = getQueuePressureSeverity(oldestWaitingMinutes, targetMinutes)
  const ratio = typeof oldestWaitingMinutes === "number" && oldestWaitingMinutes >= 0 && targetMinutes > 0
    ? oldestWaitingMinutes / targetMinutes
    : null
  const value = typeof oldestWaitingMinutes === "number" && oldestWaitingMinutes >= 0
    ? formatMinutes(oldestWaitingMinutes)
    : "No one waiting"
  const label = severity === "idle" ? "Queue wait" : "Oldest wait"
  const targetDelta = typeof oldestWaitingMinutes === "number" && oldestWaitingMinutes >= 0
    ? oldestWaitingMinutes < targetMinutes
      ? `${formatMinutes(targetMinutes - oldestWaitingMinutes)} before target`
      : `${formatMinutes(oldestWaitingMinutes - targetMinutes)} past target`
    : null
  const title = severity === "idle"
    ? "No visible case is currently waiting."
    : `Oldest visible case has been waiting ${value}. ${targetDelta}.`

  return {
    severity,
    ratio,
    value,
    label,
    title,
  }
}
