// ============================================
// SLA ENGINE TYPES
// ============================================

export type SlaStatus = 'ok' | 'warning' | 'critical' | 'breached'

export interface SlaInfo {
  deadline: Date
  status: SlaStatus
  minutesRemaining: number
  formattedRemaining: string
  isBreached: boolean
  percentageUsed: number
}

export interface SlaConfig {
  warningThresholdMinutes: number // Show warning when this many minutes remain
  criticalThresholdMinutes: number // Show critical when this many minutes remain
}

export const DEFAULT_SLA_CONFIG: SlaConfig = {
  warningThresholdMinutes: 30,
  criticalThresholdMinutes: 10,
}
