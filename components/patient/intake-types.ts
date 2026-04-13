import { INTAKE_STATUS, type IntakeStatus } from "@/lib/data/status"

export interface Intake {
  id: string
  status: string
  created_at: string
  updated_at: string
  service?: { id: string; name?: string; short_name?: string; type?: string; slug?: string } | null
}

/** Resolve status config from lib/status.ts - single source of truth */
export function resolveStatusConfig(status: string) {
  return INTAKE_STATUS[status as IntakeStatus] ?? INTAKE_STATUS.pending
}
