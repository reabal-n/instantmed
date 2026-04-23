"use client"

import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Megaphone,
  Pill,
  Plus,
  Shield,
  SkipForward,
  Stethoscope,
  TrendingUp,
  Wrench,
  X,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { FLAG_KEYS } from "@/lib/data/types/feature-flags"

import type {
  AuditLogSectionProps,
  AutoApproveSectionProps,
  BlockedTermsSectionProps,
  FlagActionProps,
  MaintenanceSectionProps,
  NotificationsSectionProps,
  ParchmentSectionProps,
  SafetySymptomsSectionProps,
} from "./use-feature-flags"

// ============================================================================
// Kill Switch Warning Banner
// ============================================================================

export function KillSwitchWarning() {
  return (
    <Card className="border-warning-border bg-warning-light/50">
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">Service Kill Switches</p>
            <p className="text-sm text-warning mt-1">
              Disabling a service will immediately prevent patients from creating new requests.
              Existing requests will continue processing. Changes take effect within 30 seconds.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Maintenance Mode Section
// ============================================================================

export function MaintenanceModeSection({
  flags,
  isSaving,
  isSavingMessage,
  maintenanceMessage,
  onSetMaintenanceMessage,
  onSaveMaintenanceMessage,
  onExecuteToggle,
  onSetPendingToggle,
}: MaintenanceSectionProps) {
  return (
    <Card className={flags.maintenance_mode ? "border-destructive-border bg-destructive-light/50" : ""}>
      <CardHeader className="px-6 pt-6">
        <CardTitle className="text-base flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Maintenance Mode
          {flags.maintenance_mode && (
            <Badge variant="destructive" className="ml-2">ACTIVE</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Close the entire intake form. Patients will see a maintenance message and cannot submit or pay.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-6 pb-6">
        <div className="flex items-center justify-between p-5 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${flags.maintenance_mode ? "bg-destructive-light" : "bg-muted"}`}>
              <Wrench className={`h-5 w-5 ${flags.maintenance_mode ? "text-destructive" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="font-medium">Platform Status</p>
              <p className="text-sm text-muted-foreground">
                {flags.maintenance_mode
                  ? "Platform is CLOSED - no new requests accepted"
                  : "Platform is open - accepting requests normally"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={!flags.maintenance_mode}
              onCheckedChange={() => {
                if (!flags.maintenance_mode) {
                  // Enabling maintenance mode - requires confirmation
                  onSetPendingToggle({ key: FLAG_KEYS.MAINTENANCE_MODE, currentValue: flags.maintenance_mode })
                } else {
                  onExecuteToggle(FLAG_KEYS.MAINTENANCE_MODE, flags.maintenance_mode)
                }
              }}
              disabled={isSaving === FLAG_KEYS.MAINTENANCE_MODE}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Maintenance message shown to patients</label>
          <Textarea
            value={maintenanceMessage}
            onChange={(e) => onSetMaintenanceMessage(e.target.value)}
            placeholder="We're currently performing scheduled maintenance..."
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={onSaveMaintenanceMessage}
              disabled={isSavingMessage || maintenanceMessage === flags.maintenance_message}
            >
              {isSavingMessage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save message
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Service Kill Switches Section
// ============================================================================

export function ServiceKillSwitchesSection({
  flags,
  isSaving,
  onToggleFlag,
}: Pick<FlagActionProps, "flags" | "isSaving" | "onToggleFlag">) {
  return (
    <Card>
      <CardHeader className="px-6 pt-6">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Service Controls
        </CardTitle>
        <CardDescription>
          Quickly disable services during incidents or maintenance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-6 pb-6">
        {/* Medical Certificates */}
        <div className="flex items-center justify-between p-5 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info-light">
              <FileText className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="font-medium">Medical Certificates</p>
              <p className="text-sm text-muted-foreground">
                {flags.disable_med_cert ? "Currently disabled" : "Accepting new requests"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {flags.disable_med_cert && (
              <Badge variant="destructive">Disabled</Badge>
            )}
            <Switch
              checked={!flags.disable_med_cert}
              onCheckedChange={() => onToggleFlag(FLAG_KEYS.DISABLE_MED_CERT, flags.disable_med_cert)}
              disabled={isSaving === FLAG_KEYS.DISABLE_MED_CERT}
            />
          </div>
        </div>

        {/* Repeat Prescriptions */}
        <div className="flex items-center justify-between p-5 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success-light">
              <Pill className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-medium">Repeat Prescriptions</p>
              <p className="text-sm text-muted-foreground">
                {flags.disable_repeat_scripts ? "Currently disabled" : "Accepting new requests"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {flags.disable_repeat_scripts && (
              <Badge variant="destructive">Disabled</Badge>
            )}
            <Switch
              checked={!flags.disable_repeat_scripts}
              onCheckedChange={() => onToggleFlag(FLAG_KEYS.DISABLE_REPEAT_SCRIPTS, flags.disable_repeat_scripts)}
              disabled={isSaving === FLAG_KEYS.DISABLE_REPEAT_SCRIPTS}
            />
          </div>
        </div>

        {/* Consults */}
        <div className="flex items-center justify-between p-5 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info-light">
              <Stethoscope className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="font-medium">Consultations</p>
              <p className="text-sm text-muted-foreground">
                {flags.disable_consults ? "Currently disabled" : "Accepting new requests"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {flags.disable_consults && (
              <Badge variant="destructive">Disabled</Badge>
            )}
            <Switch
              checked={!flags.disable_consults}
              onCheckedChange={() => onToggleFlag(FLAG_KEYS.DISABLE_CONSULTS, flags.disable_consults)}
              disabled={isSaving === FLAG_KEYS.DISABLE_CONSULTS}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Operational Controls Section
// ============================================================================

export function OperationalControlsSection({
  flags,
  initialFlags,
  isSaving,
  onSetFlags,
  onToggleFlag,
  onSaveFlag,
}: FlagActionProps) {
  return (
    <Card>
      <CardHeader className="px-6 pt-6">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Operational Controls
        </CardTitle>
        <CardDescription>
          Business hours, capacity limits, urgent notices, and scheduled maintenance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-6 pb-6">
        {/* Business Hours */}
        <div className="space-y-3 p-5 rounded-lg border">
          <p className="font-medium">Business Hours</p>
          <div className="flex flex-wrap items-center gap-4">
            <Switch
              checked={flags.business_hours_enabled}
              onCheckedChange={() => onToggleFlag(FLAG_KEYS.BUSINESS_HOURS_ENABLED, flags.business_hours_enabled)}
              disabled={isSaving === FLAG_KEYS.BUSINESS_HOURS_ENABLED}
            />
            <span className="text-sm text-muted-foreground">
              {flags.business_hours_enabled ? "Enforce hours" : "Always open"}
            </span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={23}
                value={flags.business_hours_open}
                onChange={(e) => onSetFlags(prev => ({ ...prev, business_hours_open: Math.min(23, Math.max(0, parseInt(e.target.value, 10) || 0)) }))}
                onBlur={() => onSaveFlag(FLAG_KEYS.BUSINESS_HOURS_OPEN, flags.business_hours_open)}
                className="w-16"
              />
              <span className="text-sm">to</span>
              <Input
                type="number"
                min={0}
                max={23}
                value={flags.business_hours_close}
                onChange={(e) => onSetFlags(prev => ({ ...prev, business_hours_close: Math.min(23, Math.max(0, parseInt(e.target.value, 10) || 0)) }))}
                onBlur={() => onSaveFlag(FLAG_KEYS.BUSINESS_HOURS_CLOSE, flags.business_hours_close)}
                className="w-16"
              />
              <span className="text-sm text-muted-foreground">(0-23, {flags.business_hours_timezone})</span>
            </div>
          </div>
        </div>

        {/* Capacity Limit */}
        <div className="space-y-3 p-5 rounded-lg border">
          <p className="font-medium">Capacity Limit</p>
          <div className="flex flex-wrap items-center gap-4">
            <Switch
              checked={flags.capacity_limit_enabled}
              onCheckedChange={() => onToggleFlag(FLAG_KEYS.CAPACITY_LIMIT_ENABLED, flags.capacity_limit_enabled)}
              disabled={isSaving === FLAG_KEYS.CAPACITY_LIMIT_ENABLED}
            />
            <span className="text-sm text-muted-foreground">
              {flags.capacity_limit_enabled ? "Limit enabled" : "No limit"}
            </span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={flags.capacity_limit_max}
                onChange={(e) => onSetFlags(prev => ({ ...prev, capacity_limit_max: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                onBlur={() => onSaveFlag(FLAG_KEYS.CAPACITY_LIMIT_MAX, flags.capacity_limit_max)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">max intakes per day</span>
            </div>
          </div>
        </div>

        {/* Urgent Notice */}
        <div className="space-y-3 p-5 rounded-lg border">
          <p className="font-medium flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Urgent Notice
          </p>
          <div className="flex items-center gap-3">
            <Switch
              checked={flags.urgent_notice_enabled}
              onCheckedChange={() => onToggleFlag(FLAG_KEYS.URGENT_NOTICE_ENABLED, flags.urgent_notice_enabled)}
              disabled={isSaving === FLAG_KEYS.URGENT_NOTICE_ENABLED}
            />
            <span className="text-sm text-muted-foreground">
              {flags.urgent_notice_enabled ? "Banner visible" : "Hidden"}
            </span>
          </div>
          <div className="space-y-2">
            <label className="text-sm">Message</label>
            <Input
              value={flags.urgent_notice_message}
              onChange={(e) => onSetFlags(prev => ({ ...prev, urgent_notice_message: e.target.value }))}
              onBlur={() => {
                if (flags.urgent_notice_message !== initialFlags.urgent_notice_message) {
                  onSaveFlag(FLAG_KEYS.URGENT_NOTICE_MESSAGE, flags.urgent_notice_message)
                }
              }}
              placeholder="e.g. Review times may be longer than usual"
            />
          </div>
        </div>

        {/* Scheduled Maintenance */}
        <div className="space-y-3 p-5 rounded-lg border">
          <p className="font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Scheduled Maintenance
          </p>
          <p className="text-xs text-muted-foreground">
            Set start and end (ISO datetime). Platform will auto-close during this window.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Start</label>
              <Input
                type="datetime-local"
                value={flags.maintenance_scheduled_start ? new Date(flags.maintenance_scheduled_start).toISOString().slice(0, 16) : ""}
                onChange={(e) => {
                  const v = e.target.value ? new Date(e.target.value).toISOString() : null
                  onSetFlags(prev => ({ ...prev, maintenance_scheduled_start: v }))
                }}
                onBlur={() => {
                  const v = flags.maintenance_scheduled_start || null
                  if (v !== (initialFlags.maintenance_scheduled_start || null)) {
                    onSaveFlag(FLAG_KEYS.MAINTENANCE_SCHEDULED_START, v)
                  }
                }}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">End</label>
              <Input
                type="datetime-local"
                value={flags.maintenance_scheduled_end ? new Date(flags.maintenance_scheduled_end).toISOString().slice(0, 16) : ""}
                onChange={(e) => {
                  const v = e.target.value ? new Date(e.target.value).toISOString() : null
                  onSetFlags(prev => ({ ...prev, maintenance_scheduled_end: v }))
                }}
                onBlur={() => {
                  const v = flags.maintenance_scheduled_end || null
                  if (v !== (initialFlags.maintenance_scheduled_end || null)) {
                    onSaveFlag(FLAG_KEYS.MAINTENANCE_SCHEDULED_END, v)
                  }
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Blocked Medication Terms Section
// ============================================================================

export function BlockedTermsSection({
  flags,
  isSaving,
  newBlockedTerm,
  onSetNewBlockedTerm,
  onSaveFlag,
}: BlockedTermsSectionProps) {
  const addBlockedTerm = () => {
    if (!newBlockedTerm.trim()) return
    const term = newBlockedTerm.trim().toLowerCase()
    if (flags.blocked_medication_terms.includes(term)) {
      return
    }
    const newList = [...flags.blocked_medication_terms, term]
    onSaveFlag(FLAG_KEYS.BLOCKED_MEDICATION_TERMS, newList)
    onSetNewBlockedTerm("")
  }

  const removeBlockedTerm = (term: string) => {
    const newList = flags.blocked_medication_terms.filter(t => t !== term)
    onSaveFlag(FLAG_KEYS.BLOCKED_MEDICATION_TERMS, newList)
  }

  return (
    <Card>
      <CardHeader className="px-6 pt-6">
        <CardTitle className="text-base flex items-center gap-2">
          <Pill className="h-4 w-4" />
          Blocked Medication Terms
        </CardTitle>
        <CardDescription>
          Medication names containing these terms will be flagged and blocked from repeat prescription requests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Add blocked term (e.g., oxycodone)"
            value={newBlockedTerm}
            onChange={(e) => onSetNewBlockedTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addBlockedTerm()}
            className="flex-1"
          />
          <Button onClick={addBlockedTerm} disabled={isSaving === FLAG_KEYS.BLOCKED_MEDICATION_TERMS}>
            {isSaving === FLAG_KEYS.BLOCKED_MEDICATION_TERMS ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {flags.blocked_medication_terms.length > 0 ? (
            flags.blocked_medication_terms.map((term) => (
              <Badge
                key={term}
                variant="secondary"
                className="gap-1 pr-1"
              >
                {term}
                <button
                  onClick={() => removeBlockedTerm(term)}
                  className="ml-1 hover:bg-muted rounded p-0.5"
                  disabled={isSaving === FLAG_KEYS.BLOCKED_MEDICATION_TERMS}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No blocked terms configured</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Safety Screening Symptoms Section
// ============================================================================

export function SafetySymptomsSection({
  flags,
  isSaving,
  newSafetySymptom,
  onSetNewSafetySymptom,
  onSaveFlag,
}: SafetySymptomsSectionProps) {
  const addSafetySymptom = () => {
    if (!newSafetySymptom.trim()) return
    const symptom = newSafetySymptom.trim()
    if (flags.safety_screening_symptoms.includes(symptom)) {
      return
    }
    const newList = [...flags.safety_screening_symptoms, symptom]
    onSaveFlag(FLAG_KEYS.SAFETY_SCREENING_SYMPTOMS, newList)
    onSetNewSafetySymptom("")
  }

  const removeSafetySymptom = (symptom: string) => {
    const newList = flags.safety_screening_symptoms.filter(s => s !== symptom)
    onSaveFlag(FLAG_KEYS.SAFETY_SCREENING_SYMPTOMS, newList)
  }

  return (
    <Card>
      <CardHeader className="px-6 pt-6">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Safety Screening Symptoms
        </CardTitle>
        <CardDescription>
          Emergency symptoms shown in safety screening. Patients who select these are directed to call 000.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Add safety symptom"
            value={newSafetySymptom}
            onChange={(e) => onSetNewSafetySymptom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSafetySymptom()}
            className="flex-1"
          />
          <Button onClick={addSafetySymptom} disabled={isSaving === FLAG_KEYS.SAFETY_SCREENING_SYMPTOMS}>
            {isSaving === FLAG_KEYS.SAFETY_SCREENING_SYMPTOMS ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="space-y-2">
          {flags.safety_screening_symptoms.map((symptom) => (
            <div
              key={symptom}
              className="flex items-center justify-between p-2 rounded-lg bg-destructive-light border border-destructive-border"
            >
              <span className="text-sm text-red-900">{symptom}</span>
              <button
                onClick={() => removeSafetySymptom(symptom)}
                className="text-destructive hover:text-destructive p-1"
                disabled={isSaving === FLAG_KEYS.SAFETY_SCREENING_SYMPTOMS}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Audit Log Section
// ============================================================================

export function AuditLogSection({ auditLogs }: AuditLogSectionProps) {
  if (auditLogs.length === 0) return null

  return (
    <Card>
      <CardHeader className="px-6 pt-6">
        <CardTitle className="text-base">Recent changes</CardTitle>
        <CardDescription>
          Who changed what and when
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between gap-2 py-2 border-b border-border/50 last:border-0 text-sm"
            >
              <div>
                <span className="font-medium">{String(log.metadata?.flag_key ?? "-")}</span>
                <span className="text-muted-foreground ml-1">
                  {log.actor?.full_name || log.actor_type}
                </span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(log.created_at).toLocaleString("en-AU", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// AI Auto-Approve Section
// ============================================================================

export function AutoApproveSection({
  flags,
  initialFlags,
  isSaving,
  autoApproveStats,
  onSetFlags,
  onExecuteToggle,
  onSaveFlag,
}: AutoApproveSectionProps) {
  return (
    <Card className={flags.ai_auto_approve_enabled ? "border-violet-300 bg-violet-50/30" : ""}>
      <CardHeader className="px-6 pt-6">
        <CardTitle className="text-base flex items-center gap-2">
          <Stethoscope className="h-4 w-4" />
          AI Auto-Approve Med Certs
          {flags.ai_auto_approve_enabled && (
            <Badge className="ml-2 bg-violet-100 text-violet-700 border-violet-200">ACTIVE</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Automatically approve eligible medical certificates (no flags, no mental health/injury/chronic) after payment.
          Doctor batch review still applies - all AI-approved certs appear in the review queue for oversight.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-6 pb-6">
        {/* Master toggle */}
        <div className="flex items-center justify-between p-5 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${flags.ai_auto_approve_enabled ? "bg-violet-100" : "bg-muted"}`}>
              <Stethoscope className={`h-5 w-5 ${flags.ai_auto_approve_enabled ? "text-violet-600" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="font-medium">Auto-Approval Status</p>
              <p className="text-sm text-muted-foreground">
                {flags.ai_auto_approve_enabled
                  ? "Eligible med certs are auto-approved and delivered"
                  : "All med certs require manual doctor review (default)"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isSaving === FLAG_KEYS.AI_AUTO_APPROVE_ENABLED && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <Switch
              checked={flags.ai_auto_approve_enabled}
              onCheckedChange={() => onExecuteToggle(FLAG_KEYS.AI_AUTO_APPROVE_ENABLED, flags.ai_auto_approve_enabled)}
              disabled={isSaving === FLAG_KEYS.AI_AUTO_APPROVE_ENABLED}
            />
          </div>
        </div>

        {/* Settings (shown when enabled) */}
        {flags.ai_auto_approve_enabled && (
          <div className="space-y-4 p-5 rounded-lg border bg-violet-50/20">
            <p className="text-sm font-medium">Auto-Approve Settings</p>

            {/* Delay */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-muted-foreground w-48">Waiting delay after payment</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={flags.auto_approve_delay_minutes}
                  onChange={(e) => onSetFlags(prev => ({ ...prev, auto_approve_delay_minutes: Math.min(60, Math.max(0, parseInt(e.target.value, 10) || 0)) }))}
                  onBlur={() => {
                    if (flags.auto_approve_delay_minutes !== initialFlags.auto_approve_delay_minutes) {
                      onSaveFlag(FLAG_KEYS.AUTO_APPROVE_DELAY_MINUTES, flags.auto_approve_delay_minutes)
                    }
                  }}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
              <p className="text-xs text-muted-foreground w-full">
                0 = approve immediately in webhook. {">"}0 = wait this long, then the retry cron (every 3 min) picks it up.
              </p>
            </div>

            {/* Rate limit */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-muted-foreground w-48">Rate limit (per 5 min)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={flags.auto_approve_rate_limit_5min}
                  onChange={(e) => onSetFlags(prev => ({ ...prev, auto_approve_rate_limit_5min: Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)) }))}
                  onBlur={() => {
                    if (flags.auto_approve_rate_limit_5min !== initialFlags.auto_approve_rate_limit_5min) {
                      onSaveFlag(FLAG_KEYS.AUTO_APPROVE_RATE_LIMIT_5MIN, flags.auto_approve_rate_limit_5min)
                    }
                  }}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">approvals per 5 min</span>
              </div>
            </div>

            {/* Daily cap */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-muted-foreground w-48">Daily cap</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={flags.auto_approve_daily_cap}
                  onChange={(e) => onSetFlags(prev => ({ ...prev, auto_approve_daily_cap: Math.min(500, Math.max(1, parseInt(e.target.value, 10) || 1)) }))}
                  onBlur={() => {
                    if (flags.auto_approve_daily_cap !== initialFlags.auto_approve_daily_cap) {
                      onSaveFlag(FLAG_KEYS.AUTO_APPROVE_DAILY_CAP, flags.auto_approve_daily_cap)
                    }
                  }}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">approvals per day</span>
              </div>
            </div>

            {/* Max duration */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-muted-foreground w-48">Max cert duration eligible</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={3}
                  value={flags.auto_approve_max_duration_days}
                  onChange={(e) => onSetFlags(prev => ({ ...prev, auto_approve_max_duration_days: Math.min(3, Math.max(1, parseInt(e.target.value, 10) || 1)) }))}
                  onBlur={() => {
                    if (flags.auto_approve_max_duration_days !== initialFlags.auto_approve_max_duration_days) {
                      onSaveFlag(FLAG_KEYS.AUTO_APPROVE_MAX_DURATION_DAYS, flags.auto_approve_max_duration_days)
                    }
                  }}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">days (max 3, certs longer need doctor review)</span>
              </div>
            </div>
          </div>
        )}

        {/* Stats (shown when enabled and stats available) */}
        {flags.ai_auto_approve_enabled && autoApproveStats && (
          <div className="space-y-4">
            {/* Stat counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-lg border bg-success-light/50">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-2xl font-semibold">{autoApproveStats.todayApproved}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Approved today</p>
              </div>
              <div className="p-4 rounded-lg border bg-destructive-light">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span className="text-2xl font-semibold">{autoApproveStats.todayFailed}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Failed today</p>
              </div>
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <SkipForward className="h-4 w-4" />
                  <span className="text-2xl font-semibold">{autoApproveStats.todaySkipped}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Skipped today</p>
              </div>
              <div className="p-4 rounded-lg border bg-violet-50/50 dark:bg-violet-500/5">
                <div className="flex items-center gap-2 text-violet-700 dark:text-violet-400">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-2xl font-semibold">{autoApproveStats.last7DaysApproved}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
              </div>
            </div>

            {/* Last approved */}
            {autoApproveStats.lastApprovedAt && (
              <p className="text-xs text-muted-foreground">
                Last auto-approved:{" "}
                {new Date(autoApproveStats.lastApprovedAt).toLocaleString("en-AU", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}

            {/* Recent activity log */}
            {autoApproveStats.recentActivity.length > 0 && (
              <div className="p-4 rounded-lg border">
                <p className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4" />
                  Recent Activity
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {autoApproveStats.recentActivity.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-2 py-1.5 border-b border-border/50 last:border-0 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {entry.eligible ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate text-muted-foreground">{entry.reason}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(entry.created_at).toLocaleString("en-AU", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Safety: only 1-3 day certs eligible. Excludes mental health, injury, chronic conditions, pregnancy, emergencies, and minors. All auto-approved certs are logged to the audit trail.
        </p>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Notifications Section
// ============================================================================

export function NotificationsSection({
  flags,
  initialFlags,
  isSaving,
  onSetFlags,
  onExecuteToggle,
  onSaveFlag,
}: NotificationsSectionProps) {
  return (
    <Card>
      <CardHeader className="px-6 pt-6">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="h-4 w-4" />
          Notifications
        </CardTitle>
        <CardDescription>
          Controls Telegram doctor alerts and patient delay emails. The master toggle disables all notification sends without affecting other features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-6 pb-6">
        {/* Master toggle */}
        <div className="flex items-center justify-between p-5 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${flags.telegram_notifications_enabled ? "bg-info-light" : "bg-muted"}`}>
              <Megaphone className={`h-5 w-5 ${flags.telegram_notifications_enabled ? "text-info" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="font-medium">Telegram Notifications</p>
              <p className="text-sm text-muted-foreground">
                {flags.telegram_notifications_enabled
                  ? "Doctor alerts and patient emails are active"
                  : "All notification sends are disabled"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isSaving === FLAG_KEYS.TELEGRAM_NOTIFICATIONS_ENABLED && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <Switch
              checked={flags.telegram_notifications_enabled}
              onCheckedChange={() => onExecuteToggle(FLAG_KEYS.TELEGRAM_NOTIFICATIONS_ENABLED, flags.telegram_notifications_enabled)}
              disabled={isSaving === FLAG_KEYS.TELEGRAM_NOTIFICATIONS_ENABLED}
            />
          </div>
        </div>

        {/* Threshold settings */}
        <div className="space-y-4 p-5 rounded-lg border">
          <p className="text-sm font-medium">Alert Thresholds</p>

          {/* Doctor alert */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-muted-foreground w-48">Doctor Alert (hours)</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={24}
                value={flags.doctor_alert_threshold_hours}
                onChange={(e) => onSetFlags(prev => ({ ...prev, doctor_alert_threshold_hours: Math.min(24, Math.max(1, parseInt(e.target.value, 10) || 1)) }))}
                onBlur={() => {
                  if (flags.doctor_alert_threshold_hours !== initialFlags.doctor_alert_threshold_hours) {
                    onSaveFlag(FLAG_KEYS.DOCTOR_ALERT_THRESHOLD_HOURS, flags.doctor_alert_threshold_hours)
                  }
                }}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">hours before Telegram alert fires</span>
            </div>
          </div>

          {/* Patient delay email */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-muted-foreground w-48">Patient Delay Email (hours)</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={48}
                value={flags.patient_delay_email_hours}
                onChange={(e) => onSetFlags(prev => ({ ...prev, patient_delay_email_hours: Math.min(48, Math.max(1, parseInt(e.target.value, 10) || 1)) }))}
                onBlur={() => {
                  if (flags.patient_delay_email_hours !== initialFlags.patient_delay_email_hours) {
                    onSaveFlag(FLAG_KEYS.PATIENT_DELAY_EMAIL_HOURS, flags.patient_delay_email_hours)
                  }
                }}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">hours before patient delay email sends</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Parchment ePrescribing Section
// ============================================================================

export function ParchmentSection({
  flags,
  isSaving,
  onExecuteToggle,
}: ParchmentSectionProps) {
  return (
    <Card>
      <CardHeader className="px-6 pt-6">
        <CardTitle className="text-base flex items-center gap-2">
          <Pill className="h-4 w-4" />
          Parchment ePrescribing
        </CardTitle>
        <CardDescription>
          Enables the embedded Parchment iframe in the doctor portal for writing eScripts directly inside InstantMed. When off, doctors use the manual &quot;Mark Sent&quot; workflow.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="flex items-center justify-between p-5 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${flags.parchment_embedded_prescribing ? "bg-success-light" : "bg-muted"}`}>
              <Pill className={`h-5 w-5 ${flags.parchment_embedded_prescribing ? "text-success" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="font-medium">Embedded Prescribing</p>
              <p className="text-sm text-muted-foreground">
                {flags.parchment_embedded_prescribing
                  ? "Parchment iframe active — doctors prescribe inside InstantMed"
                  : "Disabled — doctors use manual Mark Sent workflow"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isSaving === FLAG_KEYS.PARCHMENT_EMBEDDED_PRESCRIBING && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <Switch
              checked={flags.parchment_embedded_prescribing}
              onCheckedChange={() => onExecuteToggle(FLAG_KEYS.PARCHMENT_EMBEDDED_PRESCRIBING, flags.parchment_embedded_prescribing)}
              disabled={isSaving === FLAG_KEYS.PARCHMENT_EMBEDDED_PRESCRIBING}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
