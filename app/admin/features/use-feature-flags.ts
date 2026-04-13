/**
 * Shared types, constants, and prop interfaces for the feature flag admin UI.
 *
 * Extracted from the former 904-line features-list.tsx god component.
 * Every section component imports its prop shape from here.
 */

import type { AutoApproveStats } from "@/app/actions/admin-config"
import type { FeatureFlags, FlagKey } from "@/lib/data/types/feature-flags"
import { FLAG_KEYS } from "@/lib/data/types/feature-flags"

// ============================================================================
// Constants
// ============================================================================

/** Kill switch flags that require confirmation before disabling. */
export const KILL_SWITCH_FLAGS: FlagKey[] = [
  FLAG_KEYS.DISABLE_MED_CERT,
  FLAG_KEYS.DISABLE_REPEAT_SCRIPTS,
  FLAG_KEYS.DISABLE_CONSULTS,
]

// ============================================================================
// Types
// ============================================================================

export interface AuditLogEntry {
  id: string
  action: string
  actor_type: string
  metadata: Record<string, unknown> | null
  created_at: string
  actor?: { full_name: string; email: string }
}

// ============================================================================
// Shared prop interfaces
// ============================================================================

/** Core callbacks shared by every card section that can toggle or save flags. */
export interface FlagActionProps {
  flags: FeatureFlags
  initialFlags: FeatureFlags
  isSaving: string | null
  onSetFlags: (updater: (prev: FeatureFlags) => FeatureFlags) => void
  onToggleFlag: (key: FlagKey, currentValue: boolean) => void
  onExecuteToggle: (key: FlagKey, currentValue: boolean) => void
  onSaveFlag: (key: FlagKey, value: boolean | string | string[] | number | null) => void
}

/** Props for the maintenance mode section. */
export interface MaintenanceSectionProps extends FlagActionProps {
  isSavingMessage: boolean
  maintenanceMessage: string
  onSetMaintenanceMessage: (value: string) => void
  onSaveMaintenanceMessage: () => void
  onSetPendingToggle: (value: { key: FlagKey; currentValue: boolean } | null) => void
}

/** Props for the blocked medication terms section. */
export interface BlockedTermsSectionProps {
  flags: FeatureFlags
  isSaving: string | null
  newBlockedTerm: string
  onSetNewBlockedTerm: (value: string) => void
  onSaveFlag: (key: FlagKey, value: boolean | string | string[] | number | null) => void
}

/** Props for the safety screening symptoms section. */
export interface SafetySymptomsSectionProps {
  flags: FeatureFlags
  isSaving: string | null
  newSafetySymptom: string
  onSetNewSafetySymptom: (value: string) => void
  onSaveFlag: (key: FlagKey, value: boolean | string | string[] | number | null) => void
}

/** Props for the AI auto-approve section. */
export interface AutoApproveSectionProps extends FlagActionProps {
  autoApproveStats?: AutoApproveStats | null
}

/** Props for the notifications section. */
export type NotificationsSectionProps = FlagActionProps

/** Props for the audit log section. */
export interface AuditLogSectionProps {
  auditLogs: AuditLogEntry[]
}

// Re-export for convenience
export type { AutoApproveStats }
