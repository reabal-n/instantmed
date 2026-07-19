import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

describe("review request backfill route", () => {
  it("rejects windows beyond the audited 120-day boundary with 400", () => {
    const source = readFileSync(
      join(process.cwd(), "app/api/cron/review-request-backfill/route.ts"),
      "utf8",
    )

    expect(source).toContain("sinceDays > REVIEW_REQUEST_CATCH_UP_DAYS")
    expect(source).toContain('{ error: "invalid sinceDays" }')
    expect(source).toContain("{ status: 400 }")
  })
})
