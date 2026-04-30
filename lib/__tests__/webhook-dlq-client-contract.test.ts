import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const dlqClientSource = readFileSync(
  join(process.cwd(), "app/admin/webhook-dlq/webhook-dlq-client.tsx"),
  "utf8",
)

describe("webhook DLQ client contract", () => {
  it("uses the CSRF fetch wrapper for mutating DLQ actions", () => {
    expect(dlqClientSource).toContain("fetchWithCsrf")
    expect(dlqClientSource).toContain('fetchWithCsrf("/api/admin/webhook-dlq"')
  })
})
