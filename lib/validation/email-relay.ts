/**
 * Relay / masked email detection
 *
 * Detects forwarding addresses (Apple "Hide My Email" / Sign in with Apple
 * private relay, DuckDuckGo Email Protection, Firefox Relay). These deliver
 * fine — Resend reports `delivered` — but the patient reads the forwarded
 * copy in whatever inbox sits behind the relay, which iOS users often don't
 * realise. Incident 2026-07-02: a paid med cert was delivered to a
 * `word_word.6p@icloud.com` Hide My Email address; the patient expected it
 * at her gmail and texted support "never received it".
 *
 * Detection is informational only. Relay addresses are legitimate and must
 * never block progression or fail validation.
 */

export type RelayEmailProvider = "apple" | "duck" | "firefox"

export interface RelayEmailResult {
  isRelay: boolean
  provider: RelayEmailProvider | null
}

const RELAY_DOMAINS: Record<string, RelayEmailProvider> = {
  "privaterelay.appleid.com": "apple",
  "duck.com": "duck",
  "mozmail.com": "firefox",
  "relay.firefox.com": "firefox",
}

// Apple Hide My Email generates `word_word.xx@icloud.com` — two lowercase
// words joined by an underscore, then a dot and 2 alphanumeric chars. A
// hand-chosen address in the same shape false-positives, which is acceptable
// for a non-blocking hint.
const HIDE_MY_EMAIL_ICLOUD_LOCAL_PART = /^[a-z]+_[a-z]+\.[0-9a-z]{2}$/

export function detectRelayEmail(email: string): RelayEmailResult {
  const trimmed = email.trim().toLowerCase()
  const atIndex = trimmed.lastIndexOf("@")
  if (atIndex <= 0 || atIndex === trimmed.length - 1) {
    return { isRelay: false, provider: null }
  }

  const localPart = trimmed.slice(0, atIndex)
  const domain = trimmed.slice(atIndex + 1)

  const provider = RELAY_DOMAINS[domain]
  if (provider) {
    return { isRelay: true, provider }
  }

  if (domain === "icloud.com" && HIDE_MY_EMAIL_ICLOUD_LOCAL_PART.test(localPart)) {
    return { isRelay: true, provider: "apple" }
  }

  return { isRelay: false, provider: null }
}

/**
 * Patient-facing expectation-setting line rendered under the email field.
 * Service-neutral ("documents" covers certificates and prescriptions).
 */
export function getRelayEmailMessage(result: RelayEmailResult): string | null {
  if (!result.isRelay) return null

  if (result.provider === "apple") {
    return "This looks like an Apple “Hide My Email” address. That works — your documents will arrive in the inbox linked to your Apple ID, so check there."
  }

  return "This looks like a relay address. That works — our emails will be forwarded to the inbox behind it, so check there for your documents."
}
