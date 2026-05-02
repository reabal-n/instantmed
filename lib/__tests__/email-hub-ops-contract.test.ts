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

describe("email hub ops contract", () => {
  it("fetches a dedicated email issue feed instead of deriving failures from sampled activity", () => {
    expect(emailStatsSource).toContain("getRecentEmailIssues")
    expect(emailStatsSource).toContain('.in("status", ["failed", "pending"])')
    expect(emailHubPageSource).toContain("getRecentEmailIssues(25)")
    expect(emailHubPageSource).toContain("issueActivity={issueResult.activity}")
    expect(emailHubClientSource).toContain("issueActivity: RecentEmailActivity[]")
    expect(emailHubClientSource).not.toContain("const failures = activity.filter((a) => a.status === \"failed\")")
  })
})
