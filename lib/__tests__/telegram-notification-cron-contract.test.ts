import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const cronSource = readFileSync(
  join(process.cwd(), "app/api/cron/telegram-notifications/route.ts"),
  "utf8",
)

const staleQueueSource = readFileSync(
  join(process.cwd(), "app/api/cron/stale-queue/route.ts"),
  "utf8",
)

const dateCorrectionSource = readFileSync(
  join(process.cwd(), "app/actions/request-date-correction.ts"),
  "utf8",
)

const autoApprovalPipelineSource = readFileSync(
  join(process.cwd(), "lib/clinical/auto-approval-pipeline.ts"),
  "utf8",
)

const autoApprovalStateSource = readFileSync(
  join(process.cwd(), "lib/clinical/auto-approval-state.ts"),
  "utf8",
)

const telegramSource = readFileSync(
  join(process.cwd(), "lib/notifications/telegram.ts"),
  "utf8",
)

const businessAlertsSource = readFileSync(
  join(process.cwd(), "app/api/cron/business-alerts/route.ts"),
  "utf8",
)

const cronHeartbeatSource = readFileSync(
  join(process.cwd(), "lib/monitoring/cron-heartbeat.ts"),
  "utf8",
)

function latestPaidRequestClaimMigrationSource() {
  const migrationsDir = join(process.cwd(), "supabase/migrations")
  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .reverse()

  for (const file of migrationFiles) {
    const source = readFileSync(join(migrationsDir, file), "utf8")
    if (source.includes("claim_paid_request_telegram_notification")) {
      return source
    }
  }

  throw new Error("No migration defines claim_paid_request_telegram_notification")
}

describe("paid request Telegram retry contract", () => {
  it("does not replay paid-status-only rows from the retry cron", () => {
    expect(cronSource).toContain('.not("paid_at", "is", null)')
    expect(cronSource).toContain("RETRY_WINDOW_MINUTES")
    expect(cronSource).toContain('.gt("paid_at", retryWindowStart.toISOString())')
    expect(cronSource).toContain('.gt("amount_cents", 0)')
  })

  it("does not let the claim RPC send malformed paid records", () => {
    const migrationSource = latestPaidRequestClaimMigrationSource()

    expect(migrationSource).toContain("AND i.paid_at IS NOT NULL")
    expect(migrationSource).toContain("AND i.paid_at >= p_claimed_at - interval '30 minutes'")
    expect(migrationSource).toContain("AND COALESCE(i.amount_cents, 0) > 0")
  })

  it("keeps automatic Telegram limited to new paid request notifications", () => {
    expect(staleQueueSource).not.toContain("sendTelegramAlert(")
    expect(dateCorrectionSource).not.toContain("sendTelegramAlert(")
    expect(autoApprovalPipelineSource).not.toContain("sendTelegramAlert(")
    expect(autoApprovalStateSource).not.toContain("sendTelegramAlert(")
    expect(businessAlertsSource).not.toContain("sendTelegramAlert(")
    expect(cronHeartbeatSource).not.toContain("sendTelegramAlert(")
    expect(telegramSource).not.toContain("TELEGRAM_ALL_LEVELS")
    expect(telegramSource).not.toContain("TELEGRAM_SYSTEM_ALERTS_ENABLED")
    expect(telegramSource).not.toContain("export async function sendTelegramAlert")
  })
})
