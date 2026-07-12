import type { QueueReviewStatus } from "@/lib/doctor/queue-utils"
import { getQueueEnteredAt, getQueueStatusMeta } from "@/lib/doctor/queue-utils"

const MAX_TELEGRAM_MESSAGE_CHARS = 3_500

export interface PendingQueueReminderRow {
  created_at: string
  is_priority: boolean | null
  paid_at: string | null
  sla_deadline: string | null
  status: QueueReviewStatus
  submitted_at: string | null
}

function formatWait(enteredAt: string, now: Date): string {
  const enteredAtMs = Date.parse(enteredAt)
  const minutes = Number.isFinite(enteredAtMs)
    ? Math.max(0, Math.floor((now.getTime() - enteredAtMs) / 60_000))
    : 0
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours <= 0) return `${minutes}m`
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}

function buildLine(row: PendingQueueReminderRow, index: number, now: Date): string {
  const queueEnteredAt = getQueueEnteredAt({
    created_at: row.created_at,
    paid_at: row.paid_at,
    submitted_at: row.submitted_at,
  })
  const priority = row.is_priority ? "Priority · " : ""
  return `${index + 1}. ${priority}${getQueueStatusMeta(row.status).label} · waiting ${formatWait(queueEnteredAt, now)}`
}

export function buildPendingQueueReminderMessages(
  rows: PendingQueueReminderRow[],
  now = new Date(),
): string[] {
  if (rows.length === 0) return []

  const header = `⏳ InstantMed queue reminder · ${rows.length} ${rows.length === 1 ? "request" : "requests"} waiting`
  const footer = "Open /dashboard"
  const messages: string[] = []
  let lines: string[] = []

  const flush = () => {
    if (lines.length === 0) return
    messages.push([header, ...lines, footer].join("\n"))
    lines = []
  }

  rows.forEach((row, index) => {
    const line = buildLine(row, index, now)
    const candidate = [header, ...lines, line, footer].join("\n")
    if (candidate.length > MAX_TELEGRAM_MESSAGE_CHARS && lines.length > 0) flush()
    lines.push(line)
  })
  flush()

  return messages
}
