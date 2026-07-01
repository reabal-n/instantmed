import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const emailHubPageSource = readFileSync(
  join(process.cwd(), "app/admin/emails/hub/page.tsx"),
  "utf8",
)
const emailHubClientSource = readFileSync(
  join(process.cwd(), "app/admin/emails/hub/email-hub-client.tsx"),
  "utf8",
)
const emailStatsSource = readFileSync(
  join(process.cwd(), "app/actions/email-stats.ts"),
  "utf8",
)
const emailRetrySource = readFileSync(
  join(process.cwd(), "app/actions/email-retry.ts"),
  "utf8",
)

describe("email delivery ops contract", () => {
  it("fetches a dedicated email issue feed instead of deriving failures from sampled activity", () => {
    expect(emailStatsSource).toContain("getRecentEmailIssues")
    expect(emailStatsSource).toContain("filterQuietCronOwnedEmailFailures")
    expect(emailStatsSource).toContain('.in("status", ["failed", "pending"])')
    expect(emailHubPageSource).toContain("getRecentEmailIssues(25)")
    expect(emailHubPageSource).toContain("issueActivity={issueResult.activity}")
    expect(emailHubClientSource).toContain("issueActivity: RecentEmailActivity[]")
    expect(emailHubClientSource).not.toContain("const failures = activity.filter((a) => a.status === \"failed\")")
  })

  it("does not expose manual retries for cron-owned audit-only email failures", () => {
    expect(emailHubClientSource).toContain("isQuietCronOwnedEmailFailure")
    expect(emailHubClientSource).toContain("canRetryOutboxLedgerRow")
    expect(emailHubClientSource).toContain("getNonRetryableOutboxLedgerLabel")
    expect(emailHubClientSource).toContain("Cron-owned")
    expect(emailHubClientSource).toContain("Max retries")

    expect(emailRetrySource).toContain("isQuietCronOwnedEmailFailure")
    expect(emailRetrySource).toContain("id, email_type, status, retry_count, certificate_id, error_message")
    expect(emailRetrySource).toContain("owned by its recovery cron")
  })
})
