import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  buildGoogleAdsPurchaseImportAlert,
  buildGoogleAdsUploadAuditSourceAnomalyAlert,
  type GoogleAdsPurchaseImportHealthSnapshot,
} from "@/lib/monitoring/google-ads-purchase-import-health"

function snapshot(
  overrides: Partial<GoogleAdsPurchaseImportHealthSnapshot> = {},
): GoogleAdsPurchaseImportHealthSnapshot {
  return {
    acceptedCustomerDataTerms: true,
    enhancedConversionsForLeadsEnabled: true,
    generatedAt: "2026-06-24T04:18:33.334Z",
    localNetRevenueAud: 414.2,
    localOrders: 17,
    preflightOk: true,
    purchaseAllConversions: 9,
    purchaseAllConversionsValueAud: 219.55,
    purchaseConversions: 2,
    purchaseConversionValueAud: 49.9,
    queryErrors: [],
    rangeDays: 30,
    uploadAuditReconciliation: {
      byRequestPath: {},
      byRuntimeSource: {},
      bySource: {},
      byVercelEnv: {},
      orphanRows: {
        invalidIntakeJoin: 0,
        missingIntakeId: 0,
        samples: [],
        total: 0,
      },
    },
    ...overrides,
  }
}

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("Google Ads purchase import health", () => {
  it("does not alert when there are no local Google-attributed paid orders", () => {
    expect(buildGoogleAdsPurchaseImportAlert(snapshot({ localOrders: 0 }))).toBeNull()
  })

  it("alerts when local paid orders exist but Google Ads shows zero imported purchases", () => {
    const alert = buildGoogleAdsPurchaseImportAlert(snapshot({
      purchaseAllConversions: 0,
      purchaseAllConversionsValueAud: 0,
      purchaseConversions: 0,
      purchaseConversionValueAud: 0,
    }))

    expect(alert).toMatchObject({
      metric: "google_ads_purchase_imports_zero",
      severity: "critical",
      count: 17,
      metadata: {
        local_orders: 17,
        purchase_all_conversions: 0,
        purchase_conversions: 0,
        window: "30d",
      },
    })
  })

  it("alerts when imports exist but primary purchase conversions are still zero", () => {
    const alert = buildGoogleAdsPurchaseImportAlert(snapshot({
      purchaseAllConversions: 9,
      purchaseConversions: 0,
    }))

    expect(alert).toMatchObject({
      metric: "google_ads_purchase_primary_conversions_zero",
      severity: "critical",
      metadata: {
        local_orders: 17,
        purchase_all_conversions: 9,
        purchase_conversions: 0,
      },
    })
    expect(alert?.detail).toContain("zero primary purchase conversions")
  })

  it("alerts when the Ads query cannot verify purchase import health", () => {
    const alert = buildGoogleAdsPurchaseImportAlert(snapshot({
      queryErrors: [{ name: "purchase_conversion_performance", error: "google_ads_api_unavailable" }],
    }))

    expect(alert).toMatchObject({
      metric: "google_ads_purchase_import_health_unavailable",
      severity: "critical",
      metadata: {
        query_errors: ["purchase_conversion_performance:google_ads_api_unavailable"],
      },
    })
  })

  it("alerts separately when enhanced-conversion account setup is incomplete", () => {
    const alert = buildGoogleAdsPurchaseImportAlert(snapshot({
      acceptedCustomerDataTerms: true,
      enhancedConversionsForLeadsEnabled: false,
    }))

    expect(alert).toMatchObject({
      metric: "google_ads_purchase_enhanced_conversions_setup_incomplete",
      severity: "critical",
      metadata: {
        accepted_customer_data_terms: true,
        enhanced_conversions_for_leads_enabled: false,
        local_orders: 17,
      },
    })
    expect(alert?.detail).toContain("enhanced-conversion setup is incomplete")
  })

  it("alerts separately for Google Ads upload audit rows with no valid intake join", () => {
    const alert = buildGoogleAdsUploadAuditSourceAnomalyAlert(snapshot({
      uploadAuditReconciliation: {
        byRequestPath: { missing: 11 },
        byRuntimeSource: { node: 11 },
        bySource: { checkout_session_completed: 11 },
        byVercelEnv: { missing: 11 },
        orphanRows: {
          invalidIntakeJoin: 0,
          missingIntakeId: 11,
          samples: [
            {
              at: "2026-06-24T06:07:00.582Z",
              deploymentId: null,
              requestPath: null,
              runtimeSource: "node",
              source: "checkout_session_completed",
              status: "skipped_missing_env",
              uploadJobId: null,
              vercelEnv: null,
            },
          ],
          total: 11,
        },
      },
    }))

    expect(alert).toMatchObject({
      count: 11,
      metric: "google_ads_upload_audit_source_anomaly",
      severity: "critical",
      metadata: {
        upload_audit_orphan_rows: 11,
        upload_audit_request_paths: ["missing"],
        upload_audit_runtime_sources: ["node"],
        upload_audit_sources: ["checkout_session_completed"],
      },
    })
    expect(alert?.detail).toContain("audit-source anomaly")
  })

  it("keeps the production cron and PostHog metric wired to the guard", () => {
    const cron = read("app/api/cron/business-alerts/route.ts")
    const posthog = read("lib/analytics/posthog-server.ts")

    expect(cron).toContain("getGoogleAdsPurchaseImportHealth")
    expect(cron).toContain("buildGoogleAdsPurchaseImportAlert")
    expect(cron).toContain("buildGoogleAdsUploadAuditSourceAnomalyAlert")
    expect(cron).toContain("google_ads_purchase_import_health")
    expect(posthog).toContain("'google_ads_purchase_enhanced_conversions_setup_incomplete'")
    expect(posthog).toContain("'google_ads_purchase_imports_zero'")
    expect(posthog).toContain("'google_ads_purchase_primary_conversions_zero'")
    expect(posthog).toContain("'google_ads_upload_audit_source_anomaly'")
  })
})
