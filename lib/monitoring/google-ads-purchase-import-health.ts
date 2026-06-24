export const GOOGLE_ADS_PURCHASE_IMPORT_HEALTH_DAYS = 30

export type GoogleAdsPurchaseImportHealthSnapshot = {
  acceptedCustomerDataTerms: boolean | null
  enhancedConversionsForLeadsEnabled: boolean | null
  generatedAt: string
  localNetRevenueAud: number
  localOrders: number
  preflightOk: boolean
  purchaseAllConversions: number
  purchaseAllConversionsValueAud: number
  purchaseConversions: number
  purchaseConversionValueAud: number
  queryErrors: Array<{ name: string; error: string }>
  rangeDays: number
  uploadAuditReconciliation?: {
    byRequestPath: Record<string, number>
    byRuntimeSource: Record<string, number>
    bySource: Record<string, number>
    byVercelEnv: Record<string, number>
    orphanRows: {
      invalidIntakeJoin: number
      missingIntakeId: number
      samples: Array<{
        at: string | null
        deploymentId: string | null
        requestPath: string | null
        runtimeSource: string | null
        source: string | null
        status: string | null
        uploadJobId: string | null
        vercelEnv: string | null
      }>
      total: number
    }
  } | null
}

export type GoogleAdsPurchaseImportAlert = {
  count: number
  detail: string
  metadata: {
    count: number
    generated_at: string
    accepted_customer_data_terms: boolean | null
    enhanced_conversions_for_leads_enabled: boolean | null
    local_net_revenue_aud: number
    local_orders: number
    preflight_ok: boolean
    purchase_all_conversions: number
    purchase_all_conversions_value_aud: number
    purchase_conversion_value_aud: number
    purchase_conversions: number
    query_errors: string[]
    upload_audit_orphan_rows?: number
    upload_audit_orphan_samples?: GoogleAdsPurchaseImportHealthSnapshot["uploadAuditReconciliation"] extends infer T
      ? T extends { orphanRows: { samples: infer S } }
        ? S
        : never
      : never
    upload_audit_request_paths?: string[]
    upload_audit_runtime_sources?: string[]
    upload_audit_sources?: string[]
    upload_audit_vercel_envs?: string[]
    window: string
    window_days: number
  }
  metric:
    | "google_ads_purchase_enhanced_conversions_setup_incomplete"
    | "google_ads_purchase_import_health_unavailable"
    | "google_ads_purchase_imports_zero"
    | "google_ads_purchase_primary_conversions_zero"
    | "google_ads_upload_audit_source_anomaly"
  severity: "critical"
}

function buildMetadata(snapshot: GoogleAdsPurchaseImportHealthSnapshot): GoogleAdsPurchaseImportAlert["metadata"] {
  return {
    accepted_customer_data_terms: snapshot.acceptedCustomerDataTerms,
    count: snapshot.localOrders,
    enhanced_conversions_for_leads_enabled: snapshot.enhancedConversionsForLeadsEnabled,
    generated_at: snapshot.generatedAt,
    local_net_revenue_aud: snapshot.localNetRevenueAud,
    local_orders: snapshot.localOrders,
    preflight_ok: snapshot.preflightOk,
    purchase_all_conversions: snapshot.purchaseAllConversions,
    purchase_all_conversions_value_aud: snapshot.purchaseAllConversionsValueAud,
    purchase_conversion_value_aud: snapshot.purchaseConversionValueAud,
    purchase_conversions: snapshot.purchaseConversions,
    query_errors: snapshot.queryErrors.map((error) => `${error.name}:${error.error}`),
    upload_audit_orphan_rows: snapshot.uploadAuditReconciliation?.orphanRows.total,
    upload_audit_orphan_samples: snapshot.uploadAuditReconciliation?.orphanRows.samples,
    upload_audit_request_paths: Object.keys(snapshot.uploadAuditReconciliation?.byRequestPath ?? {}).sort(),
    upload_audit_runtime_sources: Object.keys(snapshot.uploadAuditReconciliation?.byRuntimeSource ?? {}).sort(),
    upload_audit_sources: Object.keys(snapshot.uploadAuditReconciliation?.bySource ?? {}).sort(),
    upload_audit_vercel_envs: Object.keys(snapshot.uploadAuditReconciliation?.byVercelEnv ?? {}).sort(),
    window: `${snapshot.rangeDays}d`,
    window_days: snapshot.rangeDays,
  }
}

export function buildGoogleAdsUploadAuditSourceAnomalyAlert(
  snapshot: GoogleAdsPurchaseImportHealthSnapshot,
): GoogleAdsPurchaseImportAlert | null {
  const orphanRows = snapshot.uploadAuditReconciliation?.orphanRows.total ?? 0
  if (orphanRows <= 0) return null

  return {
    count: orphanRows,
    detail:
      `Google Ads upload audit has ${orphanRows} orphan row` +
      `${orphanRows === 1 ? "" : "s"} with no valid intake join; classify as audit-source anomaly`,
    metadata: buildMetadata(snapshot),
    metric: "google_ads_upload_audit_source_anomaly",
    severity: "critical",
  }
}

export function buildGoogleAdsPurchaseImportAlert(
  snapshot: GoogleAdsPurchaseImportHealthSnapshot,
): GoogleAdsPurchaseImportAlert | null {
  if (snapshot.localOrders <= 0) return null

  const metadata = buildMetadata(snapshot)
  if (!snapshot.preflightOk || snapshot.queryErrors.length > 0) {
    return {
      count: snapshot.localOrders,
      detail:
        `Google Ads purchase import health unavailable for ${snapshot.localOrders} local paid Google-attributed order` +
        `${snapshot.localOrders === 1 ? "" : "s"} in ${snapshot.rangeDays}d`,
      metadata,
      metric: "google_ads_purchase_import_health_unavailable",
      severity: "critical",
    }
  }

  if (
    snapshot.acceptedCustomerDataTerms !== true ||
    snapshot.enhancedConversionsForLeadsEnabled !== true
  ) {
    return {
      count: snapshot.localOrders,
      detail:
        `Google Ads enhanced-conversion setup is incomplete for ${snapshot.localOrders} local paid Google-attributed order` +
        `${snapshot.localOrders === 1 ? "" : "s"} in ${snapshot.rangeDays}d`,
      metadata,
      metric: "google_ads_purchase_enhanced_conversions_setup_incomplete",
      severity: "critical",
    }
  }

  if (snapshot.purchaseAllConversions <= 0) {
    return {
      count: snapshot.localOrders,
      detail:
        `Google Ads shows zero imported purchase conversions for ${snapshot.localOrders} local paid Google-attributed order` +
        `${snapshot.localOrders === 1 ? "" : "s"} in ${snapshot.rangeDays}d`,
      metadata,
      metric: "google_ads_purchase_imports_zero",
      severity: "critical",
    }
  }

  if (snapshot.purchaseConversions <= 0) {
    return {
      count: snapshot.localOrders,
      detail:
        `Google Ads purchase import has ${snapshot.purchaseAllConversions} all-conversion event` +
        `${snapshot.purchaseAllConversions === 1 ? "" : "s"} but zero primary purchase conversions ` +
        `for ${snapshot.localOrders} local paid Google-attributed order` +
        `${snapshot.localOrders === 1 ? "" : "s"} in ${snapshot.rangeDays}d`,
      metadata,
      metric: "google_ads_purchase_primary_conversions_zero",
      severity: "critical",
    }
  }

  return null
}
