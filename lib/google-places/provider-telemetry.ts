import { getPostHogClient } from "@/lib/analytics/posthog-server"

export type AddressProviderTelemetryProvider = "addressfinder" | "google" | "none"
export type AddressProviderTelemetryOutcome =
  | "success"
  | "zero_results"
  | "details_failure"
  | "provider_error"
  | "not_configured"
  | "invalid_request"

export interface AddressProviderTelemetryEvent {
  operation: "autocomplete" | "details"
  provider: AddressProviderTelemetryProvider
  outcome: AddressProviderTelemetryOutcome
  durationMs?: number
  inputLength?: number
  resultCount?: number
  statusCode?: number
  usedGoogleFallback?: boolean
  detailsFailed?: boolean
  placeIdProvider?: "addressfinder" | "google" | "unknown"
  reason?: string
}

export function getPlaceIdProvider(placeId: string | null | undefined): "addressfinder" | "google" | "unknown" {
  if (!placeId) return "unknown"
  if (placeId.startsWith("af:")) return "addressfinder"
  return "google"
}

export function trackAddressProviderLookup(event: AddressProviderTelemetryEvent) {
  try {
    const client = getPostHogClient()
    client.capture({
      distinctId: "system:address-provider",
      event: "address_provider_lookup",
      properties: {
        operation: event.operation,
        provider: event.provider,
        outcome: event.outcome,
        duration_ms: event.durationMs,
        input_length: event.inputLength,
        result_count: event.resultCount,
        status_code: event.statusCode,
        used_google_fallback: event.usedGoogleFallback === true,
        is_zero_result: event.outcome === "zero_results",
        is_details_failure: event.detailsFailed === true || event.outcome === "details_failure",
        place_id_provider: event.placeIdProvider,
        reason: event.reason,
      },
    })
  } catch {
    // Non-blocking: address lookup must not fail because analytics failed.
  }
}
