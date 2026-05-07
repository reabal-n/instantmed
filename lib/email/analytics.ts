export type EmailAnalyticsRow = {
  id: string
  email_type: string | null
  to_email: string | null
  status: string | null
  created_at?: string | null
  sent_at: string | null
  error_message: string | null
  delivery_status: string | null
  delivery_status_updated_at: string | null
}

export type EmailAnalytics = {
  summary: {
    totalAccepted: number
    totalFailed: number
    delivered: number
    bounced: number
    complained: number
    opened: number
    clicked: number
    sendSuccessRate: number | null
    deliveryRate: number | null
    openRate: number | null
    clickRate: number | null
  }
  templateStats: Array<{
    template: string
    accepted: number
    failed: number
    delivered: number
    bounced: number
    complained: number
    opened: number
    clicked: number
    deliveryRate: number | null
  }>
  recentEmails: Array<{
    id: string
    template: string
    recipient: string
    status: string
    deliveryStatus: string | null
    sentAt: string
    error: string | null
  }>
}

const ACCEPTED_STATUSES = new Set(["sent", "skipped_e2e"])
const DELIVERED_STATUSES = new Set(["delivered", "opened", "clicked"])

function roundRate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return Math.round((numerator / denominator) * 1000) / 10
}

function isAccepted(row: EmailAnalyticsRow): boolean {
  return ACCEPTED_STATUSES.has(row.status || "")
}

function isDelivered(row: EmailAnalyticsRow): boolean {
  return DELIVERED_STATUSES.has(row.delivery_status || "")
}

function isOpened(row: EmailAnalyticsRow): boolean {
  return row.delivery_status === "opened" || row.delivery_status === "clicked"
}

function isClicked(row: EmailAnalyticsRow): boolean {
  return row.delivery_status === "clicked"
}

function buildTemplateStats(rows: EmailAnalyticsRow[]): EmailAnalytics["templateStats"] {
  const templateStats = new Map<string, EmailAnalytics["templateStats"][number]>()

  for (const row of rows) {
    const template = row.email_type || "unknown"
    const existing = templateStats.get(template) ?? {
      template,
      accepted: 0,
      failed: 0,
      delivered: 0,
      bounced: 0,
      complained: 0,
      opened: 0,
      clicked: 0,
      deliveryRate: null,
    }

    if (isAccepted(row)) existing.accepted++
    if (row.status === "failed") existing.failed++
    if (isDelivered(row)) existing.delivered++
    if (row.delivery_status === "bounced") existing.bounced++
    if (row.delivery_status === "complained") existing.complained++
    if (isOpened(row)) existing.opened++
    if (isClicked(row)) existing.clicked++

    templateStats.set(template, existing)
  }

  return Array.from(templateStats.values()).map((stats) => {
    const terminalEvents = stats.delivered + stats.bounced + stats.complained
    return {
      ...stats,
      deliveryRate: roundRate(stats.delivered, terminalEvents),
    }
  })
}

export function buildEmailAnalytics(rows: EmailAnalyticsRow[]): EmailAnalytics {
  const totalAccepted = rows.filter(isAccepted).length
  const totalFailed = rows.filter((row) => row.status === "failed").length
  const delivered = rows.filter(isDelivered).length
  const bounced = rows.filter((row) => row.delivery_status === "bounced").length
  const complained = rows.filter((row) => row.delivery_status === "complained").length
  const opened = rows.filter(isOpened).length
  const clicked = rows.filter(isClicked).length
  const terminalDeliveryEvents = delivered + bounced + complained
  const totalAttempts = totalAccepted + totalFailed

  return {
    summary: {
      totalAccepted,
      totalFailed,
      delivered,
      bounced,
      complained,
      opened,
      clicked,
      sendSuccessRate: roundRate(totalAccepted, totalAttempts),
      deliveryRate: roundRate(delivered, terminalDeliveryEvents),
      openRate: roundRate(opened, delivered),
      clickRate: roundRate(clicked, delivered),
    },
    templateStats: buildTemplateStats(rows),
    recentEmails: rows.slice(0, 50).map((row) => ({
      id: row.id,
      template: row.email_type || "unknown",
      recipient: row.to_email || "",
      status: row.status || "unknown",
      deliveryStatus: row.delivery_status,
      sentAt: row.sent_at || row.delivery_status_updated_at || row.created_at || "",
      error: row.error_message,
    })),
  }
}
