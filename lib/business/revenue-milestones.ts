export type RevenueMilestoneKey =
  | "two_thousand"
  | "five_thousand"
  | "ten_thousand"

export type RevenueMilestone = {
  key: RevenueMilestoneKey
  targetNetCents: number
  horizonDays: number | null
  deadlineDateKey: string | null
  label: string
}

export type RevenueMilestoneProgress = {
  currentNetCents: number
  activeMilestone: RevenueMilestone
  progressPercent: number
  remainingCents: number
  progressLabel: string
  remainingLabel: string
  activeHorizonLabel: string
  nextRungLabel: string
  capacityReviewTriggered: boolean
}

export const REVENUE_ACTIVE_MILESTONE_CENTS = 200_000
export const REVENUE_CAPACITY_REVIEW_CENTS = 1_000_000
export const REVENUE_MILESTONE_START_DATE_KEY = "2026-07-12"

function addDaysToDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const REVENUE_MILESTONES: readonly RevenueMilestone[] = [
  {
    key: "two_thousand",
    targetNetCents: REVENUE_ACTIVE_MILESTONE_CENTS,
    horizonDays: 30,
    deadlineDateKey: addDaysToDateKey(REVENUE_MILESTONE_START_DATE_KEY, 30),
    label: "$2,000 monthly net-retained run-rate",
  },
  {
    key: "five_thousand",
    targetNetCents: 500_000,
    horizonDays: 90,
    deadlineDateKey: addDaysToDateKey(REVENUE_MILESTONE_START_DATE_KEY, 90),
    label: "$5,000 monthly net-retained run-rate",
  },
  {
    key: "ten_thousand",
    targetNetCents: REVENUE_CAPACITY_REVIEW_CENTS,
    horizonDays: null,
    deadlineDateKey: null,
    label: "$10,000 monthly net-retained run-rate",
  },
]

const WHOLE_AUD = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const SHORT_AU_DATE = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

function formatCents(cents: number): string {
  return WHOLE_AUD.format(cents / 100)
}

function formatDateKey(dateKey: string): string {
  return SHORT_AU_DATE.format(new Date(`${dateKey}T00:00:00.000Z`))
}

export function buildRevenueMilestoneProgress(
  rolling30DayNetCents: number,
): RevenueMilestoneProgress {
  const currentNetCents = Number.isFinite(rolling30DayNetCents)
    ? Math.round(rolling30DayNetCents)
    : 0
  const activeIndex = REVENUE_MILESTONES.findIndex(
    (milestone) => currentNetCents < milestone.targetNetCents,
  )
  const resolvedActiveIndex = activeIndex === -1
    ? REVENUE_MILESTONES.length - 1
    : activeIndex
  const activeMilestone = REVENUE_MILESTONES[resolvedActiveIndex]
  const nextMilestone = REVENUE_MILESTONES[resolvedActiveIndex + 1] ?? null
  const remainingCents = Math.max(0, activeMilestone.targetNetCents - currentNetCents)
  const finalMilestone = REVENUE_MILESTONES[REVENUE_MILESTONES.length - 1]
  const capacityReviewTriggered = currentNetCents >= finalMilestone.targetNetCents

  return {
    currentNetCents,
    activeMilestone,
    progressPercent: Math.max(
      0,
      Math.min(
        100,
        Math.round((currentNetCents / activeMilestone.targetNetCents) * 100),
      ),
    ),
    remainingCents,
    progressLabel:
      `${formatCents(currentNetCents)} of ` +
      `${formatCents(activeMilestone.targetNetCents)} net retained`,
    remainingLabel: `${formatCents(remainingCents)} remaining`,
    activeHorizonLabel:
      activeMilestone.horizonDays !== null && activeMilestone.deadlineDateKey
        ? `${activeMilestone.horizonDays}-day horizon · due ${formatDateKey(activeMilestone.deadlineDateKey)}`
        : "Next phase · capacity review",
    nextRungLabel: capacityReviewTriggered
      ? "Capacity review triggered"
      : nextMilestone
        ? nextMilestone.horizonDays === null
          ? `Next: ${nextMilestone.label} (capacity review)`
          : `Next: ${nextMilestone.label} (${nextMilestone.horizonDays}-day horizon)`
        : "Capacity review at $10,000 monthly net-retained run-rate",
    capacityReviewTriggered,
  }
}
