import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), "utf8")
}

describe("integration type validation release gate", () => {
  it("ships a check:integrations script and wires it into release:check", () => {
    expect(existsSync(join(root, "scripts/check-integrations.ts"))).toBe(true)

    const packageJson = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>
    }

    expect(packageJson.scripts["check:integrations"]).toBe("tsx scripts/check-integrations.ts")
    expect(packageJson.scripts["release:check"]).toContain("pnpm check:integrations")
  })

  it("validates the same wrong-type integration class that broke Google Ads", () => {
    const source = read("scripts/check-integrations.ts")

    expect(source).toContain("hydrateLocalEnv")
    expect(source).toContain("CHECK_INTEGRATIONS_STRICT")
    expect(source).toContain("parseEmailDomain")
    expect(source).toContain("warnings")
    expect(source).toContain("process.exit(1)")
    expect(source).toContain("prices.retrieve")
    expect(source).toContain("price.type")
    expect(source).toContain("one_time")
    expect(source).toContain("preflightGoogleAdsPurchaseConversionAction")
    expect(source).toContain("preflightProductionGoogleAdsConversionAction")
    expect(source).toContain("/api/internal/google-ads-report")
    expect(source).toContain("CRON_SECRET")
    expect(source).toContain("Production runtime verified")
    expect(source).toContain("UPLOAD_CLICKS")
    expect(source).toContain("expected ENABLED")
    expect(source).toContain("missingGoogleAdsCoreEnvKeys")
    expect(source).toContain("GOOGLE_ADS_CUSTOMER_ID")
    expect(source).toContain("GOOGLE_ADS_CONVERSION_ACTION_PURCHASE")
    expect(source).toContain("GOOGLE_ADS_DEVELOPER_TOKEN")
    expect(source).toContain("missingConfiguredEnvKeys")
    expect(source).toContain("GOOGLE_ADS_CLIENT_ID")
    expect(source).toContain("GOOGLE_ADS_CLIENT_SECRET")
    expect(source).toContain("GOOGLE_ADS_REFRESH_TOKEN")
    expect(source).toContain("OAuth token could not be minted")
    expect(source).toContain("checkGoogleDataManagerConversions")
    expect(source).toContain("GOOGLE_DATA_MANAGER_CONVERSIONS_ENABLED")
    expect(source).toContain("GOOGLE_DATA_MANAGER_CLIENT_ID")
    expect(source).toContain("GOOGLE_DATA_MANAGER_CLIENT_SECRET")
    expect(source).toContain("GOOGLE_DATA_MANAGER_REFRESH_TOKEN")
    expect(source).toContain("GOOGLE_DATA_MANAGER_QUOTA_PROJECT_ID")
    expect(source).toContain("GOOGLE_ADS_DIAGNOSTICS_WATCH_REQUEST_ID")
    expect(source).toContain("https://www.googleapis.com/auth/datamanager")
    expect(source).toContain("RESEND_FROM_EMAIL")
    expect(source).toContain("domains")
    expect(source).toContain("isValidResendFromEmail")
    expect(source).toContain("restricted_api_key")
    expect(source).toContain("delivered@resend.dev")
    expect(source).toContain("Idempotency-Key")
    expect(source).toContain("RESEND_SEND_SMOKE")
    expect(source).toContain("AI_MODEL_CONFIG")
    expect(source).toContain("checkOpenAIReviewModel")
    expect(source).toContain("OPENAI_REVIEW_MODEL")
    expect(source).toContain("gpt-5.5-pro")
    expect(source).toContain("PARCHMENT_SMOKE_USER_ID")
  })
})
