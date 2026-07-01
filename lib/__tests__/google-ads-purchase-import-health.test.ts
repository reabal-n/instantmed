import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  buildGoogleAdsPurchaseImportAlert,
  buildGoogleAdsUploadAuditSourceAnomalyAlert,
  buildGoogleAdsUploadPartialFailureAlert,
  buildGoogleAdsUploadStreamStalledAlert,
  type GoogleAdsPurchaseImportHealthSnapshot,
  type GoogleAdsUploadStreamHealth,
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
    expect(cron).toContain("buildGoogleAdsUploadStreamStalledAlert")
    expect(cron).toContain("buildGoogleAdsUploadPartialFailureAlert")
    expect(cron).toContain("getGoogleAdsUploadStreamHealth")
    expect(cron).toContain("google_ads_purchase_import_health")
    expect(posthog).toContain("'google_ads_purchase_enhanced_conversions_setup_incomplete'")
    expect(posthog).toContain("'google_ads_purchase_imports_zero'")
    expect(posthog).toContain("'google_ads_purchase_primary_conversions_zero'")
    expect(posthog).toContain("'google_ads_upload_audit_source_anomaly'")
    expect(posthog).toContain("'google_ads_conversion_uploads_stalled'")
    expect(posthog).toContain("'google_ads_conversion_upload_partial_failures'")
  })
})

describe("Google Ads upload stream stall detector", () => {
  function streamHealth(
    overrides: Partial<GoogleAdsUploadStreamHealth> = {},
  ): GoogleAdsUploadStreamHealth {
    return {
      dataManagerSuccesses: 5,
      failedUploads: 0,
      generatedAt: "2026-06-30T09:00:00.000Z",
      latestFailedAt: null,
      latestFailureCode: null,
      lastSuccessfulUploadAt: "2026-06-30T08:59:05.006Z",
      legacySuccesses: 0,
      lookbackDays: 3,
      paidOrders: 6,
      queryFailed: false,
      successfulUploads: 5,
      ...overrides,
    }
  }

  it("does not page when the stream is healthy (successful uploads exist)", () => {
    expect(buildGoogleAdsUploadStreamStalledAlert(streamHealth())).toBeNull()
  })

  it("does not page when there are no paid orders to upload", () => {
    expect(
      buildGoogleAdsUploadStreamStalledAlert(
        streamHealth({ paidOrders: 0, successfulUploads: 0, dataManagerSuccesses: 0 }),
      ),
    ).toBeNull()
  })

  it("fails soft — never pages on its own DB read failure", () => {
    expect(
      buildGoogleAdsUploadStreamStalledAlert(
        streamHealth({ queryFailed: true, paidOrders: 9, successfulUploads: 0, dataManagerSuccesses: 0 }),
      ),
    ).toBeNull()
  })

  it("pages critical when paid orders exist but zero successful uploads reached Google", () => {
    const alert = buildGoogleAdsUploadStreamStalledAlert(
      streamHealth({
        paidOrders: 9,
        successfulUploads: 0,
        dataManagerSuccesses: 0,
        legacySuccesses: 0,
        lastSuccessfulUploadAt: null,
      }),
    )

    expect(alert).toMatchObject({
      metric: "google_ads_conversion_uploads_stalled",
      severity: "critical",
      count: 9,
      metadata: {
        paid_orders: 9,
        successful_uploads: 0,
        data_manager_successes: 0,
        window: "3d",
        window_days: 3,
      },
    })
    expect(alert?.detail).toContain("stalled")
  })

  it("catches a Data-Manager-only stall the click-id reporting alert cannot see", () => {
    // The reporting-side purchase_imports_zero alert is gated on click-id
    // orders; an enhanced-conversions-only stream (no click ids) has paid orders
    // but zero successful uploads and would be invisible to it.
    const alert = buildGoogleAdsUploadStreamStalledAlert(
      streamHealth({ paidOrders: 4, successfulUploads: 0, dataManagerSuccesses: 0 }),
    )
    expect(alert?.metric).toBe("google_ads_conversion_uploads_stalled")
  })

  it("does not page partial failures when all uploads are failing", () => {
    expect(
      buildGoogleAdsUploadPartialFailureAlert(
        streamHealth({
          dataManagerSuccesses: 0,
          failedUploads: 9,
          lastSuccessfulUploadAt: null,
          successfulUploads: 0,
        }),
      ),
    ).toBeNull()
  })

  it("does not page partial failures below the minimum count threshold", () => {
    expect(
      buildGoogleAdsUploadPartialFailureAlert(
        streamHealth({
          failedUploads: 2,
          successfulUploads: 10,
        }),
      ),
    ).toBeNull()
  })

  it("pages critical when successful uploads continue but the failure rate is elevated", () => {
    const alert = buildGoogleAdsUploadPartialFailureAlert(
      streamHealth({
        dataManagerSuccesses: 9,
        failedUploads: 3,
        latestFailedAt: "2026-06-30T08:55:05.006Z",
        latestFailureCode: "http_500",
        successfulUploads: 9,
      }),
    )

    expect(alert).toMatchObject({
      metric: "google_ads_conversion_upload_partial_failures",
      severity: "critical",
      count: 3,
      metadata: {
        failed_uploads: 3,
        failure_rate: 0.25,
        latest_failed_at: "2026-06-30T08:55:05.006Z",
        latest_failure_code: "http_500",
        successful_uploads: 9,
        window: "3d",
      },
    })
    expect(alert?.detail.toLowerCase()).toContain("partial google ads conversion upload failures")
  })
})
