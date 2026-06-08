import type {
  GoogleAdsConversionActionPreflightIssueCode,
  GoogleAdsConversionActionPreflightSeverity,
} from "@/lib/analytics/google-ads-conversion-api"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("google-ads-conversion-alarm")

/**
 * Hard alarm for Google Ads server-side conversion-upload CONFIG failures.
 *
 * A misconfigured `GOOGLE_ADS_CONVERSION_ACTION_PURCHASE` (e.g. an id that does
 * not exist in the Ads account) makes EVERY server-side upload fail with
 * `NO_CONVERSION_ACTION_FOUND` until a human fixes the env. This actually
 * happened May 19 -> Jun 1 2026: the hourly backfill cron detected the bad
 * preflight and only `logger.warn`'d it, so ~2 weeks of conversion signal
 * silently never reached Google and Smart Bidding optimised blind on wasted
 * ad spend.
 *
 * This mirrors `lib/stripe/checkout-error-alarm.ts` (PR #105): config-class
 * failures escalate to Sentry `fatal` with a STABLE fingerprint per config
 * code, so exactly one alertable issue fires per config break — not one per
 * failed upload. Transient / per-row upload errors are NOT config failures and
 * keep their existing `error`-level reporting.
 *
 * Never throws — analytics alarm wiring must never break the Stripe webhook or
 * the backfill cron.
 */

// Preflight codes that mean the conversion action / credentials are
// misconfigured and block ALL uploads until a human fixes the env.
const CONFIG_PREFLIGHT_CODES = new Set<string>([
  "conversion_action_not_found",
  "conversion_action_not_enabled",
  "invalid_conversion_action_type",
  "missing_env",
  "no_access_token",
])

export interface GoogleAdsConversionFailureContext {
  /** Where the failure surfaced, for Sentry tagging. */
  source: "cron_preflight" | "upload"
  /** Preflight issue code (from preflightGoogleAdsPurchaseConversionAction). */
  preflightCode?: GoogleAdsConversionActionPreflightIssueCode
  /** Preflight severity — only `error` is treated as config-fatal. */
  preflightSeverity?: GoogleAdsConversionActionPreflightSeverity
  /** Raw upload error code from the Ads API / audit row. */
  uploadErrorCode?: string | null
  /** Optional intake id for Sentry extra. */
  intakeId?: string | null
}

/**
 * Returns the normalized config-error code if this failure is a configuration
 * failure that blocks all uploads (fatal-worthy), else null for transient /
 * per-row failures.
 */
export function classifyGoogleAdsConfigFailure(input: {
  preflightCode?: GoogleAdsConversionActionPreflightIssueCode
  preflightSeverity?: GoogleAdsConversionActionPreflightSeverity
  uploadErrorCode?: string | null
}): string | null {
  if (
    input.preflightSeverity === "error" &&
    input.preflightCode &&
    CONFIG_PREFLIGHT_CODES.has(input.preflightCode)
  ) {
    return input.preflightCode
  }

  const raw = input.uploadErrorCode ?? ""
  // The webhook upload path passes the raw `result.error`, which for config-wide
  // failures is exactly "missing_env" / "no_access_token" (the same codes the
  // preflight emits) — every paid conversion keeps skipping until the env is
  // fixed, so these must alarm. "missing_click_id" is per-order and excluded.
  if (CONFIG_PREFLIGHT_CODES.has(raw)) return raw
  if (raw.includes("NO_CONVERSION_ACTION_FOUND")) return "conversion_action_not_found"
  if (raw.includes("INVALID_CONVERSION_ACTION_TYPE")) return "invalid_conversion_action_type"

  return null
}

/**
 * Fire a fatal, fingerprinted Sentry alarm if the failure is a config-class
 * failure. Returns whether an alarm was raised and the normalized code.
 */
export async function reportGoogleAdsConversionFailure(
  ctx: GoogleAdsConversionFailureContext,
): Promise<{ isConfigFailure: boolean; code: string | null }> {
  const code = classifyGoogleAdsConfigFailure({
    preflightCode: ctx.preflightCode,
    preflightSeverity: ctx.preflightSeverity,
    uploadErrorCode: ctx.uploadErrorCode,
  })

  if (!code) {
    return { isConfigFailure: false, code: null }
  }

  logger.error("Google Ads conversion upload config failure", {
    source: ctx.source,
    google_ads_config_error: code,
    intakeId: ctx.intakeId ?? null,
  })

  try {
    const Sentry = await import("@sentry/nextjs")
    Sentry.captureException(new Error(`Google Ads conversion config failure: ${code}`), {
      level: "fatal",
      tags: {
        source: "google_ads_conversion",
        google_ads_config_error: code,
        failure_source: ctx.source,
      },
      // One alertable issue per config code, not one per failed upload.
      fingerprint: ["google-ads-conversion-action", code],
      extra: {
        intakeId: ctx.intakeId ?? null,
        uploadErrorCode: ctx.uploadErrorCode ?? null,
        preflightCode: ctx.preflightCode ?? null,
      },
    })
  } catch {
    // Sentry unavailable — never let alarm wiring break the webhook / cron.
  }

  return { isConfigFailure: true, code }
}
