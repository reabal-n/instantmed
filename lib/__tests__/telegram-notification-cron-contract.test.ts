import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const cronSource = readFileSync(
  join(process.cwd(), "app/api/cron/telegram-notifications/route.ts"),
  "utf8",
)

const migrationSource = readFileSync(
  join(process.cwd(), "supabase/migrations/20260501002037_harden_paid_request_telegram_retry.sql"),
  "utf8",
)

describe("paid request Telegram retry contract", () => {
  it("does not replay paid-status-only rows from the retry cron", () => {
    expect(cronSource).toContain('.not("paid_at", "is", null)')
    expect(cronSource).toContain('.gt("amount_cents", 0)')
  })

  it("does not let the claim RPC send malformed paid records", () => {
    expect(migrationSource).toContain("AND i.paid_at IS NOT NULL")
    expect(migrationSource).toContain("AND COALESCE(i.amount_cents, 0) > 0")
  })
})
