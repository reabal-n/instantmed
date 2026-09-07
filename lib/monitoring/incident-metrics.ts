// These section names also own persisted section-failure IDs. Append only.
const BUSINESS_ALERT_SECTIONS = [
  "failed_payments", "no_purchase_revenue", "email_delivery_failed", "auth_email_delivery_failed",
  "email_bounced", "email_stuck_pending", "high_risk_intake", "email_delivery_sla_breach",
  "ops_invariants", "stale_human_queue", "prescription_fulfilment", "ads_contribution",
] as const
export type BusinessAlertSection = typeof BUSINESS_ALERT_SECTIONS[number]

// Stable append-only identifiers: never reorder existing entries (stored as numbers).
// Every warning/critical producer must use this union before entering dispatch.
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
  ...BUSINESS_ALERT_SECTIONS.map(section => `business_alert_section_failed_${section}` as const),
] as const
export type IncidentMetric = typeof INCIDENT_METRICS[number]
