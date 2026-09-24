import { DEFAULT_GOOGLE_ADS_API_VERSION, getEffectiveGoogleAdsApiVersion } from "@/lib/google-ads/client"
import { getTwilioVoiceReadiness } from "@/lib/twilio/voice-config"

export interface CredentialCheckResult {
  status: "pass" | "fail"
  name: string
  detail: string
}

// Read-only checks shared by the CLI and the authenticated deployed-runtime probe.
// Never return provider bodies, exception messages or credential values.
export async function checkOpenAIReviewModel(): Promise<CredentialCheckResult[]> {
  const name = "OpenAI review model"
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  const model = process.env.OPENAI_REVIEW_MODEL?.trim() || "gpt-5.5-pro"
  if (!apiKey || /placeholder|redacted|masked|\*{3}/i.test(apiKey)) {
    return [{ status: "fail", name, detail: "OPENAI_API_KEY is not configured; model access was not checked." }]
  }
  try {
    const response = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    })
    return [{
      status: response.ok ? "pass" : "fail",
      name,
      detail: response.ok ? `${model} is available.` : `OpenAI model access returned HTTP ${response.status}.`,
    }]
  } catch {
    return [{ status: "fail", name, detail: "OpenAI model access could not be reached." }]
  }
}

export function checkTwilioVoiceReadiness(): CredentialCheckResult[] {
  const name = "Twilio AI voice"
  const readiness = getTwilioVoiceReadiness(process.env)
  if (!readiness.enabled) {
    return [{ status: "pass", name, detail: "Disabled by the runtime kill switch; active voice readiness was not checked." }]
  }
  if (!readiness.ready) {
    return [{ status: "fail", name, detail: `Enabled but missing: ${readiness.missing.join(", ")}.` }]
  }
  const baseUrl = process.env.TWILIO_VOICE_PUBLIC_BASE_URL?.trim() ?? ""
  if (!baseUrl.startsWith("https://")) {
    return [{ status: "fail", name, detail: "TWILIO_VOICE_PUBLIC_BASE_URL must use HTTPS." }]
  }
  return [{ status: "pass", name, detail: "Enabled with required credentials, session-secret length, encryption flags and HTTPS configuration; no call was placed." }]
}

/** Configuration evidence only; scheduled authenticated jobs own provider proof. */
export function checkGoogleAdsApiVersion(): CredentialCheckResult[] {
  const version = getEffectiveGoogleAdsApiVersion()
  const displayVersion = /^v[0-9]{1,3}$/.test(version) ? version : "invalid override"
  return [{
    name: "Google Ads API version",
    status: version === DEFAULT_GOOGLE_ADS_API_VERSION ? "pass" : "fail",
    detail: `Effective version: ${displayVersion}; tested version: ${DEFAULT_GOOGLE_ADS_API_VERSION}. Provider access is verified by scheduled jobs.`,
  }]
}
