import { describe, expect, expectTypeOf, it } from "vitest"

import type { OperationalInvariantAlert } from "@/lib/admin/ops-invariants"
import type { buildAdsContributionAlert } from "@/lib/monitoring/ads-contribution-health"
import { buildAlertSectionFailureAlert, type BusinessAlert, runAlertSection } from "@/lib/monitoring/alert-sections"
import type { buildAuthEmailFailureAlert } from "@/lib/monitoring/auth-email-failure"
import type { buildGoogleAdsAdjustmentTerminalRiskAlert, buildGoogleAdsPurchaseImportAlert, buildGoogleAdsUploadAuditSourceAnomalyAlert, buildGoogleAdsUploadPartialFailureAlert, buildGoogleAdsUploadStreamStalledAlert } from "@/lib/monitoring/google-ads-purchase-import-health"
import { type BusinessAlertSection, INCIDENT_METRICS, type IncidentMetric } from "@/lib/monitoring/incident-metrics"
import type { buildNoPurchaseRevenueAlert } from "@/lib/monitoring/revenue-safety"
import type { buildStaleHumanQueueAlert } from "@/lib/monitoring/stale-human-queue"
import type { buildPrescriptionFulfilmentSlaAlerts } from "@/lib/parchment/fulfilment-dashboard"

type ProducerAlert = NonNullable<ReturnType<
  typeof buildAdsContributionAlert | typeof buildAuthEmailFailureAlert |
  typeof buildGoogleAdsAdjustmentTerminalRiskAlert | typeof buildGoogleAdsPurchaseImportAlert |
  typeof buildGoogleAdsUploadAuditSourceAnomalyAlert | typeof buildGoogleAdsUploadPartialFailureAlert |
  typeof buildGoogleAdsUploadStreamStalledAlert | typeof buildNoPurchaseRevenueAlert | typeof buildStaleHumanQueueAlert
>> | OperationalInvariantAlert | ReturnType<typeof buildPrescriptionFulfilmentSlaAlerts>[number]

describe("durable incident category contract", () => {
  it("requires every alert producer and section to use registered categories", () => {
    expectTypeOf<BusinessAlert["metric"]>().toEqualTypeOf<IncidentMetric>()
    expectTypeOf<ProducerAlert["metric"]>().toMatchTypeOf<IncidentMetric>()
    expectTypeOf<string>().not.toMatchTypeOf<BusinessAlert["metric"]>()
    expectTypeOf<Parameters<typeof runAlertSection>[0]["section"]>().toEqualTypeOf<BusinessAlertSection>()
    for (const metric of INCIDENT_METRICS.filter(item => item.startsWith("business_alert_section_failed_"))) {
      const section = metric.slice("business_alert_section_failed_".length) as BusinessAlertSection
      const alert = buildAlertSectionFailureAlert(section, new Error("fixture failure"))
      expect(alert.severity).toBe("critical")
      expect(alert.metric).toBe(metric)
    }
    // Bounces produce analytics only. Their failed read is still pageable.
    expect(INCIDENT_METRICS).not.toContain("email_bounced")
    expect(INCIDENT_METRICS).toContain("business_alert_section_failed_email_bounced")
  })

  it("preserves all deployed numeric IDs and permits only new appended categories", () => {
    expect(INCIDENT_METRICS.slice(0, 40)).toEqual([
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
      "business_alert_section_failed_failed_payments", "business_alert_section_failed_no_purchase_revenue",
      "business_alert_section_failed_email_delivery_failed", "business_alert_section_failed_auth_email_delivery_failed",
      "business_alert_section_failed_email_bounced", "business_alert_section_failed_email_stuck_pending",
      "business_alert_section_failed_high_risk_intake", "business_alert_section_failed_email_delivery_sla_breach",
      "business_alert_section_failed_ops_invariants", "business_alert_section_failed_stale_human_queue",
      "business_alert_section_failed_prescription_fulfilment", "business_alert_section_failed_ads_contribution",
    ])
    expect(new Set(INCIDENT_METRICS).size).toBe(INCIDENT_METRICS.length)
    expect(INCIDENT_METRICS.length).toBeLessThanOrEqual(100)
  })
})
