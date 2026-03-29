"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ToggleLeft } from "lucide-react"
import { toast } from "sonner"
import { updateFeatureFlagAction } from "@/app/actions/admin-config"
import type { FeatureFlags, FlagKey } from "@/lib/data/types/feature-flags"
import { FLAG_KEYS } from "@/lib/data/types/feature-flags"
import type { AutoApproveStats } from "@/app/actions/admin-config"
import { FeaturesList, KILL_SWITCH_FLAGS } from "./features-list"
import type { AuditLogEntry } from "./features-list"
import { KillSwitchConfirmDialog } from "./feature-flag-form"

interface FeatureFlagsClientProps {
  initialFlags: FeatureFlags
  auditLogs?: AuditLogEntry[]
  autoApproveStats?: AutoApproveStats | null
}

export function FeatureFlagsClient({ initialFlags, auditLogs = [], autoApproveStats }: FeatureFlagsClientProps) {
  const router = useRouter()
  const [flags, setFlags] = useState(initialFlags)
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const [newBlockedTerm, setNewBlockedTerm] = useState("")
  const [newSafetySymptom, setNewSafetySymptom] = useState("")
  const [maintenanceMessage, setMaintenanceMessage] = useState(flags.maintenance_message || "")
  const [isSavingMessage, setIsSavingMessage] = useState(false)

  // Kill switch confirmation state
  const [pendingToggle, setPendingToggle] = useState<{ key: FlagKey; currentValue: boolean } | null>(null)

  const executeToggle = useCallback(async (key: FlagKey, currentValue: boolean) => {
    setIsSaving(key)
    try {
      const result = await updateFeatureFlagAction(key, !currentValue)
      if (result.success) {
        setFlags(prev => ({ ...prev, [key]: !currentValue }))
        toast.success(`${!currentValue ? "Enabled" : "Disabled"} successfully`)
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update flag")
      }
    } catch {
      toast.error("Failed to update flag")
    } finally {
      setIsSaving(null)
    }
  }, [router])

  const handleToggleFlag = useCallback((key: FlagKey, currentValue: boolean) => {
    // If this is a kill switch being DISABLED (turned off), require confirmation
    const isKillSwitch = KILL_SWITCH_FLAGS.includes(key)
    const isDisabling = !currentValue // Toggling from false to true means disabling the service

    if (isKillSwitch && isDisabling) {
      setPendingToggle({ key, currentValue })
    } else {
      executeToggle(key, currentValue)
    }
  }, [executeToggle])

  const handleSaveMaintenanceMessage = useCallback(async () => {
    if (!maintenanceMessage.trim()) return
    setIsSavingMessage(true)
    try {
      const result = await updateFeatureFlagAction(FLAG_KEYS.MAINTENANCE_MESSAGE, maintenanceMessage.trim())
      if (result.success) {
        setFlags(prev => ({ ...prev, maintenance_message: maintenanceMessage.trim() }))
        toast.success("Maintenance message updated")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update message")
      }
    } catch {
      toast.error("Failed to update message")
    } finally {
      setIsSavingMessage(false)
    }
  }, [maintenanceMessage, router])

  const handleSaveFlag = useCallback(async (key: FlagKey, value: boolean | string | string[] | number | null) => {
    setIsSaving(key)
    try {
      const result = await updateFeatureFlagAction(key, value)
      if (result.success) {
        setFlags(prev => ({ ...prev, [key]: value }))
        toast.success("Updated successfully")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update")
      }
    } catch {
      toast.error("Failed to update")
    } finally {
      setIsSaving(null)
    }
  }, [router])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <ToggleLeft className="h-6 w-6 text-primary" />
              Feature Flags
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kill switches and configuration toggles
            </p>
          </div>
        </div>
      </div>

      <FeaturesList
        flags={flags}
        initialFlags={initialFlags}
        isSaving={isSaving}
        isSavingMessage={isSavingMessage}
        maintenanceMessage={maintenanceMessage}
        newBlockedTerm={newBlockedTerm}
        newSafetySymptom={newSafetySymptom}
        auditLogs={auditLogs}
        autoApproveStats={autoApproveStats}
        onSetFlags={setFlags}
        onSetMaintenanceMessage={setMaintenanceMessage}
        onSetNewBlockedTerm={setNewBlockedTerm}
        onSetNewSafetySymptom={setNewSafetySymptom}
        onToggleFlag={handleToggleFlag}
        onExecuteToggle={executeToggle}
        onSaveMaintenanceMessage={handleSaveMaintenanceMessage}
        onSaveFlag={handleSaveFlag}
        onSetPendingToggle={setPendingToggle}
      />

      <KillSwitchConfirmDialog
        pendingToggle={pendingToggle}
        isSaving={isSaving}
        onConfirm={executeToggle}
        onClose={() => setPendingToggle(null)}
      />
    </div>
  )
}
