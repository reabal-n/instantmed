"use client"

import type { AutoApproveStats } from "@/app/actions/admin-config"
import type { FeatureFlags, FlagKey } from "@/lib/data/types/feature-flags"

import {
  AuditLogSection,
  AutoApproveSection,
  BlockedTermsSection,
  KillSwitchWarning,
  MaintenanceModeSection,
  NotificationsSection,
  OperationalControlsSection,
  ParchmentSection,
  SafetySymptomsSection,
  ServiceKillSwitchesSection,
} from "./feature-flag-detail"
import type { AuditLogEntry } from "./use-feature-flags"
import { KILL_SWITCH_FLAGS } from "./use-feature-flags"

// Re-export for consumers that imported from this file
export { KILL_SWITCH_FLAGS }
export type { AuditLogEntry }

interface FeaturesListProps {
  flags: FeatureFlags
  initialFlags: FeatureFlags
  isSaving: string | null
  isSavingMessage: boolean
  maintenanceMessage: string
  newBlockedTerm: string
  newSafetySymptom: string
  auditLogs: AuditLogEntry[]
  autoApproveStats?: AutoApproveStats | null
  onSetFlags: (updater: (prev: FeatureFlags) => FeatureFlags) => void
  onSetMaintenanceMessage: (value: string) => void
  onSetNewBlockedTerm: (value: string) => void
  onSetNewSafetySymptom: (value: string) => void
  onToggleFlag: (key: FlagKey, currentValue: boolean) => void
  onExecuteToggle: (key: FlagKey, currentValue: boolean) => void
  onSaveMaintenanceMessage: () => void
  onSaveFlag: (key: FlagKey, value: boolean | string | string[] | number | null) => void
  onSetPendingToggle: (value: { key: FlagKey; currentValue: boolean } | null) => void
}

export function FeaturesList({
  flags,
  initialFlags,
  isSaving,
  isSavingMessage,
  maintenanceMessage,
  newBlockedTerm,
  newSafetySymptom,
  auditLogs,
  autoApproveStats,
  onSetFlags,
  onSetMaintenanceMessage,
  onSetNewBlockedTerm,
  onSetNewSafetySymptom,
  onToggleFlag,
  onExecuteToggle,
  onSaveMaintenanceMessage,
  onSaveFlag,
  onSetPendingToggle,
}: FeaturesListProps) {
  return (
    <div className="space-y-8">
      <KillSwitchWarning />

      <MaintenanceModeSection
        flags={flags}
        initialFlags={initialFlags}
        isSaving={isSaving}
        isSavingMessage={isSavingMessage}
        maintenanceMessage={maintenanceMessage}
        onSetFlags={onSetFlags}
        onSetMaintenanceMessage={onSetMaintenanceMessage}
        onToggleFlag={onToggleFlag}
        onExecuteToggle={onExecuteToggle}
        onSaveMaintenanceMessage={onSaveMaintenanceMessage}
        onSaveFlag={onSaveFlag}
        onSetPendingToggle={onSetPendingToggle}
      />

      <ServiceKillSwitchesSection
        flags={flags}
        isSaving={isSaving}
        onToggleFlag={onToggleFlag}
      />

      <OperationalControlsSection
        flags={flags}
        initialFlags={initialFlags}
        isSaving={isSaving}
        onSetFlags={onSetFlags}
        onToggleFlag={onToggleFlag}
        onExecuteToggle={onExecuteToggle}
        onSaveFlag={onSaveFlag}
      />

      <BlockedTermsSection
        flags={flags}
        isSaving={isSaving}
        newBlockedTerm={newBlockedTerm}
        onSetNewBlockedTerm={onSetNewBlockedTerm}
        onSaveFlag={onSaveFlag}
      />

      <SafetySymptomsSection
        flags={flags}
        isSaving={isSaving}
        newSafetySymptom={newSafetySymptom}
        onSetNewSafetySymptom={onSetNewSafetySymptom}
        onSaveFlag={onSaveFlag}
      />

      <AuditLogSection auditLogs={auditLogs} />

      <AutoApproveSection
        flags={flags}
        initialFlags={initialFlags}
        isSaving={isSaving}
        autoApproveStats={autoApproveStats}
        onSetFlags={onSetFlags}
        onToggleFlag={onToggleFlag}
        onExecuteToggle={onExecuteToggle}
        onSaveFlag={onSaveFlag}
      />

      <NotificationsSection
        flags={flags}
        initialFlags={initialFlags}
        isSaving={isSaving}
        onSetFlags={onSetFlags}
        onToggleFlag={onToggleFlag}
        onExecuteToggle={onExecuteToggle}
        onSaveFlag={onSaveFlag}
      />

      <ParchmentSection
        flags={flags}
        initialFlags={initialFlags}
        isSaving={isSaving}
        onSetFlags={onSetFlags}
        onToggleFlag={onToggleFlag}
        onExecuteToggle={onExecuteToggle}
        onSaveFlag={onSaveFlag}
      />
    </div>
  )
}
