import "server-only"

import * as Sentry from "@sentry/nextjs"

import type { BusinessAlert } from "@/lib/monitoring/alert-sections"
import { buildGoogleAdsPurchaseImportAlert, type GoogleAdsPurchaseImportHealthSnapshot } from "@/lib/monitoring/google-ads-purchase-import-health"
import { INCIDENT_METRICS, type IncidentMetric } from "@/lib/monitoring/incident-metrics"
import { appendMonitorState, businessStateSchema, type Incident, readMonitorState } from "@/lib/monitoring/monitor-state"

export function knownGooglePurchaseIncidentMetrics(snapshot: GoogleAdsPurchaseImportHealthSnapshot | null): IncidentMetric[] {
  if (!snapshot?.preflightOk || snapshot.queryErrors.length > 0) return []
  // The alert builder short-circuits at its first fault. Only predicates up to
  // that fault were evaluated; lower-priority absence is unknown, not recovery.
  const predicates: IncidentMetric[] = [
    "google_ads_purchase_import_health_unavailable",
    "google_ads_purchase_enhanced_conversions_setup_incomplete",
    "google_ads_purchase_imports_zero",
    "google_ads_purchase_primary_conversions_zero",
  ]
  const selected = buildGoogleAdsPurchaseImportAlert(snapshot)
  const evaluated = selected ? predicates.slice(0, predicates.indexOf(selected.metric) + 1) : predicates
  return ["google_ads_purchase_import_health_failed", "google_ads_upload_audit_source_anomaly", ...evaluated]
}

type Observation = Pick<Incident, "metric" | "severity" | "count">
export function advanceIncidents(previous: Incident[], observed: Observation[], known: number[], at: number) {
  const incidents = previous.map(item => ({ ...item }))
  const events: Incident[] = []
  for (const metric of new Set([...known, ...observed.map(item => item.metric)])) {
    const observation = observed.find(item => item.metric === metric)
    const old = incidents.find(item => item.metric === metric)
    if (old && old.at > at) continue
    const next: Incident = { metric, severity: observation?.severity ?? 0, count: observation?.count ?? 0, at, active: !!observation }
    const notify = !!(observation && (!old?.active || next.severity > old.severity || next.count > old.count)
      || !observation && old?.active)
    // `at` identifies the last alertable transition. Keep it on unchanged or
    // improving observations so delivered Telegram incidents stay quiet.
    // Counts still advance: 5 → 4 → 5 gets a fresh token. Each caller's durable
    // checkedAt/CAS guard, not this retained timestamp, orders whole polls.
    if (old && !notify) next.at = old.at
    if (notify) events.push(next)
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

export type BusinessIncidentDispatch =
  | { status: "accepted"; incidents: Incident[] }
  | { status: "superseded" | "unavailable" }

export async function dispatchBusinessIncidents(alerts: BusinessAlert[], knownMetrics: IncidentMetric[], at: number): Promise<BusinessIncidentDispatch> {
  const observed = alerts.filter(alert => alert.severity !== "info").map(alert => ({
    metric: INCIDENT_METRICS.indexOf(alert.metric), severity: alert.severity === "critical" ? 2 : 1, count: alert.count ?? 1,
  }))
  const known = knownMetrics.map(metric => INCIDENT_METRICS.indexOf(metric)).filter(metric => metric >= 0)
  const failOpen = (): BusinessIncidentDispatch => {
    for (const alert of alerts.filter(alert => alert.severity !== "info")) captureIncident("business-alert", alert.metric, { active: true, severity: alert.severity === "critical" ? 2 : 1, count: alert.count ?? 1 })
    Sentry.captureMessage("Business incident state unavailable", { level: "error", fingerprint: ["business-alert-state-unavailable"] })
    return { status: "unavailable" }
  }
  try {
    if (observed.some(item => item.metric < 0)) return failOpen()
    for (let attempt = 0; attempt < 3; attempt++) {
      const { state, version } = await readMonitorState("business_incident_state", businessStateSchema)
      // Never attach this poll's old alert text to a newer incident token.
      if (state.checkedAt >= at) return { status: "superseded" }
      const next = advanceIncidents(state.incidents, observed, known, at)
      if (!await appendMonitorState("business_incident_state", version, { ...state, checkedAt: at, incidents: next.incidents })) continue
      for (const event of next.events) captureIncident("business-alert", INCIDENT_METRICS[event.metric], event)
      return { status: "accepted", incidents: next.incidents }
    }
  } catch { /* Fail open without provider data. */ }
  return failOpen()
}
