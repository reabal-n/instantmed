import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function repoPath(filePath: string) {
  return path.join(root, filePath)
}

describe("auth email hardening contract", () => {
  it("has a dedicated pure auth email message planner", () => {
    expect(existsSync(repoPath("lib/auth/auth-email-message-planner.ts"))).toBe(true)
  })

  it("has an explicit-action auth confirmation client", () => {
    expect(existsSync(repoPath("app/auth/confirm/auth-confirm-client.tsx"))).toBe(true)
  })

  it("only consumes the token inside the confirmation button handler", () => {
    const client = readFileSync(repoPath("app/auth/confirm/auth-confirm-client.tsx"), "utf8")

    expect(client).toContain("consumeAuthEmailConfirmation")
    expect(client).toContain("readAuthConfirmationParams")
    expect(client).toContain("window.location.hash")
    expect(client).toContain('window.addEventListener("hashchange", onStoreChange)')
    expect(client).toContain('window.removeEventListener("hashchange", onStoreChange)')
    expect(client).toContain("onClick={handleConfirm}")
    expect(client).toContain("window.history.replaceState")
    expect(client).toContain("window.location.replace")
    expect(client).toContain("setRetainedConfirmation")
    expect(client).toContain('id="main-content"')
    expect(client).not.toContain("useEffect(")
    expect(client).not.toContain("useReducedMotion")
  })

  it("does not send one-time tokens to the direct Supabase verify endpoint", () => {
    const webhook = readFileSync(repoPath("app/api/webhooks/supabase-auth/route.ts"), "utf8")

    expect(webhook).toContain("planAuthEmailMessages")
    expect(webhook).toContain('"Idempotency-Key": message.idempotencyKey')
    expect(webhook).not.toContain("/auth/v1/verify")
  })

  it("sanitizes browser analytics URLs before any auth-confirmation click is captured", () => {
    const instrumentation = readFileSync(repoPath("instrumentation-client.ts"), "utf8")
    const postHogPrivacy = readFileSync(
      repoPath("lib/analytics/posthog-privacy.ts"),
      "utf8",
    )

    expect(instrumentation).toContain(
      'import { sanitizePostHogEvent } from "@/lib/analytics/posthog-privacy"',
    )
    expect(instrumentation).toContain("before_send: scrubPostHogSensitiveTelemetry")
    expect(postHogPrivacy).toContain('"$current_url"')
    expect(postHogPrivacy).toContain("parsed.pathname")
    expect(postHogPrivacy).toContain("value.split(/[?#]/")
  })
})
