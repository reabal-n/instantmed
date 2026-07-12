import {
  buildRevenueMilestoneProgress,
  type RevenueMilestoneProgress,
} from "@/lib/business/revenue-milestones"
import {
  STAFF_ANALYTICS_HREF,
  STAFF_DASHBOARD_HREF,
  STAFF_OPS_HREF,
} from "@/lib/dashboard/routes"

export type OperatorSourceAvailability =
  | "available"
  | "degraded"
  | "unavailable"

type AggregateSource<T> =
  | { availability: "available" | "degraded"; value: T }
  | { availability: "unavailable"; value?: never }

export type OperatorQueueAggregate = {
  waitingCount: number
  oldestWaitingMinutes: number | null
}

export type OperatorRecoveryAggregate = {
  criticalIssueCount: number
  warningIssueCount: number
}

export type OperatorRevenueAggregate = {
  rolling30DayNetCents: number
}

export type OperatorAdsAggregate = {
  configurationSeverity: "ok" | "warning" | "error"
  failedUploads: number
  missingUploads: number
  queryErrorCount: number
}

export type OperatorBriefInput = {
  revenue: AggregateSource<OperatorRevenueAggregate>
  queue: AggregateSource<OperatorQueueAggregate>
  recovery: AggregateSource<OperatorRecoveryAggregate>
  ads: AggregateSource<OperatorAdsAggregate>
}

export type OperatorExceptionSeverity = "critical" | "warning"
export type OperatorExceptionSource = "queue" | "recovery" | "ads"

export type OperatorExceptionItem = {
  id: string
  source: OperatorExceptionSource
  severity: OperatorExceptionSeverity
  availability: OperatorSourceAvailability
  title: string
  detail: string
  href: string
}

export type OperatorExceptionSummary = {
  status: "clear" | "attention" | "critical"
  summaryLabel: string
  items: OperatorExceptionItem[]
  sourceAvailability: Record<OperatorExceptionSource, OperatorSourceAvailability>
}

export type OperatorBrief = {
  milestone: RevenueMilestoneProgress | null
  milestoneAvailability: OperatorSourceAvailability
  exceptions: OperatorExceptionSummary
}

const SOURCE_COPY: Record<
  OperatorExceptionSource,
  {
    label: string
    href: string
    unavailableDetail: string
    degradedDetail: string
  }
> = {
  queue: {
    label: "Queue",
    href: `${STAFF_DASHBOARD_HREF}?status=review#doctor-queue`,
    unavailableDetail:
      "Queue checks did not return. Open the clinical queue to verify it directly.",
    degradedDetail:
      "Some queue checks did not return. Open the clinical queue to verify the remaining checks.",
  },
  recovery: {
    label: "Recovery",
    href: STAFF_OPS_HREF,
    unavailableDetail:
      "Recovery checks did not return. Open operations to verify them directly.",
    degradedDetail:
      "Some recovery checks did not return. Open operations to verify the remaining checks.",
  },
  ads: {
    label: "Google Ads",
    href: `${STAFF_ANALYTICS_HREF}#paid-ads-heading`,
    unavailableDetail:
      "Google Ads checks did not return. Open the Ads section to verify it directly.",
    degradedDetail:
      "Some Google Ads checks did not return. Open the Ads section to verify the remaining checks.",
  },
}

const SOURCE_ORDER: Record<OperatorExceptionSource, number> = {
  queue: 0,
  recovery: 1,
  ads: 2,
}

function buildSourceAvailabilityItem(
  source: OperatorExceptionSource,
  availability: OperatorSourceAvailability,
): OperatorExceptionItem | null {
  if (availability === "available") return null
  const copy = SOURCE_COPY[source]

  return {
    id: `${source}_source_${availability}`,
    source,
    severity: "warning",
    availability,
    title: `${copy.label} data ${availability}`,
    detail: availability === "unavailable"
      ? copy.unavailableDetail
      : copy.degradedDetail,
    href: copy.href,
  }
}

function count(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
}

function formatWaitMinutes(value: number): string {
  const minutes = count(value)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours === 0) return `${minutes}m`
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}

function withDegradedSuffix(
  detail: string,
  availability: OperatorSourceAvailability,
): string {
  return availability === "degraded"
    ? `${detail} · Partial source data; verify directly.`
    : detail
}

function buildQueueItem(
  source: OperatorBriefInput["queue"],
): OperatorExceptionItem | null {
  if (source.availability === "unavailable") {
    return buildSourceAvailabilityItem("queue", source.availability)
  }

  const oldestWaitingMinutes = source.value.oldestWaitingMinutes
  if (oldestWaitingMinutes == null || !Number.isFinite(oldestWaitingMinutes)) {
    return source.availability === "degraded"
      ? buildSourceAvailabilityItem("queue", source.availability)
      : null
  }

  const severity = oldestWaitingMinutes >= 240
    ? "critical"
    : oldestWaitingMinutes >= 120
      ? "warning"
      : null
  if (!severity) {
    return source.availability === "degraded"
      ? buildSourceAvailabilityItem("queue", source.availability)
      : null
  }

  const waitingCount = count(source.value.waitingCount)
  return {
    id: `queue_wait_${severity}`,
    source: "queue",
    severity,
    availability: source.availability,
    title: severity === "critical"
      ? "Queue wait above 4 hours"
      : "Queue wait above 2 hours",
    detail: withDegradedSuffix(
      `${waitingCount} request${waitingCount === 1 ? "" : "s"} waiting · ` +
        `oldest ${formatWaitMinutes(oldestWaitingMinutes)}`,
      source.availability,
    ),
    href: SOURCE_COPY.queue.href,
  }
}

