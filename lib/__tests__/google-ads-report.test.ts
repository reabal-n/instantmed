import { describe, expect, it } from "vitest"

import {
  buildGoogleAdsCampaignPerformanceQuery,
  buildGoogleAdsCustomerConversionTrackingSettingsQuery,
  buildGoogleAdsDiagnosticsWatchResult,
  buildGoogleAdsEvidenceComparison,
  buildGoogleAdsOfflineConversionActionSummaryQuery,
  buildGoogleAdsPurchaseConversionQuery,
  getGoogleAdsUploadAuditReconciliation,
  type GoogleAdsSpendAuditReport,
  summarizeGoogleAdsCampaignRows,
  summarizeGoogleAdsCustomerConversionTrackingSettings,
  summarizeGoogleAdsOfflineUploadDiagnostics,
  summarizeLocalGoogleAdsPurchases,
} from "@/lib/analytics/google-ads-report"

describe("google ads spend report", () => {
  it("builds a campaign performance query with spend, click, conversion, and device fields", () => {
    expect(buildGoogleAdsCampaignPerformanceQuery({
      endDate: "2026-06-02",
      startDate: "2026-05-03",
    })).toBe([
      "SELECT",
      "segments.date,",
      "segments.device,",
      "segments.ad_network_type,",
      "campaign.id,",
      "campaign.name,",
      "campaign.status,",
      "campaign.advertising_channel_type,",
      "metrics.impressions,",
      "metrics.clicks,",
      "metrics.cost_micros,",
      "metrics.conversions,",
      "metrics.conversions_value,",
      "metrics.all_conversions,",
      "metrics.all_conversions_value",
      "FROM campaign",
      "WHERE segments.date BETWEEN '2026-05-03' AND '2026-06-02'",
      "ORDER BY metrics.cost_micros DESC",
    ].join(" "))
  })

  it("builds a purchase conversion query scoped to the configured conversion action", () => {
    expect(buildGoogleAdsPurchaseConversionQuery({
      endDate: "2026-06-02",
      startDate: "2026-05-03",
    }, "customers/1234567890/conversionActions/9876543210")).toBe([
      "SELECT",
      "segments.date,",
      "segments.conversion_action,",
      "segments.conversion_action_name,",
      "campaign.id,",
      "campaign.name,",
      "campaign.status,",
      "campaign.advertising_channel_type,",
      "metrics.conversions,",
      "metrics.conversions_value,",
      "metrics.all_conversions,",
      "metrics.all_conversions_value",
      "FROM campaign",
      "WHERE segments.date BETWEEN '2026-05-03' AND '2026-06-02'",
      "AND segments.conversion_action = 'customers/1234567890/conversionActions/9876543210'",
      "ORDER BY metrics.conversions_value DESC",
    ].join(" "))
  })

  it("builds an offline upload diagnostics query scoped to the configured purchase action", () => {
    expect(buildGoogleAdsOfflineConversionActionSummaryQuery(
      "customers/1234567890/conversionActions/9876543210",
    )).toBe([
      "SELECT",
      "offline_conversion_upload_conversion_action_summary.conversion_action_name,",
      "offline_conversion_upload_conversion_action_summary.alerts,",
      "offline_conversion_upload_conversion_action_summary.client,",
      "offline_conversion_upload_conversion_action_summary.daily_summaries,",
      "offline_conversion_upload_conversion_action_summary.job_summaries,",
      "offline_conversion_upload_conversion_action_summary.last_upload_date_time,",
      "offline_conversion_upload_conversion_action_summary.pending_event_count,",
      "offline_conversion_upload_conversion_action_summary.status,",
      "offline_conversion_upload_conversion_action_summary.successful_event_count,",
      "offline_conversion_upload_conversion_action_summary.total_event_count",
      "FROM offline_conversion_upload_conversion_action_summary",
      "WHERE offline_conversion_upload_conversion_action_summary.conversion_action_id = 9876543210",
    ].join(" "))
  })

  it("builds the enhanced-conversion account setup query Google documents", () => {
    expect(buildGoogleAdsCustomerConversionTrackingSettingsQuery()).toBe([
      "SELECT",
      "customer.id,",
      "customer.conversion_tracking_setting.accepted_customer_data_terms,",
      "customer.conversion_tracking_setting.enhanced_conversions_for_leads_enabled",
      "FROM customer",
    ].join(" "))
  })

  it("summarizes enhanced-conversion account setup flags from Google Ads rows", () => {
    expect(summarizeGoogleAdsCustomerConversionTrackingSettings([
      {
        customer: {
          id: "1234567890",
          conversionTrackingSetting: {
            acceptedCustomerDataTerms: "true",
            enhancedConversionsForLeadsEnabled: false,
          },
        },
      },
    ])).toEqual({
      acceptedCustomerDataTerms: true,
      customerId: "1234567890",
      enhancedConversionsForLeadsEnabled: false,
    })
  })

  it("summarizes offline upload diagnostics job rows for a watched job", () => {
    const diagnostics = summarizeGoogleAdsOfflineUploadDiagnostics([
      {
        offlineConversionUploadConversionActionSummary: {
          lastUploadDateTime: "2026-06-21 09:24:42.868537",
          pendingEventCount: "2",
          status: "EXCELLENT",
          successfulEventCount: "49",
          totalEventCount: "51",
          jobSummaries: [
            {
              jobId: "2265599116648626375",
              successfulCount: "49",
              failedCount: "1",
              pendingCount: "1",
            },
          ],
        },
      },
    ])

    expect(diagnostics).toMatchObject({
      lastUploadDateTime: "2026-06-21 09:24:42.868537",
      pendingEventCount: 2,
      status: "EXCELLENT",
      successfulEventCount: 49,
      totalEventCount: 51,
      jobSummaries: [
        {
          failedCount: 1,
          jobId: "2265599116648626375",
          pendingCount: 1,
          successfulCount: 49,
          totalCount: 51,
        },
      ],
    })
  })

  it("reconciles production upload audit rows and separates orphan source anomalies", async () => {
    const auditRows = [
      {
        created_at: "2026-06-24T05:45:03.814Z",
        intake_id: "real_intake",
        metadata: {
          deployment_id: "dpl_live",
          request_path: "/api/cron/google-ads-conversions",
          runtime_source: "vercel",
          source: "cron_backfill",
          status: "success",
          upload_job_id: "2265599116648626375",
          vercel_env: "production",
        },
      },
      {
        created_at: "2026-06-24T06:07:00.582Z",
        intake_id: null,
        metadata: {
          audit_source_anomaly: true,
          deployment_id: "missing",
          error_code: "missing_env",
          request_path: null,
          runtime_source: "node",
          source: "checkout_session_completed",
          status: "skipped_missing_env",
        },
      },
    ]
    const supabase = {
      from: (table: string) => {
        if (table === "audit_logs") {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => ({
                    limit: async () => ({ data: auditRows, error: null }),
                  }),
                }),
              }),
            }),
          }
        }

        return {
          select: () => ({
            in: async () => ({ data: [{ id: "real_intake" }], error: null }),
          }),
        }
      },
    }

    const reconciliation = await getGoogleAdsUploadAuditReconciliation({
      generatedAt: "2026-06-24T06:16:08.336Z",
      since: "2026-06-24T05:40:00.000Z",
      supabase: supabase as never,
      watchJobId: "2265599116648626375",
    })

    expect(reconciliation).toMatchObject({
      byJobId: {
        "2265599116648626375": 1,
        missing: 1,
      },
      byRequestPath: {
        "/api/cron/google-ads-conversions": 1,
        missing: 1,
      },
      bySource: {
        checkout_session_completed: 1,
        cron_backfill: 1,
      },
      orphanRows: {
        missingIntakeId: 1,
        total: 1,
      },
      watchedJob: {
        jobId: "2265599116648626375",
        success: 1,
        totalRows: 1,
      },
    })
    expect(reconciliation.orphanRows.samples[0]).toMatchObject({
      runtimeSource: "node",
      source: "checkout_session_completed",
      status: "skipped_missing_env",
    })
  })

  it("reconciles Data Manager upload audit rows by request id without pretending they are Google Ads jobs", async () => {
    const requestId = "126365e1-16d0-4c81-9de9-f362711e250a"
    const auditRows = [
      {
        created_at: "2026-06-30T03:51:48.645Z",
        intake_id: "real_intake",
        metadata: {
          deployment_id: "dpl_live",
          request_id: requestId,
          request_path: "/api/cron/google-ads-conversions",
          runtime_source: "vercel",
          source: "cron_backfill",
          status: "success",
          upload_api: "data_manager_api",
          upload_identifier: requestId,
          upload_job_id: null,
          vercel_env: "production",
        },
      },
    ]
    const supabase = {
      from: (table: string) => {
        if (table === "audit_logs") {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => ({
                    limit: async () => ({ data: auditRows, error: null }),
                  }),
                }),
              }),
            }),
          }
        }

        return {
          select: () => ({
            in: async () => ({ data: [{ id: "real_intake" }], error: null }),
          }),
        }
      },
    }

    const reconciliation = await getGoogleAdsUploadAuditReconciliation({
      generatedAt: "2026-06-30T04:00:00.000Z",
      since: "2026-06-30T03:40:00.000Z",
      supabase: supabase as never,
      watchJobId: requestId,
    })

    expect(reconciliation).toMatchObject({
      byJobId: {
        missing: 1,
      },
      byRequestId: {
        [requestId]: 1,
      },
      byUploadIdentifier: {
        [requestId]: 1,
      },
      watchedJob: {
        jobId: requestId,
        success: 1,
        totalRows: 1,
        uploadIdentifier: requestId,
      },
    })
  })

  it("compares watched diagnostics against production audit reconciliation", () => {
    const diagnostics = summarizeGoogleAdsOfflineUploadDiagnostics([
      {
        offlineConversionUploadConversionActionSummary: {
          lastUploadDateTime: "2026-06-24 05:55:00",
          status: "EXCELLENT",
          jobSummaries: [{ jobId: "2265599116648626375", successfulCount: "49" }],
        },
      },
    ])

    const comparison = buildGoogleAdsEvidenceComparison({
      diagnostics,
      watchJobId: "2265599116648626375",
      auditReconciliation: {
        byDeploymentId: {},
        byIntakeJoinCheck: {},
        byJobId: { "2265599116648626375": 50 },
        byRequestPath: {},
        byRequestId: { missing: 50 },
        byRuntimeSource: {},
        bySource: {},
        byStatus: {},
        byUploadIdentifier: { "2265599116648626375": 50 },
        byVercelEnv: {},
        generatedAt: "2026-06-24T06:16:08.336Z",
        orphanRows: { invalidIntakeJoin: 0, missingIntakeId: 0, samples: [], total: 0 },
        since: "2026-06-24T05:40:00.000Z",
        totalRows: 50,
        watchedJob: {
          byStatus: { failed: 1, success: 49 },
          deploymentIds: ["dpl_live"],
          expiredClickThroughWindow: 1,
          failed: 1,
          jobId: "2265599116648626375",
          latestAt: "2026-06-24T05:46:00.000Z",
          requestPaths: ["/api/cron/google-ads-conversions"],
          skipped: 0,
          sources: ["cron_backfill"],
          success: 49,
          totalRows: 50,
          uploadIdentifier: "2265599116648626375",
        },
      },
    })

    expect(comparison).toMatchObject({
      googleAdsDiagnostics: {
        foundWatchedJob: true,
        jobSummary: {
          jobId: "2265599116648626375",
          successfulCount: 49,
        },
      },
      productionAuditLogs: {
        expiredClickThroughWindow: 1,
        foundWatchedJob: true,
        watchedJobRows: 50,
        watchedJobSuccess: 49,
      },
      watchedJobId: "2265599116648626375",
    })
  })

  it("classifies an invisible watched job after the processing window", () => {
    const diagnostics = summarizeGoogleAdsOfflineUploadDiagnostics([
      {
        offlineConversionUploadConversionActionSummary: {
          lastUploadDateTime: "2026-06-21 09:24:42.868537",
          status: "EXCELLENT",
          jobSummaries: [],
        },
      },
    ])
    const report: Omit<GoogleAdsSpendAuditReport, "diagnosticsWatch"> = {
      ads: {
        campaigns: [],
        summary: {
          avgCpcAud: null,
          cpaAud: null,
          purchaseCpaAud: null,
          purchaseRoas: null,
          roas: null,
          totalAllConversions: 0,
          totalAllConversionsValueAud: 0,
          totalClicks: 0,
          totalConversionValueAud: 0,
          totalConversions: 0,
          totalImpressions: 0,
          totalLocalGrossRevenueAud: 0,
          totalLocalNetRevenueAud: 414.2,
          totalLocalOrders: 17,
          totalPurchaseAllConversions: 9,
          totalPurchaseAllConversionsValueAud: 219.55,
          totalPurchaseConversionValueAud: 0,
          totalPurchaseConversions: 0,
          totalSpendAud: 877.72,
        },
      },
      conversionActions: [],
      customerConversionTrackingSettings: [
        {
          customer: {
            conversionTrackingSetting: {
              acceptedCustomerDataTerms: true,
              enhancedConversionsForLeadsEnabled: true,
            },
          },
        },
      ],
      dataManagerRequestStatus: null,
      diagnostics,
      evidenceComparison: {
        externalSurfaces: {
          cronResponses: "external_receipt_required" as const,
          localReceipts: "external_receipt_required" as const,
          vercelLogs: "external_receipt_required" as const,
        },
        googleAdsDiagnostics: {
          foundWatchedJob: false,
          jobSummary: null,
          lastUploadDateTime: diagnostics.lastUploadDateTime,
          status: diagnostics.status,
        },
        productionAuditLogs: {
          expiredClickThroughWindow: 1,
          foundWatchedJob: true,
          orphanRows: 0,
          watchedJobFailed: 1,
          watchedJobRows: 50,
          watchedJobSuccess: 49,
        },
        watchedJobId: "2265599116648626375",
      },
      finalUrls: [],
      generatedAt: "2026-06-25T06:00:00.000Z",
      local: {
        byCampaign: [],
        summary: { grossRevenueAud: 464.15, netRevenueAud: 414.2, orders: 17, refundedAud: 49.95 },
      },
      offlineUploadDiagnostics: [],
      preflight: {
        action: "No action needed.",
        code: null,
        conversionAction: {
          id: "7631611119",
          name: "InstantMed Server Purchase Import 20260601093317",
          resourceName: "customers/9205010513/conversionActions/7631611119",
          status: "ENABLED",
          type: "UPLOAD_CLICKS",
        },
        detail: "ok",
        label: "ok",
        ok: true,
        severity: "ok",
      },
      queryErrors: [],
      range: { days: 30, endDate: "2026-06-25", startDate: "2026-05-27" },
      searchTerms: [],
      uploadAuditReconciliation: {
        byDeploymentId: {},
        byIntakeJoinCheck: {},
        byJobId: { "2265599116648626375": 50 },
        byRequestPath: {},
        byRequestId: { missing: 50 },
        byRuntimeSource: {},
        bySource: {},
        byStatus: {},
        byUploadIdentifier: { "2265599116648626375": 50 },
        byVercelEnv: {},
        generatedAt: "2026-06-25T06:00:00.000Z",
        orphanRows: { invalidIntakeJoin: 0, missingIntakeId: 0, samples: [], total: 0 },
        since: "2026-06-24T05:45:00.000Z",
        totalRows: 50,
        watchedJob: {
          byStatus: { failed: 1, success: 49 },
          deploymentIds: [],
          expiredClickThroughWindow: 1,
          failed: 1,
          jobId: "2265599116648626375",
          latestAt: "2026-06-24T05:46:00.000Z",
          requestPaths: [],
          skipped: 0,
          sources: [],
          success: 49,
          totalRows: 50,
          uploadIdentifier: "2265599116648626375",
        },
      },
    }

    const watch = buildGoogleAdsDiagnosticsWatchResult({
      now: new Date("2026-06-25T06:00:00.000Z"),
      processingWindowHours: 24,
      report,
      uploadedAt: "2026-06-24T05:45:00.000Z",
      watchJobId: "2265599116648626375",
    })

    expect(watch).toMatchObject({
      acceptedCount: null,
      jobId: "2265599116648626375",
      matchedCount: null,
      matchedCountAvailable: false,
      pendingCount: null,
      rejectedCount: null,
      status: "diagnostics_invisible",
      classification: {
        expiredClickThroughWindow: "confirmed",
        googleProcessingLag: "possible",
      },
    })
  })

  it("classifies invisible Google diagnostics as stale when the watched production audit succeeded", () => {
    const diagnostics = summarizeGoogleAdsOfflineUploadDiagnostics([
      {
        offlineConversionUploadConversionActionSummary: {
          alerts: [{ error: { conversionUploadError: "EXPIRED_EVENT" }, errorPercentage: 0.33 }],
          lastUploadDateTime: "2026-06-27 23:08:21.04666",
          status: "NEEDS_ATTENTION",
          jobSummaries: [
            { jobId: "2265599116648626375", successfulCount: "111", failedCount: "76" },
          ],
        },
      },
    ])

    const report = {
      ads: {
        summary: {
          totalPurchaseConversions: 0,
        },
      },
      customerConversionTrackingSettings: [
        {
          customer: {
            conversionTrackingSetting: {
              acceptedCustomerDataTerms: true,
              enhancedConversionsForLeadsEnabled: true,
            },
          },
        },
      ],
      diagnostics,
      preflight: {
        ok: true,
      },
      uploadAuditReconciliation: {
        watchedJob: {
          expiredClickThroughWindow: 0,
          failed: 0,
          skipped: 0,
          success: 1,
          totalRows: 1,
        },
      },
    } as unknown as Omit<GoogleAdsSpendAuditReport, "diagnosticsWatch">

    const watch = buildGoogleAdsDiagnosticsWatchResult({
      now: new Date("2026-06-30T05:11:06.101Z"),
      processingWindowHours: 1,
      report,
      uploadedAt: "2026-06-30T03:51:48.645Z",
      watchJobId: "7983935816279565573",
    })

    expect(watch).toMatchObject({
      acceptedCount: null,
      diagnosticsJobSummary: null,
      jobId: "7983935816279565573",
      rejectedCount: null,
      status: "diagnostics_stale_audit_success",
      classification: {
        expiredClickThroughWindow: "not_indicated",
        googleProcessingLag: "confirmed",
        payloadShape: "not_indicated",
      },
    })
  })

  it("classifies a successful Data Manager request status when Google Ads job diagnostics are absent", () => {
    const report = {
      ads: {
        summary: {
          totalPurchaseConversions: 1,
        },
      },
      customerConversionTrackingSettings: [
        {
          customer: {
            conversionTrackingSetting: {
              acceptedCustomerDataTerms: true,
              enhancedConversionsForLeadsEnabled: true,
            },
          },
        },
      ],
      dataManagerRequestStatus: {
        attempted: true,
        ok: true,
        status: "SUCCESS",
      },
      diagnostics: {
        jobSummaries: [],
        lastUploadDateTime: null,
        status: null,
      },
      preflight: {
        ok: true,
      },
      uploadAuditReconciliation: {
        watchedJob: {
          expiredClickThroughWindow: 0,
          failed: 0,
          skipped: 0,
          success: 1,
          totalRows: 1,
        },
      },
    } as unknown as Omit<GoogleAdsSpendAuditReport, "diagnosticsWatch">

    const watch = buildGoogleAdsDiagnosticsWatchResult({
      now: new Date("2026-06-30T05:11:06.101Z"),
      processingWindowHours: 1,
      report,
      uploadedAt: "2026-06-30T03:51:48.645Z",
      watchJobId: "126365e1-16d0-4c81-9de9-f362711e250a",
    })

    expect(watch).toMatchObject({
      dataManagerRequestStatus: "SUCCESS",
      diagnosticsJobSummary: null,
      status: "diagnostics_accepted",
    })
  })

  it("classifies failed Data Manager request status as rejected", () => {
    const report = {
      ads: {
        summary: {
          totalPurchaseConversions: 0,
        },
      },
      customerConversionTrackingSettings: [],
      dataManagerRequestStatus: {
        attempted: true,
        ok: true,
        status: "FAILED",
      },
      diagnostics: {
        jobSummaries: [],
        lastUploadDateTime: null,
        status: null,
      },
      preflight: {
        ok: true,
      },
      uploadAuditReconciliation: {
        watchedJob: {
          expiredClickThroughWindow: 0,
          failed: 0,
          skipped: 0,
          success: 1,
          totalRows: 1,
        },
      },
    } as unknown as Omit<GoogleAdsSpendAuditReport, "diagnosticsWatch">

    const watch = buildGoogleAdsDiagnosticsWatchResult({
      now: new Date("2026-06-30T05:11:06.101Z"),
      processingWindowHours: 1,
      report,
      uploadedAt: "2026-06-30T03:51:48.645Z",
      watchJobId: "126365e1-16d0-4c81-9de9-f362711e250a",
    })

    expect(watch).toMatchObject({
      dataManagerRequestStatus: "FAILED",
      diagnosticsJobSummary: null,
      status: "diagnostics_rejected",
    })
  })

  it("summarizes campaign spend and joins local paid order truth by campaign id", () => {
    const local = summarizeLocalGoogleAdsPurchases([
      {
        amount_cents: 1995,
        campaignid: "23651537255",
        category: "medical_certificate",
        payment_status: "paid",
        refund_amount_cents: 0,
        subtype: "work",
      },
      {
        amount_cents: 2995,
        campaignid: "23651537255",
        category: "medical_certificate",
        payment_status: "refunded",
        refund_amount_cents: 2995,
        subtype: "work",
      },
    ])

    const report = summarizeGoogleAdsCampaignRows([
      {
        campaign: {
          advertisingChannelType: "SEARCH",
          id: "23651537255",
          name: "Med cert - Search",
          status: "ENABLED",
        },
        metrics: {
          allConversions: 4,
          allConversionsValue: 99.8,
          clicks: "20",
          conversions: 4,
          conversionsValue: 99.8,
          costMicros: "30000000",
          impressions: "400",
        },
        segments: {
          adNetworkType: "SEARCH",
          date: "2026-06-01",
          device: "MOBILE",
        },
      },
    ], local.byCampaign, [
      {
        campaign: {
          advertisingChannelType: "SEARCH",
          id: "23651537255",
          name: "Med cert - Search",
          status: "ENABLED",
        },
        metrics: {
          allConversions: 2,
          allConversionsValue: 49.9,
          conversions: 2,
          conversionsValue: 49.9,
        },
        segments: {
          conversionAction: "customers/1234567890/conversionActions/9876543210",
          conversionActionName: "InstantMed purchase upload",
          date: "2026-06-01",
        },
      },
    ])

    expect(report.summary).toMatchObject({
      totalClicks: 20,
      totalConversions: 4,
      totalImpressions: 400,
      totalLocalGrossRevenueAud: 49.9,
      totalLocalNetRevenueAud: 19.95,
      totalLocalOrders: 2,
      totalPurchaseConversions: 2,
      totalPurchaseConversionValueAud: 49.9,
      purchaseCpaAud: 15,
      purchaseRoas: 1.663,
      totalSpendAud: 30,
    })
    expect(report.campaigns[0]).toMatchObject({
      campaignId: "23651537255",
      costPerLocalOrderAud: 15,
      localOrders: 2,
      localRefundedAud: 29.95,
      purchaseConversionActionName: "InstantMed purchase upload",
      purchaseConversions: 2,
      purchaseConversionValueAud: 49.9,
      spendAud: 30,
    })
  })
})
