"use client"

import { AlertTriangle, FileText, Loader2, Pill, Shield, Stethoscope, Wrench } from "lucide-react"
import type React from "react"

import type { AutoApproveStats } from "@/app/actions/admin-config"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type FeatureFlags, FLAG_KEYS, type FlagKey } from "@/lib/data/types/feature-flags"
import { cn } from "@/lib/utils"

import {
  AuditLogSection,
  AutoApproveSection,
  BlockedTermsSection,
  MaintenanceModeSection,
  NotificationsSection,
  OperationalControlsSection,
  ParchmentSection,
  SafetySymptomsSection,
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

interface CriticalSwitchCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  checked: boolean
  disabled: boolean
  saving: boolean
  tone?: "success" | "danger" | "neutral"
  onCheckedChange: () => void
}

function CriticalSwitchCard({
  icon: Icon,
  title,
  description,
  checked,
  disabled,
  saving,
  tone = "neutral",
  onCheckedChange,
}: CriticalSwitchCardProps) {
  return (
    <Card
      className={cn(
        "flex min-h-[94px] items-center justify-between gap-3 border-border/60 px-4 py-3 shadow-sm shadow-primary/[0.03]",
        tone === "danger" && "border-destructive-border bg-destructive-light/40",
        tone === "success" && "border-success-border bg-success-light/35",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
            tone === "danger" && "bg-destructive-light text-destructive",
            tone === "success" && "bg-success-light text-success",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            {tone === "danger" && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                Stopped
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      </div>
    </Card>
  )
}

function TabPanel({
  value,
  children,
}: {
  value: string
  children: React.ReactNode
}) {
  return (
    <TabsContent
      value={value}
      className="feature-flag-tab-panel mt-0 min-h-0 overflow-hidden rounded-xl border border-border/60 bg-background/70 p-3 shadow-sm shadow-primary/[0.03]"
    >
      {children}
    </TabsContent>
  )
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
    <div
      data-testid="feature-flags-bounded-console"
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
    >
      <div className="flex shrink-0 items-start gap-2 rounded-xl border border-warning-border bg-warning-light/45 px-3 py-2 text-warning">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="text-xs leading-5">
          Service kill switches stop new patient requests within 30 seconds. Existing requests stay visible for review.
        </p>
      </div>

      <div
        data-testid="feature-flag-critical-strip"
        className="grid shrink-0 gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        <CriticalSwitchCard
          icon={Wrench}
          title="Platform"
          description={flags.maintenance_mode ? "Maintenance mode is active" : "Accepting requests"}
          checked={!flags.maintenance_mode}
          disabled={isSaving === FLAG_KEYS.MAINTENANCE_MODE}
          saving={isSaving === FLAG_KEYS.MAINTENANCE_MODE}
          tone={flags.maintenance_mode ? "danger" : "success"}
          onCheckedChange={() => {
            if (!flags.maintenance_mode) {
              onSetPendingToggle({ key: FLAG_KEYS.MAINTENANCE_MODE, currentValue: flags.maintenance_mode })
            } else {
              onExecuteToggle(FLAG_KEYS.MAINTENANCE_MODE, flags.maintenance_mode)
            }
          }}
        />
        <CriticalSwitchCard
          icon={FileText}
          title="Med cert"
          description={flags.disable_med_cert ? "Medical certificates stopped" : "Medical certificates open"}
          checked={!flags.disable_med_cert}
          disabled={isSaving === FLAG_KEYS.DISABLE_MED_CERT}
          saving={isSaving === FLAG_KEYS.DISABLE_MED_CERT}
          tone={flags.disable_med_cert ? "danger" : "success"}
          onCheckedChange={() => onToggleFlag(FLAG_KEYS.DISABLE_MED_CERT, flags.disable_med_cert)}
        />
        <CriticalSwitchCard
          icon={Pill}
          title="Repeat Rx"
          description={flags.disable_repeat_scripts ? "Repeat scripts stopped" : "Repeat scripts open"}
          checked={!flags.disable_repeat_scripts}
          disabled={isSaving === FLAG_KEYS.DISABLE_REPEAT_SCRIPTS}
          saving={isSaving === FLAG_KEYS.DISABLE_REPEAT_SCRIPTS}
          tone={flags.disable_repeat_scripts ? "danger" : "success"}
          onCheckedChange={() => onToggleFlag(FLAG_KEYS.DISABLE_REPEAT_SCRIPTS, flags.disable_repeat_scripts)}
        />
        <CriticalSwitchCard
          icon={Stethoscope}
          title="Consults"
          description={flags.disable_consults ? "Consults stopped" : "Consult services open"}
          checked={!flags.disable_consults}
          disabled={isSaving === FLAG_KEYS.DISABLE_CONSULTS}
          saving={isSaving === FLAG_KEYS.DISABLE_CONSULTS}
          tone={flags.disable_consults ? "danger" : "success"}
          onCheckedChange={() => onToggleFlag(FLAG_KEYS.DISABLE_CONSULTS, flags.disable_consults)}
        />
      </div>

      <Tabs defaultValue="core" className="min-h-0 flex-1 overflow-hidden">
        <TabsList className="w-fit max-w-full shrink-0 justify-start overflow-x-auto rounded-xl">
          <TabsTrigger value="core" className="px-4 py-2 text-xs">
            Core controls
          </TabsTrigger>
          <TabsTrigger value="safety" className="px-4 py-2 text-xs">
            Safety library
          </TabsTrigger>
          <TabsTrigger value="automation" className="px-4 py-2 text-xs">
            Automation
          </TabsTrigger>
          <TabsTrigger value="audit" className="px-4 py-2 text-xs">
            Recent changes
          </TabsTrigger>
        </TabsList>

        <TabPanel value="core">
          <div
            data-testid="feature-flag-control-grid"
            className="grid h-full min-h-0 gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
          >
            <div className="min-h-0 overflow-y-auto pr-1">
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
            </div>
            <div className="min-h-0 overflow-y-auto pr-1">
              <OperationalControlsSection
                flags={flags}
                initialFlags={initialFlags}
                isSaving={isSaving}
                onSetFlags={onSetFlags}
                onToggleFlag={onToggleFlag}
                onExecuteToggle={onExecuteToggle}
                onSaveFlag={onSaveFlag}
              />
            </div>
          </div>
        </TabPanel>

        <TabPanel value="safety">
          <div className="grid h-full min-h-0 gap-3 xl:grid-cols-2">
            <div className="min-h-0 overflow-y-auto pr-1">
              <BlockedTermsSection
                flags={flags}
                isSaving={isSaving}
                newBlockedTerm={newBlockedTerm}
                onSetNewBlockedTerm={onSetNewBlockedTerm}
                onSaveFlag={onSaveFlag}
              />
            </div>
            <div className="min-h-0 overflow-y-auto pr-1">
              <SafetySymptomsSection
                flags={flags}
                isSaving={isSaving}
                newSafetySymptom={newSafetySymptom}
                onSetNewSafetySymptom={onSetNewSafetySymptom}
                onSaveFlag={onSaveFlag}
              />
            </div>
          </div>
        </TabPanel>

        <TabPanel value="automation">
          <div className="grid h-full min-h-0 gap-3 overflow-y-auto pr-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
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
            <div className="grid content-start gap-3">
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
          </div>
        </TabPanel>

        <TabPanel value="audit">
          <div className="h-full min-h-0 overflow-y-auto pr-1">
            {auditLogs.length > 0 ? (
              <AuditLogSection auditLogs={auditLogs} />
            ) : (
              <Card className="flex h-full min-h-[220px] items-center justify-center border-dashed p-6 text-center">
                <div>
                  <Shield className="mx-auto mb-3 h-7 w-7 text-muted-foreground/60" aria-hidden="true" />
                  <p className="text-sm font-semibold text-foreground">No recent flag changes</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The last 20 configuration changes will appear here.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </TabPanel>
      </Tabs>
    </div>
  )
}
