import type { StuckIntake } from "@/lib/data/types/intake-ops"

export function buildStuckIntakeWarningPayload(
  intake: StuckIntake,
  summary: {
    count?: number
    maxAgeMinutes?: number
    priorityCount?: number
  } = {},
) {
  return {
    level: "warning" as const,
    tags: {
      stuck_reason: intake.stuck_reason,
      service_type: intake.service_type || "unknown",
      consult_subtype: intake.subtype || "unknown",
      intake_status: intake.status,
    },
    extra: {
      stuck_count: summary.count ?? 1,
      max_stuck_age_minutes: summary.maxAgeMinutes ?? intake.stuck_age_minutes,
      priority_count: summary.priorityCount ?? (intake.is_priority ? 1 : 0),
    },
    fingerprint: [
      "stuck-intake",
      intake.stuck_reason,
      intake.status,
      intake.service_type || "unknown",
    ],
  }
}
