import { beforeEach, describe, expect, it, vi } from "vitest"

const captureException = vi.fn()
vi.mock("@sentry/nextjs", () => ({ captureException: (...args: unknown[]) => captureException(...args) }))
vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}))

import {
  classifyGoogleAdsConfigFailure,
  reportGoogleAdsConversionFailure,
} from "@/lib/analytics/google-ads-conversion-alarm"

describe("classifyGoogleAdsConfigFailure", () => {
  it("flags a preflight conversion_action_not_found (severity error) as a config failure", () => {
    expect(
      classifyGoogleAdsConfigFailure({
        preflightCode: "conversion_action_not_found",
        preflightSeverity: "error",
      }),
    ).toBe("conversion_action_not_found")
  })

  it("normalizes a raw upload NO_CONVERSION_ACTION_FOUND error string to a config code", () => {
    expect(
      classifyGoogleAdsConfigFailure({
        uploadErrorCode:
          "conversionUploadError:NO_CONVERSION_ACTION_FOUND:The_conversion_action_specified_in_the_upload_r",
      }),
    ).toBe("conversion_action_not_found")
  })

  it("normalizes a raw upload INVALID_CONVERSION_ACTION_TYPE error string to a config code", () => {
    expect(
      classifyGoogleAdsConfigFailure({
        uploadErrorCode: "conversionUploadError:INVALID_CONVERSION_ACTION_TYPE:wrong_type",
      }),
    ).toBe("invalid_conversion_action_type")
  })

  it("does NOT flag a transient/per-row upload error as a config failure", () => {
    expect(classifyGoogleAdsConfigFailure({ uploadErrorCode: "http_500" })).toBeNull()
  })

  it("does NOT flag a healthy preflight", () => {
    expect(
      classifyGoogleAdsConfigFailure({ preflightCode: null, preflightSeverity: "ok" }),
    ).toBeNull()
  })

  it("treats a warning-severity preflight (transient API failure) as non-config", () => {
    expect(
      classifyGoogleAdsConfigFailure({
        preflightCode: "conversion_action_preflight_failed",
        preflightSeverity: "warning",
      }),
    ).toBeNull()
  })
})

describe("reportGoogleAdsConversionFailure", () => {
  beforeEach(() => {
    captureException.mockClear()
  })

  it("escalates a config failure to a fatal, fingerprinted Sentry alarm (one per config break)", async () => {
    const result = await reportGoogleAdsConversionFailure({
      source: "cron_preflight",
      preflightCode: "conversion_action_not_found",
      preflightSeverity: "error",
    })

    expect(result.isConfigFailure).toBe(true)
    expect(result.code).toBe("conversion_action_not_found")
    expect(captureException).toHaveBeenCalledTimes(1)
    const [, opts] = captureException.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(opts.level).toBe("fatal")
    expect((opts.tags as Record<string, string>).google_ads_config_error).toBe(
      "conversion_action_not_found",
    )
    // Stable fingerprint per config code so ONE alert fires, not one per failed upload.
    expect(opts.fingerprint).toEqual(["google-ads-conversion-action", "conversion_action_not_found"])
  })

  it("alarms on a raw upload NO_CONVERSION_ACTION_FOUND error", async () => {
    const result = await reportGoogleAdsConversionFailure({
      source: "upload",
      uploadErrorCode: "conversionUploadError:NO_CONVERSION_ACTION_FOUND:detail",
      intakeId: "i-1",
    })

    expect(result.isConfigFailure).toBe(true)
    expect(captureException).toHaveBeenCalledTimes(1)
    const [, opts] = captureException.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(opts.level).toBe("fatal")
    expect(opts.fingerprint).toEqual(["google-ads-conversion-action", "conversion_action_not_found"])
  })

  it("does NOT fire a fatal alarm for a transient upload failure", async () => {
    const result = await reportGoogleAdsConversionFailure({
      source: "upload",
      uploadErrorCode: "http_500",
      intakeId: "i-2",
    })

    expect(result.isConfigFailure).toBe(false)
    expect(result.code).toBeNull()
    expect(captureException).not.toHaveBeenCalled()
  })

  it("never throws even if Sentry is unavailable", async () => {
    captureException.mockImplementationOnce(() => {
      throw new Error("sentry down")
    })
    await expect(
      reportGoogleAdsConversionFailure({
        source: "cron_preflight",
        preflightCode: "missing_env",
        preflightSeverity: "error",
      }),
    ).resolves.toMatchObject({ isConfigFailure: true })
  })
})
