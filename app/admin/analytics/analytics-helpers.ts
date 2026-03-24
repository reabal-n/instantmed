export interface AnalyticsData {
  funnel: {
    visits: number
    started: number
    paid: number
    completed: number
  }
  dailyData: {
    date: string
    visits: number
    started: number
    paid: number
    completed: number
    revenue: number
  }[]
  serviceTypes: {
    type: string
    count: number
  }[]
  sources: {
    source: string
    count: number
  }[]
  revenue: {
    today: number
    thisWeek: number
    thisMonth: number
  }
  queueHealth: {
    queueSize: number
    avgReviewTimeMinutes: number | null
    oldestInQueueMinutes: number | null
    todaySubmissions: number
    approvedToday: number
    declinedToday: number
  }
  overview: {
    total: number
    inQueue: number
    approved: number
    declined: number
    pendingInfo: number
    scriptsPending: number
  }
}

export const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

export type TabKey = "overview" | "funnel" | "revenue" | "queue"

export function formatServiceType(type: string): string {
  const labels: Record<string, string> = {
    med_certs: "Medical Certificates",
    repeat_rx: "Repeat Prescriptions",
    consults: "Consultations",
    referrals: "Referrals",
    unknown: "Other",
  }
  return labels[type] || type
}

export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "N/A"
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
