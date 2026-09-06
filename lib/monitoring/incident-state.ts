import "server-only"

import * as Sentry from "@sentry/nextjs"

import type { BusinessAlert } from "@/lib/monitoring/alert-sections"
import { appendMonitorState, businessStateSchema, type Incident, readMonitorState } from "@/lib/monitoring/monitor-state"

// Stable append-only identifiers: never reorder existing entries (stored as numbers).
export const INCIDENT_METRICS = [
  "payment_failed", "no_purchase_window", "email_delivery_failed", "auth_email_delivery_failed",
  "email_stuck_pending", "high_risk_intake", "email_delivery_sla_breach", "human_review_queue_stalled",
  "google_ads_upload_audit_source_anomaly", "google_ads_purchase_import_health_unavailable",
  "google_ads_purchase_enhanced_conversions_setup_incomplete", "google_ads_purchase_imports_zero",
  "google_ads_purchase_primary_conversions_zero", "google_ads_purchase_import_health_failed",
  "google_ads_conversion_uploads_stalled", "google_ads_conversion_upload_partial_failures",
  "google_ads_adjustment_terminal_click_attributed_failures", "ops_invariant_query_failed",
  "ops_sla_breach_backlog", "ops_cert_refund_orphans", "ops_refund_record_anomalies", "ops_paid_but_cancelled",
  "ops_approved_certificate_missing_record", "ops_certificate_sent_missing_timestamp", "ads_contribution_negative",
  "prescription_fulfilment_approved_not_prescribed_sla_breach", "prescription_fulfilment_parchment_opened_sla_breach", "prescription_fulfilment_webhook_received_sla_breach",
  ...["failed_payments", "no_purchase_revenue", "email_delivery_failed", "auth_email_delivery_failed", "email_bounced", "email_stuck_pending", "high_risk_intake", "email_delivery_sla_breach", "ops_invariants", "stale_human_queue", "prescription_fulfilment", "ads_contribution"].map(s => `business_alert_section_failed_${s}`),
] as const

type Observation = Pick<Incident, "metric" | "severity" | "count">
export function advanceIncidents(previous: Incident[], observed: Observation[], known: number[], at: number) {
  const incidents = previous.map(item => ({ ...item }))
  const events: Incident[] = []
  for (const metric of new Set([...known, ...observed.map(item => item.metric)])) {
    const observation = observed.find(item => item.metric === metric)
    const old = incidents.find(item => item.metric === metric)
    if (old && old.at > at) continue
    const next: Incident = { metric, severity: observation?.severity ?? 0, count: observation?.count ?? 0, at, active: !!observation }
    if (observation && (!old?.active || next.severity > old.severity || next.count > old.count)
      || !observation && old?.active) events.push(next)
    if (old) Object.assign(old, next)
    else incidents.push(next)
  }
  return { incidents, events }
}

export function captureIncident(source: string, metric: string, incident: Pick<Incident, "active" | "severity" | "count">) {
  Sentry.captureMessage(`${source}: ${metric} ${incident.active ? "active" : "recovered"}`, {
    fingerprint: [source, metric], level: !incident.active ? "info" : incident.severity === 2 ? "error" : "warning",
    tags: { source, incident_status: incident.active ? "active" : "recovered" },
    extra: { count: incident.count },
  })
}

export async function dispatchBusinessIncidents(alerts: BusinessAlert[], knownMetrics: string[], at: number): Promise<boolean> {
  const observed = alerts.filter(alert => alert.severity !== "info").map(alert => ({
    metric: INCIDENT_METRICS.indexOf(alert.metric), severity: alert.severity === "critical" ? 2 : 1, count: alert.count ?? 1,
  }))
  const known = knownMetrics.map(metric => INCIDENT_METRICS.indexOf(metric)).filter(metric => metric >= 0)
  const failOpen = () => {
    for (const alert of alerts.filter(alert => alert.severity !== "info")) captureIncident("business-alert", alert.metric, { active: true, severity: alert.severity === "critical" ? 2 : 1, count: alert.count ?? 1 })
    Sentry.captureMessage("Business incident state unavailable", { level: "error", fingerprint: ["business-alert-state-unavailable"] })
    return false
  }
  try {
    if (observed.some(item => item.metric < 0)) return failOpen()
    for (let attempt = 0; attempt < 3; attempt++) {
      const { state, version } = await readMonitorState("business_incident_state", businessStateSchema)
      if (state.checkedAt >= at) return true
      const next = advanceIncidents(state.incidents, observed, known, at)
      if (!await appendMonitorState("business_incident_state", version, { ...state, checkedAt: at, incidents: next.incidents })) continue
      for (const event of next.events) captureIncident("business-alert", INCIDENT_METRICS[event.metric], event)
      return true
    }
  } catch { /* Fail open without provider data. */ }
  return failOpen()
}
