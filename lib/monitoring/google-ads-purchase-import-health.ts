export const GOOGLE_ADS_PURCHASE_IMPORT_HEALTH_DAYS = 30

export type GoogleAdsPurchaseImportHealthSnapshot = {
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
}

export type GoogleAdsPurchaseImportAlert = {
  count: number
  detail: string
  metadata: {
    count: number
    generated_at: string
    local_net_revenue_aud: number
    local_orders: number
    preflight_ok: boolean
    purchase_all_conversions: number
    purchase_all_conversions_value_aud: number
    purchase_conversion_value_aud: number
    purchase_conversions: number
    query_errors: string[]
    window: string
    window_days: number
  }
  metric:
    | "google_ads_purchase_import_health_unavailable"
    | "google_ads_purchase_imports_zero"
    | "google_ads_purchase_primary_conversions_zero"
  severity: "critical"
}

function buildMetadata(snapshot: GoogleAdsPurchaseImportHealthSnapshot): GoogleAdsPurchaseImportAlert["metadata"] {
  return {
    count: snapshot.localOrders,
    generated_at: snapshot.generatedAt,
    local_net_revenue_aud: snapshot.localNetRevenueAud,
    local_orders: snapshot.localOrders,
    preflight_ok: snapshot.preflightOk,
    purchase_all_conversions: snapshot.purchaseAllConversions,
    purchase_all_conversions_value_aud: snapshot.purchaseAllConversionsValueAud,
    purchase_conversion_value_aud: snapshot.purchaseConversionValueAud,
    purchase_conversions: snapshot.purchaseConversions,
    query_errors: snapshot.queryErrors.map((error) => `${error.name}:${error.error}`),
    window: `${snapshot.rangeDays}d`,
    window_days: snapshot.rangeDays,
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