function buildRecoveryItem(
  source: OperatorBriefInput["recovery"],
): OperatorExceptionItem | null {
  if (source.availability === "unavailable") {
    return buildSourceAvailabilityItem("recovery", source.availability)
  }

  const criticalIssues = count(source.value.criticalIssueCount)
  const warningIssues = count(source.value.warningIssueCount)
  const severity = criticalIssues > 0
    ? "critical"
    : warningIssues > 0
      ? "warning"
      : null
  if (!severity) {
    return source.availability === "degraded"
      ? buildSourceAvailabilityItem("recovery", source.availability)
      : null
  }

  const detailParts = []
  if (criticalIssues > 0) detailParts.push(`${criticalIssues} critical`)
  if (warningIssues > 0) detailParts.push(`${warningIssues} warning`)

  return {
    id: `recovery_issues_${severity}`,
    source: "recovery",
    severity,
    availability: source.availability,
    title: "Recovery work needs attention",
    detail: withDegradedSuffix(detailParts.join(" · "), source.availability),
    href: SOURCE_COPY.recovery.href,
  }
}

function buildAdsItem(
  source: OperatorBriefInput["ads"],
): OperatorExceptionItem | null {
  if (source.availability === "unavailable") {
    return buildSourceAvailabilityItem("ads", source.availability)
  }

  const failedUploads = count(source.value.failedUploads)
  const missingUploads = count(source.value.missingUploads)
  const queryErrors = count(source.value.queryErrorCount)
  const severity = source.value.configurationSeverity === "error" || failedUploads > 0
    ? "critical"
    : source.value.configurationSeverity === "warning" ||
        missingUploads > 0 ||
        queryErrors > 0
      ? "warning"
      : null
  if (!severity) {
    return source.availability === "degraded"
      ? buildSourceAvailabilityItem("ads", source.availability)
      : null
  }

  const detailParts = []
  if (source.value.configurationSeverity !== "ok") {
    detailParts.push(`Configuration ${source.value.configurationSeverity}`)
  }
  if (failedUploads > 0) {
    detailParts.push(`${failedUploads} failed upload${failedUploads === 1 ? "" : "s"}`)
  }
  if (missingUploads > 0) {
    detailParts.push(`${missingUploads} missing upload${missingUploads === 1 ? "" : "s"}`)
  }
  if (queryErrors > 0) {
    detailParts.push(`${queryErrors} report error${queryErrors === 1 ? "" : "s"}`)
  }

  return {
    id: `ads_health_${severity}`,
    source: "ads",
    severity,
    availability: source.availability,
    title: "Google Ads needs attention",
    detail: withDegradedSuffix(detailParts.join(" · "), source.availability),
    href: SOURCE_COPY.ads.href,
  }
}

function summaryLabel(items: OperatorExceptionItem[]): string {
  if (items.length === 0) return "No exceptions from available sources"
  const sourceChecksOnly = items.every((item) => item.id.includes("_source_"))
  const noun = sourceChecksOnly
    ? `source check${items.length === 1 ? "" : "s"}`
    : `exception${items.length === 1 ? "" : "s"}`
  return `${items.length} ${noun} ${items.length === 1 ? "needs" : "need"} attention`
}

export function buildOperatorBrief(input: OperatorBriefInput): OperatorBrief {
  const sourceAvailability: OperatorExceptionSummary["sourceAvailability"] = {
    queue: input.queue.availability,
    recovery: input.recovery.availability,
    ads: input.ads.availability,
  }
  const items = [
    buildQueueItem(input.queue),
    buildRecoveryItem(input.recovery),
    buildAdsItem(input.ads),
  ]
    .filter((item): item is OperatorExceptionItem => item !== null)
    .sort((left, right) => {
      const severityRank = (value: OperatorExceptionSeverity) =>
        value === "critical" ? 0 : 1
      const availabilityRank = (value: OperatorSourceAvailability) =>
        value === "unavailable" ? 0 : value === "degraded" ? 1 : 2
      return severityRank(left.severity) - severityRank(right.severity) ||
        availabilityRank(left.availability) - availabilityRank(right.availability) ||
        SOURCE_ORDER[left.source] - SOURCE_ORDER[right.source]
    })
    .slice(0, 3)

  return {
    milestone: input.revenue.availability === "unavailable"
      ? null
      : buildRevenueMilestoneProgress(input.revenue.value.rolling30DayNetCents),
    milestoneAvailability: input.revenue.availability,
    exceptions: {
      status: items.some((item) => item.severity === "critical")
        ? "critical"
        : items.length > 0
          ? "attention"
          : "clear",
      summaryLabel: summaryLabel(items),
      items,
      sourceAvailability,
    },
  }
}
