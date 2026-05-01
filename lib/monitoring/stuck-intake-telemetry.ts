import type { StuckIntake } from "@/lib/data/types/intake-ops"

export function buildStuckIntakeWarningPayload(intake: StuckIntake) {
  return {
    level: "warning" as const,
    tags: {
      stuck_reason: intake.stuck_reason,
      service_type: intake.service_type || "unknown",
      consult_subtype: intake.subtype || "unknown",
      intake_status: intake.status,
    },
    extra: {
      stuck_age_minutes: intake.stuck_age_minutes,
      is_priority: intake.is_priority,
    },
    fingerprint: [
      "stuck-intake",
      intake.stuck_reason,
      intake.status,
      intake.service_type || "unknown",
    ],
  }
}
